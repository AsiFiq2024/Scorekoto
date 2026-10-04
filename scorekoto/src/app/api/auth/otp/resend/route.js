import { NextResponse } from "next/server";
import { AuthOtpError, resendOtpChallenge } from "@/app/lib/auth-otp";

export async function POST(request) {
  try {
    const { challengeId } = await request.json();
    if (!challengeId) {
      return NextResponse.json({ error: "Verification request is required" }, { status: 400 });
    }

    const result = await resendOtpChallenge(challengeId, "registration");
    return NextResponse.json({
      success: true,
      message: "A new verification code was sent",
      ...result,
    });
  } catch (error) {
    console.error("OTP resend error:", error);
    if (error instanceof AuthOtpError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    return NextResponse.json({ error: "Could not resend the verification code" }, { status: 500 });
  }
}
