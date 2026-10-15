import { AddressRepository } from '../address.repository';
import { updateAddressSchema } from '../schema';
import type { UpdateAddressInput } from '../schema';

export class UpdateAddressUseCase {
  constructor(private repository = new AddressRepository()) {}

  async execute(id: string, userId: string, input: UpdateAddressInput) {
    const validatedData = updateAddressSchema.parse(input);
    
    const existing = await this.repository.findById(id, userId);
    if (!existing) {
      throw new Error('Endereço não encontrado ou não pertence a este usuário.');
    }

    const updated = await this.repository.update(id, userId, validatedData);
    if (!updated) {
      throw new Error('Falha ao atualizar endereço.');
    }

    return updated;
  }
}
