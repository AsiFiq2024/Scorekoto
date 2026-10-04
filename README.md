<p align="center">
  <img src="./scorekoto/src/app/icon.svg" alt="Scoreকত? logo" width="88" height="88" />
</p>

<h1 align="center">Scoreকত?</h1>

<p align="center">
  <strong>Every match. Every story. Your football, in one place.</strong>
</p>

<p align="center">
  A football platform for scores, fixtures, news, players, teams, and competitions.<br />
  Built for fans, with a responsive experience across desktop and mobile.
</p>

<p align="center">
  <a href="https://scorekoto.vercel.app/"><strong>Explore the Live App</strong></a>
  &nbsp; • &nbsp;
  <a href="https://github.com/AsiFiq2024/Scorekoto"><strong>View the Repository</strong></a>
  &nbsp; • &nbsp;
  <a href="#contributors"><strong>Meet the Contributors</strong></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-111111?style=flat-square&logo=nextdotjs&logoColor=white" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/React-19-149ECA?style=flat-square&logo=react&logoColor=white" alt="React 19" />
  <img src="https://img.shields.io/badge/PostgreSQL-Database-4169E1?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL database" />
  <img src="https://img.shields.io/badge/Vercel-Deployed-111111?style=flat-square&logo=vercel&logoColor=white" alt="Deployed on Vercel" />
</p>

---

## About the Project

**Scoreকত?** brings the football experience together: check a score, explore a squad, follow a competition, or catch up on the stories around the game. Fans can browse public football pages, create an account, and build a personalized collection of their favorite teams, players, and leagues.

Developed as a **CSE216 Database Systems project**, the application combines a Next.js interface with a PostgreSQL backend, including transaction handling, audit triggers, stored functions, and procedures.

## Features

| Feature | What you can explore |
| --- | --- |
| **Match Centre** | Live match statuses, upcoming fixtures, results, and date-based match browsing. |
| **Match Details** | Match events, commentary, statistics, and lineups when available from the data provider. |
| **Teams & Clubs** | Team profiles, squads, fixtures, results, and season statistics. |
| **Player Profiles** | Player information and performance statistics across seasons. |
| **Leagues & Tournaments** | Competition pages, standings, fixtures, results, and top scorers. |
| **Team Comparison** | Compare teams and explore their head-to-head records. |
| **Football News** | Browse football headlines, search stories, and filter by topic. |
| **Fan Interaction** | Match reactions and discussion through comments. |
| **Favorites & Notifications** | Save teams, players, and leagues; receive related match updates in the app. |
| **Accounts & Profiles** | Registration, login, and account management with custom authentication. |
| **Search & Themes** | Global search, light and dark themes, and layouts for desktop and mobile. |
| **Administration** | Manage football records, inspect audit logs, and access data synchronization tools. |

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | **Next.js 16**, **React 19**, JavaScript, App Router |
| Styling | CSS, CSS Modules, Tailwind CSS 4 |
| Typography | **Manrope** and **Hind Siliguri** for the English and Bengali identity |
| Backend | Next.js route handlers, Node.js |
| Database | PostgreSQL hosted on **Supabase**, accessed through `pg` |
| Authentication | `bcryptjs` password hashing and `jsonwebtoken` tokens |
| Football data | **API-Football / API-Sports** |
| News data | **NewsAPI** |
| Hosting | **Vercel** |

## Run Locally

### 1. Prerequisites

- **Node.js 20.9 or newer** and npm.
- A PostgreSQL database containing the project's core schema and data.
- API-Football and NewsAPI credentials for fetching new provider data.

### 2. Clone and install

The Next.js application lives inside the `scorekoto` directory.

```bash
git clone https://github.com/AsiFiq2024/Scorekoto.git
cd Scorekoto/scorekoto
npm ci
```

### 3. Configure the environment

Create a `.env.local` file in the `scorekoto/` application directory with your own values:

```dotenv
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE
JWT_SECRET=replace-with-a-long-random-secret
API_SPORTS_KEY=your-api-football-key
NEWS_API_KEY=your-newsapi-key
```

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Connection to the PostgreSQL database. |
| `JWT_SECRET` | Secret used to sign and verify authentication tokens. |
| `API_SPORTS_KEY` | Required for fetching football data from API-Football. |
| `NEWS_API_KEY` | Required for fetching and synchronizing news from NewsAPI. |

