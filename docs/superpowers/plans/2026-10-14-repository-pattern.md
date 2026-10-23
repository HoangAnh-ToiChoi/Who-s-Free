# Repository Pattern Refactor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract `toPublicX` mapper functions into `src/utils/mappers/`, split `TokenModel` from `UserModel`, and update all services to import mappers directly — keeping the 25/25 auth integration tests green throughout.

**Architecture:** Model files become pure DB ops (one file per table). Pure transform functions live in `src/utils/mappers/<entity>.mapper.js`. Services import mappers and call models; no mapper logic in models.

**Tech Stack:** Node.js ES modules, Express MVC, PostgreSQL (pg pool), Supabase Auth, Node test runner (`node:test`).

---

## File Map

```
Create:
  BE/src/utils/mappers/user.mapper.js
  BE/src/utils/mappers/group.mapper.js
  BE/src/utils/mappers/group-member.mapper.js
  BE/src/utils/mappers/invitation.mapper.js
  BE/src/utils/mappers/session.mapper.js
  BE/src/utils/mappers/availability.mapper.js
  BE/src/models/token.model.js

Modify:
  BE/src/models/user.model.js           ← remove toPublicUser + all token ops
  BE/src/models/group.model.js          ← remove toPublicGroup
  BE/src/models/group-member.model.js   ← remove toPublicMember
  BE/src/models/group-invitation.model.js ← remove toPublicInvitation
  BE/src/models/session.model.js        ← remove toPublicSession + return raw
  BE/src/models/availability.model.js   ← remove toPublicAvailability + return raw
  BE/src/services/auth.service.js       ← use TokenModel + toPublicUser mapper
  BE/src/services/group.service.js      ← import toPublicGroup mapper
  BE/src/services/group-member.service.js ← import toPublicMember mapper
  BE/src/services/group-invitation.service.js ← import 3 mappers
  BE/src/services/session.service.js    ← import + apply toPublicSession
  BE/src/services/availability.service.js ← import + apply toPublicAvailability
  BE/tests/auth.integration.test.js     ← update TokenModel references
  BE/tests/auth.refactor.test.js        ← update TokenModel references
```

---

## Task 1: Create mapper files

**Files:**
- Create: `BE/src/utils/mappers/user.mapper.js`
- Create: `BE/src/utils/mappers/group.mapper.js`
- Create: `BE/src/utils/mappers/group-member.mapper.js`
- Create: `BE/src/utils/mappers/invitation.mapper.js`
- Create: `BE/src/utils/mappers/session.mapper.js`
- Create: `BE/src/utils/mappers/availability.mapper.js`

- [ ] **Step 1: Create `BE/src/utils/mappers/user.mapper.js`**

```js
export function toPublicUser(rawUser) {
  if (!rawUser) return null;

  const metadata = rawUser.user_metadata || {};
  return {
    id: rawUser.id,
    email: (rawUser.email || "").toLowerCase(),
    fullName:
      rawUser.full_name ||
      metadata.full_name ||
      rawUser.fullName ||
      rawUser.name ||
      (rawUser.email ? rawUser.email.split("@")[0] : "Thành viên"),
    avatarUrl:
      rawUser.avatar_url || metadata.avatar_url || rawUser.avatarUrl || "",
    role: rawUser.role || metadata.role || "member",
    createdAt: rawUser.created_at || rawUser.createdAt || new Date().toISOString(),
  };
}
```

- [ ] **Step 2: Create `BE/src/utils/mappers/group.mapper.js`**

```js
export function toPublicGroup(group) {
  if (!group) return null;

  let memberPreviews = group.member_previews || group.memberPreviews || [];
  if (typeof memberPreviews === "string") {
    try { memberPreviews = JSON.parse(memberPreviews); } catch { memberPreviews = []; }
  }
  if (!Array.isArray(memberPreviews)) memberPreviews = [];

  return {
    id: group.id,
    slug: group.slug,
    name: group.name,
    category: group.category || "work",
    description: group.description || "",
    icon: group.icon || "Users",
    color: group.color || "indigo",
    capacity: parseInt(group.capacity, 10) || 10,
    cohort: group.cohort || "2026",
    createdBy: group.created_by || group.createdBy || null,
    leadAdmin: group.lead_admin || group.leadAdmin || null,
    memberCount: parseInt(group.member_count ?? group.memberCount ?? 1, 10),
    memberPreviews: memberPreviews.map((m) => ({
      id: m.id,
      name: m.name || m.fullName || "Thành viên",
      avatarUrl: m.avatarUrl || m.avatar_url || null,
    })),
    userRole: group.user_role || group.userRole || "member",
    userGroupRole: group.user_group_role || group.userGroupRole || "core",
    createdAt: group.created_at || group.createdAt || new Date().toISOString(),
    updatedAt: group.updated_at || group.updatedAt || new Date().toISOString(),
  };
}
```

