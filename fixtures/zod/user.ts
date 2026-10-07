import { z } from 'zod';

export const AddressSchema = z.object({
  street: z.string(),
  city: z.string(),
  zipCode: z.string().regex(/^[0-9]{5}$/),
  country: z.string().optional(),
});

export const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2).max(50),
  email: z.string().email(),
  age: z.number().int().min(0).max(150).optional(),
  role: z.enum(['admin', 'user', 'guest']),
  tags: z.array(z.string()),
  address: AddressSchema.optional(),
});
