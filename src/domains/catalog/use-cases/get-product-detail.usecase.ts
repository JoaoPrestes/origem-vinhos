import { CatalogRepository } from '../catalog.repository';

export class GetProductDetailUseCase {
  constructor(private catalogRepository = new CatalogRepository()) {}

  async execute(id: string) {
    const product = await this.catalogRepository.findActiveById(id);
    if (!product) {
      throw new Error('Vinho não encontrado ou indisponível.');
    }
    return product;
  }
}
