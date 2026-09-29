"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Icon from "./Icon";

export function TeamCompareButton({ team }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="team-compare-btn"
        onClick={() => setIsOpen(true)}
        title="Compare head-to-head stats, league standings, and top scorers"
      >
        <span className="compare-btn-icon"><Icon name="trophy" /></span>
        <span>Compare Team</span>
      </button>

      {isOpen && (
        <TeamCompareModal
          currentTeam={team}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}

export function TeamCompareModal({ currentTeam, onClose }) {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="compare-modal-overlay" onClick={onClose}>
      <div
        className="compare-modal-container"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="compare-modal-header">
          <div className="compare-modal-title">
            <span className="compare-modal-badge">
              <Icon name="shield" /> Team Comparison &amp; H2H
            </span>
            <h2>{currentTeam.name} vs Opponents</h2>
          </div>
          <button
            type="button"
            className="compare-modal-close"
            onClick={onClose}
            aria-label="Close Comparison"
          >
            <Icon name="close" />
          </button>
        </div>

        <div className="compare-modal-body">
          <TeamCompareView currentTeam={currentTeam} />
        </div>
      </div>
    </div>
  );
}

export function TeamCompareView({ currentTeam, initialOpponentId = null }) {
  const [selectedOpponentId, setSelectedOpponentId] = useState(initialOpponentId);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchComparison = useCallback(async (opponentId = null) => {
    try {
      setLoading(true);
      setError(null);
      const url = opponentId
        ? `/api/teams/compare?team1=${currentTeam.id}&team2=${opponentId}`
        : `/api/teams/compare?team1=${currentTeam.id}`;
      const res = await fetch(url);
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Failed to load team comparison");
      }
      const json = await res.json();
      setData(json);
      if (!selectedOpponentId && json.team2?.id) {
        setSelectedOpponentId(json.team2.id);
      }
    } catch (err) {
      console.error("Team comparison error:", err);
      setError(err.message || "Could not retrieve comparison statistics.");
    } finally {
      setLoading(false);
    }
  }, [currentTeam.id, selectedOpponentId]);

  useEffect(() => {
    fetchComparison(selectedOpponentId);
  }, [selectedOpponentId, fetchComparison]);

  const handleSelectOpponent = (newId) => {
    setSelectedOpponentId(Number(newId));
  };

  const team1 = data?.team1 || currentTeam;
  const team2 = data?.team2;
  const h2h = data?.h2h;
  const standings = data?.standings;
  const topScorers = data?.topScorers;
  const suggestedOpponents = data?.suggestedOpponents || [];

  const totalEncounters = h2h?.encounters || 0;
  const team1Wins = h2h?.team1Wins || 0;
  const team2Wins = h2h?.team2Wins || 0;
  const draws = h2h?.draws || 0;

  const t1WinPct = totalEncounters > 0 ? Math.round((team1Wins / totalEncounters) * 100) : 0;
  const t2WinPct = totalEncounters > 0 ? Math.round((team2Wins / totalEncounters) * 100) : 0;
  const drawPct = totalEncounters > 0 ? Math.max(0, 100 - t1WinPct - t2WinPct) : 0;

  return (
    <div className="compare-view-container">
      {/* OPPONENT SELECTOR BAR */}
      <section className="compare-selector-section">
        <div className="compare-selector-row">
          <label htmlFor="opponent-select" className="compare-label">
            Compare <strong>{currentTeam.name}</strong> against:
          </label>
          <div className="compare-select-wrap">
            <select
              id="opponent-select"
              className="compare-dropdown"
              value={selectedOpponentId || ""}
              onChange={(e) => handleSelectOpponent(e.target.value)}
              disabled={loading}
            >
              {suggestedOpponents.map((opp) => (
                <option key={opp.id} value={opp.id}>
                  {opp.name} {opp.encounters > 0 ? `(${opp.encounters} H2H matches)` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* QUICK RIVAL CHIPS */}
        {suggestedOpponents.length > 0 && (
          <div className="compare-quick-chips">
            <span className="quick-chips-title">Frequent Rivals:</span>
            <div className="quick-chips-list">
              {suggestedOpponents.slice(0, 6).map((opp) => (
                <button
                  type="button"
                  key={opp.id}
                  className={`compare-chip-btn ${selectedOpponentId === opp.id ? "active-chip" : ""}`}
                  onClick={() => handleSelectOpponent(opp.id)}
                  disabled={loading}
                >
                  {opp.logo && (
                    <img
                      src={opp.logo}
                      alt=""
                      className="chip-logo"
                      onError={(e) => { e.currentTarget.style.display = "none"; }}
                    />
                  )}
                  <span>{opp.shortName || opp.name}</span>
                  {opp.encounters > 0 && (
                    <span className="chip-encounters-count">{opp.encounters}m</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {loading && !data && (
        <div className="compare-loading-state">
          <span className="loading-spinner"><Icon name="refresh" /></span>
          <p>Analyzing head-to-head records and PostgreSQL standings...</p>
        </div>
      )}

      {error && (
        <div className="compare-error-box">
          <Icon name="alert" />
          <p>{error}</p>
          <button type="button" onClick={() => fetchComparison(selectedOpponentId)} className="btn btn-secondary">
            Retry
          </button>
        </div>
      )}

      {data && team2 && (
        <div className="compare-content-grid">
          {/* CLASH HERO BANNER */}
          <div className="compare-hero-banner">
            <div className="hero-team hero-team-left">
              {team1.logo ? (
                <img src={team1.logo} alt={team1.name} className="hero-logo" />
              ) : (
                <div className="hero-logo-fallback">{team1.name?.charAt(0)}</div>
              )}
              <div className="hero-team-details">
                <h3>{team1.name}</h3>
                <span>{team1.stadium || team1.country || "Club"}</span>
              </div>
            </div>

            <div className="hero-vs-badge">
              <span className="vs-text">VS</span>
              <span className="vs-encounters">{totalEncounters} Encounters</span>
            </div>

            <div className="hero-team hero-team-right">
              <div className="hero-team-details" style={{ textAlign: "right" }}>
                <h3>{team2.name}</h3>
                <span>{team2.stadium || team2.country || "Opponent"}</span>
              </div>
              {team2.logo ? (
                <img src={team2.logo} alt={team2.name} className="hero-logo" />
              ) : (
                <div className="hero-logo-fallback">{team2.name?.charAt(0)}</div>
              )}
            </div>
          </div>

          {/* 1. HEAD TO HEAD STATISTICS (COMPLEX QUERY 3) */}
          <section className="compare-section-card">
            <div className="compare-card-header">
              <div>
                <h3><Icon name="football" /> Head-to-Head Clash Record</h3>
                <p>Direct match encounter results and goal distributions between both clubs</p>
              </div>
            </div>

            {totalEncounters === 0 ? (
              <p className="compare-empty-note">
                No past competitive fixtures between <strong>{team1.name}</strong> and <strong>{team2.name}</strong> found in stored matches.
              </p>
            ) : (
              <>
                {/* H2H SCOREBOARD */}
                <div className="h2h-scoreboard">
                  <div className="h2h-score-box box-win">
                    <span className="h2h-score-val">{team1Wins}</span>
                    <span className="h2h-score-label">{team1.shortName || team1.name} Wins</span>
                    <span className="h2h-score-pct">{t1WinPct}%</span>
                  </div>

                  <div className="h2h-score-box box-draw">
                    <span className="h2h-score-val">{draws}</span>
                    <span className="h2h-score-label">Draws</span>
                    <span className="h2h-score-pct">{drawPct}%</span>
                  </div>

                  <div className="h2h-score-box box-win">
                    <span className="h2h-score-val">{team2Wins}</span>
                    <span className="h2h-score-label">{team2.shortName || team2.name} Wins</span>
                    <span className="h2h-score-pct">{t2WinPct}%</span>
                  </div>
                </div>

                {/* DISTRIBUTION BAR */}
                <div className="h2h-bar-container">
                  <div
                    className="h2h-bar-segment bar-team1"
                    style={{ width: `${t1WinPct}%` }}
                    title={`${team1.name}: ${team1Wins} wins (${t1WinPct}%)`}
                  />
                  <div
                    className="h2h-bar-segment bar-draw"
                    style={{ width: `${drawPct}%` }}
                    title={`Draws: ${draws} (${drawPct}%)`}
                  />
                  <div
                    className="h2h-bar-segment bar-team2"
                    style={{ width: `${t2WinPct}%` }}
                    title={`${team2.name}: ${team2Wins} wins (${t2WinPct}%)`}
                  />
                </div>

                {/* GOALS TALLY */}
                <div className="h2h-goals-row">
                  <div className="h2h-goals-side">
                    <strong>{h2h.team1Goals}</strong>
                    <span>Goals scored by {team1.shortName || team1.name}</span>
                  </div>
                  <div className="h2h-goals-divider">
                    <span>H2H Total Goals</span>
                    <strong>{Number(h2h.team1Goals || 0) + Number(h2h.team2Goals || 0)}</strong>
                  </div>
                  <div className="h2h-goals-side" style={{ textAlign: "right" }}>
                    <strong>{h2h.team2Goals}</strong>
                    <span>Goals scored by {team2.shortName || team2.name}</span>
                  </div>
                </div>

                {/* RECENT MATCHES LIST */}
                {h2h.recentMatches && h2h.recentMatches.length > 0 && (
                  <div className="h2h-recent-matches">
                    <h4>Recent Direct Encounters</h4>
                    <div className="h2h-matches-list">
                      {h2h.recentMatches.map((m) => {
                        const mDate = m.matchDate
                          ? new Date(m.matchDate).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : "";
                        const team1IsHome = m.homeTeamId === team1.id;
                        return (
                          <div key={m.id} className="h2h-match-item">
                            <span className="h2h-match-date">{mDate}</span>
                            <span className="h2h-match-league">{m.league}</span>
                            <div className="h2h-match-scoreline">
                              <span className={`h2h-team-name ${team1IsHome ? "h2h-focus-team" : ""}`}>
                                {m.homeTeam}
                              </span>
                              <strong className="h2h-score-badge">
                                {m.homeScore ?? "-"} - {m.awayScore ?? "-"}
                              </strong>
                              <span className={`h2h-team-name ${!team1IsHome ? "h2h-focus-team" : ""}`}>
                                {m.awayTeam}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </section>

          {/* 2. LEAGUE STANDINGS & FORM COMPARISON (COMPLEX QUERY 1) */}
          <section className="compare-section-card">
            <div className="compare-card-header">
              <div>
                <h3><Icon name="shield" /> League Standing &amp; Form Comparison</h3>
                <p>Side-by-side league table rankings, win rates, and recent form</p>
              </div>
            </div>

            {standings && (standings.team1 || standings.team2) ? (
              <div className="compare-standings-container">
                {standings.leagueName && (
                  <div className="compare-league-tag">
                    <Icon name="trophy" /> {standings.leagueName} ({standings.seasonYear || "Current Season"})
                  </div>
                )}

                <div className="compare-standings-grid">
                  {/* TEAM 1 STANDINGS */}
                  <div className="team-standing-card">
                    <div className="standing-card-header">
                      {team1.logo && <img src={team1.logo} alt="" className="standing-logo" />}
                      <div>
                        <h4>{team1.name}</h4>
                        <span className="standing-rank-badge">
                          League Rank: <strong>#{standings.team1?.rank ?? "—"}</strong>
                        </span>
                      </div>
                    </div>

                    <div className="standing-stats-metrics">
                      <div className="metric-box">
                        <span>Points</span>
                        <strong>{standings.team1?.points ?? "—"}</strong>
                      </div>
                      <div className="metric-box">
                        <span>Played</span>
                        <strong>{standings.team1?.played ?? "—"}</strong>
                      </div>
                      <div className="metric-box">
                        <span>W / D / L</span>
                        <strong>
                          {standings.team1 ? `${standings.team1.wins}-${standings.team1.draws}-${standings.team1.losses}` : "—"}
                        </strong>
                      </div>
                      <div className="metric-box">
                        <span>GD</span>
                        <strong>
                          {standings.team1?.goalDifference > 0
                            ? `+${standings.team1.goalDifference}`
                            : (standings.team1?.goalDifference ?? "—")}
                        </strong>
                      </div>
                      <div className="metric-box">
                        <span>Win Rate</span>
                        <strong className="winrate-highlight">
                          {standings.team1?.winRate ? `${standings.team1.winRate}%` : "—"}
                        </strong>
                      </div>
                      <div className="metric-box form-metric-box">
                        <span>Recent Form</span>
                        <div className="standing-form-badges">
                          {standings.team1?.form && standings.team1.form !== "N/A" ? (
                            (standings.team1.form.match(/[WDLwdl]/g) || []).map((ch, idx) => (
                              <span
                                key={idx}
                                className={`form-badge-pill form-badge-${ch.toLowerCase()}`}
                                title={ch.toUpperCase() === "W" ? "Win" : ch.toUpperCase() === "D" ? "Draw" : "Loss"}
                              >
                                {ch.toUpperCase()}
                              </span>
                            ))
                          ) : (
                            <span style={{ color: "var(--muted)", fontSize: "11px" }}>—</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* TEAM 2 STANDINGS */}
                  <div className="team-standing-card">
                    <div className="standing-card-header">
                      {team2.logo && <img src={team2.logo} alt="" className="standing-logo" />}
                      <div>
                        <h4>{team2.name}</h4>
                        <span className="standing-rank-badge">
                          League Rank: <strong>#{standings.team2?.rank ?? "—"}</strong>
                        </span>
                      </div>
                    </div>

                    <div className="standing-stats-metrics">
                      <div className="metric-box">
                        <span>Points</span>
                        <strong>{standings.team2?.points ?? "—"}</strong>
                      </div>
                      <div className="metric-box">
                        <span>Played</span>
                        <strong>{standings.team2?.played ?? "—"}</strong>
                      </div>
                      <div className="metric-box">
                        <span>W / D / L</span>
                        <strong>
                          {standings.team2 ? `${standings.team2.wins}-${standings.team2.draws}-${standings.team2.losses}` : "—"}
                        </strong>
                      </div>
                      <div className="metric-box">
                        <span>GD</span>
                        <strong>
                          {standings.team2?.goalDifference > 0
                            ? `+${standings.team2.goalDifference}`
                            : (standings.team2?.goalDifference ?? "—")}
                        </strong>
                      </div>
                      <div className="metric-box">
                        <span>Win Rate</span>
                        <strong className="winrate-highlight">
                          {standings.team2?.winRate ? `${standings.team2.winRate}%` : "—"}
                        </strong>
                      </div>
                      <div className="metric-box form-metric-box">
                        <span>Recent Form</span>
                        <div className="standing-form-badges">
                          {standings.team2?.form && standings.team2.form !== "N/A" ? (
                            (standings.team2.form.match(/[WDLwdl]/g) || []).map((ch, idx) => (
                              <span
                                key={idx}
                                className={`form-badge-pill form-badge-${ch.toLowerCase()}`}
                                title={ch.toUpperCase() === "W" ? "Win" : ch.toUpperCase() === "D" ? "Draw" : "Loss"}
                              >
                                {ch.toUpperCase()}
                              </span>
                            ))
                          ) : (
                            <span style={{ color: "var(--muted)", fontSize: "11px" }}>—</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="compare-empty-note">
                No active league season stats available to compare between both clubs.
              </p>
            )}
          </section>

          {/* 3. TOP SCORERS COMPARISON (COMPLEX QUERY 2) */}
          <section className="compare-section-card">
            <div className="compare-card-header">
              <div>
                <h3><Icon name="target" /> Top Scorers &amp; Key Attackers</h3>
                <p>Leading goalscorers and playmakers ranked by total goal contributions</p>
              </div>
            </div>

            <div className="compare-scorers-split">
              {/* TEAM 1 SCORERS */}
              <div className="compare-scorers-column">
                <div className="column-team-heading">
                  {team1.logo && <img src={team1.logo} alt="" className="column-logo" />}
                  <h4>{team1.name} Attack Leaders</h4>
                </div>

                {topScorers?.team1 && topScorers.team1.length > 0 ? (
                  <div className="column-scorers-list">
                    {topScorers.team1.map((p, idx) => (
                      <div key={p.playerId || idx} className="compare-scorer-item">
                        <span className="scorer-idx">#{idx + 1}</span>
                        <div className="scorer-info">
                          <strong>{p.name}</strong>
                          <span className="scorer-sub">
                            {p.position} · {p.appearances || 0} apps
                          </span>
                        </div>
                        <div className="scorer-tally">
                          <strong className="scorer-goals-tally">{p.goals}G</strong>
                          {p.assists > 0 && <span className="scorer-ast-tally">{p.assists}A</span>}
                          <span className="scorer-ga-tally">{p.contributions} G+A</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="compare-empty-note">No recorded top scorers for {team1.name}.</p>
                )}
              </div>

              {/* TEAM 2 SCORERS */}
              <div className="compare-scorers-column">
                <div className="column-team-heading">
                  {team2.logo && <img src={team2.logo} alt="" className="column-logo" />}
                  <h4>{team2.name} Attack Leaders</h4>
                </div>

                {topScorers?.team2 && topScorers.team2.length > 0 ? (
                  <div className="column-scorers-list">
                    {topScorers.team2.map((p, idx) => (
                      <div key={p.playerId || idx} className="compare-scorer-item">
                        <span className="scorer-idx">#{idx + 1}</span>
                        <div className="scorer-info">
                          <strong>{p.name}</strong>
                          <span className="scorer-sub">
                            {p.position} · {p.appearances || 0} apps
                          </span>
                        </div>
                        <div className="scorer-tally">
                          <strong className="scorer-goals-tally">{p.goals}G</strong>
                          {p.assists > 0 && <span className="scorer-ast-tally">{p.assists}A</span>}
                          <span className="scorer-ga-tally">{p.contributions} G+A</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="compare-empty-note">No recorded top scorers for {team2.name}.</p>
                )}
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default TeamCompareButton;
