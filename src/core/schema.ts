/**
 * Builder utilities for constructing SchemaIR nodes.
 *
 * These provide a more ergonomic way to build schemas in tests and adapters
 * compared to writing object literals directly.
 *
 * @module
 */

import type {
  AnySchema,
  ArraySchema,
  BooleanSchema,
  EnumSchema,
  IntegerSchema,
  IntersectionSchema,
  LiteralSchema,
  NullSchema,
  NumberSchema,
  ObjectSchema,
  PropertyDefinition,
  RecordSchema,
  RefSchema,
  SchemaBase,
  SchemaDocument,
  SchemaNode,
  StringSchema,
  TupleSchema,
  UnionSchema,
} from './types';

// ── Primitives ───────────────────────────────────────────────────

export function string(opts?: Omit<StringSchema, 'kind'>): StringSchema {
  return { kind: 'string', ...opts };
}

export function number(opts?: Omit<NumberSchema, 'kind'>): NumberSchema {
  return { kind: 'number', ...opts };
}

export function integer(opts?: Omit<IntegerSchema, 'kind'>): IntegerSchema {
  return { kind: 'integer', ...opts };
}

export function boolean(opts?: SchemaBase): BooleanSchema {
  return { kind: 'boolean', ...opts };
}

export function nullSchema(opts?: SchemaBase): NullSchema {
  return { kind: 'null', ...opts };
}

export function any(opts?: SchemaBase): AnySchema {
  return { kind: 'any', ...opts };
}

// ── Compound ─────────────────────────────────────────────────────

export function array(items: SchemaNode, opts?: Omit<ArraySchema, 'kind' | 'items'>): ArraySchema {
  return { kind: 'array', items, ...opts };
}

export function object(
  properties: Record<string, PropertyDefinition>,
  opts?: Omit<ObjectSchema, 'kind' | 'properties'>,
): ObjectSchema {
  return { kind: 'object', properties, ...opts };
}

export function union(schemas: readonly SchemaNode[], opts?: SchemaBase): UnionSchema {
  return { kind: 'union', schemas, ...opts };
}

export function intersection(
  schemas: readonly SchemaNode[],
  opts?: SchemaBase,
): IntersectionSchema {
  return { kind: 'intersection', schemas, ...opts };
}

export function enumSchema(
  values: readonly (string | number | boolean)[],
  opts?: SchemaBase,
): EnumSchema {
  return { kind: 'enum', values, ...opts };
}

export function literal(value: string | number | boolean, opts?: SchemaBase): LiteralSchema {
  return { kind: 'literal', value, ...opts };
}

export function tuple(items: readonly SchemaNode[], opts?: SchemaBase): TupleSchema {
  return { kind: 'tuple', items, ...opts };
}

export function record(
  keySchema: SchemaNode,
  valueSchema: SchemaNode,
  opts?: SchemaBase,
): RecordSchema {
  return { kind: 'record', keySchema, valueSchema, ...opts };
}

export function ref(refName: string, opts?: SchemaBase): RefSchema {
  return { kind: 'ref', ref: refName, ...opts };
}

// ── Property helper ──────────────────────────────────────────────

export function prop(
  schema: SchemaNode,
  optionalOrExtra?: boolean | { optional?: boolean; readonly?: boolean; description?: string },
  extra?: { readonly?: boolean; description?: string },
): PropertyDefinition {
  if (typeof optionalOrExtra === 'object' && optionalOrExtra !== null) {
    return {
      schema,
      optional: optionalOrExtra.optional ?? false,
      readonly: optionalOrExtra.readonly,
      description: optionalOrExtra.description,
    };
  }
  return {
    schema,
    optional: optionalOrExtra ?? false,
    readonly: extra?.readonly,
    description: extra?.description,
  };
}

/** Shorthand for a required property. */
export function required(schema: SchemaNode, description?: string): PropertyDefinition {
  return prop(schema, false, { description });
}

/** Shorthand for an optional property. */
export function optional(schema: SchemaNode, description?: string): PropertyDefinition {
  return prop(schema, true, { description });
}

// ── Document ─────────────────────────────────────────────────────

export function document(
  definitions: Record<string, SchemaNode>,
  metadata?: SchemaDocument['metadata'],
): SchemaDocument {
  return { definitions, metadata };
}

// Aliases for convenience
export const nullType = nullSchema;
export const enumType = enumSchema;
export const optProp = optional;
export const reqProp = required;
