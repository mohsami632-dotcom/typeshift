/**
 * TypeScript format adapter — parser.
 *
 * Parses TypeScript source files containing interface/type declarations
 * into the SchemaIR. Uses the TypeScript Compiler API for correct AST analysis.
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
 * Parse TypeScript source text containing type/interface declarations.
 * Extracts all top-level type aliases and interface declarations.
 */
export function parseTypeScript(source: string, options?: ParseOptions): SchemaDocument {
  const filename = options?.filename ?? 'input.ts';

  const sourceFile = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true);

  const definitions: Record<string, SchemaNode> = {};
  const knownTypeNames = collectTypeNames(sourceFile);

  ts.forEachChild(sourceFile, (node) => {
    if (ts.isInterfaceDeclaration(node)) {
      const name = node.name.text;
      definitions[name] = parseInterface(node, sourceFile, knownTypeNames);
    } else if (ts.isTypeAliasDeclaration(node)) {
      const name = node.name.text;
      definitions[name] = parseTypeNode(node.type, sourceFile, knownTypeNames);

      // Carry over JSDoc description to the top-level node
      const desc = getDescription(node, sourceFile);
      if (desc && !definitions[name].description) {
        definitions[name] = { ...definitions[name], description: desc };
      }
    }
  });

  if (Object.keys(definitions).length === 0) {
    throw new ParseError('No type or interface declarations found in input.', { filename });
  }

  return {
    definitions,
    metadata: { sourceFormat: 'typescript', sourceFile: filename },
  };
}

// ── Helpers ──────────────────────────────────────────────────────

/** Collect all top-level type/interface names for reference resolution. */
function collectTypeNames(sourceFile: ts.SourceFile): Set<string> {
  const names = new Set<string>();
  ts.forEachChild(sourceFile, (node) => {
    if (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) {
      names.add(node.name.text);
    }
  });
  return names;
}

function parseInterface(
  node: ts.InterfaceDeclaration,
  sf: ts.SourceFile,
  known: Set<string>,
): SchemaNode {
  const properties: Record<string, PropertyDefinition> = {};

  for (const member of node.members) {
    if (ts.isPropertySignature(member) && member.name && member.type) {
      const propName = member.name.getText(sf);
      const isOptional = member.questionToken !== undefined;
      const isReadonly = hasModifier(member, ts.SyntaxKind.ReadonlyKeyword);
      const description = getDescription(member, sf);

      const { schema, nullable } = extractNullable(member.type, sf, known);
      const finalSchema = nullable ? { ...schema, nullable: true } : schema;

      properties[propName] = {
        schema: finalSchema,
        optional: isOptional,
        readonly: isReadonly || undefined,
        description,
      };
    }
  }

  // Handle interface extends
  if (node.heritageClauses && node.heritageClauses.length > 0) {
    const baseRefs: SchemaNode[] = [];
    for (const clause of node.heritageClauses) {
      if (clause.token === ts.SyntaxKind.ExtendsKeyword) {
        for (const type of clause.types) {
          const name = type.expression.getText(sf);
          baseRefs.push({ kind: 'ref', ref: name });
        }
      }
    }

    if (baseRefs.length > 0) {
      const objectNode: SchemaNode = {
        kind: 'object',
        properties,
        description: getDescription(node, sf),
      };
      return {
        kind: 'intersection',
        schemas: [...baseRefs, objectNode],
        description: getDescription(node, sf),
      };
    }
  }

  return {
    kind: 'object',
    properties,
    description: getDescription(node, sf),
  };
}

/**
 * Convert a TypeScript TypeNode into a SchemaNode.
 */
