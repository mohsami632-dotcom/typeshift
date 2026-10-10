# typeshift Launch Assets & Adoption Kit

This directory contains executable tools, demonstration scripts, worksheets, and outreach guides prepared for the public launch of **typeshift v0.2.0**.

---

## Directory Contents

| File / Folder | Purpose |
| :--- | :--- |
| **[`demo/run-demo.js`](./demo/run-demo.js)** | Timed 45-second terminal demo runner using Node.js and the published `@mohsami/typeshift@0.2.0` package. |
| **[`demo/run-demo.ps1`](./demo/run-demo.ps1)** | Native Windows PowerShell interactive terminal demo runner. |
| **[`demo/RECORDING-GUIDE.md`](./demo/RECORDING-GUIDE.md)** | Step-by-step instructions to record the terminal demo using built-in Windows Snipping Tool (`Win + Shift + R`), Xbox Game Bar, or FFmpeg. |
| **[`show-hn-worksheet.md`](./show-hn-worksheet.md)** | Show HN submission worksheet with official guidelines, talking points, honest motivation prompts, live facts, and Q&A notes. |
| **[`track-adoption.js`](./track-adoption.js)** | Single-command adoption tracking script querying official npm and GitHub APIs with zero external dependencies. |
| **[`adoption-tracker.md`](./adoption-tracker.md)** | Usage guide for `track-adoption.js`, baseline metric analysis, and manual GitHub Insights navigation. |
| **[`first-users-plan.md`](./first-users-plan.md)** | Respectful 7-day developer outreach plan, manual submission steps, community norms, and feedback triaging templates. |
| **[`metrics/`](./metrics/)** | Historical tracking data: daily JSON snapshots (`metrics/snapshots/`) and rolling CSV (`metrics/history.csv`). |
| **[`media/`](./media/)** | Directory designated for local video/GIF screen recordings (e.g. `typeshift-demo.mp4`). Large media files are excluded from Git to keep repository size lean. |

---

## Quick Reference Commands

### 1. Run the Terminal Demo
```powershell
node launch-assets/demo/run-demo.js
# Or in PowerShell:
.\launch-assets\demo\run-demo.ps1
```

### 2. Record the Demo on Windows
1. Press **`Win + Shift + R`** (Windows Snipping Tool Video Mode).
2. Select the terminal window.
3. Run `node launch-assets/demo/run-demo.js`.
4. Stop recording when finished and save to `launch-assets/media/typeshift-demo.mp4`.

### 3. Track Adoption Metrics
```powershell
node launch-assets/track-adoption.js
```
Fetches verified data from `api.npmjs.org` and GitHub, outputs a summary table, and updates `launch-assets/metrics/history.csv`.
