"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Icon from "./Icon";
import { useAuth } from "@/context/AuthContext";

export default function NotificationBell() {
  const { user, loading: authLoading } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hasFavorites, setHasFavorites] = useState(true);
  const [loadedUserId, setLoadedUserId] = useState(null);
  const wrapperRef = useRef(null);
  const buttonRef = useRef(null);
  const seenNotificationKeysRef = useRef(new Set());

  const markCurrentNotificationsAsRead = useCallback(() => {
    if (!user) return;

    setNotifications(prepareNotifications(
      notifications,
      user.user_id,
      seenNotificationKeysRef,
      true
    ));
  }, [notifications, user]);

  const closeNotifications = useCallback(() => {
    markCurrentNotificationsAsRead();
    setOpen(false);
  }, [markCurrentNotificationsAsRead]);

  async function retryNotifications() {
    if (!user) return;

    setLoading(true);
    setError("");

    try {
      const result = await requestNotifications();
      setNotifications(prepareNotifications(
        result.notifications,
        user.user_id,
        seenNotificationKeysRef,
        false
      ));
      setHasFavorites(result.hasFavorites);
    } catch (err) {
      console.error("Failed to load notifications:", err);
      setError("Match updates are unavailable right now.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (authLoading || !user) return undefined;

    const controller = new AbortController();

    requestNotifications(controller.signal)
      .then((result) => {
        setNotifications(prepareNotifications(
          result.notifications,
          user.user_id,
          seenNotificationKeysRef,
          false
        ));
        setHasFavorites(result.hasFavorites);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.error("Failed to load notifications:", err);
          setError("Match updates are unavailable right now.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
          setLoadedUserId(user.user_id);
        }
      });

    return () => controller.abort();
  }, [user, authLoading]);

  useEffect(() => {
    if (!open) return undefined;

    function handlePointerDown(event) {
      if (!wrapperRef.current?.contains(event.target)) {
        closeNotifications();
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        closeNotifications();
        buttonRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, closeNotifications]);

  const visibleNotifications = user ? notifications : [];
  const visibleError = user ? error : "";
  const isLoading = authLoading || (Boolean(user) && (loading || loadedUserId !== user.user_id));
  const unreadCount = visibleNotifications.filter((item) => !item.read).length;
  const buttonLabel = unreadCount > 0
    ? `Notifications, ${unreadCount} unread`
    : "Notifications";

  function toggleNotifications() {
    if (open) {
      closeNotifications();
    } else {
      setOpen(true);
    }
  }

  return (
    <div className="notification-wrapper" ref={wrapperRef}>
      <button
        ref={buttonRef}
        type="button"
        className={`notification-button${open ? " notification-button-open" : ""}`}
        onClick={toggleNotifications}
        aria-label={buttonLabel}
        aria-expanded={open}
        aria-controls="notification-panel"
        title={buttonLabel}
      >
        <Icon name="bell" />
        {unreadCount > 0 && (
          <span className="notification-count" aria-hidden="true">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="notification-panel"
          id="notification-panel"
          role="dialog"
          aria-modal="false"
          aria-labelledby="notification-title"
          aria-busy={isLoading}
        >
          <div className="notification-header">
            <div className="notification-header-icon" aria-hidden="true">
              <Icon name="bell" />
            </div>
            <div className="notification-heading">
              <strong id="notification-title">Notifications</strong>
              <span>{user ? "Updates from your favorites" : "Personalized match updates"}</span>
            </div>
            {!isLoading && !visibleError && user && hasFavorites && (
              <span className={`notification-summary${unreadCount > 0 ? " has-unread" : ""}`}>
                {unreadCount > 0 ? `${unreadCount} new` : "Up to date"}
              </span>
            )}
          </div>

          {isLoading && (
            <div className="notification-list notification-loading" aria-label="Loading match updates">
              {[0, 1, 2].map((item) => (
                <div className="notification-skeleton" key={item} aria-hidden="true">
                  <span className="notification-skeleton-icon" />
                  <span className="notification-skeleton-copy">
                    <i />
                    <i />
                    <i />
                  </span>
                </div>
              ))}
            </div>
          )}

          {!isLoading && visibleError && (
            <div className="notification-state" role="status">
              <span className="notification-state-icon notification-state-icon-error">
                <Icon name="alert" />
              </span>
              <strong>Couldn&apos;t load updates</strong>
              <p>{visibleError}</p>
              <button type="button" onClick={retryNotifications}>
                <Icon name="refresh" />
                Try again
              </button>
            </div>
          )}

          {!isLoading && !visibleError && visibleNotifications.length === 0 && (
            user ? (
              <div className="notification-state" role="status">
                <span className="notification-state-icon">
                  <Icon name={hasFavorites ? "check" : "star"} />
                </span>
                <strong>{hasFavorites ? "You're all caught up" : "Choose your favorites"}</strong>
                <p>{hasFavorites
                  ? "New activity from your favorite teams, leagues, and players will appear here."
                  : "Add teams, leagues, or players to your favorites to get updates here."}</p>
                {!hasFavorites && <Link className="notification-state-link" href="/favorites">View favorites</Link>}
              </div>
            ) : (
              <div className="notification-state" role="status">
                <span className="notification-state-icon">
                  <Icon name="bell" />
                </span>
                <strong>Follow your favorites</strong>
                <p>Sign up or log in to get updates about your favorite teams, leagues, and players.</p>
                <div className="notification-auth-links">
                  <Link href="/register">Sign up</Link>
                  <Link href="/login">Log in</Link>
                </div>
              </div>
            )
          )}

          {!isLoading && !visibleError && visibleNotifications.length > 0 && (
            <div className="notification-list">
              {visibleNotifications.map((notification) => {
                const tone = getNotificationTone(notification.type);

                return (
                  <Link
                    key={notification.id}
                    href={`/matches/${notification.matchId}`}
                    className={`notification-item notification-item-${tone}${notification.read ? "" : " unread"}`}
                    onClick={closeNotifications}
                  >
                    <span className="notification-icon" aria-hidden="true">
                      {getIcon(notification.type)}
                    </span>

                    <span className="notification-content">
                      <span className="notification-title-row">
                        <strong>{notification.title}</strong>
                        {!notification.read && <i className="notification-unread-dot" />}
                      </span>
                      <span className="notification-message">{notification.message}</span>
                      <span className="notification-time">
                        <Icon name="clock" />
                        {notification.time}
                      </span>
                    </span>

                    <Icon name="chevronRight" className="notification-arrow" />
                  </Link>
                );
              })}
            </div>
          )}

          {!isLoading && !visibleError && visibleNotifications.length > 0 && (
            <div className="notification-footer">
              <span className="notification-live-dot" aria-hidden="true" />
              Match updates refresh automatically
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function getIcon(type) {
  if (type === "goal") return <Icon name="football" />;
  if (type === "live") return <span className="notification-live-dot" aria-hidden="true" />;
  if (type === "upcoming") return <Icon name="clock" />;
  return <Icon name="flag" />;
}

function getNotificationTone(type) {
  if (["goal", "live", "upcoming"].includes(type)) return type;
  return "result";
}

async function requestNotifications(signal) {
  const res = await fetch("/api/notifications?limit=6", { signal });
  if (!res.ok) throw new Error("Unable to load match updates");

  const data = await res.json();
  return {
    notifications: Array.isArray(data.notifications) ? data.notifications : [],
    hasFavorites: data.hasFavorites === true,
  };
}

function getNotificationKey(notification) {
  return `${notification.id}:${notification.type}:${notification.message}`;
}

function getSeenNotificationKeys(userId) {
  if (typeof window === "undefined" || !userId) return new Set();

  try {
    const stored = window.localStorage.getItem(`scorekoto-notifications-seen:${userId}`);
    const keys = stored ? JSON.parse(stored) : [];
    return new Set(Array.isArray(keys) ? keys : []);
  } catch {
    return new Set();
  }
}

function prepareNotifications(notifications, userId, seenKeysRef, markAllAsSeen) {
  const seenKeys = getSeenNotificationKeys(userId);

  if (markAllAsSeen) {
    notifications.forEach((notification) => seenKeys.add(getNotificationKey(notification)));

    try {
      const recentKeys = Array.from(seenKeys).slice(-100);
      window.localStorage.setItem(
        `scorekoto-notifications-seen:${userId}`,
        JSON.stringify(recentKeys)
      );
      seenKeysRef.current = new Set(recentKeys);
    } catch {
      seenKeysRef.current = seenKeys;
    }
  } else {
    seenKeysRef.current = seenKeys;
  }

  return notifications.map((notification) => {
    const isRead = notification.read || seenKeysRef.current.has(getNotificationKey(notification));
    return isRead === notification.read ? notification : { ...notification, read: isRead };
  });
}
