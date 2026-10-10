#!/usr/bin/env node

/**
 * typeshift — Official Adoption & Activity Tracker
 * 
 * Collects verifiable metrics from official public APIs:
 * - npm Registry Downloads API (last-week, last-month)
 * - GitHub Repository API (stars, forks, open issues, open PRs, releases)
 * - GitHub Traffic API (views, clones) when authorized via GitHub CLI
 * 
 * Guarantees:
 * - Zero third-party dependencies (uses Node.js 20+ built-ins).
 * - Never fabricates measurements; explicitly labels unavailable metrics.
 * - Saves dated snapshots in JSON and rolling CSV for historical tracking.
 * - Never stores or logs authentication tokens or secrets.
 */

import { execSync } from 'node:child_process';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const METRICS_DIR = resolve(__dirname, 'metrics');
const SNAPSHOTS_DIR = resolve(METRICS_DIR, 'snapshots');
const CSV_PATH = resolve(METRICS_DIR, 'history.csv');

const PACKAGE_NAME = '@mohsami/typeshift';
const GITHUB_REPO = 'mohsami632-dotcom/typeshift';

// Ensure directories exist
mkdirSync(SNAPSHOTS_DIR, { recursive: true });

async function fetchJson(url) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'typeshift-adoption-tracker/1.0.0',
        Accept: 'application/json',
      },
    });
    if (!res.ok) {
      return { error: `HTTP ${res.status}: ${res.statusText}`, available: false };
    }
    const data = await res.json();
    return { data, available: true };
  } catch (err) {
    return { error: err.message, available: false };
  }
}

