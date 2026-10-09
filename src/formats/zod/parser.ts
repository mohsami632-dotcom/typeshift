/**
 * Zod format adapter — parser.
 *
 * Parses TypeScript source files containing Zod schema declarations
 * into the SchemaIR. Uses the TypeScript Compiler API to walk the AST
 * and recognize z.xxx() call patterns.
 *
 * @module
 */

import ts from 'typescript';
import type {
  SchemaDocument,
  SchemaNode,
  PropertyDefinition,
  ParseOptions,
} from '../../core/types';
import { ParseError } from '../../core/errors';

/**
 * Parse Zod schema source text into a SchemaDocument.
 * Looks for top-level variable declarations whose initializers are z.xxx() calls.
 */
export function parseZod(source: string, options?: ParseOptions): SchemaDocument {
  const filename = options?.filename ?? 'input.ts';
  const sourceFile = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true);

  const definitions: Record<string, SchemaNode> = {};

  ts.forEachChild(sourceFile, (node) => {
    if (ts.isVariableStatement(node)) {
      for (const decl of node.declarationList.declarations) {
        if (ts.isIdentifier(decl.name) && decl.initializer) {
          const name = decl.name.text;
          const schema = parseZodExpression(decl.initializer, sourceFile);
          if (schema) {
            definitions[name] = schema;
          }
        }
      }
    }
  });

  if (Object.keys(definitions).length === 0) {
    throw new ParseError('No Zod schema declarations found in input.', { filename });
  }

  return {
    definitions,
    metadata: { sourceFormat: 'zod', sourceFile: filename },
  };
}

// ── Chain parsing ────────────────────────────────────────────────

interface ChainElement {
  method: string;
  args: readonly ts.Expression[];
}

/**
 * Parse a Zod expression (e.g. `z.string().min(1).describe('...')`) into a SchemaNode.
 *
 * Strategy: walk the call chain from outermost to innermost, collecting method
 * names and arguments. The innermost `z.xxx()` determines the base type,
 * and subsequent methods are applied as modifiers.
 */
export function parseZodExpression(expr: ts.Expression, sf: ts.SourceFile): SchemaNode | null {
  const chain: ChainElement[] = [];
  let current: ts.Expression = expr;

  // Walk the method chain inward
  while (ts.isCallExpression(current) && ts.isPropertyAccessExpression(current.expression)) {
    chain.unshift({
      method: current.expression.name.text,
      args: [...current.arguments],
    });
    current = current.expression.expression;
  }

  // If the target is not 'z', it may be a reference to another schema identifier (e.g. `UserSchema` or `Priority`)
  if (ts.isIdentifier(current) && current.text !== 'z') {
    let schema: SchemaNode = { kind: 'ref', ref: current.text };
    for (const mod of chain) {
      schema = applyModifier(schema, mod.method, mod.args, sf);
    }
    return schema;
  }

  // The innermost should be the `z` identifier
  if (!ts.isIdentifier(current) || current.text !== 'z') {
    return null;
  }

  if (chain.length === 0) return null;

  // First element is the base type (string, number, object, etc.)
  const [base, ...modifiers] = chain;
  let schema = parseBaseType(base.method, base.args, sf);
  if (!schema) return null;

  // Apply modifiers
  for (const mod of modifiers) {
    schema = applyModifier(schema, mod.method, mod.args, sf);
  }

  return schema;
}

/**
 * Extended parse that also extracts whether `.optional()` was called.
 * Used when parsing properties inside z.object({}).
 */
