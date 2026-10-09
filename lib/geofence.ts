export const GYM_LAT = 13.0347589;
export const GYM_LNG = 80.2713245;
export const GEOFENCE_RADIUS_M = 50;

function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export type LocationCheck =
  | { ok: true; lat: number; lng: number; distanceM: number }
  | { ok: false; status: number; error: string };

/**
 * Strict "is this person at the gym" check.
 *
 * Values must be real numbers: a bad value used to give a distance of NaN, and
 * "NaN > 50" is false, which let the request through as if the person were inside.
 * Pass maxAccuracyM to also reject coarse fixes (Wi-Fi/cell positions that can be
 * hundreds of metres off) — the reported accuracy must be present and small enough.
 */
export function checkGymLocation(
  input: { lat: unknown; lng: unknown; accuracy?: unknown },
  opts: { outsideMessage: string; maxAccuracyM?: number },
): LocationCheck {
  const { lat, lng, accuracy } = input;
  if (
    typeof lat !== "number" || typeof lng !== "number" ||
    !Number.isFinite(lat) || !Number.isFinite(lng) ||
    lat < -90 || lat > 90 || lng < -180 || lng > 180
  ) {
    return { ok: false, status: 400, error: "Your location couldn't be read. Allow location access and try again." };
  }

  if (opts.maxAccuracyM !== undefined) {
    if (typeof accuracy !== "number" || !Number.isFinite(accuracy) || accuracy < 0) {
      return { ok: false, status: 400, error: "Please refresh the page and try again." };
    }
    if (accuracy > opts.maxAccuracyM) {
      return {
        ok: false, status: 403,
        error: `Your phone's location is too imprecise (about ${Math.round(accuracy)} m). Step inside the gym, turn on GPS or high-accuracy location, and try again.`,
      };
    }
  }

  const distanceM = haversineM(lat, lng, GYM_LAT, GYM_LNG);
  if (!(distanceM <= GEOFENCE_RADIUS_M)) {
    return { ok: false, status: 403, error: opts.outsideMessage };
  }
  return { ok: true, lat, lng, distanceM };
}
