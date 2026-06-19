# U.S. Open Golf Picks Live

Deployment-ready static leaderboard for Sean and Zach's 2026 U.S. Open picks game.

- `public/`: browser application
- `api/scores.js`: Vercel live-score function
- `supabase/migrations/001_initial.sql`: score snapshot database
- `tests/`: scoring-rule verification
- `DEPLOYMENT.md`: complete GitHub, Supabase, and Vercel instructions

## Picks

**Sean:** Xander Schauffele, Matt Fitzpatrick, Cameron Young, Jon Rahm. Alt: Patrick Reed. Best Ball: Sam Burns.

**Zach:** Scottie Scheffler, Rory McIlroy, Tommy Fleetwood, Jordan Spieth. Alt: Russell Henley. Best Ball: Brooks Koepka.

## Local check

```bash
npm test
npm run dev
```

Open `http://127.0.0.1:3000`.
