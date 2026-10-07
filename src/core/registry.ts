/**
 * Format adapter registry.
 *
 * Manages registration and lookup of format adapters. Adapters register
 * themselves at startup, and the converter uses the registry to find
 * the right adapter for a given format ID or file extension.
 *
 * @module
 */

import type { FormatAdapter } from './types';
import { UnknownFormatError } from './errors';

export class FormatRegistry {
  private readonly adapters = new Map<string, FormatAdapter>();
  private readonly aliases = new Map<string, string>();

  /** Register a format adapter. Throws if an adapter with the same id already exists. */
  register(adapter: FormatAdapter): void {
    const normalizedId = adapter.id.toLowerCase().trim();
    if (this.adapters.has(normalizedId)) {
      throw new Error(`Format adapter "${adapter.id}" is already registered.`);
    }
    this.adapters.set(normalizedId, adapter);

    if (adapter.aliases) {
      for (const alias of adapter.aliases) {
        const normalizedAlias = alias.toLowerCase().trim();
        this.aliases.set(normalizedAlias, normalizedId);
      }
    }
  }

  /** Get an adapter by its format id or alias. Throws UnknownFormatError if not found. */
  get(idOrAlias: string): FormatAdapter {
    const key = idOrAlias.toLowerCase().trim();
    const targetId = this.aliases.get(key) ?? key;
    const adapter = this.adapters.get(targetId);
    if (!adapter) {
      throw new UnknownFormatError(idOrAlias);
    }
    return adapter;
  }

  /** Check whether an adapter with the given id or alias is registered. */
  has(idOrAlias: string): boolean {
    const key = idOrAlias.toLowerCase().trim();
    return this.adapters.has(key) || this.aliases.has(key);
  }

  /** Get all registered adapters. */
  getAll(): readonly FormatAdapter[] {
    return [...this.adapters.values()];
  }

  /**
   * Look up an adapter by file path or extension (e.g. "schema.zod.ts", ".zod.ts", ".ts").
   * Checks multi-segment extensions before single extensions.
   * Returns undefined if none found.
   */
  getByExtension(filepathOrExtension: string): FormatAdapter | undefined {
    const raw = filepathOrExtension.toLowerCase().trim();
    const target =
      raw.startsWith('.') || raw.includes('.') || raw.includes('/') || raw.includes('\\')
        ? raw
        : `.${raw}`;

    // Sort by extension length descending so ".zod.ts" matches before ".ts"
    const candidates: { ext: string; adapter: FormatAdapter }[] = [];
    for (const adapter of this.adapters.values()) {
      for (const ext of adapter.extensions) {
        candidates.push({ ext: ext.toLowerCase(), adapter });
      }
    }
    candidates.sort((a, b) => b.ext.length - a.ext.length);

    for (const { ext, adapter } of candidates) {
      if (target === ext || target.endsWith(ext)) {
        return adapter;
      }
    }
    return undefined;
  }
}

/**
 * Creates and returns a registry pre-populated with the built-in adapters.
 * Import this for convenience — or construct your own FormatRegistry for testing.
 */
export function createDefaultRegistry(): FormatRegistry {
  // Lazy imports to avoid circular dependencies and allow tree-shaking
  const registry = new FormatRegistry();

  // Built-in adapters are registered by the public index.ts
  return registry;
}
