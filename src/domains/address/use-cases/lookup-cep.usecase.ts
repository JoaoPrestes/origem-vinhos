import type { CepLookupService } from '../address.service';
import type { CepResult } from '../schema';
import { ViaCepAdapter } from '../../../infra/cep/viacep.adapter';
import type { UseCase } from '../../../shared/use-case';

export class LookupCepUseCase implements UseCase<string, CepResult> {
  constructor(private cepLookupService: CepLookupService = new ViaCepAdapter()) {}

  async execute(zipCode: string): Promise<CepResult> {
    return await this.cepLookupService.lookupCep(zipCode);
  }
}
