import { UserRepository } from '../user.repository';
import { registerSchema } from '../schema';
import { z } from 'zod';

export type RegisterInput = z.infer<typeof registerSchema>;

export class RegisterUserUseCase {
  constructor(private userRepository = new UserRepository()) {}

  async execute(input: RegisterInput) {
    const validated = registerSchema.parse(input);

    const birthDateObj = new Date(validated.birthDate);
    const today = new Date();
    let age = today.getFullYear() - birthDateObj.getFullYear();
    const m = today.getMonth() - birthDateObj.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDateObj.getDate())) {
      age--;
    }

    if (age < 18) {
      throw new Error('Cadastro permitido apenas para maiores de 18 anos.');
    }

    const existingUser = await this.userRepository.findByEmail(validated.email);
    if (existingUser) {
      throw new Error('E-mail já cadastrado.');
    }

    const passwordHash = await Bun.password.hash(validated.password);

    const newUser = await this.userRepository.createUser({
      name: validated.name,
      email: validated.email,
      password: passwordHash,
      birthDate: birthDateObj,
      profile: 'Customer',
    });

    const { password, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
  }
}
