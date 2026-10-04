"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import LocalKickoffTime from "./LocalKickoffTime";
import Icon from "./Icon";
import { startRouteProgress } from "@/app/lib/route-progress";

export default function LeagueTabs({
    league,
    leagueMatches,
    leagueTeams,
    standings,
    topScorers,
    leagueStats,
    availableSeasons = [],
    selectedSeason = "",
}) {
    const router = useRouter();
    const pathname = usePathname();
    const [activeTab, setActiveTab] = useState("overview");

    const handleSeasonChange = (newSeason) => {
        startRouteProgress();
        router.push(`${pathname}?season=${newSeason}`);
    };

    const upcomingMatches = leagueMatches.filter((match) =>
        ["UPCOMING", "NS", "TBD", "TIMED", "PST"].includes(match.status)
    );

    const finishedMatches = leagueMatches.filter((match) =>
        ["FT", "AET", "PEN"].includes(match.status)
    );

    const liveMatches = leagueMatches.filter((match) =>
        ["LIVE", "1H", "HT", "2H", "ET", "BT", "P", "SUSP", "INT"].includes(match.status)
    );

    return (
        <>
            {/* TABS */}
            <div className="league-tabs" role="group" aria-label="League sections">
                <button
                    type="button"
                    aria-pressed={activeTab === "overview"}
                    className={activeTab === "overview" ? "active-tab" : ""}
                    onClick={() => setActiveTab("overview")}
                >
                    Overview
                </button>

                <button
                    type="button"
                    aria-pressed={activeTab === "matches"}
                    className={activeTab === "matches" ? "active-tab" : ""}
                    onClick={() => setActiveTab("matches")}
                >
                    Matches
                </button>

                <button
                    type="button"
                    aria-pressed={activeTab === "standings"}
                    className={activeTab === "standings" ? "active-tab" : ""}
                    onClick={() => setActiveTab("standings")}
                >
                    Standings
                </button>

                <button
                    type="button"
                    aria-pressed={activeTab === "teams"}
                    className={activeTab === "teams" ? "active-tab" : ""}
                    onClick={() => setActiveTab("teams")}
                >
                    Teams
                </button>

                <button
                    type="button"
                    aria-pressed={activeTab === "scorers"}
                    className={activeTab === "scorers" ? "active-tab" : ""}
                    onClick={() => setActiveTab("scorers")}
                >
                    Top Scorers
                </button>

                <button
                    type="button"
                    aria-pressed={activeTab === "statistics"}
                    className={activeTab === "statistics" ? "active-tab" : ""}
                    onClick={() => setActiveTab("statistics")}
                >
                    Statistics
                </button>

                <button
                    type="button"
                    aria-pressed={activeTab === "news"}
                    className={activeTab === "news" ? "active-tab" : ""}
                    onClick={() => setActiveTab("news")}
                >
                    News
                </button>
            </div>

            {/* OVERVIEW */}
            {activeTab === "overview" && (
                <>
                    <section className="league-section">
                        <h2>Competition</h2>

                        <div className="league-overview-grid">
                            <LeagueInfo
                                label="Country"
                                value={league.country}
                            />

                            <LeagueInfo
                                label="Season"
                                value={league.season}
                            />

                            <LeagueInfo
                                label="Competition Type"
                                value={league.type || "Type unavailable"}
                            />

                            <LeagueInfo
                                label="Teams"
                                value={leagueTeams.length}
                            />

                            <LeagueInfo
                                label="Matches"
                                value={leagueMatches.length}
                            />
                        </div>
                    </section>

                    {liveMatches.length > 0 && (
                        <section className="league-section">
                            <h2>Live Matches</h2>

                            {liveMatches.map((match) => (
                                <LeagueMatchRow
                                    key={match.id}
                                    match={match}
                                />
                            ))}
                        </section>
                    )}

                    <section className="league-section">
                        <h2>Upcoming Matches</h2>

                        {upcomingMatches.length === 0 ? (
                            <p>No upcoming matches.</p>
                        ) : (
                            upcomingMatches.slice(0, 5).map((match) => (
                                <LeagueMatchRow
                                    key={match.id}
                                    match={match}
                                />
                            ))
                        )}
                    </section>

                    <section className="league-section">
                        <h2>Top Teams</h2>

                        {standings.length === 0 ? (
                            <p>No standings available yet.</p>
                        ) : (
                            <StandingsTable
                                standings={standings.slice(0, 5)}
                            />
                        )}
                    </section>
                </>
            )}

            {/* MATCHES */}
            {activeTab === "matches" && (
                <>
                    {liveMatches.length > 0 && (
                        <section className="league-section">
                            <h2>Live</h2>

                            {liveMatches.map((match) => (
                                <LeagueMatchRow
                                    key={match.id}
                                    match={match}
                                />
                            ))}
                        </section>
                    )}

                    <section className="league-section">
                        <h2>Upcoming</h2>

                        {upcomingMatches.length === 0 ? (
                            <p>No upcoming matches.</p>
                        ) : (
                            upcomingMatches.map((match) => (
                                <LeagueMatchRow
                                    key={match.id}
                                    match={match}
                                />
                            ))
                        )}
                    </section>

                    <section className="league-section">
                        <h2>Results</h2>

                        {finishedMatches.length === 0 ? (
                            <p>No finished matches.</p>
                        ) : (
                            finishedMatches.map((match) => (
                                <LeagueMatchRow
                                    key={match.id}
                                    match={match}
                                />
                            ))
                        )}
                    </section>
                </>
            )}

            {/* STANDINGS */}
            {activeTab === "standings" && (
                <section className="league-section">
                    <div className="league-section-heading">
                        <h2>Standings</h2>
                        <SeasonSelector
                            availableSeasons={availableSeasons}
                            selectedSeason={selectedSeason}
                            onChange={handleSeasonChange}
                        />
                    </div>

                    {standings.length === 0 ? (
                        <p>No standings available yet for season {selectedSeason ? (selectedSeason.includes('-') ? selectedSeason.replace('-', '/') : selectedSeason) : ''}.</p>
                    ) : (
                        <StandingsTable standings={standings} />
                    )}
                </section>
            )}

            {/* TEAMS */}
            {activeTab === "teams" && (
                <section className="league-section">
                    <h2>Teams</h2>

                    <div className="league-team-grid">
                        {leagueTeams.map((team) => (
                            <Link
                                key={team.id}
                                href={`/teams/${team.id || team.name.toLowerCase().replaceAll(" ", "-")}`}
                                className="league-team-card"
                            >
                                {team.logo ? (
                                    <img
                                        src={team.logo}
                                        alt={`${team.name} logo`}
                                        className="league-team-logo entity-logo"
                                    />
                                ) : (
                                    <div className="league-team-placeholder">
                                        {team.name.charAt(0)}
                                    </div>
                                )}

                                <div>
                                    <strong>{team.name}</strong>
                                    <span>{team.country}</span>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>
            )}

            {/* TOP SCORERS */}
            {activeTab === "scorers" && (
                <section className="league-section">
                    <div className="league-section-heading">
                        <div className="league-section-title">
                            <h2>Top Scorers</h2>
                            <p className="league-section-description">
                                Attacking leaders ranked by goals &amp; assists
                            </p>
                        </div>
                        <SeasonSelector
                            availableSeasons={availableSeasons}
                            selectedSeason={selectedSeason}
                            onChange={handleSeasonChange}
                        />
                    </div>

                    {topScorers.length === 0 ? (
                        <p>No top-scorer data is available for this season.</p>
                    ) : (
                        <>
                            <div className="top-scorer-list">
                                {topScorers.map((scorer, index) => {
                                    const contributions = scorer.contributions ?? (Number(scorer.goals || 0) + Number(scorer.assists || 0));
                                    return (
                                        <div
                                            key={`${scorer.playerId || scorer.player}-${scorer.team}`}
                                            className="top-scorer-row"
                                        >
                                            <span className={`scorer-position ${index === 0 ? "podium-1" : index === 1 ? "podium-2" : index === 2 ? "podium-3" : ""}`}>
                                                {index + 1}
                                            </span>

                                            <div className="scorer-player-avatar">
                                                {scorer.photo ? (
                                                    <img
                                                        src={scorer.photo}
                                                        alt={scorer.player}
                                                        className="scorer-photo-img"
                                                        onError={(e) => { e.currentTarget.style.display = "none"; }}
                                                    />
                                                ) : (
                                                    <span className="scorer-initials">
                                                        {scorer.player ? scorer.player.charAt(0) : "P"}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="scorer-player">
                                                <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                                                    <strong>{scorer.player}</strong>
                                                    {scorer.position && (
                                                        <span className="scorer-pos-pill">{scorer.position}</span>
                                                    )}
                                                </div>
                                                <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                                    {scorer.teamLogo && (
                                                        <img
                                                            src={scorer.teamLogo}
                                                            alt=""
                                                            className="entity-logo"
                                                            style={{ width: "14px", height: "14px", objectFit: "contain" }}
                                                            onError={(e) => { e.currentTarget.style.display = "none"; }}
                                                        />
                                                    )}
                                                    {scorer.team}
                                                    {scorer.appearances ? ` · ${scorer.appearances} apps` : ""}
                                                    {scorer.assists !== undefined && scorer.assists !== null ? ` · ${scorer.assists} ast` : ""}
                                                </span>
                                            </div>

                                            <div className="scorer-stats-badge-group">
                                                <strong className="scorer-goals">
                                                    {scorer.goals} {scorer.goals === 1 ? "goal" : "goals"}
                                                </strong>
                                                {contributions > 0 && (
                                                    <span className="scorer-ga-pill">
                                                        {contributions} G+A
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>


                        </>
                    )}
                </section>
            )}

            {/* STATISTICS */}
            {activeTab === "statistics" && (
                <section className="league-section">
                    <h2>Competition Statistics</h2>

                    <div className="league-stat-grid">
                        <LeagueInfo
                            label="Total Matches"
                            value={leagueStats.totalMatches}
                        />

                        <LeagueInfo
                            label="Finished"
                            value={leagueStats.finishedMatches}
                        />

                        <LeagueInfo
                            label="Live"
                            value={leagueStats.liveMatches}
                        />

                        <LeagueInfo
                            label="Upcoming"
                            value={leagueStats.upcomingMatches}
                        />

                        <LeagueInfo
                            label="Goals"
                            value={leagueStats.goals}
                        />

                        <LeagueInfo
                            label="Teams"
                            value={leagueTeams.length}
                        />
                    </div>
                </section>
            )}

            {/* NEWS */}
            {activeTab === "news" && (
                <LeagueNewsTab leagueName={league.name} />
            )}
        </>
    );
}

function LeagueNewsTab({ leagueName }) {
    const [news, setNews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadNews = async (forceRefresh = false) => {
        try {
            if (forceRefresh) setRefreshing(true);
            else setLoading(true);
            const url = `/api/news?category=${encodeURIComponent(leagueName)}&limit=18${forceRefresh ? "&forceRefresh=true" : ""}`;
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                if (data.news && Array.isArray(data.news)) {
                    setNews(data.news);
                }
            }
        } catch (err) {
            console.error("Failed to load league news:", err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadNews();
    }, [leagueName]);

    return (
        <section className="league-section">
            <div className="league-section-heading">
                <h2>{leagueName} News & Headlines</h2>
                <button
                    type="button"
                    className="btn btn-secondary league-news-refresh"
                    onClick={() => loadNews(true)}
                    disabled={loading || refreshing}
                >
                    <span className={refreshing ? "league-refresh-icon is-refreshing" : "league-refresh-icon"}>
                        <Icon name="refresh" />
                    </span>
                    {refreshing ? "Refreshing..." : "Refresh News"}
                </button>
            </div>

            {loading && news.length === 0 ? (
                <p className="league-news-status">Loading latest {leagueName} articles...</p>
            ) : news.length === 0 ? (
                <p className="empty-message">No recent articles found for {leagueName}.</p>
            ) : (
                <div className="league-news-grid">
                    {news.map((item) => (
                        <article key={item.id} className="news-card league-news-card">
                            {item.image && (
                                <img
                                    src={item.image}
                                    alt=""
                                    className="league-news-image"
                                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                                />
                            )}
                            <div className="league-news-content">
                                <div className="league-news-meta">
                                    <span>{item.category}</span>
                                    <time>{item.time}</time>
                                </div>
                                <h3>{item.title}</h3>
                                {item.description && (
                                    <p className="league-news-description">
                                        {item.description}
                                    </p>
                                )}
                                {item.url && (
                                    <a href={item.url} target="_blank" rel="noopener noreferrer">
                                        Read Full Story ↗
                                    </a>
                                )}
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </section>
    );
}

function LeagueInfo({ label, value }) {
    return (
        <div className="league-info-card">
            <span className="league-info-label">{label}</span>
            <strong>{value ?? "—"}</strong>
        </div>
    );
}

function LeagueMatchRow({ match }) {
    const isUpcoming = ["UPCOMING", "NS", "TBD", "TIMED", "PST"].includes(match.status);
    const isLive = ["LIVE", "1H", "HT", "2H", "ET", "BT", "P", "SUSP", "INT"].includes(match.status);
    const statusLabel = isLive
        ? "Live"
        : isUpcoming
            ? "Kick-off"
            : match.status === "AET" || match.status === "PEN"
                ? "After extra time"
                : "Full time";

    return (
        <Link
            href={`/matches/${match.id}`}
            className="league-match"
        >
            <span className="league-match-team league-match-home">
                {match.homeLogo && (
                    <img
                        src={match.homeLogo}
                        alt=""
                        className="entity-logo"
                        onError={(e) => { e.currentTarget.style.display = "none"; }}
                    />
                )}
                <span>{match.homeTeam}</span>
            </span>

            <span className={`league-match-center${isLive ? " is-live" : ""}`}>
                <strong>
                    {isUpcoming
                        ? (
                            <LocalKickoffTime
                                matchDate={match.matchDate}
                                status={match.providerStatus || match.status}
                            />
                        )
                        : `${match.homeScore ?? "-"} - ${match.awayScore ?? "-"}`}
                </strong>
                <small>{statusLabel}</small>
            </span>

            <span className="league-match-team league-match-away">
                <span>{match.awayTeam}</span>
                {match.awayLogo && (
                    <img
                        src={match.awayLogo}
                        alt=""
                        className="entity-logo"
                        onError={(e) => { e.currentTarget.style.display = "none"; }}
                    />
                )}
            </span>
        </Link>
    );
}

function StandingsTable({ standings }) {
    return (
        <div className="standings-table-container">
            <div className="standings-table rich-standings-table">
                <div className="standing-row standing-header">
                    <span>#</span>
                    <span>Team</span>
                    <span>P</span>
                    <span>W</span>
                    <span>D</span>
                    <span>L</span>
                    <span>GD</span>
                    <span>Pts</span>
                    <span>Win %</span>
                    <span>Recent Form</span>
                </div>

                {standings.map((team) => (
                    <div
                        key={team.teamId || team.team}
                        className="standing-row league-standing-row"
                    >
                        <span className="standing-rank-num">{team.position || team.rank}</span>
                        <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            {team.logo && (
                                <img
                                    src={team.logo}
                                    alt=""
                                    className="entity-logo"
                                    style={{ width: "22px", height: "22px", objectFit: "contain" }}
                                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                                />
                            )}
                            <span style={{ display: "grid", gap: "1px" }}>
                                <Link
                                    href={`/teams/${team.teamId || team.team.toLowerCase().replaceAll(" ", "-")}`}
                                    className="standing-team-link"
                                >
                                    <strong>{team.team}</strong>
                                </Link>
                                {team.group && (
                                    <small style={{ color: "var(--muted)", fontSize: "10px" }}>
                                        {team.group}
                                    </small>
                                )}
                            </span>
                        </span>
                        <span data-label="P">{team.played}</span>
                        <span data-label="W">{team.wins ?? "—"}</span>
                        <span data-label="D">{team.draws ?? "—"}</span>
                        <span data-label="L">{team.losses ?? "—"}</span>
                        <span data-label="GD">{team.goalDifference > 0 ? `+${team.goalDifference}` : team.goalDifference}</span>
                        <strong className="standing-pts-cell" data-label="Pts">{team.points}</strong>
                        <span data-label="Win %">
                            {team.winRate ? (
                                <span className="standing-winrate-tag">{team.winRate}%</span>
                            ) : (
                                "—"
                            )}
                        </span>
                        <span className="standing-form-badges" data-label="Form">
                            {team.form && team.form !== "N/A" ? (
                                (team.form.match(/[WDLwdl]/g) || []).map((ch, idx) => (
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
                        </span>
                    </div>
                ))}
            </div>


        </div>
    );
}

function SeasonSelector({ availableSeasons, selectedSeason, onChange }) {
    if (!availableSeasons || availableSeasons.length === 0) return null;

    return (
        <div className="season-selector">
            <label htmlFor="league-season-select">
                Season:
            </label>
            <select
                id="league-season-select"
                className="season-select"
                value={selectedSeason}
                onChange={(event) => onChange(event.target.value)}
            >
                {availableSeasons.map((season) => (
                    <option key={season.id || season.year} value={season.year}>
                        {season.year.includes("-") ? season.year.replace("-", "/") : season.year}
                    </option>
                ))}
            </select>
        </div>
    );
}
