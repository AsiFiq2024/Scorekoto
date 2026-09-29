"use client";

import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/Icon";

const CATEGORIES = [
  { id: "all", label: "All News" },
  { id: "Premier League", label: "Premier League" },
  { id: "Champions League", label: "Champions League" },
  { id: "La Liga", label: "La Liga" },
  { id: "Serie A", label: "Serie A" },
  { id: "Bundesliga", label: "Bundesliga" },
  { id: "transfer", label: "Transfers" },
];

export default function NewsHubPage() {
  const [news, setNews] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNewsArticles = useCallback(async (forceRefresh = false) => {
    try {
      if (forceRefresh) setRefreshing(true);
      else setLoading(true);

      const params = new URLSearchParams({ limit: "36" });
      if (forceRefresh) params.set("forceRefresh", "true");
      if (selectedCategory && selectedCategory !== "all") params.set("category", selectedCategory);
      if (search.trim()) params.set("q", search.trim());

      const res = await fetch(`/api/news?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.news && Array.isArray(data.news)) {
          setNews(data.news);
        }
      }
    } catch (err) {
      console.error("Failed to load news articles:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCategory, search]);

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchNewsArticles(false);
    }, 200);
    return () => clearTimeout(handler);
  }, [fetchNewsArticles]);

  return (
    <div className="news-hub-page">
      <section className="page-title">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <span className="page-title-kicker">Live football coverage</span>
            <h1>
              <Icon name="football" /> Football News & Transfer Hub
            </h1>
            <p>
              Real-time headlines, transfer updates, and match analysis from top global sports outlets.
            </p>
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => fetchNewsArticles(true)}
            disabled={loading || refreshing}
            style={{ display: "inline-flex", alignItems: "center", gap: "8px", height: "40px", padding: "0 16px" }}
          >
            <span style={{ display: "inline-block", transform: refreshing ? "rotate(180deg)" : "none", transition: "transform 300ms ease" }}>
              <Icon name="refresh" />
            </span>
            {refreshing ? "Refreshing..." : "Refresh News"}
          </button>
        </div>

        <div className="teams-search-bar" style={{ marginTop: "20px" }}>
          <input
            type="text"
            placeholder="Search news by player, club, or headline (e.g. Haaland, Real Madrid, Mbappe, Arsenal)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="news-category-pills" style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "14px" }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`pill-btn ${selectedCategory === cat.id ? "active" : ""}`}
              style={{
                padding: "6px 14px",
                borderRadius: "20px",
                fontSize: "13px",
                fontWeight: "600",
                cursor: "pointer",
                border: "1px solid var(--border)",
                background: selectedCategory === cat.id ? "var(--mint)" : "var(--surface)",
                color: selectedCategory === cat.id ? "var(--black, #000)" : "var(--foreground)",
                transition: "all 150ms ease",
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </section>

      {loading && news.length === 0 ? (
        <div className="teams-loading" style={{ textAlign: "center", padding: "48px 0" }}>
          <p style={{ color: "var(--muted)", fontSize: "14px" }}>Fetching latest football headlines...</p>
        </div>
      ) : news.length === 0 ? (
        <div className="empty-message" style={{ textAlign: "center", padding: "48px 20px" }}>
          <p>No football news found matching your criteria.</p>
          {(search || selectedCategory !== "all") && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setSearch("");
                setSelectedCategory("all");
              }}
              style={{ marginTop: "12px" }}
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="news-hub-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 280px), 1fr))", gap: "20px", marginTop: "24px" }}>
          {news.map((item) => {
            const imageSrc = item.image || item.teamLogo;
            return (
              <article
                key={item.id}
                className="news-card"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  background: "var(--surface)",
                  borderRadius: "14px",
                  border: "1px solid var(--border)",
                  overflow: "hidden",
                  transition: "transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease",
                }}
              >
                <div style={{ position: "relative", height: "180px", width: "100%", background: "var(--mint-soft)" }}>
                  {imageSrc ? (
                    <img
                      src={imageSrc}
                      alt=""
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                        const fallback = e.currentTarget.parentElement?.querySelector(".news-hub-fallback");
                        if (fallback) fallback.style.display = "flex";
                      }}
                    />
                  ) : null}
                  <div
                    className="news-hub-fallback"
                    style={{
                      display: imageSrc ? "none" : "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "100%",
                      height: "100%",
                      background: "var(--surface-light)",
                      fontSize: "36px",
                      color: "var(--muted)",
                    }}
                  >
                    <Icon name="football" />
                  </div>
                </div>

                <div style={{ padding: "18px", display: "flex", flexDirection: "column", flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", marginBottom: "10px" }}>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: "700",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        color: "var(--mint)",
                        background: "var(--mint-softer)",
                        padding: "3px 8px",
                        borderRadius: "6px",
                      }}
                    >
                      {item.category || "Football"}
                    </span>
                    <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                      {item.time}
                    </span>
                  </div>

                  <h3
                    style={{
                      margin: "0 0 10px",
                      fontSize: "16px",
                      fontWeight: "750",
                      lineHeight: "1.4",
                      color: "var(--foreground)",
                    }}
                  >
                    {item.title}
                  </h3>

                  {item.description && (
                    <p
                      style={{
                        margin: "0 0 16px",
                        fontSize: "13px",
                        lineHeight: "1.5",
                        color: "var(--muted)",
                        display: "-webkit-box",
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                        flex: 1,
                      }}
                    >
                      {item.description}
                    </p>
                  )}

                  {item.url ? (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="news-read-more"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        marginTop: "auto",
                        fontSize: "13px",
                        fontWeight: "700",
                        color: "var(--mint)",
                        textDecoration: "none",
                      }}
                    >
                      Read Full Article ↗
                    </a>
                  ) : (
                    <span style={{ marginTop: "auto", fontSize: "12px", color: "var(--muted)" }}>
                      Official Sports Report
                    </span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

