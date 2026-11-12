import { mock } from "node:test";

/**
 * Thay các hàm DB của RefreshSessionModel bằng bộ nhớ, để test auth chạy không cần PostgreSQL.
 * Giữ đúng luật của bản thật: 1 phiên / (user, loại thiết bị), thay phiên thì đổi id, rotate kiểu compare-and-swap.
 * @param {typeof import("../../src/models/refresh-session.model.js").default} Model
 * @param {(userId: string) => object} getUser - trả về { id, email, full_name, avatar_url, created_at }
 */
export function installFakeRefreshSessions(Model, getUser) {
  const rows = new Map(); // id -> { id, userId, kind, tokenHash, lastUsedAt }
  const byHash = (hash) => [...rows.values()].find((r) => r.tokenHash === hash);
  const mocks = [];
  const fake = (name, impl) => mocks.push(mock.method(Model, name, impl));

  fake("upsertForDevice", async (userId, { kind }, token) => {
    const old = [...rows.values()].find((r) => r.userId === userId && r.kind === kind);
    if (old) rows.delete(old.id);
    const id = crypto.randomUUID();
    rows.set(id, { id, userId, kind, tokenHash: Model.hashToken(token), lastUsedAt: new Date() });
    return { id, replacedId: old?.id ?? null };
  });
  fake("findByToken", async (token) => {
    const row = byHash(Model.hashToken(token));
    return row ? { session_id: row.id, last_used_at: row.lastUsedAt, ...getUser(row.userId) } : null;
  });
  fake("rotate", async (id, oldToken, newToken) => {
    const row = rows.get(id);
    if (!row || row.tokenHash !== Model.hashToken(oldToken)) return false;
    Object.assign(row, { tokenHash: Model.hashToken(newToken), lastUsedAt: new Date() });
    return true;
  });
  fake("exists", async (id) => rows.has(id));
  fake("deleteById", async (id) => (rows.delete(id) ? id : null));
  fake("deleteByToken", async (token) => {
    const row = byHash(Model.hashToken(token));
    return row && rows.delete(row.id) ? row.id : null;
  });
  fake("deleteAllForUser", async (userId) => {
    const ids = [...rows.values()].filter((r) => r.userId === userId).map((r) => r.id);
    ids.forEach((id) => rows.delete(id));
    return ids;
  });
  fake("deleteExpiredForUser", async () => {});

  return {
    rows,
    /** Tạo sẵn một phiên với token cho trước (vd để test refresh/hết hạn). */
    seed(userId, token, { kind = "desktop", lastUsedAt = new Date() } = {}) {
      const id = crypto.randomUUID();
      rows.set(id, { id, userId, kind, tokenHash: Model.hashToken(token), lastUsedAt });
      return id;
    },
    findByToken: (token) => byHash(Model.hashToken(token)) ?? null,
    restore: () => mocks.forEach((m) => m.mock.restore()),
  };
}
