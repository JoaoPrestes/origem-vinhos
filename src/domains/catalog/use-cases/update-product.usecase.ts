import { CatalogRepository } from '../catalog.repository';
import { updateProductSchema } from '../schema';
import { z } from 'zod';

export type UpdateProductInput = z.infer<typeof updateProductSchema>;

export class UpdateProductUseCase {
  constructor(private catalogRepository = new CatalogRepository()) {}

  async execute(id: string, input: UpdateProductInput) {
    const parsedData = updateProductSchema.parse(input);

    const updateData: any = {};
    if (parsedData.name) updateData.name = parsedData.name;
    if (parsedData.price !== undefined) updateData.price = parsedData.price.toFixed(2);
    if (parsedData.description) updateData.description = parsedData.description;
    if (parsedData.image) updateData.image = parsedData.image;
    if (parsedData.type) updateData.type = parsedData.type;
    if (parsedData.grape) updateData.grape = parsedData.grape;
    if (parsedData.country) updateData.country = parsedData.country;
    if (parsedData.harvest) updateData.harvest = parsedData.harvest;
    if (parsedData.alcohol !== undefined) updateData.alcohol = parsedData.alcohol.toFixed(2);
    if (parsedData.stock !== undefined) updateData.stock = parsedData.stock;
    if (parsedData.sensory_profile !== undefined) updateData.sensory_profile = parsedData.sensory_profile;
    if (parsedData.pairing !== undefined) updateData.pairing = parsedData.pairing;
    if (parsedData.harvest_notes !== undefined) updateData.harvest_notes = parsedData.harvest_notes;

    return await this.catalogRepository.update(id, updateData);
  }
}
