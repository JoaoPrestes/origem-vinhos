import { z } from 'zod';

// Schema para validação de Cadastro (Registro de Usuário)
export const registerSchema = z.object({
  name: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres.'),
  email: z.string().email('E-mail inválido.'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres.'),
  birthDate: z.preprocess(
    (val) => (typeof val === 'string' || val instanceof Date ? new Date(val) : val),
    z.date().refine((date) => {
      const today = new Date();
      let age = today.getFullYear() - date.getFullYear();
      const m = today.getMonth() - date.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < date.getDate())) {
        age--;
      }
      return age >= 18;
    }, 'Você deve ter 18 anos ou mais para se cadastrar.')
  ),
});

// Schema para validação de Login
export const loginSchema = z.object({
  email: z.string().email('E-mail inválido.'),
  password: z.string().min(1, 'A senha é obrigatória.'),
});

// Schema para atualização opcional do Perfil
export const updateProfileSchema = z.object({
  name: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres.').optional(),
  email: z.string().email('E-mail inválido.').optional(),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres.').optional(),
  birthDate: z.preprocess(
    (val) => (val ? new Date(val as string | Date) : undefined),
    z.date().refine((date) => {
      const today = new Date();
      let age = today.getFullYear() - date.getFullYear();
      const m = today.getMonth() - date.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < date.getDate())) {
        age--;
      }
      return age >= 21;
    }, 'Você deve ter 21 anos ou mais.').optional()
  ),
});