function runGhApi(endpoint) {
  try {
    const output = execSync(`gh api ${endpoint}`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return { data: JSON.parse(output), available: true };
  } catch {
    return { error: 'Requires authenticated GitHub CLI (gh auth login)', available: false };
  }
}

async function collectMetrics() {
  const timestamp = new Date().toISOString();
  const dateStr = timestamp.split('T')[0];

  console.log(`\n\x1b[1m\x1b[36mCollecting verifiable adoption metrics for ${PACKAGE_NAME}...\x1b[0m`);
  console.log(`Timestamp: ${timestamp}\n`);

  // 1. npm Downloads (Official npm Downloads API)
  const npmWeekRes = await fetchJson(`https://api.npmjs.org/downloads/point/last-week/${PACKAGE_NAME}`);
  const npmMonthRes = await fetchJson(`https://api.npmjs.org/downloads/point/last-month/${PACKAGE_NAME}`);

  // 2. GitHub Repository Metadata
  let ghRepoRes = runGhApi(`repos/${GITHUB_REPO}`);
  if (!ghRepoRes.available) {
    ghRepoRes = await fetchJson(`https://api.github.com/repos/${GITHUB_REPO}`);
  }

  // 3. GitHub Open Pull Requests
  let ghPullsRes = runGhApi(`repos/${GITHUB_REPO}/pulls?state=open`);
  if (!ghPullsRes.available) {
    ghPullsRes = await fetchJson(`https://api.github.com/repos/${GITHUB_REPO}/pulls?state=open`);
  }

  // 4. GitHub Releases
  let ghReleasesRes = runGhApi(`repos/${GITHUB_REPO}/releases`);
  if (!ghReleasesRes.available) {
    ghReleasesRes = await fetchJson(`https://api.github.com/repos/${GITHUB_REPO}/releases`);
  }

  // 5. GitHub Traffic Views and Clones (Requires GitHub CLI with repo scope)
  const ghViewsRes = runGhApi(`repos/${GITHUB_REPO}/traffic/views`);
  const ghClonesRes = runGhApi(`repos/${GITHUB_REPO}/traffic/clones`);

  // Parse and assemble structured snapshot
  const openPrCount = ghPullsRes.available && Array.isArray(ghPullsRes.data) ? ghPullsRes.data.length : null;
  const totalOpenItems = ghRepoRes.available ? ghRepoRes.data.open_issues_count : null;
  // Note: GitHub open_issues_count includes both issues and PRs.
  const genuineIssuesCount = totalOpenItems !== null && openPrCount !== null ? totalOpenItems - openPrCount : null;

  const latestRelease = ghReleasesRes.available && Array.isArray(ghReleasesRes.data) && ghReleasesRes.data.length > 0
    ? ghReleasesRes.data[0].tag_name
    : null;

  const snapshot = {
    timestamp,
    date: dateStr,
    package: PACKAGE_NAME,
    repository: GITHUB_REPO,
    metrics: {
      npm: {
        downloadsLastWeek: {
          value: npmWeekRes.available ? npmWeekRes.data.downloads : null,
          available: npmWeekRes.available,
          period: npmWeekRes.available ? `${npmWeekRes.data.start} to ${npmWeekRes.data.end}` : null,
          source: 'https://api.npmjs.org/downloads/point/last-week',
          measures: 'Total npm download requests over previous 7 days (includes automated CI/bot installs)',
        },
        downloadsLastMonth: {
          value: npmMonthRes.available ? npmMonthRes.data.downloads : null,
          available: npmMonthRes.available,
          period: npmMonthRes.available ? `${npmMonthRes.data.start} to ${npmMonthRes.data.end}` : null,
          source: 'https://api.npmjs.org/downloads/point/last-month',
          measures: 'Total npm download requests over previous 30 days (includes automated CI/bot installs)',
        },
      },
      github: {
        stars: {
          value: ghRepoRes.available ? ghRepoRes.data.stargazers_count : null,
          available: ghRepoRes.available,
          source: 'GitHub Repository API',
          measures: 'Total GitHub user stars/bookmarks',
        },
        forks: {
          value: ghRepoRes.available ? ghRepoRes.data.forks_count : null,
          available: ghRepoRes.available,
          source: 'GitHub Repository API',
          measures: 'Total repository forks',
        },
        openIssues: {
          value: genuineIssuesCount,
          available: genuineIssuesCount !== null,
          source: 'GitHub Repository API (open_issues minus open_pulls)',
          measures: 'Genuine open issue tickets',
        },
        openPullRequests: {
          value: openPrCount,
          available: openPrCount !== null,
          source: 'GitHub Pull Requests API',
          measures: 'Open community pull requests',
        },
        latestReleaseTag: {
          value: latestRelease,
          available: latestRelease !== null,
          source: 'GitHub Releases API',
          measures: 'Most recent published GitHub release tag',
        },
        trafficViews14d: {
          value: ghViewsRes.available ? ghViewsRes.data.count : null,
          uniques: ghViewsRes.available ? ghViewsRes.data.uniques : null,
          available: ghViewsRes.available,
          source: 'GitHub Traffic API (/traffic/views)',
          measures: 'Repository page views over rolling 14 days',
        },
        trafficClones14d: {
          value: ghClonesRes.available ? ghClonesRes.data.count : null,
          uniques: ghClonesRes.available ? ghClonesRes.data.uniques : null,
          available: ghClonesRes.available,
          source: 'GitHub Traffic API (/traffic/clones)',
          measures: 'Git clone operations over rolling 14 days',
        },
      },
    },
  };

  // Save dated JSON snapshot
  const snapshotFile = resolve(SNAPSHOTS_DIR, `${dateStr}.json`);
  writeFileSync(snapshotFile, JSON.stringify(snapshot, null, 2), 'utf8');

  // Update rolling CSV
  updateCsvHistory(snapshot);

  // Print Terminal Summary
  printReportTable(snapshot, snapshotFile);
}

function updateCsvHistory(snapshot) {
  const headers = [
    'date',
    'timestamp',
    'npm_downloads_7d',
    'npm_downloads_30d',
    'github_stars',
    'github_forks',
    'github_open_issues',
    'github_open_prs',
    'views_count_14d',
    'views_uniques_14d',
    'clones_count_14d',
    'clones_uniques_14d',
  ];

  const m = snapshot.metrics;
  const row = [
    snapshot.date,
    snapshot.timestamp,
    m.npm.downloadsLastWeek.value ?? 'UNAVAILABLE',
    m.npm.downloadsLastMonth.value ?? 'UNAVAILABLE',
    m.github.stars.value ?? 'UNAVAILABLE',
    m.github.forks.value ?? 'UNAVAILABLE',
    m.github.openIssues.value ?? 'UNAVAILABLE',
    m.github.openPullRequests.value ?? 'UNAVAILABLE',
    m.github.trafficViews14d.value ?? 'UNAVAILABLE',
    m.github.trafficViews14d.uniques ?? 'UNAVAILABLE',
    m.github.trafficClones14d.value ?? 'UNAVAILABLE',
    m.github.trafficClones14d.uniques ?? 'UNAVAILABLE',
  ].join(',');

  if (!existsSync(CSV_PATH)) {
    writeFileSync(CSV_PATH, `${headers.join(',')}\n${row}\n`, 'utf8');
  } else {
    const existing = readFileSync(CSV_PATH, 'utf8').trim().split('\n');
    // If today's date already exists, update today's line
    const filtered = existing.filter((line, idx) => idx === 0 || !line.startsWith(`${snapshot.date},`));
    filtered.push(row);
    writeFileSync(CSV_PATH, `${filtered.join('\n')}\n`, 'utf8');
  }
}

function printReportTable(snapshot, snapshotFile) {
  const m = snapshot.metrics;
  console.log('\x1b[1m┌────────────────────────────────────────┬─────────────────────┬──────────────────────────┐\x1b[0m');
  console.log('\x1b[1m│ Metric                                 │ Value               │ Status & Source          │\x1b[0m');
  console.log('\x1b[1m├────────────────────────────────────────┼─────────────────────┼──────────────────────────┤\x1b[0m');

  const rows = [
    ['npm Downloads (Last 7 Days)', m.npm.downloadsLastWeek.value ?? 'N/A', m.npm.downloadsLastWeek.available ? 'Verified (api.npmjs.org)' : 'Unavailable'],
    ['npm Downloads (Last 30 Days)', m.npm.downloadsLastMonth.value ?? 'N/A', m.npm.downloadsLastMonth.available ? 'Verified (api.npmjs.org)' : 'Unavailable'],
    ['GitHub Stars', m.github.stars.value ?? 'N/A', m.github.stars.available ? 'Verified (GitHub API)' : 'Unavailable'],
    ['GitHub Forks', m.github.forks.value ?? 'N/A', m.github.forks.available ? 'Verified (GitHub API)' : 'Unavailable'],
    ['Open Issue Tickets', m.github.openIssues.value ?? 'N/A', m.github.openIssues.available ? 'Verified (GitHub API)' : 'Unavailable'],
    ['Open Pull Requests', m.github.openPullRequests.value ?? 'N/A', m.github.openPullRequests.available ? 'Verified (GitHub API)' : 'Unavailable'],
    ['Latest Release', m.github.latestReleaseTag.value ?? 'N/A', m.github.latestReleaseTag.available ? 'Verified (GitHub API)' : 'Unavailable'],
    ['Repo Views (14d count / uniques)', m.github.trafficViews14d.available ? `${m.github.trafficViews14d.value} / ${m.github.trafficViews14d.uniques}` : 'N/A', m.github.trafficViews14d.available ? 'Verified (GitHub Traffic)' : 'Unavailable (Needs auth)'],
    ['Repo Clones (14d count / uniques)', m.github.trafficClones14d.available ? `${m.github.trafficClones14d.value} / ${m.github.trafficClones14d.uniques}` : 'N/A', m.github.trafficClones14d.available ? 'Verified (GitHub Traffic)' : 'Unavailable (Needs auth)'],
  ];

  for (const [name, val, status] of rows) {
    console.log(`│ ${name.padEnd(38)} │ ${String(val).padEnd(19)} │ ${status.padEnd(24)} │`);
  }
  console.log('\x1b[1m└────────────────────────────────────────┴─────────────────────┴──────────────────────────┘\x1b[0m\n');

  console.log('\x1b[1m\x1b[33mHonest Metrics Interpretation Notes:\x1b[0m');
  console.log('• \x1b[1mnpm Downloads != Active Users\x1b[0m: npm download counts include automated CI runners, Dependabot, and build mirrors.');
  console.log('• \x1b[1mGitHub Stars != Adoption\x1b[0m: Stars reflect casual curiosity or bookmarks. Real adoption is measured by issues, PRs, and users.');
  console.log('• \x1b[1mTraffic metrics\x1b[0m: Cover the last 14 days and require maintainer authentication.');
  console.log(`\nSnapshot saved: \x1b[32m${snapshotFile}\x1b[0m`);
  console.log(`History CSV updated: \x1b[32m${CSV_PATH}\x1b[0m\n`);
}

collectMetrics().catch((err) => {
  console.error('\x1b[31mFailed to collect metrics:\x1b[0m', err);
  process.exit(1);
});
