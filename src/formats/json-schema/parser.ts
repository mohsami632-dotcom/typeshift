/**
 * JSON Schema format adapter — parser.
 *
 * Parses JSON Schema (draft-07 / draft-2020-12 compatible subset) into SchemaIR.
 *
 * @module
 */

import type {
  SchemaDocument,
  SchemaNode,
  PropertyDefinition,
  ParseOptions,
} from '../../core/types';
import { ParseError } from '../../core/errors';

/**
 * Parse a JSON Schema string into a SchemaDocument.
 * Supports root-level object schemas with `definitions` or `$defs`,
 * and standalone schemas (wrapped into a single definition).
 */
export function parseJsonSchema(source: string, options?: ParseOptions): SchemaDocument {
  const filename = options?.filename ?? 'input.json';

  let root: Record<string, unknown>;
  try {
    root = JSON.parse(source) as Record<string, unknown>;
  } catch {
    throw new ParseError('Invalid JSON input.', { filename });
  }

  if (typeof root !== 'object' || root === null || Array.isArray(root)) {
    throw new ParseError('JSON Schema root must be an object.', { filename });
  }

  const definitions: Record<string, SchemaNode> = {};

  // Extract $defs / definitions
  const defs = (root.$defs ?? root.definitions ?? {}) as Record<string, unknown>;
  const defNames = new Set<string>(Object.keys(defs));

  for (const [name, schema] of Object.entries(defs)) {
    definitions[name] = parseSchemaObject(schema as Record<string, unknown>, defNames);
  }

  // Parse the root schema itself (if it has properties or type)
  if (root.type || root.properties || root.oneOf || root.anyOf || root.allOf || root.enum) {
    const rootName = (root.title as string) ?? 'Root';
    definitions[rootName] = parseSchemaObject(root, defNames);
  }

  if (Object.keys(definitions).length === 0) {
    throw new ParseError('No schema definitions found in input.', { filename });
  }

  return {
    definitions,
    metadata: {
      title: root.title as string | undefined,
      description: root.description as string | undefined,
      sourceFormat: 'json-schema',
      sourceFile: filename,
    },
  };
}

// ── Schema parsing ───────────────────────────────────────────────

function parseSchemaObject(schema: Record<string, unknown>, knownDefs: Set<string>): SchemaNode {
  // Handle $ref
  if (typeof schema.$ref === 'string') {
    return parseRef(schema.$ref);
  }

  // Handle oneOf / anyOf → union
  if (Array.isArray(schema.oneOf) || Array.isArray(schema.anyOf)) {
    const variants = (schema.oneOf ?? schema.anyOf) as Record<string, unknown>[];
    const schemas = variants.map((v) => parseSchemaObject(v, knownDefs));
    return withMetadata({ kind: 'union', schemas }, schema);
  }

  // Handle allOf → intersection
  if (Array.isArray(schema.allOf)) {
    const schemas = (schema.allOf as Record<string, unknown>[]).map((v) =>
      parseSchemaObject(v, knownDefs),
    );
    if (schemas.length === 1) {
      return withMetadata(schemas[0], schema);
    }
    return withMetadata({ kind: 'intersection', schemas }, schema);
  }

  // Handle enum
  if (Array.isArray(schema.enum)) {
    return withMetadata(
      { kind: 'enum', values: schema.enum as (string | number | boolean)[] },
      schema,
    );
  }

  // Handle const → literal
  if (schema.const !== undefined) {
    return withMetadata(
      { kind: 'literal', value: schema.const as string | number | boolean },
      schema,
    );
  }

  // Handle type
  const type = schema.type;

  // Handle nullable via type array: { "type": ["string", "null"] }
  if (Array.isArray(type)) {
    const types = type as string[];
    const hasNull = types.includes('null');
    const nonNullTypes = types.filter((t) => t !== 'null');

    if (nonNullTypes.length === 1) {
      const node = parseSingleType(nonNullTypes[0], schema, knownDefs);
      return hasNull ? { ...node, nullable: true } : node;
    }

    // Multiple non-null types → union
    const schemas = nonNullTypes.map((t) => parseSingleType(t, schema, knownDefs));
    const node: SchemaNode = { kind: 'union', schemas };
    return withMetadata(hasNull ? { ...node, nullable: true } : node, schema);
  }

  if (typeof type === 'string') {
    return parseSingleType(type, schema, knownDefs);
  }

  // No type specified — treat as any
  return withMetadata({ kind: 'any' }, schema);
}

