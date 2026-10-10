# First Real Users — 7-Day Respectful Outreach Plan

This guide outlines a sustainable, developer-centric launch plan for **typeshift**. It focuses on technical depth, honest communication, and genuine curiosity rather than promotional marketing or artificial engagement.

---

## 1. Core Principles for Developer Outreach

- **No Artificial Engagement**: Never ask friends, colleagues, or online groups to upvote, star, or comment. Community platforms (especially Hacker News and Reddit) employ sophisticated voting-ring detection algorithms that will shadowban or heavily penalize posts that receive artificial votes.
- **Curiosity Over Promotion**: Approach every developer interaction as a learning opportunity. You are looking for honest feedback on compiler edge cases and developer experience, not vanity metrics.
- **Transparent Boundaries**: Be upfront about what typeshift does today (v0.2.0: TypeScript, JSON Schema, Zod, OpenAPI `components.schemas` in JSON) and what is planned for future milestones (GraphQL, SQL, native YAML).
- **Be Available**: When you share something publicly, plan to stay at your keyboard for the first 2 hours to answer questions, discuss design trade-offs, and thank people for their time.

---

## 2. Step-by-Step Manual Show HN Submission Guide

### Step 1: Complete Your Story
Open `launch-assets/show-hn-worksheet.md` and take 10 minutes to fill out Section 2 (*"Why I Personally Built It"*) in your own natural voice.

### Step 2: Optimal Timing
Submit on a **Tuesday, Wednesday, or Thursday morning between 8:00 AM and 10:00 AM US Eastern Time (12:00–14:00 UTC)**. This coincides with peak active hours on Hacker News.

### Step 3: Submitting on Hacker News
1. Navigate to: [https://news.ycombinator.com/submit](https://news.ycombinator.com/submit)
2. **Title**:
   ```text
   Show HN: typeshift – Bidirectional schema compiler with information-loss diagnostics
   ```
3. **URL**:
   ```text
   https://github.com/mohsami632-dotcom/typeshift
   ```
4. **Text**: Leave blank when submitting a URL on Hacker News.
5. Click **Submit**.

### Step 4: The Crucial First Comment (Immediate Follow-Up)
As soon as your submission appears on Hacker News:
1. Click the comments link on your submission.
2. Post your top-level comment containing your personal story and technical walkthrough (structured using the outline in `launch-assets/show-hn-worksheet.md`).
3. Include the single copy-paste pipe command so developers can test it in their own terminal in 10 seconds:
   ```bash
   echo 'export interface User { id: string; name: string; age?: number; }' | npx @mohsami/typeshift convert --from ts --to json-schema
   ```

---

## 3. Sharing in Specific Developer Communities

Each developer community has distinct norms and moderation policies. Always review a subreddit's sidebar rules before posting.

### A. Reddit `r/typescript` (~200k members)
- **Rules Check**: Highly technical community. Open-source tool announcements are welcomed only if they focus on TypeScript Compiler API internals, AST parsing, or structural type system nuances.
- **Angle**: *"Building a 2N schema compiler for TypeScript interfaces using the official TypeScript Compiler API"*.
- **Focus**: Explain how typeshift uses `ts.createSourceFile` to parse interfaces without custom parsers, and how it detects unrepresentable runtime constraints (regex, numeric bounds) when generating static types.

### B. Reddit `r/node` (~150k members)
- **Rules Check**: Focuses on Node.js backend development, CLI tools, and runtime performance.
- **Angle**: *"CLI schema compiler with zero-file shell piping and CI exit-code enforcement"*.
- **Focus**: Highlight terminal piping (`stdin`/`stdout`), fast startup, and how `--loss-policy error` (exit code 2) prevents contract drift in automated GitHub Actions pipelines.

### C. Reddit `r/webdev` (~2M members)
- **Rules Check**: Strictly enforces **"Showoff Saturday"**. Any personal or open-source tool posted Sunday through Friday will be removed by moderators.
- **Timing**: Post only on Saturday morning.

---

## 4. How to Invite Technical Feedback (Without Asking for Stars)

Developers appreciate specific, thoughtful questions rather than generic calls to action. When writing posts or closing comments, use these prompt questions:

1. *"What schema conversions currently cause the most maintenance friction in your stack (e.g. Zod to OpenAPI, or JSON Schema to TS)?"*
2. *"How does your team currently catch cases where a runtime validation constraint (like a regex or minimum bound) is silently lost when converted to TypeScript?"*
3. *"For our upcoming v0.3.0 release, would your workflows benefit more from native OpenAPI YAML parsing or a GraphQL SDL adapter?"*

---

## 5. How to Handle Bug Reports and Turn Feedback into GitHub Issues

When an external developer reports an unexpected output or edge case in a comment thread:

1. **Acknowledge graciously**:  
   *"Thank you for catching this edge case! You're completely right — here is what happens under the hood..."*
2. **Reproduce with a minimal command**:  
   Test their snippet with typeshift locally and isolate the AST node that caused the issue.
3. **Open a tracked GitHub Issue**:  
   Create an issue using the `.github/ISSUE_TEMPLATE/bug_report.yml` template, quoting the user's reproduction snippet.
4. **Follow up in the thread**:  
   Reply with a link to the issue: *"I've created tracking issue #X to handle this. If you'd like to follow along or test the fix when ready, you can subscribe to the issue here: [link]"*.

---

## 6. The 7-Day Launch Schedule (30–45 Mins Daily)

| Day | Focus | Action Items |
| :---: | :--- | :--- |
| **Day 1** | **Preparation** | • Review `launch-assets/show-hn-worksheet.md`.<br>• Write your honest story into Section 2 of the worksheet.<br>• Run `node launch-assets/track-adoption.js` to log your Day 1 baseline. |
| **Day 2** | **Demo Recording** | • Follow `launch-assets/demo/RECORDING-GUIDE.md`.<br>• Use Windows Snipping Tool (`Win + Shift + R`) to record `node launch-assets/demo/run-demo.js`.<br>• Save the resulting video to `launch-assets/media/typeshift-demo.mp4`. |
| **Day 3** | **Show HN Submission** | • Submit your Show HN on Hacker News between 8:00 AM – 10:00 AM EST.<br>• Post your top-level comment immediately.<br>• Stay active for 2 hours answering questions and taking technical notes. |
| **Day 4** | **Feedback Triaging** | • Review comments from Hacker News.<br>• Open GitHub issues for any valid bugs or requested format edge cases.<br>• Thank contributors who shared thoughtful critiques. |
| **Day 5** | **TypeScript Community** | • Post your technical deep-dive on `r/typescript` focusing on TypeScript Compiler API integration.<br>• Answer questions about AST mapping and capability manifests. |
| **Day 6** | **Adoption Check** | • Run `node launch-assets/track-adoption.js` to inspect 48-hour download trends and visitor referrals in GitHub Insights.<br>• Label new community-reported issues as `good first issue` or `help wanted`. |
| **Day 7** | **Roadmap Prioritization** | • Review all collected feedback against the v0.3.0 roadmap ([#1 GraphQL](https://github.com/mohsami632-dotcom/typeshift/issues/1), [#3 Watch Mode](https://github.com/mohsami632-dotcom/typeshift/issues/3), [#5 OpenAPI YAML](https://github.com/mohsami632-dotcom/typeshift/issues/5)).<br>• Commit to the next milestone based on genuine developer demand. |
