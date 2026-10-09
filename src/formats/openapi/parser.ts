/**
 * OpenAPI 3.1 format adapter — parser.
 *
 * Parses OpenAPI 3.1 specifications (JSON format) into SchemaIR.
 * Extracts data schemas from `components.schemas` and preserves
 * constraints, descriptions, references, and types according to the
 * OpenAPI 3.1 / JSON Schema 2020-12 specification.
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
 * Parse an OpenAPI 3.1 schema specification into a SchemaDocument.
 *
 * Primarily extracts schemas declared under `components.schemas`.
 * Also supports root-level schema definitions for flexibility.
 */
export function parseOpenApi(source: string, options?: ParseOptions): SchemaDocument {
  const filename = options?.filename ?? 'openapi.json';

  // Check for common YAML input and provide an actionable diagnostic
  const trimmed = source.trim();
  if (
    !trimmed.startsWith('{') &&
    (trimmed.startsWith('openapi:') ||
      trimmed.startsWith('---') ||
      trimmed.includes('\nopenapi:') ||
      trimmed.includes('components:\n'))
  ) {
    throw new ParseError(
      'YAML format (.yaml/.yml) is not yet natively supported for OpenAPI. ' +
        'Please convert your OpenAPI specification to JSON format (e.g. openapi.json) before converting with typeshift. ' +
        'Native YAML parsing is tracked on the project roadmap.',
      { filename },
    );
  }

  let root: Record<string, unknown>;
  try {
    root = JSON.parse(source) as Record<string, unknown>;
  } catch {
    throw new ParseError('Invalid JSON input in OpenAPI document.', { filename });
  }

  if (typeof root !== 'object' || root === null || Array.isArray(root)) {
    throw new ParseError('OpenAPI root must be an object.', { filename });
  }

  // Validate OpenAPI version if specified
  if (typeof root.openapi === 'string') {
    const version = root.openapi.trim();
    if (version.startsWith('2.')) {
      throw new ParseError(
        `OpenAPI 2.0 (Swagger) is not supported. Please upgrade to OpenAPI 3.1 (detected: "${version}").`,
        { filename },
      );
    }
  }

  const definitions: Record<string, SchemaNode> = {};

  // Extract components.schemas
  const components = (root.components ?? {}) as Record<string, unknown>;
  const schemas = (components.schemas ?? {}) as Record<string, unknown>;

  // Collect known schema names
  const knownDefs = new Set<string>(Object.keys(schemas));

  for (const [name, schemaObj] of Object.entries(schemas)) {
    if (typeof schemaObj === 'object' && schemaObj !== null) {
      definitions[name] = parseSchemaObject(schemaObj as Record<string, unknown>, knownDefs);
    }
  }

  // Fallback: $defs / definitions at root (if hybrid document)
  if (Object.keys(definitions).length === 0) {
    const defs = (root.$defs ?? root.definitions ?? {}) as Record<string, unknown>;
    for (const [name, schemaObj] of Object.entries(defs)) {
      if (typeof schemaObj === 'object' && schemaObj !== null) {
        definitions[name] = parseSchemaObject(schemaObj as Record<string, unknown>, knownDefs);
      }
    }
  }

  // Fallback: root-level schema if neither components.schemas nor $defs exist
  if (Object.keys(definitions).length === 0) {
    if (root.type || root.properties || root.oneOf || root.anyOf || root.allOf || root.enum) {
      const rootName = (root.title as string) ?? 'Root';
      definitions[rootName] = parseSchemaObject(root, knownDefs);
    }
  }

  if (Object.keys(definitions).length === 0) {
    throw new ParseError(
      'No schema definitions found in OpenAPI document (checked components.schemas and root).',
      { filename },
    );
  }

  // Extract info metadata
  const info = (root.info ?? {}) as Record<string, unknown>;
  const title = (info.title as string | undefined) ?? (root.title as string | undefined);
  const description =
    (info.description as string | undefined) ?? (root.description as string | undefined);

  return {
    definitions,
    metadata: {
      title,
      description,
      sourceFormat: 'openapi',
      sourceFile: filename,
    },
  };
}

// ── Schema object parsing ─────────────────────────────────────────

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

  // Handle OpenAPI 3.1 nullable via type array: { "type": ["string", "null"] }
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

  // Handle OpenAPI 3.0 transitional nullable boolean: { "type": "string", "nullable": true }
  const isNullable = schema.nullable === true;

  if (typeof type === 'string') {
    const node = parseSingleType(type, schema, knownDefs);
    return isNullable ? { ...node, nullable: true } : node;
  }

  // Implicit object if properties are present without explicit type
  if (schema.properties) {
    const node = parseObjectSchema(schema, knownDefs);
    return isNullable ? { ...node, nullable: true } : node;
  }

  // No type specified — treat as any
  const node = withMetadata({ kind: 'any' }, schema);
  return isNullable ? { ...node, nullable: true } : node;
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
  // Handle prefixItems (OpenAPI 3.1 / JSON Schema 2020-12 tuple array)
  const prefixItems = schema.prefixItems;
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
      readonly: propSchema.readOnly === true ? true : undefined,
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
  // Standard OpenAPI 3.1 reference: "#/components/schemas/User"
  const openApiMatch = refStr.match(/^#\/components\/schemas\/(.+)$/);
  if (openApiMatch) {
    return { kind: 'ref', ref: openApiMatch[1] };
  }

  // JSON Schema style reference: "#/$defs/User" or "#/definitions/User"
  const jsonSchemaMatch = refStr.match(/^#\/(?:\$defs|definitions)\/(.+)$/);
  if (jsonSchemaMatch) {
    return { kind: 'ref', ref: jsonSchemaMatch[1] };
  }

  // Fallback: retain string reference
  return { kind: 'ref', ref: refStr };
}

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
