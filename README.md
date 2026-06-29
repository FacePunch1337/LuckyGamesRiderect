# Lucky Mini Games

Hosting-ready Node/Express app with three random mini games:

- Lucky Spin Wheel
- Triple Lucky Slots
- Lucky Balloon Pop

On each page open, the frontend randomly selects one game. Each game guarantees a jackpot on every third play, records a redirect event, and then redirects to one of the configured target URLs.

## Analytics

MongoDB collections:

- `page_views`: one document per page/game view
- `redirects`: one document per outgoing redirect

Stored fields include game id, session id, hashed IP, IP-derived geo fields, user agent, referrer, target URL for redirects, and timestamp.

The server does not request browser geolocation. Region detection uses proxy geo headers when available, or optional server-side IP lookup when `ENABLE_IP_GEOLOOKUP=true`.

## Setup

1. Install Node.js 18+.
2. Install dependencies:

```bash
npm install
```

3. Copy `.env.example` to `.env` and fill values:

```bash
PORT=3000
MONGODB_URI=mongodb+srv://user:password@cluster.example.mongodb.net/lucky_games
MONGODB_DB=lucky_games
ADMIN_PASSWORD=change-me
ENABLE_IP_GEOLOOKUP=false
```

4. Start:

```bash
npm start
```

Open:

- App: `http://localhost:3000`
- Admin: `http://localhost:3000/admin?key=change-me`
- Health: `http://localhost:3000/health`

## Deployment Notes

Set the same environment variables on the hosting provider. For correct IP analytics behind a proxy/CDN, keep Express `trust proxy` enabled and use a provider that forwards `X-Forwarded-For` or geo headers.
