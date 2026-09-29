/**
 * mockData.js — Who's Free project
 *
 * File này CHỈ chứa dữ liệu hiển thị UI tĩnh (UI display data).
 *
 *  Được phép ở đây : kết quả phân tích UI, seed data slots
 *  KHÔNG ở đây     : groups, sessions, members → nguồn sự thật là db.json
 *
 * @see /db.json             — Single source of truth cho entity data
 * @see src/data/uiConstants.js  — Hằng số màu sắc, badge, theme
 * @see src/data/filterOptions.js — Cấu hình filter / tab
 */

// Import trực tiếp từ db.json — Vite hỗ trợ native JSON import
import db from '../../db.json';

export const mockGroups    = db.groups;
export const mockWorkspaces = db.groups;
export const mockSessions  = db.sessions;
export const mockMembers   = db.members;
export const mockCurrentUser = db.currentUser?.[0] ?? db.members[0];

// ---------------------------------------------------------------------------
// Du lieu mau trang thai ban dau cho luoi chon gio (Matrix Grid)
// Sau nay se lay tu API: GET /availability-slots?userId=...&sessionId=...
// ---------------------------------------------------------------------------
export const initialAvailabilitySlots = [
  { id: 'slot-1', day: 0, startMinutes: 9 * 60, endMinutes: 11 * 60 + 30, note: 'Prefer morning sync' },
  { id: 'slot-2', day: 2, startMinutes: 14 * 60, endMinutes: 16 * 60 + 30, note: 'Available after class' },
  { id: 'slot-3', day: 4, startMinutes: 10 * 60, endMinutes: 12 * 60, note: 'Free before lab' },
];

// ---------------------------------------------------------------------------
// Ket qua tinh toan khung gio toi uu (Optimal Slots Analysis)
// Sau nay se lay tu API: GET /sessions/:id/analysis/optimal
// ---------------------------------------------------------------------------
export const mockOptimalSlots = [
  { rank: 1, timeLabel: 'Mon, 10:00 - 11:00', badge: 'Best Slot', badgeType: 'best', description: '8 of 10 available - Full leadership quorum met' },
  { rank: 2, timeLabel: 'Mon, 14:00 - 15:00', badge: '70% Quorum', badgeType: 'quorum', description: '7 of 10 available - Leadership active, 1 firmware conflict' },
  { rank: 3, timeLabel: 'Mon, 15:00 - 16:00', badge: '70% Quorum', badgeType: 'quorum', description: '7 of 10 available - Steady afternoon availability window' },
];

// ---------------------------------------------------------------------------
// Ket qua tinh toan khung gio xung dot (Conflict Slots Analysis)
// Sau nay se lay tu API: GET /sessions/:id/analysis/conflicts
// ---------------------------------------------------------------------------
export const mockConflictSlots = [
  { timeLabel: 'Mon, 08:00 - 09:00', badge: 'Conflict Heavy', badgeType: 'conflict', icon: 'close', description: 'Only 2 of 10 available (20%) - Early class & commute clash' },
  { timeLabel: 'Mon, 12:00 - 13:00', badge: 'Lunch / Class', badgeType: 'lunch', icon: 'restaurant', description: 'Only 3 of 10 available (30%) - Core hardware lab conflicts' },
  { timeLabel: 'Mon, 19:00 - 20:00', badge: 'Evening Conflict', badgeType: 'evening', icon: 'nightlight', description: 'Only 3 of 10 available (30%) - Post-lecture campus transit' },
];
