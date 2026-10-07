import { describe, it, expect } from 'vitest';
import { parseJsonSchema } from '../parser';

describe('JSON Schema Parser', () => {
  it('parses draft-07 object schema with properties and required', () => {
    const raw = JSON.stringify({
      $schema: 'http://json-schema.org/draft-07/schema#',
      title: 'Product',
      type: 'object',
      properties: {
        id: { type: 'string', minLength: 1 },
        price: { type: 'number', minimum: 0 },
        inStock: { type: 'boolean' },
      },
      required: ['id', 'price'],
    });

    const doc = parseJsonSchema(raw);
    expect(doc.metadata?.title).toBe('Product');
    const root = doc.definitions.Product;
    expect(root).toBeDefined();
    expect(root.kind).toBe('object');
    if (root.kind === 'object') {
      expect(root.properties.id.optional).toBe(false);
      expect(root.properties.id.schema.kind).toBe('string');
      if (root.properties.id.schema.kind === 'string') {
        expect(root.properties.id.schema.minLength).toBe(1);
      }

      expect(root.properties.price.optional).toBe(false);
      expect(root.properties.price.schema.kind).toBe('number');
      if (root.properties.price.schema.kind === 'number') {
        expect(root.properties.price.schema.minimum).toBe(0);
      }

      expect(root.properties.inStock.optional).toBe(true);
      expect(root.properties.inStock.schema.kind).toBe('boolean');
    }
  });

  it('parses definitions / $defs', () => {
    const raw = JSON.stringify({
      type: 'object',
      properties: {
        category: { $ref: '#/definitions/Category' },
      },
      definitions: {
        Category: {
          type: 'string',
          enum: ['books', 'electronics'],
        },
      },
    });

    const doc = parseJsonSchema(raw);
    expect(doc.definitions.Category).toBeDefined();
    expect(doc.definitions.Category.kind).toBe('enum');
  });

  it('parses anyOf, oneOf, allOf', () => {
    const raw = JSON.stringify({
      oneOf: [{ type: 'string' }, { type: 'number' }],
    });

    const doc = parseJsonSchema(raw);
    expect(doc.definitions.Root.kind).toBe('union');
  });
});
