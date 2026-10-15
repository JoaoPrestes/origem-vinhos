import { z } from 'zod';

const wineTypeEnum = z.enum(['Tinto', 'Branco', 'Rosé', 'Espumante', 'Sobremesa']);

export const createProductSchema = z.object({
  name: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres.'),
  price: z.preprocess(
    (val) => (typeof val === 'string' ? parseFloat(val) : val),
    z.number().positive('O preço deve ser maior que zero.')
  ),
  description: z.string().min(1, 'A descrição é obrigatória.'),
  image: z.string().url('A imagem deve ser uma URL válida.').or(z.string().min(1, 'O caminho da imagem é obrigatório.')),
  type: wineTypeEnum,
  grape: z.string().min(1, 'A uva principal é obrigatória.'),
  country: z.string().min(1, 'O país de origem é obrigatório.'),
  harvest: z.number().int().min(1800, 'Safra inválida.').max(new Date().getFullYear() + 2, 'Safra no futuro inválida.'),
  alcohol: z.preprocess(
    (val) => (typeof val === 'string' ? parseFloat(val) : val),
    z.number().positive('O teor alcoólico deve ser maior que zero.')
  ),
});

export const updateProductSchema = createProductSchema.partial();
