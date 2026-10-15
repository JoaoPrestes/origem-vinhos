import { AddressRepository } from '../address.repository';

export class GetUserAddressesUseCase {
  constructor(private repository = new AddressRepository()) {}

  async execute(userId: string) {
    return await this.repository.findByUserId(userId);
  }
}
