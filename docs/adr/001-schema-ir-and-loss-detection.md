# ADR-001: Schema Intermediate Representation & Loss Detection

**Status:** Accepted  
**Date:** 2026-10-07  
**Context:** typeshift needs a central data structure for representing schemas from multiple formats, and a mechanism for detecting information loss during conversion.

## Decision

### 1. Internal Representation (IR) via Discriminated Union

All format adapters parse their input into a shared **Schema IR** and generate their output from it.

```
source format → parse() → SchemaIR → generate() → target format
                                ↑
                          loss analysis
```

**Why a shared IR instead of direct converters:**

- Direct converters require N×(N-1) implementations for N formats. The IR approach requires only 2N (one parser + one generator per format).
- Adding a new format requires writing only `parse()` and `generate()` — no modification to existing converters.
- Loss detection can operate on the IR without format-specific knowledge.

**The IR uses TypeScript discriminated unions** with a `kind` field:

```typescript
type SchemaNode =
  | StringSchema // kind: 'string'
  | NumberSchema // kind: 'number'
  | IntegerSchema // kind: 'integer'
  | BooleanSchema // kind: 'boolean'
  | NullSchema // kind: 'null'
  | ArraySchema // kind: 'array'
  | ObjectSchema // kind: 'object'
  | UnionSchema // kind: 'union'
  | IntersectionSchema // kind: 'intersection'
  | EnumSchema // kind: 'enum'
  | LiteralSchema // kind: 'literal'
  | TupleSchema // kind: 'tuple'
  | RecordSchema // kind: 'record'
  | RefSchema // kind: 'ref'
  | AnySchema; // kind: 'any'
```

**Design rules for the IR:**

- All fields use `readonly` for immutability.
- Nodes share a `SchemaBase` interface for common metadata (description, nullable, default).
- Object properties carry their own metadata (`optional`, `readonly`, `description`) via `PropertyDefinition`.
- References to other definitions use `RefSchema` with a string identifier, NOT inlined copies.
- The top-level container is `SchemaDocument`, holding a `Record<string, SchemaNode>` of named definitions.

### 2. Property-Level vs. Schema-Level Concerns

- **`nullable`** is a schema-level concern: `{ kind: 'string', nullable: true }` represents `string | null`.
- **`optional`** is a property-level concern: `{ schema: ..., optional: true }` represents an optional object member.
- **`default`** is a schema-level concern: defaults apply to the value, not the property.

This separation aligns with how different formats model these concepts:

- TypeScript: `?` for optional, `| null` for nullable.
- JSON Schema: `required` array for optional, `nullable` or union with `null` for nullable.
- Zod: `.optional()` for optional, `.nullable()` for nullable.

### 3. Constraints in the IR

Numeric and string constraints are represented directly on the schema node:

```typescript
interface StringSchema {
  kind: 'string';
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;
}
```

Not all formats can represent all constraints:

- TypeScript types cannot express `minLength`, `maxLength`, `pattern`, or `format`.
- JSON Schema can express all of these.
- Zod can express these via `.min()`, `.max()`, `.regex()`, and format methods.

This asymmetry is the core reason loss detection exists.

### 4. Loss Detection System

**Severity levels:**

| Severity  | Meaning                                                 | Example                                            |
| --------- | ------------------------------------------------------- | -------------------------------------------------- |
| `info`    | Cosmetic or representation difference, no semantic loss | Property ordering changed                          |
| `warning` | Information was lost but the output is still usable     | `minLength: 5` dropped when generating TypeScript  |
| `error`   | Critical information lost, output may be incorrect      | Recursive type that target format cannot represent |

**How loss detection works:**

Each format adapter declares its `FormatCapabilities`:

```typescript
interface FormatCapabilities {
  supportsConstraints: boolean;
  supportsDescriptions: boolean;
  supportsDefaults: boolean;
  supportsNullable: boolean;
  supportsOptional: boolean;
  supportsUnions: boolean;
  supportsIntersections: boolean;
  supportsEnums: boolean;
  supportsRecursion: boolean;
  supportsTuples: boolean;
  supportsRecords: boolean;
}
```

The loss detector compares the source IR against the target format's capabilities. For each feature present in the IR but unsupported by the target, a diagnostic is emitted.

Additionally, adapters can emit **custom diagnostics** during `generate()` for format-specific edge cases that the general capability comparison cannot detect.

**Diagnostic structure:**

```typescript
interface ConversionDiagnostic {
  severity: DiagnosticSeverity;
  message: string;
  path?: string; // e.g., "User.address.zipCode"
  sourceConstruct?: string; // e.g., "pattern constraint"
  targetFormat?: string; // e.g., "typescript"
}
```

### 5. References and Recursion

- Named types reference each other via `RefSchema` (`{ kind: 'ref', ref: 'TypeName' }`).
- Recursive types (a type that references itself) are supported in the IR via `RefSchema`.
- Not all target formats can handle recursion. JSON Schema supports `$ref`, Zod supports `z.lazy()`, and TypeScript supports recursive types natively. Loss detection flags recursion when the target format cannot represent it.

### 6. Deterministic Output

The converter guarantees **deterministic output** for the same input: same IR always produces the same output string. This is critical for:

- CI: `typeshift convert --loss-policy error` can compare outputs to detect drift (with a dedicated `sync-check` command on the v0.3.0 roadmap).
- Testing: round-trip tests produce predictable results.
- Code review: generated code doesn't change unless the source schema changed.

Implementation: definition ordering follows insertion order (preserved by JavaScript objects), property ordering follows source order, and generated code uses consistent formatting.

## Consequences

- **Positive:** Adding new formats is O(1) effort relative to existing formats. Loss detection is automatic for capability mismatches.
- **Positive:** The IR is serializable (plain objects, no Maps or Sets), making it easy to debug, test, and potentially cache.
- **Negative:** The IR may not perfectly represent every feature of every format. Some format-specific nuances will be lost in the IR itself (e.g., JSON Schema's `if/then/else`, TypeScript's conditional types). These are documented as known limitations.
- **Trade-off:** Using `Record<string, ...>` instead of `Map<string, ...>` simplifies serialization and testing but loses insertion-order guarantees in older JS engines (not an issue in Node.js 20+).

## Alternatives Considered

1. **Direct format-to-format converters:** Rejected due to N² scaling. Each new format would require converters to/from every existing format.
2. **Using Map<string, ...> for properties:** Rejected in favor of plain objects for simpler JSON serialization, test assertions, and snapshot testing.
3. **Single flat union type without SchemaBase:** Rejected because shared metadata (description, nullable, default) would need to be duplicated on every variant.
