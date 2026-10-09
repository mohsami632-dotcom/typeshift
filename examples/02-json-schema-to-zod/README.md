# Example 02: JSON Schema to Zod

This example demonstrates compiling a JSON Schema with boundary constraints into runtime [Zod](https://zod.dev) validation schemas.

## Files

- [`product.json`](./product.json) — Source JSON Schema with numeric bounds, string length constraints, URL format validation, and enums.
- [`product.zod.ts`](./product.zod.ts) — Generated TypeScript file containing the runnable Zod schema.

## Run This Example

```bash
npx @mohsami/typeshift convert product.json --to zod -o product.zod.ts
```

## What This Demonstrates

1. **Rich Constraint Preservation**:
   - `minLength: 3, maxLength: 30` maps to `.min(3).max(30)`.
   - `minimum: 0` on numbers maps to `.nonnegative()` or `.min(0)`.
   - `type: "integer"` maps to `.int()`.
   - `format: "uri"` maps to `.url()`.
   - Unspecified fields in `required` automatically gain `.optional()`.
2. **Schema Metadata**:
   - Schema descriptions map directly to `.describe(...)`.
3. **Runtime Usability**:
   - The output imports `z from 'zod'` and is immediately usable for runtime HTTP payload validation.
