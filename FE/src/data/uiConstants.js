/**
 * uiConstants.js - Hang so cau hinh giao dien (UI Display Constants)
 * Du lieu tinh phuc vu hien thi UI: mau sac, badge, status.
 * Khong phai entity data -> KHONG thuoc db.json
 */

// 1. Session Tag Colors - dung trong SessionCard
export const SESSION_TAG_THEMES = {
  primary: {
    badge: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
    progressTrack: 'bg-indigo-100/60',
    progressBar: 'bg-indigo-600',
    highlightBg: 'bg-indigo-50/80 border-indigo-200/60 text-indigo-800',
    highlightIconName: 'Star',
  },
  secondary: {
    badge: 'bg-purple-50 text-purple-700 border-purple-200/80',
    progressTrack: 'bg-purple-100/60',
    progressBar: 'bg-purple-600',
    highlightBg: 'bg-purple-50/80 border-purple-200/60 text-purple-800',
    highlightIconName: 'CheckCircle2',
  },
  tertiary: {
    badge: 'bg-amber-50 text-amber-700 border-amber-200/80',
    progressTrack: 'bg-amber-100/60',
    progressBar: 'bg-amber-600',
    highlightBg: 'bg-amber-50/80 border-amber-200/60 text-amber-800',
    highlightIconName: 'Clock',
  },
};

// 3. Session Status Labels
export const SESSION_STATUS = {
  confirmed: 'Confirmed',
  active_poll: 'Active Poll',
  outreach: 'Outreach',
  closed: 'Closed',
};