- [ ] **Step 3: Create `BE/src/utils/mappers/group-member.mapper.js`**

```js
export function toPublicMember(member) {
  if (!member) return null;

  return {
    id: member.id,
    groupId: member.group_id || member.groupId,
    userId: member.user_id || member.userId,
    role: member.role || "member",
    groupRole: member.group_role || member.groupRole || "core",
    joinedAt: member.joined_at || member.joinedAt || new Date().toISOString(),
    user: {
      id: member.user_id || member.userId,
      email: member.email || "",
      fullName: member.full_name || member.fullName || member.name || "Thành viên",
      avatarUrl: member.avatar_url || member.avatarUrl || "",
    },
  };
}
```

- [ ] **Step 4: Create `BE/src/utils/mappers/invitation.mapper.js`**

```js
export function toPublicInvitation(inv) {
  if (!inv) return null;

  return {
    id: inv.id,
    groupId: inv.group_id || inv.groupId,
    email: (inv.email || "").toLowerCase(),
    role: inv.role || "member",
    status: inv.status || "pending",
    expiresAt: inv.expires_at || inv.expiresAt,
    createdAt: inv.created_at || inv.createdAt || new Date().toISOString(),
    acceptedAt: inv.accepted_at || inv.acceptedAt || null,
    revokedAt: inv.revoked_at || inv.revokedAt || null,
    invitedBy: inv.invited_by || inv.invitedBy || null,
    inviter: {
      id: inv.inviter_id || inv.invited_by || inv.invitedBy || null,
      name: inv.inviter_name || inv.inviterName || "Quản trị viên",
      email: inv.inviter_email || inv.inviterEmail || "",
    },
    group: inv.group_name || inv.groupName ? {
      id: inv.group_id || inv.groupId,
      name: inv.group_name || inv.groupName,
      slug: inv.group_slug || inv.groupSlug || "",
      icon: inv.group_icon || inv.groupIcon || "Users",
      color: inv.group_color || inv.groupColor || "indigo",
      capacity: parseInt(inv.group_capacity || inv.groupCapacity || 10, 10),
    } : undefined,
  };
}
```

- [ ] **Step 5: Create `BE/src/utils/mappers/session.mapper.js`**

```js
export function toPublicSession(s) {
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
```

- [ ] **Step 6: Create `BE/src/utils/mappers/availability.mapper.js`**

```js
export function toPublicAvailability(a) {
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
```

- [ ] **Step 7: Run tests to confirm baseline still passes**

Run: `cd BE && node --experimental-vm-modules node_modules/.bin/jest --testPathPattern="auth.integration"`  
Or using the project's test script: `cd BE && npm test`  
Expected: 25/25 passing (mappers are not imported by anything yet)

- [ ] **Step 8: Commit**

```bash
git add BE/src/utils/mappers/
git commit -m "feat(mappers): extract toPublicX pure functions into src/utils/mappers/"
```

---

## Task 2: Create `token.model.js`

**Files:**
- Create: `BE/src/models/token.model.js`

This file extracts all token-related state and methods from `user.model.js`. `TokenModel` imports `UserModel` for user lookups in `findByRefreshToken` and `rotateRefreshToken` (test path).

- [ ] **Step 1: Create `BE/src/models/token.model.js`**

