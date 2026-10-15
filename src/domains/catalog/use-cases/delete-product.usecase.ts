import { CatalogRepository } from '../catalog.repository';

export class DeleteProductUseCase {
  constructor(private catalogRepository = new CatalogRepository()) {}

  async execute(id: string): Promise<boolean> {
    const success = await this.catalogRepository.softDelete(id);
    if (!success) {
      throw new Error('Vinho não encontrado ou já foi excluído logicamente.');
    }
    return true;
  }
}
