/**
 * User schema fixture for TypeScript.
 */

export type Role = 'admin' | 'user' | 'guest';

export interface Address {
  street: string;
  city: string;
  zipCode: string;
  country?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  age?: number;
  role: Role;
  tags: string[];
  address?: Address;
  metadata?: Record<string, string>;
}
