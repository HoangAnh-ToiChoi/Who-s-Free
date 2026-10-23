const INITIAL_MEMBERS = [
  {
    id: "mem-1",
    name: "Maya Lin",
    email: "maya.lin@university.edu",
    role: "Lead Admin",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80",
    isAvailable: true,
    statusText: "Active",
    groupRole: "leadership",
  },
  {
    id: "mem-g1-1",
    name: "Maya Lin",
    email: "maya.lin@university.edu",
    role: "Lead Admin",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80",
    isAvailable: true,
    statusText: "Active",
    groupRole: "leadership",
    groupId: "jpT18Fo2Snk",
  },
  {
    id: "mem-g1-2",
    name: "Alex Rivera",
    email: "alex.rivera@design.co",
    role: "Vice Lead",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&h=256&q=80",
    isAvailable: true,
    statusText: "Active",
    groupRole: "leadership",
    groupId: "jpT18Fo2Snk",
  },
  {
    id: "mem-g1-3",
    name: "David Kim",
    email: "david.kim@techcorp.io",
    role: "Frontend Dev",
    avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&h=256&q=80",
    isAvailable: false,
    statusText: "Away",
    groupRole: "core",
    groupId: "jpT18Fo2Snk",
  },
  {
    id: "mem-g2-1",
    name: "Maya Lin",
    email: "maya.lin@university.edu",
    role: "Lead Admin",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80",
    isAvailable: true,
    statusText: "Active",
    groupRole: "leadership",
    groupId: "0jQYUjjjV2s",
  },
  {
    id: "mem-g2-2",
    name: "Sarah Chen",
    email: "sarah.c@cornell.edu",
    role: "Backend Dev",
    avatarUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=256&h=256&q=80",
    isAvailable: true,
    statusText: "Active",
    groupRole: "core",
    groupId: "0jQYUjjjV2s",
  },
  {
    id: "mem-g2-3",
    name: "Liam Evans",
    email: "liam.e@robotics.mit.edu",
    role: "Hardware Lead",
    avatarUrl: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=256&h=256&q=80",
    isAvailable: true,
    statusText: "Active",
    groupRole: "core",
    groupId: "0jQYUjjjV2s",
  },
  {
    id: "mem-g3-1",
    name: "Maya Lin",
    email: "maya.lin@university.edu",
    role: "Lead Admin",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80",
    isAvailable: true,
    statusText: "Active",
    groupRole: "leadership",
    groupId: "GDBviCaScq0",
  },
  {
    id: "mem-g3-2",
    name: "Marcus Zhao",
    email: "marcus.zhao@stanford.edu",
    role: "Algorithm Spec",
    avatarUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=256&h=256&q=80",
    isAvailable: true,
    statusText: "Active",
    groupRole: "core",
    groupId: "GDBviCaScq0",
  },
  {
    id: "mem-g3-3",
    name: "Emma Watson",
    email: "emma.w@oxford.ac.uk",
    role: "Research Lead",
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&h=256&q=80",
    isAvailable: false,
    statusText: "Busy",
    groupRole: "leadership",
    groupId: "GDBviCaScq0",
  },
];

class MemberModel {
  static store = new Map(INITIAL_MEMBERS.map((m) => [m.id, { ...m }]));

  static async findAll() {
    return Array.from(this.store.values());
  }

  static async findById(id) {
    return this.store.get(id) || null;
  }
}

export default MemberModel;
