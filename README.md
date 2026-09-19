# Blender: Slush matchmaking demo

Founders and investors answer a short questionnaire. Gemini turns the answers (and the website, if given) into keywords from a fixed taxonomy, each with a reason. Users can then add or remove keywords. Investors swipe startups ranked for them and review their likes on the Connect page.

## Setup (once)

1. Load Node 22 (installed with nvm): `. "$HOME/.nvm/nvm.sh"`
2. `npm install`
3. `cp .env.example .env` and set `GEMINI_API_KEY` (from https://aistudio.google.com/apikey)

## Develop

- `npm run dev`: API on :3001 and Vite on :5173 (phones on the same Wi-Fi can open `http://<laptop-ip>:5173`)
- `npm test`, `npm run typecheck`

## Run the demo on the local Wi-Fi

```bash
npm run build
npm start
```

The server prints `Open on phones: http://<ip>:3000`. Phones must be on the same Wi-Fi network, and the laptop needs internet for Gemini.

With a key set, the server also makes one test request to Gemini right after starting and prints `Gemini self-test OK: <model>, <ms> ms, <n> keywords`. If it prints `Gemini self-test FAILED (<model>): <error>` instead, fix `GEMINI_API_KEY` / `GEMINI_MODEL` in `.env` and restart before letting testers in.

- Phones can't connect and the firewall is on? `sudo ufw allow 3000/tcp`
- Guest/venue Wi-Fi often isolates devices from each other. Use your own router or a phone hotspot instead.

## Demo modes

- **I'm a founder**: questionnaire → AI keywords (editable) → preview of the card investors would see
- **I'm an investor**: questionnaire → AI keywords (editable) → swipe feed ranked by match % → Connect
- **Skip to swiping**: the test companies in random order

Swipe right or tap ♥ to like; swipe left or tap ✕ to pass. Scroll a card for details, and tap a keyword to see why it was assigned. Every 5 likes you are asked whether to open Connect. **Reset demo** (bottom-left) clears this phone's data.

## Replacing the draft content

- Questions: `shared/questions.ts`. Keep these ids, which the code reads: investor `stages`, `tickets`, `fundName`, `investorName`; founder `companyName`, `oneLiner`, `stage`, `raise`, `problem`, `solution`, `traction`, `team`, `whyInvest`; both `website` and `involvement`. `involvement` option ids must be taxonomy ids.
- Test companies: `src/data/companies.ts`. `npm test` validates the format.
- Keyword taxonomy: `shared/taxonomy.ts`
- Pitch videos: put an `.mp4` in `public/videos/` and set `videoUrl: '/videos/<file>.mp4'` on the company.

## Configuration (`.env`)

| Variable | Default | Meaning |
|---|---|---|
| `GEMINI_API_KEY` | (none) | Required for keyword generation |
| `GEMINI_MODEL` | `gemini-flash-latest` | Any current Gemini model id |
| `PORT` | 3000 (start) / 3001 (dev) | Server port |

## Out of scope (team decisions)

- Meeting invites / calendar integration (still being decided)
- Founder-created profiles appearing in the investor feed
- Accounts or server-side storage (each phone keeps its own data in localStorage)
