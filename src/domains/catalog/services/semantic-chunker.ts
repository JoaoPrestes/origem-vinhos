export type SemanticChunkType = 'identidade' | 'sensorial' | 'harmonizacao' | 'safra_terroir';

export interface SemanticChunk {
  id: string; // `${productId}_${type}`
  productId: string;
  type: SemanticChunkType;
  content: string;
  metadata: {
    productId: string;
    productName: string;
    category: string;
    version: number;
    chunkType: SemanticChunkType;
    status: string;
  };
}

export interface ProductForChunking {
  id: string;
  name: string;
  type: string;
  grape?: string | null;
  country?: string | null;
  harvest?: number | null;
  alcohol?: number | string | null;
  description?: string | null;
  stock?: number | null;
  version?: number | null;
  status?: string | null;
  sensory_profile?: string | null;
  pairing?: string | null;
  harvest_notes?: string | null;
}

export function generateSemanticChunks(product: ProductForChunking): SemanticChunk[] {
  const chunks: SemanticChunk[] = [];
  const version = product.version ?? 1;
  const status = product.status ?? 'ACTIVE';

  // Chunk 1: identidade (Obrigatório)
  // Template: "Vinho {name}, safra {harvest}. Categoria: {type}. Uvas e corte: {grape}. Teor alcoólico: {alcohol}%. Região e país: {country}. Descrição geral: {description}."
  const harvestStr = product.harvest ? String(product.harvest) : 'Não informada';
  const grapeStr = product.grape ? product.grape : 'Não informado';
  const alcoholStr = product.alcohol !== undefined && product.alcohol !== null ? `${product.alcohol}%` : 'Não informado';
  const countryStr = product.country ? product.country : 'Não informado';
  const descStr = product.description ? product.description.trim() : '';

  const identidadeContent = `Vinho ${product.name}, safra ${harvestStr}. Categoria: ${product.type}. Uvas e corte: ${grapeStr}. Teor alcoólico: ${alcoholStr}. Região e país: ${countryStr}. Descrição geral: ${descStr}.`.trim();

  chunks.push({
    id: `${product.id}_identidade`,
    productId: product.id,
    type: 'identidade',
    content: identidadeContent,
    metadata: {
      productId: product.id,
      productName: product.name,
      category: product.type,
      version,
      chunkType: 'identidade',
      status,
    },
  });

  // Chunk 2: sensorial (Condicional)
  if (product.sensory_profile && product.sensory_profile.trim().length > 0) {
    chunks.push({
      id: `${product.id}_sensorial`,
      productId: product.id,
      type: 'sensorial',
      content: `Perfil sensorial e notas de degustação de ${product.name}: ${product.sensory_profile.trim()}.`,
      metadata: {
        productId: product.id,
        productName: product.name,
        category: product.type,
        version,
        chunkType: 'sensorial',
        status,
      },
    });
  }

  // Chunk 3: harmonizacao (Condicional)
  if (product.pairing && product.pairing.trim().length > 0) {
    chunks.push({
      id: `${product.id}_harmonizacao`,
      productId: product.id,
      type: 'harmonizacao',
      content: `Harmonização recomendada e ocasiões de consumo para ${product.name}: ${product.pairing.trim()}.`,
      metadata: {
        productId: product.id,
        productName: product.name,
        category: product.type,
        version,
        chunkType: 'harmonizacao',
        status,
      },
    });
  }

  // Chunk 4: safra_terroir (Condicional)
  if (product.harvest_notes && product.harvest_notes.trim().length > 0) {
    chunks.push({
      id: `${product.id}_safra_terroir`,
      productId: product.id,
      type: 'safra_terroir',
      content: `Notas de safra, vinhedo e terroir de ${product.name}: ${product.harvest_notes.trim()}.`,
      metadata: {
        productId: product.id,
        productName: product.name,
        category: product.type,
        version,
        chunkType: 'safra_terroir',
        status,
      },
    });
  }

  return chunks;
}
