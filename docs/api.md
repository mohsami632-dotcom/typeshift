# Programmatic API Reference

`typeshift` provides a full TypeScript programmatic API for build systems, code generators, and schema validation scripts.

```typescript
import {
  convert,
  parse,
  generate,
  detectLoss,
  createDefaultRegistry,
  getDefaultRegistry,
  FormatRegistry,
  S,
  type ConvertOptions,
  type SchemaDocument,
  type ConversionResult,
  type ConversionDiagnostic,
  type FormatAdapter,
} from '@mohsami/typeshift';
```

---

## High-Level Conversion

### `convert(input, options, registry?)`

Converts schema text from one format to another, executing parsing, loss detection, and generation in one step.

```typescript
function convert(
  input: string,
  options: ConvertOptions,
  registry?: FormatRegistry,
): ConversionResult;
```

#### Parameters:

- `input`: The raw source code of the schema (e.g. TypeScript interfaces, JSON Schema JSON, or Zod schema declarations).
- `options`:
  - `from: string`: Source format identifier or alias (e.g. `'typescript'`, `'ts'`, `'json-schema'`, `'zod'`).
  - `to: string`: Target format identifier or alias.
  - `parseOptions?: { filename?: string }`: Optional parse configuration.
  - `generateOptions?: { header?: boolean }`: Optional generator configuration (e.g., whether to include banner header comments).
- `registry?`: Optional custom `FormatRegistry`. If omitted, uses the default pre-loaded registry.

#### Return Value (`ConversionResult`):

```typescript
interface ConversionResult {
  /** The generated target schema code or document string. */
  readonly output: string;
  /** Any information-loss diagnostics discovered during conversion. */
  readonly diagnostics: readonly ConversionDiagnostic[];
}
```

#### Example:

```typescript
import { convert } from '@mohsami/typeshift';

const result = convert(
  `
  export interface User {
    id: string;
    email: string;
    isActive?: boolean;
  }
  `,
  {
    from: 'typescript',
    to: 'json-schema',
  },
);

console.log(result.output);
```

---

## Core Compiler Functions

### `parse(input, formatId, registry?, options?)`

Parses raw schema source code into the canonical `SchemaDocument` (SchemaIR).

```typescript
function parse(
  input: string,
  formatId: string,
  registry?: FormatRegistry,
  options?: ParseOptions,
): SchemaDocument;
```

### `generate(document, formatId, registry?, options?)`

Generates target format code from an in-memory `SchemaDocument`.

```typescript
function generate(
  document: SchemaDocument,
  formatId: string,
  registry?: FormatRegistry,
  options?: GenerateOptions,
): string;
```

### `detectLoss(document, targetFormatId, targetCapabilities)`

Inspects an in-memory `SchemaDocument` against the target format capabilities and returns diagnostics.

```typescript
function detectLoss(
  document: SchemaDocument,
  targetFormatId: string,
  targetCapabilities: FormatCapabilities,
): ConversionDiagnostic[];
```

---

## Schema Builders (`S`)

The `S` namespace provides builders for constructing and manipulating SchemaIR trees programmatically:

```typescript
import { S } from '@mohsami/typeshift';

const doc = S.document(
  {
    // Definitions
    User: S.object({
      id: S.prop(S.string({ format: 'uuid' })),
      name: S.prop(S.string({ minLength: 2, maxLength: 50 })),
      age: S.optProp(S.integer({ minimum: 0, maximum: 120 })),
      role: S.prop(S.enumType(['admin', 'member', 'guest'])),
      tags: S.prop(S.array(S.string())),
      settings: S.optProp(S.record(S.string(), S.boolean())),
    }),
  },
  {
    title: 'User API',
    description: 'Shared User domain model',
  },
);
```

### Available Builders:

- `S.string(opts?)`
- `S.number(opts?)`
- `S.integer(opts?)`
- `S.boolean(opts?)`
- `S.nullType(opts?)`
- `S.any(opts?)`
- `S.array(items, opts?)`
- `S.object(properties, opts?)`
- `S.union(schemas, opts?)`
- `S.intersection(schemas, opts?)`
- `S.enumType(values, opts?)`
- `S.literal(value, opts?)`
- `S.tuple(items, opts?)`
- `S.record(keySchema, valueSchema, opts?)`
- `S.ref(name, opts?)`
- `S.prop(schema, optionalOrExtra?, extra?)`
- `S.required(schema, description?)`
- `S.optional(schema, description?)`
- `S.document(definitions, metadata?)`

---

## Registry & Custom Adapters

You can construct an isolated registry or register custom format adapters:

```typescript
import { FormatRegistry, type FormatAdapter } from '@mohsami/typeshift';

const customRegistry = new FormatRegistry();

const myAdapter: FormatAdapter = {
  id: 'my-format',
  name: 'My Custom Format',
  extensions: ['.custom'],
  capabilities: {
    supportsConstraints: false,
    supportsDescriptions: true,
    supportsDefaults: false,
    supportsNullable: true,
    supportsOptional: true,
    supportsUnions: false,
    supportsIntersections: false,
    supportsEnums: true,
    supportsRecursion: false,
    supportsTuples: false,
    supportsRecords: true,
  },
  parse(input) {
    // Return SchemaDocument
  },
  generate(doc) {
    // Return string
  },
};

customRegistry.register(myAdapter);
```

---

## Error Handling

typeshift provides a dedicated error hierarchy:

- `TypeshiftError`: Base error class.
- `ParseError`: Thrown when input schema cannot be parsed (includes `filename`, `line`, `column`).
- `UnknownFormatError`: Thrown when an unknown format ID or alias is provided.
- `GenerateError`: Thrown when an unrecoverable generation error occurs.
- `ValidationError`: Thrown when a schema fails structural validation.
