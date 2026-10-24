import http from "~/utils/http";
import { extractIdFromSlug } from "~/utils/slugify";
import { cachedFetch, peekCached, invalidateCached } from "~/utils/prefetchCache";

const availabilitiesKey = (id) => `avail:${id}`;
const myAvailabilityKey = (id) => `my-avail:${id}`;

export const availabilityService = {
  /**
   * @param {{ strict?: boolean }} options - strict: ném lỗi thay vì trả về null (dùng để biết tải thất bại)
   */
  async getMemberAvailability(sessionId, _memberId, { strict = false } = {}) {
    if (!sessionId) return null;
    const actualId = extractIdFromSlug(sessionId);
    const request = cachedFetch(myAvailabilityKey(actualId), () =>
      http.get(`/sessions/${actualId}/my-availability`),
    );
    return strict ? request : request.catch(() => null);
  },

  async saveMemberAvailability(sessionId, _memberId, slots = []) {
    const actualId = extractIdFromSlug(sessionId);
    const saved = await http.put(`/sessions/${actualId}/my-availability`, { slots });
    invalidateCached(myAvailabilityKey(actualId));
    invalidateCached(availabilitiesKey(actualId));
    return { data: saved, recordId: actualId };
  },

  /**
   * @param {{ strict?: boolean, fresh?: boolean }} options
   *   strict: ném lỗi khi tải thất bại; fresh: bỏ qua cache ngắn hạn
   */
  async getSessionAvailabilities(sessionId, { strict = false, fresh = false } = {}) {
    if (!sessionId) return [];
    const actualId = extractIdFromSlug(sessionId);
    const request = cachedFetch(
      availabilitiesKey(actualId),
      async () => {
        const list = await http.get(`/sessions/${actualId}/availabilities`);
        return Array.isArray(list) ? list : [];
      },
      { fresh },
    );
    return strict ? request : request.catch(() => []);
  },

  /** Danh sách đã tải sẵn (đồng bộ) để hiển thị ngay frame đầu, hoặc undefined. */
  peekSessionAvailabilities(sessionId) {
    if (!sessionId) return undefined;
    return peekCached(availabilitiesKey(extractIdFromSlug(sessionId)));
  },
};

export default availabilityService;
