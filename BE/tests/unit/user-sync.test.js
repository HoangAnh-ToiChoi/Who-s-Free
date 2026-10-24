import test from "node:test";
import assert from "node:assert/strict";
import UserModel from "../../src/models/user.model.js";

const original = UserModel.upsertToDatabase;

test.afterEach(() => {
  UserModel.upsertToDatabase = original;
});

test("Google trả về id Auth khác với tài khoản email đã có: dùng id của tài khoản cũ", async () => {
  UserModel.upsertToDatabase = async () => ({ id: "old-email-account-id", email: "a@x.com" });

  const synced = await UserModel.syncAuthUser({ id: "new-google-auth-id", email: "a@x.com" });

  assert.equal(synced.id, "old-email-account-id");
  assert.equal(synced.email, "a@x.com");
});

test("cùng id thì giữ nguyên", async () => {
  UserModel.upsertToDatabase = async ({ id }) => ({ id, email: "a@x.com" });

  const authUser = { id: "same-id", email: "a@x.com" };
  assert.equal((await UserModel.syncAuthUser(authUser)).id, "same-id");
});
