# Example 04: OpenAPI 3.1 to TypeScript

This example demonstrates compiling OpenAPI 3.1 schema models into TypeScript interfaces.

## Files

- [`petstore.openapi.json`](./petstore.openapi.json) — Source OpenAPI 3.1.0 document declaring data models under `components.schemas`.
- [`petstore.ts`](./petstore.ts) — Generated TypeScript interfaces.

## Run This Example

```bash
# Auto-detects OpenAPI from the compound extension (.openapi.json):
npx @mohsami/typeshift convert petstore.openapi.json --to typescript -o petstore.ts
```

## What This Demonstrates

1. **Component Schema Extraction**:
   - `typeshift` extracts schemas located in `components.schemas` and compiles each model into a named interface.
2. **Reference Resolution**:
   - Schema references like `"$ref": "#/components/schemas/Category"` correctly map to TypeScript type references: `category?: Category;`.
3. **Enum & JSDoc Preservation**:
   - OpenAPI descriptions map directly to JSDoc comments.
   - String enums (`["available", "pending", "sold"]`) map to TypeScript union string literals.

## Scope & Supported OpenAPI Subset

- **Supported**: Data contracts declared under `components.schemas`, including primitive types, objects, arrays, `$ref` links, `readOnly` attributes, enums, `oneOf`, `anyOf`, and `allOf`.
- **Not in Scope**: HTTP API routing operations under `paths` (endpoints, HTTP methods, headers, query parameters). `typeshift` is a schema model compiler, not a full client/server generator.
- **Format Requirement**: OpenAPI documents must be provided in JSON format (`.json` or `.openapi.json`). Native YAML parsing is tracked on the roadmap ([#5](https://github.com/mohsami632-dotcom/typeshift/issues/5)).