```js
import crypto from "node:crypto";
import { query } from "../configs/db.config.js";
import { isUuid } from "../utils/uuid.js";
import AppError from "../utils/AppError.js";
import UserModel from "./user.model.js";

class TokenModel {
  static _inMemoryTokens = new Map();

  static #MAX_CACHE_SIZE = 500;
  // Must match TokenService.REFRESH_TOKEN_TTL_MS
  static #TOKEN_TTL_MS = 5 * 24 * 60 * 60 * 1000;

  static #isTokenExpired(record) {
    if (!record?.createdAt) return true;
    return Date.now() - new Date(record.createdAt).getTime() > this.#TOKEN_TTL_MS;
  }

  static #pruneTokenCache() {
    if (this._inMemoryTokens.size < this.#MAX_CACHE_SIZE) return;
    const iter = this._inMemoryTokens.keys();
    for (let i = 0; i < 50; i++) {
      const key = iter.next().value;
      if (key !== undefined) this._inMemoryTokens.delete(key);
    }
  }

  static hashToken(token) {
    if (!token) return null;
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  static async updateRefreshToken(userId, refreshToken) {
    if (!userId) return null;
    const now = new Date();
    const tokenHash = this.hashToken(refreshToken);

    this.#pruneTokenCache();
    this._inMemoryTokens.set(userId, { refreshToken, tokenHash, createdAt: now });

    if (!isUuid(userId)) return null;
    if (process.env.NODE_ENV === "test") return null;

    const sql = `
      UPDATE public.users
      SET refresh_token = $2, refresh_token_created_at = NOW(), updated_at = NOW()
      WHERE id = $1
      RETURNING *;
    `;
    const { rows } = await query(sql, [userId, tokenHash]);
    return rows?.[0] ?? null;
  }

  /**
   * Rotate Refresh Token via Compare-and-Swap (CAS):
   * Only updates when the stored hash matches the old token — prevents replay attacks.
   */
  static async rotateRefreshToken(userId, oldRefreshToken, newRefreshToken) {
    if (!userId || !oldRefreshToken || !newRefreshToken) return null;
    const oldHash = this.hashToken(oldRefreshToken);
    const newHash = this.hashToken(newRefreshToken);
    const now = new Date();

    if (isUuid(userId)) {
      if (process.env.NODE_ENV !== "test") {
        const sql = `
          UPDATE public.users
          SET refresh_token = $3, refresh_token_created_at = NOW(), updated_at = NOW()
          WHERE id = $1 AND refresh_token = $2
          RETURNING *;
        `;
        const { rows } = await query(sql, [userId, oldHash, newHash]);
        if (rows?.[0]) {
          this._inMemoryTokens.set(userId, { refreshToken: newRefreshToken, tokenHash: newHash, createdAt: now });
          return rows[0];
        }
        return null;
      }
    }

    // In-memory path for test environments
    if (this._inMemoryTokens.has(userId)) {
      const record = this._inMemoryTokens.get(userId);
      if (record.refreshToken === oldRefreshToken || record.tokenHash === oldHash) {
        this._inMemoryTokens.set(userId, { refreshToken: newRefreshToken, tokenHash: newHash, createdAt: now });
        return await UserModel.findById(userId);
      }
    }

    return null;
  }

  static async findByRefreshToken(refreshToken) {
    if (!refreshToken) return null;
    const tokenHash = this.hashToken(refreshToken);

    // Check in-memory first — return the record even if expired so the service
    // layer can distinguish EXPIRED vs INVALID and return the correct error code.
    for (const [userId, record] of this._inMemoryTokens.entries()) {
      if (record.refreshToken === refreshToken || record.tokenHash === tokenHash) {
        const user = await UserModel.findById(userId);
        if (user) {
          return {
            ...user,
            refresh_token: record.tokenHash,
            refresh_token_created_at: record.createdAt,
          };
        }
      }
    }

    if (process.env.NODE_ENV === "test") return null;

    try {
      const { rows } = await query(
        "SELECT id, email, full_name, avatar_url, refresh_token, refresh_token_created_at, created_at FROM public.users WHERE refresh_token = $1 LIMIT 1;",
        [tokenHash]
      );
      if (rows?.length) return rows[0];
    } catch (error) {
      console.warn("Lỗi truy vấn user theo refresh_token:", error.message);
    }

    return null;
  }

  /** Evict stale entries from the token cache. Call periodically or at startup. */
  static pruneExpiredTokenCache() {
    for (const [userId, record] of this._inMemoryTokens.entries()) {
      if (this.#isTokenExpired(record)) this._inMemoryTokens.delete(userId);
    }
  }

  static async clearRefreshToken(userId) {
    if (!userId) return;
    this._inMemoryTokens.delete(userId);

    if (!isUuid(userId) || process.env.NODE_ENV === "test") return;

    try {
      await query(
        "UPDATE public.users SET refresh_token = NULL, refresh_token_created_at = NULL, updated_at = NOW() WHERE id = $1;",
        [userId]
      );
    } catch (error) {
      if (process.env.NODE_ENV !== "test") throw AppError.internal("Lỗi thu hồi phiên đăng nhập", "DATABASE_ERROR");
      console.warn("Lỗi xóa refresh_token trong database:", error.message);
    }
  }
}

export default TokenModel;
```

- [ ] **Step 2: Run tests — should still pass (nothing imports TokenModel yet)**

Run: `cd BE && npm test`  
Expected: 25/25 passing

- [ ] **Step 3: Commit**

```bash
git add BE/src/models/token.model.js
git commit -m "feat(auth): extract TokenModel from UserModel — token column ops in own file"
```

