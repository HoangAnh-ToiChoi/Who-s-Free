// mockData.js — Who's Free project

export const mockWorkspaces = [
  {
    id: 'ws-1',
    name: 'Robotics & AI Club',
    description: 'Autonomous systems research, hardware prototyping, and intercollegiate competition squad.',
    icon: 'Bot',
    color: 'emerald',
    role: 'Owner',
    memberCount: 14,
    capacity: 20,
    leadAdmin: 'Maya Lin (You)',
    cohort: 'Fall 2026 Cohort',
    activeSessionsCount: 3,
    responseRate: 88,
    avatarPreviews: [
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&h=256&q=80',
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&h=256&q=80',
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=256&h=256&q=80'
    ]
  },
  {
    id: 'ws-2',
    name: 'Campus Badminton Club',
    description: 'Court schedules, ladder tournaments, weekly practice sessions and friendly collegiate scrimmages.',
    icon: 'Activity',
    color: 'amber',
    role: 'Joined',
    memberCount: 8,
    capacity: 10,
    leadAdmin: 'Kevin Vance',
    cohort: 'Spring 2026',
    activeSessionsCount: 1,
    responseRate: 92,
    avatarPreviews: [
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&h=256&q=80',
      'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=256&h=256&q=80',
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=256&h=256&q=80'
    ]
  },
  {
    id: 'ws-3',
    name: 'Design Sprint Team',
    description: 'Cross-functional UX alignment, weekly prototype reviews, design system governance and user research.',
    icon: 'Palette',
    color: 'purple',
    role: 'Owner',
    memberCount: 19,
    capacity: 200,
    leadAdmin: 'Maya Lin (You)',
    cohort: 'Q4 Sprint',
    activeSessionsCount: 2,
    responseRate: 75,
    avatarPreviews: [
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80',
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&h=256&q=80',
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=256&h=256&q=80'
    ]
  },
  {
    id: 'ws-4',
    name: 'Fintech & Quant Lab',
    description: 'Algorithmic trading model backtests, market microstructure reading group, and paper trading syncs.',
    icon: 'TrendingUp',
    color: 'blue',
    role: 'Joined',
    memberCount: 15,
    capacity: 200,
    leadAdmin: 'David Zhao',
    cohort: 'Fall 2026',
    activeSessionsCount: 2,
    responseRate: 84,
    avatarPreviews: [
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&h=256&q=80',
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=256&h=256&q=80',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80'
    ]
  },
  {
    id: 'ws-5',
    name: 'Autonomous Drone Project',
    description: 'ArduPilot drone telemetry calibration, obstacle avoidance algorithms, and outdoor flight test slots.',
    icon: 'Navigation',
    color: 'emerald',
    role: 'Owner',
    memberCount: 7,
    capacity: 10,
    leadAdmin: 'Maya Lin (You)',
    cohort: 'Winter Cohort',
    activeSessionsCount: 1,
    responseRate: 95,
    avatarPreviews: [
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80',
      'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=256&h=256&q=80',
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=256&h=256&q=80'
    ]
  }
];

export const mockGroups = mockWorkspaces;

export const mockMembers = [
  {
    id: 'mem-1',
    name: 'Maya Lin',
    email: 'maya.lin@university.edu',
    role: 'Lead Admin',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80',
    isAvailable: true,
    statusText: 'Active',
    groupRole: 'leadership'
  },
  {
    id: 'mem-2',
    name: 'Alex Rivera',
    email: 'alex.rivera@university.edu',
    role: 'Vice Lead',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&h=256&q=80',
    isAvailable: true,
    statusText: 'Active',
    groupRole: 'leadership'
  },
  {
    id: 'mem-3',
    name: 'Dev Patel',
    email: 'dev.patel@university.edu',
    role: 'Software Lead',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&h=256&q=80',
    isAvailable: true,
    statusText: 'Active',
    groupRole: 'core'
  },
  {
    id: 'mem-4',
    name: 'Sarah Chen',
    email: 'sarah.chen@university.edu',
    role: 'Hardware',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=256&h=256&q=80',
    isAvailable: true,
    statusText: 'Active',
    groupRole: 'core'
  },
  {
    id: 'mem-5',
    name: 'Marcus Vance',
    email: 'marcus.vance@university.edu',
    role: 'Firmware',
    avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=256&h=256&q=80',
    isAvailable: true,
    statusText: 'Active',
    groupRole: 'core'
  },
  {
    id: 'mem-9',
    name: 'Kevin Zhang',
    email: 'kevin.zhang@university.edu',
    role: 'Safety Lead',
    avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=256&h=256&q=80',
    isAvailable: false,
    statusText: 'Pending response (Invited 2d ago)',
    groupRole: 'pending'
  }
];

