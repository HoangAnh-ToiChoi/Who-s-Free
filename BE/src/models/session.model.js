import { randomUUID } from "node:crypto";
import { query } from "../configs/db.config.js";

const INITIAL_SESSIONS = [
  {
    id: "sess-g1-kickoff",
    slug: "kickoff--sess-g1-kickoff",
    groupId: "jpT18Fo2Snk",
    refCode: "Ref #KCK1",
    title: "Kickoff Meeting",
    description: "Họp khởi động dự án nhóm 1",
    tag: "CÔNG VIỆC & HỌC TẬP",
    tagColor: "primary",
    dateRange: "27 Th10 – 02 Th11, 2026 (Tuần tới)",
    scheduledTime: "Flexible Window",
    location: "Quán Cafe / Trực tuyến",
    totalMembers: 3,
    respondedCount: 3,
    quorumPercent: 100,
    highestOverlapText: "Optimal slot found - 3/3 members",
    sparkline: [30, 60, 100, 80, 40],
    status: "active_poll",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "i_kM9Pm-RM4",
    slug: "test--i_kM9Pm-RM4",
    groupId: "0jQYUjjjV2s",
    refCode: "Ref #WRHG",
    title: "test",
    description: "Phiên làm việc sprint nhóm 2",
    tag: "CÔNG VIỆC & HỌC TẬP",
    tagColor: "primary",
    dateRange: "27 Th10 – 02 Th11, 2026 (Tuần tới)",
    scheduledTime: "Flexible Window",
    location: "Quán Cafe / Trực tuyến",
    totalMembers: 3,
    respondedCount: 3,
    quorumPercent: 100,
    highestOverlapText: "Optimal slot found - 3/3 members",
    sparkline: [20, 50, 100, 70, 30],
    status: "active_poll",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "MwXq4x0eopI",
    slug: "123--MwXq4x0eopI",
    groupId: "GDBviCaScq0",
    refCode: "Ref #Y8K7",
    title: "123",
    description: "Phiên khảo sát lịch nhóm 3",
    tag: "CÔNG VIỆC & HỌC TẬP",
    tagColor: "primary",
    dateRange: "27 Th10 – 02 Th11, 2026 (Tuần tới)",
    scheduledTime: "Flexible Window",
    location: "Quán Cafe / Trực tuyến",
    totalMembers: 3,
    respondedCount: 3,
    quorumPercent: 100,
    highestOverlapText: "Optimal slot found - 3/3 members",
    sparkline: [40, 80, 100, 60, 20],
    status: "active_poll",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "9SgGnqQJkzg",
    slug: "huhu",
    groupId: "fR7lsu05Itk",
    groupSlug: "haha--ws-wn53d2",
    refCode: "Ref #HYQ9",
    title: "huhu",
    description: "",
    tag: "CÔNG VIỆC & HỌC TẬP",
    tagColor: "primary",
    dateRange: "27 Th10 – 02 Th11, 2026 (Tuần tới)",
    scheduledTime: "Flexible Window",
    location: "Quán Cafe / Trực tuyến",
    totalMembers: 12,
    respondedCount: 0,
    quorumPercent: 0,
    highestOverlapText: "Waiting for responses - 12 pending",
    sparkline: [20, 20, 20, 20, 20],
    status: "active_poll",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

class SessionModel {
  static store = new Map(INITIAL_SESSIONS.map((s) => [s.id, { ...s }]));

  static toPublicSession(s) {
    if (!s) return null;
    return {
      id: s.id,
      slug: s.slug || s.id,
      groupId: s.group_id || s.groupId,
      groupSlug: s.group_slug || s.groupSlug || "",
      refCode: s.ref_code || s.refCode || "Ref #0000",
      title: s.title,
      description: s.description || "",
      tag: s.tag || "CÔNG VIỆC & HỌC TẬP",
      tagColor: s.tag_color || s.tagColor || "primary",
      dateRange: s.date_range || s.dateRange || "",
      scheduledTime: s.scheduled_time || s.scheduledTime || "Flexible Window",
      location: s.location || "Quán Cafe / Trực tuyến",
      totalMembers: parseInt(s.total_members ?? s.totalMembers ?? 3, 10),
      respondedCount: parseInt(s.responded_count ?? s.respondedCount ?? 0, 10),
      quorumPercent: parseInt(s.quorum_percent ?? s.quorumPercent ?? 0, 10),
      highestOverlapText: s.highest_overlap_text || s.highestOverlapText || "",
      sparkline: s.sparkline || [20, 20, 20, 20, 20],
      status: s.status || "active_poll",
      createdAt: s.created_at || s.createdAt || new Date().toISOString(),
      updatedAt: s.updated_at || s.updatedAt || new Date().toISOString(),
    };
  }

  static async findAll({ groupId, slug } = {}) {
    let results = Array.from(this.store.values());
    if (groupId) {
      results = results.filter((s) => s.groupId === groupId);
    }
    if (slug) {
      results = results.filter((s) => s.slug === slug || s.id === slug);
    }
    return results.map(this.toPublicSession);
  }

  static async findById(id) {
    if (!id) return null;
    const session = this.store.get(id);
    if (session) return this.toPublicSession(session);

    for (const s of this.store.values()) {
      if (s.slug === id) return this.toPublicSession(s);
    }
    return null;
  }

  static async create(payload) {
    const id = payload.id || randomUUID();
    const session = {
      ...payload,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.store.set(id, session);
    return this.toPublicSession(session);
  }

  static async delete(id) {
    if (!id) return false;
    const exists = this.store.has(id);
    if (exists) {
      this.store.delete(id);
      return true;
    }
    for (const [key, val] of this.store.entries()) {
      if (val.slug === id) {
        this.store.delete(key);
        return true;
      }
    }
    return false;
  }
}

export default SessionModel;
