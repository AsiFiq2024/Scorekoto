"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import Icon from "./Icon";

const emptySidebarData = {
  favorites: {
    teams: [],
    leagues: [],
    players: [],
  },
};

function CollapseIcon({ isCollapsed }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 6h16M4 12h10M4 18h16" />
      <path d={isCollapsed ? "m16 9 3 3-3 3" : "m17 9-3 3 3 3"} />
    </svg>
  );
}

function SidebarImage({ src, label, type }) {
  const fallbackIcon = type === "league" ? "trophy" : type === "player" ? "player" : "shield";

  return (
    <span className={`sidebar-entity-image ${type === "player" ? "player-image" : ""}`}>
      {src && (
        <img
          src={src}
          alt=""
          className={type === "player" ? undefined : "entity-logo"}
          loading="lazy"
          onError={(event) => {
            event.currentTarget.style.display = "none";
            const fallback = event.currentTarget.nextElementSibling;
            if (fallback) fallback.style.display = "grid";
          }}
        />
      )}
      <span
        className="sidebar-image-fallback"
        style={{ display: src ? "none" : "grid" }}
        aria-hidden="true"
      >
        <Icon name={fallbackIcon} />
      </span>
      <span className="sr-only">{label}</span>
    </span>
  );
}

function SidebarEntry({ href, label, image, type, meta, isCollapsed }) {
  return (
    <Link href={href} title={isCollapsed ? label : undefined}>
      <SidebarImage src={image} label={label} type={type} />
      <span className="sidebar-link-copy">
        <span className="sidebar-link-label">{label}</span>
        {meta && <small>{meta}</small>}
      </span>
    </Link>
  );
}

function SidebarGroup({ title, items, isCollapsed, emptyState }) {
  return (
    <div className="sidebar-group">
      <h3>{title}</h3>
      {items.map((item) => (
        <SidebarEntry {...item} isCollapsed={isCollapsed} key={item.key} />
      ))}
      {items.length === 0 && emptyState}
    </div>
  );
}

function SidebarLoading() {
  return (
    <div className="sidebar-loading" aria-label="Loading sidebar links">
      {[0, 1, 2].map((item) => (
        <span key={item}>
          <i />
          <b />
        </span>
      ))}
    </div>
  );
}

