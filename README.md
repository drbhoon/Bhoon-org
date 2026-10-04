# bhoon-org

The Bhoon monorepo contains the public website and the two Bhoon applications behind one canonical origin.

| Public route | Service | Legacy hostname |
| --- | --- | --- |
| `https://bhoon.org/` | Public site and gateway | `www.bhoon.org` redirects here |
| `https://bhoon.org/people/` | Personality analyser | `people.bhoon.org` and `peoplescience.bhoon.org` redirect here |
| `https://bhoon.org/stocks/` | Portfolio and stock analyser | `stocks.bhoon.org` redirects here |

The former public-site page named `people.html` is now `/people-architecture`, leaving `/people` exclusively for the application.

## Repository layout

```text
apps/
  site/       Static bhoon.org pages
  people/     React + Express + PostgreSQL personality analyser
  stocks/     React + FastAPI + SQLite stock analyser
services/
  gateway/    Host redirects, canonical path routing, and static-site serving
docker-compose.yml
```

The two application repositories were imported with their Git histories using `git subtree`. The primary `Bhoon-org` history remains the monorepo's main history.

## Local setup

1. Copy `.env.example` to `.env`.
2. Set a fresh People PostgreSQL URL and a shared `JWT_SECRET`.
3. Add Google OAuth and optional admin settings if authentication flows are needed.
4. Run `docker compose up --build`.
5. Open `http://localhost:3000`.

No production or test database is included. The People service applies its schema to the configured empty PostgreSQL database. The Stocks service creates a fresh SQLite database in its own volume.

## Production deployment

Deploy three services from this repository:

- **gateway** — deploy from the repository root; the root `Dockerfile` builds the gateway and static site. Attach `bhoon.org`, `www.bhoon.org`, `people.bhoon.org`, `peoplescience.bhoon.org`, and `stocks.bhoon.org` to this service.
- **people** — use `apps/people` as the service root. Keep it private and set `APP_URL=https://bhoon.org/people` and `GOOGLE_REDIRECT_URI=https://bhoon.org/people/api/auth/google/callback`.
- **stocks** — use `apps/stocks` as the service root. Keep it private, set `APP_URL=https://bhoon.org/stocks`, and mount a new volume at `/app/data`.

Set `PEOPLE_UPSTREAM` and `STOCKS_UPSTREAM` on the gateway to the two private service URLs. Set the same strong `JWT_SECRET` on People and Stocks so the existing SSO cookie works across both paths. Update the Google OAuth client with the two canonical callback URLs.

Do not attach the legacy subdomains directly to the application services: the gateway must receive them to issue permanent redirects to the canonical paths.

## Verification

```bash
npm --prefix services/gateway install
npm --prefix apps/people install
npm --prefix apps/people/client install
npm --prefix apps/stocks/frontend install
npm run build
npm test
```

The stock tests use the Python dependencies in `apps/stocks/backend/requirements.txt`.
