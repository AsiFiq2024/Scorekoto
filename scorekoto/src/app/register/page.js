"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthShowcase from "@/components/AuthShowcase";
import Icon from "@/components/Icon";
import { useAuth } from "@/context/AuthContext";
import { startRouteProgress } from "@/app/lib/route-progress";

export default function RegisterPage() {
  const router = useRouter();
  const { register, verifyRegistration, user } = useAuth();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [step, setStep] = useState("details");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);

  useEffect(() => {
    if (user) {
      startRouteProgress();
      router.push("/");
    }
  }, [user, router]);

  useEffect(() => {
    if (resendSeconds <= 0) return undefined;
    const timer = window.setTimeout(
      () => setResendSeconds((seconds) => Math.max(0, seconds - 1)),
      1000
    );
    return () => window.clearTimeout(timer);
  }, [resendSeconds]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!username.trim() || !email.trim() || !password || !confirmPassword) {
      setError("All fields are required.");
      return;
    }
    if (!/^[a-zA-Z0-9_.-]{3,30}$/.test(username.trim())) {
      setError("Use 3-30 letters, numbers, dots, dashes, or underscores for your username.");
      return;
    }
    if (!email.includes("@") || !email.includes(".")) {
      setError("Please enter a valid email address.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    const result = await register(username.trim(), email.trim(), password);
    setIsSubmitting(false);

    if (result.success) {
      setChallengeId(result.challengeId);
      setOtp("");
      setNotice(result.message || "We sent a verification code to your email.");
      setResendSeconds(result.resendAfter || 60);
      setStep("verify");
    } else {
      setError(result.error || "Failed to create account. Please try again.");
    }
  };

  const handleVerify = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!/^\d{6}$/.test(otp)) {
      setError("Enter the 6-digit code from your email.");
      return;
    }

    setIsSubmitting(true);
    const result = await verifyRegistration(challengeId, otp);
    setIsSubmitting(false);
    if (result.success) {
      startRouteProgress();
      router.push("/");
      router.refresh();
    } else {
      setError(result.error || "Could not verify your email.");
    }
  };

  const handleResend = async () => {
    if (resendSeconds > 0 || isSubmitting) return;
    setError("");
    setNotice("");
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/otp/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Could not resend the code.");
      } else {
        setNotice(data.message);
        setOtp("");
        setResendSeconds(data.resendAfter || 60);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="auth-page-container">
      <div className="auth-shell auth-shell-register">
        <AuthShowcase variant="register" />

        <div className="auth-card">
          <div className="auth-header">
            <span className="auth-kicker">Join the match</span>
            <h1>{step === "verify" ? "Verify your email" : "Create your account"}</h1>
            <p>{step === "verify"
              ? <>Enter the code sent to <strong>{email}</strong>.</>
              : "Free to join. Set up your personalized football feed in a minute."}</p>
          </div>

          {error && (
            <div className="auth-error-banner" role="alert" aria-live="polite">
              <Icon name="alert" /> {error}
            </div>
          )}

          {notice && (
            <div className="auth-success-banner" role="status" aria-live="polite">
              <Icon name="check" /> {notice}
            </div>
          )}

          {step === "details" ? (
            <form onSubmit={handleSubmit} className="auth-form">
              <div className="auth-field-row auth-field-row-single">
                <div className="auth-field">
                  <label htmlFor="username">Username</label>
                  <div className="auth-input-wrap">
                    <Icon name="user" />
                    <input
                      id="username"
                      type="text"
                      placeholder="Choose a username"
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                      autoComplete="username"
                      minLength={3}
                      maxLength={30}
                      pattern="[a-zA-Z0-9_.-]+"
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <div className="auth-field">
                  <label htmlFor="email">Email address</label>
                  <div className="auth-input-wrap">
                    <Icon name="mail" />
                    <input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      autoComplete="email"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="auth-field-row">
                <div className="auth-field">
                  <label htmlFor="password">Password</label>
                  <div className="auth-input-wrap">
                    <Icon name="lock" />
                    <input
                      id="password"
                      type="password"
                      placeholder="8+ characters"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      autoComplete="new-password"
                      minLength={8}
                      maxLength={128}
                      required
                    />
                  </div>
                </div>

                <div className="auth-field">
                  <label htmlFor="confirmPassword">Confirm password</label>
                  <div className="auth-input-wrap">
                    <Icon name="lock" />
                    <input
                      id="confirmPassword"
                      type="password"
                      placeholder="Repeat password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      autoComplete="new-password"
                      minLength={8}
                      maxLength={128}
                      required
                    />
                  </div>
                </div>
              </div>

              <button type="submit" disabled={isSubmitting} className="auth-submit-btn">
                {isSubmitting ? (
                  <><Icon name="loader" className="icon-spin" /> Sending code...</>
                ) : (
                  <>Continue with email verification <Icon name="chevronRight" /></>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerify} className="auth-form auth-otp-form">
              <div className="auth-field">
                <label htmlFor="registration-otp">Verification code</label>
                <div className="auth-input-wrap auth-otp-input-wrap">
                  <Icon name="shield" />
                  <input
                    id="registration-otp"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    placeholder="000000"
                    value={otp}
                    onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                    required
                    autoFocus
                  />
                </div>
              </div>

              <button type="submit" disabled={isSubmitting} className="auth-submit-btn">
                {isSubmitting ? (
                  <><Icon name="loader" className="icon-spin" /> Verifying...</>
                ) : (
                  <>Verify and create account <Icon name="chevronRight" /></>
                )}
              </button>

              <div className="auth-otp-actions">
                <button type="button" className="auth-inline-action" onClick={handleResend} disabled={resendSeconds > 0 || isSubmitting}>
                  {resendSeconds > 0 ? `Send another code in ${resendSeconds}s` : "Send another code"}
                </button>
                <button
                  type="button"
                  className="auth-inline-action"
                  onClick={() => {
                    setStep("details");
                    setError("");
                    setNotice("");
                  }}
                >
                  Change account details
                </button>
              </div>
            </form>
          )}

          {step === "details" && (
            <>
              <p className="auth-terms">By creating an account, you agree to use Scorekoto responsibly.</p>
              <Link href="/" className="auth-guest-link">
                <Icon name="globe" />
                Continue as guest
              </Link>
            </>
          )}

          <div className="auth-footer">
            <p>
              Already have an account?{" "}
              <Link href="/login" className="auth-switch-link">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
