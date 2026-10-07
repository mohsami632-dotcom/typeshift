import { describe, it, expect } from 'vitest';
import * as S from '../schema';

describe('Schema Builders (S)', () => {
  it('creates basic primitive nodes', () => {
    const str = S.string({ minLength: 1, maxLength: 10, pattern: '^[a-z]+$' });
    expect(str.kind).toBe('string');
    expect(str.minLength).toBe(1);
    expect(str.maxLength).toBe(10);
    expect(str.pattern).toBe('^[a-z]+$');

    const num = S.number({ minimum: 0, maximum: 100 });
    expect(num.kind).toBe('number');
    expect(num.minimum).toBe(0);
    expect(num.maximum).toBe(100);

    const int = S.integer({ minimum: 1 });
    expect(int.kind).toBe('integer');
    expect(int.minimum).toBe(1);

    const bool = S.boolean();
    expect(bool.kind).toBe('boolean');

    const nil = S.nullType();
    expect(nil.kind).toBe('null');

    const anyNode = S.any();
    expect(anyNode.kind).toBe('any');
  });

  it('creates complex container nodes', () => {
    const arr = S.array(S.string());
    expect(arr.kind).toBe('array');
    expect(arr.items.kind).toBe('string');

    const obj = S.object({
      id: S.prop(S.string()),
      age: S.optProp(S.integer()),
    });
    expect(obj.kind).toBe('object');
    expect(obj.properties.id.optional).toBe(false);
    expect(obj.properties.age.optional).toBe(true);

    const union = S.union([S.string(), S.number()]);
    expect(union.kind).toBe('union');
    expect(union.schemas).toHaveLength(2);

    const intersection = S.intersection([
      S.object({ a: S.prop(S.string()) }),
      S.object({ b: S.prop(S.number()) }),
    ]);
    expect(intersection.kind).toBe('intersection');
    expect(intersection.schemas).toHaveLength(2);

    const enumNode = S.enumType(['red', 'green', 'blue']);
    expect(enumNode.kind).toBe('enum');
    expect(enumNode.values).toEqual(['red', 'green', 'blue']);

    const literal = S.literal('constant');
    expect(literal.kind).toBe('literal');
    expect(literal.value).toBe('constant');

    const tuple = S.tuple([S.string(), S.number()]);
    expect(tuple.kind).toBe('tuple');
    expect(tuple.items).toHaveLength(2);

    const rec = S.record(S.string(), S.number());
    expect(rec.kind).toBe('record');
    expect(rec.keySchema.kind).toBe('string');
    expect(rec.valueSchema.kind).toBe('number');

    const ref = S.ref('User');
    expect(ref.kind).toBe('ref');
    expect(ref.ref).toBe('User');
  });

  it('creates document with metadata', () => {
    const doc = S.document(
      {
        Address: S.object({ street: S.prop(S.string()) }),
      },
      { title: 'MySchema', description: 'Test schema' },
    );

    expect(doc.definitions.Address).toBeDefined();
    expect(doc.definitions.Address.kind).toBe('object');
    expect(doc.metadata?.title).toBe('MySchema');
    expect(doc.metadata?.description).toBe('Test schema');
  });
});
