import { describe, it, expect } from 'vitest';
import { generateTypeScript } from '../generator';
import * as S from '../../../core/schema';

describe('TypeScript Generator', () => {
  it('generates interface declarations', () => {
    const doc = S.document({
      Address: S.object({
        street: S.prop(S.string()),
      }),
      User: S.object({
        id: S.prop(S.string()),
        age: S.optProp(S.number()),
      }),
    });

    const ts = generateTypeScript(doc, { header: false });
    expect(ts).toContain('export interface Address {');
    expect(ts).toContain('street: string;');
    expect(ts).toContain('id: string;');
    expect(ts).toContain('age?: number;');
  });

  it('generates enums and type aliases', () => {
    const doc = S.document({
      Role: S.enumType(['admin', 'member', 'guest']),
      Pair: S.tuple([S.string(), S.number()]),
    });

    const ts = generateTypeScript(doc, { header: false });
    expect(ts).toContain('export type Role = "admin" | "member" | "guest";');
    expect(ts).toContain('export type Pair = [string, number];');
  });

  it('generates JSDoc comments', () => {
    const doc = S.document({
      User: S.object(
        {
          name: S.prop(S.string(), { description: 'Full legal name' }),
        },
        { description: 'Represents an active user.' },
      ),
    });

    const ts = generateTypeScript(doc, { header: false });
    expect(ts).toContain('/** Represents an active user. */');
    expect(ts).toContain('/** Full legal name */');
  });
});
