# Example 05: Loss Policy Enforcement & CI Gates

This example demonstrates how `typeshift` acts as an automated CI quality gate to prevent silent schema degradation and validation drift across teams.

## Files

- [`schema-with-constraints.json`](./schema-with-constraints.json) — Financial payload schema specifying constraints (`minimum: 100`, `minLength: 3`, `format: "email"`).

## Scenario 1: Permissive Conversion (Default `warn`)

When converting for documentation or preliminary development, you may want generated types even if constraints are lost:

```bash
npx @mohsami/typeshift convert schema-with-constraints.json --to typescript
```

### Result:
- **Exit Code**: `0` (Success).
- **Behavior**: Emits 5 diagnostics to `stderr` detailing dropped constraints, then outputs the clean TypeScript interface to `stdout`.

```text
Information-Loss Diagnostics (5 warnings):
  ▲ WARNING [PaymentIntent.amount] Constraint "minimum" (value: 100) will be dropped.
  ▲ WARNING [PaymentIntent.amount] Constraint "maximum" (value: 50000000) will be dropped.
  ▲ WARNING [PaymentIntent.currency] Constraint "minLength" (value: 3) will be dropped.
  ▲ WARNING [PaymentIntent.currency] Constraint "maxLength" (value: 3) will be dropped.
  ▲ WARNING [PaymentIntent.customerEmail] Constraint "format" (value: "email") will be dropped.
```

---

## Scenario 2: Strict CI Enforcement (`--loss-policy error`)

In production CI pipelines, converting a constrained payload into a format that cannot enforce its rules might introduce runtime security vulnerabilities or schema drift:

```bash
npx @mohsami/typeshift convert schema-with-constraints.json --to typescript --loss-policy error
```

### Result:
- **Exit Code**: `2` (Error / Abort).
- **Behavior**: Aborts conversion before generating output and fails the CI step.

```text
Information-Loss Diagnostics (5 warnings):
  ▲ WARNING [PaymentIntent.amount] Constraint "minimum" (value: 100) will be dropped.
  ▲ WARNING [PaymentIntent.amount] Constraint "maximum" (value: 50000000) will be dropped.
  ▲ WARNING [PaymentIntent.currency] Constraint "minLength" (value: 3) will be dropped.
  ▲ WARNING [PaymentIntent.currency] Constraint "maxLength" (value: 3) will be dropped.
  ▲ WARNING [PaymentIntent.customerEmail] Constraint "format" (value: "email") will be dropped.
✖ Aborting due to --loss-policy error. Information loss was detected during conversion.
```

---

## Scenario 3: Zero-Loss Target Under Strict Policy

When converting to a target format capable of natively representing all constraints (such as Zod or JSON Schema), `--loss-policy error` succeeds:

```bash
npx @mohsami/typeshift convert schema-with-constraints.json --to zod --loss-policy error
```

### Result:
- **Exit Code**: `0` (Success).
- **Behavior**: Emits 0 diagnostics and outputs the full Zod schema with `.min(100)`, `.email()`, and `.length()` constraints preserved.

```typescript
export const PaymentIntent = z.object({
  amount: z.number().int().min(100).max(50000000),
  currency: z.string().min(3).max(3),
  customerEmail: z.string().email(),
});
```
