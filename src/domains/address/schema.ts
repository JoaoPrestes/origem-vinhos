import { z } from 'zod';

export const createAddressSchema = z.object({
  zipCode: z
    .string()
    .min(1, 'O CEP é obrigatório.')
    .transform((val) => val.replace(/\D/g, ''))
    .refine((val) => val.length === 8, 'O CEP deve conter exatamente 8 dígitos numéricos.'),
  street: z.string().min(1, 'O logradouro é obrigatório.'),
  number: z.string().min(1, 'O número é obrigatório.'),
  complement: z.string().optional(),
  neighborhood: z.string().min(1, 'O bairro é obrigatório.'),
  city: z.string().min(1, 'A cidade é obrigatória.'),
  state: z
    .string()
    .length(2, 'O estado deve possuir a sigla de exatamente 2 letras (ex: SP).')
    .transform((val) => val.toUpperCase()),
  label: z.string().min(1, 'A identificação do endereço é obrigatória (ex: Casa, Trabalho).'),
});

export const updateAddressSchema = createAddressSchema.partial();

export const cepQuerySchema = z.object({
  zipCode: z
    .string()
    .min(1, 'O CEP é obrigatório.')
    .transform((val) => val.replace(/\D/g, ''))
    .refine((val) => val.length === 8, 'O CEP deve conter exatamente 8 dígitos numéricos.'),
});

export type CreateAddressInput = z.infer<typeof createAddressSchema>;
export type UpdateAddressInput = z.infer<typeof updateAddressSchema>;

export interface Address {
  id: string;
  userId: string;
  zipCode: string;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  label: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CepResult {
  zipCode: string;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
  complement?: string;
  found: boolean;
  error?: string;
}
