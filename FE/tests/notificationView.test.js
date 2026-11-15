import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { getNotificationView } from "../src/utils/notificationView.js";

const keyExists = (lang, key) =>
  typeof key.split(".").reduce((node, part) => node?.[part], JSON.parse(readFileSync(new URL(`../src/locales/${lang}/translation.json`, import.meta.url), "utf8"))) === "string";

test("reminder: câu 'ngày mai là ngày cuối' với tên lịch và nhóm", () => {
  const view = getNotificationView({ id: "reminder:s1", type: "reminder", sessionTitle: "Họp tuần", groupName: "Nhóm A", endDate: "2026-11-16" });
  assert.equal(view.textKey, "notifications.reminder");
  assert.deepEqual(view.params, { title: "Họp tuần", group: "Nhóm A" });
  assert.equal(view.icon, "AlarmClock");
});

test("closed: câu 'đã đóng vì quá hạn'", () => {
  const view = getNotificationView({ id: "closed:s1", type: "closed", sessionTitle: "Họp tuần", groupName: "Nhóm A" });
  assert.equal(view.textKey, "notifications.closed");
  assert.deepEqual(view.params, { title: "Họp tuần", group: "Nhóm A" });
});

test("loại cũ giữ nguyên: invite có gợi ý, finalized dùng session/group", () => {
  const invite = getNotificationView({ type: "invite", groupName: "G" });
  assert.equal(invite.textKey, "notifications.invite");
  assert.equal(invite.hintKey, "notifications.inviteHint");
  const finalized = getNotificationView({ type: "finalized", sessionTitle: "S", groupName: "G" });
  assert.deepEqual(finalized.params, { session: "S", group: "G" });
});

test("loại lạ hoặc thiếu item → null (UI bỏ qua, không hiện sai câu)", () => {
  assert.equal(getNotificationView({ type: "something-new" }), null);
  assert.equal(getNotificationView(undefined), null);
});

test("mọi key i18n của thông báo tồn tại ở cả vi và en", () => {
  for (const type of ["invite", "finalized", "reminder", "closed"]) {
    const view = getNotificationView({ type });
    for (const lang of ["vi", "en"]) {
      assert.ok(keyExists(lang, view.textKey), `${lang}:${view.textKey}`);
      if (view.hintKey) assert.ok(keyExists(lang, view.hintKey), `${lang}:${view.hintKey}`);
    }
  }
});
