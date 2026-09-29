/**
 * filterOptions.js - Cac option loc tinh tren giao dien (UI Filter Constants)
 * Nhung gia tri nay khong den tu API, la cau hinh UI co dinh.
 */

// Filter tabs tren trang Home (danh sach nhom)
export const GROUP_FILTER_IDS = {
  ALL: 'all',
  OWNER: 'owner',
  JOINED: 'joined',
};

// Default filter khi vao trang
export const DEFAULT_GROUP_FILTER = GROUP_FILTER_IDS.ALL;

// Tabs trong trang Group Detail
export const GROUP_DETAIL_TABS = {
  CALENDARS: 'calendars',
  MEMBERS: 'members',
  SETTINGS: 'settings',
};

// Default tab khi vao Group
export const DEFAULT_GROUP_TAB = GROUP_DETAIL_TABS.CALENDARS;
