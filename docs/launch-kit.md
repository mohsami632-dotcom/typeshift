# typeshift Launch Kit & Adoption Playbook

This document contains ready-to-use launch materials, demonstration scripts, copy-paste snippets, and community guidelines for introducing **typeshift** to developers.

> **Important**: All external announcements, community posts, and outreach must be manually reviewed and approved. Do not post or distribute unsolicited messages.

---

## 1. Concise Project Introduction

**typeshift** is an open-source, developer-first schema compiler for bidirectional, loss-aware conversion between schema definition formats: TypeScript, JSON Schema, Zod, and OpenAPI 3.1.

### The Problem It Solves
Modern web and backend systems maintain schemas across multiple layers (TypeScript compile-time interfaces, JSON Schema API contracts, Zod runtime validators, and OpenAPI specifications). Managing multiple point-to-point converters scales quadratically ($N \times (N-1)$), and converting between formats with fundamentally mismatched expressiveness (such as runtime validation bounds vs. static types) can easily cause validation constraints to be lost unnoticed.

### Why typeshift is Different
- **Canonical Compiler Model ($2N$)**: All formats parse into and generate from a shared Intermediate Representation (SchemaIR).
- **Explicit Information-Loss Diagnostics**: Inspects source constraints against target capabilities and surfaces exact dot-paths of dropped rules.
- **CI Quality Enforcement**: `--loss-policy error` immediately fails automated pipelines (exit code `2`) if unauthorized loss occurs.
- **Deterministic Output**: Sorted properties and standardized formatting guarantee clean git diffs with zero non-semantic churn.
- **Focused Dependency Design**: Integrates directly with the official TypeScript Compiler API for AST parsing and Commander for the CLI, keeping core compilation self-contained.

---

## 2. 60-Second Demo Script

This script is ideal for a terminal screencast, GIF, or live demonstration:

| Time | Action | Terminal Command | What the Audience Sees |
| :--- | :--- | :--- | :--- |
| **0:00 - 0:10** | Run CLI without installing | `npx @mohsami/typeshift list --detailed` | Shows registered formats (`typescript`, `json-schema`, `zod`, `openapi`) and their native capability matrices. |
| **0:10 - 0:25** | One-line conversion via shell pipe | `echo 'export interface User { id: string; email: string; }' \| npx @mohsami/typeshift convert --from ts --to json-schema` | Immediately prints deterministic Draft-07 JSON Schema to stdout. |
| **0:25 - 0:40** | OpenAPI 3.1 to Zod | `npx @mohsami/typeshift convert petstore.openapi.json --to zod` | Compiles OpenAPI `components.schemas` into runtime Zod validators with `.min()`, `.max()`, and `.optional()`. |
| **0:40 - 0:50** | Show Information-Loss Diagnostics | `npx @mohsami/typeshift convert account.json --to typescript` | TypeScript interface is generated, but `stderr` highlights dropped constraints (`minimum: 18`, `pattern: "..."`). |
| **0:50 - 1:00** | Strict CI enforcement | `npx @mohsami/typeshift convert account.json --to typescript --loss-policy error` | Process cleanly aborts with exit code `2` to prevent silent drift in CI. |

---

## 3. Three Copy-Paste Examples

### Example A: Pipe a TypeScript Interface to JSON Schema
```bash
echo 'export interface Order { id: string; total: number; isPaid?: boolean; }' | npx @mohsami/typeshift convert --from ts --to json-schema
```

### Example B: Compile OpenAPI 3.1 Models to Runtime Zod Validators
```bash
# Save a minimal OpenAPI document:
cat << 'EOF' > api.openapi.json
{
  "openapi": "3.1.0",
  "info": { "title": "Store API", "version": "1.0.0" },
  "components": {
    "schemas": {
      "Item": {
        "type": "object",
        "properties": {
          "sku": { "type": "string", "minLength": 3 },
          "price": { "type": "number", "minimum": 0 }
        },
        "required": ["sku", "price"]
      }
    }
  }
}
EOF

# Convert to Zod:
npx @mohsami/typeshift convert api.openapi.json --to zod -o item.zod.ts
```

