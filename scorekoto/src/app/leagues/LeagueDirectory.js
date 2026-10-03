"use client";

import { useState } from "react";
import Link from "next/link";
import FavoriteButton from "@/components/FavoriteButton";
import Icon from "@/components/Icon";
import styles from "../directory.module.css";

export default function LeagueDirectory({ leagues, countryCount }) {
  const [search, setSearch] = useState("");
  const query = search.trim().toLocaleLowerCase();
  const filteredLeagues = leagues.filter((league) =>
    [league.name, league.country, league.type]
      .some((value) => String(value || "").toLocaleLowerCase().includes(query))
  );

  return (
    <main className={styles.directoryPage}>
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <span className={styles.eyebrow}>Competition hub</span>
          <h1><Icon name="trophy" /> Football competitions</h1>
          <p>Follow standings, fixtures, results, and clubs from competitions around the world.</p>

          <div className={styles.heroStats} aria-label="Competition directory summary">
            <span><strong>{leagues.length}</strong> competitions</span>
            <span><strong>{countryCount}</strong> countries</span>
          </div>

          <div className={styles.searchBox}>
            <Icon name="search" />
            <label htmlFor="league-search" className={styles.visuallyHidden}>Search competitions</label>
            <input
              id="league-search"
              type="search"
              placeholder="Search by competition, country, or type"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            {search && (
              <button type="button" onClick={() => setSearch("")} aria-label="Clear competition search">
                <Icon name="close" />
              </button>
            )}
          </div>
        </div>
        <div className={styles.heroMark} aria-hidden="true">
          <Icon name="trophy" />
        </div>
      </section>

      <div className={styles.sectionHeading}>
        <div>
          <span className={styles.sectionKicker}>{query ? "Search results" : "Browse directory"}</span>
          <h2>{query ? `Competitions matching “${search.trim()}”` : "All competitions"}</h2>
        </div>
        <span className={styles.resultCount}>
          {filteredLeagues.length} {filteredLeagues.length === 1 ? "competition" : "competitions"}
        </span>
      </div>

      {filteredLeagues.length === 0 ? (
        <div className={styles.emptyState}>
          <Icon name={query ? "search" : "trophy"} />
          <h2>{query ? "No competitions found" : "No competitions available"}</h2>
          <p>{query
            ? "Try a different competition name, country, or type."
            : "Competition data will appear here once it is available."}</p>
          {query && <button type="button" onClick={() => setSearch("")}>Clear search</button>}
        </div>
      ) : (
        <div className={`${styles.cardGrid} ${styles.leagueGrid}`}>
          {filteredLeagues.map((league) => {
            const slug = league.slug || league.name.toLowerCase().replaceAll(" ", "-");

            return (
              <article key={league.id} className={styles.directoryCard}>
                <Link href={`/leagues/${slug}`} className={styles.cardLink}>
                  <div className={`${styles.badge} ${styles.leagueBadge}`}>
                    {league.logo_url ? <img src={league.logo_url} alt="" /> : <Icon name="trophy" />}
                  </div>

                  <div className={styles.cardBody}>
                    <span className={styles.cardKicker}>{league.type || "Competition"}</span>
                    <h3>{league.name}</h3>
                    <p><Icon name="globe" /> {league.country || "International"}</p>
                    <span className={styles.cardCta}>
                      View competition <Icon name="chevronRight" />
                    </span>
                  </div>
                </Link>

                <div className={styles.favoriteSlot}>
                  <FavoriteButton type="leagues" id={slug} label={league.name} />
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}