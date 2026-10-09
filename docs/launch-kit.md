# typeshift Launch Kit & Adoption Playbook

This document contains ready-to-use launch materials, demonstration scripts, copy-paste snippets, a maintainer response guide, and community guidelines for introducing **typeshift** to developers.

> **Important**: All external announcements, community posts, and outreach must be manually reviewed and approved. Do not post or distribute unsolicited messages.

---

## 1. Concise Project Introduction

**typeshift** is an open-source schema compiler for bidirectional, loss-aware conversion across schema definition formats: TypeScript, JSON Schema, Zod, and OpenAPI 3.1.

### The Problem It Solves
When managing schemas across multiple representations (TypeScript compile-time interfaces, JSON Schema API contracts, Zod runtime validators, and OpenAPI specifications), developers face two practical challenges: configuring separate point-to-point conversion paths between each format pair ($N \times (N-1)$ scaling), and managing constraint compatibility when converting between languages with different expressiveness (such as runtime validation bounds in JSON Schema vs. compile-time static types in TypeScript).

### Why typeshift is Different
- **Canonical Compiler Model ($2N$)**: All formats parse into and generate from a shared Intermediate Representation (`SchemaIR`). Adding a format requires implementing only 2 functions: `parse()` and `generate()`.
- **Explicit Information-Loss Diagnostics**: Compares source constraints against target format capabilities and surfaces exact dot-paths of unrepresentable rules (e.g. dropped regex patterns or numeric boundaries).
- **CI Quality Enforcement**: `--loss-policy error` immediately fails automated pipelines (exit code `2`) if unauthorized loss occurs.
- **Deterministic Output**: Alphabetically sorted keys and normalized formatting provide deterministic code generation to help reduce non-semantic git diff churn.
- **Focused Dependency Architecture**: Directly leverages the official TypeScript Compiler API (`typescript`) for AST parsing and `commander` for CLI execution, keeping the intermediate representation and transformation engine self-contained.

---

## 2. 60-Second Demo Script

This script is ideal for a terminal screencast, live presentation, or interactive walkthrough.

### Option A: From a Cloned Repository (Using Committed Examples)

Run from the root of the repository:

```bash
# 1. Discover registered format adapters and capabilities
npx @mohsami/typeshift list --detailed

# 2. Pipe TypeScript directly to JSON Schema (zero files created)
echo 'export interface User { id: string; email: string; }' | npx @mohsami/typeshift convert --from ts --to json-schema

# 3. Convert OpenAPI 3.1 component schemas to runtime Zod validators
npx @mohsami/typeshift convert examples/04-openapi-to-typescript/petstore.openapi.json --to zod

# 4. Convert JSON Schema with validation bounds into TypeScript (surfaces loss warnings)
npx @mohsami/typeshift convert examples/03-json-schema-to-typescript/account.json --to typescript

# 5. Strict CI Quality Gate: aborts with exit code 2 when loss is detected
npx @mohsami/typeshift convert examples/05-loss-policy-enforcement/schema-with-constraints.json --to typescript --loss-policy error
# Exit code: 2
```

### Option B: Standalone in Any Directory (Zero Assumptions)

Run in any clean directory without cloning or creating test files:

**On Linux / macOS / Bash:**
```bash
# 1. Instant pipe: TypeScript to JSON Schema
echo 'export interface User { id: string; email: string; }' | npx @mohsami/typeshift convert --from ts --to json-schema

# 2. Instant pipe with strict CI loss enforcement (exits with code 2)
echo '{"$schema":"http://json-schema.org/draft-07/schema#","title":"User","type":"object","properties":{"age":{"type":"number","minimum":18}},"required":["age"]}' | npx @mohsami/typeshift convert --from json-schema --to typescript --loss-policy error
```

