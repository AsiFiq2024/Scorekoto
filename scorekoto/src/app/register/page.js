"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthShowcase from "@/components/AuthShowcase";
import Icon from "@/components/Icon";
import { useAuth } from "@/context/AuthContext";

export default function RegisterPage() {
  const router = useRouter();
  const { register, user } = useAuth();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) router.push("/");
  }, [user, router]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!username.trim() || !email.trim() || !password || !confirmPassword) {
      setError("All fields are required.");
      return;
    }
    if (username.trim().length < 3) {
      setError("Username must be at least 3 characters long.");
      return;
    }
    if (!email.includes("@") || !email.includes(".")) {
      setError("Please enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
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
      router.push("/");
      router.refresh();
    } else {
      setError(result.error || "Failed to create account. Please try again.");
    }
  };

  return (
    <section className="auth-page-container">
      <div className="auth-shell auth-shell-register">
        <AuthShowcase variant="register" />

        <div className="auth-card">
          <div className="auth-header">
            <span className="auth-kicker">Join the match</span>
            <h1>Create your account</h1>
            <p>Free to join. Set up your personalized football feed in a minute.</p>
          </div>

          {error && (
            <div className="auth-error-banner" role="alert" aria-live="polite">
              <Icon name="alert" /> {error}
            </div>
          )}

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
                    placeholder="6+ characters"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="new-password"
                    minLength={6}
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
                    minLength={6}
                    required
                  />
                </div>
              </div>
            </div>

            <button type="submit" disabled={isSubmitting} className="auth-submit-btn">
              {isSubmitting ? (
                <><Icon name="loader" className="icon-spin" /> Creating account...</>
              ) : (
                <>Create account <Icon name="chevronRight" /></>
              )}
            </button>
          </form>

          <p className="auth-terms">By creating an account, you agree to use Scorekoto responsibly.</p>

          <Link href="/" className="auth-guest-link">
            <Icon name="globe" />
            Continue as guest
          </Link>

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
