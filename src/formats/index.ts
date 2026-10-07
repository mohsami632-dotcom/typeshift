/**
 * Format adapters module.
 *
 * Re-exports all built-in format adapters and provides registration utilities.
 *
 * @module
 */

import { FormatRegistry } from '../core/registry';
import { typescriptAdapter } from './typescript';
import { jsonSchemaAdapter } from './json-schema';
import { zodAdapter } from './zod';

export { typescriptAdapter, parseTypeScript, generateTypeScript } from './typescript';
export { jsonSchemaAdapter, parseJsonSchema, generateJsonSchema } from './json-schema';
export { zodAdapter, parseZod, generateZod } from './zod';

/** Array of all built-in format adapters. */
export const builtinAdapters = [typescriptAdapter, jsonSchemaAdapter, zodAdapter] as const;

/**
 * Register all built-in adapters with the given registry.
 *
 * @param registry - The registry to register built-in adapters with.
 * @returns The same registry for chaining.
 */
export function registerBuiltinAdapters(registry: FormatRegistry): FormatRegistry {
  for (const adapter of builtinAdapters) {
    if (!registry.has(adapter.id)) {
      registry.register(adapter);
    }
  }
  return registry;
}

/**
 * Creates and returns a new FormatRegistry pre-loaded with all built-in adapters.
 */
export function createDefaultRegistry(): FormatRegistry {
  const registry = new FormatRegistry();
  return registerBuiltinAdapters(registry);
}
