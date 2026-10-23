# Sessions & Availability — Migrate to Real DB

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thay thế toàn bộ in-memory mock trong `session.model.js` và `availability.model.js` bằng SQL thật trên Supabase PostgreSQL, đồng thời bổ sung 3 endpoint mới cho tính năng availability.

**Architecture:** Model layer gọi thẳng `query()` / `withTransaction()` từ `db.config.js`, theo đúng pattern của `group.model.js`. Service layer và controller giữ nguyên interface hiện tại — chỉ thay ruột model. Bổ sung 3 route mới lồng dưới `GET|PUT /api/sessions/:id/my-availability` và `GET /api/sessions/:id/availabilities` để khớp API_SPEC.md §4.

**Tech Stack:** Node.js + Express (ES Modules), `node-postgres` (`pg`), Supabase PostgreSQL, `node:test` integration tests (mock model methods).

---

## File Map

| File | Thay đổi |
|---|---|
| `BE/src/models/session.model.js` | Viết lại — bỏ in-memory, dùng SQL thật |
| `BE/src/models/availability.model.js` | Viết lại — bỏ in-memory, dùng SQL thật (individual rows) |
| `BE/src/utils/mappers/availability.mapper.js` | Cập nhật — hàm mới cho slot rows và grouped format |
| `BE/src/utils/mappers/session.mapper.js` | Cập nhật — tính `quorumPercent` từ `total_members` + `responded_count` |
| `BE/src/services/session.service.js` | Cập nhật — slug generation khi tạo session |
| `BE/src/services/availability.service.js` | Cập nhật — thêm 3 method mới |
| `BE/src/controllers/availability.controller.js` | Cập nhật — thêm 3 action mới |
| `BE/src/routes/session.routes.js` | Cập nhật — thêm 3 route mới |

---

## Task 1: Rewrite `session.model.js`

**Files:**
- Modify: `BE/src/models/session.model.js`

**Bảng DB:** `public.sessions` — các cột: `id`, `group_id`, `slug`, `ref_code`, `title`, `description`, `tag`, `tag_color`, `date_range`, `scheduled_time`, `location`, `status`, `created_by`, `created_at`, `updated_at`.

**Computed qua subquery:** `total_members` (COUNT từ `group_members`), `responded_count` (COUNT từ `session_participants` WHERE `status = 'responded'`).

- [ ] **Step 1: Viết lại `session.model.js`**