---

## Task 3: Strip `user.model.js` + wire `auth.service.js` + update test files

**Files:**
- Modify: `BE/src/models/user.model.js`
- Modify: `BE/src/services/auth.service.js`
- Modify: `BE/tests/auth.integration.test.js`
- Modify: `BE/tests/auth.refactor.test.js`

This is the biggest task — all four files change together so that the tests pass immediately after.

- [ ] **Step 1: Rewrite `BE/src/models/user.model.js`** — remove crypto import, AppError import, _inMemoryTokens, TOKEN_TTL_MS, isTokenExpired, pruneTokenCache, hashToken, toPublicUser, updateRefreshToken, rotateRefreshToken, findByRefreshToken, pruneExpiredTokenCache, clearRefreshToken

```js
import { query } from "../configs/db.config.js";
import SupabaseAuthModel from "./supabase-auth.model.js";
import { isUuid } from "../utils/uuid.js";

/** Data access for application users (public.users profile fields only). */
class UserModel {
  // In-memory store used by test environments (no real DB available in unit tests).
  // In production, DB is always the source of truth — these maps act only as a
  // short-lived write-through cache. Max size prevents unbounded memory growth.
  static _inMemoryUsers = new Map();
  static #MAX_CACHE_SIZE = 500;

  static #pruneUserCache() {
    if (this._inMemoryUsers.size < this.#MAX_CACHE_SIZE) return;
    const iter = this._inMemoryUsers.keys();
    for (let i = 0; i < 50; i++) {
      const key = iter.next().value;
      if (key !== undefined) this._inMemoryUsers.delete(key);
    }
  }

  /** Persist Supabase Auth profile data in public.users. */
  static async upsertToDatabase({ id, email, fullName, avatarUrl }) {
    if (!email) return null;

    const normalizedEmail = email.toLowerCase().trim();
    const validId = isUuid(id) ? id : null;

    const userRecord = {
      id: validId || id || `usr-${Date.now()}`,
      email: normalizedEmail,
      full_name: fullName || email.split("@")[0],
      avatar_url: avatarUrl || "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (process.env.NODE_ENV === "test") {
      this.#pruneUserCache();
      if (userRecord.id) {
        this._inMemoryUsers.set(userRecord.id, userRecord);
        this._inMemoryUsers.set(normalizedEmail, userRecord);
      }
      return userRecord;
    }

    const sql = `
      INSERT INTO public.users (id, email, full_name, avatar_url, updated_at)
      VALUES (COALESCE($1::uuid, gen_random_uuid()), $2, $3, $4, NOW())
      ON CONFLICT (email)
      DO UPDATE SET
        full_name = EXCLUDED.full_name,
        avatar_url = COALESCE(NULLIF(EXCLUDED.avatar_url, ''), public.users.avatar_url),
        updated_at = NOW()
      RETURNING *;
    `;

    const { rows } = await query(sql, [
      validId,
      normalizedEmail,
      fullName || email.split("@")[0],
      avatarUrl || "",
    ]);

    if (rows?.[0]) {
      this.#pruneUserCache();
      this._inMemoryUsers.set(rows[0].id, rows[0]);
      this._inMemoryUsers.set(normalizedEmail, rows[0]);
      return rows[0];
    }

    return userRecord;
  }

  static async syncAuthUser(authUser, { fullName, avatarUrl } = {}) {
    if (!authUser) return null;

    const metadata = authUser.user_metadata || {};
    await this.upsertToDatabase({
      id: authUser.id,
      email: authUser.email,
      fullName:
        fullName || metadata.full_name || metadata.name || authUser.full_name || authUser.name,
      avatarUrl: avatarUrl || metadata.avatar_url || metadata.picture || authUser.avatar_url,
    });
    return authUser;
  }

  static async createInAuth({ email, password, fullName }) {
    const authUser = await SupabaseAuthModel.createUser({
      email: email.toLowerCase(),
      password,
      fullName,
    });
    return this.syncAuthUser(authUser, { fullName });
  }

  static async signInWithPassword({ email, password }) {
    const authUser = await SupabaseAuthModel.signInWithPassword({
      email: email.toLowerCase(),
      password,
    });
    return this.syncAuthUser(authUser);
  }

  static getGoogleOAuthUrl(redirectTo) {
    return SupabaseAuthModel.getGoogleOAuthUrl(redirectTo);
  }

  static async exchangeCodeForSession(code) {
    const authUser = await SupabaseAuthModel.exchangeCodeForSession(code);
    return this.syncAuthUser(authUser);
  }

  static async getUserFromToken(accessToken) {
    const authUser = await SupabaseAuthModel.getUserFromToken(accessToken);
    return this.syncAuthUser(authUser);
  }

  static async findById(userId) {
    if (!userId) return null;

    if (this._inMemoryUsers.has(userId)) {
      return this._inMemoryUsers.get(userId);
    }

    if (isUuid(userId)) {
      try {
        const { rows } = await query(
          "SELECT id, email, full_name, avatar_url, created_at FROM public.users WHERE id = $1 LIMIT 1;",
          [userId]
        );
        if (rows?.length) return rows[0];
      } catch (error) {
        console.warn("Lỗi truy vấn users table theo id:", error.message);
      }
    }

    const supabaseUser = await SupabaseAuthModel.findById(userId);
    if (supabaseUser) {
      this.#pruneUserCache();
      this._inMemoryUsers.set(userId, supabaseUser);
      return supabaseUser;
    }

    return null;
  }

  static async findByEmail(email) {
    if (!email) return null;
    const normalizedEmail = email.toLowerCase().trim();

    if (this._inMemoryUsers.has(normalizedEmail)) {
      return this._inMemoryUsers.get(normalizedEmail);
    }

    try {
      const { rows } = await query(
        "SELECT id, email, full_name, avatar_url, created_at FROM public.users WHERE LOWER(email) = $1 LIMIT 1;",
        [normalizedEmail]
      );
      if (rows?.length) return rows[0];
    } catch (error) {
      console.warn("Lỗi truy vấn users table theo email:", error.message);
    }

    const supabaseUser = await SupabaseAuthModel.findByEmail(normalizedEmail);
    if (supabaseUser) {
      this.#pruneUserCache();
      this._inMemoryUsers.set(normalizedEmail, supabaseUser);
      return supabaseUser;
    }

    return null;
  }

  static updatePassword(userId, newPassword) {
    return SupabaseAuthModel.updatePassword(userId, newPassword);
  }

  static signOut() {
    return SupabaseAuthModel.signOut();
  }
}

export default UserModel;
```

