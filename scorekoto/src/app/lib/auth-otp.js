import {
  createHash,
  createHmac,
  randomInt,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import pool from "./db";

export const OTP_LENGTH = 6;
export const OTP_TTL_SECONDS = 10 * 60;
export const OTP_RESEND_SECONDS = 60;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_MAX_SENDS = 5;
export const RECOVERY_TOKEN_TTL_SECONDS = 15 * 60;

let schemaPromise;

export class AuthOtpError extends Error {
  constructor(message, status = 400, code = "OTP_ERROR") {
    super(message);
    this.name = "AuthOtpError";
    this.status = status;
    this.code = code;
  }
}

export function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));
}

export function isValidOtp(value) {
  return new RegExp(`^\\d{${OTP_LENGTH}}$`).test(String(value || ""));
}

export function normalizeUsername(value) {
  return String(value || "").trim();
}

export function isValidUsername(value) {
  return /^[a-zA-Z0-9_.-]{3,30}$/.test(normalizeUsername(value));
}

export function isValidPassword(value) {
  return typeof value === "string" && value.length >= 8 && value.length <= 128;
}

export async function ensureAuthOtpSchema() {
  if (!schemaPromise) {
    schemaPromise = pool.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS auth_version INTEGER NOT NULL DEFAULT 0;

      CREATE TABLE IF NOT EXISTS auth_otp_challenge (
        challenge_id UUID PRIMARY KEY,
        purpose VARCHAR(32) NOT NULL CHECK (purpose IN ('registration', 'recovery')),
        email VARCHAR(320) NOT NULL,
        otp_digest CHAR(64) NOT NULL,
        payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        request_key CHAR(64),
        expires_at TIMESTAMPTZ NOT NULL,
        attempts SMALLINT NOT NULL DEFAULT 0,
        send_count SMALLINT NOT NULL DEFAULT 1,
        last_sent_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        verified_at TIMESTAMPTZ,
        recovery_token_digest CHAR(64),
        recovery_token_expires_at TIMESTAMPTZ,
        consumed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_auth_otp_email_created
        ON auth_otp_challenge (LOWER(email), created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_auth_otp_expiry
        ON auth_otp_challenge (expires_at);
    `).catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }

  return schemaPromise;
}

function getOtpSecret() {
  const secret = process.env.OTP_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new AuthOtpError("OTP service is not configured", 503, "OTP_NOT_CONFIGURED");
  }
  return secret;
}

function generateOtp() {
  return String(randomInt(0, 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, "0");
}

function digestOtp(challengeId, otp) {
  return createHmac("sha256", getOtpSecret())
    .update(`${challengeId}:${otp}`)
    .digest("hex");
}

export function digestRecoveryToken(challengeId, token) {
  return createHmac("sha256", getOtpSecret())
    .update(`recovery:${challengeId}:${token}`)
    .digest("hex");
}

function safeEqualHex(first, second) {
  const firstBuffer = Buffer.from(String(first || ""), "hex");
  const secondBuffer = Buffer.from(String(second || ""), "hex");
  return firstBuffer.length === secondBuffer.length && timingSafeEqual(firstBuffer, secondBuffer);
}

function getRequestKey(request) {
  const forwardedFor = request?.headers?.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request?.headers?.get("x-real-ip")?.trim();
  const address = forwardedFor || realIp;
  if (!address) return null;

  return createHash("sha256")
    .update(`${getOtpSecret()}:${address}`)
    .digest("hex");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function sendOtpEmail({ to, otp, purpose, idempotencyKey }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.AUTH_EMAIL_FROM;

  if (!apiKey || !from) {
    throw new AuthOtpError(
      "Email verification is not configured. Add RESEND_API_KEY and AUTH_EMAIL_FROM.",
      503,
      "EMAIL_NOT_CONFIGURED"
    );
  }

  const isRegistration = purpose === "registration";
  const title = isRegistration ? "Verify your ScoreKoto account" : "Recover your ScoreKoto account";
  const action = isRegistration ? "finish creating your account" : "continue account recovery";
  const safeOtp = escapeHtml(otp);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: `${otp} is your ScoreKoto verification code`,
      text: `Your ScoreKoto verification code is ${otp}. It expires in 10 minutes. Use it to ${action}. If you did not request this, you can ignore this email.`,
      html: `
        <div style="margin:0;background:#f3f8f5;padding:32px 16px;font-family:Arial,sans-serif;color:#111714">
          <div style="max-width:520px;margin:0 auto;border:1px solid #dfe9e4;border-radius:18px;background:#ffffff;padding:30px;box-shadow:0 12px 30px rgba(8,12,10,.08)">
            <div style="font-size:13px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#16966b">ScoreKoto</div>
            <h1 style="margin:12px 0 8px;font-size:24px">${title}</h1>
            <p style="margin:0 0 22px;color:#69756f;line-height:1.6">Use this code to ${action}. It expires in 10 minutes.</p>
            <div style="border:1px solid #bcebd9;border-radius:14px;background:#e6fff5;padding:18px;text-align:center;font-size:34px;font-weight:900;letter-spacing:.22em;color:#0b6f4e">${safeOtp}</div>
            <p style="margin:22px 0 0;color:#69756f;font-size:13px;line-height:1.6">Never share this code. ScoreKoto will not ask for it outside the verification screen. If you did not request this email, you can safely ignore it.</p>
          </div>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    const details = await response.json().catch(() => ({}));
    console.error("Resend email delivery failed:", details);
    throw new AuthOtpError(
      "We could not send the verification email. Please try again later.",
      502,
      "EMAIL_DELIVERY_FAILED"
    );
  }
}

async function enforceRequestLimits(email, requestKey) {
  const result = await pool.query(
    `SELECT
       COUNT(*) FILTER (WHERE LOWER(email) = LOWER($1))::int AS email_count,
       COUNT(*) FILTER (WHERE request_key = $2 AND $2::text IS NOT NULL)::int AS request_count
     FROM auth_otp_challenge
     WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '1 hour'`,
    [email, requestKey]
  );
  const counts = result.rows[0];

  if (counts.email_count >= OTP_MAX_SENDS || counts.request_count >= 12) {
    throw new AuthOtpError(
      "Too many verification requests. Please try again later.",
      429,
      "OTP_RATE_LIMIT"
    );
  }
}

export async function createOtpChallenge({ purpose, email, payload, request }) {
  await ensureAuthOtpSchema();
  await pool.query(
    `DELETE FROM auth_otp_challenge
     WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '24 hours'`
  );

  const cleanEmail = normalizeEmail(email);
  const requestKey = getRequestKey(request);
  await enforceRequestLimits(cleanEmail, requestKey);

  const challengeId = randomUUID();
  const otp = generateOtp();
  const otpDigest = digestOtp(challengeId, otp);

  await pool.query(
    `UPDATE auth_otp_challenge
     SET consumed_at = CURRENT_TIMESTAMP
     WHERE LOWER(email) = LOWER($1)
       AND purpose = $2
       AND consumed_at IS NULL`,
    [cleanEmail, purpose]
  );

  await pool.query(
    `INSERT INTO auth_otp_challenge (
       challenge_id, purpose, email, otp_digest, payload, request_key, expires_at
     ) VALUES ($1, $2, $3, $4, $5::jsonb, $6, CURRENT_TIMESTAMP + INTERVAL '10 minutes')`,
    [challengeId, purpose, cleanEmail, otpDigest, JSON.stringify(payload || {}), requestKey]
  );

  try {
    await sendOtpEmail({
      to: cleanEmail,
      otp,
      purpose,
      idempotencyKey: `scorekoto-${purpose}-${challengeId}-1`,
    });
  } catch (error) {
    await pool.query("DELETE FROM auth_otp_challenge WHERE challenge_id = $1", [challengeId]);
    throw error;
  }

  return { challengeId, expiresIn: OTP_TTL_SECONDS, resendAfter: OTP_RESEND_SECONDS };
}

export async function resendOtpChallenge(challengeId, expectedPurpose = "registration") {
  await ensureAuthOtpSchema();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const result = await client.query(
      `SELECT challenge_id, purpose, email, send_count, last_sent_at, consumed_at
       FROM auth_otp_challenge
       WHERE challenge_id = $1 AND purpose = $2
       FOR UPDATE`,
      [challengeId, expectedPurpose]
    );
    const challenge = result.rows[0];

    if (!challenge || challenge.consumed_at) {
      throw new AuthOtpError("This verification request is no longer available", 400, "OTP_INVALID");
    }
    if (challenge.send_count >= OTP_MAX_SENDS) {
      throw new AuthOtpError("Maximum resend limit reached", 429, "OTP_SEND_LIMIT");
    }

    const secondsSinceLastSend = (Date.now() - new Date(challenge.last_sent_at).getTime()) / 1000;
    if (secondsSinceLastSend < OTP_RESEND_SECONDS) {
      throw new AuthOtpError(
        `Please wait ${Math.ceil(OTP_RESEND_SECONDS - secondsSinceLastSend)} seconds before requesting another code`,
        429,
        "OTP_RESEND_WAIT"
      );
    }

    const otp = generateOtp();
    const otpDigest = digestOtp(challengeId, otp);
    const nextSendCount = Number(challenge.send_count) + 1;
    await client.query(
      `UPDATE auth_otp_challenge
       SET otp_digest = $2,
           expires_at = CURRENT_TIMESTAMP + INTERVAL '10 minutes',
           attempts = 0,
           send_count = $3,
           last_sent_at = CURRENT_TIMESTAMP,
           verified_at = NULL,
           recovery_token_digest = NULL,
           recovery_token_expires_at = NULL
       WHERE challenge_id = $1`,
      [challengeId, otpDigest, nextSendCount]
    );

    await sendOtpEmail({
      to: challenge.email,
      otp,
      purpose: challenge.purpose,
      idempotencyKey: `scorekoto-${challenge.purpose}-${challengeId}-${nextSendCount}`,
    });
    await client.query("COMMIT");

    return { expiresIn: OTP_TTL_SECONDS, resendAfter: OTP_RESEND_SECONDS };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

export async function lockAndVerifyOtp(client, { challengeId, otp, purpose }) {
  const result = await client.query(
    `SELECT *
     FROM auth_otp_challenge
     WHERE challenge_id = $1 AND purpose = $2
     FOR UPDATE`,
    [challengeId, purpose]
  );
  const challenge = result.rows[0];

  if (!challenge || challenge.consumed_at) {
    throw new AuthOtpError("The verification code is invalid or has expired", 400, "OTP_INVALID");
  }
  if (new Date(challenge.expires_at).getTime() <= Date.now()) {
    throw new AuthOtpError("The verification code has expired", 400, "OTP_EXPIRED");
  }
  if (challenge.attempts >= OTP_MAX_ATTEMPTS) {
    throw new AuthOtpError("Too many incorrect attempts. Request a new code.", 429, "OTP_ATTEMPTS_EXCEEDED");
  }

  const matches = safeEqualHex(challenge.otp_digest, digestOtp(challengeId, otp));
  if (!matches) {
    await client.query(
      "UPDATE auth_otp_challenge SET attempts = attempts + 1 WHERE challenge_id = $1",
      [challengeId]
    );
    throw new AuthOtpError("The verification code is incorrect", 400, "OTP_INCORRECT");
  }

  return challenge;
}

export function createRecoveryToken(challengeId) {
  const token = `${randomUUID()}${randomUUID()}`.replaceAll("-", "");
  return { token, digest: digestRecoveryToken(challengeId, token) };
}

export function recoveryTokenMatches(challengeId, token, expectedDigest) {
  return safeEqualHex(expectedDigest, digestRecoveryToken(challengeId, token));
}

export function isEmailServiceConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.AUTH_EMAIL_FROM);
}
