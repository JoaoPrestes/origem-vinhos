import { describe, it, expect } from 'bun:test';
import { startCatalogIngestionWorker } from '../../src/workers/catalog-ingestion.worker';

describe('Catalog Ingestion Worker Auto-Start', () => {
  it('should initialize and return a teardown stop function cleanly', async () => {
    const stopWorker = await startCatalogIngestionWorker();
    expect(typeof stopWorker).toBe('function');
    
    // Cleanly stop worker loop
    stopWorker();
  });
});
