import { describe, it, expect } from 'vitest';
import { detectLoss } from '../loss-detector';
import * as S from '../schema';
import type { FormatCapabilities } from '../types';

describe('detectLoss', () => {
  it('detects dropped constraints when target format lacks constraint support', () => {
    const doc = S.document({
      User: S.object({
        email: S.prop(S.string({ format: 'email', minLength: 5 })),
        age: S.prop(S.number({ minimum: 0, maximum: 120 })),
      }),
    });

    const unconstrainedCaps: FormatCapabilities = {
      supportsConstraints: false,
      supportsDescriptions: true,
      supportsDefaults: true,
      supportsNullable: true,
      supportsOptional: true,
      supportsUnions: true,
      supportsIntersections: true,
      supportsEnums: true,
      supportsRecursion: true,
      supportsTuples: true,
      supportsRecords: true,
    };

    const diagnostics = detectLoss(doc, 'typescript', unconstrainedCaps);
    expect(diagnostics.length).toBeGreaterThanOrEqual(4);
    expect(diagnostics.some((d) => d.message.includes('format') && d.severity === 'warning')).toBe(
      true,
    );
    expect(
      diagnostics.some((d) => d.message.includes('minLength') && d.severity === 'warning'),
    ).toBe(true);
    expect(diagnostics.some((d) => d.message.includes('minimum') && d.severity === 'warning')).toBe(
      true,
    );
    expect(diagnostics.some((d) => d.message.includes('maximum') && d.severity === 'warning')).toBe(
      true,
    );
  });

  it('detects dropped default values when target format lacks default support', () => {
    const doc = S.document({
      User: S.object({
        status: S.prop({ kind: 'string', default: 'active' }),
      }),
    });

    const noDefaultCaps: FormatCapabilities = {
      supportsConstraints: true,
      supportsDescriptions: true,
      supportsDefaults: false,
      supportsNullable: true,
      supportsOptional: true,
      supportsUnions: true,
      supportsIntersections: true,
      supportsEnums: true,
      supportsRecursion: true,
      supportsTuples: true,
      supportsRecords: true,
    };

    const diagnostics = detectLoss(doc, 'typescript', noDefaultCaps);
    expect(diagnostics.some((d) => d.message.includes('Default value will be dropped'))).toBe(true);
  });

  it('detects dropped union types when target format lacks union support', () => {
    const doc = S.document({
      Either: S.union([S.string(), S.number()]),
    });

    const noUnionCaps: FormatCapabilities = {
      supportsConstraints: true,
      supportsDescriptions: true,
      supportsDefaults: true,
      supportsNullable: true,
      supportsOptional: true,
      supportsUnions: false,
      supportsIntersections: true,
      supportsEnums: true,
      supportsRecursion: true,
      supportsTuples: true,
      supportsRecords: true,
    };

    const diagnostics = detectLoss(doc, 'limited-format', noUnionCaps);
    expect(
      diagnostics.some(
        (d) =>
          d.message.includes('Union type cannot be natively represented') &&
          d.severity === 'warning',
      ),
    ).toBe(true);
  });

  it('detects recursion reference warnings', () => {
    const doc = S.document({
      User: S.object({
        parent: S.optProp(S.ref('TreeNode')),
      }),
      TreeNode: S.object({
        value: S.prop(S.string()),
        left: S.optProp(S.ref('TreeNode')),
      }),
    });

    const noRecursionCaps: FormatCapabilities = {
      supportsConstraints: true,
      supportsDescriptions: true,
      supportsDefaults: true,
      supportsNullable: true,
      supportsOptional: true,
      supportsUnions: true,
      supportsIntersections: true,
      supportsEnums: true,
      supportsRecursion: false,
      supportsTuples: true,
      supportsRecords: true,
    };

    const diagnostics = detectLoss(doc, 'zod', noRecursionCaps);
    expect(diagnostics.some((d) => d.message.includes('recursion may not be supported'))).toBe(
      true,
    );
  });
});
