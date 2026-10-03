import pool from "@/app/lib/db";
import TeamTabs from "@/components/TeamTabs";
import FavoriteButton from "@/components/FavoriteButton";
import { TeamCompareButton } from "@/components/TeamCompareModal";
import { getTeamManagerName } from "@/app/lib/team-manager";
import { getTeamSquad } from "@/app/lib/team-squad";
import { getTeamPrimaryCompetition } from "@/app/lib/team-competition";
import Link from "next/link";
import Icon from "@/components/Icon";

async function getTeamDataFromDb(teamParam) {
  try {
    const decoded = decodeURIComponent(teamParam).trim().toLowerCase();

    // 1. Query Team from DB
    let teamQuery;
    let teamParams;

    if (Number.isInteger(Number(decoded)) && Number(decoded) > 0) {
      teamQuery = `SELECT * FROM team WHERE team_id = $1 LIMIT 1`;
      teamParams = [Number(decoded)];
    } else {
      teamQuery = `
        SELECT * FROM team 
        WHERE LOWER(name) = $1 
           OR LOWER(REPLACE(name, ' ', '-')) = $1
           OR LOWER(short_name) = $1
        LIMIT 1
      `;
      teamParams = [decoded];
    }

    const teamRes = await pool.query(teamQuery, teamParams);

    if (teamRes.rows.length === 0) {
      return null;
    }

    const teamRow = teamRes.rows[0];
    const teamId = teamRow.team_id;
    const managerNamePromise = getTeamManagerName(teamId, teamRow.manager_name);

    // 2. Resolve the primary domestic competition from valid dated evidence.
    const leagueInfoPromise = getTeamPrimaryCompetition(teamId);

    // 3. Query the verified current-squad snapshot. Player.team_id cannot
    // represent both club and national-team membership accurately.
    const squadPromise = getTeamSquad(teamId);

    // 4. Query every stored match for this exact team ID.
    const matchesQuery = `
      SELECT 
        m.match_id as id,
        m.status,
        m.match_date as "matchDate",
        m.home_score as "homeScore",
        m.away_score as "awayScore",
        ht.name as "homeTeam",
        ht.logo_url as "homeLogo",
        at.name as "awayTeam",
        at.logo_url as "awayLogo",
        l.name as league
      FROM match m
      JOIN team ht ON m.home_team_id = ht.team_id
      JOIN team at ON m.away_team_id = at.team_id
      JOIN season s ON m.season_id = s.season_id
      JOIN league l ON s.league_id = l.league_id
      WHERE m.home_team_id = $1 OR m.away_team_id = $1
      ORDER BY m.match_date DESC NULLS LAST;
    `;
    const matchesRes = await pool.query(matchesQuery, [teamId]);
    const matches = matchesRes.rows;

    const trophiesRes = await pool.query(
      `SELECT tt.season_won, tr.name, tr.type
       FROM team_trophy tt
       JOIN trophy tr ON tr.trophy_id = tt.trophy_id
       WHERE tt.team_id = $1
       ORDER BY tt.season_won DESC, tr.name ASC`,
      [teamId]
    );
    const [managerName, squad, leagueInfo] = await Promise.all([
      managerNamePromise,
      squadPromise,
      leagueInfoPromise,
    ]);

    // Query PL/pgSQL database functions
    const sqlFunctionsRes = await pool.query(
      `SELECT 
         fn_calculate_team_win_rate($1) AS win_rate,
         fn_get_team_recent_form($1, 5) AS recent_form`,
      [teamId]
    );
    const sqlFunctions = sqlFunctionsRes.rows[0] || {};

    // 5. Calculate Real Stats from Completed Matches
    const completedMatches = matches.filter(
      (m) => m.status === "FT" || m.status === "AET" || m.status === "PEN"
    );
    const stats = completedMatches.reduce(
      (acc, match) => {
        const isHome = match.homeTeam.toLowerCase() === teamRow.name.toLowerCase();
        const goalsFor = isHome ? match.homeScore ?? 0 : match.awayScore ?? 0;
        const goalsAgainst = isHome ? match.awayScore ?? 0 : match.homeScore ?? 0;

        acc.played += 1;
        acc.goalsFor += goalsFor;
        acc.goalsAgainst += goalsAgainst;

        if (goalsFor > goalsAgainst) {
          acc.wins += 1;
        } else if (goalsFor === goalsAgainst) {
          acc.draws += 1;
        } else {
          acc.losses += 1;
        }

        return acc;
      },
      { played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0 }
    );

    const teamData = {
      id: teamRow.team_id,
      name: teamRow.name,
      slug: teamRow.name.toLowerCase().replaceAll(" ", "-"),
      shortName: teamRow.short_name || teamRow.name.substring(0, 3).toUpperCase(),
      stadium: teamRow.stadium_name || null,
      country: leagueInfo?.country || null,
      league: leagueInfo?.name || null,
      manager: managerName || null,
      history: teamRow.history || null,
      logo: teamRow.logo_url,
      winRate: sqlFunctions.win_rate,
      recentForm: sqlFunctions.recent_form,
    };

    return {
      team: teamData,
      players: squad.players,
      squadMeta: squad.meta,
      matches: matches,
      stats: stats,
      trophies: trophiesRes.rows,
    };
  } catch (err) {
    console.error("Database query error in TeamPage:", err);
    return null;
  }
}

