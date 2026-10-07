/**
 * JSON Schema format adapter.
 * @module
 */

import type {
  FormatAdapter,
  FormatCapabilities,
  SchemaDocument,
  ParseOptions,
  GenerateOptions,
} from '../../core/types';
import { parseJsonSchema } from './parser';
import { generateJsonSchema } from './generator';

export { parseJsonSchema } from './parser';
export { generateJsonSchema } from './generator';

const capabilities: FormatCapabilities = {
  supportsConstraints: true,
  supportsDescriptions: true,
  supportsDefaults: true,
  supportsNullable: true,
  supportsOptional: true,
  supportsUnions: true,
  supportsIntersections: true,
  supportsEnums: true,
  supportsRecursion: true,
  supportsTuples: true,
  supportsRecords: true,
};

export const jsonSchemaAdapter: FormatAdapter = {
  id: 'json-schema',
  name: 'JSON Schema',
  extensions: ['.json', '.schema.json'],
  aliases: ['jsonschema', 'json'],
  capabilities,

  parse(input: string, options?: ParseOptions): SchemaDocument {
    return parseJsonSchema(input, options);
  },

  generate(document: SchemaDocument, options?: GenerateOptions): string {
    return generateJsonSchema(document, options);
  },
};