### Example C: Enforce Zero Constraint Drift in CI
```bash
# Fails with exit code 2 if any validation constraint would be silently dropped:
npx @mohsami/typeshift convert contracts/user.json --to typescript --loss-policy error
```

---

## 4. Short GitHub Release Announcement (for v0.2.0)

```markdown
### 🚀 typeshift v0.2.0 — OpenAPI 3.1 Support & Comprehensive Compiler Matrix

We are excited to announce `v0.2.0` of **typeshift**, a developer-first schema compiler for bidirectional, loss-aware conversion across schema ecosystems.

#### Key Highlights:
- **OpenAPI 3.1 Format Adapter**: Full bidirectional compilation of OpenAPI 3.1 data models (`components.schemas`), reference resolution (`#/components/schemas/<Name>`), `readOnly` attributes, and constraint mappings.
- **Conversion Matrix & Benchmarks**: Verified 6-way conversion matrix across TypeScript, JSON Schema, Zod, and OpenAPI with sub-50ms execution times on schemas with hundreds of properties.
- **Strict Loss Policies**: Verified exit codes (`2` on unauthorized information loss) for automated CI quality gates.
- **Format Auto-Detection**: Instant recognition of compound extensions (`.openapi.json`, `.zod.ts`) and OpenAPI document content sniffing.

Run instantly with npx:
```bash
npx @mohsami/typeshift list --detailed
```

Full release notes: https://github.com/mohsami632-dotcom/typeshift/releases/tag/v0.2.0
```

---

## 5. Draft Developer-Community Announcement

### Title Ideas:
- *Show HN: typeshift – A bidirectional schema compiler with information-loss diagnostics*
- *typeshift: Bidirectional schema conversion between TypeScript, JSON Schema, Zod, and OpenAPI*
- *We built a schema compiler that tells you when validation rules are dropped*

### Post Body:

```markdown
Hi everyone,

Like many teams, we maintain data contracts across multiple boundaries:
- TypeScript interfaces for application code and IDE autocomplete.
- JSON Schema for event payloads and database contracts.
- Zod schemas for runtime request validation.
- OpenAPI 3.1 specifications for public API consumers.

Keeping these definitions in sync by hand is tedious. Furthermore, converting schemas across format boundaries often faces feature mismatches: static TypeScript interfaces, for instance, cannot natively enforce runtime regex patterns or numeric boundaries that exist in JSON Schema or Zod. Without explicit visibility, it is easy for developers to lose track of which constraints are preserved.

