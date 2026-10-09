# Guide: Adding a New Format Adapter

This guide walks you through contributing a new format adapter to **typeshift**.

Because of typeshift's Schema Intermediate Representation (IR), adding a new format requires writing **only two functions**:
1. `parse(input: string): SchemaDocument`
2. `generate(document: SchemaDocument): string`

You do not need to modify any existing format adapters.

---

## Overview of Steps

1. Create directory `src/formats/<format-id>/`
2. Define capabilities in `src/formats/<format-id>/index.ts`
3. Implement parser in `src/formats/<format-id>/parser.ts`
4. Implement generator in `src/formats/<format-id>/generator.ts`
5. Write unit tests in `src/formats/<format-id>/__tests__/`
6. Add integration and roundtrip tests in `tests/integration/`
7. Register the adapter in `src/formats/index.ts`

---

## Example Walkthrough: Adding a GraphQL Adapter (`graphql`)

Let's walk through implementing a GraphQL Schema Definition Language (SDL) adapter.

### Step 1: Directory Setup

```bash
mkdir -p src/formats/graphql/__tests__
touch src/formats/graphql/index.ts
touch src/formats/graphql/parser.ts
touch src/formats/graphql/generator.ts
touch src/formats/graphql/__tests__/parser.test.ts
touch src/formats/graphql/__tests__/generator.test.ts
```

---

### Step 2: Declare Capabilities & Adapter Definition

In `src/formats/graphql/index.ts`, define your adapter metadata and declare its capabilities honestly:

```typescript
import type {
  FormatAdapter,
  FormatCapabilities,
  SchemaDocument,
  ParseOptions,
  GenerateOptions,
} from '../../core/types';
import { parseGraphQL } from './parser';
import { generateGraphQL } from './generator';

const capabilities: FormatCapabilities = {
  supportsConstraints: false, // Standard GraphQL SDL does not have built-in min/max or regex constraints
  supportsDescriptions: true, // Supports docstrings (""" description """)
  supportsDefaults: true,     // Supports input object default values
  supportsNullable: true,     // GraphQL fields are nullable by default (non-null is marked with !)
  supportsOptional: true,     // Input arguments and fields can be optional
  supportsUnions: true,       // GraphQL unions
  supportsIntersections: false, // GraphQL lacks structural intersections
  supportsEnums: true,        // enum TypeName { VALUE }
  supportsRecursion: true,    // Field types can self-reference
  supportsTuples: false,      // GraphQL has lists, but not fixed positional tuples
  supportsRecords: false,     // Key-value records are not native; explicit types are required
};

export const graphqlAdapter: FormatAdapter = {
  id: 'graphql',
  name: 'GraphQL SDL',
  extensions: ['.graphql', '.gql'],
  aliases: ['gql'],
  capabilities,

  parse(input: string, options?: ParseOptions): SchemaDocument {
    return parseGraphQL(input, options);
  },

  generate(document: SchemaDocument, options?: GenerateOptions): string {
    return generateGraphQL(document, options);
  },
};
```

---

### Step 3: Implement the Parser

In `parser.ts`, convert the input text into a `SchemaDocument`.

Use the `ParseError` class from `../../core/errors` if syntax or structural issues occur:

```typescript
import type { SchemaDocument, SchemaNode, ParseOptions } from '../../core/types';
import { ParseError } from '../../core/errors';

export function parseGraphQL(source: string, options?: ParseOptions): SchemaDocument {
  const filename = options?.filename ?? 'schema.graphql';

  // Parse SDL into AST and map to SchemaIR
  const definitions: Record<string, SchemaNode> = {};

  // Map types...

  return {
    definitions,
    metadata: {
      sourceFormat: 'graphql',
      sourceFile: filename,
    },
  };
}
```

---

### Step 4: Implement the Generator

In `generator.ts`, convert a `SchemaDocument` into formatted code:

```typescript
import type { SchemaDocument, SchemaNode, GenerateOptions } from '../../core/types';

export function generateGraphQL(document: SchemaDocument, options?: GenerateOptions): string {
  const parts: string[] = [];

  // Deterministically sort definitions
  const entries = Object.entries(document.definitions).sort(([a], [b]) => a.localeCompare(b));

  for (const [name, node] of entries) {
    // Render GraphQL types...
  }

  return parts.join('\n\n') + '\n';
}
```

---

### Step 5: Register the Adapter

In `src/formats/index.ts`:

```typescript
import { graphqlAdapter } from './graphql';

export { graphqlAdapter, parseGraphQL, generateGraphQL } from './graphql';

export const builtinAdapters = [
  typescriptAdapter,
  jsonSchemaAdapter,
  zodAdapter,
  openApiAdapter,
  graphqlAdapter, // Added
] as const;
```

---

### Step 6: Test Suite Expectations

1. **Unit Tests**:
   - `src/formats/<id>/__tests__/parser.test.ts`: Test parsing primitives, objects, optionality, nullability, enums, unions.
   - `src/formats/<id>/__tests__/generator.test.ts`: Test code generation, header comments, and deterministic key sorting.
2. **Integration Tests**:
   - Add tests to `tests/integration/` verifying conversion to and from existing formats (TypeScript, JSON Schema, Zod, OpenAPI).
3. **Loss Verification**:
   - Verify that unsupported features emit appropriate diagnostics when targeting your format.