function parseZodPropertyExpression(
  expr: ts.Expression,
  sf: ts.SourceFile,
): { schema: SchemaNode; optional: boolean } | null {
  const chain: ChainElement[] = [];
  let current: ts.Expression = expr;

  while (ts.isCallExpression(current) && ts.isPropertyAccessExpression(current.expression)) {
    chain.unshift({
      method: current.expression.name.text,
      args: [...current.arguments],
    });
    current = current.expression.expression;
  }

  // Check if referencing another schema identifier (e.g. `priority: Priority` or `address: AddressSchema.optional()`)
  if (ts.isIdentifier(current) && current.text !== 'z') {
    let schema: SchemaNode = { kind: 'ref', ref: current.text };
    const isOptional = chain.some((c) => c.method === 'optional');

    for (const mod of chain) {
      if (mod.method === 'optional') continue;
      schema = applyModifier(schema, mod.method, mod.args, sf);
    }

    return { schema, optional: isOptional };
  }

  if (!ts.isIdentifier(current) || current.text !== 'z') return null;
  if (chain.length === 0) return null;

  const isOptional = chain.some((c) => c.method === 'optional');

  const [base, ...modifiers] = chain;
  let schema = parseBaseType(base.method, base.args, sf);
  if (!schema) return null;

  for (const mod of modifiers) {
    if (mod.method === 'optional') continue; // handled separately
    schema = applyModifier(schema, mod.method, mod.args, sf);
  }

  return { schema, optional: isOptional };
}

// ── Base type parsing ────────────────────────────────────────────

function parseBaseType(
  method: string,
  args: readonly ts.Expression[],
  sf: ts.SourceFile,
): SchemaNode | null {
  switch (method) {
    case 'string':
      return { kind: 'string' };
    case 'number':
      return { kind: 'number' };
    case 'bigint':
      return { kind: 'integer' };
    case 'boolean':
      return { kind: 'boolean' };
    case 'null':
      return { kind: 'null' };
    case 'undefined':
      return { kind: 'null' };
    case 'any':
    case 'unknown':
      return { kind: 'any' };

    case 'literal':
      return parseLiteral(args, sf);

    case 'object':
      return parseObject(args, sf);

    case 'array':
      return parseArray(args, sf);

    case 'tuple':
      return parseTuple(args, sf);

    case 'record':
      return parseRecord(args, sf);

    case 'union':
      return parseUnion(args, sf);

    case 'intersection':
      return parseIntersection(args, sf);

    case 'enum':
      return parseEnum(args, sf);

    default:
      return null;
  }
}

// ── Compound type parsing ────────────────────────────────────────

function parseObject(args: readonly ts.Expression[], sf: ts.SourceFile): SchemaNode | null {
  if (args.length === 0 || !ts.isObjectLiteralExpression(args[0])) {
    return { kind: 'object', properties: {} };
  }

  const objLiteral = args[0];
  const properties: Record<string, PropertyDefinition> = {};

  for (const prop of objLiteral.properties) {
    if (ts.isPropertyAssignment(prop) && prop.name) {
      const name = getPropertyName(prop.name, sf);
      if (!name) continue;

      const result = parseZodPropertyExpression(prop.initializer, sf);
      if (result) {
        properties[name] = {
          schema: result.schema,
          optional: result.optional,
        };
      }
    }
  }

  return { kind: 'object', properties };
}

function parseArray(args: readonly ts.Expression[], sf: ts.SourceFile): SchemaNode | null {
  if (args.length === 0) {
    return { kind: 'array', items: { kind: 'any' } };
  }
  const items = parseZodExpression(args[0], sf);
  if (!items) return { kind: 'array', items: { kind: 'any' } };
  return { kind: 'array', items };
}

function parseTuple(args: readonly ts.Expression[], sf: ts.SourceFile): SchemaNode | null {
  if (args.length === 0 || !ts.isArrayLiteralExpression(args[0])) {
    return { kind: 'tuple', items: [] };
  }

  const items: SchemaNode[] = [];
  for (const elem of args[0].elements) {
    const parsed = parseZodExpression(elem, sf);
    if (parsed) items.push(parsed);
  }

  return { kind: 'tuple', items };
}

