# Adoption & Community Health Tracker Guide

This document explains how to track genuine adoption of **typeshift** using official, verifiable public APIs without third-party services or telemetry bloat.

---

## 1. Quick One-Command Execution (Windows / Mac / Linux)

Run from the repository root:

```powershell
node launch-assets/track-adoption.js
```

### What It Does:
1. Queries the official **npm Registry Downloads API** (`api.npmjs.org`) for weekly and monthly download counts.
2. Queries the official **GitHub API** for stars, forks, genuine open issues, open pull requests, and latest release tags.
3. Queries **GitHub Traffic Insights** via your authenticated GitHub CLI (`gh api`) for rolling 14-day page views and Git clone counts.
4. Saves a dated JSON snapshot to `launch-assets/metrics/snapshots/YYYY-MM-DD.json`.
5. Updates the rolling CSV history file `launch-assets/metrics/history.csv`.
6. Prints a clean, colorized terminal summary table.

---

## 2. Baseline Metrics Captured at Launch (2026-10-10)

| Metric | Baseline Value | Source | What It Actually Measures |
| :--- | :---: | :--- | :--- |
| **npm Downloads (7 Days)** | **495** | `api.npmjs.org` | Total package download requests via npm/pnpm/yarn (activity count, not unique users). |
| **npm Downloads (30 Days)** | **495** | `api.npmjs.org` | Cumulative download requests across the past month (activity count, not unique users). |
| **GitHub Stars** | **1** | GitHub API | Repository bookmarks by individual GitHub users. |
| **GitHub Forks** | **0** | GitHub API | Copies created by external developers. |
| **Open Issues** | **5** | GitHub API | Curated roadmap items ([#1 GraphQL](https://github.com/mohsami632-dotcom/typeshift/issues/1), [#2 SQL](https://github.com/mohsami632-dotcom/typeshift/issues/2), [#3 Watch](https://github.com/mohsami632-dotcom/typeshift/issues/3), [#4 Keywords](https://github.com/mohsami632-dotcom/typeshift/issues/4), [#5 YAML](https://github.com/mohsami632-dotcom/typeshift/issues/5)). |
| **Open Pull Requests** | **0** | GitHub API | Active community contributions. |
| **Latest Release** | **v0.2.0** | GitHub API | Current verified stable release with OpenAPI 3.1 support. |
| **Repo Views (14 Days)** | **8 (1 unique)** | GitHub Traffic | Direct browser page visits to the repository. |
| **Repo Clones (14 Days)** | **290 (81 uniques)** | GitHub Traffic | Total Git clone and fetch operations over rolling 14 days (activity count, not unique users). |

---

## 3. How to Interpret Metrics Honestly

To make sound engineering and community decisions, maintainers must distinguish vanity numbers from genuine adoption:

- **npm downloads and Git clones are activity counts, NOT unique users**: npm download counts and GitHub clone counts represent the total number of request/clone events recorded by registries and servers. They do not measure distinct human users, nor does the data distinguish between automated processes and human developers.
- **GitHub stars are NOT usage**: A star indicates that someone found the concept interesting or bookmarked it for later. It does not mean they installed it or used it in production.
- **Genuine adoption signals**:
  1. **User-reported issues**: Strangers reporting edge cases in their real schemas.
  2. **Community Pull Requests**: Developers contributing bug fixes or adapters.
  3. **Discussions / Questions**: Developers asking how to integrate typeshift into their monorepo or build pipelines.
  4. **Direct dependencies**: Public `package.json` files on GitHub declaring `@mohsami/typeshift`.

---

## 4. Manual Verification via GitHub Insights

If you ever run the script on a machine without GitHub CLI access, you can view the private traffic metrics manually in your browser:

1. Navigate to: [https://github.com/mohsami632-dotcom/typeshift/pulse](https://github.com/mohsami632-dotcom/typeshift/pulse)
2. In the repository navigation, click **Insights** (top tab next to Settings).
3. In the left sidebar:
   - Click **Traffic** to view the interactive 14-day charts for **Visitors** (views & unique visitors) and **Git clones**.
   - Click **Referring sites** to see where incoming visitors found your link (e.g. Hacker News, Reddit, Google).
   - Click **Popular content** to see which files (README, examples) visitors view most frequently.
