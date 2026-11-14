import { Request, Response, NextFunction } from 'express';
import { globalStore } from '../db/store';

/**
 * Strips HTML tags, script injection patterns, and control characters.
 */
export function sanitizeString(val: unknown, maxLength = 1000): string {
  if (typeof val !== 'string') return '';
  return val
    .replace(/<[^>]*>?/gm, '') // Strip HTML tags
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Strip ASCII control characters except \t, \n, \r
    .trim()
    .slice(0, maxLength);
}

/**
 * Validates that latitude is between -90 and 90, and longitude between -180 and 180.
 */
export function isValidCoordinate(lat: unknown, lng: unknown): boolean {
  if (typeof lat !== 'number' || typeof lng !== 'number') return false;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

/**
 * Zero-Trust validation for `/api/auth/token` requests.
 */
export function validateAuthTokenInput(req: Request, res: Response, next: NextFunction): void {
  const { username, role, agency, operatorSecret } = req.body || {};

  if (!username || typeof username !== 'string') {
    res.status(400).json({
      error: 'VALIDATION_FAILED: Field "username" is required and must be a string.',
      code: 'INVALID_USERNAME',
    });
    return;
  }

  const rawUser = username.trim();
  if (rawUser.length < 3 || rawUser.length > 64) {
    res.status(400).json({
      error: 'VALIDATION_FAILED: Username must be between 3 and 64 characters.',
      code: 'INVALID_USERNAME_LENGTH',
    });
    return;
  }

  const sanitizedUser = sanitizeString(rawUser, 64);
  if (!/^[a-zA-Z0-9_\-\.]{3,64}$/.test(sanitizedUser) || sanitizedUser !== rawUser) {
    res.status(400).json({
      error: 'VALIDATION_FAILED: Username must contain only alphanumeric, dash, underscore, or period characters.',
      code: 'INVALID_USERNAME_FORMAT',
    });
    return;
  }

  req.body.username = sanitizedUser;

  if (agency && typeof agency === 'string') {
    req.body.agency = sanitizeString(agency, 120);
  }

  if (role && typeof role === 'string') {
    req.body.role = sanitizeString(role, 32);
  }

  if (operatorSecret && typeof operatorSecret === 'string') {
    req.body.operatorSecret = operatorSecret.trim().slice(0, 256);
  }

  next();
}

/**
 * Zero-Trust validation for `/api/routes/calculate` requests.
 */
export function validateRouteInput(req: Request, res: Response, next: NextFunction): void {
  const { origin, destination, originName, destinationName, vehicleCategory } = req.body || {};

  const validPair = (pair: unknown): pair is [number, number] =>
    Array.isArray(pair) &&
    pair.length === 2 &&
    pair.every(Number.isFinite) &&
    isValidCoordinate(pair[0], pair[1]);

  if (!validPair(origin)) {
    res.status(400).json({
      error: 'VALIDATION_FAILED: Origin must be a [latitude, longitude] numeric pair within valid geodetic bounds (-90..90, -180..180).',
      code: 'INVALID_ORIGIN_COORDINATES',
    });
    return;
  }

  if (!validPair(destination)) {
    res.status(400).json({
      error: 'VALIDATION_FAILED: Destination must be a [latitude, longitude] numeric pair within valid geodetic bounds (-90..90, -180..180).',
      code: 'INVALID_DESTINATION_COORDINATES',
    });
    return;
  }

  const allowedCategories = ['fire_engine', 'heavy_tanker', 'ambulance', 'logistics_convoy', 'standard'];
  if (vehicleCategory && !allowedCategories.includes(vehicleCategory)) {
    res.status(400).json({
      error: `VALIDATION_FAILED: Unsupported vehicle category "${vehicleCategory}". Supported: ${allowedCategories.join(', ')}.`,
      code: 'INVALID_VEHICLE_CATEGORY',
    });
    return;
  }

  req.body.originName = sanitizeString(originName || 'Origin Point', 120);
  req.body.destinationName = sanitizeString(destinationName || 'Destination Point', 120);
  req.body.vehicleCategory = vehicleCategory || 'fire_engine';

  next();
}

/**
 * Zero-Trust validation for `/api/community/reports`.
 */
export function validateFieldReportInput(req: Request, res: Response, next: NextFunction): void {
  const { reporterName, reporterRole, coordinates, hazardType, description } = req.body || {};

  if (!reporterName || typeof reporterName !== 'string') {
    res.status(400).json({ error: 'Field "reporterName" is required.', code: 'INVALID_REPORTER_NAME' });
    return;
  }

  if (!coordinates || typeof coordinates !== 'object') {
    res.status(400).json({ error: 'Field "coordinates" is required.', code: 'INVALID_COORDINATES' });
    return;
  }

  const lat = Number(coordinates.lat);
  const lng = Number(coordinates.lng);
  if (!isValidCoordinate(lat, lng)) {
    res.status(400).json({
      error: 'Field "coordinates" must contain valid lat (-90..90) and lng (-180..180).',
      code: 'INVALID_COORDINATE_BOUNDS',
    });
    return;
  }

  req.body.reporterName = sanitizeString(reporterName, 100);
  req.body.reporterRole = sanitizeString(reporterRole || 'Field Observer', 100);
  req.body.hazardType = sanitizeString(hazardType || 'active_fire', 50);
  req.body.description = sanitizeString(description || '', 2000);
  req.body.nearestLandmark = sanitizeString(req.body.nearestLandmark || '', 120);
  req.body.coordinates = { lat, lng };

  next();
}

/**
 * Zero-Trust validation for `/api/voice/live/turn`.
 */
export function validateLiveVoiceInput(req: Request, res: Response, next: NextFunction): void {
  const { input, voiceName, incidentId } = req.body || {};

  if (!input || typeof input !== 'string') {
    res.status(400).json({ error: 'Field "input" string is required for live voice turn.', code: 'MISSING_INPUT' });
    return;
  }

  const sanitizedInput = sanitizeString(input, 4000);
  if (sanitizedInput.length === 0) {
    res.status(400).json({ error: 'Input cannot be empty after sanitization.', code: 'EMPTY_INPUT' });
    return;
  }

  const supportedVoices = ['Aoede', 'Puck', 'Charon', 'Fenrir', 'Kore'];
  req.body.input = sanitizedInput;
  req.body.voiceName = supportedVoices.includes(voiceName) ? voiceName : 'Aoede';
  if (incidentId && typeof incidentId === 'string') {
    req.body.incidentId = sanitizeString(incidentId, 64);
  }

  next();
}

/**
 * Zero-Trust validation for `/api/hazards/evaluate-corridor`.
 */
export function validateCorridorEvaluationInput(req: Request, res: Response, next: NextFunction): void {
  const { hazardIds, vehicleWeightTons, vehicleHeightMeters } = req.body || {};

  const weight = Number(vehicleWeightTons ?? 18);
  const height = Number(vehicleHeightMeters ?? 3.4);

  if (!Number.isFinite(weight) || weight <= 0 || weight > 120) {
    res.status(400).json({
      error: 'Field "vehicleWeightTons" must be a positive number between 0 and 120 tons.',
      code: 'INVALID_VEHICLE_WEIGHT',
    });
    return;
  }

  if (!Number.isFinite(height) || height <= 0 || height > 15) {
    res.status(400).json({
      error: 'Field "vehicleHeightMeters" must be a positive number between 0 and 15 meters.',
      code: 'INVALID_VEHICLE_HEIGHT',
    });
    return;
  }

  req.body.vehicleWeightTons = weight;
  req.body.vehicleHeightMeters = height;
  req.body.hazardIds = Array.isArray(hazardIds) ? hazardIds.map((id) => sanitizeString(id, 64)) : [];

  next();
}

/**
 * Validation and null-safety guard for `/api/export/:format`.
 */
export function validateExportRequest(req: Request, res: Response, next: NextFunction): void {
  const format = req.params.format?.toLowerCase();
  const allowed = ['geojson', 'csv', 'kml'];

  if (!allowed.includes(format)) {
    res.status(400).json({
      error: `Unsupported export format: ${format}. Supported formats: ${allowed.join(', ')}.`,
      code: 'UNSUPPORTED_EXPORT_FORMAT',
    });
    return;
  }

  const store = globalStore.getState();
  const primaryIncident = store.incidents?.[0];

  if (!primaryIncident) {
    res.status(404).json({
      error: 'Export unavailable: No active incident records are currently loaded in the store.',
      code: 'NO_ACTIVE_INCIDENT',
    });
    return;
  }

  next();
}
