/**
 * typeshift — Schema Intermediate Representation (IR) & core type definitions.
 *
 * Every format adapter parses its input into this representation and generates
 * its output from it. This means adding format N requires writing only 2
 * functions (parse + generate), not N-1 converters.
 *
 * @module
 */

// ═══════════════════════════════════════════════════════════════════
//  Schema Document — top-level container
// ═══════════════════════════════════════════════════════════════════

/** A collection of named schema definitions, typically representing one file. */
export interface SchemaDocument {
  /** Named type definitions (key = type name, value = schema). */
  readonly definitions: Record<string, SchemaNode>;
  /** Optional metadata about the source. */
  readonly metadata?: DocumentMetadata;
}

export interface DocumentMetadata {
  readonly title?: string;
  readonly description?: string;
  readonly sourceFormat?: string;
  readonly sourceFile?: string;
}

// ═══════════════════════════════════════════════════════════════════
//  Schema Nodes — the IR type system
// ═══════════════════════════════════════════════════════════════════

/** Discriminated union of all representable schema types. */
export type SchemaNode =
  | StringSchema
  | NumberSchema
  | IntegerSchema
  | BooleanSchema
  | NullSchema
  | ArraySchema
  | ObjectSchema
  | UnionSchema
  | IntersectionSchema
  | EnumSchema
  | LiteralSchema
  | TupleSchema
  | RecordSchema
  | RefSchema
  | AnySchema;

/** Shared metadata present on every schema node. */
export interface SchemaBase {
  /** Human-readable description of this schema. */
  readonly description?: string;
  /** Whether this value can be null. */
  readonly nullable?: boolean;
  /** Default value, if any. */
  readonly default?: unknown;
}

// — Primitive schemas ——————————————————————————————————————————————

export interface StringSchema extends SchemaBase {
  readonly kind: 'string';
  readonly minLength?: number;
  readonly maxLength?: number;
  /** Regular expression pattern the string must match. */
  readonly pattern?: string;
  /** Semantic format hint (e.g. 'email', 'uri', 'date-time', 'uuid'). */
  readonly format?: string;
}

export interface NumberSchema extends SchemaBase {
  readonly kind: 'number';
  readonly minimum?: number;
  readonly maximum?: number;
  readonly exclusiveMinimum?: number;
  readonly exclusiveMaximum?: number;
  readonly multipleOf?: number;
}

export interface IntegerSchema extends SchemaBase {
  readonly kind: 'integer';
  readonly minimum?: number;
  readonly maximum?: number;
  readonly exclusiveMinimum?: number;
  readonly exclusiveMaximum?: number;
  readonly multipleOf?: number;
}

export interface BooleanSchema extends SchemaBase {
  readonly kind: 'boolean';
}

export interface NullSchema extends SchemaBase {
  readonly kind: 'null';
}

// — Compound schemas ——————————————————————————————————————————————

export interface ArraySchema extends SchemaBase {
  readonly kind: 'array';
  readonly items: SchemaNode;
  readonly minItems?: number;
  readonly maxItems?: number;
  readonly uniqueItems?: boolean;
}

export interface ObjectSchema extends SchemaBase {
  readonly kind: 'object';
  readonly properties: Record<string, PropertyDefinition>;
  readonly additionalProperties?: boolean | SchemaNode;
}

/** Describes a single property within an ObjectSchema. */
export interface PropertyDefinition {
  readonly schema: SchemaNode;
  readonly optional: boolean;
  readonly readonly?: boolean;
  readonly description?: string;
}

export interface UnionSchema extends SchemaBase {
  readonly kind: 'union';
  readonly schemas: readonly SchemaNode[];
}

export interface IntersectionSchema extends SchemaBase {
  readonly kind: 'intersection';
  readonly schemas: readonly SchemaNode[];
}

export interface EnumSchema extends SchemaBase {
  readonly kind: 'enum';
  readonly values: readonly (string | number | boolean)[];
}

export interface LiteralSchema extends SchemaBase {
  readonly kind: 'literal';
  readonly value: string | number | boolean;
}