Keep `.env.local` out of version control. These values are used on the server and should not have a `NEXT_PUBLIC_` prefix.

### 4. Prepare the database

**The repository does not currently include a complete core-schema creation or seed script.** Connect to an existing Scoreকত? database, or restore a compatible schema and data dump before running the application.

The supplied [`cse216_setup.sql`](./scorekoto/database/cse216_setup.sql) adds audit logging, validation triggers, functions, and procedures to the existing schema. It does not create the full application database.

For an SSL-enabled database such as Supabase, apply those extensions from the application directory:

```bash
node --env-file=.env.local scripts/apply-cse216-setup.mjs
```

This command modifies the configured database. For a local database without SSL, apply the SQL file using your PostgreSQL client instead.

### 5. Start the app

```bash
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)**.

For a production build:

```bash
npm run build
npm run start
```

## Available Commands

Run these commands inside `scorekoto/`.

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server. |
| `npm run build` | Create a production build. |
| `npm run start` | Serve the production build. |
| `npm run lint` | Run ESLint. |
| `npm run audit:team-squads` | Audit team-squad data coverage. |
| `npm run setup:team-squads` | Set up the team-squad cache tables. |
| `npm run audit:match-details` | Audit cached match-detail coverage without changing data. |
| `npm run backfill:match-details -- --single --max-requests=90` | Preview a match-detail backfill without saving changes. |

Add `--apply` to the backfill command to fetch and persist data. Choose a request limit that fits your API plan; `--single` requests one fixture at a time.

## Database Design

The database work includes:

- **Transactions** using `BEGIN`, `COMMIT`, and `ROLLBACK` through a shared transaction helper.
- **Audit triggers** for changes to match, player, and team records.
- **Validation triggers** for negative final scores and duplicate player records.
- **Stored functions** for team win rates, player career summaries, and recent team form.
- **Stored procedures** for related match deletion and player-transfer updates.
- **Analytics queries** combining joins, aggregations, and window functions.

Read the [Database Documentation](./scorekoto/CSE216_DATABASE_DOCUMENTATION.md) and [Database Systems Manual](./SCOREKOTO_DATABASE_SYSTEMS_MANUAL.pdf) for implementation details.

## Project Structure

| Path | Contents |
| --- | --- |
| `scorekoto/src/app/` | Application pages, layouts, and API routes. |
| `scorekoto/src/app/api/` | Authentication, football data, news, favorites, notifications, and admin endpoints. |
| `scorekoto/src/app/lib/` | Database access, authentication, provider integration, and football-data helpers. |
| `scorekoto/src/components/` | Shared interface components. |
| `scorekoto/src/context/` | Authentication and favorites state. |
| `scorekoto/database/` | Database extension SQL. |
| `scorekoto/scripts/` | Data audits, cache setup, backfills, repairs, and database verification scripts. |

## Data Availability

Football and news coverage depend on provider availability, subscription coverage, request quotas, and the data stored in the database. Match statistics, events, and lineups may be unavailable for some fixtures. Update freshness depends on synchronization and caching; the app does not guarantee immediate coverage of every match.

## Deployment

The live application is hosted on **Vercel**:

**[https://scorekoto.vercel.app/](https://scorekoto.vercel.app/)**

When deploying this repository, set the project root directory to `scorekoto`, configure the environment variables above, and connect a database with the required schema and data. Use `npm run build` as the build command.

## Contributors

| Contributor | GitHub |
| --- | --- |
| **Asif Iqbal** | [@AsiFiq2024](https://github.com/AsiFiq2024) |
| **Atanu Bhowmick** | [@Atanu9516](https://github.com/Atanu9516) |

## Contributing

Ideas, bug reports, and improvements are welcome. Open an issue to describe a problem or proposed change, or submit a pull request with a clear description and relevant verification.

---

<p align="center">
  <strong>Scoreকত? — Stay close to the game.</strong>
</p>