- [ ] **Step 2: Update `BE/src/services/auth.service.js`** — add TokenModel import, add toPublicUser mapper import, replace UserModel.toPublicUser calls with toPublicUser(), replace token ops with TokenModel

Replace the import block at the top:
```js
// OLD
import UserModel from "../models/user.model.js";
import OtpModel from "../models/otp.model.js";
import TokenService from "./token.service.js";
import AppError from "../utils/AppError.js";
```
With:
```js
import UserModel from "../models/user.model.js";
import TokenModel from "../models/token.model.js";
import OtpModel from "../models/otp.model.js";
import TokenService from "./token.service.js";
import AppError from "../utils/AppError.js";
import { toPublicUser } from "../utils/mappers/user.mapper.js";
```

Replace `#issueSession`:
```js
// OLD
async #issueSession(publicUser) {
  const accessToken = TokenService.generateAccessToken(publicUser);
  const refreshToken = TokenService.generateRefreshToken();
  await UserModel.updateRefreshToken(publicUser.id, refreshToken);
  return { accessToken, refreshToken };
}
```
```js
// NEW
async #issueSession(publicUser) {
  const accessToken = TokenService.generateAccessToken(publicUser);
  const refreshToken = TokenService.generateRefreshToken();
  await TokenModel.updateRefreshToken(publicUser.id, refreshToken);
  return { accessToken, refreshToken };
}
```

Replace all `UserModel.toPublicUser(` with `toPublicUser(` — there are 6 occurrences:
- `register`: `UserModel.toPublicUser(createdUser)` → `toPublicUser(createdUser)`
- `login`: `UserModel.toPublicUser(authUser)` → `toPublicUser(authUser)`
- `handleGoogleCallback`: `UserModel.toPublicUser(authUser)` → `toPublicUser(authUser)`
- `handleGoogleSession`: `UserModel.toPublicUser(authUser)` → `toPublicUser(authUser)`
- `refreshAccessToken`: `UserModel.toPublicUser(user)` → `toPublicUser(user)`
- `getMe`: `UserModel.toPublicUser(user)` → `toPublicUser(user)`

Replace token ops in `refreshAccessToken`:
```js
// OLD
const user = await UserModel.findByRefreshToken(refreshToken);
// ...
await UserModel.clearRefreshToken(user.id);
// ...
const rotated = await UserModel.rotateRefreshToken(
  user.id,
  refreshToken,
  newRefreshToken
);
```
```js
// NEW
const user = await TokenModel.findByRefreshToken(refreshToken);
// ...
await TokenModel.clearRefreshToken(user.id);
// ...
const rotated = await TokenModel.rotateRefreshToken(
  user.id,
  refreshToken,
  newRefreshToken
);
```

