import { describe, it, expect } from 'vitest';
import { generateZod } from '../generator';
import * as S from '../../../core/schema';

describe('Zod Generator', () => {
  it('generates Zod schemas with constraint methods and options', () => {
    const doc = S.document({
      Account: S.object({
        email: S.prop(S.string({ format: 'email' })),
        age: S.optProp(S.integer({ minimum: 18 })),
        status: S.prop(S.enumType(['active', 'disabled'])),
      }),
    });

    const code = generateZod(doc, { header: false });
    expect(code).toContain("import { z } from 'zod';");
    expect(code).toContain('export const Account = z.object({');
    expect(code).toContain('email: z.string().email(),');
    expect(code).toContain('age: z.number().int().min(18).optional(),');
    expect(code).toContain('status: z.enum(["active", "disabled"]),');
  });
});
