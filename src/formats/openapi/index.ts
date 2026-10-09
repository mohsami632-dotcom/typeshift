/**
 * OpenAPI 3.1 format adapter.
 *
 * Implements bidirectional conversion between OpenAPI 3.1 specifications
 * (with component schemas) and SchemaIR.
 *
 * @module
 */

import type {
  FormatAdapter,
  FormatCapabilities,
  SchemaDocument,
  ParseOptions,
  GenerateOptions,
} from '../../core/types';
import { parseOpenApi } from './parser';
import { generateOpenApi } from './generator';

export { parseOpenApi } from './parser';
export { generateOpenApi } from './generator';

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

export const openApiAdapter: FormatAdapter = {
  id: 'openapi',
  name: 'OpenAPI 3.1',
  extensions: ['.openapi.json', '.oas.json', 'openapi.json', '.openapi'],
  aliases: ['oas', 'oas3', 'openapi3', 'openapi-3.1', 'openapi3.1'],
  capabilities,

  parse(input: string, options?: ParseOptions): SchemaDocument {
    return parseOpenApi(input, options);
  },

  generate(document: SchemaDocument, options?: GenerateOptions): string {
    return generateOpenApi(document, options);
  },
};
