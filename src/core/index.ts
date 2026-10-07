/**
 * Core module — re-exports all public core types and functions.
 * @module
 */

// Types
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
} from './types';

// Errors
export {
  TypeshiftError,
  ParseError,
  UnknownFormatError,
  GenerateError,
  ValidationError,
} from './errors';

// Schema builders
export * as S from './schema';

// Registry
export { FormatRegistry, createDefaultRegistry } from './registry';

// Converter
export { convert, parse, generate } from './converter';
export type { ConvertOptions } from './converter';

// Loss detection
export { detectLoss } from './loss-detector';
