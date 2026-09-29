"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Icon from "./Icon";
import LocalKickoffTime from "./LocalKickoffTime";

export default function TeamTabs({
  team = {},
  teamMatches = [],
  matches = [],
  teamStats = {},
  stats = {},
  teamPlayers = [],
  players = [],
  teamTrophies = [],
  squadMeta = {},
}) {
  const [activeTab, setActiveTab] = useState("overview");

  const matchItems = Array.isArray(teamMatches) && teamMatches.length > 0 ? teamMatches : (Array.isArray(matches) ? matches : []);
  const playerItems = Array.isArray(teamPlayers) && teamPlayers.length > 0 ? teamPlayers : (Array.isArray(players) ? players : []);
  const statItems = teamStats && Object.keys(teamStats).length > 0 ? teamStats : (stats || { played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0 });

  const played = Number(statItems.played ?? 0);
  const wins = Number(statItems.wins ?? 0);
  const draws = Number(statItems.draws ?? 0);
  const losses = Number(statItems.losses ?? 0);
  const goalsFor = Number(statItems.goalsFor ?? statItems.goals_for ?? 0);
  const goalsAgainst = Number(statItems.goalsAgainst ?? statItems.goals_against ?? 0);
  const winRate = played > 0 ? Math.round((wins / played) * 100) : 0;
  const goalDifference = goalsFor - goalsAgainst;
  const goalsPerMatch = played > 0 ? (goalsFor / played).toFixed(1) : "0.0";

  const headlineStats = [
    { label: "Matches played", value: played, icon: "flag", detail: "Completed fixtures" },
    { label: "Wins", value: wins, icon: "trophy", detail: `${winRate}% win rate` },
    { label: "Draws", value: draws, icon: "equal", detail: `${played > 0 ? Math.round((draws / played) * 100) : 0}% of matches` },
    { label: "Losses", value: losses, icon: "trendDown", detail: `${played > 0 ? Math.round((losses / played) * 100) : 0}% of matches` },
    { label: "Goals scored", value: goalsFor, icon: "target", detail: `${goalsPerMatch} per match` },
    { label: "Goals conceded", value: goalsAgainst, icon: "shield", detail: `${goalDifference > 0 ? "+" : ""}${goalDifference} goal difference` },
  ];

  const teamInfoItems = [
    { label: "Short Name", value: team.shortName || team.short_name || "Not recorded", icon: "info" },
    { label: "Stadium", value: team.stadium || team.stadium_name || "Venue unavailable", icon: "mapPin" },
    { label: "Country", value: team.country || "Country unavailable", icon: "globe" },
    { label: "Manager", value: team.manager_name || team.manager || "Manager unavailable", icon: "user" },
    { label: "League", value: team.league || "Competition unavailable", icon: "trophy" },
  ];

  const completedStatuses = new Set(["FT", "AET", "PEN"]);
  const scheduledStatuses = new Set(["UPCOMING", "NS", "TBD", "TIMED", "PST"]);
  const finishedMatches = matchItems.filter((match) => completedStatuses.has(match.status));

  const upcomingMatches = matchItems.filter((match) => scheduledStatuses.has(match.status));

  const goalkeepers = playerItems.filter(
    (player) => player.position === "Goalkeeper"
  );

  const defenders = playerItems.filter(
    (player) => player.position === "Defender"
  );

  const midfielders = playerItems.filter(
    (player) => player.position === "Midfielder"
  );

  const forwards = playerItems.filter(
    (player) => player.position === "Forward" || player.position === "Attacker"
  );

  const knownPositions = new Set(["Goalkeeper", "Defender", "Midfielder", "Forward", "Attacker"]);
  const otherPlayers = playerItems.filter((player) => !knownPositions.has(player.position));
  const hasVerifiedSquad = squadMeta.status === "success";
  const hasProvisionalSquad = squadMeta.status === "provisional";
  const squadSyncedLabel = squadMeta.syncedAt
    ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(squadMeta.syncedAt))
    : null;
  const squadDescription = hasVerifiedSquad
    ? `${playerItems.length} current player${playerItems.length === 1 ? "" : "s"} from the official squad feed${squadSyncedLabel ? `, synced ${squadSyncedLabel}` : ""}.`
    : hasProvisionalSquad
      ? `${playerItems.length} stored player${playerItems.length === 1 ? "" : "s"}; this provisional roster will be replaced by the official squad after synchronization.`
      : "The official current squad has not been synchronized yet.";

  return (
    <>
      {/* TABS */}
      <div className="team-tabs">
        <button
          className={activeTab === "overview" ? "active-tab" : ""}
          onClick={() => setActiveTab("overview")}
        >
          Overview
        </button>

        <button
          className={activeTab === "matches" ? "active-tab" : ""}
          onClick={() => setActiveTab("matches")}
        >
          Matches
        </button>

        <button
          className={activeTab === "squad" ? "active-tab" : ""}
          onClick={() => setActiveTab("squad")}
        >
          Squad
        </button>

        <button
          className={activeTab === "statistics" ? "active-tab" : ""}
          onClick={() => setActiveTab("statistics")}
        >
          Statistics
        </button>

        <button
          className={activeTab === "news" ? "active-tab" : ""}
          onClick={() => setActiveTab("news")}
        >
          News
        </button>
      </div>

      {/* OVERVIEW */}
      {activeTab === "overview" && (
        <>
          <section className="team-section">
            <TeamSectionHeading
              title="Team Information"
              description="Club details and competition information."
            />

            <div className="team-info">
              {teamInfoItems.map((item) => (
                <article className="team-info-card" key={item.label}>
                  <span className="team-info-icon"><Icon name={item.icon} /></span>
                  <div>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                </article>
              ))}
            </div>
          </section>

          {team.history && (
            <section className="team-section">
              <TeamSectionHeading title="Club History" description="Stored club profile." />
              <p>{team.history}</p>
            </section>
          )}

          {teamTrophies.length > 0 && (
            <section className="team-section">
              <TeamSectionHeading title="Honours" description={`${teamTrophies.length} stored trophy record${teamTrophies.length === 1 ? "" : "s"}.`} />
              <div className="player-stat-list">
                {teamTrophies.map((trophy, index) => (
                  <div className="player-stat-row" key={`${trophy.name}-${trophy.season_won}-${index}`}>
                    <span>{trophy.season_won || "Season unavailable"}</span>
                    <strong>{trophy.name}{trophy.type ? ` · ${trophy.type}` : ""}</strong>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="team-section">
            <TeamSectionHeading
              title="Recent Matches"
              description="The latest completed fixtures and results."
            />

            {finishedMatches.length === 0 ? (
              <p>No recent matches found.</p>
            ) : (
              finishedMatches.slice(0, 5).map((match) => (
                <TeamMatch key={match.id} match={match} />
              ))
            )}
          </section>

          <section className="team-section">
            <TeamSectionHeading
              title="Upcoming Matches"
              description="The next scheduled fixtures for the club."
            />

            {upcomingMatches.length === 0 ? (
              <p>No upcoming matches found.</p>
            ) : (
              upcomingMatches.slice(0, 5).map((match) => (
                <TeamMatch key={match.id} match={match} />
              ))
            )}
          </section>
        </>
      )}

      {/* MATCHES */}
      {activeTab === "matches" && (
        <section className="team-section">
          <TeamSectionHeading
            title="All Matches"
            description={`${matchItems.length} fixture${matchItems.length === 1 ? "" : "s"} available.`}
          />

          {matchItems.length === 0 ? (
            <p>No matches available.</p>
          ) : (
            matchItems.map((match) => (
              <TeamMatch key={match.id} match={match} />
            ))
          )}
        </section>
      )}

      {/* SQUAD */}
      {activeTab === "squad" && (
        <section className="team-section">
          <TeamSectionHeading
            title="Squad"
            description={squadDescription}
          />

          {playerItems.length === 0 ? (
            <p>
              {hasVerifiedSquad
                ? "The provider returned no current squad members for this team."
                : "No stored players or synchronized current squad are available for this team yet."}
            </p>
          ) : (
            <div className="squad-list">
              <SquadSection title="Goalkeepers" players={goalkeepers} />
              <SquadSection title="Defenders" players={defenders} />
              <SquadSection title="Midfielders" players={midfielders} />
              <SquadSection title="Forwards" players={forwards} />
              <SquadSection title="Other" players={otherPlayers} />
            </div>
          )}
        </section>
      )}

      {/* STATISTICS */}
      {activeTab === "statistics" && (
        <section className="team-section team-statistics-section">
          <TeamSectionHeading
            title="Team Statistics"
            description={`Performance across all ${played} completed match${played === 1 ? "" : "es"} stored for this club.`}
          />

          <div className="team-stats-grid">
            {headlineStats.map((stat) => (
              <article className="team-stat-card" key={stat.label}>
                <span className="team-stat-card-icon"><Icon name={stat.icon} /></span>
                <div>
                  <span>{stat.label}</span>
                  <strong>{stat.value}</strong>
                  <small>{stat.detail}</small>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* NEWS */}
      {activeTab === "news" && (
        <TeamNewsTab teamName={team.name} />
      )}
    </>
  );
}

function TeamNewsTab({ teamName }) {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNews = async (forceRefresh = false) => {
    try {
      if (forceRefresh) setRefreshing(true);
      else setLoading(true);
      const url = `/api/news?category=${encodeURIComponent(teamName || "")}&limit=18${forceRefresh ? "&forceRefresh=true" : ""}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.news && Array.isArray(data.news)) {
          setNews(data.news);
        }
      }
    } catch (err) {
      console.error("Failed to load team news:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (teamName) loadNews();
  }, [teamName]);

  return (
    <section className="team-section">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
        <TeamSectionHeading
          title={`${teamName} News & Updates`}
          description={`Latest headlines and transfer stories for ${teamName}.`}
        />
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => loadNews(true)}
          disabled={loading || refreshing}
          style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "6px 14px", fontSize: "13px" }}
        >
          <span style={{ display: "inline-block", transform: refreshing ? "rotate(180deg)" : "none", transition: "transform 300ms ease" }}>
            <Icon name="refresh" />
          </span>
          {refreshing ? "Refreshing..." : "Refresh News"}
        </button>
      </div>

      {loading && news.length === 0 ? (
        <p style={{ color: "var(--muted)", padding: "24px 0" }}>Loading latest {teamName} articles...</p>
      ) : news.length === 0 ? (
        <p className="empty-message">No recent articles found for {teamName}.</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 280px), 1fr))", gap: "16px" }}>
          {news.map((item) => (
            <article key={item.id} className="news-card" style={{ background: "var(--surface)", borderRadius: "12px", border: "1px solid var(--border)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
              {item.image && (
                <img
                  src={item.image}
                  alt=""
                  style={{ width: "100%", height: "160px", objectFit: "cover" }}
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                />
              )}
              <div style={{ padding: "14px", display: "flex", flexDirection: "column", flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--muted)", marginBottom: "8px" }}>
                  <span style={{ color: "var(--mint)", fontWeight: "700" }}>{item.category}</span>
                  <span>{item.time}</span>
                </div>
                <h3 style={{ margin: "0 0 8px", fontSize: "14.5px", lineHeight: "1.4", color: "var(--foreground)" }}>{item.title}</h3>
                {item.description && (
                  <p style={{ margin: "0 0 12px", fontSize: "12.5px", color: "var(--muted)", lineHeight: "1.4", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {item.description}
                  </p>
                )}
                {item.url && (
                  <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ marginTop: "auto", fontSize: "12.5px", fontWeight: "700", color: "var(--mint)", textDecoration: "none" }}>
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

function TeamMatch({ match }) {
  const isUpcoming = ["UPCOMING", "NS", "TBD", "TIMED", "PST"].includes(match.status);

  return (
    <Link href={`/matches/${match.id}`} className="team-match">
      <span className="team-match-team home-team">
        {match.homeLogo && (
          <img
            src={match.homeLogo}
            alt=""
            style={{ width: "20px", height: "20px", objectFit: "contain" }}
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        )}
        {match.homeTeam}
      </span>

      <span className="team-match-result">
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
        <small>{isUpcoming ? "Upcoming" : match.status === "FT" ? "Full time" : match.status}</small>
      </span>

      <span className="team-match-team away-team">
        {match.awayTeam}
        {match.awayLogo && (
          <img
            src={match.awayLogo}
            alt=""
            style={{ width: "20px", height: "20px", objectFit: "contain" }}
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        )}
      </span>
    </Link>
  );
}

function SquadSection({ title, players }) {
  if (!players || players.length === 0) {
    return null;
  }

  return (
    <div className="squad-section">
      <h3><span>{title}</span><small>{players.length}</small></h3>

      {players.map((player) => (
        <Link
          key={player.id}
          href={`/players/${player.id}`}
          className="squad-player"
        >
          <div className="squad-player-main">
            {player.photo ? (
              <img
                src={player.photo}
                alt=""
                className="squad-player-photo"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : (
              <span className="player-number">{player.name?.charAt(0) || "P"}</span>
            )}

            <div className="player-details">
              <strong>{player.name}</strong>
              <span>
                {player.nationality ? `${player.nationality} · ` : ""}
                {player.position || "Position unavailable"}
                {player.number != null ? ` · #${player.number}` : ""}
              </span>
            </div>
          </div>

          <Icon name="chevronRight" className="player-arrow" />
        </Link>
      ))}
    </div>
  );
}

function TeamSectionHeading({ title, description }) {
  return (
    <header className="team-section-heading">
      <h2>{title}</h2>
      <p>{description}</p>
    </header>
  );
}
