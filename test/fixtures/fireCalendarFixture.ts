import { RegionalHistoricalFireRecord } from '../../src/shared/fireObservationsData';

/**
 * ISOLATED TEST FIXTURE: Multi-year historical fire observations for unit testing.
 * Permitted exclusively in test environments per Rule 2, Rule P0.1 & DATA-01.
 * MUST NEVER be imported into production runtime or stored in production state.
 */
export const FIXTURE_FIRE_OBSERVATIONS: RegionalHistoricalFireRecord[] = [
  // 2021
  { regionId: 'REG-NILGIRI', year: 2021, month: 1, monthLabel: 'Jan', modisHotspots: 18, viirs375mHotspots: 58, viirs750mHotspots: 35, meanFrpMw: 32.4, observationCoveragePct: 92, dataSource: 'NASA_FIRMS_ARCHIVE', dataConfidence: 'HIGH', latAnchor: 11.418, lngAnchor: 76.704 },
  { regionId: 'REG-NILGIRI', year: 2021, month: 2, monthLabel: 'Feb', modisHotspots: 41, viirs375mHotspots: 132, viirs750mHotspots: 78, meanFrpMw: 44.1, observationCoveragePct: 95, dataSource: 'NASA_FIRMS_ARCHIVE', dataConfidence: 'HIGH', latAnchor: 11.425, lngAnchor: 76.712 },
  { regionId: 'REG-NILGIRI', year: 2021, month: 3, monthLabel: 'Mar', modisHotspots: 60, viirs375mHotspots: 192, viirs750mHotspots: 115, meanFrpMw: 58.2, observationCoveragePct: 94, dataSource: 'NASA_FIRMS_ARCHIVE', dataConfidence: 'HIGH', latAnchor: 11.412, lngAnchor: 76.698 },
  { regionId: 'REG-NILGIRI', year: 2021, month: 4, monthLabel: 'Apr', modisHotspots: 50, viirs375mHotspots: 160, viirs750mHotspots: 98, meanFrpMw: 48.0, observationCoveragePct: 91, dataSource: 'NASA_FIRMS_ARCHIVE', dataConfidence: 'HIGH', latAnchor: 11.405, lngAnchor: 76.715 },
  { regionId: 'REG-NILGIRI', year: 2021, month: 5, monthLabel: 'May', modisHotspots: 14, viirs375mHotspots: 46, viirs750mHotspots: 28, meanFrpMw: 26.5, observationCoveragePct: 84, dataSource: 'NASA_FIRMS_ARCHIVE', dataConfidence: 'HIGH', latAnchor: 11.395, lngAnchor: 76.735 },
  { regionId: 'REG-NILGIRI', year: 2021, month: 6, monthLabel: 'Jun', modisHotspots: 5, viirs375mHotspots: 16, viirs750mHotspots: 10, meanFrpMw: 22.0, observationCoveragePct: 48, dataSource: 'NASA_FIRMS_ARCHIVE', dataConfidence: 'LOW_OBSERVATION_DENSITY', latAnchor: 11.430, lngAnchor: 76.680 },
  { regionId: 'REG-NILGIRI', year: 2021, month: 7, monthLabel: 'Jul', modisHotspots: 3, viirs375mHotspots: 11, viirs750mHotspots: 6, meanFrpMw: 19.4, observationCoveragePct: 45, dataSource: 'NASA_FIRMS_ARCHIVE', dataConfidence: 'LOW_OBSERVATION_DENSITY', latAnchor: 11.420, lngAnchor: 76.690 },
  { regionId: 'REG-NILGIRI', year: 2021, month: 8, monthLabel: 'Aug', modisHotspots: 4, viirs375mHotspots: 15, viirs750mHotspots: 8, meanFrpMw: 21.0, observationCoveragePct: 52, dataSource: 'NASA_FIRMS_ARCHIVE', dataConfidence: 'LOW_OBSERVATION_DENSITY', latAnchor: 11.415, lngAnchor: 76.702 },
  { regionId: 'REG-NILGIRI', year: 2021, month: 9, monthLabel: 'Sep', modisHotspots: 9, viirs375mHotspots: 30, viirs750mHotspots: 18, meanFrpMw: 24.8, observationCoveragePct: 78, dataSource: 'NASA_FIRMS_ARCHIVE', dataConfidence: 'HIGH', latAnchor: 11.408, lngAnchor: 76.710 },
  { regionId: 'REG-NILGIRI', year: 2021, month: 10, monthLabel: 'Oct', modisHotspots: 13, viirs375mHotspots: 42, viirs750mHotspots: 25, meanFrpMw: 28.1, observationCoveragePct: 82, dataSource: 'NASA_FIRMS_ARCHIVE', dataConfidence: 'HIGH', latAnchor: 11.418, lngAnchor: 76.705 },
  { regionId: 'REG-NILGIRI', year: 2021, month: 11, monthLabel: 'Nov', modisHotspots: 12, viirs375mHotspots: 38, viirs750mHotspots: 22, meanFrpMw: 27.0, observationCoveragePct: 85, dataSource: 'NASA_FIRMS_ARCHIVE', dataConfidence: 'HIGH', latAnchor: 11.422, lngAnchor: 76.718 },
  { regionId: 'REG-NILGIRI', year: 2021, month: 12, monthLabel: 'Dec', modisHotspots: 15, viirs375mHotspots: 49, viirs750mHotspots: 30, meanFrpMw: 30.5, observationCoveragePct: 90, dataSource: 'NASA_FIRMS_ARCHIVE', dataConfidence: 'HIGH', latAnchor: 11.410, lngAnchor: 76.700 },

  // 2022
  { regionId: 'REG-NILGIRI', year: 2022, month: 1, monthLabel: 'Jan', modisHotspots: 14, viirs375mHotspots: 45, viirs750mHotspots: 27, meanFrpMw: 29.0, observationCoveragePct: 93, dataSource: 'NASA_FIRMS_ARCHIVE', dataConfidence: 'HIGH', latAnchor: 11.416, lngAnchor: 76.703 },
  { regionId: 'REG-NILGIRI', year: 2022, month: 2, monthLabel: 'Feb', modisHotspots: 32, viirs375mHotspots: 103, viirs750mHotspots: 61, meanFrpMw: 38.5, observationCoveragePct: 94, dataSource: 'NASA_FIRMS_ARCHIVE', dataConfidence: 'HIGH', latAnchor: 11.422, lngAnchor: 76.710 },
  { regionId: 'REG-NILGIRI', year: 2022, month: 3, monthLabel: 'Mar', modisHotspots: 47, viirs375mHotspots: 150, viirs750mHotspots: 90, meanFrpMw: 49.8, observationCoveragePct: 95, dataSource: 'NASA_FIRMS_ARCHIVE', dataConfidence: 'HIGH', latAnchor: 11.414, lngAnchor: 76.695 },
  { regionId: 'REG-NILGIRI', year: 2022, month: 4, monthLabel: 'Apr', modisHotspots: 39, viirs375mHotspots: 125, viirs750mHotspots: 75, meanFrpMw: 41.2, observationCoveragePct: 90, dataSource: 'NASA_FIRMS_ARCHIVE', dataConfidence: 'HIGH', latAnchor: 11.408, lngAnchor: 76.712 },
  { regionId: 'REG-NILGIRI', year: 2022, month: 5, monthLabel: 'May', modisHotspots: 11, viirs375mHotspots: 36, viirs750mHotspots: 21, meanFrpMw: 24.0, observationCoveragePct: 82, dataSource: 'NASA_FIRMS_ARCHIVE', dataConfidence: 'HIGH', latAnchor: 11.398, lngAnchor: 76.730 },
  { regionId: 'REG-NILGIRI', year: 2022, month: 6, monthLabel: 'Jun', modisHotspots: 4, viirs375mHotspots: 12, viirs750mHotspots: 7, meanFrpMw: 20.0, observationCoveragePct: 46, dataSource: 'NASA_FIRMS_ARCHIVE', dataConfidence: 'LOW_OBSERVATION_DENSITY', latAnchor: 11.428, lngAnchor: 76.682 },
  { regionId: 'REG-NILGIRI', year: 2022, month: 7, monthLabel: 'Jul', modisHotspots: 2, viirs375mHotspots: 8, viirs750mHotspots: 5, meanFrpMw: 18.0, observationCoveragePct: 42, dataSource: 'NASA_FIRMS_ARCHIVE', dataConfidence: 'LOW_OBSERVATION_DENSITY', latAnchor: 11.418, lngAnchor: 76.688 },
  { regionId: 'REG-NILGIRI', year: 2022, month: 8, monthLabel: 'Aug', modisHotspots: 3, viirs375mHotspots: 11, viirs750mHotspots: 6, meanFrpMw: 19.5, observationCoveragePct: 50, dataSource: 'NASA_FIRMS_ARCHIVE', dataConfidence: 'LOW_OBSERVATION_DENSITY', latAnchor: 11.412, lngAnchor: 76.700 },
  { regionId: 'REG-NILGIRI', year: 2022, month: 9, monthLabel: 'Sep', modisHotspots: 7, viirs375mHotspots: 23, viirs750mHotspots: 14, meanFrpMw: 22.4, observationCoveragePct: 76, dataSource: 'NASA_FIRMS_ARCHIVE', dataConfidence: 'HIGH', latAnchor: 11.405, lngAnchor: 76.708 },
  { regionId: 'REG-NILGIRI', year: 2022, month: 10, monthLabel: 'Oct', modisHotspots: 10, viirs375mHotspots: 33, viirs750mHotspots: 20, meanFrpMw: 25.0, observationCoveragePct: 80, dataSource: 'NASA_FIRMS_ARCHIVE', dataConfidence: 'HIGH', latAnchor: 11.415, lngAnchor: 76.702 },
  { regionId: 'REG-NILGIRI', year: 2022, month: 11, monthLabel: 'Nov', modisHotspots: 9, viirs375mHotspots: 30, viirs750mHotspots: 18, meanFrpMw: 24.2, observationCoveragePct: 83, dataSource: 'NASA_FIRMS_ARCHIVE', dataConfidence: 'HIGH', latAnchor: 11.420, lngAnchor: 76.715 },
  { regionId: 'REG-NILGIRI', year: 2022, month: 12, monthLabel: 'Dec', modisHotspots: 12, viirs375mHotspots: 38, viirs750mHotspots: 23, meanFrpMw: 27.5, observationCoveragePct: 89, dataSource: 'NASA_FIRMS_ARCHIVE', dataConfidence: 'HIGH', latAnchor: 11.408, lngAnchor: 76.698 },

  // 2023
  { regionId: 'REG-NILGIRI', year: 2023, month: 1, monthLabel: 'Jan', modisHotspots: 16, viirs375mHotspots: 52, viirs750mHotspots: 31, meanFrpMw: 31.0, observationCoveragePct: 91, dataSource: 'NASA_FIRMS_ARCHIVE', dataConfidence: 'HIGH', latAnchor: 11.417, lngAnchor: 76.704 },
  { regionId: 'REG-NILGIRI', year: 2023, month: 2, monthLabel: 'Feb', modisHotspots: 38, viirs375mHotspots: 122, viirs750mHotspots: 72, meanFrpMw: 42.0, observationCoveragePct: 93, dataSource: 'NASA_FIRMS_ARCHIVE', dataConfidence: 'HIGH', latAnchor: 11.424, lngAnchor: 76.711 },
  { regionId: 'REG-NILGIRI', year: 2023, month: 3, monthLabel: 'Mar', modisHotspots: 55, viirs375mHotspots: 176, viirs750mHotspots: 104, meanFrpMw: 54.0, observationCoveragePct: 94, dataSource: 'NASA_FIRMS_ARCHIVE', dataConfidence: 'HIGH', latAnchor: 11.413, lngAnchor: 76.697 },
  { regionId: 'REG-NILGIRI', year: 2023, month: 4, monthLabel: 'Apr', modisHotspots: 44, viirs375mHotspots: 141, viirs750mHotspots: 84, meanFrpMw: 45.0, observationCoveragePct: 89, dataSource: 'NASA_FIRMS_ARCHIVE', dataConfidence: 'HIGH', latAnchor: 11.407, lngAnchor: 76.714 },
  { regionId: 'REG-NILGIRI', year: 2023, month: 5, monthLabel: 'May', modisHotspots: 13, viirs375mHotspots: 41, viirs750mHotspots: 24, meanFrpMw: 25.5, observationCoveragePct: 83, dataSource: 'NASA_FIRMS_ARCHIVE', dataConfidence: 'HIGH', latAnchor: 11.397, lngAnchor: 76.732 },

  // 2024
  { regionId: 'REG-NILGIRI', year: 2024, month: 1, monthLabel: 'Jan', modisHotspots: 22, viirs375mHotspots: 70, viirs750mHotspots: 42, meanFrpMw: 35.0, observationCoveragePct: 94, dataSource: 'NASA_FIRMS_ARCHIVE', dataConfidence: 'HIGH', latAnchor: 11.419, lngAnchor: 76.705 },
  { regionId: 'REG-NILGIRI', year: 2024, month: 2, monthLabel: 'Feb', modisHotspots: 49, viirs375mHotspots: 158, viirs750mHotspots: 94, meanFrpMw: 48.0, observationCoveragePct: 96, dataSource: 'NASA_FIRMS_ARCHIVE', dataConfidence: 'HIGH', latAnchor: 11.426, lngAnchor: 76.713 },
  { regionId: 'REG-NILGIRI', year: 2024, month: 3, monthLabel: 'Mar', modisHotspots: 72, viirs375mHotspots: 230, viirs750mHotspots: 138, meanFrpMw: 65.0, observationCoveragePct: 95, dataSource: 'NASA_FIRMS_ARCHIVE', dataConfidence: 'HIGH', latAnchor: 11.415, lngAnchor: 76.699 },
  { regionId: 'REG-NILGIRI', year: 2024, month: 4, monthLabel: 'Apr', modisHotspots: 58, viirs375mHotspots: 185, viirs750mHotspots: 110, meanFrpMw: 52.0, observationCoveragePct: 92, dataSource: 'NASA_FIRMS_ARCHIVE', dataConfidence: 'HIGH', latAnchor: 11.409, lngAnchor: 76.716 },
];
