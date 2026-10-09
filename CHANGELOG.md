# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.2.0] - 2026-10-09

### Added
- **OpenAPI 3.1 Format Adapter (`openapi`)**:
  - Full bidirectional support for OpenAPI 3.1 specifications aligned with JSON Schema Draft 2020-12.
  - Component schema parsing and generation under `components.schemas`.
  - JSON pointer reference resolution using `#/components/schemas/<Name>`.
  - Full support for `readOnly` attributes, nullable type arrays (`["string", "null"]`), and legacy OpenAPI 3.0 `nullable: true`.
  - Rich constraint parsing and generation for numeric boundaries, string patterns, formats, and array boundaries.
  - Format aliases: `oas`, `oas3`, `openapi3`, `openapi-3.1`, `openapi3.1`.
  - Compound extension detection: `.openapi.json`, `.oas.json`, `openapi.json`, `.openapi`.
- **Comprehensive Conversion Matrix & Integration Suite**:
  - Complete 6-way conversion matrix tests across TypeScript, JSON Schema, Zod, and OpenAPI 3.1.
  - Performance benchmarks covering small, medium, and large (750+ properties) schemas with sub-50ms conversion times and zero quadratic scaling.
  - Character-level determinism validation across repeated runs.
- **Enhanced CLI & Loss Policy Enforcement**:
  - Strict exit codes: exit code `2` on `--loss-policy error` when loss is detected; exit code `0` on zero-loss conversions.
  - Clear, actionable guidance when unsupported YAML files (`.yaml`, `.yml`) are provided to CLI or parser.
  - Content-based auto-detection of OpenAPI 3 documents from generic JSON files.
- **Contributor Experience & Community**:
  - 4 genuine roadmap GitHub issues created for community contributions.
  - GitHub Discussions enabled for feature discussions and showcase.
  - Updated issue templates and pull request templates with structured checklists.

### Fixed
- **TypeScript Parser**: Corrected parsing of `null` in union types where `ts.LiteralTypeNode` was previously skipped, now correctly flagging `nullable: true` in SchemaIR.
- **TypeScript Generator**: Removed redundant parentheses around primitive nullables (e.g. `(string) | null` now emits `string | null`).
- **Zod Parser**: Fixed dropping of identifier schema references (e.g. `category: Category` and `address: AddressSchema.optional()`) in `z.object` declarations.

### Changed
- Expanded CI test matrix to test Node.js 24.x alongside 20.x and 22.x across Linux, Windows, and macOS.
- Overhauled README, architecture guides, adding-a-format tutorial, and API reference documentation.

## [0.1.3] - 2026-10-08

### Fixed
- Fixed CLI `--version` reporting hardcoded `0.1.0`; the CLI now dynamically derives its version from package metadata at compile time and runtime.

## [0.1.2] - 2026-10-08

### Changed
- Configured and enabled GitHub Actions npm Trusted Publishing via OIDC.
- First automated release published through the GitHub Actions Trusted Publishing pipeline.

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
