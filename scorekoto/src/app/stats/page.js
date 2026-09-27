"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";

export default function StatsPage() {
  const [activeTab, setActiveTab] = useState("standings"); // 'standings' | 'scorers' | 'rivalries'
  const [selectedLeagueId, setSelectedLeagueId] = useState(39); // Default to Premier League (39)
  const [data, setData] = useState({ standings: [], top_scorers: [], head_to_head: [], leagues: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterText, setFilterText] = useState("");

  useEffect(() => {
    let isMounted = true;
    async function loadStats() {
      try {
        setLoading(true);
        const url = selectedLeagueId
          ? `/api/analytics?league_id=${selectedLeagueId}`
          : `/api/analytics`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to load statistics");
        const json = await res.json();
        if (isMounted) {
          setData((prev) => ({
            standings: json.analytics?.standings || [],
            top_scorers: json.analytics?.top_scorers || [],
            head_to_head: json.analytics?.head_to_head || [],
            leagues: json.analytics?.leagues?.length > 0 ? json.analytics.leagues : prev.leagues,
          }));
        }
      } catch (err) {
        console.error("Error fetching stats:", err);
        if (isMounted) setError("Unable to load statistics at this time.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadStats();
    return () => {
      isMounted = false;
    };
  }, [selectedLeagueId]);

  // Current active league details
  const activeLeague = useMemo(() => {
    if (!selectedLeagueId) return null;
    return data.leagues?.find((l) => l.league_id === selectedLeagueId) || null;
  }, [data.leagues, selectedLeagueId]);

  const activeLeagueName = activeLeague ? activeLeague.name : "All Competitions";

  // Filtered lists for search
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

  const parseFormBadges = (formStr) => {
    if (!formStr || formStr === "N/A") return [];
    const matches = formStr.match(/[WDLwdl]/g);
    return matches ? matches.map((m) => m.toUpperCase()) : [];
  };

  const renderFormBadge = (char, idx) => {
    const c = char?.toUpperCase();
    const label = c === "W" ? "Win" : c === "D" ? "Draw" : c === "L" ? "Loss" : "Match";

    return (
      <span
        key={idx}
        title={label}
        className={`form-badge-pill form-badge-${c.toLowerCase()}`}
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

      {/* LEAGUE SELECTOR BAR */}
      <div className="stats-league-bar">
        {data.leagues.map((lg) => (
          <button
            key={lg.league_id}
            type="button"
            className={`stats-league-pill ${selectedLeagueId === lg.league_id ? "active" : ""}`}
            onClick={() => {
              setSelectedLeagueId(lg.league_id);
              setFilterText("");
            }}
          >
            {lg.logo_url && (
              <img src={lg.logo_url} alt="" className="stats-league-pill-logo" />
            )}
            <span>{lg.name}</span>
          </button>
        ))}

        <button
          type="button"
          className={`stats-league-pill ${selectedLeagueId === null ? "active" : ""}`}
          onClick={() => {
            setSelectedLeagueId(null);
            setFilterText("");
          }}
        >
          <Icon name="globe" />
          <span>All Leagues</span>
        </button>
      </div>

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
                ? `Filter ${activeLeagueName} clubs...`
                : activeTab === "scorers"
                ? `Filter ${activeLeagueName} players...`
                : `Filter ${activeLeagueName} rivalries...`
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
          <p>Compiling {activeLeagueName} performance metrics...</p>
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
                  <h2>{activeLeagueName} Standings & Form Guide</h2>
                  <p>Official table ranked by points and goal difference, including overall win rate and recent 5-match streak.</p>
                </div>
                <span className="stats-count-tag">{filteredStandings.length} Teams</span>
              </div>

              {filteredStandings.length === 0 ? (
                <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--muted)" }}>
                  No standings data available for this competition.
                </div>
              ) : (
                <table className="stats-table">
                  <thead>
                    <tr>
                      <th style={{ width: "60px" }}>Rank</th>
                      <th>Club</th>
                      {!selectedLeagueId && <th>League</th>}
                      <th style={{ textAlign: "center" }}>MP</th>
                      <th style={{ textAlign: "center" }}>W</th>
                      <th style={{ textAlign: "center" }}>D</th>
                      <th style={{ textAlign: "center" }}>L</th>
                      <th style={{ textAlign: "center" }}>GD</th>
                      <th style={{ textAlign: "center" }}>Pts</th>
                      <th style={{ textAlign: "center" }}>Win %</th>
                      <th style={{ minWidth: "160px" }}>Recent Form</th>
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
                        {!selectedLeagueId && (
                          <td className="stats-league-cell">{row.league_name}</td>
                        )}
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
                          {parseFormBadges(row.recent_form).length > 0 ? (
                            <div className="stats-form-streak">
                              {parseFormBadges(row.recent_form).map((char, cIdx) =>
                                renderFormBadge(char, cIdx)
                              )}
                            </div>
                          ) : (
                            <span style={{ color: "var(--muted)", fontSize: "12px" }}>—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* TAB 2: TOP SCORERS */}
          {activeTab === "scorers" && (
            <div className="stats-table-wrapper">
              <div className="stats-table-header-desc">
                <div>
                  <h2>Top Goalscorers & Playmakers in {activeLeagueName}</h2>
                  <p>Individual career contributions, total goals, assists, and average match involvement.</p>
                </div>
                <span className="stats-count-tag">{filteredScorers.length} Players</span>
              </div>

              {filteredScorers.length === 0 ? (
                <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--muted)" }}>
                  No player statistics recorded for this competition.
                </div>
              ) : (
                <table className="stats-table">
                  <thead>
                    <tr>
                      <th style={{ width: "60px" }}>Rank</th>
                      <th>Player</th>
                      <th>Club</th>
                      {!selectedLeagueId && <th>League</th>}
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
                        {!selectedLeagueId && (
                          <td className="stats-league-cell">{row.league_name || "—"}</td>
                        )}
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
              )}
            </div>
          )}

          {/* TAB 3: HEAD TO HEAD */}
          {activeTab === "rivalries" && (
            <div className="stats-table-wrapper">
              <div className="stats-table-header-desc">
                <div>
                  <h2>Head-to-Head & Classic Rivalries in {activeLeagueName}</h2>
                  <p>Historic match encounter statistics, win distributions, and average ball possession between matched clubs.</p>
                </div>
                <span className="stats-count-tag">{filteredRivalries.length} Fixtures</span>
              </div>

              {filteredRivalries.length === 0 ? (
                <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--muted)" }}>
                  No head-to-head match records recorded for this competition.
                </div>
              ) : (
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
              )}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