function parseRecord(args: readonly ts.Expression[], sf: ts.SourceFile): SchemaNode | null {
  // z.record(valueSchema) or z.record(keySchema, valueSchema)
  if (args.length === 1) {
    const value = parseZodExpression(args[0], sf);
    return {
      kind: 'record',
      keySchema: { kind: 'string' },
      valueSchema: value ?? { kind: 'any' },
    };
  }
  if (args.length >= 2) {
    const key = parseZodExpression(args[0], sf);
    const value = parseZodExpression(args[1], sf);
    return {
      kind: 'record',
      keySchema: key ?? { kind: 'string' },
      valueSchema: value ?? { kind: 'any' },
    };
  }
  return { kind: 'record', keySchema: { kind: 'string' }, valueSchema: { kind: 'any' } };
}

function parseUnion(args: readonly ts.Expression[], sf: ts.SourceFile): SchemaNode | null {
  if (args.length === 0 || !ts.isArrayLiteralExpression(args[0])) {
    return null;
  }

  const schemas: SchemaNode[] = [];
  for (const elem of args[0].elements) {
    const parsed = parseZodExpression(elem, sf);
    if (parsed) schemas.push(parsed);
  }

  return { kind: 'union', schemas };
}

function parseIntersection(args: readonly ts.Expression[], sf: ts.SourceFile): SchemaNode | null {
  // z.intersection(a, b)
  const schemas: SchemaNode[] = [];
  for (const arg of args) {
    const parsed = parseZodExpression(arg, sf);
    if (parsed) schemas.push(parsed);
  }
  return schemas.length > 0 ? { kind: 'intersection', schemas } : null;
}

function parseEnum(args: readonly ts.Expression[], _sf: ts.SourceFile): SchemaNode | null {
  if (args.length === 0 || !ts.isArrayLiteralExpression(args[0])) {
    return null;
  }

  const values: (string | number | boolean)[] = [];
  for (const elem of args[0].elements) {
    if (ts.isStringLiteral(elem)) {
      values.push(elem.text);
    } else if (ts.isNumericLiteral(elem)) {
      values.push(Number(elem.text));
    } else if (elem.kind === ts.SyntaxKind.TrueKeyword) {
      values.push(true);
    } else if (elem.kind === ts.SyntaxKind.FalseKeyword) {
      values.push(false);
    }
  }

  return { kind: 'enum', values };
}

function parseLiteral(args: readonly ts.Expression[], _sf: ts.SourceFile): SchemaNode | null {
  if (args.length === 0) return null;
  const arg = args[0];

  if (ts.isStringLiteral(arg)) return { kind: 'literal', value: arg.text };
  if (ts.isNumericLiteral(arg)) return { kind: 'literal', value: Number(arg.text) };
  if (arg.kind === ts.SyntaxKind.TrueKeyword) return { kind: 'literal', value: true };
  if (arg.kind === ts.SyntaxKind.FalseKeyword) return { kind: 'literal', value: false };

  return null;
}

// ── Modifier application ─────────────────────────────────────────

