"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AuthShowcase from "@/components/AuthShowcase";
import Icon from "@/components/Icon";

export default function RecoverAccountPage() {
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [recoveryToken, setRecoveryToken] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);

  useEffect(() => {
    if (resendSeconds <= 0) return undefined;
    const timer = window.setTimeout(
      () => setResendSeconds((seconds) => Math.max(0, seconds - 1)),
      1000
    );
    return () => window.clearTimeout(timer);
  }, [resendSeconds]);

  const requestCode = async () => {
    const response = await fetch("/api/auth/recovery/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not send a recovery code.");
    setChallengeId(data.challengeId);
    setOtp("");
    setNotice(data.message);
    setResendSeconds(data.resendAfter || 60);
    setStep("code");
  };

  const handleEmailSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!email.includes("@") || !email.includes(".")) {
      setError("Enter the email address connected to your account.");
      return;
    }

    setIsSubmitting(true);
    try {
      await requestCode();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (resendSeconds > 0 || isSubmitting) return;
    setError("");
    setNotice("");
    setIsSubmitting(true);
    try {
      await requestCode();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCodeSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!/^\d{6}$/.test(otp)) {
      setError("Enter the 6-digit code from your email.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/recovery/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId, otp }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not verify the code.");

      setRecoveryToken(data.recoveryToken);
      setUsername(data.currentUsername || "");
      setNotice(data.message);
      setStep("reset");
    } catch (verificationError) {
      setError(verificationError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!/^[a-zA-Z0-9_.-]{3,30}$/.test(username.trim())) {
      setError("Use 3-30 letters, numbers, dots, dashes, or underscores for your username.");
      return;
    }
    if (password && password.length < 8) {
      setError("A new password must be at least 8 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/recovery/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengeId,
          recoveryToken,
          username: username.trim(),
          password: password || undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not update your account.");

      setUsername(data.username || username.trim());
      setNotice(data.message);
      setStep("success");
    } catch (resetError) {
      setError(resetError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const titleByStep = {
    email: "Recover your account",
    code: "Check your email",
    reset: "Update your sign-in",
    success: "Account updated",
  };

  return (
    <section className="auth-page-container">
      <div className="auth-shell">
        <AuthShowcase variant="login" />

        <div className="auth-card">
          <div className="auth-header">
            <span className="auth-kicker">Secure recovery</span>
            <h1>{titleByStep[step]}</h1>
            <p>
              {step === "email" && "Enter the email address connected to your ScoreKoto account."}
              {step === "code" && <>Enter the code sent to <strong>{email}</strong>.</>}
              {step === "reset" && "Your email is verified. Review your username or choose new sign-in details."}
              {step === "success" && "Your new credentials are ready to use."}
            </p>
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

          {step === "email" && (
            <form className="auth-form" onSubmit={handleEmailSubmit}>
              <div className="auth-field">
                <label htmlFor="recovery-email">Account email</label>
                <div className="auth-input-wrap">
                  <Icon name="mail" />
                  <input
                    id="recovery-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    autoFocus
                  />
                </div>
              </div>
              <button type="submit" disabled={isSubmitting} className="auth-submit-btn">
                {isSubmitting
                  ? <><Icon name="loader" className="icon-spin" /> Sending code...</>
                  : <>Send recovery code <Icon name="chevronRight" /></>}
              </button>
            </form>
          )}

          {step === "code" && (
            <form className="auth-form auth-otp-form" onSubmit={handleCodeSubmit}>
              <div className="auth-field">
                <label htmlFor="recovery-otp">Verification code</label>
                <div className="auth-input-wrap auth-otp-input-wrap">
                  <Icon name="shield" />
                  <input
                    id="recovery-otp"
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
                {isSubmitting
                  ? <><Icon name="loader" className="icon-spin" /> Verifying...</>
                  : <>Verify email <Icon name="chevronRight" /></>}
              </button>
              <div className="auth-otp-actions">
                <button type="button" className="auth-inline-action" onClick={handleResend} disabled={resendSeconds > 0 || isSubmitting}>
                  {resendSeconds > 0 ? `Send another code in ${resendSeconds}s` : "Send another code"}
                </button>
                <button type="button" className="auth-inline-action" onClick={() => setStep("email")}>
                  Use a different email
                </button>
              </div>
            </form>
          )}

          {step === "reset" && (
            <form className="auth-form" onSubmit={handleResetSubmit}>
              <div className="auth-recovered-username">
                <span>Current username</span>
                <strong>{username}</strong>
              </div>
              <div className="auth-field">
                <label htmlFor="new-username">Username</label>
                <div className="auth-input-wrap">
                  <Icon name="user" />
                  <input
                    id="new-username"
                    type="text"
                    autoComplete="username"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    minLength={3}
                    maxLength={30}
                    pattern="[a-zA-Z0-9_.-]+"
                    required
                  />
                </div>
              </div>
              <div className="auth-field-row">
                <div className="auth-field">
                  <label htmlFor="new-password">New password <small>(optional)</small></label>
                  <div className="auth-input-wrap">
                    <Icon name="lock" />
                    <input
                      id="new-password"
                      type="password"
                      autoComplete="new-password"
                      placeholder="8+ characters"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      minLength={password ? 8 : undefined}
                      maxLength={128}
                    />
                  </div>
                </div>
                <div className="auth-field">
                  <label htmlFor="confirm-new-password">Confirm password</label>
                  <div className="auth-input-wrap">
                    <Icon name="lock" />
                    <input
                      id="confirm-new-password"
                      type="password"
                      autoComplete="new-password"
                      placeholder="Repeat password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      minLength={confirmPassword ? 8 : undefined}
                      maxLength={128}
                    />
                  </div>
                </div>
              </div>
              <button type="submit" disabled={isSubmitting} className="auth-submit-btn">
                {isSubmitting
                  ? <><Icon name="loader" className="icon-spin" /> Updating account...</>
                  : <>Save new sign-in details <Icon name="chevronRight" /></>}
              </button>
            </form>
          )}

          {step === "success" && (
            <div className="auth-recovery-complete">
              <Icon name="check" />
              <strong>Your username is {username}</strong>
              <Link href="/login" className="auth-submit-btn">Continue to sign in</Link>
            </div>
          )}

          {step !== "success" && (
            <div className="auth-footer">
              <p>Remembered your details? <Link href="/login" className="auth-switch-link">Back to sign in</Link></p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
