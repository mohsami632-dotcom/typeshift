import { describe, it, expect } from 'vitest';
import { parseZod } from '../parser';

describe('Zod Parser', () => {
  it('parses z.object with method chains and constraints', () => {
    const code = `
      import { z } from 'zod';

      export const ProfileSchema = z.object({
        username: z.string().min(3).max(20),
        email: z.string().email(),
        score: z.number().int().min(0).max(100),
        bio: z.string().optional(),
      });
    `;

    const doc = parseZod(code);
    expect(doc.definitions.ProfileSchema).toBeDefined();

    const profile = doc.definitions.ProfileSchema;
    expect(profile.kind).toBe('object');
    if (profile.kind === 'object') {
      const username = profile.properties.username.schema;
      expect(username.kind).toBe('string');
      if (username.kind === 'string') {
        expect(username.minLength).toBe(3);
        expect(username.maxLength).toBe(20);
      }

      const email = profile.properties.email.schema;
      expect(email.kind).toBe('string');
      if (email.kind === 'string') {
        expect(email.format).toBe('email');
      }

      const score = profile.properties.score.schema;
      expect(score.kind).toBe('integer');
      if (score.kind === 'integer') {
        expect(score.minimum).toBe(0);
        expect(score.maximum).toBe(100);
      }

      expect(profile.properties.bio.optional).toBe(true);
    }
  });

  it('parses z.enum, z.array, z.record', () => {
    const code = `
      import { z } from 'zod';

      export const ColorSchema = z.enum(['red', 'green', 'blue']);
      export const ListSchema = z.array(z.string());
      export const MapSchema = z.record(z.string(), z.number());
    `;

    const doc = parseZod(code);
    expect(doc.definitions.ColorSchema.kind).toBe('enum');
    expect(doc.definitions.ListSchema.kind).toBe('array');
    expect(doc.definitions.MapSchema.kind).toBe('record');
  });

  it('throws ParseError when no Zod schemas are found', () => {
    const code = `const a = 1; function test() {}`;
    expect(() => parseZod(code)).toThrow('No Zod schema declarations found');
  });

  it('throws ParseError on empty input', () => {
    expect(() => parseZod('')).toThrow('No Zod schema declarations found');
  });
});
