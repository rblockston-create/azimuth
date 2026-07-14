# Azimuth

A collaborative whiteboard. Multiple people draw on the same infinite chart surface, live.

## Stack

- **Client** — React 18 + Vite, canvas renderer (no drawing library), React Router
- **Server** — Node + Express, `ws` for realtime, better-sqlite3 for persistence
- **Deploy** — one Render web service; Express serves the built client, the API, and the WebSocket on a single origin

Single-service on purpose: split static-site + API services means cross-origin WebSockets and cookie headaches. One origin avoids both.

## Run it locally

```bash
npm run install:all
npm run dev          # Express on :3000, Vite on :5173 with a proxy for /api and /ws
```

Open http://localhost:5173. Sign in as `Rodney` / `azimuth` (override with `SUPERADMIN_PASSWORD`).

Production build:

```bash
npm run build
npm start            # serves client/dist + API + /ws on :3000
```

## Deploy to Render

1. Push to a new GitHub repo.
2. New → Blueprint, point it at the repo. `render.yaml` defines the service.
3. Set `SUPERADMIN_PASSWORD` in the dashboard **before the first boot** — the seed only runs against an empty database.

Two things to know:

- **The `starter` plan is not optional.** Free instances spin down and drop WebSocket connections, and they can't mount a disk.
- **The disk is what makes boards survive deploys.** SQLite lives at `/var/data`. Without the disk, every deploy wipes every board.

## Data model

| Table | Holds |
|---|---|
| `users` | account, bcrypt hash, role (`superadmin` / `member`), presence color |
| `sessions` | opaque cookie tokens, 30-day expiry, pruned hourly |
| `boards` | id, title, owner |
| `shapes` | one row per committed mark, ordered by `seq`, soft-deleted |

Shapes are append-only with soft deletes. A client joining late replays the board's shape history and lands on the same canvas as everyone already there — a hard delete would let erased marks reappear on replay.

## Realtime protocol

Client connects to `/ws?board=<id>`; the session cookie authenticates the upgrade.

| Message | Direction | Persisted |
|---|---|---|
| `init` | server → client | replays board history on join |
| `shape:draft` | both | no — in-progress stroke preview, throttled to ~25/sec |
| `shape:add` | both | yes — a finished mark |
| `shape:delete` | both | yes — soft delete |
| `board:clear` | both | yes — owner or superadmin only |
| `cursor` / `presence` | both | no |

Drafts are deliberately never written to disk. Peers see your stroke as you draw it; only the finished mark is committed.

## Tools

Pen, line, arrow, rectangle, ellipse, text, eraser. `P L A R O T E` to switch, `⌘Z` undoes your own last mark, space or middle-drag pans, scroll zooms.

## Roles

`superadmin` can delete any board, clear any board, and manage users via `/api/users`. `member` can create boards and delete their own. The user-management UI isn't built yet — the endpoints are there.
