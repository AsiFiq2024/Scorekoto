import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import pool from "@/app/lib/db";
import {
  AuthOtpError,
  createOtpChallenge,
  isEmailServiceConfigured,
  isValidEmail,
  normalizeEmail,
} from "@/app/lib/auth-otp";

const GENERIC_MESSAGE = "If an account exists for that email, a verification code has been sent.";

export async function POST(request) {
  try {
    const { email } = await request.json();
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
    }
    if (!isEmailServiceConfigured()) {
      return NextResponse.json(
        { error: "Account recovery email is not configured" },
        { status: 503 }
      );
    }

    const cleanEmail = normalizeEmail(email);
    const userResult = await pool.query(
      "SELECT user_id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1",
      [cleanEmail]
    );
    let challengeId = randomUUID();

    if (userResult.rows.length > 0) {
      try {
        const challenge = await createOtpChallenge({
          purpose: "recovery",
          email: cleanEmail,
          payload: { userId: userResult.rows[0].user_id },
          request,
        });
        challengeId = challenge.challengeId;
      } catch (error) {
        // Recovery requests deliberately return the same result for unknown,
        // throttled, and known email addresses to prevent account discovery.
        console.error("Recovery email request was not delivered:", error);
      }
    }

    return NextResponse.json({
      success: true,
      message: GENERIC_MESSAGE,
      challengeId,
      expiresIn: 600,
      resendAfter: 60,
    });
  } catch (error) {
    console.error("Recovery request error:", error);
    if (error instanceof AuthOtpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Could not start account recovery" }, { status: 500 });
  }
}