export const mockSessions = [
  {
    id: 'sess-1',
    refCode: 'Ref #EX-804',
    title: 'Executive Board Sprint',
    description: 'Q4 Competition milestones, funding allocation, and chassis delivery sign-off.',
    tag: 'CONFIRMED & SCHEDULED',
    tagColor: 'primary',
    dateRange: 'Monday, Oct 20, 2026',
    scheduledTime: '10:00 AM – 11:00 AM PST (1 hr)',
    location: 'Innovation Lab 402, Engineering Bldg',
    respondedCount: 10,
    totalMembers: 12,
    highestOverlapText: 'Highest overlap: Mon 10:00 – 11:00 (8 available)',
    status: 'confirmed',
    quorumPercent: 83,
    sparkline: [20, 40, 60, 100, 50]
  },
  {
    id: 'sess-2',
    refCode: 'Ref #WS-102',
    title: 'Weekly Training & Workshop',
    description: 'Hands-on ROS2 sensor telemetry integration and gazebo simulation drills.',
    tag: 'TECHNICAL SPRINT',
    tagColor: 'secondary',
    dateRange: 'Oct 22 – Oct 28, 2026',
    scheduledTime: 'Wed 14:00 – 16:00',
    location: 'MakerSpace Bay 3',
    respondedCount: 7,
    totalMembers: 10,
    highestOverlapText: 'Highest overlap: Wed 14:00 – 16:00 (7 available)',
    status: 'active_poll',
    quorumPercent: 70,
    sparkline: [30, 40, 100, 60, 20]
  },
  {
    id: 'sess-3',
    refCode: 'Ref #PO-509',
    title: 'Sponsor Pitch Dry-Run',
    description: 'Rehearsal of industry partner slide deck with faculty advisors and alumni mentors.',
    tag: 'EXTERNAL OUTREACH',
    tagColor: 'tertiary',
    dateRange: 'Oct 25 – Oct 31, 2026',
    scheduledTime: '5:00 PM – 6:15 PM (Proposed)',
    location: 'Virtual Meet',
    respondedCount: 4,
    totalMembers: 12,
    highestOverlapText: 'Waiting for responses • 8 pending',
    status: 'outreach',
    quorumPercent: 33,
    sparkline: [20, 30, 50, 100, 20]
  }
];

export const initialAvailabilitySlots = [
  { id: 'slot-1', day: 0, startMinutes: 9 * 60, endMinutes: 11 * 60 + 30, note: 'Prefer morning sync' },
  { id: 'slot-2', day: 2, startMinutes: 14 * 60, endMinutes: 16 * 60 + 30, note: 'Available after class' },
  { id: 'slot-3', day: 4, startMinutes: 10 * 60, endMinutes: 12 * 60, note: 'Free before lab' }
];

export const mockOptimalSlots = [
  {
    rank: 1,
    timeLabel: 'Mon, 10:00 – 11:00',
    badge: 'Best Slot',
    badgeType: 'best',
    description: '8 of 10 available • Full leadership quorum met'
  },
  {
    rank: 2,
    timeLabel: 'Mon, 14:00 – 15:00',
    badge: '70% Quorum',
    badgeType: 'quorum',
    description: '7 of 10 available • Leadership active, 1 firmware conflict'
  },
  {
    rank: 3,
    timeLabel: 'Mon, 15:00 – 16:00',
    badge: '70% Quorum',
    badgeType: 'quorum',
    description: '7 of 10 available • Steady afternoon availability window'
  }
];

export const mockConflictSlots = [
  {
    timeLabel: 'Mon, 08:00 – 09:00',
    badge: 'Conflict Heavy',
    badgeType: 'conflict',
    icon: 'close',
    description: 'Only 2 of 10 available (20%) • Early class & commute clash'
  },
  {
    timeLabel: 'Mon, 12:00 – 13:00',
    badge: 'Lunch / Class',
    badgeType: 'lunch',
    icon: 'restaurant',
    description: 'Only 3 of 10 available (30%) • Core hardware lab conflicts'
  },
  {
    timeLabel: 'Mon, 19:00 – 20:00',
    badge: 'Evening Conflict',
    badgeType: 'evening',
    icon: 'nightlight',
    description: 'Only 3 of 10 available (30%) • Post-lecture campus transit'
  }
];

// Current logged-in user mock
export const mockCurrentUser = {
  id: 'mem-1',
  name: 'Maya Lin',
  email: 'maya.lin@university.edu',
  role: 'Lead Admin',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80',
};
