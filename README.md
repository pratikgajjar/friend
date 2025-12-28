# 🤙 Year of the Challenge

A collaborative challenge-setting app inspired by [Moxie Marlinspike's Year of the Challenge](https://moxie.org/stories/year-of-the-challenge/).

## Stack

- **Frontend**: React + Vite + TypeScript + Framer Motion
- **Backend**: Cloudflare Workers + Hono
- **Database**: Cloudflare D1 (SQLite at the edge)

## Local Development

```bash
# Install dependencies
npm install

# Initialize local D1 database
npx wrangler d1 execute friend-challenge-db --local --file=./worker/schema.sql

# Run both frontend and API
npm run dev:all

# Or run separately:
npm run dev      # Frontend on :5173
npm run dev:api  # API on :8787
```

## Deploy to Cloudflare (< 10 seconds)

```bash
# 1. Create D1 database (first time only)
npx wrangler d1 create friend-challenge-db
# Copy the database_id to wrangler.toml

# 2. Run migrations on production
npx wrangler d1 execute friend-challenge-db --file=./worker/schema.sql

# 3. Deploy the API
npx wrangler deploy

# 4. Build and deploy frontend
npm run build
npx wrangler pages deploy dist
```

## Environment Variables

For production, set `VITE_API_URL` to your deployed worker URL:

```bash
VITE_API_URL=https://friend-challenge-api.your-subdomain.workers.dev
```

## How It Works

1. **Gather Phase**: Create a group, invite friends with a room code
2. **Suggest Phase**: Everyone suggests challenges for each other
3. **Vote Phase**: Vote on which challenges to finalize
4. **Track Phase**: Track challenge completion throughout the year

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/groups` | Create new group |
| GET | `/api/groups/:code` | Get group by code |
| POST | `/api/groups/:code/join` | Join a group |
| POST | `/api/groups/:code/advance` | Advance game phase |
| POST | `/api/groups/:code/challenges` | Add challenge |
| POST | `/api/challenges/:id/vote` | Vote on challenge |
| DELETE | `/api/challenges/:id/vote` | Remove vote |
| POST | `/api/challenges/:id/toggle` | Toggle completion |
