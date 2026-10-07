/**
 * TypeScript format adapter.
 * @module
 */

import type {
  FormatAdapter,
  FormatCapabilities,
  SchemaDocument,
  ParseOptions,
  GenerateOptions,
} from '../../core/types';
import { parseTypeScript } from './parser';
import { generateTypeScript } from './generator';

export { parseTypeScript } from './parser';
export { generateTypeScript } from './generator';

const capabilities: FormatCapabilities = {
  supportsConstraints: false,
  supportsDescriptions: true,
  supportsDefaults: false,
  supportsNullable: true,
  supportsOptional: true,
  supportsUnions: true,
  supportsIntersections: true,
  supportsEnums: true,
  supportsRecursion: true,
  supportsTuples: true,
  supportsRecords: true,
};

export const typescriptAdapter: FormatAdapter = {
  id: 'typescript',
  name: 'TypeScript',
  extensions: ['.ts'],
  aliases: ['ts'],
  capabilities,

  parse(input: string, options?: ParseOptions): SchemaDocument {
    return parseTypeScript(input, options);
  },

  generate(document: SchemaDocument, options?: GenerateOptions): string {
    return generateTypeScript(document, options);
  },
};
