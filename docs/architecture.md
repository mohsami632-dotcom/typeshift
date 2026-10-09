# typeshift Architecture

This document describes the architectural principles, data structures, and compiler pipeline that power `typeshift`.

---

## High-Level Overview

`typeshift` is designed around a **compiler pipeline** with a canonical **Intermediate Representation (SchemaIR)**.

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│  Source Schema  │ ----> │    Schema IR    │ ----> │  Target Schema  │
│(e.g. .ts, .json)│       │ (SchemaDocument)│       │(e.g. .ts, .json)│
└─────────────────┘       └────────┬────────┘       └─────────────────┘
      (parse)                      │                      (generate)
                                   ▼
                          ┌─────────────────┐
                          │  Loss Detector  │
                          │  (Diagnostics)  │
                          └─────────────────┘
```

### The $2N$ Linear Scaling Model

Direct converters between $N$ formats require $N \times (N - 1)$ individual implementations:
- Converting between 4 formats requires 12 converters.
- Converting between 6 formats requires 30 converters.
- Converting between 10 formats requires 90 converters.

By routing all conversions through a shared, lossless SchemaIR, typeshift requires only $2N$ implementations ($N$ parsers + $N$ generators):
- Adding format $N$ requires writing **only 2 functions**: `parse()` and `generate()`.
- Every newly added format immediately inherits bidirectional conversion with all existing formats in the ecosystem.

---

## Core Components

### 1. Schema Intermediate Representation (SchemaIR)

The SchemaIR is defined in `src/core/types.ts` as an immutable discriminated union of schema nodes (`SchemaNode`).

```typescript
export type SchemaNode =
  | StringSchema        // string constraints: minLength, maxLength, pattern, format
  | NumberSchema        // number constraints: minimum, maximum, exclusiveMinimum, etc.
  | IntegerSchema       // integer constraints: minimum, maximum, multipleOf
  | BooleanSchema
  | NullSchema
  | ArraySchema         // items schema, minItems, maxItems, uniqueItems
  | ObjectSchema        // properties dictionary, additionalProperties
  | UnionSchema         // union of schemas (oneOf / anyOf)
  | IntersectionSchema  // intersection of schemas (allOf)
  | EnumSchema          // allowed literal values
  | LiteralSchema       // single constant value
  | TupleSchema         // ordered positional schemas (prefixItems)
  | RecordSchema        // keySchema + valueSchema
  | RefSchema           // pointer to another definition in SchemaDocument
  | AnySchema;          // unconstrained wildcard type
```

#### Key Design Decisions in SchemaIR:

- **`SchemaDocument` Container**: The root container holds `definitions: Record<string, SchemaNode>` alongside optional `metadata: DocumentMetadata`.
- **Reference Integrity**: Structures reference other definitions by name using `RefSchema ({ kind: 'ref', ref: 'TypeName' })`.
  - In TypeScript: rendered as type identifiers (`user: User`).
  - In JSON Schema: rendered as `#/$defs/User`.
  - In OpenAPI 3.1: rendered as `#/components/schemas/User`.
  - In Zod: rendered as validator identifiers (`user: UserSchema`).
- **Separation of Optionality and Nullability**:
  - `nullable` is a property of a value schema (`string | null`).
  - `optional` is a property of an object property (`{ foo?: string }`).
- **Immutability**: All IR nodes are marked `readonly` to prevent accidental mutation during pipeline execution.

---

## Built-In Adapters

`typeshift` ships with 4 production-grade format adapters in `src/formats/`:

1. **TypeScript Adapter (`typescript`)**:
   - Uses the official TypeScript Compiler API (`typescript`).
   - Parses `interface`, `type` aliases, unions, intersections, enums, tuples, JSDoc comments, and nullable types.
   - Generates formatted, clean TypeScript definitions.
   - Declares `supportsConstraints: false` (types lack runtime boundary validation like regex or min/max), enabling accurate loss detection.

2. **JSON Schema Adapter (`json-schema`)**:
   - Compliant with JSON Schema Draft-07 and Draft 2020-12.
   - Full support for schema constraints, `$defs`, `definitions`, and references.
   - Generates deterministic JSON with sorted keys.

3. **Zod Adapter (`zod`)**:
   - Parses runtime Zod declarations (`z.object`, `z.string().min().max()`, `z.union()`, `z.enum()`, etc.) via TypeScript AST.
   - Generates typed, idiomatic Zod schemas with chained constraint methods (`.min()`, `.max()`, `.email()`, `.uuid()`, `.optional()`, `.nullable()`).

4. **OpenAPI 3.1 Adapter (`openapi`)**:
   - Compliant with the OpenAPI 3.1.0 specification (aligned with JSON Schema Draft 2020-12).
   - Extracts data models from `components.schemas` and cross-references them via `#/components/schemas/<Name>`.
   - Supports `readOnly` attributes, `type: ["string", "null"]`, `oneOf`, `anyOf`, `allOf`, and rich numeric/string constraints.
   - Generates complete OpenAPI 3.1 documents with `info` metadata and `paths: {}`.

---

## Capability Declaration & Loss Detection

Every format adapter explicitly declares what schema features it can natively express via `FormatCapabilities`:

```typescript
export interface FormatCapabilities {
  readonly supportsConstraints: boolean;    // min, max, pattern, format
  readonly supportsDescriptions: boolean;   // JSDoc, comments, description
  readonly supportsDefaults: boolean;       // default values
  readonly supportsNullable: boolean;       // nullable types
  readonly supportsOptional: boolean;       // optional fields
  readonly supportsUnions: boolean;         // union types
  readonly supportsIntersections: boolean;  // intersection types
  readonly supportsEnums: boolean;          // enums
  readonly supportsRecursion: boolean;      // self-referential / lazy types
  readonly supportsTuples: boolean;         // positional tuples
  readonly supportsRecords: boolean;        // dictionary / map types
}
```

### Loss Detection Algorithm

1. `detectLoss()` performs a structural walk of the `SchemaDocument` tree.
2. For each node, it checks whether features present in the node (such as `minLength: 5`, `pattern: "..."`, or `default: "..."`) are supported by `targetCapabilities`.
3. If unsupported, a structured `ConversionDiagnostic` is emitted:
   - `severity`: `'info' | 'warning' | 'error'`
   - `path`: e.g. `'User.profile.email'`
   - `sourceConstruct`: e.g. `'format constraint'`
   - `message`: Clear explanation of the dropped constraint.

This enables CLI enforcement policies:
- `--loss-policy warn` (default): Emits formatted warnings to `stderr` and exits with code `0`.
- `--loss-policy error`: Aborts conversion, emits warnings, and exits with code `2`.
- `--loss-policy ignore`: Silently ignores warnings and exits with code `0`.

---

## Deterministic Code Generation

To ensure reproducible builds and clean git history:
1. **Sorted Keys**: Object properties, component schemas, and definitions are sorted alphabetically.
2. **Normalized Layout**: Spacing, indentations, and punctuation are generated consistently.
3. **Banner Comments**: Standard headers (`Generated by typeshift — do not edit manually.`) are inserted predictably.
