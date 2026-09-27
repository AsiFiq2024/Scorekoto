"use client";

import { useState, useEffect } from "react";
import Icon from "./Icon";

export default function NewsSidebar() {
  const [newsList, setNewsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNews = async (forceRefresh = false) => {
    try {
      if (forceRefresh) setRefreshing(true);
      const url = forceRefresh ? "/api/news?limit=6&forceRefresh=true" : "/api/news?limit=6";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.news && Array.isArray(data.news)) {
          setNewsList(data.news);
        }
      }
    } catch (err) {
      console.error("Failed to load news sidebar:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNews();
    // Auto-refresh news in the background every 5 minutes
    const interval = setInterval(() => {
      fetchNews(false);
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <aside className="news-sidebar">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
        <h2 style={{ margin: 0 }}>Latest News</h2>
        <button
          onClick={() => fetchNews(true)}
          disabled={loading || refreshing}
          title="Refresh latest news"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--muted)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "4px",
            borderRadius: "6px",
            transition: "color 150ms ease, transform 300ms ease",
            transform: refreshing ? "rotate(180deg)" : "none",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--mint)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted)")}
        >
          <Icon name="refresh" />
        </button>
      </div>

      <div className="news-list">
        {loading && newsList.length === 0 && (
          <p style={{ color: "var(--muted)", fontSize: "13px", padding: "8px 0" }}>
            Loading football news...
          </p>
        )}

        {!loading && newsList.length === 0 && (
          <p style={{ color: "var(--muted)", fontSize: "13px", padding: "8px 0" }}>
            No recent football headlines.
          </p>
        )}

        {newsList.map((item) => {
          const imageSrc = item.image || item.teamLogo;
          const Tag = item.url ? "a" : "article";
          const linkProps = item.url
            ? {
                href: item.url,
                target: "_blank",
                rel: "noopener noreferrer",
              }
            : {};

          return (
            <Tag
              key={item.id}
              className="news-item"
              {...linkProps}
              style={{
                textDecoration: "none",
                color: "inherit",
                cursor: item.url ? "pointer" : "default",
              }}
            >
              {imageSrc ? (
                <img
                  src={imageSrc}
                  alt=""
                  className="news-image"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    const fallback = e.currentTarget.parentElement?.querySelector(".news-image-fallback");
                    if (fallback) {
                      fallback.style.display = "flex";
                    }
                  }}
                />
              ) : null}
              <div
                className="news-image news-image-fallback"
                style={{
                  display: imageSrc ? "none" : "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "var(--surface-light)",
                  borderRadius: "8px",
                  fontSize: "18px",
                  color: "var(--foreground)",
                }}
              >
                <Icon name="football" />
              </div>

              <div className="news-content">
                <h3>{item.title}</h3>
                <p>
                  {item.category}
                  {" · "}
                  {item.time}
                </p>
              </div>
            </Tag>
          );
        })}
      </div>
    </aside>
  );
}