function parseTypeNode(typeNode: ts.TypeNode, sf: ts.SourceFile, known: Set<string>): SchemaNode {
  // Keyword types
  switch (typeNode.kind) {
    case ts.SyntaxKind.StringKeyword:
      return { kind: 'string' };
    case ts.SyntaxKind.NumberKeyword:
      return { kind: 'number' };
    case ts.SyntaxKind.BooleanKeyword:
      return { kind: 'boolean' };
    case ts.SyntaxKind.NullKeyword:
      return { kind: 'null' };
    case ts.SyntaxKind.UndefinedKeyword:
      return { kind: 'null' }; // Approximate: undefined → null in schema world
    case ts.SyntaxKind.AnyKeyword:
    case ts.SyntaxKind.UnknownKeyword:
      return { kind: 'any' };
    case ts.SyntaxKind.VoidKeyword:
      return { kind: 'null' };
  }

  // Array type: string[]
  if (ts.isArrayTypeNode(typeNode)) {
    return {
      kind: 'array',
      items: parseTypeNode(typeNode.elementType, sf, known),
    };
  }

  // Parenthesized: (A | B)
  if (ts.isParenthesizedTypeNode(typeNode)) {
    return parseTypeNode(typeNode.type, sf, known);
  }

  // Union type: A | B
  if (ts.isUnionTypeNode(typeNode)) {
    return parseUnion(typeNode, sf, known);
  }

  // Intersection type: A & B
  if (ts.isIntersectionTypeNode(typeNode)) {
    const schemas = typeNode.types.map((t) => parseTypeNode(t, sf, known));
    return { kind: 'intersection', schemas };
  }

  // Literal type: 'hello', 42, true
  if (ts.isLiteralTypeNode(typeNode)) {
    return parseLiteral(typeNode);
  }

  // Type literal: { foo: string; bar: number }
  if (ts.isTypeLiteralNode(typeNode)) {
    const properties: Record<string, PropertyDefinition> = {};
    for (const member of typeNode.members) {
      if (ts.isPropertySignature(member) && member.name && member.type) {
        const propName = member.name.getText(sf);
        const isOptional = member.questionToken !== undefined;
        const isReadonly = hasModifier(member, ts.SyntaxKind.ReadonlyKeyword);
        const description = getDescription(member, sf);
        const { schema, nullable } = extractNullable(member.type, sf, known);
        const finalSchema = nullable ? { ...schema, nullable: true } : schema;

        properties[propName] = {
          schema: finalSchema,
          optional: isOptional,
          readonly: isReadonly || undefined,
          description,
        };
      }
    }
    return { kind: 'object', properties };
  }

  // Tuple type: [string, number]
  if (ts.isTupleTypeNode(typeNode)) {
    const items = typeNode.elements.map((el) => {
      // Handle named tuple elements
      if (ts.isNamedTupleMember(el)) {
        return parseTypeNode(el.type, sf, known);
      }
      return parseTypeNode(el, sf, known);
    });
    return { kind: 'tuple', items };
  }

  // Type reference: Array<T>, Record<K,V>, CustomType
  if (ts.isTypeReferenceNode(typeNode)) {
    return parseTypeReference(typeNode, sf, known);
  }

  // Fallback
  return { kind: 'any' };
}

function parseTypeReference(
  node: ts.TypeReferenceNode,
  sf: ts.SourceFile,
  known: Set<string>,
): SchemaNode {
  const name = node.typeName.getText(sf);
  const typeArgs = node.typeArguments;

  // Built-in generic types
  if (name === 'Array' && typeArgs && typeArgs.length === 1) {
    return {
      kind: 'array',
      items: parseTypeNode(typeArgs[0], sf, known),
    };
  }

  if (name === 'Record' && typeArgs && typeArgs.length === 2) {
    return {
      kind: 'record',
      keySchema: parseTypeNode(typeArgs[0], sf, known),
      valueSchema: parseTypeNode(typeArgs[1], sf, known),
    };
  }

  if (name === 'Set' && typeArgs && typeArgs.length === 1) {
    return {
      kind: 'array',
      items: parseTypeNode(typeArgs[0], sf, known),
      uniqueItems: true,
    };
  }

  // Reference to another known type in the same file
  if (known.has(name)) {
    return { kind: 'ref', ref: name };
  }

  // Unknown type reference → any with a note
  return { kind: 'any' };
}

