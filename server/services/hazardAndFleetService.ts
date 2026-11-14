/**
 * Road Hazards & Responder Fleet Telemetry Service — v2.7.0
 *
 * Manages active highway closures, bridge capacity ratings (NBI standard),
 * responder apparatus Automated Vehicle Location (AVL) telemetry, and
 * vehicle corridor clearance verification.
 */

import {
  RoadHazardSegment,
  LiveResponderApparatus,
  ConfirmedStagingYard,
  ResponderVehicleClass,
  ROAD_HAZARD_SEGMENTS,
  RESPONDER_APPARATUS_FLEET,
  CONFIRMED_STAGING_YARDS,
  getRoadHazardsForRegion,
  getFleetForRegion,
  getStagingYardsForRegion,
  evaluateRouteClearance,
} from '../../src/shared/roadHazardsAndResourcesData';

export class HazardAndFleetService {
  public getRoadHazards(regionId?: string): RoadHazardSegment[] {
    if (!regionId) return ROAD_HAZARD_SEGMENTS;
    return getRoadHazardsForRegion(regionId);
  }

  public getBridgeRestrictions(regionId?: string): RoadHazardSegment[] {
    const list = regionId ? getRoadHazardsForRegion(regionId) : ROAD_HAZARD_SEGMENTS;
    return list.filter(
      (h) =>
        h.hazardType === 'BRIDGE_WEIGHT_RESTRICTION' ||
        h.hazardType === 'BRIDGE_HEIGHT_CLEARANCE_LIMIT'
    );
  }

  public getFleetTelemetry(regionId?: string): LiveResponderApparatus[] {
    if (!regionId) return RESPONDER_APPARATUS_FLEET;
    return getFleetForRegion(regionId);
  }

  public getStagingFacilities(regionId?: string): ConfirmedStagingYard[] {
    if (!regionId) return CONFIRMED_STAGING_YARDS;
    return getStagingYardsForRegion(regionId);
  }

  public evaluateCorridor(params: {
    hazardIds: string[];
    vehicleClass?: ResponderVehicleClass;
    vehicleWeightTons?: number;
    vehicleHeightMeters?: number;
  }) {
    const vehicleClass: ResponderVehicleClass =
      params.vehicleClass || 'TYPE_1_STRUCTURAL_ENGINE';
    const weight = Number(params.vehicleWeightTons ?? 18);
    const height = Number(params.vehicleHeightMeters ?? 3.4);

    return evaluateRouteClearance(vehicleClass, weight, height, params.hazardIds);
  }

  public getMultimodalCorridors(regionId: string = 'REG-NILGIRI') {
    const roadHazards = this.getRoadHazards(regionId);
    const criticalRoadBlocks = roadHazards.filter((h) => h.severity === 'CRITICAL_IMPASSABLE');

    return {
      regionId,
      timestamp: new Date().toISOString(),
      providers: {
        railradar: {
          configured: Boolean(process.env.RAILRADAR_API_KEY),
          status: process.env.RAILRADAR_API_KEY ? 'ONLINE' : 'DEGRADED',
        },
        maritimeAis: {
          configured: Boolean(process.env.MARITIME_AIS_KEY),
          status: process.env.MARITIME_AIS_KEY ? 'ONLINE' : 'DEGRADED',
        },
        mappls: {
          configured: Boolean(process.env.MAPPLS_ACCESS_TOKEN && process.env.MAPPLS_ACCESS_TOKEN !== 'DEFAULT_MAPPLS_TOKEN'),
          status: 'STANDBY',
        },
      },
      corridors: [
        {
          corridorId: `COR-ROAD-${regionId}`,
          type: 'HIGHWAY_NETWORK',
          name: 'Regional Highway Grid (NH-181 / MDR-700)',
          status: criticalRoadBlocks.length > 0 ? 'RESTRICTED' : 'OPEN',
          activeHazards: roadHazards.length,
          criticalBlockages: criticalRoadBlocks.length,
          advisory: criticalRoadBlocks.length > 0
            ? `${criticalRoadBlocks.length} sections closed due to active fire or debris.`
            : 'All primary arterial routes clear.',
        },
        {
          corridorId: `COR-RAIL-${regionId}`,
          type: 'RAIL_TRANSIT',
          name: 'Nilgiri Mountain Railway (NMR) & Junction Line',
          status: 'RESTRICTED',
          activeHazards: 1,
          criticalBlockages: 0,
          advisory: 'NMR rack-railway speed restricted to 15 km/h; available for medical and casualty egress.',
        },
        {
          corridorId: `COR-WATER-${regionId}`,
          type: 'WATERWAY_RESERVOIR',
          name: 'Pykara Lake & Bhavanisagar Water Egress Corridor',
          status: 'OPEN',
          activeHazards: 0,
          criticalBlockages: 0,
          advisory: 'Waterway available for boat evacuation and helitack dipping operations.',
        },
      ],
    };
  }
}

export const hazardAndFleetService = new HazardAndFleetService();
