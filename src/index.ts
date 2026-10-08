/**
 * typeshift — Developer-first, CLI and programmatic schema compiler
 * for bidirectional, loss-aware conversion between schema definition formats.
 *
 * @packageDocumentation
 */

import {
  convert as coreConvert,
  parse as coreParse,
  generate as coreGenerate,
  type ConvertOptions,
  type SchemaDocument,
  type ParseOptions,
  type GenerateOptions,
  type ConversionResult,
} from './core';
import type { FormatRegistry } from './core/registry';
import {
  builtinAdapters,
  registerBuiltinAdapters,
  createDefaultRegistry,
  typescriptAdapter,
  jsonSchemaAdapter,
  zodAdapter,
} from './formats';

// Re-export all core types
export type {
  SchemaNode,
  SchemaBase,
  SchemaDocument,
  DocumentMetadata,
  StringSchema,
  NumberSchema,
  IntegerSchema,
  BooleanSchema,
  NullSchema,
  ArraySchema,
  ObjectSchema,
  PropertyDefinition,
  UnionSchema,
  IntersectionSchema,
  EnumSchema,
  LiteralSchema,
  TupleSchema,
  RecordSchema,
  RefSchema,
  AnySchema,
  DiagnosticSeverity,
  ConversionDiagnostic,
  ParseOptions,
  GenerateOptions,
  FormatCapabilities,
  FormatAdapter,
  ConversionResult,
  ConvertOptions,
} from './core';

// Re-export error classes
export {
  TypeshiftError,
  ParseError,
  UnknownFormatError,
  GenerateError,
  ValidationError,
} from './core';

// Re-export schema builders
export { S } from './core';

// Re-export registry class and builder
export { FormatRegistry } from './core';
export {
  builtinAdapters,
  registerBuiltinAdapters,
  createDefaultRegistry,
  typescriptAdapter,
  jsonSchemaAdapter,
  zodAdapter,
};

// Re-export loss detector
export { detectLoss } from './core';

// Shared default registry instance
let defaultRegistryInstance: FormatRegistry | null = null;

/**
 * Returns the default shared FormatRegistry pre-populated with built-in adapters.
 */
export function getDefaultRegistry(): FormatRegistry {
  if (!defaultRegistryInstance) {
    defaultRegistryInstance = createDefaultRegistry();
  }
  return defaultRegistryInstance;
}

/**
 * Convert schema source text from one format to another.
 *
 * If no registry is passed, the default built-in registry is used.
 *
 * @param input    - Source schema text (e.g. TypeScript interfaces, JSON Schema JSON, or Zod schemas).
 * @param options  - Source/target format identifiers and options.
 * @param registry - Optional custom registry. If omitted, uses the default registry.
 * @returns ConversionResult containing output text and loss diagnostics.
 *
 * @example
 * ```ts
 * import { convert } from '@mohsami/typeshift';
 *
 * const result = convert(
 *   'export interface User { id: string; name: string; age?: number; }',
 *   { from: 'typescript', to: 'json-schema' }
 * );
 * console.log(result.output);
 * console.log(result.diagnostics);
 * ```
 */
export function convert(
  input: string,
  options: ConvertOptions,
  registry?: FormatRegistry,
): ConversionResult {
  const reg = registry ?? getDefaultRegistry();
  return coreConvert(input, options, reg);
}

/**
 * Parse schema source text into the intermediate representation (SchemaDocument).
 *
 * @param input    - Source schema text.
 * @param formatId - Format identifier or alias (e.g. "typescript", "ts", "json-schema", "zod").
 * @param registry - Optional custom registry.
 * @param options  - Parse options.
 */
export function parse(
  input: string,
  formatId: string,
  registry?: FormatRegistry,
  options?: ParseOptions,
): SchemaDocument {
  const reg = registry ?? getDefaultRegistry();
  return coreParse(input, formatId, reg, options);
}

/**
 * Generate output text in a target format from a SchemaDocument IR.
 *
 * @param document - SchemaDocument IR.
 * @param formatId - Target format identifier or alias.
 * @param registry - Optional custom registry.
 * @param options  - Generate options.
 */
export function generate(
  document: SchemaDocument,
  formatId: string,
  registry?: FormatRegistry,
  options?: GenerateOptions,
): string {
  const reg = registry ?? getDefaultRegistry();
  return coreGenerate(document, formatId, reg, options);
}
