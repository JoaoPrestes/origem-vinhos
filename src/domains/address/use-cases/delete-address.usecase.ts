import { AddressRepository } from '../address.repository';

export class DeleteAddressUseCase {
  constructor(private repository = new AddressRepository()) {}

  async execute(id: string, userId: string) {
    const targetAddress = await this.repository.findById(id, userId);
    if (!targetAddress) {
      throw new Error('Endereço não encontrado ou não pertence a este usuário.');
    }

    const wasDefault = targetAddress.isDefault;

    const deleted = await this.repository.delete(id, userId);
    if (!deleted) {
      throw new Error('Falha ao excluir endereço.');
    }

    // Regra de Negócio RN-END-06.3: Reatribuição Automática na Exclusão do Padrão
    if (wasDefault) {
      const remainingAddresses = await this.repository.findByUserId(userId);
      if (remainingAddresses.length > 0 && remainingAddresses[0]) {
        const nextDefault = remainingAddresses[0];
        await this.repository.clearDefaultFlags(userId);
        await this.repository.update(nextDefault.id, userId, { isDefault: true });
      }
    }

    return true;
  }
}