function parseSingleType(
  type: string,
  schema: Record<string, unknown>,
  knownDefs: Set<string>,
): SchemaNode {
  switch (type) {
    case 'string':
      return withMetadata(
        {
          kind: 'string',
          minLength: asNumber(schema.minLength),
          maxLength: asNumber(schema.maxLength),
          pattern: asString(schema.pattern),
          format: asString(schema.format),
        },
        schema,
      );

    case 'number':
      return withMetadata(parseNumericSchema('number', schema), schema);

    case 'integer':
      return withMetadata(parseNumericSchema('integer', schema), schema);

    case 'boolean':
      return withMetadata({ kind: 'boolean' }, schema);

    case 'null':
      return withMetadata({ kind: 'null' }, schema);

    case 'array':
      return withMetadata(parseArraySchema(schema, knownDefs), schema);

    case 'object':
      return withMetadata(parseObjectSchema(schema, knownDefs), schema);

    default:
      return withMetadata({ kind: 'any' }, schema);
  }
}

function parseNumericSchema(
  kind: 'number' | 'integer',
  schema: Record<string, unknown>,
): SchemaNode {
  return {
    kind,
    minimum: asNumber(schema.minimum),
    maximum: asNumber(schema.maximum),
    exclusiveMinimum: asNumber(schema.exclusiveMinimum),
    exclusiveMaximum: asNumber(schema.exclusiveMaximum),
    multipleOf: asNumber(schema.multipleOf),
  };
}

function parseArraySchema(schema: Record<string, unknown>, knownDefs: Set<string>): SchemaNode {
  // Handle tuple arrays (items is an array → prefixItems in 2020-12)
  const prefixItems = schema.prefixItems ?? schema.items;
  if (Array.isArray(prefixItems)) {
    const items = (prefixItems as Record<string, unknown>[]).map((i) =>
      parseSchemaObject(i, knownDefs),
    );
    return { kind: 'tuple', items };
  }

  const items = schema.items
    ? parseSchemaObject(schema.items as Record<string, unknown>, knownDefs)
    : ({ kind: 'any' } as SchemaNode);

  return {
    kind: 'array',
    items,
    minItems: asNumber(schema.minItems),
    maxItems: asNumber(schema.maxItems),
    uniqueItems: asBool(schema.uniqueItems),
  };
}

function parseObjectSchema(schema: Record<string, unknown>, knownDefs: Set<string>): SchemaNode {
  const properties: Record<string, PropertyDefinition> = {};
  const required = new Set<string>(
    Array.isArray(schema.required) ? (schema.required as string[]) : [],
  );

  const props = (schema.properties ?? {}) as Record<string, Record<string, unknown>>;

  for (const [name, propSchema] of Object.entries(props)) {
    const node = parseSchemaObject(propSchema, knownDefs);
    properties[name] = {
      schema: node,
      optional: !required.has(name),
      description: asString(propSchema.description),
    };
  }

  // Handle additionalProperties
  let additionalProperties: boolean | SchemaNode | undefined;
  if (schema.additionalProperties === false) {
    additionalProperties = false;
  } else if (
    typeof schema.additionalProperties === 'object' &&
    schema.additionalProperties !== null
  ) {
    additionalProperties = parseSchemaObject(
      schema.additionalProperties as Record<string, unknown>,
      knownDefs,
    );
  }

  // If no explicit properties but additionalProperties is a schema → record
  if (
    Object.keys(properties).length === 0 &&
    additionalProperties !== undefined &&
    additionalProperties !== false &&
    typeof additionalProperties === 'object'
  ) {
    return {
      kind: 'record',
      keySchema: { kind: 'string' },
      valueSchema: additionalProperties,
    };
  }

  return { kind: 'object', properties, additionalProperties };
}

function parseRef(refStr: string): SchemaNode {
  // Handle JSON Pointer refs: "#/definitions/Foo" or "#/$defs/Foo"
  const match = refStr.match(/^#\/(?:\$defs|definitions)\/(.+)$/);
  if (match) {
    return { kind: 'ref', ref: match[1] };
  }
  // If we can't resolve, use the ref string as-is
  return { kind: 'ref', ref: refStr };
}

// ── Metadata helpers ─────────────────────────────────────────────

function withMetadata(node: SchemaNode, schema: Record<string, unknown>): SchemaNode {
  const description = asString(schema.description);
  const defaultValue = schema.default;

  if (description || defaultValue !== undefined) {
    return {
      ...node,
      ...(description ? { description } : {}),
      ...(defaultValue !== undefined ? { default: defaultValue } : {}),
    };
  }

  return node;
}

function asNumber(val: unknown): number | undefined {
  return typeof val === 'number' ? val : undefined;
}

function asString(val: unknown): string | undefined {
  return typeof val === 'string' ? val : undefined;
}

function asBool(val: unknown): boolean | undefined {
  return typeof val === 'boolean' ? val : undefined;
}
