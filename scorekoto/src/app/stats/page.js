"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";

export default function StatsPage() {
  const [activeTab, setActiveTab] = useState("standings"); // 'standings' | 'scorers' | 'rivalries'
  const [data, setData] = useState({ standings: [], top_scorers: [], head_to_head: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterText, setFilterText] = useState("");

  useEffect(() => {
    async function loadStats() {
      try {
        setLoading(true);
        const res = await fetch("/api/analytics");
        if (!res.ok) throw new Error("Failed to load statistics");
        const json = await res.json();
        setData(json.analytics || { standings: [], top_scorers: [], head_to_head: [] });
      } catch (err) {
        console.error("Error fetching stats:", err);
        setError("Unable to load statistics at this time.");
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  // Filtered lists
  const filteredStandings = useMemo(() => {
    if (!filterText) return data.standings;
    const q = filterText.toLowerCase();
    return data.standings.filter(
      (s) =>
        s.team_name?.toLowerCase().includes(q) ||
        s.league_name?.toLowerCase().includes(q)
    );
  }, [data.standings, filterText]);

  const filteredScorers = useMemo(() => {
    if (!filterText) return data.top_scorers;
    const q = filterText.toLowerCase();
    return data.top_scorers.filter(
      (p) =>
        p.player_name?.toLowerCase().includes(q) ||
        p.current_team?.toLowerCase().includes(q) ||
        p.nationality?.toLowerCase().includes(q)
    );
  }, [data.top_scorers, filterText]);

  const filteredRivalries = useMemo(() => {
    if (!filterText) return data.head_to_head;
    const q = filterText.toLowerCase();
    return data.head_to_head.filter(
      (h) =>
        h.home_team_name?.toLowerCase().includes(q) ||
        h.away_team_name?.toLowerCase().includes(q)
    );
  }, [data.head_to_head, filterText]);

  const renderFormBadge = (char, idx) => {
    const c = char?.toUpperCase();
    let bg = "rgba(100, 116, 139, 0.2)";
    let color = "#94a3b8";
    if (c === "W") {
      bg = "rgba(16, 185, 129, 0.2)";
      color = "#34d399";
    } else if (c === "D") {
      bg = "rgba(245, 158, 11, 0.2)";
      color = "#fbbf24";
    } else if (c === "L") {
      bg = "rgba(239, 68, 68, 0.2)";
      color = "#f87171";
    }

    return (
      <span
        key={idx}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: "22px",
          height: "22px",
          borderRadius: "6px",
          background: bg,
          color: color,
          fontSize: "11px",
          fontWeight: "800",
          marginRight: "4px",
        }}
      >
        {c}
      </span>
    );
  };

  return (
    <main className="stats-page">
      {/* PAGE HEADER */}
      <section className="page-title stats-page-header">
        <span className="page-title-kicker">Data & Insights</span>
        <h1><Icon name="target" /> Football Statistics & Leaderboards</h1>
        <p>Comprehensive league tables, form guides, top goalscorers, and head-to-head records across European football.</p>
      </section>

      {/* STATS NAVIGATION & SEARCH */}
      <div className="stats-controls">
        <div className="stats-nav-tabs">
          <button
            type="button"
            className={`stats-tab-btn ${activeTab === "standings" ? "active" : ""}`}
            onClick={() => setActiveTab("standings")}
          >
            <Icon name="trophy" /> League Standings & Form
          </button>
          <button
            type="button"
            className={`stats-tab-btn ${activeTab === "scorers" ? "active" : ""}`}
            onClick={() => setActiveTab("scorers")}
          >
            <Icon name="football" /> Top Scorers & Playmakers
          </button>
          <button
            type="button"
            className={`stats-tab-btn ${activeTab === "rivalries" ? "active" : ""}`}
            onClick={() => setActiveTab("rivalries")}
          >
            <Icon name="shield" /> Head-to-Head & Rivalries
          </button>
        </div>

        <div className="stats-search-wrapper">
          <Icon name="search" className="stats-search-icon" />
          <input
            type="text"
            className="stats-search-input"
            placeholder={
              activeTab === "standings"
                ? "Filter clubs or leagues..."
                : activeTab === "scorers"
                ? "Filter players or clubs..."
                : "Filter rivalry clubs..."
            }
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
          />
          {filterText && (
            <button
              type="button"
              className="stats-search-clear"
              onClick={() => setFilterText("")}
            >
              <Icon name="close" />
            </button>
          )}
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      {loading ? (
        <div className="stats-loading-box">
          <div className="stats-spinner" />
          <p>Compiling latest performance metrics...</p>
        </div>
      ) : error ? (
        <div className="stats-error-box">
          <Icon name="alert" />
          <p>{error}</p>
        </div>
      ) : (
        <div className="stats-content-card">
          {/* TAB 1: STANDINGS */}
          {activeTab === "standings" && (
            <div className="stats-table-wrapper">
              <div className="stats-table-header-desc">
                <div>
                  <h2>League Standings & Form Guide</h2>
                  <p>Overall standings ranked by points and goal difference, including season win rate and recent 5-match streak.</p>
                </div>
                <span className="stats-count-tag">{filteredStandings.length} Teams</span>
              </div>

              <table className="stats-table">
                <thead>
                  <tr>
                    <th style={{ width: "60px" }}>Rank</th>
                    <th>Club</th>
                    <th>League</th>
                    <th style={{ textAlign: "center" }}>MP</th>
                    <th style={{ textAlign: "center" }}>W</th>
                    <th style={{ textAlign: "center" }}>D</th>
                    <th style={{ textAlign: "center" }}>L</th>
                    <th style={{ textAlign: "center" }}>GD</th>
                    <th style={{ textAlign: "center" }}>Pts</th>
                    <th style={{ textAlign: "center" }}>Win %</th>
                    <th>Recent Form</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStandings.map((row, idx) => (
                    <tr key={`stand-${idx}`}>
                      <td>
                        <span className={`stats-rank-num ${row.league_rank <= 3 ? `top-${row.league_rank}` : ""}`}>
                          #{row.league_rank}
                        </span>
                      </td>
                      <td>
                        <Link
                          href={`/teams/${row.team_id}`}
                          className="stats-team-cell"
                        >
                          {row.logo_url ? (
                            <img
                              src={row.logo_url}
                              alt={row.team_name}
                              className="stats-team-logo"
                            />
                          ) : (
                            <div className="stats-team-placeholder">
                              <Icon name="shield" />
                            </div>
                          )}
                          <span className="stats-team-name">{row.team_name}</span>
                        </Link>
                      </td>
                      <td className="stats-league-cell">{row.league_name}</td>
                      <td style={{ textAlign: "center" }}>{row.matches_played}</td>
                      <td style={{ textAlign: "center", color: "var(--mint)" }}>{row.wins}</td>
                      <td style={{ textAlign: "center", color: "#fbbf24" }}>{row.draws}</td>
                      <td style={{ textAlign: "center", color: "#f87171" }}>{row.losses}</td>
                      <td style={{ textAlign: "center", fontWeight: "700" }}>
                        {row.goal_difference > 0 ? `+${row.goal_difference}` : row.goal_difference}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <strong className="stats-points-badge">{row.points}</strong>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span className="stats-winrate-pill">
                          {row.overall_win_percentage}%
                        </span>
                      </td>
                      <td>
                        <div className="stats-form-streak">
                          {row.recent_form && row.recent_form !== "N/A"
                            ? row.recent_form.split(" ").map((char, cIdx) => renderFormBadge(char, cIdx))
                            : <span style={{ color: "var(--muted)", fontSize: "12px" }}>N/A</span>
                          }
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 2: TOP SCORERS */}
          {activeTab === "scorers" && (
            <div className="stats-table-wrapper">
              <div className="stats-table-header-desc">
                <div>
                  <h2>Top Goalscorers & Playmakers</h2>
                  <p>Individual career contributions, total goals, assists, and average match involvement.</p>
                </div>
                <span className="stats-count-tag">{filteredScorers.length} Players</span>
              </div>

              <table className="stats-table">
                <thead>
                  <tr>
                    <th style={{ width: "60px" }}>Rank</th>
                    <th>Player</th>
                    <th>Club</th>
                    <th>Nationality</th>
                    <th style={{ textAlign: "center" }}>Apps</th>
                    <th style={{ textAlign: "center" }}>Goals</th>
                    <th style={{ textAlign: "center" }}>Assists</th>
                    <th style={{ textAlign: "center" }}>Total (G+A)</th>
                    <th style={{ textAlign: "center" }}>Avg Mins</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredScorers.map((row, idx) => (
                    <tr key={`scorer-${idx}`}>
                      <td>
                        <span className={`stats-rank-num ${idx < 3 ? `top-${idx + 1}` : ""}`}>
                          #{idx + 1}
                        </span>
                      </td>
                      <td>
                        <Link
                          href={`/players/${row.player_id}`}
                          className="stats-player-cell"
                        >
                          {row.photo_url ? (
                            <img
                              src={row.photo_url}
                              alt={row.player_name}
                              className="stats-player-photo"
                            />
                          ) : (
                            <div className="stats-player-placeholder">
                              <Icon name="player" />
                            </div>
                          )}
                          <div>
                            <span className="stats-player-name">{row.player_name}</span>
                            <span className="stats-player-pos">{row.primary_position || "Player"}</span>
                          </div>
                        </Link>
                      </td>
                      <td>
                        <span className="stats-club-name">{row.current_team || "Free Agent"}</span>
                      </td>
                      <td className="stats-nation-cell">{row.nationality || "—"}</td>
                      <td style={{ textAlign: "center" }}>{row.total_appearances}</td>
                      <td style={{ textAlign: "center" }}>
                        <strong className="stats-goals-badge">{row.total_goals}</strong>
                      </td>
                      <td style={{ textAlign: "center", color: "var(--mint)" }}>
                        {row.total_assists}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span className="stats-total-pill">{row.total_contributions}</span>
                      </td>
                      <td style={{ textAlign: "center", color: "var(--muted)", fontSize: "13px" }}>
                        {row.avg_minutes_played}m
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 3: HEAD TO HEAD */}
          {activeTab === "rivalries" && (
            <div className="stats-table-wrapper">
              <div className="stats-table-header-desc">
                <div>
                  <h2>Head-to-Head & Classic Rivalries</h2>
                  <p>Historic match encounter statistics, win distributions, and average ball possession between matched clubs.</p>
                </div>
                <span className="stats-count-tag">{filteredRivalries.length} Fixtures</span>
              </div>

              <table className="stats-table">
                <thead>
                  <tr>
                    <th>Matchup</th>
                    <th style={{ textAlign: "center" }}>Encounters</th>
                    <th style={{ textAlign: "center" }}>Home Wins</th>
                    <th style={{ textAlign: "center" }}>Draws</th>
                    <th style={{ textAlign: "center" }}>Away Wins</th>
                    <th style={{ textAlign: "center" }}>Goals (H - A)</th>
                    <th style={{ textAlign: "center" }}>Avg Possession</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRivalries.map((row, idx) => (
                    <tr key={`h2h-${idx}`}>
                      <td>
                        <div className="stats-rivalry-cell">
                          <Link href={`/teams/${row.home_team_id}`} className="stats-rival-club">
                            {row.home_logo && <img src={row.home_logo} alt="" className="stats-rival-logo" />}
                            <strong>{row.home_team_name}</strong>
                          </Link>
                          <span className="stats-rival-vs">vs</span>
                          <Link href={`/teams/${row.away_team_id}`} className="stats-rival-club">
                            {row.away_logo && <img src={row.away_logo} alt="" className="stats-rival-logo" />}
                            <strong>{row.away_team_name}</strong>
                          </Link>
                        </div>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <strong className="stats-encounters-pill">{row.total_encounters}</strong>
                      </td>
                      <td style={{ textAlign: "center", color: "var(--mint)", fontWeight: "700" }}>
                        {row.home_team_wins}
                      </td>
                      <td style={{ textAlign: "center", color: "#fbbf24" }}>
                        {row.draws}
                      </td>
                      <td style={{ textAlign: "center", color: "#f87171", fontWeight: "700" }}>
                        {row.away_team_wins}
                      </td>
                      <td style={{ textAlign: "center", fontWeight: "700" }}>
                        {row.total_home_goals} - {row.total_away_goals}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span className="stats-possession-pill">
                          {row.avg_home_possession_pct}% Home
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