export default function Sidebar({
  isMobileOpen = false,
  mobileTriggerRef,
  onMobileOpenChange,
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [sidebarData, setSidebarData] = useState(emptySidebarData);
  const [isLoading, setIsLoading] = useState(true);
  const { user, logout, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!isMobileOpen) return undefined;

    const previousOverflow = document.body.style.overflow;

    function handleKeyDown(event) {
      if (event.key !== "Escape") return;
      onMobileOpenChange(false);
      window.requestAnimationFrame(() => mobileTriggerRef.current?.focus());
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMobileOpen, mobileTriggerRef, onMobileOpenChange]);

  useEffect(() => {
    function handleViewportChange() {
      if (window.innerWidth > 780) onMobileOpenChange(false);
    }

    handleViewportChange();
    window.addEventListener("resize", handleViewportChange);
    return () => window.removeEventListener("resize", handleViewportChange);
  }, [onMobileOpenChange]);

  useEffect(() => {
    if (authLoading) return;

    let isActive = true;

    async function loadSidebar() {
      try {
        const response = await fetch("/api/sidebar", { cache: "no-store" });
        if (!response.ok) throw new Error("Sidebar request failed");

        const data = await response.json();
        if (isActive) {
          setSidebarData({
            favorites: data.favorites || emptySidebarData.favorites,
          });
        }
      } catch (error) {
        console.error("Failed to load sidebar:", error);
      } finally {
        if (isActive) setIsLoading(false);
      }
    }

    loadSidebar();
    window.addEventListener("scorekoto:favorites-updated", loadSidebar);

    return () => {
      isActive = false;
      window.removeEventListener("scorekoto:favorites-updated", loadSidebar);
    };
  }, [authLoading, user?.user_id]);

  const favTeams = (sidebarData.favorites.teams || []).map((team) => ({
    key: `fav-team-${team.team_id}`,
    href: `/teams/${team.slug || team.team_id}`,
    label: team.name,
    image: team.logo_url,
    type: "team",
    meta: team.short_name || "Team",
  }));

  const favLeagues = (sidebarData.favorites.leagues || []).map((league) => ({
    key: `fav-league-${league.league_id}`,
    href: `/leagues/${league.slug || league.league_id}`,
    label: league.name,
    image: league.logo_url,
    type: "league",
    meta: league.country || "League",
  }));

  const favTeamsEmptyState = user ? (
    <Link
      href="/teams"
      className="sidebar-empty-link"
      title={isCollapsed ? "Add favorite teams" : undefined}
    >
      <span className="sidebar-empty-icon"><Icon name="star" /></span>
      <span className="sidebar-link-copy">
        <span className="sidebar-link-label">No fav teams yet</span>
        <small>Explore & star teams</small>
      </span>
    </Link>
  ) : (
    <Link
      href="/login"
      className="sidebar-empty-link"
      title={isCollapsed ? "Sign in for fav teams" : undefined}
    >
      <span className="sidebar-empty-icon"><Icon name="user" /></span>
      <span className="sidebar-link-copy">
        <span className="sidebar-link-label">Sign in</span>
        <small>Save your favorite teams</small>
      </span>
    </Link>
  );

  const favLeaguesEmptyState = user ? (
    <Link
      href="/leagues"
      className="sidebar-empty-link"
      title={isCollapsed ? "Add favorite leagues" : undefined}
    >
      <span className="sidebar-empty-icon"><Icon name="star" /></span>
      <span className="sidebar-link-copy">
        <span className="sidebar-link-label">No fav leagues yet</span>
        <small>Explore & star leagues</small>
      </span>
    </Link>
  ) : (
    <Link
      href="/login"
      className="sidebar-empty-link"
      title={isCollapsed ? "Sign in for fav leagues" : undefined}
    >
      <span className="sidebar-empty-icon"><Icon name="user" /></span>
      <span className="sidebar-link-copy">
        <span className="sidebar-link-label">Sign in</span>
        <small>Save your favorite leagues</small>
      </span>
    </Link>
  );

  function closeMobileSidebar({ restoreFocus = false } = {}) {
    onMobileOpenChange(false);
    if (restoreFocus) {
      window.requestAnimationFrame(() => mobileTriggerRef.current?.focus());
    }
  }

  return (
    <>
      {isMobileOpen && (
        <button
          className="mobile-sidebar-backdrop"
          type="button"
          aria-label="Close navigation"
          onClick={() => closeMobileSidebar({ restoreFocus: true })}
        />
      )}

      <aside
        id="favorite-navigation-drawer"
        className={`sidebar${isCollapsed ? " sidebar-collapsed" : ""}${isMobileOpen ? " sidebar-mobile-open" : ""}`}
        aria-busy={isLoading}
      >
      <div className="sidebar-inner">
        <div className="mobile-sidebar-drawer-header">
          <div>
            <span>Navigation</span>
            <strong>Favorites</strong>
          </div>
        </div>

        <div className="sidebar-controls">
          <span className="sidebar-controls-label">Favorites</span>
          <button
            className="sidebar-toggle"
            type="button"
            aria-expanded={!isCollapsed}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() => setIsCollapsed((collapsed) => !collapsed)}
          >
            <CollapseIcon isCollapsed={isCollapsed} />
          </button>
        </div>

        <nav
          className="sidebar-navigation"
          aria-label="Favorite football navigation"
          onClick={(event) => {
            if (event.target.closest("a")) closeMobileSidebar();
          }}
        >
          {isLoading ? (
            <SidebarLoading />
          ) : (
            <>
              <SidebarGroup
                title="Fav Teams"
                items={favTeams}
                isCollapsed={isCollapsed}
                emptyState={favTeamsEmptyState}
              />
              <SidebarGroup
                title="Fav Leagues"
                items={favLeagues}
                isCollapsed={isCollapsed}
                emptyState={favLeaguesEmptyState}
              />
            </>
          )}
        </nav>

        <section className="mobile-sidebar-account" aria-label="Account">
          <h3>Account</h3>
          {authLoading ? null : user ? (
            <>
              <Link
                href="/profile"
                className="mobile-sidebar-account-link"
                onClick={() => closeMobileSidebar()}
              >
                <Icon name={user.role === "admin" ? "shield" : "user"} />
                <span>
                  <strong>Profile</strong>
                  <small>{user.username}</small>
                </span>
              </Link>
              {user.role === "admin" && (
                <Link
                  href="/admin"
                  className="mobile-sidebar-account-link"
                  onClick={() => closeMobileSidebar()}
                >
                  <Icon name="shield" />
                  <span><strong>Admin</strong></span>
                </Link>
              )}
              <button
                className="mobile-sidebar-logout"
                type="button"
                onClick={() => {
                  closeMobileSidebar();
                  logout();
                }}
              >
                Log out
              </button>
            </>
          ) : (
            <div className="mobile-sidebar-auth-actions">
              <Link
                href="/login"
                className="mobile-sidebar-login"
                onClick={() => closeMobileSidebar()}
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="mobile-sidebar-signup"
                onClick={() => closeMobileSidebar()}
              >
                Sign up
              </Link>
            </div>
          )}
        </section>
      </div>
      </aside>
    </>
  );
}
