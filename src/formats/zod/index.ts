/**
 * Zod format adapter.
 * @module
 */

import type {
  FormatAdapter,
  FormatCapabilities,
  SchemaDocument,
  ParseOptions,
  GenerateOptions,
} from '../../core/types';
import { parseZod } from './parser';
import { generateZod } from './generator';

export { parseZod } from './parser';
export { generateZod } from './generator';

const capabilities: FormatCapabilities = {
  supportsConstraints: true,
  supportsDescriptions: true,
  supportsDefaults: true,
  supportsNullable: true,
  supportsOptional: true,
  supportsUnions: true,
  supportsIntersections: true,
  supportsEnums: true,
  supportsRecursion: false, // z.lazy() exists but we don't generate it in v0.1
  supportsTuples: true,
  supportsRecords: true,
};

export const zodAdapter: FormatAdapter = {
  id: 'zod',
  name: 'Zod',
  extensions: ['.zod.ts'],
  aliases: ['z'],
  capabilities,

  parse(input: string, options?: ParseOptions): SchemaDocument {
    return parseZod(input, options);
  },

  generate(document: SchemaDocument, options?: GenerateOptions): string {
    return generateZod(document, options);
  },
};
