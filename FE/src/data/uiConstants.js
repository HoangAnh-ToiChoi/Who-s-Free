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

// 2. Slot Badge Styles - dung trong bang phan tich Matrix
export const SLOT_BADGE_STYLES = {
  best: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  quorum: 'bg-indigo-100 text-indigo-800 border-indigo-300',
  conflict: 'bg-red-100 text-red-800 border-red-300',
  lunch: 'bg-amber-100 text-amber-800 border-amber-300',
  evening: 'bg-slate-100 text-slate-700 border-slate-300',
};

// 3. Session Status Labels
export const SESSION_STATUS = {
  confirmed: 'Confirmed',
  active_poll: 'Active Poll',
  outreach: 'Outreach',
  closed: 'Closed',
};
