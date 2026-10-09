# typeshift Examples Directory

This directory contains committed, verified examples demonstrating typeshift's core capabilities: bidirectional compilation, constraint preservation, OpenAPI support, and CI loss-policy enforcement.

Each example is self-contained with input schemas, generated outputs, and an explanation of the underlying compiler behavior.

---

## Directory Index

| # | Directory | From | To | Core Concept Demonstrated |
| :-: | :--- | :--- | :--- | :--- |
| **01** | [`01-typescript-to-json-schema`](./01-typescript-to-json-schema/) | TypeScript (`.ts`) | JSON Schema (`.json`) | Deterministic property sorting, enums, records, optional fields, draft-07 emission. |
| **02** | [`02-json-schema-to-zod`](./02-json-schema-to-zod/) | JSON Schema (`.json`) | Zod (`.zod.ts`) | Preserving boundary rules: `.min()`, `.max()`, `.int()`, `.url()`, `.describe()`. |
| **03** | [`03-json-schema-to-typescript`](./03-json-schema-to-typescript/) | JSON Schema (`.json`) | TypeScript (`.ts`) | Explicit information-loss diagnostics for compile-time dropped constraints. |
| **04** | [`04-openapi-to-typescript`](./04-openapi-to-typescript/) | OpenAPI 3.1 (`.openapi.json`) | TypeScript (`.ts`) | Compiling `components.schemas` models, `$ref` resolution, and JSDoc annotations. |
| **05** | [`05-loss-policy-enforcement`](./05-loss-policy-enforcement/) | JSON Schema (`.json`) | TS / Zod | Enforcing zero drift in CI: exit code `2` on dropped constraints vs exit code `0` on zero-loss. |

---

## Quick Command Tour

You can run any example directly from your terminal:

```bash
# Example 01: TypeScript to JSON Schema
npx @mohsami/typeshift convert examples/01-typescript-to-json-schema/user.ts --to json-schema

# Example 02: JSON Schema to Zod
npx @mohsami/typeshift convert examples/02-json-schema-to-zod/product.json --to zod

# Example 03: JSON Schema to TypeScript (with loss diagnostics)
npx @mohsami/typeshift convert examples/03-json-schema-to-typescript/account.json --to typescript

# Example 04: OpenAPI 3.1 to TypeScript
npx @mohsami/typeshift convert examples/04-openapi-to-typescript/petstore.openapi.json --to typescript

# Example 05: Strict CI Enforcement (fails with exit code 2 on loss)
npx @mohsami/typeshift convert examples/05-loss-policy-enforcement/schema-with-constraints.json --to typescript --loss-policy error
```
