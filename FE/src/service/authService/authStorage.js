// Session profile cục bộ (localStorage currentUser) chỉ phục vụ first paint (Frame 0).
import { clearAllAvailabilityCache } from "~/utils/availabilityCache";
import { toStoredUser } from "~/utils/authUser";

const CURRENT_USER_KEY = "currentUser";
const LEGACY_KEYS = ["accessToken", "refreshToken", "whosfree_auth_users"];

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    if (!raw) return null;
    const stored = toStoredUser(JSON.parse(raw));
    // Ghi đè bản cũ còn chứa email/role/createdAt từ các phiên bản trước
    if (JSON.stringify(stored) !== raw) setStoredUser(stored);
    return stored;
  } catch {
    return null;
  }
}

export function setStoredUser(user) {
  try {
    const stored = toStoredUser(user);
    if (stored) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(stored));
    } else {
      localStorage.removeItem(CURRENT_USER_KEY);
    }
  } catch {
    // localStorage bị chặn/đầy — user vẫn nằm trong memory
  }
}

export function clearStoredUserData() {
  try {
    [...LEGACY_KEYS, CURRENT_USER_KEY].forEach((key) => localStorage.removeItem(key));
  } catch {
    // localStorage không truy cập được — không có gì để dọn
  }
  clearAllAvailabilityCache();
}
