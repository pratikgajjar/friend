# 🤙 Year of the Challenge

**The tyranny of friendship** - A web app to make New Year's resolutions for each other.

Inspired by [Moxie Marlinspike's Year of the Challenge](https://moxie.org/stories/year-of-the-challenge/)

> "Instead of making New Year's resolutions for ourselves, we decided to make resolutions for each other."

## Features

- **Create Challenge Groups** - Gather your friends in one place
- **Suggest Challenges** - Write challenges for each other (not yourself!)
- **Vote on Challenges** - Democratic selection of the best challenges
- **Track Progress** - Keep each other accountable throughout the year

## Challenge Categories

1. 🌱 **Growth** - Something they'd love to do but need accountability for
2. ✨ **Hidden Potential** - Something they'd do amazingly but would never consider
3. 🎪 **Comfort Zone** - Push them where they wouldn't go themselves
4. 🔧 **Neglected** - Something they actually need to do but keep avoiding
5. 🎁 **Shared Joy** - Something everyone will enjoy the fruits of

## Getting Started

### Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
```

### Build & Deploy to Cloudflare Pages

```bash
# Build the app
npm run build

# Deploy to Cloudflare Pages
npm run deploy
```

Or connect your GitHub repo to Cloudflare Pages for automatic deployments.

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Styling**: CSS Modules with CSS Variables
- **Animations**: Framer Motion
- **State**: Zustand with localStorage persistence
- **Deployment**: Cloudflare Pages

## Future Enhancements

For real-time multi-user sync, you can add:
- Cloudflare D1 (SQLite) for persistent storage
- Cloudflare Durable Objects for real-time updates
- Authentication with Cloudflare Access or a provider

## License

MIT - Build something fun with your friends!

