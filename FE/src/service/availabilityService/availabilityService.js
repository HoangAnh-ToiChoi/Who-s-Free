import http from "~/utils/http";
import { extractIdFromSlug } from "~/utils/slugify";

export const availabilityService = {
  async getMemberAvailability(sessionId) {
    if (!sessionId) return null;
    const actualId = extractIdFromSlug(sessionId);
    return await http.get(`/sessions/${actualId}/my-availability`).catch(() => null);
  },

  async saveMemberAvailability(sessionId, _memberId, slots = []) {
    const actualId = extractIdFromSlug(sessionId);
    const saved = await http.put(`/sessions/${actualId}/my-availability`, { slots });
    return { data: saved, recordId: actualId };
  },

  async getSessionAvailabilities(sessionId) {
    if (!sessionId) return [];
    const actualId = extractIdFromSlug(sessionId);
    const list = await http.get(`/sessions/${actualId}/availabilities`).catch(() => []);
    return Array.isArray(list) ? list : [];
  },
};

export default availabilityService;
