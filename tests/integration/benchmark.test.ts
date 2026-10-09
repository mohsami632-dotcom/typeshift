import { describe, it, expect } from 'vitest';
import { convert, generate, S, type SchemaDocument } from '../../src/index';

function createSyntheticDocument(definitionCount: number, propertiesPerDef: number): SchemaDocument {
  const definitions: Record<string, any> = {};

  for (let d = 0; d < definitionCount; d++) {
    const defName = `Entity_${d}`;
    const properties: Record<string, any> = {};

    for (let p = 0; p < propertiesPerDef; p++) {
      const propName = `field_${p}`;
      if (p % 5 === 0) {
        properties[propName] = S.required(S.string({ minLength: 1, maxLength: 100 }));
      } else if (p % 5 === 1) {
        properties[propName] = S.required(S.number({ minimum: 0, maximum: 1000 }));
      } else if (p % 5 === 2) {
        properties[propName] = S.optional(S.boolean());
      } else if (p % 5 === 3) {
        properties[propName] = S.optional(S.array(S.string()));
      } else {
        properties[propName] = S.optional(S.string({ nullable: true }));
      }
    }

    definitions[defName] = S.object(properties);
  }

  return S.document(definitions);
}

describe('Performance & Determinism Benchmarks', () => {
  const smallDoc = createSyntheticDocument(2, 5); // 10 properties total
  const mediumDoc = createSyntheticDocument(10, 10); // 100 properties total
  const largeDoc = createSyntheticDocument(50, 15); // 750 properties total

  it('verifies determinism across repeated conversion runs', () => {
    const tsCode = `
      export interface User {
        id: string;
        name: string;
        age?: number;
        role: "admin" | "member";
        tags: string[];
      }
    `;

    // Run 10 times and verify exact byte-for-byte identity
    const firstJson = convert(tsCode, { from: 'typescript', to: 'json-schema' }).output;
    const firstZod = convert(tsCode, { from: 'typescript', to: 'zod' }).output;
    const firstOpenApi = convert(tsCode, { from: 'typescript', to: 'openapi' }).output;

    for (let i = 0; i < 9; i++) {
      expect(convert(tsCode, { from: 'typescript', to: 'json-schema' }).output).toBe(firstJson);
      expect(convert(tsCode, { from: 'typescript', to: 'zod' }).output).toBe(firstZod);
      expect(convert(tsCode, { from: 'typescript', to: 'openapi' }).output).toBe(firstOpenApi);
    }
  });

  it('measures small schema conversion performance', () => {
    const jsonStr = generate(smallDoc, 'json-schema');

    const start = performance.now();
    const result = convert(jsonStr, { from: 'json-schema', to: 'typescript' });
    const durationMs = performance.now() - start;

    expect(result.output).toBeDefined();
    expect(durationMs).toBeLessThan(100); // Expect < 100ms
  });

  it('measures medium schema conversion performance', () => {
    const jsonStr = generate(mediumDoc, 'json-schema');

    const start = performance.now();
    const result = convert(jsonStr, { from: 'json-schema', to: 'openapi' });
    const durationMs = performance.now() - start;

    expect(result.output).toBeDefined();
    expect(durationMs).toBeLessThan(250); // Expect < 250ms
  });

  it('measures large schema conversion performance (750 properties)', () => {
    const jsonStr = generate(largeDoc, 'json-schema');

    const start = performance.now();
    const result = convert(jsonStr, { from: 'json-schema', to: 'typescript' });
    const durationMs = performance.now() - start;

    expect(result.output).toBeDefined();
    // Verify linear/efficient scaling without quadratic explosion
    expect(durationMs).toBeLessThan(1500); // 750 properties in under 1.5s
  });
});
