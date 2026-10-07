import { describe, it, expect } from 'vitest';
import { parseTypeScript } from '../parser';

describe('TypeScript Parser', () => {
  it('parses interface declarations with primitive properties', () => {
    const code = `
      export interface Person {
        name: string;
        age: number;
        isActive: boolean;
        notes?: string;
      }
    `;

    const doc = parseTypeScript(code);
    expect(doc.definitions.Person).toBeDefined();

    const person = doc.definitions.Person;
    expect(person.kind).toBe('object');
    if (person.kind === 'object') {
      expect(person.properties.name.schema.kind).toBe('string');
      expect(person.properties.name.optional).toBe(false);

      expect(person.properties.age.schema.kind).toBe('number');
      expect(person.properties.age.optional).toBe(false);

      expect(person.properties.isActive.schema.kind).toBe('boolean');

      expect(person.properties.notes.schema.kind).toBe('string');
      expect(person.properties.notes.optional).toBe(true);
    }
  });

  it('parses type aliases with unions and arrays', () => {
    const code = `
      export type Status = 'active' | 'inactive' | 'pending';
      export type Tags = string[];
      export interface Item {
        status: Status;
        tags: Tags;
      }
    `;

    const doc = parseTypeScript(code);
    expect(doc.definitions.Status).toBeDefined();
    const status = doc.definitions.Status;
    expect(status.kind).toBe('enum');
    if (status.kind === 'enum') {
      expect(status.values).toEqual(['active', 'inactive', 'pending']);
    }

    const tags = doc.definitions.Tags;
    expect(tags.kind).toBe('array');

    const item = doc.definitions.Item;
    expect(item.kind).toBe('object');
    if (item.kind === 'object') {
      expect(item.properties.status.schema.kind).toBe('ref');
    }
  });

  it('parses Record types', () => {
    const code = `
      export interface Config {
        settings: Record<string, number>;
      }
    `;

    const doc = parseTypeScript(code);
    const config = doc.definitions.Config;
    expect(config.kind).toBe('object');
    if (config.kind === 'object') {
      const settings = config.properties.settings.schema;
      expect(settings.kind).toBe('record');
      if (settings.kind === 'record') {
        expect(settings.keySchema.kind).toBe('string');
        expect(settings.valueSchema.kind).toBe('number');
      }
    }
  });

  it('parses JSDoc descriptions', () => {
    const code = `
      /** A registered user in the platform. */
      export interface User {
        /** The unique identifier. */
        id: string;
      }
    `;

    const doc = parseTypeScript(code);
    const user = doc.definitions.User;
    expect(user.description).toBe('A registered user in the platform.');
    if (user.kind === 'object') {
      expect(user.properties.id.description).toBe('The unique identifier.');
    }
  });

  it('throws ParseError when no interfaces or types are found', () => {
    const code = `const x = 42; console.log(x);`;
    expect(() => parseTypeScript(code)).toThrow('No type or interface declarations found');
  });

  it('throws ParseError on empty input', () => {
    expect(() => parseTypeScript('')).toThrow('No type or interface declarations found');
  });
});
