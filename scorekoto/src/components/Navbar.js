"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import GlobalSearch from "./GlobalSearch";
import NotificationBell from "./NotificationBell";
import Icon from "./Icon";
import BrandLogo from "./BrandLogo";
import { useAuth } from "@/context/AuthContext";

export default function Navbar({
  isMobileSidebarOpen = false,
  mobileSidebarTriggerRef,
  onOpenMobileSidebar,
}) {
  const { user, logout, loading } = useAuth();
  const pathname = usePathname();
  const [isDarkMode, setIsDarkMode] = useState(false);

  const primaryLinks = [
    { href: "/", label: "Matches" },
    { href: "/teams", label: "Teams" },
    { href: "/leagues", label: "Leagues" },
    { href: "/news", label: "News" },
  ];

  const isActiveLink = (href) => href === "/"
    ? pathname === "/"
    : pathname === href || pathname.startsWith(`${href}/`);
  const isLoginPage = pathname === "/login";
  const isRegisterPage = pathname === "/register";

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("scorekoto-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const shouldUseDarkMode = savedTheme ? savedTheme === "dark" : prefersDark;

    setIsDarkMode(shouldUseDarkMode);
    document.documentElement.dataset.theme = shouldUseDarkMode ? "dark" : "light";
  }, []);

  function toggleTheme() {
    const nextIsDarkMode = !isDarkMode;
    setIsDarkMode(nextIsDarkMode);
    document.documentElement.dataset.theme = nextIsDarkMode ? "dark" : "light";
    window.localStorage.setItem("scorekoto-theme", nextIsDarkMode ? "dark" : "light");
  }

  return (
    <nav className="navbar">
      <Link href="/" className="navbar-logo">
        <BrandLogo />
      </Link>

      <div className="nav-links">
        <GlobalSearch />

        <NotificationBell />

        <button
          type="button"
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
          title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
        >
          <Icon name={isDarkMode ? "sun" : "moon"} />
          <span className="theme-toggle-label">{isDarkMode ? "Light" : "Dark"}</span>
        </button>

        <div className="nav-primary-links">
          {primaryLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={isActiveLink(item.href) ? "nav-link-active" : undefined}
              aria-current={isActiveLink(item.href) ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </div>

        {user?.role === "admin" && (
          <Link href="/admin" className="nav-admin-link" title="Admin Panel">
            <Icon name="shield" />
            <span className="nav-admin-text">Admin</span>
          </Link>
        )}

        <div className="nav-auth-section">
          {!loading && (
            user ? (
              <div className="nav-user-info">
                <Link href="/profile" className="nav-user-badge" title="Go to My Profile">
                  <Icon name={user.role === "admin" ? "shield" : "user"} />
                  <span className="nav-user-name">{user.username}</span>
                </Link>
                <button
                  onClick={logout}
                  className="nav-logout-btn"
                  title="Log out"
                >
                  Log out
                </button>
              </div>
            ) : (
              <div className="nav-auth-actions">
                <Link
                  href="/login"
                  className={`nav-login-link${isLoginPage ? " nav-auth-active" : ""}${isRegisterPage ? " nav-auth-inactive" : ""}`}
                  aria-current={isLoginPage ? "page" : undefined}
                >
                  Log in
                </Link>
                <Link
                  href="/register"
                  className={`nav-register-btn${isRegisterPage ? " nav-auth-active" : ""}${isLoginPage ? " nav-auth-inactive" : ""}`}
                  aria-current={isRegisterPage ? "page" : undefined}
                >
                  Sign up
                </Link>
              </div>
            )
          )}
        </div>

        <button
          ref={mobileSidebarTriggerRef}
          className="mobile-sidebar-trigger"
          type="button"
          aria-controls="favorite-navigation-drawer"
          aria-expanded={isMobileSidebarOpen}
          aria-label={isMobileSidebarOpen ? "Navigation menu open" : "Open navigation menu"}
          onClick={onOpenMobileSidebar}
        >
          <span className="mobile-sidebar-trigger-icon"><MobileMenuIcon /></span>
        </button>
      </div>
    </nav>
  );
}

function MobileMenuIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}
