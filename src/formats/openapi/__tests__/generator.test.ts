import { describe, it, expect } from 'vitest';
import { generateOpenApi } from '../generator';
import { parseOpenApi } from '../parser';
import { S } from '../../../core';

describe('OpenAPI 3.1 Generator', () => {
  it('generates a valid OpenAPI 3.1 document with components.schemas', () => {
    const doc = S.document({
      User: S.object({
        id: S.required(S.string({ format: 'uuid' })),
        name: S.required(S.string({ minLength: 1, maxLength: 50 })),
        bio: S.optional(S.string({ nullable: true })),
        role: S.required(S.enumType(['admin', 'user'])),
      }),
    });

    const output = generateOpenApi(doc);
    const parsed = JSON.parse(output) as Record<string, unknown>;

    expect(parsed.openapi).toBe('3.1.0');
    expect(parsed.info).toBeDefined();
    expect(parsed.components).toBeDefined();

    interface OpenApiSchemaDoc {
      openapi: string;
      info: Record<string, unknown>;
      components: {
        schemas: Record<string, {
          type?: string;
          required?: string[];
          properties?: Record<string, {
            format?: string;
            minLength?: number;
            type?: unknown;
            enum?: unknown[];
            $ref?: string;
            readOnly?: boolean;
          }>;
          $ref?: string;
        }>;
      };
    }

    const schemas = (parsed as unknown as OpenApiSchemaDoc).components.schemas;
    expect(schemas.User).toBeDefined();
    expect(schemas.User.type).toBe('object');
    expect(schemas.User.required).toEqual(['id', 'name', 'role']);
    expect(schemas.User.properties?.id.format).toBe('uuid');
    expect(schemas.User.properties?.name.minLength).toBe(1);
    expect(schemas.User.properties?.bio.type).toEqual(['string', 'null']);
    expect(schemas.User.properties?.role.enum).toEqual(['admin', 'user']);
  });

  it('generates references using #/components/schemas/<Name>', () => {
    const doc = S.document({
      Order: S.object({
        id: S.required(S.string()),
        customer: S.required(S.ref('Customer')),
      }),
      Customer: S.object({
        name: S.required(S.string()),
      }),
    });

    const output = generateOpenApi(doc);
    const parsed = JSON.parse(output) as {
      components: {
        schemas: {
          Order: { properties: { customer: { $ref: string } } };
        };
      };
    };

    expect(parsed.components.schemas.Order.properties.customer.$ref).toBe(
      '#/components/schemas/Customer',
    );
  });

  it('generates readOnly property attributes when marked readonly', () => {
    const doc = S.document({
      Post: S.object({
        id: S.prop(S.string(), { readonly: true }),
        title: S.required(S.string()),
      }),
    });

    const output = generateOpenApi(doc);
    const parsed = JSON.parse(output) as {
      components: {
        schemas: {
          Post: { properties: { id: { readOnly: boolean } } };
        };
      };
    };

    expect(parsed.components.schemas.Post.properties.id.readOnly).toBe(true);
  });

  it('is deterministic across repeated generations', () => {
    const doc = S.document({
      Zebra: S.object({ z: S.required(S.string()) }),
      Apple: S.object({
        b: S.required(S.number()),
        a: S.required(S.string()),
      }),
    });

    const out1 = generateOpenApi(doc);
    const out2 = generateOpenApi(doc);

    expect(out1).toBe(out2);

    // Verify alphabetical ordering of keys
    const parsed = JSON.parse(out1) as {
      components: {
        schemas: Record<string, { properties: Record<string, unknown> }>;
      };
    };
    expect(Object.keys(parsed.components.schemas)).toEqual(['Apple', 'Zebra']);
    expect(Object.keys(parsed.components.schemas.Apple.properties)).toEqual(['a', 'b']);
  });

  it('roundtrips through parse and generate', () => {
    const doc = S.document({
      Product: S.object({
        sku: S.required(S.string({ minLength: 3 })),
        price: S.required(S.number({ minimum: 0 })),
        tags: S.optional(S.array(S.string())),
      }),
    });

    const generated = generateOpenApi(doc);
    const reparsed = parseOpenApi(generated);

    expect(Object.keys(reparsed.definitions)).toEqual(['Product']);
    expect(reparsed.definitions.Product.kind).toBe('object');
  });
});
