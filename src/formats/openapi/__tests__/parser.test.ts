import { describe, it, expect } from 'vitest';
import { parseOpenApi } from '../parser';
import { ParseError } from '../../../core/errors';
import type { ObjectSchema, StringSchema, NumberSchema } from '../../../core/types';

describe('OpenAPI 3.1 Parser', () => {
  it('parses components.schemas into SchemaIR definitions', () => {
    const source = JSON.stringify({
      openapi: '3.1.0',
      info: {
        title: 'User Service API',
        description: 'User management service',
      },
      components: {
        schemas: {
          User: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              name: { type: 'string', minLength: 1, maxLength: 100 },
              age: { type: 'integer', minimum: 0, maximum: 150 },
              role: { type: 'string', enum: ['admin', 'user', 'guest'] },
              email: { type: 'string', format: 'email' },
              createdAt: { type: 'string', readOnly: true },
            },
            required: ['id', 'name'],
          },
        },
      },
    });

    const doc = parseOpenApi(source);

    expect(doc.metadata?.title).toBe('User Service API');
    expect(doc.metadata?.description).toBe('User management service');
    expect(doc.metadata?.sourceFormat).toBe('openapi');

    const user = doc.definitions.User as ObjectSchema;
    expect(user).toBeDefined();
    expect(user.kind).toBe('object');
    expect(user.properties.id.optional).toBe(false);
    expect((user.properties.id.schema as StringSchema).format).toBe('uuid');
    expect(user.properties.name.optional).toBe(false);
    expect((user.properties.name.schema as StringSchema).minLength).toBe(1);
    expect(user.properties.age.optional).toBe(true);
    expect((user.properties.age.schema as NumberSchema).minimum).toBe(0);
    expect(user.properties.createdAt.readonly).toBe(true);
  });

  it('parses references to other component schemas', () => {
    const source = JSON.stringify({
      openapi: '3.1.0',
      info: { title: 'Order API' },
      components: {
        schemas: {
          Order: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              customer: { $ref: '#/components/schemas/Customer' },
            },
            required: ['id', 'customer'],
          },
          Customer: {
            type: 'object',
            properties: {
              name: { type: 'string' },
            },
          },
        },
      },
    });

    const doc = parseOpenApi(source);
    const order = doc.definitions.Order as ObjectSchema;
    expect(order.properties.customer.schema).toEqual({
      kind: 'ref',
      ref: 'Customer',
    });
  });

  it('parses unions (oneOf, anyOf) and intersections (allOf)', () => {
    const source = JSON.stringify({
      openapi: '3.1.0',
      info: { title: 'Shapes' },
      components: {
        schemas: {
          Shape: {
            oneOf: [
              { $ref: '#/components/schemas/Circle' },
              { $ref: '#/components/schemas/Square' },
            ],
          },
          Timestamped: {
            allOf: [
              { $ref: '#/components/schemas/Base' },
              {
                type: 'object',
                properties: { timestamp: { type: 'number' } },
              },
            ],
          },
        },
      },
    });

    const doc = parseOpenApi(source);
    expect(doc.definitions.Shape.kind).toBe('union');
    expect(doc.definitions.Timestamped.kind).toBe('intersection');
  });

  it('parses nullable types via type array and OpenAPI 3.0 nullable flag', () => {
    const source = JSON.stringify({
      openapi: '3.1.0',
      info: { title: 'Nullable Test' },
      components: {
        schemas: {
          Profile: {
            type: 'object',
            properties: {
              bio: { type: ['string', 'null'] },
              website: { type: 'string', nullable: true },
            },
          },
        },
      },
    });

    const doc = parseOpenApi(source);
    const profile = doc.definitions.Profile as ObjectSchema;
    expect(profile.properties.bio.schema.nullable).toBe(true);
    expect(profile.properties.website.schema.nullable).toBe(true);
  });

  it('parses tuple via prefixItems and records via additionalProperties', () => {
    const source = JSON.stringify({
      openapi: '3.1.0',
      info: { title: 'Tuples and Records' },
      components: {
        schemas: {
          Coordinates: {
            type: 'array',
            prefixItems: [{ type: 'number' }, { type: 'number' }],
          },
          Metadata: {
            type: 'object',
            additionalProperties: { type: 'string' },
          },
        },
      },
    });

    const doc = parseOpenApi(source);
    expect(doc.definitions.Coordinates.kind).toBe('tuple');
    expect(doc.definitions.Metadata.kind).toBe('record');
  });

  it('rejects OpenAPI 2.0 (Swagger) with an explicit error', () => {
    const source = JSON.stringify({
      swagger: '2.0',
      openapi: '2.0',
      info: { title: 'Old Swagger' },
    });

    expect(() => parseOpenApi(source)).toThrow(ParseError);
    expect(() => parseOpenApi(source)).toThrow(/OpenAPI 2\.0/);
  });

  it('provides actionable guidance when given YAML content', () => {
    const yamlSource = `
openapi: 3.1.0
info:
  title: Petstore
components:
  schemas:
    Pet:
      type: object
`;

    expect(() => parseOpenApi(yamlSource)).toThrow(ParseError);
    expect(() => parseOpenApi(yamlSource)).toThrow(/YAML format/);
  });

  it('throws on invalid JSON input', () => {
    expect(() => parseOpenApi('{ invalid json')).toThrow(ParseError);
  });

  it('throws if no schemas are defined', () => {
    const emptyDoc = JSON.stringify({
      openapi: '3.1.0',
      info: { title: 'Empty' },
      paths: {},
    });

    expect(() => parseOpenApi(emptyDoc)).toThrow(ParseError);
    expect(() => parseOpenApi(emptyDoc)).toThrow(/No schema definitions found/);
  });
});