Replace in `getUserByRefreshToken`:
```js
// OLD
return UserModel.findByRefreshToken(refreshToken);
```
```js
// NEW
return TokenModel.findByRefreshToken(refreshToken);
```

Replace in `logout`:
```js
// OLD
await UserModel.clearRefreshToken(userId);
```
```js
// NEW
await TokenModel.clearRefreshToken(userId);
```

- [ ] **Step 3: Update `BE/tests/auth.integration.test.js`** — add TokenModel import and replace 8 occurrences

Add `let TokenModel;` to the state section (near line 22, after the other `let` declarations):
```js
// Add after: let UserModel;
let TokenModel;
```

Add the import in `before()` (after line 122):
```js
// After: ({ default: UserModel } = await import("../src/models/user.model.js"));
({ default: TokenModel } = await import("../src/models/token.model.js"));
```

In `beforeEach()`:
```js
// OLD
if (UserModel?._inMemoryTokens) UserModel._inMemoryTokens.clear();
// NEW
if (TokenModel?._inMemoryTokens) TokenModel._inMemoryTokens.clear();
```

In the RTR test (line ~216):
```js
// OLD
UserModel._inMemoryTokens.get(TEST_USER.id)?.refreshToken ||
// NEW
TokenModel._inMemoryTokens.get(TEST_USER.id)?.refreshToken ||
```

In the RTR test (line ~278):
```js
// OLD
await UserModel.updateRefreshToken(TEST_USER.id, initialRefreshToken);
// NEW
await TokenModel.updateRefreshToken(TEST_USER.id, initialRefreshToken);
```

In the RTR test (lines ~299, ~303):
```js
// OLD
const oldUser = await UserModel.findByRefreshToken(initialRefreshToken);
// ...
const newUser = await UserModel.findByRefreshToken(newRefreshToken);
// NEW
const oldUser = await TokenModel.findByRefreshToken(initialRefreshToken);
// ...
const newUser = await TokenModel.findByRefreshToken(newRefreshToken);
```

In the expired token test (line ~318):
```js
// OLD
UserModel._inMemoryTokens.set(TEST_USER.id, {
// NEW
TokenModel._inMemoryTokens.set(TEST_USER.id, {
```

In the logout test (lines ~472, ~483):
```js
// OLD
await UserModel.updateRefreshToken(TEST_USER.id, userRefreshToken);
// ...
const revokedUser = await UserModel.findByRefreshToken(userRefreshToken);
// NEW
await TokenModel.updateRefreshToken(TEST_USER.id, userRefreshToken);
// ...
const revokedUser = await TokenModel.findByRefreshToken(userRefreshToken);
```

- [ ] **Step 4: Update `BE/tests/auth.refactor.test.js`** — add TokenModel import and replace 7 occurrences

Add `let TokenModel;` to state section (near line 44, after other `let` declarations):
```js
// Add after: let UserModel;
let TokenModel;
```

Add import in `before()` (after line 136):
```js
// After: ({ default: UserModel } = await import("../src/models/user.model.js"));
({ default: TokenModel } = await import("../src/models/token.model.js"));
```

In `beforeEach()` (line 151):
```js
// OLD
if (UserModel?._inMemoryTokens) UserModel._inMemoryTokens.clear();
// NEW
if (TokenModel?._inMemoryTokens) TokenModel._inMemoryTokens.clear();
```

Expired token test (line 361):
```js
// OLD
UserModel._inMemoryTokens.set(TEST_USER.id, {
// NEW
TokenModel._inMemoryTokens.set(TEST_USER.id, {
```

Expired token test (line 375):
```js
// OLD
const user = await UserModel.findByRefreshToken(expiredToken);
// NEW
const user = await TokenModel.findByRefreshToken(expiredToken);
```

DB persist test (lines 395, 404):
```js
// OLD
UserModel._inMemoryTokens.clear();
// ...
const stored = UserModel._inMemoryTokens.get(TEST_USER.id);
// NEW
TokenModel._inMemoryTokens.clear();
// ...
const stored = TokenModel._inMemoryTokens.get(TEST_USER.id);
```

Login persist test (lines 410, 417):
```js
// OLD
UserModel._inMemoryTokens.clear();
// ...
const stored = UserModel._inMemoryTokens.get(TEST_USER.id);
// NEW
TokenModel._inMemoryTokens.clear();
// ...
const stored = TokenModel._inMemoryTokens.get(TEST_USER.id);
```

