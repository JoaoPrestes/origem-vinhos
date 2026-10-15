import { UserRepository } from '../user.repository';

export class DeleteUserAccountUseCase {
  constructor(private userRepository = new UserRepository()) {}

  async execute(userId: string): Promise<boolean> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('Usuário não encontrado.');
    }
    return await this.userRepository.deleteUser(userId);
  }
}
