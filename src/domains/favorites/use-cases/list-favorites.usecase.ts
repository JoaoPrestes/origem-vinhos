import { FavoritesRepository } from '../favorites.repository';

export class ListFavoritesUseCase {
  constructor(private favoritesRepository = new FavoritesRepository()) {}

  async execute(userId: string) {
    return await this.favoritesRepository.listByUser(userId);
  }

  async getIds(userId: string): Promise<string[]> {
    return await this.favoritesRepository.getFavoriteProductIds(userId);
  }
}
