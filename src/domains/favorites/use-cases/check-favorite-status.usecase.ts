import { FavoritesRepository } from '../favorites.repository';

export class CheckFavoriteStatusUseCase {
  constructor(private favoritesRepository = new FavoritesRepository()) {}

  async execute(userId: string, productId: string): Promise<boolean> {
    return await this.favoritesRepository.isFavorited(userId, productId);
  }
}