**On Windows (PowerShell):**
```powershell
# 1. Instant pipe: TypeScript to JSON Schema
echo 'export interface User { id: string; email: string; }' | npx @mohsami/typeshift convert --from ts --to json-schema

# 2. Instant pipe with strict CI loss enforcement (exits with code 2)
echo '{"$schema":"http://json-schema.org/draft-07/schema#","title":"User","type":"object","properties":{"age":{"type":"number","minimum":18}},"required":["age"]}' | npx @mohsami/typeshift convert --from json-schema --to typescript --loss-policy error
$LASTEXITCODE # Returns 2
```

---

## 3. Three Copy-Paste Examples

### Example A: Pipe a TypeScript Interface to JSON Schema
```bash
echo 'export interface Order { id: string; total: number; isPaid?: boolean; }' | npx @mohsami/typeshift convert --from ts --to json-schema
```

### Example B: Compile OpenAPI 3.1 Models to Runtime Zod Validators

Create a sample OpenAPI file:
```json
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
```
Save as `api.openapi.json` and compile:
```bash
npx @mohsami/typeshift convert api.openapi.json --to zod -o item.zod.ts
```

### Example C: Enforce Zero Constraint Drift in CI
```bash
# Runs conversion with strict error policy; exits with code 2 if constraints are dropped:
echo '{"$schema":"http://json-schema.org/draft-07/schema#","title":"User","type":"object","properties":{"age":{"type":"number","minimum":18}},"required":["age"]}' | npx @mohsami/typeshift convert --from json-schema --to typescript --loss-policy error
```

---

## 4. Short GitHub Release Announcement (for v0.2.0)

```markdown
### 🚀 typeshift v0.2.0 — OpenAPI 3.1 Support & Comprehensive Compiler Matrix

We are excited to announce `v0.2.0` of **typeshift**, an open-source schema compiler for bidirectional, loss-aware conversion across TypeScript, JSON Schema, Zod, and OpenAPI 3.1.

#### Key Highlights:
- **OpenAPI 3.1 Format Adapter**: Bidirectional compilation of OpenAPI 3.1 component schemas (`components.schemas`), reference resolution (`#/components/schemas/<Name>`), `readOnly` attributes, and constraint mappings.
- **Verified Compiler Matrix**: 12 bidirectional conversion paths across TypeScript, JSON Schema, Zod, and OpenAPI, backed by automated integration tests and benchmark assertions to prevent quadratic scaling regressions.
- **Strict Loss Policies**: Verified exit codes (`2` on unauthorized information loss) for automated CI quality gates.
- **Flexible CLI Execution**: Full shell-pipe support (`echo ... | typeshift convert --from ts --to json-schema`) and compound extension auto-detection (`.openapi.json`, `.zod.ts`).
- **Proven Supply Chain**: Published on npm with SLSA v1 cryptographic build provenance attestations.

Run instantly with npx:
```bash
npx @mohsami/typeshift list --detailed
```

Full release notes: https://github.com/mohsami632-dotcom/typeshift/releases/tag/v0.2.0
```

---

## 5. Announcement Drafts

### Draft 5A: Show HN Submission (Hacker News Format)

```text
Title: Show HN: Typeshift – Bidirectional schema compiler with information-loss diagnostics

URL: https://github.com/mohsami632-dotcom/typeshift

Hi HN,

