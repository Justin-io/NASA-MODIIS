import { DataSourceCatalogueRecord } from '../../src/shared/types';
import { REGISTERED_DATA_SOURCES } from '../../src/shared/catalogData';

export class DataCatalogueService {
  private sources: DataSourceCatalogueRecord[] = REGISTERED_DATA_SOURCES;

  public getAllSources(): DataSourceCatalogueRecord[] {
    return this.sources;
  }

  public getSourcesByCategory(category: DataSourceCatalogueRecord['category']): DataSourceCatalogueRecord[] {
    return this.sources.filter((s) => s.category === category);
  }

  public getSourceById(id: string): DataSourceCatalogueRecord | undefined {
    return this.sources.find((s) => s.id === id);
  }
}

export const dataCatalogueService = new DataCatalogueService();
