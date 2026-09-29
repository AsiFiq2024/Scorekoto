"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthShowcase from "@/components/AuthShowcase";
import Icon from "@/components/Icon";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { login, user } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    router.push(user.role === "admin" ? "/admin" : "/");
  }, [user, router]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!identifier.trim() || !password) {
      setError("Please enter your username or email and password.");
      return;
    }

    setIsSubmitting(true);
    const result = await login(identifier, password);
    setIsSubmitting(false);

    if (result.success) {
      router.push(result.user?.role === "admin" ? "/admin" : "/");
      router.refresh();
    } else {
      setError(result.error || "Invalid username, email, or password.");
    }
  };

  return (
    <section className="auth-page-container">
      <div className="auth-shell">
        <AuthShowcase variant="login" />

        <div className="auth-card">
          <div className="auth-header">
            <span className="auth-kicker">Member access</span>
            <h1>Welcome back</h1>
            <p>Sign in to continue to your personalized football hub.</p>
          </div>

          {error && (
            <div className="auth-error-banner" role="alert" aria-live="polite">
              <Icon name="alert" /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-field">
              <label htmlFor="identifier">Username or email</label>
              <div className="auth-input-wrap">
                <Icon name="user" />
                <input
                  id="identifier"
                  type="text"
                  placeholder="Enter your username or email"
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  autoComplete="username"
                  aria-invalid={Boolean(error)}
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="auth-field">
              <label htmlFor="password">Password</label>
              <div className="auth-input-wrap">
                <Icon name="lock" />
                <input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  aria-invalid={Boolean(error)}
                  required
                />
              </div>
            </div>

            <button type="submit" disabled={isSubmitting} className="auth-submit-btn">
              {isSubmitting ? (
                <><Icon name="loader" className="icon-spin" /> Signing in...</>
              ) : (
                <>Sign in <Icon name="chevronRight" /></>
              )}
            </button>
          </form>

          <Link href="/" className="auth-guest-link">
            <Icon name="globe" />
            Continue as guest
          </Link>

          <div className="auth-footer">
            <p>
              Don&apos;t have an account?{" "}
              <Link href="/register" className="auth-switch-link">Create one free</Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
