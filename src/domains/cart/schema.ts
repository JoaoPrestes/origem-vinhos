import { z } from 'zod';

export const addToCartSchema = z.object({
  productId: z.string().uuid('Identificador de produto inválido (deve ser um UUID).'),
  quantity: z.number().int().positive('A quantidade deve ser um número inteiro positivo.').optional().default(1),
});

export const updateCartItemSchema = z.object({
  quantity: z.number().int('A quantidade deve ser um número inteiro.'),
});
