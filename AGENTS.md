# AGENTS.md

> Instructions for AI agents and future contributors working on this codebase.

## Project Overview

**Year of the Challenge** - A collaborative challenge-setting app where friends create resolutions for each other. Inspired by [Moxie Marlinspike's Year of the Challenge](https://moxie.org/stories/year-of-the-challenge/).

**Live Site**: https://friend.backend.how  
**Source Code**: https://github.com/pratikgajjar/friend

## Architecture

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────┐
│  React Frontend │────▶│ Cloudflare Pages     │────▶│ Cloudflare  │
│  (Vite + TS)    │     │ Functions (API)      │     │ D1 (SQLite) │
└─────────────────┘     └──────────────────────┘     └─────────────┘
        │
        ▼
   End-to-End Encrypted
   (AES-256-GCM, key in URL fragment)
```

### Key Design Decisions

1. **End-to-End Encryption**: All sensitive data (names, challenge text) is encrypted client-side. The server only stores ciphertext. Encryption key lives in URL fragment (`#key=...`) and never touches the server.

2. **Magic Links for Identity**: No accounts/passwords. Each user gets a unique magic link token for cross-device access.

3. **Version-based Polling**: Frontend polls `/api/groups/:code/version` (1 D1 read) before fetching full data. Only fetches when version changes.

4. **Cloudflare Turnstile**: Bot protection on create/join forms. Secret key stored in environment variable.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, TypeScript, Zustand, Framer Motion |
| Backend | Cloudflare Pages Functions (file-based routing) |
| Database | Cloudflare D1 (SQLite at the edge) |
| Encryption | Web Crypto API (AES-256-GCM) |
| Bot Protection | Cloudflare Turnstile |
| Analytics | Plausible (self-hosted) |

## Directory Structure

```
├── src/                    # Frontend React app
│   ├── components/         # Reusable UI components
│   ├── pages/              # Route components
│   ├── store/              # Zustand state management
│   │   └── syncStore.ts    # Main store (API calls, polling, encryption)
│   ├── lib/
│   │   └── crypto.ts       # E2E encryption utilities
│   └── styles/
│       └── global.css      # CSS variables and global styles
│
├── functions/              # Cloudflare Pages Functions (API)
│   └── api/
│       ├── groups/
│       │   ├── index.ts           # POST /api/groups (create)
│       │   ├── [code].ts          # GET /api/groups/:code
│       │   └── [code]/
│       │       ├── join.ts        # POST (join group)
│       │       ├── advance.ts     # POST (advance phase)
│       │       ├── challenges.ts  # POST (add challenge)
│       │       ├── tokens.ts      # GET (host gets all tokens)
│       │       └── version.ts     # GET (version check)
│       ├── challenges/
│       │   └── [id]/
│       │       ├── index.ts       # DELETE (remove challenge)
│       │       ├── vote.ts        # POST/DELETE (vote)
│       │       └── toggle.ts      # POST (toggle complete)
│       └── auth/
│           └── [token].ts         # GET (magic link auth)
│
├── worker/
│   └── schema.sql          # D1 database schema
│
├── public/
│   └── pinky.svg           # Favicon
│
└── wrangler.toml           # Cloudflare configuration
```

## Database Schema

```sql
-- Groups table
CREATE TABLE groups (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,      -- 6-char invite code
  name TEXT NOT NULL,             -- ENCRYPTED
  phase TEXT DEFAULT 'gathering', -- gathering|suggesting|voting|finalized|tracking
  challenges_per_person INTEGER DEFAULT 6,
  deadline TEXT,
  version INTEGER DEFAULT 1,      -- For polling optimization
  created_at TEXT DEFAULT (datetime('now'))
);

-- Participants table  
CREATE TABLE participants (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL,
  name TEXT NOT NULL,             -- ENCRYPTED
  avatar TEXT,                    -- Emoji
  is_host INTEGER DEFAULT 0,
  token TEXT UNIQUE,              -- Magic link token (UUID)
  FOREIGN KEY (group_id) REFERENCES groups(id)
);

-- Challenges table
CREATE TABLE challenges (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL,
  text TEXT NOT NULL,             -- ENCRYPTED
  for_participant_id TEXT NOT NULL,
  suggested_by_id TEXT NOT NULL,
  votes TEXT DEFAULT '[]',        -- JSON array of participant IDs
  is_completed INTEGER DEFAULT 0,
  FOREIGN KEY (group_id) REFERENCES groups(id)
);
```

## Game Phases

1. **gathering** - Host invites friends, waiting for everyone to join
2. **suggesting** - Everyone suggests challenges for each other
3. **voting** - Vote on challenges (top N per person get selected)
4. **finalized** - Challenges are locked in, review before tracking
5. **tracking** - Year-long tracking, mark challenges complete

## API Authentication

- `X-User-Id` header: Participant ID for authenticated requests
- Magic token in URL path: For cross-device auth (`/join/auth/:token`)
- Turnstile token in body: For create/join (bot protection)

### Access Control Rules

| Endpoint | Who Can Access |
|----------|----------------|
| POST /groups | Anyone (with Turnstile) |
| POST /groups/:code/join | Anyone (with Turnstile) |
| POST /groups/:code/advance | Host only |
| POST /groups/:code/challenges | Any participant (suggesting phase only) |
| DELETE /challenges/:id | Creator only |
| POST /challenges/:id/vote | Any participant |
| POST /challenges/:id/toggle | Assignee only |
| GET /groups/:code/tokens | Host only |

## Environment Variables

| Variable | Description | Where Set |
|----------|-------------|-----------|
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile secret | Pages secret |
| `DB` | D1 database binding | wrangler.toml |

## Encryption Details

```typescript
// Key generation (client-side only)
const key = await crypto.subtle.generateKey(
  { name: 'AES-GCM', length: 256 },
  true,
  ['encrypt', 'decrypt']
)

// Key format: Base64URL (URL-safe, no padding)
// Stored in: URL fragment (#key=...) and localStorage

// Encrypted fields:
// - group.name
// - participant.name  
// - challenge.text
```

The encryption key is:
- Generated when creating a group
- Passed via URL fragment (never sent to server)
- Stored in localStorage for returning users
- Required in invite links and magic links

## Local Development

```bash
# Install dependencies
npm install

# Initialize local D1
npx wrangler d1 execute friend-challenge-db --local --file=./worker/schema.sql

# Run frontend (port 5173) + API proxy
npm run dev

# Or run API separately (port 8787)
npm run dev:api
```

## Deployment

```bash
# Build frontend
npm run build

# Deploy to Cloudflare Pages (includes Functions)
npx wrangler pages deploy dist --project-name friend-challenge

# Set secrets (first time only)
npx wrangler pages secret put TURNSTILE_SECRET_KEY --project-name friend-challenge
```

## Common Tasks

### Adding a new API endpoint

1. Create file in `functions/api/` following the routing convention
2. Export `onRequestGet`, `onRequestPost`, etc.
3. Add `X-User-Id` check if authenticated
4. Call `bumpVersion()` after any write operation
5. Handle encrypted fields appropriately

### Adding a new game phase

1. Update `phases` array in `functions/api/groups/[code]/advance.ts`
2. Add phase-specific UI in `src/pages/ChallengeBoard.tsx`
3. Update polling interval in `src/store/syncStore.ts` if needed

### Modifying encryption

All encryption logic is in `src/lib/crypto.ts`. The server never decrypts - it only stores/returns ciphertext.

## Code Style

- TypeScript strict mode
- Functional React components with hooks
- CSS Modules for component styles
- CSS variables defined in `global.css`
- No external component libraries (custom UI)

## Testing

Currently no automated tests. Manual testing via:
1. Create group in one browser
2. Join from another browser/incognito
3. Test all phases
4. Verify encryption by checking D1 directly (should see ciphertext)

## Known Limitations

1. **No data backup**: If D1 is lost, data is gone
2. **No password recovery**: Lost magic link = lost access (by design)
3. **Polling-based sync**: 3-second delay between updates
4. **Single region**: D1 is edge-replicated but writes go to primary

## Security Considerations

1. Never log or expose encryption keys
2. Never store Turnstile secret in code (use env vars)
3. Always validate `X-User-Id` against group membership
4. Rate limiting handled by Cloudflare (no custom implementation)

## Useful Commands

```bash
# Check D1 data (local)
npx wrangler d1 execute friend-challenge-db --local --command "SELECT * FROM groups"

# Check D1 data (production)  
npx wrangler d1 execute friend-challenge-db --remote --command "SELECT * FROM groups"

# View Pages deployment logs
npx wrangler pages deployment tail --project-name friend-challenge
```

## Contact

- **Author**: Pratik ([@pratikgajjar_in](https://x.com/pratikgajjar_in))
- **Website**: [backend.how](https://backend.how)

