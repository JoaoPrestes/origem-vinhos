import { CatalogRepository } from '../catalog.repository';
import { createProductSchema } from '../schema';
import { z } from 'zod';

export type CreateProductInput = z.infer<typeof createProductSchema>;

export class CreateProductUseCase {
  constructor(private catalogRepository = new CatalogRepository()) {}

  async execute(input: CreateProductInput) {
    const parsedData = createProductSchema.parse(input);

    return await this.catalogRepository.create({
      name: parsedData.name,
      price: parsedData.price.toFixed(2),
      description: parsedData.description,
      image: parsedData.image,
      type: parsedData.type,
      grape: parsedData.grape,
      country: parsedData.country,
      harvest: parsedData.harvest,
      alcohol: parsedData.alcohol.toFixed(2),
      stock: parsedData.stock ?? 0,
      sensory_profile: parsedData.sensory_profile ?? null,
      pairing: parsedData.pairing ?? null,
      harvest_notes: parsedData.harvest_notes ?? null,
    });
  }
}
