import { describe, it, expect } from 'vitest';
import { convert } from '../../src/index';

describe('Phase 2: Loss Detection Test Suite', () => {
  const richConstraintsJsonSchema = JSON.stringify({
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'RichEntity',
    type: 'object',
    properties: {
      email: { type: 'string', format: 'email' },
      uuid: { type: 'string', format: 'uuid' },
      username: { type: 'string', minLength: 3, maxLength: 30, pattern: '^[a-zA-Z0-9_]+$' },
      age: { type: 'integer', minimum: 18, maximum: 120 },
      score: { type: 'number', exclusiveMinimum: 0, exclusiveMaximum: 100 },
      tags: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 10, uniqueItems: true },
      role: { type: 'string', default: 'viewer' },
    },
    required: ['email', 'uuid', 'username'],
  });

  it('normal conversion produces TypeScript and emits diagnostic warnings for all constraints', () => {
    const result = convert(richConstraintsJsonSchema, {
      from: 'json-schema',
      to: 'typescript',
    });

    // Valid TypeScript output generated
    expect(result.output).toContain('export interface RichEntity {');
    expect(result.output).toContain('email: string;');
    expect(result.output).toContain('uuid: string;');
    expect(result.output).toContain('username: string;');
    expect(result.output).toContain('age?: number;');
    expect(result.output).toContain('score?: number;');
    expect(result.output).toContain('tags?: string[];');
    expect(result.output).toContain('role?: string;');

    // Verify diagnostics emitted
    const diagnostics = result.diagnostics;
    expect(diagnostics.length).toBeGreaterThanOrEqual(10);

    const messages = diagnostics.map((d) => d.message);
    expect(messages.some((m) => m.includes('format') && m.includes('email'))).toBe(true);
    expect(messages.some((m) => m.includes('format') && m.includes('uuid'))).toBe(true);
    expect(messages.some((m) => m.includes('minLength') && m.includes('3'))).toBe(true);
    expect(messages.some((m) => m.includes('maxLength') && m.includes('30'))).toBe(true);
    expect(messages.some((m) => m.includes('pattern'))).toBe(true);
    expect(messages.some((m) => m.includes('minimum') && m.includes('18'))).toBe(true);
    expect(messages.some((m) => m.includes('maximum') && m.includes('120'))).toBe(true);
    expect(messages.some((m) => m.includes('exclusiveMinimum'))).toBe(true);
    expect(messages.some((m) => m.includes('exclusiveMaximum'))).toBe(true);
    expect(messages.some((m) => m.includes('minItems'))).toBe(true);
    expect(messages.some((m) => m.includes('maxItems'))).toBe(true);
    expect(messages.some((m) => m.includes('uniqueItems'))).toBe(true);
    expect(messages.some((m) => m.includes('Default value will be dropped'))).toBe(true);
  });

  it('zero-loss schema emits exactly 0 diagnostics when converting to TypeScript', () => {
    const zeroLossJsonSchema = JSON.stringify({
      $schema: 'http://json-schema.org/draft-07/schema#',
      title: 'SimpleEntity',
      type: 'object',
      properties: {
        id: { type: 'string' },
        active: { type: 'boolean' },
        count: { type: 'number' },
        tags: { type: 'array', items: { type: 'string' } },
      },
      required: ['id', 'active'],
    });

    const result = convert(zeroLossJsonSchema, {
      from: 'json-schema',
      to: 'typescript',
    });

    expect(result.diagnostics).toHaveLength(0);
    expect(result.output).toContain('export interface SimpleEntity {');
    expect(result.output).toContain('id: string;');
    expect(result.output).toContain('active: boolean;');
  });
});
