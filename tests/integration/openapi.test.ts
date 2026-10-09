import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, it, expect } from 'vitest';
import { convert, parse, generate, getDefaultRegistry } from '../../src/index';

const FIXTURES_DIR = path.resolve(__dirname, '../../fixtures');
const petstorePath = path.join(FIXTURES_DIR, 'openapi', 'petstore.openapi.json');
const ecommercePath = path.join(FIXTURES_DIR, 'openapi', 'ecommerce.openapi.json');

const petstoreSource = fs.readFileSync(petstorePath, 'utf8');
const ecommerceSource = fs.readFileSync(ecommercePath, 'utf8');

describe('OpenAPI 3.1 Integration Tests', () => {
  const registry = getDefaultRegistry();

  it('registers openapi adapter in default registry with aliases and extensions', () => {
    expect(registry.has('openapi')).toBe(true);
    expect(registry.has('oas')).toBe(true);
    expect(registry.has('oas3')).toBe(true);
    expect(registry.has('openapi3.1')).toBe(true);

    const adapter = registry.get('openapi');
    expect(adapter.name).toBe('OpenAPI 3.1');
    expect(adapter.extensions).toContain('.openapi.json');
  });

  describe('OpenAPI 3.1 -> Target Formats', () => {
    it('converts OpenAPI 3.1 to TypeScript with appropriate loss diagnostics', () => {
      const result = convert(petstoreSource, {
        from: 'openapi',
        to: 'typescript',
      });

      expect(result.output).toContain('export interface Pet');
      expect(result.output).toContain('export interface Category');
      expect(result.output).toContain('category?: Category;');
      expect(result.output).toContain('status?: "available" | "pending" | "sold";');

      // Constraints like minimum, minLength, format are dropped in TypeScript
      expect(result.diagnostics.length).toBeGreaterThan(0);
      const droppedConstraints = result.diagnostics.filter((d) =>
        d.message.includes('dropped'),
      );
      expect(droppedConstraints.length).toBeGreaterThan(0);
    });

    it('converts OpenAPI 3.1 to JSON Schema with zero loss', () => {
      const result = convert(petstoreSource, {
        from: 'openapi',
        to: 'json-schema',
      });

      expect(result.diagnostics).toHaveLength(0);

      const parsed = JSON.parse(result.output);
      expect(parsed.$defs).toBeDefined();
      expect(parsed.$defs.Pet).toBeDefined();
      expect(parsed.$defs.Pet.properties.name.minLength).toBe(1);
    });

    it('converts OpenAPI 3.1 to Zod', () => {
      const result = convert(petstoreSource, {
        from: 'openapi',
        to: 'zod',
      });

      expect(result.output).toContain('export const Pet = z.object({');
      expect(result.output).toContain('export const Category = z.object({');
      expect(result.output).toContain('category: Category.optional()');
    });

    it('converts rich e-commerce OpenAPI 3.1 with unions, nullables, and records', () => {
      const tsResult = convert(ecommerceSource, {
        from: 'openapi',
        to: 'typescript',
      });

      expect(tsResult.output).toContain('export interface Order');
      expect(tsResult.output).toContain('notes?: string | null;');
      expect(tsResult.output).toContain('customMetadata?: Record<string, string>;');

      const zodResult = convert(ecommerceSource, {
        from: 'openapi',
        to: 'zod',
      });

      expect(zodResult.output).toContain('export const Order = z.object({');
      expect(zodResult.output).toContain('export const Payment = z.union([');
    });
  });

  describe('Source Formats -> OpenAPI 3.1', () => {
    it('converts TypeScript to OpenAPI 3.1 specification', () => {
      const tsSource = `
        export interface Article {
          id: string;
          title: string;
          views: number;
          published?: boolean;
        }
      `;

      const result = convert(tsSource, {
        from: 'typescript',
        to: 'openapi',
      });

      expect(result.diagnostics).toHaveLength(0);

      const openapi = JSON.parse(result.output);
      expect(openapi.openapi).toBe('3.1.0');
      expect(openapi.components.schemas.Article).toBeDefined();
      expect(openapi.components.schemas.Article.type).toBe('object');
      expect(openapi.components.schemas.Article.required).toEqual(['id', 'title', 'views']);
    });

    it('converts JSON Schema to OpenAPI 3.1 specification', () => {
      const jsonSchemaSource = JSON.stringify({
        $schema: 'http://json-schema.org/draft-07/schema#',
        title: 'Inventory',
        $defs: {
          Item: {
            type: 'object',
            properties: {
              sku: { type: 'string', minLength: 5 },
              quantity: { type: 'integer', minimum: 0 },
            },
            required: ['sku', 'quantity'],
          },
        },
      });

      const result = convert(jsonSchemaSource, {
        from: 'json-schema',
        to: 'openapi',
      });

      expect(result.diagnostics).toHaveLength(0);

      const openapi = JSON.parse(result.output);
      expect(openapi.openapi).toBe('3.1.0');
      expect(openapi.components.schemas.Item.properties.sku.minLength).toBe(5);
      expect(openapi.components.schemas.Item.properties.quantity.minimum).toBe(0);
    });

    it('converts Zod to OpenAPI 3.1 specification', () => {
      const zodSource = `
        export const Profile = z.object({
          username: z.string(),
          bio: z.string().optional(),
        });
      `;

      const result = convert(zodSource, {
        from: 'zod',
        to: 'openapi',
      });

      const openapi = JSON.parse(result.output);
      expect(openapi.openapi).toBe('3.1.0');
      expect(openapi.components.schemas.Profile).toBeDefined();
      expect(openapi.components.schemas.Profile.required).toEqual(['username']);
    });
  });

  describe('Loss Detection Diagnostics', () => {
    it('detects dropped constraints when converting OpenAPI to TypeScript', () => {
      const result = convert(petstoreSource, {
        from: 'openapi',
        to: 'typescript',
      });

      expect(result.diagnostics.length).toBeGreaterThan(0);
      const warnings = result.diagnostics.filter((d) => d.severity === 'warning');
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings.some((w) => w.sourceConstruct?.includes('constraint'))).toBe(true);
    });

    it('reports zero diagnostics when converting to zero-loss targets like JSON Schema', () => {
      const result = convert(petstoreSource, {
        from: 'openapi',
        to: 'json-schema',
      });

      expect(result.output).toBeDefined();
      expect(result.diagnostics).toHaveLength(0);
    });
  });

  describe('Determinism', () => {
    it('produces deterministic output across multiple runs', () => {
      const result1 = convert(ecommerceSource, { from: 'openapi', to: 'json-schema' });
      const result2 = convert(ecommerceSource, { from: 'openapi', to: 'json-schema' });
      expect(result1.output).toBe(result2.output);

      const ts1 = convert(ecommerceSource, { from: 'openapi', to: 'typescript' });
      const ts2 = convert(ecommerceSource, { from: 'openapi', to: 'typescript' });
      expect(ts1.output).toBe(ts2.output);
    });
  });
});
