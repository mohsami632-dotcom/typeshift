import { describe, it, expect } from 'vitest';
import { generateJsonSchema } from '../generator';
import * as S from '../../../core/schema';

describe('JSON Schema Generator', () => {
  it('generates valid JSON Schema with types, properties, and constraints', () => {
    const doc = S.document(
      {
        MyModel: S.object({
          name: S.prop(S.string({ minLength: 2, maxLength: 50 })),
          count: S.optProp(S.integer({ minimum: 1 })),
        }),
        Status: S.enumType(['active', 'pending']),
      },
      { title: 'MyModel', description: 'Model test' },
    );

    const output = generateJsonSchema(doc);
    const parsed = JSON.parse(output);

    expect(parsed.$schema).toBe('http://json-schema.org/draft-07/schema#');
    expect(parsed.$defs.MyModel.type).toBe('object');
    expect(parsed.$defs.MyModel.required).toEqual(['name']);
    expect(parsed.$defs.MyModel.properties.name.type).toBe('string');
    expect(parsed.$defs.MyModel.properties.name.minLength).toBe(2);
    expect(parsed.$defs.MyModel.properties.name.maxLength).toBe(50);
    expect(parsed.$defs.MyModel.properties.count.type).toBe('integer');
    expect(parsed.$defs.MyModel.properties.count.minimum).toBe(1);
    expect(parsed.$defs.Status.enum).toEqual(['active', 'pending']);
  });
});