export default async function TeamPage({ params }) {
  const { team: teamParam } = await params;

  // 1. Fetch from PostgreSQL database
  const dbData = await getTeamDataFromDb(teamParam);

  if (!dbData || !dbData.team) {
    return (
      <main className="team-page">
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <h2>Team Not Found</h2>
          <p style={{ color: "var(--muted)", margin: "10px 0 20px" }}>
            The requested team could not be located in the database.
          </p>
          <Link
            href="/teams"
            style={{
              display: "inline-block",
              padding: "10px 20px",
              borderRadius: "999px",
              background: "var(--mint)",
              color: "var(--black)",
              fontWeight: "700",
              textDecoration: "none",
            }}
          >
            <Icon name="arrowLeft" /> Browse Teams
          </Link>
        </div>
      </main>
    );
  }

  const teamData = dbData.team;
  const teamMatches = dbData.matches || [];
  const teamPlayers = dbData.players || [];
  const squadMeta = dbData.squadMeta || { status: "not_synced", playerCount: 0 };
  const teamStats = dbData.stats || { played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0 };
  const teamTrophies = dbData.trophies || [];
  const headerDetails = [teamData.country, teamData.stadium].filter(Boolean);

  return (
    <main className="team-page">
      {/* TEAM HEADER */}
      <section className="team-header">
        {teamData.logo ? (
          <img
            src={teamData.logo}
            alt={`${teamData.name} logo`}
            className="team-page-logo entity-logo"
          />
        ) : (
          <div className="team-logo"><Icon name="football" /></div>
        )}

        <div>
          <h1>{teamData.name}</h1>
          <p>
            {headerDetails.join(" · ")}
            {teamData.winRate !== undefined && Number(teamData.winRate) > 0 && (
              <span> · Win Rate: <strong>{teamData.winRate}%</strong></span>
            )}
            {teamData.recentForm && teamData.recentForm !== 'N/A' && (
              <span className="team-recent-form-inline">
                {" · Form: "}
                <span className="team-form-badges">
                  {(teamData.recentForm.match(/[WDLwdl]/g) || []).map((ch, idx) => (
                    <span
                      key={idx}
                      className={`form-badge-pill form-badge-${ch.toLowerCase()}`}
                      title={ch.toUpperCase() === 'W' ? 'Win' : ch.toUpperCase() === 'D' ? 'Draw' : 'Loss'}
                    >
                      {ch.toUpperCase()}
                    </span>
                  ))}
                </span>
              </span>
            )}
          </p>
        </div>

        <div className="team-header-actions">
          <TeamCompareButton team={teamData} />
          <FavoriteButton
            type="teams"
            id={teamData.slug || String(teamData.id)}
          />
        </div>
      </section>

      <TeamTabs
        team={teamData}
        teamMatches={teamMatches}
        matches={teamMatches}
        teamPlayers={teamPlayers}
        players={teamPlayers}
        teamStats={teamStats}
        stats={teamStats}
        teamTrophies={teamTrophies}
        squadMeta={squadMeta}
      />
    </main>
  );
}