function parseUnion(node: ts.UnionTypeNode, sf: ts.SourceFile, known: Set<string>): SchemaNode {
  // Filter out null and undefined from union members
  const { schemas: members, nullable } = extractNullableUnion(node, sf, known);

  if (members.length === 0) {
    return { kind: 'null' };
  }

  // Check if all members are string/number/boolean literals → enum
  if (members.every((m) => m.kind === 'literal')) {
    const values = members.map((m) => (m as { value: string | number | boolean }).value);
    const allSameType = values.every((v) => typeof v === typeof values[0]);
    if (allSameType) {
      const schema: SchemaNode = { kind: 'enum', values };
      return nullable ? { ...schema, nullable: true } : schema;
    }
  }

  if (members.length === 1) {
    return nullable ? { ...members[0], nullable: true } : members[0];
  }

  const schema: SchemaNode = { kind: 'union', schemas: members };
  return nullable ? { ...schema, nullable: true } : schema;
}

function extractNullable(
  typeNode: ts.TypeNode,
  sf: ts.SourceFile,
  known: Set<string>,
): { schema: SchemaNode; nullable: boolean } {
  if (ts.isUnionTypeNode(typeNode)) {
    const { schemas, nullable } = extractNullableUnion(typeNode, sf, known);

    if (schemas.length === 0) {
      return { schema: { kind: 'null' }, nullable: false };
    }
    if (schemas.length === 1) {
      return { schema: schemas[0], nullable };
    }

    // Check for enum pattern
    if (schemas.every((m) => m.kind === 'literal')) {
      const values = schemas.map((m) => (m as { value: string | number | boolean }).value);
      return { schema: { kind: 'enum', values }, nullable };
    }

    return { schema: { kind: 'union', schemas }, nullable };
  }

  return { schema: parseTypeNode(typeNode, sf, known), nullable: false };
}

function extractNullableUnion(
  node: ts.UnionTypeNode,
  sf: ts.SourceFile,
  known: Set<string>,
): { schemas: SchemaNode[]; nullable: boolean } {
  let nullable = false;
  const schemas: SchemaNode[] = [];

  for (const member of node.types) {
    if (
      member.kind === ts.SyntaxKind.NullKeyword ||
      (ts.isLiteralTypeNode(member) && member.literal.kind === ts.SyntaxKind.NullKeyword)
    ) {
      nullable = true;
    } else if (member.kind === ts.SyntaxKind.UndefinedKeyword) {
      // undefined in union treated as optional concern, not nullable
      // But at the type level, we note it
      nullable = true;
    } else {
      schemas.push(parseTypeNode(member, sf, known));
    }
  }

  return { schemas, nullable };
}

function parseLiteral(node: ts.LiteralTypeNode): SchemaNode {
  const literal = node.literal;

  if (literal.kind === ts.SyntaxKind.NullKeyword) {
    return { kind: 'null' };
  }
  if (ts.isStringLiteral(literal)) {
    return { kind: 'literal', value: literal.text };
  }
  if (ts.isNumericLiteral(literal)) {
    return { kind: 'literal', value: Number(literal.text) };
  }
  if (literal.kind === ts.SyntaxKind.TrueKeyword) {
    return { kind: 'literal', value: true };
  }
  if (literal.kind === ts.SyntaxKind.FalseKeyword) {
    return { kind: 'literal', value: false };
  }
  if (ts.isPrefixUnaryExpression(literal) && ts.isNumericLiteral(literal.operand)) {
    return { kind: 'literal', value: -Number(literal.operand.text) };
  }

  return { kind: 'any' };
}

// ── Utility ──────────────────────────────────────────────────────

function hasModifier(node: ts.Node, kind: ts.SyntaxKind): boolean {
  const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
  return modifiers?.some((m) => m.kind === kind) ?? false;
}

function getDescription(node: ts.Node, sf: ts.SourceFile): string | undefined {
  const ranges = ts.getLeadingCommentRanges(sf.text, node.getFullStart());
  if (!ranges) return undefined;

  for (const range of ranges) {
    const comment = sf.text.slice(range.pos, range.end);
    if (comment.startsWith('/**')) {
      return (
        comment
          .replace(/^\/\*\*\s*/, '')
          .replace(/\s*\*\/$/, '')
          .replace(/^\s*\* ?/gm, '')
          .trim() || undefined
      );
    }
  }

  return undefined;
}
