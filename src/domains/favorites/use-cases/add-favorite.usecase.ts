import { FavoritesRepository } from '../favorites.repository';
import { CatalogRepository } from '../../catalog/catalog.repository';

export class AddFavoriteUseCase {
  constructor(
    private favoritesRepository = new FavoritesRepository(),
    private catalogRepository = new CatalogRepository()
  ) {}

  async execute(userId: string, productId: string): Promise<boolean> {
    const product = await this.catalogRepository.findActiveById(productId);
    if (!product) {
      throw new Error('Vinho não encontrado ou indisponível.');
    }
    return await this.favoritesRepository.add(userId, productId);
  }
}