export interface TupleSchema extends SchemaBase {
  readonly kind: 'tuple';
  readonly items: readonly SchemaNode[];
}

export interface RecordSchema extends SchemaBase {
  readonly kind: 'record';
  readonly keySchema: SchemaNode;
  readonly valueSchema: SchemaNode;
}

export interface RefSchema extends SchemaBase {
  readonly kind: 'ref';
  /** The name of the definition this reference points to. */
  readonly ref: string;
}

export interface AnySchema extends SchemaBase {
  readonly kind: 'any';
}

// ═══════════════════════════════════════════════════════════════════
//  Diagnostics — conversion loss reporting
// ═══════════════════════════════════════════════════════════════════

/**
 * Severity levels for conversion diagnostics.
 *
 * - `info`:    Cosmetic or representation difference, no semantic loss.
 * - `warning`: Information was lost but the output is still structurally usable.
 * - `error`:   Critical information lost; output may be semantically incorrect.
 */
export type DiagnosticSeverity = 'info' | 'warning' | 'error';

/** A single diagnostic emitted during conversion. */
export interface ConversionDiagnostic {
  readonly severity: DiagnosticSeverity;
  readonly message: string;
  /** Dot-separated path to the affected definition/property (e.g. "User.address.zipCode"). */
  readonly path?: string;
  /** The source construct that could not be represented (e.g. "pattern constraint"). */
  readonly sourceConstruct?: string;
  /** The target format that lacks the capability (e.g. "typescript"). */
  readonly targetFormat?: string;
}

// ═══════════════════════════════════════════════════════════════════
//  Format Adapter — the interface every adapter implements
// ═══════════════════════════════════════════════════════════════════

export interface ParseOptions {
  /** Original filename, used for error messages. */
  readonly filename?: string;
}

export interface GenerateOptions {
  /** Whether to include a header comment in the output. */
  readonly header?: boolean;
}

/**
 * Declares what schema features a format can natively represent.
 * Used by the loss detector to identify information that will be lost
 * during conversion to this format.
 */
export interface FormatCapabilities {
  readonly supportsConstraints: boolean;
  readonly supportsDescriptions: boolean;
  readonly supportsDefaults: boolean;
  readonly supportsNullable: boolean;
  readonly supportsOptional: boolean;
  readonly supportsUnions: boolean;
  readonly supportsIntersections: boolean;
  readonly supportsEnums: boolean;
  readonly supportsRecursion: boolean;
  readonly supportsTuples: boolean;
  readonly supportsRecords: boolean;
}

/**
 * A format adapter handles parsing source schemas into the IR
 * and generating target output from the IR.
 *
 * Implementing a new format requires:
 * 1. `parse()` — convert the format's source text into a SchemaDocument.
 * 2. `generate()` — produce the format's text from a SchemaDocument.
 * 3. `capabilities` — declare which IR features the format can represent.
 */
export interface FormatAdapter {
  /** Unique machine identifier (e.g. "typescript", "json-schema"). */
  readonly id: string;
  /** Human-readable display name. */
  readonly name: string;
  /** File extensions this format uses (e.g. [".ts"]). */
  readonly extensions: readonly string[];
  /** Optional aliases for format lookup (e.g. ["ts"]). */
  readonly aliases?: readonly string[];
  /** What schema features this format can natively represent. */
  readonly capabilities: FormatCapabilities;

  /** Parse source text into the internal schema representation. */
  parse(input: string, options?: ParseOptions): SchemaDocument;
  /** Generate output text from the internal schema representation. */
  generate(document: SchemaDocument, options?: GenerateOptions): string;
}

// ═══════════════════════════════════════════════════════════════════
//  Conversion Result
// ═══════════════════════════════════════════════════════════════════

/** The complete result of a schema conversion operation. */
export interface ConversionResult {
  /** The generated output text. */
  readonly output: string;
  /** Diagnostics emitted during conversion (loss warnings, etc.). */
  readonly diagnostics: readonly ConversionDiagnostic[];
}
