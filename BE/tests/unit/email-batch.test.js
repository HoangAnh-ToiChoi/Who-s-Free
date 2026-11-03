import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";
import { deliverBatch } from "../../src/services/email-delivery.service.js";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

const brevo = { provider: "brevo", apiKey: "k", senderEmail: "noreply@example.com", senderName: "Who's Free" };
const recipients = (n) => Array.from({ length: n }, (_, i) => `member${i}@example.com`);
const content = { subject: "S", text: "T", html: "<p>H</p>", label: "finalized email" };

describe("deliverBatch", () => {
  test("Brevo: 150 người nhận → 2 request, mỗi request dùng messageVersions", async () => {
    const calls = [];
    globalThis.fetch = async (url, init) => {
      calls.push({ url, body: JSON.parse(init.body) });
      return new Response("{}", { status: 201 });
    };
    const result = await deliverBatch(brevo, { recipients: recipients(150), ...content });
    assert.deepEqual(result, { total: 150, sent: 150, failed: 0 });
    assert.equal(calls.length, 2);
    assert.equal(calls[0].url, "https://api.brevo.com/v3/smtp/email");
    assert.equal(calls[0].body.messageVersions.length, 100);
    assert.equal(calls[1].body.messageVersions.length, 50);
    assert.deepEqual(calls[0].body.messageVersions[0], { to: [{ email: "member0@example.com" }] });
  });

  test("Resend: dùng endpoint /emails/batch với mảng email", async () => {
    let call;
    globalThis.fetch = async (url, init) => {
      call = { url, body: JSON.parse(init.body) };
      return new Response("{}", { status: 200 });
    };
    await deliverBatch({ provider: "resend", apiKey: "k", from: "a@b.c" }, { recipients: recipients(3), ...content });
    assert.equal(call.url, "https://api.resend.com/emails/batch");
    assert.equal(call.body.length, 3);
    assert.deepEqual(call.body[1].to, ["member1@example.com"]);
  });

  test("một batch bị provider từ chối → chỉ batch đó tính failed", async () => {
    let n = 0;
    globalThis.fetch = async () => (n++ === 0 ? new Response("{}", { status: 201 }) : new Response('{"message":"rate"}', { status: 429 }));
    const result = await deliverBatch(brevo, { recipients: recipients(130), ...content });
    assert.deepEqual(result, { total: 130, sent: 100, failed: 30 });
  });

  test("không có người nhận → không gọi API", async () => {
    globalThis.fetch = async () => assert.fail("không được gọi");
    assert.deepEqual(await deliverBatch(brevo, { recipients: [], ...content }), { total: 0, sent: 0, failed: 0 });
  });
});
