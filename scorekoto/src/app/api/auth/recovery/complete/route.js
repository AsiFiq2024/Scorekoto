import { NextResponse } from "next/server";
import { hashPassword } from "@/app/lib/auth";
import { withTransaction } from "@/app/lib/db";
import {
  AuthOtpError,
  ensureAuthOtpSchema,
  isValidPassword,
  isValidUsername,
  normalizeUsername,
  recoveryTokenMatches,
} from "@/app/lib/auth-otp";

export async function POST(request) {
  try {
    const { challengeId, recoveryToken, username, password } = await request.json();
    if (!challengeId || !recoveryToken) {
      return NextResponse.json({ error: "Recovery authorization is required" }, { status: 400 });
    }

    const cleanUsername = username ? normalizeUsername(username) : null;
    if (cleanUsername && !isValidUsername(cleanUsername)) {
      return NextResponse.json(
        { error: "Username must be 3-30 characters using letters, numbers, dots, dashes, or underscores" },
        { status: 400 }
      );
    }
    if (password && !isValidPassword(password)) {
      return NextResponse.json(
        { error: "Password must be between 8 and 128 characters long" },
        { status: 400 }
      );
    }
    if (!cleanUsername && !password) {
      return NextResponse.json({ error: "Enter a new username or password" }, { status: 400 });
    }

    await ensureAuthOtpSchema();
    const passwordHash = password ? await hashPassword(password) : null;
    const updatedUser = await withTransaction(async (client) => {
      const challengeResult = await client.query(
        `SELECT * FROM auth_otp_challenge
         WHERE challenge_id = $1 AND purpose = 'recovery'
         FOR UPDATE`,
        [challengeId]
      );
      const challenge = challengeResult.rows[0];
      if (
        !challenge ||
        challenge.consumed_at ||
        !challenge.verified_at ||
        !challenge.recovery_token_digest ||
        !challenge.recovery_token_expires_at ||
        new Date(challenge.recovery_token_expires_at).getTime() <= Date.now() ||
        !recoveryTokenMatches(challengeId, recoveryToken, challenge.recovery_token_digest)
      ) {
        throw new AuthOtpError("Recovery authorization is invalid or expired", 400, "RECOVERY_EXPIRED");
      }

      const userId = Number(challenge.payload?.userId);
      if (cleanUsername) {
        const conflict = await client.query(
          "SELECT user_id FROM users WHERE LOWER(username) = LOWER($1) AND user_id <> $2 LIMIT 1",
          [cleanUsername, userId]
        );
        if (conflict.rows.length > 0) {
          throw new AuthOtpError("Username is already taken", 409, "USERNAME_TAKEN");
        }
      }

      const updateResult = await client.query(
        `UPDATE users
         SET username = COALESCE($2, username),
             password_hash = COALESCE($3, password_hash),
             auth_version = auth_version + 1
         WHERE user_id = $1
         RETURNING user_id, username, email`,
        [userId, cleanUsername, passwordHash]
      );
      if (updateResult.rows.length === 0) {
        throw new AuthOtpError("The account no longer exists", 400, "ACCOUNT_NOT_FOUND");
      }

      if (cleanUsername) {
        await client.query(
          "UPDATE match_comment SET username = $1 WHERE user_id = $2",
          [cleanUsername, userId]
        );
      }
      await client.query(
        "UPDATE auth_otp_challenge SET consumed_at = CURRENT_TIMESTAMP WHERE challenge_id = $1",
        [challengeId]
      );
      return updateResult.rows[0];
    });

    return NextResponse.json({
      success: true,
      message: "Your account details were updated. Sign in with your new credentials.",
      username: updatedUser.username,
    });
  } catch (error) {
    console.error("Recovery completion error:", error);
    if (error instanceof AuthOtpError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    return NextResponse.json({ error: "Could not update the account" }, { status: 500 });
  }
}
