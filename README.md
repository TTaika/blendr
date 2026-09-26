# Blendr: Slush matchmaking demo

Founders and investors answer a short questionnaire. AI turns the answers (and the website, if given) into keywords from a fixed taxonomy, each with a reason. Users can then add or remove keywords. Investors swipe startups ranked for them and review their likes on the Connect page. The connect page allows a direct link to set up a meeting in the Slush-app.

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

## Deploy on Render (public URL, no laptop)

`render.yaml` is a Render Blueprint for one free web service (API + built app).

1. Sign in at [render.com](https://render.com) with GitHub and allow access to this repo.
2. **New → Blueprint**, pick this repo and the `feature/blendr` branch.
3. Paste your `GEMINI_API_KEY` when asked (kept server-side on Render).
4. Open `https://<service>.onrender.com`. `/api/health` should show `"selfTest":{"status":"ok"}`.

Free services sleep after ~15 idle minutes; the first visit afterwards takes about a minute. Open the link a minute before a demo. `TRUST_PROXY=1` (set by the blueprint) makes the 20-requests-per-minute limit apply per visitor behind Render's proxy; leave it unset when hosting directly.

## Demo modes

- **I'm a founder**: questionnaire → AI keywords (editable) → preview of the card investors would see
- **I'm an investor**: questionnaire → AI keywords (editable) → swipe feed ranked by personality fit → Connect
- **Skip to swiping**: the test companies in random order

Swipe right or tap ♥ to like; swipe left or tap ✕ to pass. Scroll a card for details, and tap a keyword to see why it was assigned. Every 5 likes you are asked whether to open Connect. **Start over** (bottom-left; top-right on questionnaire and review steps) clears this phone's data.

Once there are likes, Connect has a **Book a meeting** button. It shows a simulated hand-off to My Slush: a "Redirecting you to My Slush" screen with a loading circle that never finishes. Nothing connects to My Slush, and nothing is booked or sent. **Restart the demo** at the bottom of that screen clears this phone's data straight away (no confirmation) and goes back to the start.

A pass plays a short swoosh and a like (match) a bright pling. Both are synthesized with the Web Audio API in `src/lib/sounds.ts` (no audio files) and play as the card leaves; where Web Audio is missing or blocked, swiping is silent, and an iPhone's silent switch mutes them.

Pitch videos start by themselves once at least half of the video is on screen (top swipe card, the Connect detail view and the founder's "You're live!" card) and pause when scrolled away, resuming only if they paused themselves. After you pause one or it ends, replay it with the video controls. Browsers that block autoplay with sound (notably iPhone Safari) start it muted; tap the speaker to unmute.

## Replacing the draft content

- Questions: `shared/questions.ts`. Keep these ids, which the code reads: investor `investorName`, `fundName`, `stages`, `tickets`, `valuesWanted`, `regions`, `founderFit`, `risk`; founder `companyName`, `website`, `contactName`, `contactEmail`, `values`, `stage`, `raisedSoFar`, `raise`, `problemSolution`, `growthMoM`, `revenue`, `customers`, `retention`, `runway`, `team`, `whyInvest`, `pitchVideo`, `leadership`; both `involvement`, `pressure` and `transparency`. `involvement` option ids must be taxonomy ids, and `valuesWanted` option ids are the taxonomy's personality keywords (`PERSONALITY_OPTIONS`). Investors have no website question; founders pick their company's three main values (`values`, a multiple-choice list of values with at most 3 picks) instead of a one-liner, and investors pick what they value in a startup (`valuesWanted`, at most 3 picks) the same way. The founder `raise` and investor `tickets` questions are both dual-handle range sliders sharing `TICKET_STOPS` (also in `shared/questions.ts`), each answered as a `[min, max]` pair of stop values. The founder questionnaire's first step groups `companyName`, `website`, `contactName` and `contactEmail` onto one page, and a later step groups the five optional "key numbers" questions (`growthMoM`, `revenue`, `customers`, `retention`, `runway`) onto another (consecutive questions sharing a `page` render together, via `questionSteps`, with a title from `PAGE_TITLES`); `contactName` and `contactEmail` are marked `excludeFromAi` so they are never sent to Gemini or Claude. The optional `pitchVideo` step (right after `whyInvest`) lets founders record or choose a video of at most 1 minute and 100 MB; its answer is only a short descriptor such as `pitch.mov · 0:48`, also `excludeFromAi`, and the video itself is kept in the phone's IndexedDB (`src/lib/videoStore.ts`) and shown on the founder's own card. `raisedSoFar` ("How much have you raised so far?") is a single-handle slider on the same `TICKET_STOPS` scale, answered as one stop value and shown in the card's stage line ("Seed · raised €1M · raising …"). Questions can be conditional: `askWhen: { id, in }` asks a question only when an earlier single-choice answer is one of the listed ids (`raisedSoFar` only for `seed`, `series-a` and `series-b-plus`), and a skipped question's answer is ignored everywhere and never sent.
- Test companies: `src/data/companies.ts`, the team-supplied set of 30 real companies for the demo (contacts are placeholders, `hello@<id>.example`). `npm test` validates the format.
- Keyword taxonomy: `shared/taxonomy.ts`
- Pitch videos: all test companies share one video, `public/videos/pitch.mp4` (`EXAMPLE_PITCH_VIDEO` in `src/data/companies.ts`), shown in each card's scroll-down details. Keep it an H.264 MP4, at most 60 seconds and under 15 MB: the claude.ai Artifact refuses larger files. Until the file is there, cards show "Pitch video coming soon".

## Configuration (`.env`)

| Variable | Default | Meaning |
|---|---|---|
| `GEMINI_API_KEY` | (none) | Required for keyword generation |
| `GEMINI_MODEL` | `gemini-flash-latest` | Any current Gemini model id |
| `TRUST_PROXY` | unset | Proxy hops to trust for client IPs (`1` on Render) |
| `PORT` | 3000 (start) / 3001 (dev) | Server port |

## Out of scope (team decisions)

- Meeting invites / calendar integration (still being decided). **Book a meeting** on Connect is only a mock-up of a hand-off to My Slush and connects to nothing.
- Founder-created profiles appearing in the investor feed
- Accounts or server-side storage (each phone keeps its own data in localStorage)
- Uploading founder videos: a founder's pitch video stays on their phone (IndexedDB). Only its file name and length are part of the answers, and those never reach the AI.
