import { AddressRepository } from './address.repository';
import type { CreateAddressInput, UpdateAddressInput, CepResult } from './schema';
import { ViaCepAdapter } from '../../infra/cep/viacep.adapter';
import { CreateAddressUseCase } from './use-cases/create-address.usecase';
import { GetUserAddressesUseCase } from './use-cases/get-user-addresses.usecase';
import { UpdateAddressUseCase } from './use-cases/update-address.usecase';
import { DeleteAddressUseCase } from './use-cases/delete-address.usecase';
import { SetDefaultAddressUseCase } from './use-cases/set-default-address.usecase';
import { LookupCepUseCase } from './use-cases/lookup-cep.usecase';

export interface CepLookupService {
  lookupCep(zipCode: string): Promise<CepResult>;
}

export class AddressService {
  private createAddressUseCase: CreateAddressUseCase;
  private getUserAddressesUseCase: GetUserAddressesUseCase;
  private updateAddressUseCase: UpdateAddressUseCase;
  private deleteAddressUseCase: DeleteAddressUseCase;
  private setDefaultAddressUseCase: SetDefaultAddressUseCase;
  private lookupCepUseCase: LookupCepUseCase;

  constructor(
    repository = new AddressRepository(),
    cepLookupService: CepLookupService = new ViaCepAdapter()
  ) {
    this.createAddressUseCase = new CreateAddressUseCase(repository);
    this.getUserAddressesUseCase = new GetUserAddressesUseCase(repository);
    this.updateAddressUseCase = new UpdateAddressUseCase(repository);
    this.deleteAddressUseCase = new DeleteAddressUseCase(repository);
    this.setDefaultAddressUseCase = new SetDefaultAddressUseCase(repository);
    this.lookupCepUseCase = new LookupCepUseCase(cepLookupService);
  }

  async createAddress(userId: string, input: CreateAddressInput) {
    return await this.createAddressUseCase.execute(userId, input);
  }

  async getUserAddresses(userId: string) {
    return await this.getUserAddressesUseCase.execute(userId);
  }

  async getAddressById(id: string, userId: string) {
    const addresses = await this.getUserAddresses(userId);
    const address = addresses.find(a => a.id === id);
    if (!address) {
      throw new Error('Endereço não encontrado ou não pertence a este usuário.');
    }
    return address;
  }

  async updateAddress(id: string, userId: string, input: UpdateAddressInput) {
    return await this.updateAddressUseCase.execute(id, userId, input);
  }

  async deleteAddress(id: string, userId: string) {
    return await this.deleteAddressUseCase.execute(id, userId);
  }

  async setDefaultAddress(id: string, userId: string) {
    return await this.setDefaultAddressUseCase.execute(id, userId);
  }

  async lookupCep(zipCode: string): Promise<CepResult> {
    return await this.lookupCepUseCase.execute(zipCode);
  }
}
