# Contributing to typeshift

Thank you for your interest in contributing to **typeshift**! We aim to build a welcoming, high-quality open-source tool with a great developer and contributor experience.

This guide provides everything you need to set up your environment, write tests, understand the architecture, and submit a pull request.

---

## Code of Conduct

All contributors and participants are expected to adhere to our [Code of Conduct](CODE_OF_CONDUCT.md). Please treat everyone with respect and kindness.

---

## Development Setup

### Prerequisites

- **Node.js**: `v20.0.0` or later
- **pnpm**: `v9.0.0` or later (or npm / corepack)
- **Git**

### Installation

```bash
# Clone the repository
git clone https://github.com/mohsami632-dotcom/typeshift.git
cd typeshift

# Or clone your fork:
# git clone https://github.com/<your-username>/typeshift.git

# Install dependencies
pnpm install

# Approve build scripts for native dependencies (esbuild) if prompted
pnpm approve-builds --all

# Build the project
pnpm run build

# Run all tests
pnpm test
```

---

## Available Scripts

| Command                  | Description                                                        |
| ------------------------ | ------------------------------------------------------------------ |
| `pnpm run build`         | Compiles the library (ESM + CJS + DTS) and CLI binary with `tsup`  |
| `pnpm run dev`           | Runs `tsup` in watch mode for active development                   |
| `pnpm test`              | Runs the test suite via `vitest`                                   |
| `pnpm run test:watch`    | Runs vitest in interactive watch mode                              |
| `pnpm run test:coverage` | Generates a test coverage report using V8                          |
| `pnpm run lint`          | Runs `eslint` across all source and test files                     |
| `pnpm run lint:fix`      | Automatically fixes ESLint rule violations                         |
| `pnpm run format`        | Formats all code with Prettier                                     |
| `pnpm run format:check`  | Checks formatting without modifying files                          |
| `pnpm run typecheck`     | Validates TypeScript types across the codebase with `tsc --noEmit` |
| `pnpm run check`         | Runs full pre-commit pipeline: typecheck + lint + test             |

---

## Project Structure

```
typeshift/
├── src/
│   ├── cli/                   # CLI implementation (Commander.js)
│   │   ├── commands/          # convert, list, validate commands
│   │   ├── utils/             # CLI output styling and error handling
│   │   └── index.ts           # CLI binary entry point
│   ├── core/                  # Core compiler engine
│   │   ├── types.ts           # SchemaIR types, FormatAdapter interface, diagnostics
│   │   ├── errors.ts          # Error hierarchy (ParseError, UnknownFormatError, etc.)
│   │   ├── schema.ts          # Fluent SchemaIR builders (S.string, S.object, etc.)
│   │   ├── registry.ts        # Format adapter registry with alias & extension lookup
│   │   ├── loss-detector.ts   # Information-loss detection engine
│   │   ├── converter.ts       # Orchestrator (parse → loss-detect → generate)
│   │   └── index.ts           # Core re-exports
│   ├── formats/               # Self-contained format adapters
│   │   ├── typescript/        # TypeScript parser and generator
│   │   ├── json-schema/       # JSON Schema parser and generator
│   │   ├── zod/               # Zod parser and generator
│   │   └── index.ts           # Built-in adapter registration
│   └── index.ts               # Public programmatic API entry point
├── tests/
│   ├── cli/                   # CLI end-to-end integration tests
│   └── integration/           # Cross-format conversion & roundtrip tests
├── fixtures/                  # Real-world schema fixtures for testing
└── docs/                      # Architectural decisions and guides
```

---

## Contributing a New Format Adapter

One of the core design goals of typeshift is that **adding a new format is completely isolated**. You do not need to modify existing adapters.

Every format adapter implements the `FormatAdapter` interface:

```typescript
export interface FormatAdapter {
  readonly id: string; // e.g. "openapi"
  readonly name: string; // e.g. "OpenAPI 3.1"
  readonly extensions: readonly string[]; // e.g. [".yaml", ".json"]
  readonly aliases?: readonly string[]; // e.g. ["oas"]
  readonly capabilities: FormatCapabilities;

  parse(input: string, options?: ParseOptions): SchemaDocument;
  generate(document: SchemaDocument, options?: GenerateOptions): string;
}
```

### Steps to Add an Adapter:

1. Create a new directory under `src/formats/<format-name>/`.
2. Implement `parser.ts` to convert format source text into `SchemaDocument` (IR).
3. Implement `generator.ts` to render `SchemaDocument` (IR) into deterministic source code.
4. Declare accurate `capabilities` in `index.ts`.
5. Write unit tests in `src/formats/<format-name>/__tests__/`.
6. Add integration and roundtrip tests in `tests/integration/`.
7. Register the adapter in `src/formats/index.ts`.

See the complete walkthrough: [docs/adding-a-format.md](docs/adding-a-format.md).

---

## Coding Standards & Guarantees

1. **Deterministic Output**: Output generated from the same IR must always be character-identical. Sort dictionary keys and object properties alphabetically where order is not semantically significant.
2. **Loss Awareness**: If a format drops or degrades information, ensure its `capabilities` accurately reflect this so `loss-detector` can warn users. Never fail silently.
3. **Strict Type Safety**: All code must pass `tsc --noEmit` under TypeScript strict mode.
4. **Clean Git Diffs**: Format all files using `pnpm run format` and verify with `pnpm run check` before opening a pull request.
5. **Cross-Platform Compatibility**: Do not use OS-specific shell commands or path assumptions (e.g., use `path.resolve` and forward slashes where applicable).

---

## Pull Request Guidelines

1. **Create a Topic Branch**:
   ```bash
   git checkout -b feature/my-new-feature
   ```
2. **Add Tests**: Every bug fix or new feature must include corresponding automated tests.
3. **Run Verification**: Ensure `pnpm run check` passes with 0 errors.
4. **Write Clear Commit Messages**: We follow conventional commits (e.g. `feat(zod): support z.discriminatedUnion`, `fix(cli): correct --loss-policy error exit code`).
5. **Submit PR**: Open your pull request against `main` on [GitHub Pull Requests](https://github.com/mohsami632-dotcom/typeshift/pulls). Provide context on what changed and why.

---

## Reporting Issues

Issues are tracked on GitHub at [https://github.com/mohsami632-dotcom/typeshift/issues](https://github.com/mohsami632-dotcom/typeshift/issues).

- **Bug Reports**: Please include the source schema snippet, the command or API call used, the expected output, and the actual output.
- **Feature Requests**: Describe the problem you are trying to solve and how you envision the solution.
