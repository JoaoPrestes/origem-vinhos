import { UserRepository } from '../user.repository';

export class GetUserProfileUseCase {
  constructor(private userRepository = new UserRepository()) {}

  async execute(userId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('Usuário não encontrado.');
    }
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}
