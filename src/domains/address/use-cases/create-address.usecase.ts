import { AddressRepository } from '../address.repository';
import { createAddressSchema } from '../schema';
import type { CreateAddressInput } from '../schema';

export class CreateAddressUseCase {
  constructor(private repository = new AddressRepository()) {}

  async execute(userId: string, input: CreateAddressInput) {
    const validatedData = createAddressSchema.parse(input);
    const existingAddresses = await this.repository.findByUserId(userId);
    
    // Regra de Negócio RN-END-06.1: O primeiro endereço cadastrado torna-se automaticamente o padrão
    const isFirstAddress = existingAddresses.length === 0;

    return await this.repository.insert({
      ...validatedData,
      userId,
      isDefault: isFirstAddress,
    });
  }
}
