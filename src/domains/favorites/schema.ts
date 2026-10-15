import { z } from 'zod';

export const toggleFavoriteSchema = z.object({
  productId: z.string().uuid('O ID do produto deve ser um UUID válido.'),
});

export type ToggleFavoriteInput = z.infer<typeof toggleFavoriteSchema>;
