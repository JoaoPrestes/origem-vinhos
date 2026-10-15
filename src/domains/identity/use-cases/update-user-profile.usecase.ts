import { UserRepository } from '../user.repository';
import { updateProfileSchema } from '../schema';
import { z } from 'zod';

export type UpdateUserInput = z.infer<typeof updateProfileSchema>;

export class UpdateUserProfileUseCase {
  constructor(private userRepository = new UserRepository()) {}

  async execute(userId: string, input: UpdateUserInput) {
    const validated = updateProfileSchema.parse(input);

    const currentUser = await this.userRepository.findById(userId);
    if (!currentUser) {
      throw new Error('Usuário não encontrado.');
    }

    if (validated.email && validated.email !== currentUser.email) {
      const existingUser = await this.userRepository.findByEmail(validated.email);
      if (existingUser) {
        throw new Error('O e-mail informado já está em uso por outro usuário.');
      }
    }

    let birthDateObj: Date | undefined;
    if (validated.birthDate) {
      birthDateObj = new Date(validated.birthDate);
      const today = new Date();
      let age = today.getFullYear() - birthDateObj.getFullYear();
      const m = today.getMonth() - birthDateObj.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDateObj.getDate())) {
        age--;
      }
      if (age < 18) {
        throw new Error('A idade mínima permitida é 18 anos.');
      }
    }

    let passwordHash: string | undefined;
    if (validated.password) {
      passwordHash = await Bun.password.hash(validated.password);
    }

    const updatedUser = await this.userRepository.updateUser(userId, {
      name: validated.name,
      email: validated.email,
      password: passwordHash,
      birthDate: birthDateObj,
    });

    const { password, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }
}