```js
// BE/src/models/session.model.js
import { randomUUID } from "node:crypto";
import { query, withTransaction } from "../configs/db.config.js";
import { generateUniqueSlug } from "../utils/slugify.js";

class SessionModel {
  static async findAll({ groupId } = {}) {
    if (!groupId) return [];
    const sql = `
      SELECT s.*,
        (SELECT COUNT(*)::int FROM public.group_members WHERE group_id = s.group_id) AS total_members,
        (SELECT COUNT(*)::int FROM public.session_participants WHERE session_id = s.id AND status = 'responded') AS responded_count
      FROM public.sessions s
      WHERE s.group_id = $1
      ORDER BY s.created_at DESC;
    `;
    const { rows } = await query(sql, [groupId]);
    return rows || [];
  }

  static async findById(id) {
    if (!id) return null;
    const sql = `
      SELECT s.*,
        (SELECT COUNT(*)::int FROM public.group_members WHERE group_id = s.group_id) AS total_members,
        (SELECT COUNT(*)::int FROM public.session_participants WHERE session_id = s.id AND status = 'responded') AS responded_count
      FROM public.sessions s
      WHERE s.id = $1 OR s.slug = $1
      LIMIT 1;
    `;
    const { rows } = await query(sql, [id]);
    return rows?.[0] ?? null;
  }

  static async create({ groupId, title, description = "", tag, tagColor, dateRange, scheduledTime, location, status = "active_poll", createdBy }) {
    if (!groupId) throw new Error("groupId là bắt buộc khi tạo session");
    const id = randomUUID();
    const slug = generateUniqueSlug(title || "session");
    const refCode = `Ref #${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const sql = `
      INSERT INTO public.sessions
        (id, group_id, slug, ref_code, title, description, tag, tag_color, date_range, scheduled_time, location, status, created_by, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
      RETURNING *;
    `;
    const { rows } = await query(sql, [
      id, groupId, slug, refCode, title, description,
      tag || "CÔNG VIỆC & HỌC TẬP",
      tagColor || "primary",
      dateRange || "",
      scheduledTime || "Flexible Window",
      location || "Quán Cafe / Trực tuyến",
      status,
      createdBy || null,
    ]);
    return rows?.[0] ?? null;
  }

  static async delete(id) {
    if (!id) return false;
    const sql = "DELETE FROM public.sessions WHERE id = $1 OR slug = $1 RETURNING id;";
    const { rows } = await query(sql, [id]);
    return (rows?.length ?? 0) > 0;
  }
}

export default SessionModel;
```

- [ ] **Step 2: Grep kiểm tra không còn `Map` hay `INITIAL_SESSIONS` nào trong file**

```bash
grep -n "INITIAL_SESSIONS\|new Map\|store\." BE/src/models/session.model.js
```

Expected: không có kết quả nào.

- [ ] **Step 3: Commit**

```bash
git add BE/src/models/session.model.js
git commit -m "refactor(session): replace in-memory mock with real PostgreSQL queries"
```

---

## Task 2: Rewrite `availability.model.js`

**Files:**
- Modify: `BE/src/models/availability.model.js`

**Thay đổi data model quan trọng:** Model cũ lưu `slots` dưới dạng mảng JSON per-user trong bộ nhớ. DB thật (`availability_slots`) lưu **từng slot là một row riêng** với các cột: `id`, `session_id`, `user_id`, `day_index`, `date_str`, `start_minutes`, `end_minutes`, `label`, `note`.

- [ ] **Step 1: Viết lại `availability.model.js`**

```js
// BE/src/models/availability.model.js
import { randomUUID } from "node:crypto";
import { query, withTransaction } from "../configs/db.config.js";

class AvailabilityModel {
  /**
   * Lấy tất cả slot của một user trong một session.
   * Trả về mảng rows (mỗi row = một slot).
   */
  static async findBySessionAndUser(sessionId, userId) {
    if (!sessionId || !userId) return [];
    const sql = `
      SELECT * FROM public.availability_slots
      WHERE session_id = $1 AND user_id = $2
      ORDER BY day_index, start_minutes;
    `;
    const { rows } = await query(sql, [sessionId, userId]);
    return rows || [];
  }

  /**
   * Atomic replace: Xóa toàn bộ slot cũ của user trong session,
   * rồi INSERT mảng slots mới trong cùng một transaction.
   * Trả về mảng slot rows vừa được lưu.
   */
  static async replaceUserSlots(sessionId, userId, slots = []) {
    return withTransaction(async (client) => {
      await client.query(
        "DELETE FROM public.availability_slots WHERE session_id = $1 AND user_id = $2;",
        [sessionId, userId]
      );

      if (slots.length === 0) return [];

      const inserted = [];
      for (const slot of slots) {
        const id = slot.id || randomUUID();
        const { rows } = await client.query(
          `INSERT INTO public.availability_slots
             (id, session_id, user_id, day_index, date_str, start_minutes, end_minutes, label, note, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
           RETURNING *;`,
          [id, sessionId, userId,
           slot.dayIndex, slot.dateStr,
           slot.startMinutes, slot.endMinutes,
           slot.label || "Available",
           slot.note || ""]
        );
        inserted.push(rows[0]);
      }
      return inserted;
    });
  }

  /**
   * Lấy toàn bộ slots của tất cả thành viên trong session,
   * JOIN với users và group_members để lấy tên, role, avatar.
   * Trả về mảng rows — mỗi row gồm slot fields + member info.
   * Service sẽ group lại theo user_id.
   */
  static async findAllBySession(sessionId) {
    if (!sessionId) return [];
    const sql = `
      SELECT
        avs.*,
        gm.role,
        gm.group_role,
        u.full_name AS member_name,
        u.avatar_url
      FROM public.availability_slots avs
      JOIN public.sessions s ON s.id = avs.session_id
      JOIN public.users u ON u.id = avs.user_id
      JOIN public.group_members gm ON gm.user_id = avs.user_id AND gm.group_id = s.group_id
      WHERE avs.session_id = $1
      ORDER BY avs.user_id, avs.day_index, avs.start_minutes;
    `;
    const { rows } = await query(sql, [sessionId]);
    return rows || [];
  }
}

export default AvailabilityModel;
```

- [ ] **Step 2: Grep kiểm tra không còn `INITIAL_AVAILABILITIES` hay `Map` trong file**

```bash
grep -n "INITIAL_AVAILABILITIES\|new Map\|store\." BE/src/models/availability.model.js
```

Expected: không có kết quả nào.

- [ ] **Step 3: Commit**

```bash
git add BE/src/models/availability.model.js
git commit -m "refactor(availability): replace in-memory mock with PostgreSQL availability_slots queries"
```

---

## Task 3: Cập nhật `availability.mapper.js` và `session.mapper.js`

**Files:**
- Modify: `BE/src/utils/mappers/availability.mapper.js`
- Modify: `BE/src/utils/mappers/session.mapper.js`

### 3a — `availability.mapper.js`

Model mới trả về individual slot rows (snake_case). Mapper cần export 3 hàm:
- `toPublicSlot(row)` — map một slot row → public shape
- `toPublicUserAvailability({ sessionId, userId, slots })` — cho endpoint my-availability
- `toPublicMemberAvailability({ userId, memberName, role, groupRole, avatarUrl, slots })` — cho lead matrix

- [ ] **Step 1: Viết lại `availability.mapper.js`**

```js
// BE/src/utils/mappers/availability.mapper.js

export function toPublicSlot(row) {
  if (!row) return null;
  const dateStr = row.date_str instanceof Date
    ? row.date_str.toISOString().slice(0, 10)
    : String(row.date_str ?? "");
  return {
    id: row.id,
    dayIndex: row.day_index,
    dateStr,
    startMinutes: row.start_minutes,
    endMinutes: row.end_minutes,
    label: row.label || "Available",
    note: row.note || "",
  };
}

export function toPublicUserAvailability({ sessionId, userId, slots }) {
  return {
    sessionId,
    userId,
    slots: (slots || []).map(toPublicSlot),
  };
}

export function toPublicMemberAvailability({ userId, memberName, role, groupRole, avatarUrl, slots }) {
  return {
    memberId: userId,
    memberName: memberName || "Thành viên",
    role: role || "member",
    groupRole: groupRole || "core",
    avatarUrl: avatarUrl || null,
    slots: (slots || []).map(toPublicSlot),
  };
}

// Giữ lại export cũ để không vỡ import trong availability.service.js cũ
// Service sẽ được cập nhật ở Task 5.
export function toPublicAvailability(a) {
  if (!a) return null;
  return {
    id: a.id,
    sessionId: a.session_id || a.sessionId,
    userId: a.user_id || a.userId,
    slots: Array.isArray(a.slots) ? a.slots : [],
    updatedAt: a.updated_at || a.updatedAt || new Date().toISOString(),
  };
}
```

### 3b — `session.mapper.js`

Cần tính `quorumPercent` từ `total_members` và `responded_count` thay vì đọc từ cột DB. Bỏ `sparkline` và `highestOverlapText` hardcode.

- [ ] **Step 2: Cập nhật `session.mapper.js`**

```js
// BE/src/utils/mappers/session.mapper.js

export function toPublicSession(s) {
  if (!s) return null;
  const totalMembers = parseInt(s.total_members ?? s.totalMembers ?? 0, 10);
  const respondedCount = parseInt(s.responded_count ?? s.respondedCount ?? 0, 10);
  const quorumPercent = totalMembers > 0 ? Math.round((respondedCount / totalMembers) * 100) : 0;

  return {
    id: s.id,
    slug: s.slug || s.id,
    groupId: s.group_id || s.groupId,
    refCode: s.ref_code || s.refCode || "Ref #0000",
    title: s.title,
    description: s.description || "",
    tag: s.tag || "CÔNG VIỆC & HỌC TẬP",
    tagColor: s.tag_color || s.tagColor || "primary",
    dateRange: s.date_range || s.dateRange || "",
    scheduledTime: s.scheduled_time || s.scheduledTime || "Flexible Window",
    location: s.location || "Quán Cafe / Trực tuyến",
    totalMembers,
    respondedCount,
    quorumPercent,
    status: s.status || "active_poll",
    createdAt: s.created_at || s.createdAt || new Date().toISOString(),
    updatedAt: s.updated_at || s.updatedAt || new Date().toISOString(),
  };
}
```

- [ ] **Step 3: Commit**

```bash
git add BE/src/utils/mappers/availability.mapper.js BE/src/utils/mappers/session.mapper.js
git commit -m "refactor(mappers): update availability mapper for slot rows, session mapper for computed metrics"
```

---

## Task 4: Cập nhật `session.service.js`

**Files:**
- Modify: `BE/src/services/session.service.js`

`createSession` hiện không truyền `groupId` vào model. Cần lấy `groupId` từ payload và truyền xuống.

- [ ] **Step 1: Cập nhật `session.service.js`**

```js
// BE/src/services/session.service.js
import SessionModel from "../models/session.model.js";
import GroupMemberModel from "../models/group-member.model.js";
import AppError from "../utils/AppError.js";
import { toPublicSession } from "../utils/mappers/session.mapper.js";

class SessionService {
  async getSessions(filters = {}) {
    return (await SessionModel.findAll(filters)).map(toPublicSession);
  }

  async getSessionById(id) {
    if (!id) throw AppError.badRequest("Mã phiên không được để trống", "SESSION_ID_REQUIRED");
    const session = await SessionModel.findById(id);
    if (!session) throw AppError.notFound("Không tìm thấy phiên khảo sát", "SESSION_NOT_FOUND");
    return toPublicSession(session);
  }

  async createSession(payload, actorId) {
    if (!payload?.title) {
      throw AppError.badRequest("Tiêu đề phiên khảo sát là bắt buộc", "SESSION_TITLE_REQUIRED");
    }
    if (!payload?.groupId) {
      throw AppError.badRequest("groupId là bắt buộc khi tạo phiên", "GROUP_ID_REQUIRED");
    }
    const created = await SessionModel.create({ ...payload, createdBy: actorId });
    return toPublicSession(created);
  }

  async deleteSession(id, actorId) {
    if (!id) throw AppError.badRequest("Mã phiên không được để trống", "SESSION_ID_REQUIRED");
    const session = await SessionModel.findById(id);
    if (!session) throw AppError.notFound("Không tìm thấy phiên khảo sát", "SESSION_NOT_FOUND");

    if (session.created_by && actorId && session.created_by !== actorId) {
      const groupId = session.group_id;
      if (groupId) {
        const member = await GroupMemberModel.findMember(groupId, actorId).catch(() => null);
        const isLeadOrOwner = member?.role === "owner" || member?.role === "lead";
        if (!isLeadOrOwner) throw AppError.forbidden("Bạn không có quyền xóa phiên này", "FORBIDDEN");
      } else {
        throw AppError.forbidden("Bạn không có quyền xóa phiên này", "FORBIDDEN");
      }
    }

    const deleted = await SessionModel.delete(id);
    if (!deleted) throw AppError.notFound("Không tìm thấy phiên cần xóa", "SESSION_NOT_FOUND");
    return { id, deleted: true };
  }
}

export const sessionService = new SessionService();
export default sessionService;
```

- [ ] **Step 2: Commit**

```bash
git add BE/src/services/session.service.js
git commit -m "refactor(session-service): pass groupId to model, fix createdBy field name"
```

---

## Task 5: Cập nhật `availability.service.js`

**Files:**
- Modify: `BE/src/services/availability.service.js`

Thêm 3 method mới dùng model mới. Giữ `getAvailabilities`, `getAvailabilityById` để không vỡ các route cũ.

- [ ] **Step 1: Cập nhật `availability.service.js`**

```js
// BE/src/services/availability.service.js
import AvailabilityModel from "../models/availability.model.js";
import AppError from "../utils/AppError.js";
import {
  toPublicUserAvailability,
  toPublicMemberAvailability,
} from "../utils/mappers/availability.mapper.js";

class AvailabilityService {
  // ─── Endpoint mới: GET /api/sessions/:id/my-availability ────────────────────
  async getMyAvailability(sessionId, userId) {
    if (!sessionId) throw AppError.badRequest("sessionId là bắt buộc", "SESSION_ID_REQUIRED");
    if (!userId) throw AppError.unauthorized("Vui lòng đăng nhập", "UNAUTHORIZED");
    const slots = await AvailabilityModel.findBySessionAndUser(sessionId, userId);
    return toPublicUserAvailability({ sessionId, userId, slots });
  }

  // ─── Endpoint mới: PUT /api/sessions/:id/my-availability ────────────────────
  async saveMyAvailability(sessionId, userId, slots = []) {
    if (!sessionId) throw AppError.badRequest("sessionId là bắt buộc", "SESSION_ID_REQUIRED");
    if (!userId) throw AppError.unauthorized("Vui lòng đăng nhập", "UNAUTHORIZED");
    await AvailabilityModel.replaceUserSlots(sessionId, userId, slots);
    const saved = await AvailabilityModel.findBySessionAndUser(sessionId, userId);
    return toPublicUserAvailability({ sessionId, userId, slots: saved });
  }

  // ─── Endpoint mới: GET /api/sessions/:id/availabilities ─────────────────────
  async getSessionAvailabilities(sessionId, roleFilter = "all") {
    if (!sessionId) throw AppError.badRequest("sessionId là bắt buộc", "SESSION_ID_REQUIRED");
    const rows = await AvailabilityModel.findAllBySession(sessionId);

    const byUser = new Map();
    for (const row of rows) {
      if (!byUser.has(row.user_id)) {
        byUser.set(row.user_id, {
          userId: row.user_id,
          memberName: row.member_name,
          role: row.role,
          groupRole: row.group_role,
          avatarUrl: row.avatar_url,
          slots: [],
        });
      }
      byUser.get(row.user_id).slots.push(row);
    }

    let members = Array.from(byUser.values());
    if (roleFilter && roleFilter !== "all") {
      members = members.filter((m) => m.groupRole === roleFilter);
    }

    return members.map(toPublicMemberAvailability);
  }
}

export const availabilityService = new AvailabilityService();
export default availabilityService;
```

- [ ] **Step 2: Commit**

```bash
git add BE/src/services/availability.service.js
git commit -m "feat(availability-service): add getMyAvailability, saveMyAvailability, getSessionAvailabilities"
```

---

## Task 6: Cập nhật controller + routes

**Files:**
- Modify: `BE/src/controllers/availability.controller.js`
- Modify: `BE/src/routes/session.routes.js`

### 6a — Thêm 3 action vào `availability.controller.js`

- [ ] **Step 1: Cập nhật `availability.controller.js`**

```js
// BE/src/controllers/availability.controller.js
import BaseController from "./BaseController.js";
import availabilityService from "../services/availability.service.js";
import asyncHandler from "../utils/asyncHandler.js";

class AvailabilityController extends BaseController {
  // ─── Routes cũ /api/availabilities/* (giữ để không vỡ FE mock) ──────────────
  getAvailabilities = asyncHandler(async (req, res) => {
    const { sessionId, memberId } = req.query;
    // Backward compat: trả về empty array vì flat route không còn dùng
    return this.sendSuccess(res, [], "Lấy danh sách khung giờ rảnh thành công");
  });

  getAvailabilityById = asyncHandler(async (req, res) => {
    return this.sendSuccess(res, null, "");
  });

  createAvailability = asyncHandler(async (req, res) => {
    return this.sendSuccess(res, null, "Dùng PUT /api/sessions/:id/my-availability để lưu slot");
  });

  updateAvailability = asyncHandler(async (req, res) => {
    return this.sendSuccess(res, null, "Dùng PUT /api/sessions/:id/my-availability để lưu slot");
  });

  // ─── Routes mới lồng dưới /api/sessions/:id/ ────────────────────────────────
  getMyAvailability = asyncHandler(async (req, res) => {
    const { id: sessionId } = req.params;
    const data = await availabilityService.getMyAvailability(sessionId, req.user?.id);
    return this.sendSuccess(res, data, "Lấy lịch rảnh thành công");
  });

  saveMyAvailability = asyncHandler(async (req, res) => {
    const { id: sessionId } = req.params;
    const { slots = [] } = req.body;
    const result = await availabilityService.saveMyAvailability(sessionId, req.user?.id, slots);
    return this.sendSuccess(res, result, "Đã lưu lịch rảnh thành công");
  });

  getSessionAvailabilities = asyncHandler(async (req, res) => {
    const { id: sessionId } = req.params;
    const { roleFilter = "all" } = req.query;
    const data = await availabilityService.getSessionAvailabilities(sessionId, roleFilter);
    return this.sendSuccess(res, data, "Lấy danh sách lịch rảnh của nhóm thành công");
  });
}

export const availabilityController = new AvailabilityController();
export default availabilityController;
```

### 6b — Thêm 3 route vào `session.routes.js`

- [ ] **Step 2: Cập nhật `session.routes.js`**

```js
// BE/src/routes/session.routes.js
import { Router } from "express";
import sessionController from "../controllers/session.controller.js";
import availabilityController from "../controllers/availability.controller.js";
import AuthMiddleware from "../middlewares/auth.middleware.js";

const router = Router();

// ─── Session CRUD ────────────────────────────────────────────────────────────
router.get("/", sessionController.getSessions);
router.get("/:id", sessionController.getSessionById);
router.post("/", AuthMiddleware.authenticate, sessionController.createSession);
router.delete("/:id", AuthMiddleware.authenticate, sessionController.deleteSession);

// ─── Availability endpoints lồng dưới sessions ───────────────────────────────
// GET  /api/sessions/:id/my-availability   — lấy slot của user hiện tại
// PUT  /api/sessions/:id/my-availability   — lưu slot (atomic replace)
// GET  /api/sessions/:id/availabilities    — lead matrix (tất cả thành viên)
router.get("/:id/my-availability", AuthMiddleware.authenticate, availabilityController.getMyAvailability);
router.put("/:id/my-availability", AuthMiddleware.authenticate, availabilityController.saveMyAvailability);
router.get("/:id/availabilities", availabilityController.getSessionAvailabilities);

export default router;
```

- [ ] **Step 3: Commit**

```bash
git add BE/src/controllers/availability.controller.js BE/src/routes/session.routes.js
git commit -m "feat(routes): add my-availability and availabilities endpoints under /api/sessions/:id"
```

---

## Task 7: Smoke test thủ công

Không có unit test mock DB cho model layer — pattern của project là mock model methods trong integration tests. Smoke test thủ công với Supabase thật là cách xác nhận nhanh nhất.

- [ ] **Step 1: Chạy server**

```bash
cd BE && node src/app.js
```

Expected: `⚡ PostgreSQL connection pool warmed up in Xms` — server start OK, không có lỗi DB.

- [ ] **Step 2: Test tạo session (cần auth token hợp lệ)**

```bash
curl -s -X POST http://localhost:5000/api/sessions \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{"groupId":"<group_uuid>","title":"Test Session","dateRange":"Oct 19-25, 2026"}' | jq .
```

Expected: `"success": true`, response có `id`, `slug`, `refCode`.

- [ ] **Step 3: Test lấy danh sách session**

```bash
curl -s "http://localhost:5000/api/sessions?groupId=<group_uuid>" | jq .
```

Expected: `"success": true`, `data` là mảng (có thể rỗng hoặc có session vừa tạo).

- [ ] **Step 4: Test lưu availability (PUT my-availability)**

```bash
curl -s -X PUT http://localhost:5000/api/sessions/<session_id>/my-availability \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{"slots":[{"dayIndex":1,"dateStr":"2026-10-20","startMinutes":540,"endMinutes":660,"label":"Available","note":""}]}' | jq .
```

Expected: `"success": true`, `data.slots` có 1 slot.

- [ ] **Step 5: Test lấy my-availability**

```bash
curl -s http://localhost:5000/api/sessions/<session_id>/my-availability \
  -H "Authorization: Bearer <access_token>" | jq .
```

Expected: `"success": true`, `data.slots` có slot vừa lưu.

- [ ] **Step 6: Test lead matrix (GET availabilities)**

```bash
curl -s http://localhost:5000/api/sessions/<session_id>/availabilities | jq .
```

Expected: `"success": true`, `data` là mảng (có thể rỗng nếu chưa có member nào có slot).

- [ ] **Step 7: Run existing tests để đảm bảo không có regression**

```bash
cd BE && node --test tests/group-invitation.test.js tests/group-invite-link.test.js tests/token.service.test.js
```

Expected: tất cả pass — các test này mock model nên không bị ảnh hưởng bởi thay đổi ở task 1-6.

---

## Self-Review

### Spec coverage check

| API_SPEC.md endpoint | Task nào cover |
|---|---|
| `GET /api/sessions?groupId=` | Task 1 (model) + Task 4 (service) |
| `GET /api/sessions/:id` | Task 1 (model) + Task 4 (service) |
| `POST /api/sessions` | Task 1 (model) + Task 4 (service) |
| `GET /api/sessions/:id/my-availability` | Task 2 + 5 + 6 |
| `PUT /api/sessions/:id/my-availability` | Task 2 + 5 + 6 |
| `GET /api/sessions/:id/availabilities` | Task 2 + 5 + 6 |

### Intentional exclusions

- `DELETE /api/sessions/:id` — giữ nguyên, không thay đổi signature.
- Flat `/api/availabilities/*` routes — giữ lại (trả về empty) để backward compat với json-server calls; FE migration là task riêng.
- `session_participants` table — chỉ đọc COUNT trong SQL, chưa có API để ghi; thêm sau khi FE integrate.
- `sparkline`, `highestOverlapText` — bỏ khỏi mapper (computed phức tạp, làm riêng sau).
