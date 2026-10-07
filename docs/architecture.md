# typeshift Architecture

This document describes the architectural principles, data structures, and pipeline flow that make `typeshift` work.

---

## High-Level Overview

`typeshift` is designed around a **compiler pipeline** with a canonical **Intermediate Representation (SchemaIR)**.

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│  Source Schema  │ ----> │    Schema IR    │ ----> │  Target Schema  │
│  (e.g. .ts)     │       │ (SchemaDocument)│       │  (e.g. .json)   │
└─────────────────┘       └────────┬────────┘       └─────────────────┘
      (parse)                      │                      (generate)
                                   ▼
                          ┌─────────────────┐
                          │  Loss Detector  │
                          │  (Diagnostics)  │
                          └─────────────────┘
```

### The $2N$ Linear Scaling Model

Direct converters between $N$ formats require $N \times (N - 1)$ implementations:

- Converting between 3 formats requires 6 converters.
- Converting between 6 formats requires 30 converters.
- Converting between 10 formats requires 90 converters.

By routing all conversions through a shared SchemaIR, typeshift requires only $2N$ implementations ($N$ parsers + $N$ generators):

- Adding format $N$ requires writing **only 2 functions**: `parse()` and `generate()`.
- Every new format immediately supports bidirectional conversion with all existing formats.

---

## Core Components

### 1. Schema Intermediate Representation (IR)

The SchemaIR is defined in `src/core/types.ts` as an immutable discriminated union of schema nodes (`SchemaNode`).

```typescript
export type SchemaNode =
  | StringSchema // string constraints: minLength, maxLength, pattern, format
  | NumberSchema // number constraints: minimum, maximum, multipleOf
  | IntegerSchema // integer constraints: minimum, maximum, multipleOf
  | BooleanSchema
  | NullSchema
  | ArraySchema // items schema, minItems, maxItems, uniqueItems
  | ObjectSchema // properties dictionary, additionalProperties
  | UnionSchema // union of schemas
  | IntersectionSchema // intersection of schemas
  | EnumSchema // allowed literal values
  | LiteralSchema // single literal value
  | TupleSchema // ordered positional schemas
  | RecordSchema // keySchema + valueSchema
  | RefSchema // pointer to another definition in SchemaDocument
  | AnySchema; // unconstrained wildcard type
```

#### Key Design Decisions in the IR:

- **`SchemaDocument` Container**: The root container holds `definitions: Record<string, SchemaNode>` alongside optional `metadata: DocumentMetadata`.
- **Reference Integrity**: Nested structures reference other definitions by name using `RefSchema ({ kind: 'ref', ref: 'TypeName' })` rather than inlining deep duplicates.
- **Separation of Optionality and Nullability**:
  - `nullable` is a feature of a value schema (`string | null`).
  - `optional` is a feature of a property in an object (`{ foo?: string }`).
- **Immutability**: All IR nodes are marked `readonly` to prevent accidental mutation during analysis.

---

### 2. The `FormatAdapter` Contract

Every format adapter implements a single interface:

```typescript
export interface FormatAdapter {
  readonly id: string;
  readonly name: string;
  readonly extensions: readonly string[];
  readonly aliases?: readonly string[];
  readonly capabilities: FormatCapabilities;

  parse(input: string, options?: ParseOptions): SchemaDocument;
  generate(document: SchemaDocument, options?: GenerateOptions): string;
}
```

The adapter is completely self-contained. It interacts only with `SchemaDocument` and does not depend on any other format adapter.

---

### 3. Capability Declaration & Loss Detection

Every format adapter explicitly declares what schema features it can natively express via `FormatCapabilities`:

```typescript
export interface FormatCapabilities {
  readonly supportsConstraints: boolean; // min, max, pattern, format
  readonly supportsDescriptions: boolean; // JSDoc, comments, description
  readonly supportsDefaults: boolean; // default values
  readonly supportsNullable: boolean; // nullable types
  readonly supportsOptional: boolean; // optional fields
  readonly supportsUnions: boolean; // union types
  readonly supportsIntersections: boolean; // intersection types
  readonly supportsEnums: boolean; // enums
  readonly supportsRecursion: boolean; // self-referential / lazy types
  readonly supportsTuples: boolean; // positional tuples
  readonly supportsRecords: boolean; // dictionary / map types
}
```

#### Loss Detection Algorithm:

1. `detectLoss()` traverses the `SchemaDocument` tree.
2. For each node, it checks whether features present in the node (e.g. `minLength: 5`, `pattern: "..."`, `default: "..."`) are supported by `targetCapabilities`.
3. If unsupported, a structured `ConversionDiagnostic` is emitted:
   - `severity`: `'info' | 'warning' | 'error'`
   - `path`: e.g. `'User.profile.email'`
   - `sourceConstruct`: e.g. `'format constraint'`
   - `message`: Human-readable explanation of what will be lost.

This allows the CLI and CI pipelines to enforce policies like `--loss-policy error` to prevent silent drift.

---

### 4. Conversion Orchestrator

The conversion pipeline in `src/core/converter.ts` coordinates:

1. **Resolution**: Looks up source and target adapters from `FormatRegistry` (supporting aliases and file extensions).
2. **Parse**: Executes `sourceAdapter.parse(input)`.
3. **Loss Analysis**: Evaluates `detectLoss(document, targetAdapter.id, targetAdapter.capabilities)`.
4. **Generate**: Executes `targetAdapter.generate(document)`.
5. **Result**: Returns `{ output, diagnostics }`.

---

## Deterministic Code Generation

To ensure that conversions are stable in version control and automated pipelines:

1. **Sorted Keys**: Object properties and definitions are output in deterministic order.
2. **Standard Formatting**: Spacing, indentations, and line breaks are generated consistently without relying on external formatters.
3. **Header Comments**: An optional banner comment (`Generated by typeshift — do not edit manually.`) is inserted when configured.
