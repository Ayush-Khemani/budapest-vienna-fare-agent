# 🚆 Budapest → Vienna Fare Agent

A **GitHub Actions-based train fare monitoring agent** that searches ticket prices on MÁV for one adult, second class, one way, from Budapest to Vienna. It checks a configurable set of upcoming dates, ranks the fares, saves a price history, and publishes a human-readable report.

> **Scope:** This MVP checks MÁV fares only. It does **not** compare ÖBB, RegioJet or Trainline prices yet, and a MÁV fare is not necessarily the cheapest fare available across all train operators.

## How it works

1. GitHub Actions runs the script each day (scheduled 07:15 UTC; 08:15 CET / 09:15 CEST), or manually with **Actions → Check Budapest–Vienna train fares → Run workflow**.
2. The agent uses the open-source [`mav-prices`](https://github.com/MartinLangbecker/mav-prices) library to ask MÁV's **unofficial** booking interface for offers on upcoming dates.
3. Fares are normalized to EUR, sorted, and deduplicated.
4. The latest report is saved in `REPORT.md`, `data/latest.json`, `docs/index.html`, and history is appended to `data/history.json`.
5. GitHub Actions adds a run summary, optionally sends a Telegram message for the first threshold match or a new low, and commits updated reports. The reports link to the **official MÁV ticket website** where you verify the fare and book.

**Read this before enabling:** The `mav-prices` maintainer advises seeking MÁV's permission before production use. This project is a personal experimental monitor, not a supported MÁV integration. Respect MÁV's conditions, throttle requests, and stop if access is disallowed or blocked. No CAPTCHA bypass, cookies, credentials, or stealth scraping are included. There is **no public fare API guarantee**.

## Installation

Prerequisites: Node.js 20+ and npm.

```bash
npm install
npm test
npm run check
```

No API key is required for the unofficial MÁV library, but provider requests can fail or change without warning. If no date is queried successfully, the workflow fails visibly rather than inventing a price.

To validate locally *without contacting MÁV*, run `npm run demo`. Demo prices are **fictional** and must never be used to make travel decisions. The actual scheduled workflow never uses demo mode.

## Set up on your GitHub account

1. [Create a new GitHub repository](https://github.com/new) named `budapest-vienna-fare-agent` (public or private). Don't initialize it with a README if using the commands below.
2. Unzip this project on your machine and open a terminal inside the project directory.
3. Commit and push:

```bash
git init
git add .
git commit -m "Initial Budapest–Vienna fare agent"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/budapest-vienna-fare-agent.git
git push -u origin main
```

4. Open your repository's **Actions** tab, enable workflows if prompted, then select **Check Budapest–Vienna train fares** → **Run workflow**.
5. Make sure **Settings → Actions → General → Workflow permissions** allows **Read and write permissions** if auto-committing the report fails with a permissions error. You can alternatively remove the commit step and rely on workflow artifacts.
6. **Optional Telegram alert:** Create a Telegram bot with [@BotFather](https://t.me/BotFather), obtain your chat ID by messaging the bot then using `getUpdates`, and add repository **Settings → Secrets and variables → Actions → New repository secret** for `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`. They are read only at runtime. The agent sends a notification on the first result at or below the target or when a new daily observed low appears. No secrets are included in code.
7. Open `REPORT.md` after the first successful run. Optionally enable GitHub Pages with **Settings → Pages → Deploy from a branch → main → /docs** to get the visual report online (on repositories/plans that support Pages).

## Configuration

Configuration is via GitHub Actions file `.github/workflows/fare-check.yml` (env values) or environment variables locally.

| Variable | Default | Meaning |
|---|---|---|
| `SCAN_DAYS` | `14` | Look at the next 1–60 days; 14 days means ~42 MÁV API requests, subject to internal library details |
| `FROM_CODE` | `005510009` | MÁV BUDAPEST* station group; alternatively use `005501016` for Keleti |
| `TO_CODE` | `008103000` | Wien Hbf station ID; verify if MÁV updates its station table |
| `PAUSE_MS` | `1800` | Delay between daily query groups |
| `ALERT_BELOW_EUR` | `15` | Flags an offer at or under this price and can trigger an optional Telegram notification |
| `DEMO_MODE` | unset | Only `1` enables fictional offline fixtures |

When extending the search window, please avoid excessive traffic and check the provider's rules. The agent searches all hours of a date (24-hour price query), not just a single train departure.

## Output sample (illustrative only, not a real quote)

```
Lowest observed MÁV fare: €13.00
Travel date: 2026-11-10
Route: Budapest → Wien Hbf
Book/verify: https://jegy.mav.hu/
```

**Important limitations:** Prices are indicative and may change between search and checkout. MÁV may charge in HUF at its own exchange rate; seat reservations or optional extras may cost more. The report is not an actual ticket reservation. The fare source is unofficial and may break. The current version checks one booking source and cannot truthfully claim to identify the absolute cheapest train ticket across all rail operators.

## Project structure

```text
.github/workflows/  Daily schedule and tests
data/history.json    Rolling snapshots of the lowest observed fare
src/                 Fare collection, normalization and report rendering
docs/index.html       Generated static visual dashboard after a run
REPORT.md             Generated latest human-readable report after a run
tests/                Offline fixture tests; no live fare requests
```

## Next improvements

- Add a second independently supported provider integration (ÖBB has partner-oriented ticket pricing interfaces).
- Add more notification channels (email, Discord). Telegram alerts are already optional.
- Add a calendar heatmap, fare trends and persistence to PostgreSQL/Supabase.
- Add threshold-based booking suggestions (no auto-purchase).

### Data providers

- Official booking: [MÁV](https://jegy.mav.hu/)
- Unofficial library: [mav-prices](https://github.com/MartinLangbecker/mav-prices) (ISC license; dependency attribution)
- Official ticketshop partnership information: [ÖBB](https://www.oebb.at/en/kooperationen/online-kooperationen)

No railway provider endorses this project.