- [ ] **Step 5: Run tests**

Run: `cd BE && npm test`  
Expected: 25/25 passing

- [ ] **Step 6: Commit**

```bash
git add BE/src/models/user.model.js BE/src/services/auth.service.js BE/tests/auth.integration.test.js BE/tests/auth.refactor.test.js
git commit -m "refactor(auth): move token ops to TokenModel, move toPublicUser to mapper"
```

---

## Task 4: Strip `toPublicX` from group/member/invitation models and update their services

**Files:**
- Modify: `BE/src/models/group.model.js`
- Modify: `BE/src/models/group-member.model.js`
- Modify: `BE/src/models/group-invitation.model.js`
- Modify: `BE/src/services/group.service.js`
- Modify: `BE/src/services/group-member.service.js`
- Modify: `BE/src/services/group-invitation.service.js`

- [ ] **Step 1: Remove `toPublicGroup` from `BE/src/models/group.model.js`**

Delete the entire `static toPublicGroup(group) { ... }` method (lines 17–55 in the current file). This is the block from `static toPublicGroup(group) {` through its closing `}`.

- [ ] **Step 2: Update `BE/src/services/group.service.js`** — import mapper, replace 5 calls

Add to imports:
```js
import { toPublicGroup } from "../utils/mappers/group.mapper.js";
```

Replace all `GroupModel.toPublicGroup(` with `toPublicGroup(`:
- In `createGroup`: `GroupModel.toPublicGroup({ ...created, ... })` → `toPublicGroup({ ...created, ... })`
- In `getUserGroups`: `list.map((g) => GroupModel.toPublicGroup(g))` → `list.map((g) => toPublicGroup(g))`
- In `getGroupDetail`: `GroupModel.toPublicGroup(detail)` → `toPublicGroup(detail)`
- In `updateGroup`: `GroupModel.toPublicGroup(updated)` → `toPublicGroup(updated)`

- [ ] **Step 3: Remove `toPublicMember` from `BE/src/models/group-member.model.js`**

Delete the entire `static toPublicMember(member) { ... }` method (lines 19–36).

- [ ] **Step 4: Update `BE/src/services/group-member.service.js`** — import mapper, replace 2 calls

Add to imports:
```js
import { toPublicMember } from "../utils/mappers/group-member.mapper.js";
```

Replace:
- `GroupMemberModel.toPublicMember(m)` → `toPublicMember(m)` (in `getMembers`)
- `GroupMemberModel.toPublicMember({ ...newMember, ... })` → `toPublicMember({ ...newMember, ... })` (in `addMember`)

- [ ] **Step 5: Remove `toPublicInvitation` from `BE/src/models/group-invitation.model.js`**

Delete the entire `static toPublicInvitation(inv) { ... }` method (lines 20–48).

- [ ] **Step 6: Update `BE/src/services/group-invitation.service.js`** — import 3 mappers, replace calls

Add to imports:
```js
import { toPublicInvitation } from "../utils/mappers/invitation.mapper.js";
import { toPublicGroup } from "../utils/mappers/group.mapper.js";
import { toPublicMember } from "../utils/mappers/group-member.mapper.js";
```

Replace:
- `GroupInvitationModel.toPublicInvitation({ ...invitation, ... })` → `toPublicInvitation({ ...invitation, ... })` (in `createInvitation`)
- `GroupInvitationModel.toPublicInvitation(item)` in `list.map(...)` → `toPublicInvitation(item)` (in `getPendingInvitations`)
- `GroupMemberModel.toPublicMember({ ...newMember, ... })` → `toPublicMember({ ...newMember, ... })` (in `acceptInvitation`)
- `GroupModel.toPublicGroup(group)` → `toPublicGroup(group)` (in `acceptInvitation`)

- [ ] **Step 7: Run tests**

Run: `cd BE && npm test`  
Expected: 25/25 passing

- [ ] **Step 8: Commit**

```bash
git add BE/src/models/group.model.js BE/src/models/group-member.model.js BE/src/models/group-invitation.model.js BE/src/services/group.service.js BE/src/services/group-member.service.js BE/src/services/group-invitation.service.js
git commit -m "refactor(groups): move toPublicGroup/Member/Invitation to mappers, update services"
```

---

## Task 5: Strip `toPublicX` from session/availability models and update their services

**Files:**
- Modify: `BE/src/models/session.model.js`
- Modify: `BE/src/models/availability.model.js`
- Modify: `BE/src/services/session.service.js`
- Modify: `BE/src/services/availability.service.js`

