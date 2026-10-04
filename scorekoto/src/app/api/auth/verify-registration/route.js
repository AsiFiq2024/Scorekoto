import { NextResponse } from "next/server";
import { generateToken } from "@/app/lib/auth";
import { withTransaction } from "@/app/lib/db";
import {
  AuthOtpError,
  ensureAuthOtpSchema,
  isValidOtp,
  lockAndVerifyOtp,
} from "@/app/lib/auth-otp";

export async function POST(request) {
  try {
    const { challengeId, otp } = await request.json();
    if (!challengeId || !isValidOtp(otp)) {
      return NextResponse.json({ error: "Enter the 6-digit verification code" }, { status: 400 });
    }

    await ensureAuthOtpSchema();
    const newUser = await withTransaction(async (client) => {
      const challenge = await lockAndVerifyOtp(client, {
        challengeId,
        otp,
        purpose: "registration",
      });
      const username = challenge.payload?.username;
      const passwordHash = challenge.payload?.passwordHash;
      if (!username || !passwordHash) {
        throw new AuthOtpError("Registration information is incomplete", 400, "REGISTRATION_INVALID");
      }

      const existing = await client.query(
        `SELECT user_id, username, email
         FROM users
         WHERE LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($2)
         LIMIT 1`,
        [username, challenge.email]
      );
      if (existing.rows.length > 0) {
        const match = existing.rows[0];
        const message = match.username.toLowerCase() === username.toLowerCase()
          ? "Username is already taken"
          : "Email is already registered";
        throw new AuthOtpError(message, 409, "ACCOUNT_CONFLICT");
      }

      const insert = await client.query(
        `INSERT INTO users (username, email, password_hash, role, created_at)
         VALUES ($1, $2, $3, 'user', CURRENT_TIMESTAMP)
         RETURNING user_id, username, email, role, auth_version, created_at`,
        [username, challenge.email, passwordHash]
      );
      await client.query(
        "UPDATE auth_otp_challenge SET consumed_at = CURRENT_TIMESTAMP, verified_at = CURRENT_TIMESTAMP WHERE challenge_id = $1",
        [challengeId]
      );
      return insert.rows[0];
    });

    const token = generateToken({
      userId: newUser.user_id,
      username: newUser.username,
      email: newUser.email,
      role: newUser.role || "user",
      authVersion: newUser.auth_version || 0,
    });
    const response = NextResponse.json({
      success: true,
      message: "Email verified and account created",
      user: { ...newUser, role: newUser.role || "user" },
    }, { status: 201 });
    response.cookies.set("scorekoto_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return response;
  } catch (error) {
    console.error("Registration verification error:", error);
    if (error instanceof AuthOtpError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    if (error?.code === "23505") {
      return NextResponse.json({ error: "Username or email is already registered" }, { status: 409 });
    }
    return NextResponse.json({ error: "Could not verify the account" }, { status: 500 });
  }
}
