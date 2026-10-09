# Example 03: JSON Schema to TypeScript & Loss Diagnostics

This example demonstrates compiling a JSON Schema into TypeScript interfaces while explicitly surfacing **information-loss diagnostics** for dropped validation constraints.

## Files

- [`account.json`](./account.json) — Source JSON Schema containing string patterns (`regex`), email format hints, numeric age boundaries, password length rules, and boolean defaults.
- [`account.ts`](./account.ts) — Generated TypeScript interface.

## Run This Example

```bash
npx @mohsami/typeshift convert account.json --to typescript -o account.ts
```

## Expected Console Output

```text
Information-Loss Diagnostics (7 warnings):
  ▲ WARNING [Account.accountNumber] Constraint "pattern" (value: "^[A-Z]{3}-[0-9]{4}$") will be dropped. (pattern constraint)
  ▲ WARNING [Account.email] Constraint "format" (value: "email") will be dropped. (format constraint)
  ▲ WARNING [Account.age] Constraint "minimum" (value: 18) will be dropped. (minimum constraint)
  ▲ WARNING [Account.age] Constraint "maximum" (value: 120) will be dropped. (maximum constraint)
  ▲ WARNING [Account.password] Constraint "minLength" (value: 8) will be dropped. (minLength constraint)
  ▲ WARNING [Account.password] Constraint "maxLength" (value: 64) will be dropped. (maxLength constraint)
  ▲ WARNING [Account.isVerified] Default value will be dropped: false (default value)

✔ Successfully converted json-schema → typescript (account.ts)
```

## What This Demonstrates

1. **Why Information-Loss Diagnostics Matter**:
   - When converting between rich schema formats and static types, dropped constraints can easily go unnoticed without dedicated diagnostics.
   - `typeshift` generates valid, usable TypeScript interfaces while explicitly logging each unrepresented constraint with its precise dot-path.
2. **Deterministic Output**:
   - Properties are sorted alphabetically (`accountNumber`, `age`, `email`, `isVerified`, `password`).
   - Descriptions from JSON Schema are converted into standard JSDoc comments.
