"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import FavoriteButton from "@/components/FavoriteButton";
import Icon from "@/components/Icon";
import styles from "../directory.module.css";

export default function TeamsPage() {
  const [teams, setTeams] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadTeams() {
      try {
        setLoading(true);
        setError("");
        const res = await fetch("/api/teams?limit=1000");
        if (res.ok) {
          const data = await res.json();
          if (data.teams_data) setTeams(data.teams_data);
        } else {
          setError("We couldn't load the club directory right now.");
        }
      } catch (err) {
        console.error("Failed to load teams:", err);
        setError("We couldn't load the club directory right now.");
      } finally {
        setLoading(false);
      }
    }
    loadTeams();
  }, []);

  const filteredTeams = teams.filter((team) => {
    if (!search.trim()) return true;
    const query = search.toLowerCase();
    return (
      team.name.toLowerCase().includes(query) ||
      (team.short_name && team.short_name.toLowerCase().includes(query))
    );
  });

  return (
    <main className={styles.directoryPage}>
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <span className={styles.eyebrow}>Club directory</span>
          <h1><Icon name="football" /> Football teams</h1>
          <p>{loading ? "Loading clubs from the database…" : `Explore profiles, venues, squads, and results for ${teams.length} clubs.`}</p>

          <div className={styles.searchBox}>
            <Icon name="search" />
            <label htmlFor="team-search" className={styles.visuallyHidden}>Search teams</label>
            <input
              id="team-search"
              type="search"
              placeholder="Search by club name or abbreviation"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            {search && (
              <button type="button" onClick={() => setSearch("")} aria-label="Clear team search">
                <Icon name="close" />
              </button>
            )}
          </div>
        </div>
        <div className={styles.heroMark} aria-hidden="true">
          <Icon name="football" />
        </div>
      </section>

      <div className={styles.sectionHeading}>
        <div>
          <span className={styles.sectionKicker}>{search ? "Search results" : "Browse directory"}</span>
          <h2>{search ? `Clubs matching “${search}”` : "All teams"}</h2>
        </div>
        {!loading && !error && (
          <span className={styles.resultCount}>
            {filteredTeams.length} {filteredTeams.length === 1 ? "club" : "clubs"}
          </span>
        )}
      </div>

      {loading ? (
        <div className={`${styles.cardGrid} ${styles.teamGrid}`} aria-label="Loading teams">
          {Array.from({ length: 9 }, (_, index) => (
            <div key={index} className={`${styles.directoryCard} ${styles.skeletonCard}`} aria-hidden="true">
              <span className={styles.skeletonBadge} />
              <span className={styles.skeletonLines} />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className={styles.emptyState}>
          <Icon name="alert" />
          <h2>Unable to load teams</h2>
          <p>{error}</p>
        </div>
      ) : filteredTeams.length === 0 ? (
        <div className={styles.emptyState}>
          <Icon name="search" />
          <h2>No teams found</h2>
          <p>Try a different club name or abbreviation.</p>
          <button type="button" onClick={() => setSearch("")}>Clear search</button>
        </div>
      ) : (
        <div className={`${styles.cardGrid} ${styles.teamGrid}`}>
          {filteredTeams.map((team) => {
            const slug = team.slug || team.name.toLowerCase().replaceAll(" ", "-");

            return (
              <article key={team.team_id} className={styles.directoryCard}>
                <Link href={`/teams/${slug}`} className={styles.cardLink} prefetch={false}>
                  <div className={styles.badge}>
                    {team.logo_url ? (
                      <img
                        src={team.logo_url}
                        alt=""
                        className="entity-logo"
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                          event.currentTarget.nextElementSibling?.removeAttribute("hidden");
                        }}
                      />
                    ) : null}
                    <span hidden={Boolean(team.logo_url)}>{team.short_name || team.name.charAt(0)}</span>
                  </div>

                  <div className={styles.cardBody}>
                    <span className={styles.cardKicker}>Club profile</span>
                    <h3>{team.name}</h3>
                    {team.stadium_name && (
                      <p><Icon name="mapPin" /> {team.stadium_name}</p>
                    )}
                    <span className={styles.cardCta}>
                      View team <Icon name="chevronRight" />
                    </span>
                  </div>
                </Link>

                <div className={styles.favoriteSlot}>
                  <FavoriteButton type="teams" id={slug} label={team.name} />
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
