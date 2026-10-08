# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.1] - 2026-10-08

### Changed
- Migrated npm package scope to `@mohsami/typeshift`.
- Configured npm Trusted Publishing via GitHub Actions OIDC with build provenance.
- Corrected CI and Release workflow step ordering for clean builds before integration tests.

## [0.1.0] - 2026-10-07

### Added
- **Core Engine**:
  - Schema Intermediate Representation (SchemaIR) supporting primitives, objects, unions, intersections, enums, literals, tuples, records, and references.
  - Information-loss detector analyzing target capabilities against source schema features.
  - Diagnostic system emitting structured warnings and errors for dropped constraints or degraded types.
  - Format adapter registry with case-insensitive format IDs, aliases, and file extension lookup.
  - Schema builder DSL (`S`) for ergonomic programmatic construction and testing.
- **Built-in Format Adapters**:
  - **TypeScript**: AST-based parser using TypeScript Compiler API; deterministic code generator for interfaces, type aliases, enums, records, tuples, and JSDoc annotations.
  - **JSON Schema**: Draft-07 compatible parser and generator supporting `$defs`, `definitions`, property constraints, descriptions, and defaults.
  - **Zod**: AST-based parser recognizing `z.object`, `z.string` constraints, `z.number` constraints, `z.array`, `z.enum`, `z.record`, `z.optional`, and `z.nullable`; deterministic Zod code generator.
- **CLI (`typeshift`)**:
  - `convert`: Bidirectional format conversion with `--from`, `--to`, `-o/--output`, `--loss-policy <ignore|warn|error>`, and `--header/--no-header`.
  - `list`: Displays registered formats and their full capabilities matrix with `--detailed` and `--json`.
  - `validate`: Parses and validates schema files, reporting structure and definition counts with `--json`.
  - Unix pipe support (`stdin`/`stdout`) for shell integration.
- **Developer & Contributor Infrastructure**:
  - Dual ESM and CommonJS bundle with full TypeScript definitions via `tsup`.
  - Comprehensive unit, integration, and roundtrip test suite via `vitest`.
  - GitHub Actions CI matrix testing Ubuntu, macOS, and Windows across Node.js 20 and 22.
  - Full contributor documentation and architectural decision records (ADRs).
