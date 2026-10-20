const CACHE_KEY = "wf_avail_cache";
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 ngày
const MAX_ENTRIES = 10;

function readMap() {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeMap(map) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(map));
  } catch {
    // localStorage full — silent fail
  }
}

function entryKey(cacheKey, memberId) {
  return `${cacheKey}_${memberId || "anon"}`;
}

export function getCachedSlots(cacheKey, memberId) {
  if (!cacheKey) return null;
  const k = entryKey(cacheKey, memberId);
  const map = readMap();
  const entry = map[k];
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > TTL_MS) {
    delete map[k];
    writeMap(map);
    return null;
  }
  return entry.slots;
}

export function setCachedSlots(cacheKey, memberId, slots) {
  if (!cacheKey) return;
  const map = readMap();
  const now = Date.now();

  for (const k of Object.keys(map)) {
    if (now - map[k].cachedAt > TTL_MS) delete map[k];
  }

  map[entryKey(cacheKey, memberId)] = { slots, cachedAt: now };

  const keys = Object.keys(map).sort((a, b) => map[a].cachedAt - map[b].cachedAt);
  if (keys.length > MAX_ENTRIES) {
    keys.slice(0, keys.length - MAX_ENTRIES).forEach((k) => delete map[k]);
  }

  writeMap(map);
}

export function clearAllAvailabilityCache() {
  localStorage.removeItem(CACHE_KEY);
}
