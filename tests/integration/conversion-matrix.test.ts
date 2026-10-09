import { describe, it, expect } from 'vitest';
import { convert, parse, generate } from '../../src/index';

describe('Phase 1: Full Conversion Validation Matrix', () => {
  // Realistic schema with comprehensive constructs
  const comprehensiveTs = `
/**
 * User account status.
 */
export type UserStatus = 'active' | 'suspended' | 'pending';

/**
 * Audit log entry tracking actions.
 */
export interface AuditEntry {
  timestamp: string;
  action: string;
  details?: Record<string, string>;
}

/**
 * Complete user profile definition.
 */
export interface UserAccount {
  id: string;
  username: string;
  email: string;
  status: UserStatus;
  age?: number;
  scores: number[];
  coordinate?: [number, number];
  metadata?: Record<string, string>;
  bio?: string | null;
  history: AuditEntry[];
}
  `.trim();

  // 1. TypeScript -> JSON Schema
  it('converts TypeScript -> JSON Schema with complex constructs', () => {
    const result = convert(comprehensiveTs, {
      from: 'typescript',
      to: 'json-schema',
    });

    expect(result.output).toBeDefined();
    const parsed = JSON.parse(result.output);
    expect(parsed.$defs).toBeDefined();
    expect(parsed.$defs.UserAccount).toBeDefined();
    expect(parsed.$defs.UserStatus).toBeDefined();
    expect(parsed.$defs.AuditEntry).toBeDefined();

    const userAccount = parsed.$defs.UserAccount;
    expect(userAccount.type).toBe('object');
    expect(userAccount.required).toContain('id');
    expect(userAccount.required).toContain('username');
    expect(userAccount.required).toContain('email');
    expect(userAccount.required).toContain('status');
    expect(userAccount.required).toContain('scores');
    expect(userAccount.required).toContain('history');
    expect(userAccount.required).not.toContain('age');
    expect(userAccount.required).not.toContain('bio');

    // Tuple
    expect(userAccount.properties.coordinate.type).toBe('array');
    expect(userAccount.properties.coordinate.items).toHaveLength(2);

    // Record
    expect(userAccount.properties.metadata.type).toBe('object');
    expect(userAccount.properties.metadata.additionalProperties.type).toBe('string');

    // Nullable bio
    expect(userAccount.properties.bio.type).toEqual(['string', 'null']);

    // Enum
    expect(parsed.$defs.UserStatus.enum).toEqual(['active', 'suspended', 'pending']);
  });

  // 2. TypeScript -> Zod
  it('converts TypeScript -> Zod with complex constructs', () => {
    const result = convert(comprehensiveTs, {
      from: 'typescript',
      to: 'zod',
    });

    expect(result.output).toContain("import { z } from 'zod';");
    expect(result.output).toContain(
      'export const UserStatus = z.enum(["active", "suspended", "pending"])',
    );
    expect(result.output).toContain('export const AuditEntry = z.object({');
    expect(result.output).toContain('export const UserAccount = z.object({');
    expect(result.output).toContain('id: z.string(),');
    expect(result.output).toContain('status: UserStatus,');
    expect(result.output).toContain('age: z.number().optional(),');
    expect(result.output).toContain('scores: z.array(z.number()),');
    expect(result.output).toContain('coordinate: z.tuple([z.number(), z.number()]).optional(),');
    expect(result.output).toContain('metadata: z.record(z.string(), z.string()).optional(),');
    expect(result.output).toContain('bio: z.string().nullable().optional(),');
    expect(result.output).toContain('history: z.array(AuditEntry),');
  });

  // 3. JSON Schema -> TypeScript
  it('converts JSON Schema -> TypeScript preserving structure and types', () => {
    const jsonSchema = JSON.stringify({
      $schema: 'http://json-schema.org/draft-07/schema#',
      definitions: {
        Role: {
          type: 'string',
          enum: ['admin', 'manager', 'user'],
          description: 'Permission level',
        },
        Profile: {
          type: 'object',
          description: 'User profile details',
          properties: {
            id: { type: 'string', format: 'uuid' },
            displayName: { type: 'string', minLength: 1, maxLength: 50 },
            role: { $ref: '#/definitions/Role' },
            tags: { type: 'array', items: { type: 'string' } },
            settings: {
              type: 'object',
              additionalProperties: { type: 'boolean' },
            },
            notes: { type: ['string', 'null'] },
          },
          required: ['id', 'displayName', 'role', 'tags'],
        },
      },
    });

    const result = convert(jsonSchema, {
      from: 'json-schema',
      to: 'typescript',
      generateOptions: { header: false },
    });

    expect(result.output).toContain('export type Role = "admin" | "manager" | "user";');
    expect(result.output).toContain('export interface Profile {');
    expect(result.output).toContain('id: string;');
    expect(result.output).toContain('displayName: string;');
    expect(result.output).toContain('role: Role;');
    expect(result.output).toContain('tags: string[];');
    expect(result.output).toContain('settings?: Record<string, boolean>;');
    expect(result.output).toContain('notes?: string | null;');
    expect(result.output).toContain('* User profile details');
  });

  // 4. JSON Schema -> Zod
  it('converts JSON Schema -> Zod with constraints, defaults, and descriptions', () => {
    const jsonSchema = JSON.stringify({
      $schema: 'http://json-schema.org/draft-07/schema#',
      definitions: {
        Product: {
          type: 'object',
          description: 'Inventory item',
          properties: {
            sku: { type: 'string', pattern: '^[A-Z]{3}-[0-9]{4}$', description: 'Stock unit' },
            price: { type: 'number', minimum: 0, exclusiveMaximum: 10000 },
            inStock: { type: 'boolean', default: true },
            category: { type: 'string', enum: ['electronics', 'apparel', 'food'] },
            ratings: { type: 'array', items: { type: 'number', minimum: 1, maximum: 5 } },
          },
          required: ['sku', 'price', 'category'],
        },
      },
    });

    const result = convert(jsonSchema, {
      from: 'json-schema',
      to: 'zod',
      generateOptions: { header: false },
    });

    expect(result.output).toContain("import { z } from 'zod';");
    expect(result.output).toContain('export const Product = z.object({');
    expect(result.output).toContain('sku: z.string().regex(/^[A-Z]{3}-[0-9]{4}$/).describe("Stock unit"),');
    expect(result.output).toContain('price: z.number().nonnegative()');
    expect(result.output).toContain('inStock: z.boolean().default(true).optional(),');
    expect(result.output).toContain('category: z.enum(["electronics", "apparel", "food"]),');
    expect(result.output).toContain('ratings: z.array(z.number().min(1).max(5)).optional(),');
    expect(result.output).toContain('.describe("Inventory item");');
  });

  // 5. Zod -> TypeScript
  it('converts Zod -> TypeScript accurately', () => {
    const zodSource = `
import { z } from 'zod';

export const Priority = z.enum(['low', 'medium', 'high', 'critical']);

export const Task = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(100),
  priority: Priority,
  estimateHours: z.number().int().min(1).optional(),
  labels: z.array(z.string()),
  metadata: z.record(z.string(), z.any()).optional(),
  completedAt: z.string().datetime().nullable().optional(),
});
    `.trim();

    const result = convert(zodSource, {
      from: 'zod',
      to: 'typescript',
      generateOptions: { header: false },
    });

    expect(result.output).toContain('export type Priority = "low" | "medium" | "high" | "critical";');
    expect(result.output).toContain('export interface Task {');
    expect(result.output).toContain('id: string;');
    expect(result.output).toContain('title: string;');
    expect(result.output).toContain('priority: Priority;');
    expect(result.output).toContain('estimateHours?: number;');
    expect(result.output).toContain('labels: string[];');
    expect(result.output).toContain('metadata?: Record<string, unknown>;');
    expect(result.output).toContain('completedAt?: string | null;');
  });

  // 6. Zod -> JSON Schema
  it('converts Zod -> JSON Schema preserving rich validations and metadata', () => {
    const zodSource = `
import { z } from 'zod';

export const AccountTier = z.enum(['free', 'pro', 'enterprise']);

export const Account = z.object({
  accountId: z.string().uuid(),
  company: z.string().min(2).max(100),
  tier: AccountTier.default('free'),
  maxUsers: z.number().int().min(1).max(500),
  active: z.boolean().default(true),
  allowedDomains: z.array(z.string()),
  extraDetails: z.record(z.string(), z.string()).optional(),
  expiryDate: z.string().nullable().optional(),
});
    `.trim();

    const result = convert(zodSource, {
      from: 'zod',
      to: 'json-schema',
    });

    const parsed = JSON.parse(result.output);
    expect(parsed.$defs).toBeDefined();
    expect(parsed.$defs.AccountTier).toBeDefined();
    expect(parsed.$defs.Account).toBeDefined();

    const account = parsed.$defs.Account;
    expect(account.type).toBe('object');
    expect(account.properties.accountId.type).toBe('string');
    expect(account.properties.accountId.format).toBe('uuid');
    expect(account.properties.company.minLength).toBe(2);
    expect(account.properties.company.maxLength).toBe(100);
    expect(account.properties.maxUsers.type).toBe('integer');
    expect(account.properties.maxUsers.minimum).toBe(1);
    expect(account.properties.maxUsers.maximum).toBe(500);
    expect(account.properties.active.type).toBe('boolean');
    expect(account.properties.active.default).toBe(true);
    expect(account.properties.allowedDomains.type).toBe('array');
    expect(account.properties.extraDetails.type).toBe('object');
    expect(account.properties.extraDetails.additionalProperties.type).toBe('string');
    expect(account.properties.expiryDate.type).toEqual(['string', 'null']);
  });

  // 7. Output Determinism
  it('produces identical byte-for-byte output across multiple runs', () => {
    const run1 = convert(comprehensiveTs, { from: 'typescript', to: 'json-schema' });
    const run2 = convert(comprehensiveTs, { from: 'typescript', to: 'json-schema' });
    expect(run1.output).toBe(run2.output);

    const zodRun1 = convert(comprehensiveTs, { from: 'typescript', to: 'zod' });
    const zodRun2 = convert(comprehensiveTs, { from: 'typescript', to: 'zod' });
    expect(zodRun1.output).toBe(zodRun2.output);
  });
});
