import { describe, it, expect } from 'bun:test';
import { generateSemanticChunks } from '../../src/domains/catalog/services/semantic-chunker';

describe('Semantic Chunker (spec09 §5.1)', () => {
  it('should generate natural language chunk 1 (identidade) with required fields', () => {
    const product = {
      id: 'prod-123',
      name: 'Serra Malbec',
      type: 'Tinto',
      grape: 'Malbec',
      country: 'Argentina',
      harvest: 2018,
      alcohol: 14.5,
      description: 'Vinho encorpado e elegante produzido na região de Mendoza.',
      stock: 10,
      version: 1,
      status: 'ACTIVE',
      sensory_profile: null,
      pairing: null,
      harvest_notes: null,
    };

    const chunks = generateSemanticChunks(product);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].id).toBe('prod-123_identidade');
    expect(chunks[0].type).toBe('identidade');
    expect(chunks[0].content).toContain('Vinho Serra Malbec, safra 2018');
    expect(chunks[0].content).toContain('Categoria: Tinto');
    expect(chunks[0].content).toContain('Uvas e corte: Malbec');
    expect(chunks[0].content).toContain('Teor alcoólico: 14.5%');
    expect(chunks[0].content).toContain('Região e país: Argentina');
    expect(chunks[0].content).toContain('Vinho encorpado e elegante');
    expect(chunks[0].metadata.version).toBe(1);
  });

  it('should generate all 4 chunks when sensory_profile, pairing, and harvest_notes are present', () => {
    const product = {
      id: 'prod-456',
      name: 'Gran Reserva Cabernet',
      type: 'Tinto',
      grape: 'Cabernet Sauvignon',
      country: 'Chile',
      harvest: 2020,
      alcohol: 13.8,
      description: 'Clássico chileno.',
      stock: 5,
      version: 2,
      status: 'ACTIVE',
      sensory_profile: 'Aromas de cassis, cedro e notas de baunilha.',
      pairing: 'Carnes vermelhas grelhadas e queijos curados.',
      harvest_notes: 'Safra histórica com maturação fenólica perfeita no Vale do Maipo.',
    };

    const chunks = generateSemanticChunks(product);
    expect(chunks).toHaveLength(4);

    const types = chunks.map((c) => c.type);
    expect(types).toEqual(['identidade', 'sensorial', 'harmonizacao', 'safra_terroir']);

    const sensory = chunks.find((c) => c.type === 'sensorial')!;
    expect(sensory.id).toBe('prod-456_sensorial');
    expect(sensory.content).toContain('Perfil sensorial e notas de degustação de Gran Reserva Cabernet: Aromas de cassis');

    const pairing = chunks.find((c) => c.type === 'harmonizacao')!;
    expect(pairing.id).toBe('prod-456_harmonizacao');
    expect(pairing.content).toContain('Harmonização recomendada e ocasiões de consumo para Gran Reserva Cabernet: Carnes vermelhas');

    const harvest = chunks.find((c) => c.type === 'safra_terroir')!;
    expect(harvest.id).toBe('prod-456_safra_terroir');
    expect(harvest.content).toContain('Notas de safra, vinhedo e terroir de Gran Reserva Cabernet: Safra histórica');
  });

  it('should omit empty or whitespace-only sensory/pairing/harvest fields', () => {
    const product = {
      id: 'prod-789',
      name: 'Chardonnay Reserva',
      type: 'Branco',
      grape: 'Chardonnay',
      country: 'Brasil',
      harvest: 2022,
      alcohol: 12.5,
      description: 'Fresco e mineral.',
      stock: 12,
      version: 1,
      status: 'ACTIVE',
      sensory_profile: '   ',
      pairing: '',
      harvest_notes: null,
    };

    const chunks = generateSemanticChunks(product);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].type).toBe('identidade');
  });
});
