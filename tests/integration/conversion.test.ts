import { describe, it, expect } from 'vitest';
import { convert } from '../../src/index';

describe('Integration: Conversion between formats', () => {
  const tsSource = `
    export interface UserProfile {
      id: string;
      displayName: string;
      bio?: string;
      followerCount: number;
      isVerified: boolean;
    }
  `;

  it('converts TypeScript to JSON Schema', () => {
    const result = convert(tsSource, { from: 'typescript', to: 'json-schema' });
    expect(result.output).toBeDefined();

    const parsed = JSON.parse(result.output);
    const target = parsed.$defs?.UserProfile ?? parsed;
    expect(target.type).toBe('object');
    expect(target.required).toEqual(['id', 'displayName', 'followerCount', 'isVerified']);
    expect(target.properties.bio).toBeDefined();
  });

  it('converts TypeScript to Zod', () => {
    const result = convert(tsSource, { from: 'typescript', to: 'zod' });
    expect(result.output).toContain("import { z } from 'zod';");
    expect(result.output).toContain('export const UserProfile = z.object({');
    expect(result.output).toContain('id: z.string(),');
    expect(result.output).toContain('displayName: z.string(),');
    expect(result.output).toContain('bio: z.string().optional(),');
    expect(result.output).toContain('followerCount: z.number(),');
    expect(result.output).toContain('isVerified: z.boolean(),');
  });

  it('converts JSON Schema to TypeScript with loss diagnostics', () => {
    const jsonSchema = JSON.stringify({
      title: 'Member',
      type: 'object',
      properties: {
        id: { type: 'string', minLength: 5 },
        email: { type: 'string', format: 'email' },
        score: { type: 'integer', minimum: 0 },
      },
      required: ['id', 'email'],
    });

    const result = convert(jsonSchema, { from: 'json-schema', to: 'typescript' });
    expect(result.output).toContain('export interface Member {');
    expect(result.output).toContain('id: string;');
    expect(result.output).toContain('email: string;');
    expect(result.output).toContain('score?: number;');

    // Loss diagnostics should warn about dropped constraints
    expect(result.diagnostics.length).toBeGreaterThanOrEqual(3);
    expect(result.diagnostics.some((d) => d.message.includes('minLength'))).toBe(true);
    expect(result.diagnostics.some((d) => d.message.includes('format'))).toBe(true);
    expect(result.diagnostics.some((d) => d.message.includes('minimum'))).toBe(true);
  });

  it('converts JSON Schema to Zod preserving constraints without loss', () => {
    const jsonSchema = JSON.stringify({
      title: 'Member',
      type: 'object',
      properties: {
        id: { type: 'string', minLength: 5 },
        email: { type: 'string', format: 'email' },
        score: { type: 'integer', minimum: 0 },
      },
      required: ['id', 'email'],
    });

    const result = convert(jsonSchema, { from: 'json-schema', to: 'zod' });
    expect(result.output).toContain('id: z.string().min(5),');
    expect(result.output).toContain('email: z.string().email(),');
    expect(result.output).toContain('score: z.number().int().min(0).optional(),');
  });

  it('converts Zod to TypeScript', () => {
    const zodSource = `
      import { z } from 'zod';
      export const Car = z.object({
        make: z.string(),
        year: z.number(),
        electric: z.boolean().optional(),
      });
    `;

    const result = convert(zodSource, { from: 'zod', to: 'typescript' });
    expect(result.output).toContain('export interface Car {');
    expect(result.output).toContain('make: string;');
    expect(result.output).toContain('year: number;');
    expect(result.output).toContain('electric?: boolean;');
  });
});
