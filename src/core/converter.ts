/**
 * Converter — the conversion orchestrator.
 *
 * Coordinates: source adapter parse → loss analysis → target adapter generate.
 *
 * @module
 */

import type { ConversionResult, GenerateOptions, ParseOptions, SchemaDocument } from './types';
import type { FormatRegistry } from './registry';
import { detectLoss } from './loss-detector';

export interface ConvertOptions {
  /** Source format id (e.g. "typescript"). */
  from: string;
  /** Target format id (e.g. "json-schema"). */
  to: string;
  /** Options passed to the source adapter's parse(). */
  parseOptions?: ParseOptions;
  /** Options passed to the target adapter's generate(). */
  generateOptions?: GenerateOptions;
}

/**
 * Convert schema source text from one format to another.
 *
 * @param input    - The source text to convert.
 * @param options  - Specifies source/target format ids and adapter options.
 * @param registry - The format registry to look up adapters in.
 * @returns The conversion result including output text and diagnostics.
 */
export function convert(
  input: string,
  options: ConvertOptions,
  registry: FormatRegistry,
): ConversionResult {
  const sourceAdapter = registry.get(options.from);
  const targetAdapter = registry.get(options.to);

  // 1. Parse source → IR
  const document: SchemaDocument = sourceAdapter.parse(input, options.parseOptions);

  // 2. Detect information loss
  const diagnostics = detectLoss(document, targetAdapter.id, targetAdapter.capabilities);

  // 3. Generate target output
  const output = targetAdapter.generate(document, options.generateOptions);

  return { output, diagnostics };
}

/**
 * Parse input text using the specified format adapter.
 * Useful when you want to inspect the IR without converting.
 */
export function parse(
  input: string,
  formatId: string,
  registry: FormatRegistry,
  options?: ParseOptions,
): SchemaDocument {
  const adapter = registry.get(formatId);
  return adapter.parse(input, options);
}

/**
 * Generate output text from a SchemaDocument using the specified format adapter.
 */
export function generate(
  document: SchemaDocument,
  formatId: string,
  registry: FormatRegistry,
  options?: GenerateOptions,
): string {
  const adapter = registry.get(formatId);
  return adapter.generate(document, options);
}
