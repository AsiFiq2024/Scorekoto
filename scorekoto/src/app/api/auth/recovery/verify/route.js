import { NextResponse } from "next/server";
import { withTransaction } from "@/app/lib/db";
import {
  AuthOtpError,
  RECOVERY_TOKEN_TTL_SECONDS,
  createRecoveryToken,
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
    const result = await withTransaction(async (client) => {
      const challenge = await lockAndVerifyOtp(client, {
        challengeId,
        otp,
        purpose: "recovery",
      });
      const userId = Number(challenge.payload?.userId);
      const userResult = await client.query(
        "SELECT user_id, username FROM users WHERE user_id = $1 LIMIT 1",
        [userId]
      );
      if (userResult.rows.length === 0) {
        throw new AuthOtpError("The recovery request is no longer valid", 400, "RECOVERY_INVALID");
      }

      const recoveryToken = createRecoveryToken(challengeId);
      await client.query(
        `UPDATE auth_otp_challenge
         SET verified_at = CURRENT_TIMESTAMP,
             recovery_token_digest = $2,
             recovery_token_expires_at = CURRENT_TIMESTAMP + INTERVAL '15 minutes'
         WHERE challenge_id = $1`,
        [challengeId, recoveryToken.digest]
      );
      return {
        token: recoveryToken.token,
        username: userResult.rows[0].username,
      };
    });

    return NextResponse.json({
      success: true,
      message: "Email verified. You can now update your account.",
      recoveryToken: result.token,
      currentUsername: result.username,
      expiresIn: RECOVERY_TOKEN_TTL_SECONDS,
    });
  } catch (error) {
    console.error("Recovery verification error:", error);
    if (error instanceof AuthOtpError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    return NextResponse.json({ error: "Could not verify the recovery code" }, { status: 500 });
  }
}
