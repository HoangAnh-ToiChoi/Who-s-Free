import { randomUUID } from "node:crypto";

const INITIAL_AVAILABILITIES = [
  {
    id: "avail-kck-1",
    sessionId: "sess-g1-kickoff",
    memberId: "mem-1",
    memberName: "Maya Lin",
    role: "Lead Admin",
    groupRole: "leadership",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80",
    slots: [
      {
        id: "slot-1791112342473",
        dayIndex: 1,
        dateStr: "2026-09-29",
        startMinutes: 780,
        endMinutes: 810,
        label: "Available",
        note: "",
      },
    ],
  },
  {
    id: "avail-kck-2",
    sessionId: "sess-g1-kickoff",
    memberId: "mem-g1-2",
    memberName: "Alex Rivera",
    role: "Vice Lead",
    groupRole: "leadership",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&h=256&q=80",
    slots: [
      {
        id: "slot-kck-2",
        dayIndex: 3,
        dateStr: "2026-10-01",
        startMinutes: 540,
        endMinutes: 660,
        label: "Available",
        note: "",
      },
    ],
  },
  {
    id: "avail-kck-3",
    sessionId: "sess-g1-kickoff",
    memberId: "mem-g1-3",
    memberName: "David Kim",
    role: "Frontend Dev",
    groupRole: "core",
    avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&h=256&q=80",
    slots: [
      {
        id: "slot-kck-3",
        dayIndex: 3,
        dateStr: "2026-10-01",
        startMinutes: 540,
        endMinutes: 660,
        label: "Available",
        note: "",
      },
    ],
  },
  {
    id: "8oTLbKstXPg",
    sessionId: "i_kM9Pm-RM4",
    memberId: "mem-1",
    memberName: "Maya Lin",
    role: "Lead Admin",
    groupRole: "leadership",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80",
    slots: [
      {
        id: "slot-1791111849061",
        dayIndex: 3,
        dateStr: "2026-10-01",
        startMinutes: 540,
        endMinutes: 780,
        label: "Available",
        note: "",
      },
    ],
  },
  {
    id: "avail-g2-2",
    sessionId: "i_kM9Pm-RM4",
    memberId: "mem-g2-2",
    memberName: "Sarah Chen",
    role: "Backend Dev",
    groupRole: "core",
    avatarUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=256&h=256&q=80",
    slots: [
      {
        id: "slot-g2-2",
        dayIndex: 3,
        dateStr: "2026-10-01",
        startMinutes: 540,
        endMinutes: 690,
        label: "Available",
        note: "",
      },
    ],
  },
  {
    id: "avail-g2-3",
    sessionId: "i_kM9Pm-RM4",
    memberId: "mem-g2-3",
    memberName: "Liam Evans",
    role: "Hardware Lead",
    groupRole: "core",
    avatarUrl: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=256&h=256&q=80",
    slots: [
      {
        id: "slot-g2-3",
        dayIndex: 3,
        dateStr: "2026-10-01",
        startMinutes: 540,
        endMinutes: 720,
        label: "Available",
        note: "",
      },
    ],
  },
  {
    id: "dSAWpcgUGsA",
    sessionId: "MwXq4x0eopI",
    memberId: "mem-1",
    memberName: "Maya Lin",
    role: "Lead Admin",
    groupRole: "leadership",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80",
    slots: [
      {
        id: "slot-1790842648797",
        dayIndex: 0,
        dateStr: "2026-09-28",
        startMinutes: 750,
        endMinutes: 780,
        label: "Available",
        note: "",
      },
    ],
  },
  {
    id: "avail-g3-2",
    sessionId: "MwXq4x0eopI",
    memberId: "mem-g3-2",
    memberName: "Marcus Zhao",
    role: "Algorithm Spec",
    groupRole: "core",
    avatarUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=256&h=256&q=80",
    slots: [
      {
        id: "slot-g3-2",
        dayIndex: 0,
        dateStr: "2026-09-28",
        startMinutes: 720,
        endMinutes: 840,
        label: "Available",
        note: "",
      },
    ],
  },
  {
    id: "avail-g3-3",
    sessionId: "MwXq4x0eopI",
    memberId: "mem-g3-3",
    memberName: "Emma Watson",
    role: "Research Lead",
    groupRole: "leadership",
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&h=256&q=80",
    slots: [
      {
        id: "slot-g3-3",
        dayIndex: 0,
        dateStr: "2026-09-28",
        startMinutes: 750,
        endMinutes: 810,
        label: "Available",
        note: "",
      },
    ],
  },
];

class AvailabilityModel {
  static store = new Map(INITIAL_AVAILABILITIES.map((a) => [a.id, { ...a }]));

  static toPublicAvailability(a) {
    if (!a) return null;
    return {
      id: a.id,
      sessionId: a.sessionId,
      memberId: a.memberId,
      memberName: a.memberName || "Thành viên",
      role: a.role || "Thành viên",
      groupRole: a.groupRole || "core",
      avatarUrl: a.avatarUrl || null,
      slots: Array.isArray(a.slots) ? a.slots : [],
      updatedAt: a.updatedAt || new Date().toISOString(),
    };
  }

  static async findAll({ sessionId, memberId } = {}) {
    let list = Array.from(this.store.values());
    if (sessionId) {
      list = list.filter((a) => a.sessionId === sessionId);
    }
    if (memberId) {
      list = list.filter((a) => a.memberId === memberId);
    }
    return list.map(this.toPublicAvailability);
  }

  static async findById(id) {
    if (!id) return null;
    const item = this.store.get(id);
    return item ? this.toPublicAvailability(item) : null;
  }

  static async create(payload) {
    const id = payload.id || randomUUID();
    const record = {
      ...payload,
      id,
      slots: Array.isArray(payload.slots) ? payload.slots : [],
      updatedAt: new Date().toISOString(),
    };
    this.store.set(id, record);
    return this.toPublicAvailability(record);
  }

  static async update(id, payload) {
    const existing = this.store.get(id);
    if (!existing) return null;

    const updated = {
      ...existing,
      ...payload,
      id,
      updatedAt: new Date().toISOString(),
    };
    this.store.set(id, updated);
    return this.toPublicAvailability(updated);
  }
}

export default AvailabilityModel;
