/**
 * Loss detector — analyzes a SchemaDocument against a target format's
 * capabilities and emits diagnostics for any information that will be
 * lost or degraded during conversion.
 *
 * @module
 */

import type {
  ConversionDiagnostic,
  FormatCapabilities,
  SchemaDocument,
  SchemaNode,
  PropertyDefinition,
} from './types';

/**
 * Analyze a SchemaDocument and produce diagnostics for a given target format.
 *
 * This performs a structural walk of every definition and emits warnings
 * for each IR feature that the target format cannot natively represent.
 */
export function detectLoss(
  document: SchemaDocument,
  targetFormatId: string,
  targetCapabilities: FormatCapabilities,
): ConversionDiagnostic[] {
  const diagnostics: ConversionDiagnostic[] = [];

  for (const [name, schema] of Object.entries(document.definitions)) {
    walkNode(schema, name, targetFormatId, targetCapabilities, diagnostics);
  }

  return diagnostics;
}

/** Recursively walk a schema node and emit diagnostics. */
function walkNode(
  node: SchemaNode,
  path: string,
  targetFormat: string,
  caps: FormatCapabilities,
  out: ConversionDiagnostic[],
): void {
  // Check base-level features
  if (node.description && !caps.supportsDescriptions) {
    out.push({
      severity: 'info',
      message: `Description will be dropped: "${truncate(node.description, 60)}"`,
      path,
      sourceConstruct: 'description',
      targetFormat,
    });
  }

  if (node.nullable && !caps.supportsNullable) {
    out.push({
      severity: 'warning',
      message: 'Nullable modifier will be dropped.',
      path,
      sourceConstruct: 'nullable',
      targetFormat,
    });
  }

  if (node.default !== undefined && !caps.supportsDefaults) {
    out.push({
      severity: 'warning',
      message: `Default value will be dropped: ${JSON.stringify(node.default)}`,
      path,
      sourceConstruct: 'default value',
      targetFormat,
    });
  }

  // Check kind-specific features
  switch (node.kind) {
    case 'string':
      checkConstraints(node, path, targetFormat, caps, out, [
        ['minLength', node.minLength],
        ['maxLength', node.maxLength],
        ['pattern', node.pattern],
        ['format', node.format],
      ]);
      break;

    case 'number':
    case 'integer':
      checkConstraints(node, path, targetFormat, caps, out, [
        ['minimum', node.minimum],
        ['maximum', node.maximum],
        ['exclusiveMinimum', node.exclusiveMinimum],
        ['exclusiveMaximum', node.exclusiveMaximum],
        ['multipleOf', node.multipleOf],
      ]);
      break;

    case 'array':
      walkNode(node.items, `${path}[]`, targetFormat, caps, out);
      checkConstraints(node, path, targetFormat, caps, out, [
        ['minItems', node.minItems],
        ['maxItems', node.maxItems],
        ['uniqueItems', node.uniqueItems],
      ]);
      break;

    case 'object':
      for (const [propName, propDef] of Object.entries(node.properties)) {
        checkProperty(propDef, `${path}.${propName}`, targetFormat, caps, out);
        walkNode(propDef.schema, `${path}.${propName}`, targetFormat, caps, out);
      }
      break;

    case 'union':
      if (!caps.supportsUnions) {
        out.push({
          severity: 'warning',
          message: 'Union type cannot be natively represented.',
          path,
          sourceConstruct: 'union',
          targetFormat,
        });
      }
      for (let i = 0; i < node.schemas.length; i++) {
        walkNode(node.schemas[i], `${path}[${i}]`, targetFormat, caps, out);
      }
      break;

    case 'intersection':
      if (!caps.supportsIntersections) {
        out.push({
          severity: 'warning',
          message: 'Intersection type cannot be natively represented.',
          path,
          sourceConstruct: 'intersection',
          targetFormat,
        });
      }
      for (let i = 0; i < node.schemas.length; i++) {
        walkNode(node.schemas[i], `${path}[${i}]`, targetFormat, caps, out);
      }
      break;

    case 'enum':
      if (!caps.supportsEnums) {
        out.push({
          severity: 'warning',
          message: 'Enum type cannot be natively represented.',
          path,
          sourceConstruct: 'enum',
          targetFormat,
        });
      }
      break;

    case 'tuple':
      if (!caps.supportsTuples) {
        out.push({
          severity: 'warning',
          message: 'Tuple type will be represented as a generic array.',
          path,
          sourceConstruct: 'tuple',
          targetFormat,
        });
      }
      for (let i = 0; i < node.items.length; i++) {
        walkNode(node.items[i], `${path}[${i}]`, targetFormat, caps, out);
      }
      break;

    case 'record':
      if (!caps.supportsRecords) {
        out.push({
          severity: 'warning',
          message: 'Record type cannot be natively represented.',
          path,
          sourceConstruct: 'record',
          targetFormat,
        });
      }
      walkNode(node.valueSchema, `${path}[value]`, targetFormat, caps, out);
      break;

    case 'ref':
      if (!caps.supportsRecursion) {
        // We can't statically tell if this ref is recursive without a full graph walk.
        // Flag as info — the generator should decide if it's an error.
        out.push({
          severity: 'info',
          message: `Reference to "${node.ref}" — recursion may not be supported.`,
          path,
          sourceConstruct: 'reference',
          targetFormat,
        });
      }
      break;

    case 'literal':
    case 'boolean':
    case 'null':
    case 'any':
      // No special loss concerns for these basic types.
      break;
  }
}

function checkProperty(
  propDef: PropertyDefinition,
  path: string,
  targetFormat: string,
  caps: FormatCapabilities,
  out: ConversionDiagnostic[],
): void {
  if (propDef.optional && !caps.supportsOptional) {
    out.push({
      severity: 'warning',
      message: 'Optional modifier will be dropped.',
      path,
      sourceConstruct: 'optional property',
      targetFormat,
    });
  }
  if (propDef.description && !caps.supportsDescriptions) {
    out.push({
      severity: 'info',
      message: `Property description will be dropped: "${truncate(propDef.description, 60)}"`,
      path,
      sourceConstruct: 'property description',
      targetFormat,
    });
  }
}

function checkConstraints(
  _node: SchemaNode,
  path: string,
  targetFormat: string,
  caps: FormatCapabilities,
  out: ConversionDiagnostic[],
  constraints: [string, unknown][],
): void {
  if (!caps.supportsConstraints) {
    for (const [name, value] of constraints) {
      if (value !== undefined) {
        out.push({
          severity: 'warning',
          message: `Constraint "${name}" (value: ${JSON.stringify(value)}) will be dropped.`,
          path,
          sourceConstruct: `${name} constraint`,
          targetFormat,
        });
      }
    }
  }
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return `${str.slice(0, maxLen - 3)}...`;
}
