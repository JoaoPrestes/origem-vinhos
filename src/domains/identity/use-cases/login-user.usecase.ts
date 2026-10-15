import { UserRepository } from '../user.repository';
import { loginSchema } from '../schema';
import { z } from 'zod';

export type LoginInput = z.infer<typeof loginSchema>;

export class LoginUserUseCase {
  constructor(private userRepository = new UserRepository()) {}

  async execute(input: LoginInput) {
    const validated = loginSchema.parse(input);

    const user = await this.userRepository.findByEmail(validated.email);
    if (!user) {
      throw new Error('Credenciais inválidas.');
    }

    const isPasswordValid = await Bun.password.verify(validated.password, user.password);
    if (!isPasswordValid) {
      throw new Error('Credenciais inválidas.');
    }

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}
