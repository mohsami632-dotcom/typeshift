import { describe, it, expect } from 'vitest';
import { convert, parse } from '../../src/index';

describe('Integration: Roundtrip conversion guarantees', () => {
  it('roundtrips JSON Schema → Zod → JSON Schema preserving properties', () => {
    const originalJsonSchema = JSON.stringify({
      title: 'Item',
      type: 'object',
      properties: {
        sku: { type: 'string', minLength: 3 },
        quantity: { type: 'integer', minimum: 1 },
      },
      required: ['sku', 'quantity'],
    });

    // 1. Convert JSON Schema → Zod
    const zodResult = convert(originalJsonSchema, {
      from: 'json-schema',
      to: 'zod',
      generateOptions: { header: false },
    });
    expect(zodResult.output).toContain('sku: z.string().min(3)');

    // 2. Convert Zod back to JSON Schema
    const roundtripResult = convert(zodResult.output, {
      from: 'zod',
      to: 'json-schema',
    });
    const parsedRoundtrip = JSON.parse(roundtripResult.output);

    // Definitions should contain Item with properties and constraints
    const roundtripDef = parsedRoundtrip.$defs?.Item ?? parsedRoundtrip;
    expect(roundtripDef.type).toBe('object');
    expect(roundtripDef.properties.sku.type).toBe('string');
    expect(roundtripDef.properties.sku.minLength).toBe(3);
    expect(roundtripDef.properties.quantity.type).toBe('integer');
    expect(roundtripDef.properties.quantity.minimum).toBe(1);
    expect(roundtripDef.required).toContain('sku');
    expect(roundtripDef.required).toContain('quantity');
  });

  it('roundtrips TypeScript → JSON Schema → TypeScript preserving interface structure', () => {
    const tsOriginal = `
export interface Customer {
  id: string;
  name: string;
  isActive: boolean;
  notes?: string;
}
    `;

    // 1. TS → JSON Schema
    const jsResult = convert(tsOriginal, {
      from: 'typescript',
      to: 'json-schema',
    });

    // 2. JSON Schema → TS
    const tsRoundtrip = convert(jsResult.output, {
      from: 'json-schema',
      to: 'typescript',
      generateOptions: { header: false },
    });

    // Verify parsing roundtrip TS produces identical IR structure
    const origDoc = parse(tsOriginal, 'typescript');
    const roundtripDoc = parse(tsRoundtrip.output, 'typescript');

    expect(Object.keys(roundtripDoc.definitions)).toContain('Customer');
    const origCustomer = origDoc.definitions.Customer;
    const roundtripCustomer = roundtripDoc.definitions.Customer;

    if (origCustomer.kind === 'object' && roundtripCustomer.kind === 'object') {
      expect(Object.keys(roundtripCustomer.properties)).toEqual(
        Object.keys(origCustomer.properties),
      );
      expect(roundtripCustomer.properties.notes.optional).toBe(true);
      expect(roundtripCustomer.properties.id.optional).toBe(false);
    }
  });
});
