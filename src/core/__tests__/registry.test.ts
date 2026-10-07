import { describe, it, expect } from 'vitest';
import { FormatRegistry } from '../registry';
import { UnknownFormatError } from '../errors';
import type { FormatAdapter, SchemaDocument } from '../types';

function createDummyAdapter(id: string, extensions: string[], aliases?: string[]): FormatAdapter {
  return {
    id,
    name: id.toUpperCase(),
    extensions,
    aliases,
    capabilities: {
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
    },
    parse: () => ({ root: { kind: 'any' }, definitions: {} }) as SchemaDocument,
    generate: () => 'output',
  };
}

describe('FormatRegistry', () => {
  it('registers and retrieves adapters', () => {
    const registry = new FormatRegistry();
    const adapter = createDummyAdapter('test-fmt', ['.tst'], ['tf']);

    registry.register(adapter);

    expect(registry.has('test-fmt')).toBe(true);
    expect(registry.has('tf')).toBe(true);
    expect(registry.has('non-existent')).toBe(false);

    expect(registry.get('test-fmt').id).toBe('test-fmt');
    expect(registry.get('tf').id).toBe('test-fmt');
  });

  it('throws on duplicate registration', () => {
    const registry = new FormatRegistry();
    const adapter = createDummyAdapter('dup', ['.d']);
    registry.register(adapter);

    expect(() => registry.register(adapter)).toThrow('already registered');
  });

  it('throws UnknownFormatError for unregistered format', () => {
    const registry = new FormatRegistry();
    expect(() => registry.get('missing')).toThrow(UnknownFormatError);
  });

  it('looks up adapter by extension', () => {
    const registry = new FormatRegistry();
    const adapter = createDummyAdapter('ext-fmt', ['.foo', '.bar']);
    registry.register(adapter);

    expect(registry.getByExtension('.foo')?.id).toBe('ext-fmt');
    expect(registry.getByExtension('bar')?.id).toBe('ext-fmt');
    expect(registry.getByExtension('.unknown')).toBeUndefined();
  });

  it('retrieves all registered adapters', () => {
    const registry = new FormatRegistry();
    registry.register(createDummyAdapter('a', ['.a']));
    registry.register(createDummyAdapter('b', ['.b']));

    const all = registry.getAll();
    expect(all).toHaveLength(2);
    expect(all.map((x) => x.id)).toEqual(['a', 'b']);
  });
});
