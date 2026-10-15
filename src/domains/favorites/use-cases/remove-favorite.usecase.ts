import { FavoritesRepository } from '../favorites.repository';

export class RemoveFavoriteUseCase {
  constructor(private favoritesRepository = new FavoritesRepository()) {}

  async execute(userId: string, productId: string): Promise<boolean> {
    return await this.favoritesRepository.remove(userId, productId);
  }
}