To solve this, we built **typeshift** (https://github.com/mohsami632-dotcom/typeshift):

1. **A Compiler Architecture ($2N$ Scaling)**: Instead of writing $N \times (N-1)$ converters, all formats parse into and generate from a shared Intermediate Representation (SchemaIR). Adding an adapter requires writing only 2 functions: `parse()` and `generate()`.
2. **Explicit Loss Diagnostics**: When converting a richer schema (e.g. JSON Schema with runtime bounds) into compile-time TypeScript, typeshift explicitly highlights constraints that cannot be natively represented in the target format (e.g. `[User.age] Constraint "minimum" (value: 18) dropped`).
3. **CI Quality Gates**: Running with `--loss-policy error` aborts conversion and exits with code 2 if constraints are dropped, preventing unintended schema divergence in CI.
4. **Deterministic Generation**: Normalized indentation and alphabetically sorted keys ensure clean, predictable git diffs.
5. **Focused Dependencies**: Integrates directly with the official TypeScript Compiler API for robust type analysis and Commander for the CLI, keeping core compilation self-contained.

You can try it directly without installing anything:
```bash
npx @mohsami/typeshift --help
```

Or test a quick conversion:
```bash
echo 'export interface User { id: string; email: string; }' | npx @mohsami/typeshift convert --from ts --to json-schema
```

We currently support TypeScript, JSON Schema, Zod, and OpenAPI 3.1 component schemas. Adapters for GraphQL SDL and SQL DDL are on the roadmap.

The project is 100% open source under the MIT license:
GitHub: https://github.com/mohsami632-dotcom/typeshift
npm: https://www.npmjs.com/package/@mohsami/typeshift

We'd love your feedback on the architecture, developer experience, and which adapters you'd like to see next!
```

---

## 6. Community Sharing Channels & Rule Compliance

| Platform | Channel / Subreddit | Guidelines & Rules Checked | Recommended Approach |
| :--- | :--- | :--- | :--- |
| **Hacker News** | `Show HN` | - Must be something you created.<br>- Must have a working implementation.<br>- No sensationalized or marketing-heavy titles.<br>- Must link directly to project or repo. | Post during weekday morning EST (8:00–10:00 AM). Stay active in comments to answer technical architecture questions. |
| **Reddit** | `r/typescript` (200k+ devs) | - Must be relevant to TypeScript.<br>- Open-source tools welcomed if technically detailed.<br>- Must not spam or post purely promotional links. | Focus on the TypeScript compiler API AST integration, type mapping, and lossless conversion. |
| **Reddit** | `r/node` (150k+ devs) | - Must relate to Node.js backend/CLI development.<br>- Transparent about open-source status. | Emphasize CLI piping, Node 20+ runtime compatibility, and CI integration. |
| **Reddit** | `r/webdev` | - "Showoff Saturday" only for personal/open-source projects. | Post only on Saturday, focusing on syncing frontend TypeScript with backend Zod/JSON Schema. |
| **Dev.to / Hashnode** | Tagged `#typescript`, `#opensource`, `#webdev` | - Educational content encouraged.<br>- Avoid pure links; provide technical walkthroughs. | Publish a tutorial: *"Why Point-to-Point Schema Converters Drop Constraints (And How to Fix It)"*. |
| **Lobste.rs** | Lobsters tags: `typescript`, `show`, `api` | - High bar for technical substance.<br>- Self-posts must be tagged `[show]` and disclosed. | Only submit after early community feedback; highlight compiler IR architecture. |

---

## 7. Practical 30-Day Adoption Plan

### Phase 1: Days 1–7 (Early Peer Review & Discovery Hardening)
- [x] Verify published package on npm registry (`0.2.0`).
- [x] Add GitHub topics (`typescript`, `json-schema`, `zod`, `openapi`, `schema-compiler`).
- [x] Create comprehensive committed examples (`examples/01` through `examples/05`).
- Share with 3–5 trusted senior TypeScript/Node.js colleagues for candid feedback on CLI ergonomics.
- Address any UX friction found during peer testing.

### Phase 2: Days 8–15 (Developer Community Introduction)
- Submit a genuine **Show HN** post on Hacker News.
- Post a technical overview to `r/typescript` focusing on SchemaIR and constraint preservation.
- Monitor issues and Discussions; respond to questions within 24 hours.

### Phase 3: Days 16–23 (Technical Content & Deep Dives)
- Write an in-depth technical article on Dev.to: *"The $2N$ Compiler Model: Converting Schemas Without Quadratic Chaos"*.
- Create a short terminal demo GIF/video using [vhs](https://github.com/charmbracelet/vhs) demonstrating the 60-second demo script.
- Link the demo video in the README.

### Phase 4: Days 24–30 (Contributor Community Activation)
- Promote the 5 curated roadmap issues ([#1 GraphQL](https://github.com/mohsami632-dotcom/typeshift/issues/1), [#2 SQL DDL](https://github.com/mohsami632-dotcom/typeshift/issues/2), [#3 Watch Mode](https://github.com/mohsami632-dotcom/typeshift/issues/3), [#4 Keywords](https://github.com/mohsami632-dotcom/typeshift/issues/4), [#5 OpenAPI YAML](https://github.com/mohsami632-dotcom/typeshift/issues/5)) on community Discord/Slack channels (e.g. TypeScript Community Discord).
- Pair with first external contributors on pull requests.
- Plan the `v0.3.0` feature scope based on community usage feedback.
