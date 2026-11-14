/**
 * Exposure & Critical Infrastructure Service — v2.7.0
 *
 * Provides authoritative demographic vulnerability (WorldPop 100m standard),
 * structural footprints (OpenStreetMap building tags & defensible space ratings),
 * critical infrastructure assets (HIFLD standard), and ICS evacuation zones.
 */

import {
  PopulationExposureGridCell,
  BuildingFootprintRecord,
  CriticalInfrastructureAsset,
  EvacuationZone,
  EcologicalSensitivityZone,
  POPULATION_EXPOSURE_GRID,
  BUILDING_FOOTPRINTS,
  CRITICAL_INFRASTRUCTURE,
  EVACUATION_ZONES,
  ECOLOGICAL_SENSITIVITY_ZONES,
  getPopulationCellsForRegion,
  getCriticalInfrastructureForRegion,
  getEvacuationZonesForRegion,
  getBuildingFootprintsForRegion,
  getEcologicalZonesForRegion,
} from '../../src/shared/exposureData';

export class ExposureService {
  public getDemographics(regionId: string): PopulationExposureGridCell[] {
    return getPopulationCellsForRegion(regionId);
  }

  public getBuildings(regionId?: string): BuildingFootprintRecord[] {
    if (!regionId) return BUILDING_FOOTPRINTS;
    return getBuildingFootprintsForRegion(regionId);
  }

  public getCriticalInfrastructure(regionId?: string): CriticalInfrastructureAsset[] {
    if (!regionId) return CRITICAL_INFRASTRUCTURE;
    return getCriticalInfrastructureForRegion(regionId);
  }

  public getEvacuationZones(regionId?: string): EvacuationZone[] {
    if (!regionId) return EVACUATION_ZONES;
    return getEvacuationZonesForRegion(regionId);
  }

  public getEcologicalZones(regionId?: string): EcologicalSensitivityZone[] {
    if (!regionId) return ECOLOGICAL_SENSITIVITY_ZONES;
    return getEcologicalZonesForRegion(regionId);
  }

  public getRegionalSummary(regionId: string) {
    const cells = getPopulationCellsForRegion(regionId);
    const buildings = getBuildingFootprintsForRegion(regionId);
    const infra = getCriticalInfrastructureForRegion(regionId);
    const zones = getEvacuationZonesForRegion(regionId);

    const totalPop = cells.reduce((sum, c) => sum + c.totalPopulation, 0);
    const vulnerablePop = cells.reduce(
      (sum, c) =>
        sum +
        c.vulnerableDemographics.elderlyAbove65Count +
        c.vulnerableDemographics.childrenUnder5Count +
        c.vulnerableDemographics.mobilityImpairedCount,
      0
    );

    return {
      regionId,
      totalPopulation: totalPop,
      vulnerablePopulation: vulnerablePop,
      buildingCount: buildings.length,
      threatenedBuildingCount: buildings.filter(
        (b) => b.threatLevel === 'DIRECT_FLAME_CONTACT' || b.threatLevel === 'EXTREME_EMBER_ZONE'
      ).length,
      criticalInfrastructureCount: infra.length,
      evacuationZoneCount: zones.length,
      activeMandatoryEvacuations: zones.filter(
        (z) => z.status === 'EVACUATION_ORDER_MANDATORY'
      ).length,
    };
  }
}

export const exposureService = new ExposureService();