function applyModifier(
  schema: SchemaNode,
  method: string,
  args: readonly ts.Expression[],
  _sf: ts.SourceFile,
): SchemaNode {
  switch (method) {
    case 'nullable':
      return { ...schema, nullable: true };

    case 'default': {
      const val = args.length > 0 ? evalLiteral(args[0]) : undefined;
      return { ...schema, default: val };
    }

    case 'describe': {
      const desc = args.length > 0 && ts.isStringLiteral(args[0]) ? args[0].text : undefined;
      return desc ? { ...schema, description: desc } : schema;
    }

    // String modifiers
    case 'min':
      if (schema.kind === 'string') {
        return { ...schema, minLength: evalNumber(args[0]) };
      }
      if (schema.kind === 'number' || schema.kind === 'integer') {
        return { ...schema, minimum: evalNumber(args[0]) };
      }
      if (schema.kind === 'array') {
        return { ...schema, minItems: evalNumber(args[0]) };
      }
      return schema;

    case 'max':
      if (schema.kind === 'string') {
        return { ...schema, maxLength: evalNumber(args[0]) };
      }
      if (schema.kind === 'number' || schema.kind === 'integer') {
        return { ...schema, maximum: evalNumber(args[0]) };
      }
      if (schema.kind === 'array') {
        return { ...schema, maxItems: evalNumber(args[0]) };
      }
      return schema;

    case 'length':
      if (schema.kind === 'string') {
        const len = evalNumber(args[0]);
        return { ...schema, minLength: len, maxLength: len };
      }
      if (schema.kind === 'array') {
        const len = evalNumber(args[0]);
        return { ...schema, minItems: len, maxItems: len };
      }
      return schema;

    case 'regex': {
      if (schema.kind === 'string' && args.length > 0 && ts.isRegularExpressionLiteral(args[0])) {
        const regexText = args[0].text;
        // Extract pattern from /pattern/flags
        const match = regexText.match(/^\/(.+)\/[gimsuy]*$/);
        if (match) {
          return { ...schema, pattern: match[1] };
        }
      }
      return schema;
    }

    // String format shortcuts
    case 'email':
      return schema.kind === 'string' ? { ...schema, format: 'email' } : schema;
    case 'url':
      return schema.kind === 'string' ? { ...schema, format: 'uri' } : schema;
    case 'uuid':
      return schema.kind === 'string' ? { ...schema, format: 'uuid' } : schema;
    case 'datetime':
      return schema.kind === 'string' ? { ...schema, format: 'date-time' } : schema;
    case 'ip':
      return schema.kind === 'string' ? { ...schema, format: 'ipv4' } : schema;

    // Number modifiers
    case 'int':
      if (schema.kind === 'number') {
        return { ...schema, kind: 'integer' } as SchemaNode;
      }
      return schema;

    case 'positive':
      if (schema.kind === 'number' || schema.kind === 'integer') {
        return { ...schema, exclusiveMinimum: 0 };
      }
      return schema;

    case 'negative':
      if (schema.kind === 'number' || schema.kind === 'integer') {
        return { ...schema, exclusiveMaximum: 0 };
      }
      return schema;

    case 'nonnegative':
      if (schema.kind === 'number' || schema.kind === 'integer') {
        return { ...schema, minimum: 0 };
      }
      return schema;

    case 'nonpositive':
      if (schema.kind === 'number' || schema.kind === 'integer') {
        return { ...schema, maximum: 0 };
      }
      return schema;

    case 'multipleOf':
      if (schema.kind === 'number' || schema.kind === 'integer') {
        return { ...schema, multipleOf: evalNumber(args[0]) };
      }
      return schema;

    // Array modifiers
    case 'nonempty':
      if (schema.kind === 'array') {
        return { ...schema, minItems: 1 };
      }
      return schema;

    // Passthrough modifiers (no IR impact, but not an error)
    case 'optional':
    case 'readonly':
    case 'brand':
    case 'pipe':
    case 'transform':
    case 'refine':
    case 'superRefine':
    case 'catch':
    case 'coerce':
    case 'strip':
    case 'passthrough':
    case 'strict':
      return schema;

    default:
      // Unknown modifier — ignore gracefully
      return schema;
  }
}

// ── Utility ──────────────────────────────────────────────────────

function getPropertyName(name: ts.PropertyName, sf: ts.SourceFile): string | null {
  if (ts.isIdentifier(name)) return name.text;
  if (ts.isStringLiteral(name)) return name.text;
  if (ts.isComputedPropertyName(name)) return name.expression.getText(sf);
  return null;
}

function evalNumber(expr: ts.Expression | undefined): number | undefined {
  if (!expr) return undefined;
  if (ts.isNumericLiteral(expr)) return Number(expr.text);
  return undefined;
}

function evalLiteral(expr: ts.Expression): unknown {
  if (ts.isStringLiteral(expr)) return expr.text;
  if (ts.isNumericLiteral(expr)) return Number(expr.text);
  if (expr.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (expr.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (expr.kind === ts.SyntaxKind.NullKeyword) return null;
  return undefined;
}