These are mock in-memory models. The raw data in their stores is already camelCase, so extracting the mapper doesn't change the data shape — `toPublicSession` handles both snake_case (future DB) and camelCase (current mock) via `s.group_id || s.groupId` fallbacks.

- [ ] **Step 1: Update `BE/src/models/session.model.js`** — remove `toPublicSession`, change internal calls to return raw

Delete the `static toPublicSession(s) { ... }` method.

In `findAll`: change return statement:
```js
// OLD
return results.map(this.toPublicSession);
// NEW
return results;
```

In `findById` (two return sites):
```js
// OLD
if (session) return this.toPublicSession(session);
// ...
if (s.slug === id) return this.toPublicSession(s);
// NEW
if (session) return session;
// ...
if (s.slug === id) return s;
```

In `create`:
```js
// OLD
return this.toPublicSession(session);
// NEW
return session;
```

- [ ] **Step 2: Update `BE/src/models/availability.model.js`** — remove `toPublicAvailability`, change internal calls to return raw

Delete the `static toPublicAvailability(a) { ... }` method.

In `findAll`:
```js
// OLD
return list.map(this.toPublicAvailability);
// NEW
return list;
```

In `findById`:
```js
// OLD
return item ? this.toPublicAvailability(item) : null;
// NEW
return item || null;
```

In `create`:
```js
// OLD
return this.toPublicAvailability(record);
// NEW
return record;
```

In `update`:
```js
// OLD
return this.toPublicAvailability(updated);
// NEW
return updated;
```

- [ ] **Step 3: Update `BE/src/services/session.service.js`** — import mapper, apply to all return values

Add to imports:
```js
import { toPublicSession } from "../utils/mappers/session.mapper.js";
```

In `getSessions`:
```js
// OLD
return await SessionModel.findAll(filters);
// NEW
return (await SessionModel.findAll(filters)).map(toPublicSession);
```

In `getSessionById` (after the null check):
```js
// OLD
return session;
// NEW
return toPublicSession(session);
```

In `createSession`:
```js
// OLD
return await SessionModel.create(sessionData);
// NEW
return toPublicSession(await SessionModel.create(sessionData));
```

`deleteSession` returns `{ id, deleted: true }` — no change needed.

- [ ] **Step 4: Update `BE/src/services/availability.service.js`** — import mapper, apply to all return values

Add to imports:
```js
import { toPublicAvailability } from "../utils/mappers/availability.mapper.js";
```

In `getAvailabilities`:
```js
// OLD
return await AvailabilityModel.findAll(filters);
// NEW
return (await AvailabilityModel.findAll(filters)).map(toPublicAvailability);
```

In `getAvailabilityById` (after the null check):
```js
// OLD
return record;
// NEW
return toPublicAvailability(record);
```

In `createAvailability`:
```js
// OLD
return await AvailabilityModel.create(data);
// NEW
return toPublicAvailability(await AvailabilityModel.create(data));
```

In `updateAvailability` (after the null check):
```js
// OLD
return updated;
// NEW
return toPublicAvailability(updated);
```

- [ ] **Step 5: Run tests**

Run: `cd BE && npm test`  
Expected: 25/25 passing

- [ ] **Step 6: Commit**

```bash
git add BE/src/models/session.model.js BE/src/models/availability.model.js BE/src/services/session.service.js BE/src/services/availability.service.js
git commit -m "refactor(session/availability): move toPublicX to mappers, update services"
```

---

## Task 6: Final verification

- [ ] **Step 1: Confirm no model still contains a `toPublicX` method**

Run (PowerShell):
```powershell
Select-String -Path "BE/src/models/*.js" -Pattern "toPublic"
```
Expected: no matches

- [ ] **Step 2: Confirm all mapper imports resolve**

Run (PowerShell):
```powershell
Select-String -Path "BE/src/services/*.js" -Pattern "from.*mappers"
```
Expected: one match per service file that imports a mapper

- [ ] **Step 3: Run full test suite one final time**

Run: `cd BE && npm test`  
Expected: 25/25 passing

- [ ] **Step 4: Commit if any cleanup was needed, otherwise done**

No changes expected. All tasks were committed incrementally.

---

## Completion Checklist

- [ ] All `toPublicX` moved to `src/utils/mappers/`
- [ ] `token.model.js` extracted from `user.model.js`
- [ ] `auth.service.js` uses `TokenModel` for all token ops
- [ ] All services import mappers from `utils/mappers/`
- [ ] No model file contains `toPublicX`
- [ ] 25/25 auth integration tests pass
- [ ] No import is broken
