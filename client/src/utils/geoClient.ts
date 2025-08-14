// src/utils/geoClient.ts
export type SmartGeoOptions = {
  // Overall time budget for all attempts (ms)
  totalTimeoutMs?: number;
  // First attempt: quick cached fix
  quickTimeoutMs?: number;
  quickMaximumAgeMs?: number;
  // Second attempt: high-accuracy fix
  highTimeoutMs?: number;
  // Third attempt: watchPosition window
  watchWindowMs?: number;
  // Accept a fix only if accuracy <= this (meters). 0 disables check.
  minAccuracyMeters?: number;
};

const DEFAULTS: Required<SmartGeoOptions> = {
  totalTimeoutMs: 8000,
  quickTimeoutMs: 1200,
  quickMaximumAgeMs: 120000, // 2 min cache
  highTimeoutMs: 5000,
  watchWindowMs: 4000,
  minAccuracyMeters: 50000, // 50km (very permissive; adjust if you want)
};

function ensureGeo(): Geolocation {
  if (!("geolocation" in navigator)) {
    throw new Error("geolocation unsupported");
  }
  return navigator.geolocation;
}

// Simple promise wrapper around getCurrentPosition
function getCurrentPositionP(
  opts: PositionOptions,
  timeoutMs: number
): Promise<GeolocationPosition> {
  const geo = ensureGeo();
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(Object.assign(new Error("timeout"), { code: 3 })), timeoutMs);
    geo.getCurrentPosition(
      (pos) => {
        clearTimeout(t);
        resolve(pos);
      },
      (err) => {
        clearTimeout(t);
        reject(err);
      },
      opts
    );
  });
}

// Resolve on first watchPosition update or after window timeout
function watchPositionOnce(
  opts: PositionOptions,
  windowMs: number
): Promise<GeolocationPosition> {
  const geo = ensureGeo();
  return new Promise((resolve, reject) => {
    const id = geo.watchPosition(
      (pos) => {
        clearTimeout(timer);
        geo.clearWatch(id);
        resolve(pos);
      },
      (err) => {
        clearTimeout(timer);
        geo.clearWatch(id);
        reject(err);
      },
      opts
    );
    const timer = setTimeout(() => {
      geo.clearWatch(id);
      reject(Object.assign(new Error("timeout"), { code: 3 }));
    }, windowMs);
  });
}

function isAccurateEnough(pos: GeolocationPosition, maxMeters: number): boolean {
  if (!maxMeters || maxMeters <= 0) return true;
  const acc = pos.coords.accuracy;
  return typeof acc === "number" && acc > 0 && acc <= maxMeters;
}

export async function getPositionSmart(options: SmartGeoOptions = {}): Promise<GeolocationPosition> {
  const cfg = { ...DEFAULTS, ...options };

  if (window.isSecureContext !== true && location.hostname !== "localhost") {
    throw new Error("Geolocation requires HTTPS");
  }

  // If Permissions API exists and is explicitly denied, fail fast
  try {
    const q = await (navigator.permissions as any)?.query?.({ name: "geolocation" as PermissionName });
    if (q && q.state === "denied") {
      throw new Error("geolocation permission denied");
    }
  } catch {
    // ignore – not supported everywhere
  }

  const start = Date.now();
  const timeLeft = () => Math.max(0, cfg.totalTimeoutMs - (Date.now() - start));

  // 1) Quick cached reading
  try {
    const pos = await getCurrentPositionP(
      { enableHighAccuracy: false, timeout: cfg.quickTimeoutMs, maximumAge: cfg.quickMaximumAgeMs },
      Math.min(cfg.quickTimeoutMs, timeLeft())
    );
    if (isAccurateEnough(pos, cfg.minAccuracyMeters)) return pos;
  } catch { /* ignore and fall through */ }

  // 2) High-accuracy reading
  try {
    const t = timeLeft();
    if (t <= 0) throw new Error("timeout");
    const pos = await getCurrentPositionP(
      { enableHighAccuracy: true, timeout: Math.min(cfg.highTimeoutMs, t), maximumAge: 0 },
      Math.min(cfg.highTimeoutMs, t)
    );
    if (isAccurateEnough(pos, cfg.minAccuracyMeters)) return pos;
  } catch { /* ignore and fall through */ }

  // 3) watchPosition fallback
  const t = timeLeft();
  if (t <= 0) throw Object.assign(new Error("timeout"), { code: 3 });
  return watchPositionOnce(
    { enableHighAccuracy: true, timeout: Math.min(cfg.watchWindowMs, t), maximumAge: 0 },
    Math.min(cfg.watchWindowMs, t)
  );
}

export function explainGeoError(err: any): string {
  // Modern browsers may throw DOMException or GeolocationPositionError
  const code = err?.code;
  if (code === 1) return "Location permission was denied. Please enable it in your browser.";
  if (code === 2) return "Location is unavailable right now (no signal or OS services).";
  if (code === 3) return "Timed out getting your location. Try again.";
  if (String(err?.message || "").includes("HTTPS")) return "Geolocation needs HTTPS (or localhost).";
  return err?.message || "Failed to get your location.";
}
