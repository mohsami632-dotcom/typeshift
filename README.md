# typeshift

[![CI](https://github.com/mohsami632-dotcom/typeshift/actions/workflows/ci.yml/badge.svg)](https://github.com/mohsami632-dotcom/typeshift/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@mohsami/typeshift.svg)](https://www.npmjs.com/package/@mohsami/typeshift)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5+-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20.0.0-green.svg)](https://nodejs.org/)

**typeshift is a developer-first schema compiler for bidirectional, loss-aware conversion between schema definition formats.**

```
               ┌───────────────────────┐
               │    TypeScript (.ts)   │
               └───────────▲───────────┘
                           │
       ┌───────────────────┼───────────────────┐
       │                   ▼                   │
┌──────┴──────┐      ┌───────────┐      ┌──────┴──────┐
│ JSON Schema │ <──> │  SchemaIR │ <──> │ Zod (.zod)  │
└──────┬──────┘      └───────────┘      └──────┬──────┘
       │                   ▲                   │
       └───────────────────┼───────────────────┘
                           │
               ┌───────────▼───────────┐
               │   OpenAPI 3.1 (.json) │
               └───────────────────────┘
```

---

## Why typeshift?

Modern systems inevitably maintain schemas across multiple boundaries:
- **TypeScript interfaces** for application logic and compile-time types.
- **JSON Schema** for event streams, storage validation, and API contracts.
- **Zod schemas** for runtime request/response parsing and form validation.
- **OpenAPI 3.1 specifications** for public REST APIs and client generation.

When schemas drift across layers, bugs slip into production. Point-to-point tools (such as `json-schema-to-typescript`, `ts-to-zod`, or `zod-to-json-schema`) solve individual one-way transformations, but they operate in isolation:
1. **Silent Constraint Loss**: Point tools frequently drop regex patterns, numeric ranges, formats, or descriptions without warning.
2. **Exponential Complexity ($N \times (N-1)$)**: Supporting 4 formats requires 12 separate converters; supporting 6 formats requires 30.
3. **No CI Parity Verification**: There is no uniform way to assert in CI that generated schemas match their source models.

**typeshift solves this with a compiler model:**
- **Canonical Intermediate Representation (SchemaIR)**: All formats parse into and generate from a unified AST ($2N$ scaling). Adding a format requires only 2 functions (`parse` and `generate`).
- **Explicit Information-Loss Diagnostics**: Every conversion inspects source constraints against target format capabilities. If information cannot be expressed natively, typeshift reports exact paths and dropped constraints.
- **CI Enforcement**: `--loss-policy error` immediately fails automated pipelines (exit code `2`) if unauthorized loss occurs.
- **Deterministic Generation**: Alphabetically sorted keys and normalized layout guarantee character-identical output and zero git diff churn.
- **Zero Third-Party Parser Bloat**: Direct integration with the official TypeScript Compiler API and Node.js runtime.

---

## Quick Start: Try It in 30 Seconds

### Option A: Instant Shell Pipe (Zero Files Required)

Convert a TypeScript interface directly to JSON Schema without creating any files:

```bash
# On Linux, macOS, or PowerShell:
echo 'export interface User { id: string; name: string; age?: number; }' | npx @mohsami/typeshift convert --from ts --to json-schema
```

### Option B: Local File Conversion

**1. Create a minimal sample schema (`user.ts`):**

```typescript
// user.ts
export interface User {
  id: string;
  name: string;
  age?: number;
  role: 'admin' | 'member';
}
```

**2. Compile to a Draft-07 JSON Schema:**

```bash
npx @mohsami/typeshift convert user.ts --to json-schema -o user.schema.json
```

**3. Compile to a runtime Zod validator:**

```bash
npx @mohsami/typeshift convert user.ts --to zod -o user.zod.ts
```

**4. Explore complete committed examples:**

Explore the [`examples/`](./examples) directory for tested sample files covering TypeScript, JSON Schema, Zod, OpenAPI 3.1, and CI quality gates.

---

## Installation

### Global CLI

```bash
# Using pnpm
pnpm add -g @mohsami/typeshift

# Using npm
npm install -g @mohsami/typeshift

# Using yarn
yarn global add @mohsami/typeshift
```

### Local Project Dependency

```bash
pnpm add @mohsami/typeshift
# or
npm install @mohsami/typeshift
```

---

## Visual Example: Loss Detection & CI Enforcement

When converting rich schemas into formats with weaker constraint semantics (e.g., JSON Schema to compile-time TypeScript), typeshift alerts you to dropped invariants:

```bash
$ typeshift convert schemas/user.json --to typescript
```

```text
Information-Loss Diagnostics (3 warnings):
  ▲ WARNING [User.email] Constraint "format" (value: "email") will be dropped. (format constraint)
  ▲ WARNING [User.age] Constraint "minimum" (value: 0) will be dropped. (minimum constraint)
  ▲ WARNING [User.age] Constraint "maximum" (value: 120) will be dropped. (maximum constraint)

// Generated by typeshift — do not edit manually.

export interface User {
  email: string;
  age?: number;
}
```

### Enforcing Strict Loss Policy in CI

To ensure schema parity across teams and prevent accidental degradation:

```bash
# Aborts conversion and exits with code 2 if any constraint is dropped
typeshift convert schemas/user.json --to typescript --loss-policy error
```

```text
Information-Loss Diagnostics (3 warnings):
  ▲ WARNING [User.email] Constraint "format" (value: "email") will be dropped.
  ▲ WARNING [User.age] Constraint "minimum" (value: 0) will be dropped.
  ▲ WARNING [User.age] Constraint "maximum" (value: 120) will be dropped.
✖ Aborting due to --loss-policy error. Information loss was detected during conversion.
```

---

## CI Workflow Example

Add schema verification to your GitHub Actions pipeline:

```yaml
name: Verify Schema Parity
on: [push, pull_request]

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Verify zero schema drift
        run: |
          npx @mohsami/typeshift convert contracts/api.openapi.json --to json-schema --loss-policy error -o dist/api.schema.json
          git diff --exit-code dist/api.schema.json
```

---

## CLI Usage Guide

### 1. File Conversion

```bash
# TypeScript -> JSON Schema
typeshift convert src/models.ts --to json-schema -o schemas/models.json

# OpenAPI 3.1 -> TypeScript
typeshift convert openapi.json --to typescript -o src/api-types.ts

# OpenAPI 3.1 -> Zod
typeshift convert openapi.json --to zod -o src/validators.zod.ts

# JSON Schema -> OpenAPI 3.1
typeshift convert schema.json --to openapi -o spec.openapi.json
```

### 2. Format Aliases & Auto-Detection

Source format is automatically inferred from file extension (`.ts`, `.json`, `.openapi.json`, `.zod.ts`), or can be specified with short aliases:

| Format | Format ID | Aliases | File Extensions |
| :--- | :--- | :--- | :--- |
| **TypeScript** | `typescript` | `ts` | `.ts` |
| **JSON Schema** | `json-schema` | `jsonschema`, `json` | `.json`, `.schema.json` |
| **Zod** | `zod` | `z` | `.zod.ts` |
| **OpenAPI 3.1** | `openapi` | `oas`, `oas3`, `openapi3.1` | `.openapi.json`, `.oas.json`, `openapi.json` |

```bash
typeshift convert schema.ts --to z
typeshift convert openapi.json --to ts
```

### 3. Shell Piping (`stdin` / `stdout`)

```bash
cat types.ts | typeshift convert --from ts --to json-schema
```

### 4. Inspect Available Formats & Capabilities

```bash
typeshift list --detailed
```

```text
Available Schema Formats:

  typescript       TypeScript       Extensions: .ts (Aliases: ts)
    Capabilities: -constraints +docs -defaults +nullable +unions +intersections +recursion

  json-schema      JSON Schema      Extensions: .json, .schema.json (Aliases: jsonschema, json)
    Capabilities: +constraints +docs +defaults +nullable +unions +intersections +recursion

  zod              Zod              Extensions: .zod.ts (Aliases: z)
    Capabilities: +constraints +docs +defaults +nullable +unions +intersections -recursion

  openapi          OpenAPI 3.1      Extensions: .openapi.json, .oas.json, openapi.json, .openapi (Aliases: oas, oas3, openapi3, openapi-3.1, openapi3.1)
    Capabilities: +constraints +docs +defaults +nullable +unions +intersections +recursion
```

### 5. Validate Schemas

```bash
# Human-readable summary
typeshift validate openapi.json

# Structured JSON output for scripts
typeshift validate openapi.json --json
```

---

## Supported Formats Matrix

| Feature | TypeScript (`ts`) | JSON Schema (`json-schema`) | Zod (`zod`) | OpenAPI 3.1 (`openapi`) |
| :--- | :---: | :---: | :---: | :---: |
| **Bidirectional** | ✅ | ✅ | ✅ | ✅ |
| **Object / Interfaces** | ✅ | ✅ | ✅ | ✅ |
| **Numeric Constraints** (`min`, `max`, `multipleOf`) | ❌ _(warned)_ | ✅ | ✅ | ✅ |
| **String Constraints** (`pattern`, `minLength`, `maxLength`) | ❌ _(warned)_ | ✅ | ✅ | ✅ |
| **Format Hints** (`email`, `uuid`, `uri`, `date-time`) | ❌ _(warned)_ | ✅ | ✅ | ✅ |
| **Default Values** | ❌ _(warned)_ | ✅ | ✅ | ✅ |
| **Unions & Discriminated Unions** | ✅ | ✅ | ✅ | ✅ |
| **Intersections** | ✅ | ✅ | ✅ | ✅ |
| **Enums & Literals** | ✅ | ✅ | ✅ | ✅ |
| **Tuples & Records** | ✅ | ✅ | ✅ | ✅ |
| **Nullable & Optional Modifiers** | ✅ | ✅ | ✅ | ✅ |
| **Documentation / JSDoc / Descriptions** | ✅ | ✅ | ✅ | ✅ |
| **Component References (`$ref`)** | ✅ | ✅ | ✅ | ✅ |
| **ReadOnly Property Attributes** | ✅ | ❌ _(warned)_ | ❌ _(warned)_ | ✅ |

> [!IMPORTANT]
> **OpenAPI 3.1 Scope & Boundaries**:
> - **In Scope**: Data models declared under `components.schemas` (object definitions, scalar constraints, enums, unions, intersections, references via `#/components/schemas/<Name>`, and `readOnly` attributes).
> - **Not in Scope**: HTTP API routing operations under `paths` (endpoints, HTTP methods, headers, route parameters). `typeshift` is a schema model compiler, not a full client/server code generator.
> - **File Formats**: OpenAPI specifications must be provided in JSON format (`.openapi.json`, `.oas.json`, `openapi.json`, or `.json`). Direct YAML (`.yaml`/`.yml`) parsing is not yet supported natively; providing a YAML file gives clear, actionable instructions. Tracking issue: [#5](https://github.com/mohsami632-dotcom/typeshift/issues/5).

---

## Programmatic API

typeshift is fully typed and exports a TypeScript programmatic API.

```typescript
import { convert, parse, generate, S } from '@mohsami/typeshift';

// High-level bidirectional conversion
const result = convert(
  `
  export interface User {
    id: string;
    username: string;
    email: string;
    role?: 'admin' | 'member';
  }
  `,
  {
    from: 'typescript',
    to: 'openapi',
  },
);

console.log(result.output);
// Emits valid OpenAPI 3.1.0 document with components.schemas.User

console.log(result.diagnostics);
// Emits diagnostics array if information loss was detected
```

### Building Schemas Manually (Fluent SchemaIR)

```typescript
import { S, generate } from '@mohsami/typeshift';

const doc = S.document({
  Product: S.object({
    sku: S.required(S.string({ minLength: 3 })),
    price: S.required(S.number({ minimum: 0 })),
    tags: S.optional(S.array(S.string())),
  }),
});

// Generate Zod code from IR
const zodCode = generate(doc, 'zod');
console.log(zodCode);

// Generate OpenAPI 3.1 from IR
const openApiDoc = generate(doc, 'openapi');
console.log(openApiDoc);
```

For complete API details, refer to the [API Reference](docs/api.md).

---

## Architecture

```
                  ┌─────────────────┐
                  │ Source Document │
                  └────────┬────────┘
                           │
                     parse() (Adapter)
                           │
                           ▼
                  ┌─────────────────┐
                  │    Schema IR    │
                  └────────┬────────┘
                           │
            ┌──────────────┴──────────────┐
            ▼                             ▼
   ┌─────────────────┐           ┌──────────────────┐
   │  Loss Detector  │           │    generate()    │
   │  (Diagnostics)  │           │    (Adapter)     │
   └────────┬────────┘           └────────┬─────────┘
            │                             │
            ▼                             ▼
       Diagnostics                  Target Output
```

Read our comprehensive documentation:
- [Examples Directory](examples/README.md) — 5 runnable, committed examples with inputs, outputs, and explanations.
- [Architecture Guide](docs/architecture.md) — Deep dive into SchemaIR, the $2N$ compiler model, and capability declarations.
- [API Reference](docs/api.md) — Full TypeScript programmatic API guide and builders.
- [Launch Kit & Adoption Playbook](docs/launch-kit.md) — Demo scripts, copy-paste snippets, and community guide.

---

## Contributing

We welcome community contributions! Because each format adapter is an isolated module, adding support for new formats (such as GraphQL, SQL DDL, or Protobuf) is clean, approachable, and self-contained.

- Read our [Contributing Guide](CONTRIBUTING.md) to set up your environment.
- Follow the tutorial: [Adding a New Format Adapter](docs/adding-a-format.md).
- Browse [Good First Issues](https://github.com/mohsami632-dotcom/typeshift/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22) and [Help Wanted Tasks](https://github.com/mohsami632-dotcom/typeshift/issues?q=is%3Aissue+is%3Aopen+label%3A%22help+wanted%22).
- Read our [Code of Conduct](CODE_OF_CONDUCT.md).

---

## Roadmap

- [x] **v0.1.0** — Core SchemaIR, TypeScript, JSON Schema, and Zod adapters, loss detection, CLI.
- [x] **v0.2.0** — OpenAPI 3.1 component schemas adapter, comprehensive test matrix, format aliases, loss-policy exit codes.
- [ ] **v0.3.0** — GraphQL SDL adapter ([#1](https://github.com/mohsami632-dotcom/typeshift/issues/1)), OpenAPI YAML input ([#5](https://github.com/mohsami632-dotcom/typeshift/issues/5)), file watch mode ([#3](https://github.com/mohsami632-dotcom/typeshift/issues/3)).
- [ ] **v0.4.0** — SQL DDL adapter ([#2](https://github.com/mohsami632-dotcom/typeshift/issues/2)), expanded JSON Schema keywords ([#4](https://github.com/mohsami632-dotcom/typeshift/issues/4)), configuration file support (`typeshift.config.ts`).
- [ ] **v1.0.0** — Protobuf message adapter, external plugin loading from npm, performance benchmarks for multi-megabyte schemas.

---

## License

[MIT](LICENSE) © 2026 typeshift Contributors.
