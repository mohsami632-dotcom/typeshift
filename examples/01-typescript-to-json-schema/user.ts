/**
 * User domain entity representing an authenticated platform user.
 */
export interface User {
  id: string;
  name: string;
  email: string;
  age?: number;
  role: 'admin' | 'member' | 'guest';
  tags?: string[];
  metadata?: Record<string, string>;
}