I built typeshift (https://github.com/mohsami632-dotcom/typeshift), an open-source schema compiler for bidirectional conversion across TypeScript, JSON Schema, Zod, and OpenAPI 3.1.

The problem:
Modern web and backend projects frequently maintain schemas across multiple representations: TypeScript interfaces for application types, Zod schemas for runtime boundary parsing, JSON Schema for contracts and events, and OpenAPI for public documentation.

Maintaining these across format boundaries introduces two challenges:
1. Combinatorial translation maintenance: Supporting N formats with bespoke point-to-point tools requires managing N*(N-1) translation paths with different CLI conventions and configurations.
2. Mismatched format expressiveness: Different schema languages have fundamentally different capabilities. For example, a JSON Schema with numeric boundaries (minimum: 18) or regex patterns cannot fully express those validation constraints in standard compile-time TypeScript interfaces. Without explicit diagnostics, developers may not notice which constraints were dropped during translation.

How typeshift works:
Instead of direct AST-to-AST translation, typeshift uses an intermediate representation (SchemaIR). Each format adapter implements two operations: parsing its syntax into SchemaIR, and generating its syntax from SchemaIR (2N adapters).

Each adapter declares its target capabilities (e.g., TypeScript declares that static interfaces do not enforce runtime regex or numeric bounds). A loss detection engine compares source constraints against target capabilities and surfaces exact dot-paths of dropped rules. In CI, running with `--loss-policy error` aborts conversion with exit code 2 if unrepresentable schema changes are introduced.

Under the hood, typeshift integrates directly with the official TypeScript Compiler API for AST parsing and uses Commander for the CLI.

Try it in your terminal with zero files required:
  echo 'export interface User { id: string; name: string; age?: number; }' | npx @mohsami/typeshift convert --from ts --to json-schema

See how it surfaces dropped constraints when converting a rich schema to TypeScript:
  echo '{"$schema":"http://json-schema.org/draft-07/schema#","title":"Product","type":"object","properties":{"sku":{"type":"string","pattern":"^[A-Z]{3}-\\d{4}$"},"price":{"type":"number","minimum":0}},"required":["sku","price"]}' | npx @mohsami/typeshift convert --from json-schema --to typescript

Output on stderr:
  Information-Loss Diagnostics (2 warnings):
    ! WARNING [Product.sku] Constraint "pattern" (value: "^[A-Z]{3}-\\d{4}$") will be dropped. (pattern constraint)
    ! WARNING [Product.price] Constraint "minimum" (value: 0) will be dropped. (minimum constraint)

Output on stdout:
  // Generated by typeshift — do not edit manually.

  export interface Product {
    sku: string;
    price: number;
  }

You can append `--loss-policy error` to turn these warnings into a build failure (exit code 2) in CI:
  echo '{"$schema":"http://json-schema.org/draft-07/schema#","title":"Product","type":"object","properties":{"sku":{"type":"string","pattern":"^[A-Z]{3}-\\d{4}$"},"price":{"type":"number","minimum":0}},"required":["sku","price"]}' | npx @mohsami/typeshift convert --from json-schema --to typescript --loss-policy error

Current scope:
- Supported: TypeScript interfaces & type aliases, JSON Schema (Draft-07), Zod schemas, and OpenAPI 3.1 component schemas (under components.schemas).
- Not in scope: HTTP API routes under paths are not compiled (typeshift is a schema model compiler, not an RPC/REST client generator).
- OpenAPI input: Currently requires JSON format (.openapi.json or .json). Direct YAML parsing is tracked on our roadmap (issue #5).

Published on npm with SLSA v1 provenance (@mohsami/typeshift). The repository contains 5 committed, runnable examples in the examples/ directory.

Repository: https://github.com/mohsami632-dotcom/typeshift
npm: https://www.npmjs.com/package/@mohsami/typeshift

Feedback on the compiler IR architecture and CLI ergonomics is warmly welcomed.
```

---

### Draft 5B: Technical Community Post (Reddit `r/typescript` / Dev.to)

```markdown
# Building a 2N schema compiler for TypeScript, JSON Schema, Zod, and OpenAPI

Maintaining data contracts across a TypeScript stack usually involves a familiar challenge:

1. You write **TypeScript interfaces** for compile-time IDE safety.
2. At runtime boundaries (API payloads, user inputs, database queries), static types disappear, so you write **Zod schemas** to validate incoming data.
3. Your external consumers need **OpenAPI 3.1** or **JSON Schema** to integrate with your services.

Keeping these representations synchronized by hand is repetitive. Furthermore, converting schemas between different formats inherently encounters feature mismatches: static TypeScript interfaces cannot natively enforce runtime regex patterns or numeric boundaries that exist in JSON Schema or Zod. Without explicit diagnostics, developers can easily lose track of which constraints are preserved across conversions.

I built [typeshift](https://github.com/mohsami632-dotcom/typeshift) to approach this using a compiler pipeline.

### The 2N Compiler Pipeline

Rather than wiring bespoke point-to-point translators between every combination of formats, `typeshift` parses each format into a canonical Intermediate Representation (`SchemaIR`).

```
TypeScript  ───┐                               ┌───► TypeScript
JSON Schema ───┼──► [ Parser ] ──► SchemaIR ──► [ Generator ] ──┼──► JSON Schema
Zod         ───┤                               ├───► Zod
OpenAPI 3.1 ───┘                               └───► OpenAPI 3.1
```

Adding a format requires only 1 parser and 1 generator ($2N$ operations) rather than $N \times (N-1)$ translation pairs.

### Explicit Information-Loss Diagnostics

Formats have different expressiveness:
- **Zod & JSON Schema** validate regex patterns, minimum/maximum values, and formats at runtime.
- **TypeScript** enforces structural types at compile time.

`typeshift` includes an explicit **loss detection engine**. Each format adapter declares a capability manifest. When converting from a richer format to a less expressive one, it highlights the exact constraints that cannot be natively represented in the target format:

```bash
echo '{"$schema":"http://json-schema.org/draft-07/schema#","title":"Account","type":"object","properties":{"username":{"type":"string","pattern":"^[a-z0-9_-]{3,16}$"},"age":{"type":"number","minimum":13}},"required":["username","age"]}' | npx @mohsami/typeshift convert --from json-schema --to typescript
```

Diagnostics emitted to `stderr`:
```text
Information-Loss Diagnostics (2 warnings):
  ! WARNING [Account.username] Constraint "pattern" (value: "^[a-z0-9_-]{3,16}$") will be dropped. (pattern constraint)
  ! WARNING [Account.age] Constraint "minimum" (value: 13) will be dropped. (minimum constraint)
```

Generated TypeScript emitted to `stdout`:
```typescript
// Generated by typeshift — do not edit manually.

export interface Account {
  username: string;
  age: number;
}
```

In CI pipelines, you can run with `--loss-policy error` to reject conversions that drop validation rules:
```bash
echo '{"$schema":"http://json-schema.org/draft-07/schema#","title":"Account","type":"object","properties":{"username":{"type":"string","pattern":"^[a-z0-9_-]{3,16}$"},"age":{"type":"number","minimum":13}},"required":["username","age"]}' | npx @mohsami/typeshift convert --from json-schema --to typescript --loss-policy error
# Exits with status code 2 on detected loss
```

Or convert the committed example file directly:
```bash
npx @mohsami/typeshift convert examples/03-json-schema-to-typescript/account.json --to typescript
```

### Quick Test Drive via Pipe

You can test it directly in your terminal using shell piping:

```bash
echo 'export interface User { id: string; name: string; age?: number; role: "admin" | "member"; }' | npx @mohsami/typeshift convert --from ts --to zod
```

Emits:
```typescript
import { z } from 'zod';

export const User = z.object({
  id: z.string(),
  name: z.string(),
  age: z.number().optional(),
  role: z.enum(["admin", "member"]),
});
```

### Architecture & Current Scope

- **Parser Design**: Directly uses the official TypeScript Compiler API (`typescript`) for AST analysis and `commander` for the CLI.
- **Supported Formats**: TypeScript interfaces & type aliases, JSON Schema Draft-07, Zod validators, and OpenAPI 3.1 component schemas.
- **OpenAPI Scope**: Focuses specifically on data models under `components.schemas`. HTTP route declarations under `paths` are out of scope (typeshift is a schema model compiler, not a full API framework).
- **Format Requirements**: OpenAPI files must currently be in JSON format (`.openapi.json` or `.json`). Native YAML input is tracked on our roadmap ([#5](https://github.com/mohsami632-dotcom/typeshift/issues/5)).
- **Package Details**: Published as `@mohsami/typeshift` on npm with SLSA v1 build provenance attestations. 99 automated tests across 20 suites.

Repository: https://github.com/mohsami632-dotcom/typeshift  
npm: https://www.npmjs.com/package/@mohsami/typeshift  
Examples: https://github.com/mohsami632-dotcom/typeshift/tree/main/examples

What schema translations create the most maintenance friction in your stack? We'd love your thoughts!
```

---

## 6. Community Q&A & Response Guide

When engaging with developers on Hacker News, Reddit, and GitHub Discussions, use the following technically sound answers:

### Q1: "How does this compare to `quicktype`?"
> **Answer:**  
> `quicktype` is an established tool primarily designed for generating client types in many programming languages (C#, Go, Swift, Rust, etc.) from JSON samples or JSON Schema.  
> `typeshift` has a different focus:
> 1. **Bidirectional web/TS ecosystem compilation:** We focus heavily on seamless, 2-way conversion between the schema formats JavaScript/TypeScript developers actually use day-to-day (TypeScript, Zod, JSON Schema, and OpenAPI 3.1).
> 2. **Loss diagnostics & CI enforcement:** Rather than best-effort flattening, `typeshift` has a formal capability detection engine that identifies dropped constraints and can fail your CI pipeline (`--loss-policy error`) before breaking schema drift enters production.
> 3. **Clean, modern output:** Emits readable, idiomatic code (e.g. `z.discriminatedUnion`, JSDoc comments, Draft-07 `$defs`) with deterministic formatting.

### Q2: "How does this compare to `zod-to-json-schema` or `json-schema-to-typescript`?"
> **Answer:**  
> Those are reliable, high-quality tools for their specific point-to-point jobs! However:
> 1. Using single-purpose packages leads to an $N \times (N-1)$ matrix of dependencies, each with different CLI flags, different JSON Schema draft interpretations, and different issue trackers.
> 2. Single-purpose converters naturally focus on their specific source-to-target mapping. `typeshift` is built around a centralized Intermediate Representation (`SchemaIR`) paired with an explicit capability matrix. This allows `typeshift` to systematically detect and report constraint drops across any pair of formats, with configurable exit codes (`--loss-policy error`) for CI enforcement.

### Q3: "Why don't you support OpenAPI `paths` (endpoints, route parameters, HTTP methods)?"
> **Answer:**  
> `typeshift` is designed specifically as a universal **schema data model compiler**. Generating full HTTP clients or server boilerplate (like OpenAPI-fetch, Orval, or OpenAPI Generator) introduces extensive opinionated choices around HTTP clients, auth interceptors, and framework routing.  
> By focusing strictly on `components.schemas`, `typeshift` excels at keeping your core domain types aligned across TypeScript, Zod, and API contracts without framework lock-in.

### Q4: "Why don't you parse OpenAPI `.yaml` files directly?"
> **Answer:**  
> Standard Node does not include a native YAML parser, so parsing YAML requires bundling an external library (like `yaml` or `js-yaml`). For v0.2.0, we kept dependencies strictly limited to `typescript` (for the compiler API) and `commander` (for the CLI).  
> The CLI and parser detect YAML files and provide clear guidance to supply JSON. Adding native YAML support is tracked on our public roadmap as issue [#5](https://github.com/mohsami632-dotcom/typeshift/issues/5) for v0.3.0.

### Q5: "What happens to regex patterns, `minimum`, and other constraints when converting to TypeScript?"
> **Answer:**  
> TypeScript static interfaces cannot enforce runtime values like `minimum: 0` or regex patterns without runtime validation code.  
> When compiling to TypeScript, `typeshift` preserves the core structural types (e.g., `number`, `string`), converts descriptions into JSDoc comments, and emits explicit warnings on `stderr` listing every constraint that was dropped. If you are validating contracts in CI, `--loss-policy error` lets you reject conversions that drop constraints.

### Q6: "What formats and features are planned next?"
> **Answer:**  
> All upcoming features are documented in open issues:
> - **v0.3.0:** GraphQL SDL adapter ([#1](https://github.com/mohsami632-dotcom/typeshift/issues/1)), native OpenAPI YAML parsing ([#5](https://github.com/mohsami632-dotcom/typeshift/issues/5)), and CLI watch mode (`--watch`, [#3](https://github.com/mohsami632-dotcom/typeshift/issues/3)).
> - **v0.4.0:** SQL DDL adapter for PostgreSQL/SQLite table schemas ([#2](https://github.com/mohsami632-dotcom/typeshift/issues/2)) and expanded JSON Schema keyword coverage ([#4](https://github.com/mohsami632-dotcom/typeshift/issues/4)).

---

## 7. Community Sharing Channels & Rule Compliance

| Platform | Channel / Subreddit | Guidelines & Rules Checked | Recommended Approach |
| :--- | :--- | :--- | :--- |
| **Hacker News** | `Show HN` | - Must be something you created.<br>- Must have a working implementation.<br>- No sensationalized or marketing-heavy titles.<br>- Must link directly to project or repo. | Post during weekday morning EST (8:00–10:00 AM). Stay active in comments to answer technical architecture questions. |
| **Reddit** | `r/typescript` (200k+ devs) | - Must be relevant to TypeScript.<br>- Open-source tools welcomed if technically detailed.<br>- Must not spam or post purely promotional links. | Focus on the TypeScript compiler API AST integration, type mapping, and lossless conversion. |
| **Reddit** | `r/node` (150k+ devs) | - Must relate to Node.js backend/CLI development.<br>- Transparent about open-source status. | Emphasize CLI piping, Node 20+ runtime compatibility, and CI integration. |
| **Reddit** | `r/webdev` | - "Showoff Saturday" only for personal/open-source projects. | Post only on Saturday, focusing on syncing frontend TypeScript with backend Zod/JSON Schema. |
| **Dev.to / Hashnode** | Tagged `#typescript`, `#opensource`, `#webdev` | - Educational content encouraged.<br>- Avoid pure links; provide technical walkthroughs. | Publish a tutorial: *"Why Schema Converters Face Capability Mismatches (And How to Catch Them)"*. |
| **Lobste.rs** | Lobsters tags: `typescript`, `show`, `api` | - High bar for technical substance.<br>- Self-posts must be tagged `[show]` and disclosed. | Only submit after early community feedback; highlight compiler IR architecture. |

---

## 8. Practical 30-Day Adoption Plan

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
- Write an in-depth technical article on Dev.to: *"The $2N$ Compiler Model: Converting Schemas Across Format Boundaries"*.
- Create a short terminal demo GIF/video using [vhs](https://github.com/charmbracelet/vhs) demonstrating the 60-second demo script.
- Link the demo video in the README.

### Phase 4: Days 24–30 (Contributor Community Activation)
- Promote the 5 curated roadmap issues ([#1 GraphQL](https://github.com/mohsami632-dotcom/typeshift/issues/1), [#2 SQL DDL](https://github.com/mohsami632-dotcom/typeshift/issues/2), [#3 Watch Mode](https://github.com/mohsami632-dotcom/typeshift/issues/3), [#4 Keywords](https://github.com/mohsami632-dotcom/typeshift/issues/4), [#5 OpenAPI YAML](https://github.com/mohsami632-dotcom/typeshift/issues/5)) on community Discord/Slack channels (e.g. TypeScript Community Discord).
- Pair with first external contributors on pull requests.
- Plan the `v0.3.0` feature scope based on community usage feedback.
