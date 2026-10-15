import { FavoritesRepository } from '../favorites.repository';
import { CatalogRepository } from '../../catalog/catalog.repository';
import { toggleFavoriteSchema } from '../schema';
import type { ToggleFavoriteInput } from '../schema';

export class ToggleFavoriteUseCase {
  constructor(
    private favoritesRepository = new FavoritesRepository(),
    private catalogRepository = new CatalogRepository()
  ) {}

  async execute(userId: string, input: ToggleFavoriteInput): Promise<{ isFavorited: boolean }> {
    const validated = toggleFavoriteSchema.parse(input);

    const product = await this.catalogRepository.findActiveById(validated.productId);
    if (!product) {
      throw new Error('Vinho não encontrado ou indisponível.');
    }

    const currentlyFavorited = await this.favoritesRepository.isFavorited(userId, validated.productId);

    if (currentlyFavorited) {
      await this.favoritesRepository.remove(userId, validated.productId);
      return { isFavorited: false };
    } else {
      await this.favoritesRepository.add(userId, validated.productId);
      return { isFavorited: true };
    }
  }
}
