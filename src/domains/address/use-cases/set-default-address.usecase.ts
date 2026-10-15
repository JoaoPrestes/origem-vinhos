import { AddressRepository } from '../address.repository';

export class SetDefaultAddressUseCase {
  constructor(private repository = new AddressRepository()) {}

  async execute(id: string, userId: string) {
    const existing = await this.repository.findById(id, userId);
    if (!existing) {
      throw new Error('Endereço não encontrado ou não pertence a este usuário.');
    }

    // Regra de Negócio RN-END-06.2: Alternância de Endereço Padrão
    await this.repository.clearDefaultFlags(userId);
    const updated = await this.repository.update(id, userId, { isDefault: true });

    if (!updated) {
      throw new Error('Falha ao definir endereço como padrão.');
    }

    return updated;
  }
}
