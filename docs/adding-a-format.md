# Guide: Adding a New Format Adapter

This guide walks you through contributing a new format adapter to **typeshift**.

Because of typeshift's Schema Intermediate Representation (IR), you only need to write **two functions**:

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

## Step 1: Directory Setup

Let's assume you are adding an adapter for **OpenAPI 3.1 Components** (`openapi`):

```bash
mkdir -p src/formats/openapi/__tests__
touch src/formats/openapi/index.ts
touch src/formats/openapi/parser.ts
touch src/formats/openapi/generator.ts
touch src/formats/openapi/__tests__/parser.test.ts
touch src/formats/openapi/__tests__/generator.test.ts
```

---

## Step 2: Declare Capabilities

In `src/formats/openapi/index.ts`, define your adapter metadata and declare its capabilities honestly:

```typescript
import type {
  FormatAdapter,
  FormatCapabilities,
  SchemaDocument,
  ParseOptions,
  GenerateOptions,
} from '../../core/types';
import { parseOpenApi } from './parser';
import { generateOpenApi } from './generator';

const capabilities: FormatCapabilities = {
  supportsConstraints: true, // OpenAPI supports minimum, maximum, pattern, etc.
  supportsDescriptions: true, // supports description fields
  supportsDefaults: true, // supports default fields
  supportsNullable: true, // supports nullable: true or type: ['string', 'null']
  supportsOptional: true, // supports required: [...]
  supportsUnions: true, // oneOf, anyOf
  supportsIntersections: true, // allOf
  supportsEnums: true, // enum arrays
  supportsRecursion: true, // $ref schemas
  supportsTuples: false, // OpenAPI array items cannot define fixed tuples natively
  supportsRecords: true, // additionalProperties: { ... }
};

export const openApiAdapter: FormatAdapter = {
  id: 'openapi',
  name: 'OpenAPI 3.1',
  extensions: ['.openapi.json', '.openapi.yaml'],
  aliases: ['oas', 'oas3'],
  capabilities,

  parse(input: string, options?: ParseOptions): SchemaDocument {
    return parseOpenApi(input, options);
  },

  generate(document: SchemaDocument, options?: GenerateOptions): string {
    return generateOpenApi(document, options);
  },
};
```

---

## Step 3: Implement the Parser

In `parser.ts`, convert the input text into a `SchemaDocument`.

Use the `ParseError` class from `../../core/errors` if syntax or structural issues occur:

```typescript
import type { SchemaDocument, SchemaNode, ParseOptions } from '../../core/types';
import { ParseError } from '../../core/errors';

export function parseOpenApi(source: string, options?: ParseOptions): SchemaDocument {
  const filename = options?.filename ?? 'input.openapi.json';
  let data: any;

  try {
    data = JSON.parse(source);
  } catch (err) {
    throw new ParseError('Invalid JSON for OpenAPI input.', { filename });
  }

  const schemas = data.components?.schemas ?? {};
  const definitions: Record<string, SchemaNode> = {};

  for (const [name, rawSchema] of Object.entries(schemas)) {
    definitions[name] = convertRawNode(rawSchema);
  }

  return {
    definitions,
    metadata: {
      title: data.info?.title,
      description: data.info?.description,
      sourceFormat: 'openapi',
      sourceFile: filename,
    },
  };
}

function convertRawNode(raw: any): SchemaNode {
  if (raw.type === 'string') {
    return {
      kind: 'string',
      minLength: raw.minLength,
      maxLength: raw.maxLength,
      pattern: raw.pattern,
      format: raw.format,
      description: raw.description,
    };
  }
  // Implement other types: number, integer, boolean, object, array, etc.
  return { kind: 'any' };
}
```

---

## Step 4: Implement the Generator

In `generator.ts`, produce deterministic output from a `SchemaDocument`:

```typescript
import type { SchemaDocument, SchemaNode, GenerateOptions } from '../../core/types';

export function generateOpenApi(document: SchemaDocument, options?: GenerateOptions): string {
  const schemas: Record<string, unknown> = {};

  // Sort definition names alphabetically for deterministic output
  const sortedNames = Object.keys(document.definitions).sort();
  for (const name of sortedNames) {
    schemas[name] = nodeToOpenApi(document.definitions[name]);
  }

  const outputObj = {
    openapi: '3.1.0',
    info: {
      title: document.metadata?.title ?? 'Generated Schemas',
      version: '1.0.0',
      description: document.metadata?.description,
    },
    components: {
      schemas,
    },
  };

  return JSON.stringify(outputObj, null, 2) + '\n';
}

function nodeToOpenApi(node: SchemaNode): Record<string, unknown> {
  // Convert SchemaNode to OpenAPI JSON schema object
  return {};
}
```

---

## Step 5: Register the Adapter

Open `src/formats/index.ts`:

```typescript
import { openApiAdapter } from './openapi';

export const builtinAdapters = [
  typescriptAdapter,
  jsonSchemaAdapter,
  zodAdapter,
  openApiAdapter, // Add here
] as const;
```

---

## Step 6: Testing

1. **Unit Tests**:
   - `src/formats/openapi/__tests__/parser.test.ts`
   - `src/formats/openapi/__tests__/generator.test.ts`
2. **Integration Tests**:
   - Add conversion tests in `tests/integration/conversion.test.ts` (e.g. TypeScript → OpenAPI, OpenAPI → Zod).
3. **Verify Everything**:
   ```bash
   pnpm run check
   ```

When all tests pass and formatting is clean, your new format adapter is ready for pull request review!
