import { CatalogRepository } from '../catalog.repository';

export interface ProductFilters {
  type?: string | null;
  grape?: string | null;
  country?: string | null;
}

export class ListProductsUseCase {
  constructor(private catalogRepository = new CatalogRepository()) {}

  async execute(filters: ProductFilters = {}) {
    let productsList = await this.catalogRepository.listActive();

    if (filters.type) {
      productsList = productsList.filter(
        p => p.type.toLowerCase() === filters.type!.toLowerCase()
      );
    }
    if (filters.grape) {
      productsList = productsList.filter(
        p => p.grape.toLowerCase().includes(filters.grape!.toLowerCase())
      );
    }
    if (filters.country) {
      productsList = productsList.filter(
        p => p.country.toLowerCase().includes(filters.country!.toLowerCase())
      );
    }

    return productsList;
  }
}
