import SessionDeadlineModel from "../models/session-deadline.model.js";
import EmailDeadlineService from "./email-deadline.service.js";
import { appConfig } from "../configs/app.config.js";

const sessionUrl = (s) =>
  `${appConfig.clientOrigin}/groups/${s.group_id}/matrix/${s.slug}`;

/**
 * Gửi mail cho các session đã giành được quyền gửi (claimed). Mỗi session một batch tới owner/lead.
 * Session gửi thất bại hoàn toàn (hoặc không tra được người nhận) thì gọi release để lần chạy sau thử lại.
 * Gửi lỗi một phần (đã tới một số người) thì giữ dấu, tránh gửi trùng cho người đã nhận.
 * @returns {Promise<{ delivered: number, failed: number }>} delivered = số session đã gửi xong
 */
async function dispatch(claimed, send, release) {
  if (claimed.length === 0) return { delivered: 0, failed: 0 };
  const ids = claimed.map((s) => s.id);
  let emailsByGroup;
  try {
    emailsByGroup = await SessionDeadlineModel.findLeadEmailsByGroup([...new Set(claimed.map((s) => s.group_id))]);
  } catch (error) {
    await release(ids);
    throw error;
  }

  const outcomes = await Promise.all(
    claimed.map(async (session) => {
      const emails = emailsByGroup.get(session.group_id) ?? [];
      if (emails.length === 0) return { id: session.id, delivered: true, failed: 0 };
      const result = await send({ emails, session }).catch(() => ({ total: emails.length, sent: 0, failed: emails.length }));
      return { id: session.id, delivered: result.sent > 0, failed: result.failed };
    }),
  );

  const toRelease = outcomes.filter((o) => !o.delivered).map((o) => o.id);
  if (toRelease.length) await release(toRelease);
  return {
    delivered: outcomes.filter((o) => o.delivered).length,
    failed: outcomes.reduce((sum, o) => sum + o.failed, 0),
  };
}

const sendClosed = ({ emails, session }) =>
  EmailDeadlineService.sendSessionClosed({
    emails,
    groupName: session.group_name,
    sessionTitle: session.title,
    sessionUrl: sessionUrl(session),
  });

const sendReminder = ({ emails, session }) =>
  EmailDeadlineService.sendDeadlineReminder({
    emails,
    groupName: session.group_name,
    sessionTitle: session.title,
    endDate: session.end_date,
    sessionUrl: sessionUrl(session),
  });

class SessionDeadlineService {
  /**
   * Một lần chạy job: đóng session quá hạn → mail "đã đóng" → mail nhắc 20h.
   * Idempotent nhờ UPDATE ... RETURNING nguyên tử; ghi một dòng job_runs mỗi lần (kể cả khi lỗi).
   * @param {Date} [now] - chỉ để kiểm thử mốc giờ
   */
  async run(now = new Date()) {
    const runId = await SessionDeadlineModel.startRun();
    const stats = { remindersSent: 0, sessionsClosed: 0, emailsFailed: 0 };
    try {
      stats.sessionsClosed = await SessionDeadlineModel.closeOverdue(now);

      const closed = await SessionDeadlineModel.claimClosedNotifications(now);
      const closedResult = await dispatch(closed, sendClosed, SessionDeadlineModel.releaseClosedNotifications);

      const reminders = await SessionDeadlineModel.claimReminders(now);
      const reminderResult = await dispatch(reminders, sendReminder, SessionDeadlineModel.releaseReminders);

      stats.remindersSent = reminderResult.delivered;
      stats.emailsFailed = closedResult.failed + reminderResult.failed;
      await SessionDeadlineModel.finishRun(runId, stats);
      return { runId, ...stats };
    } catch (error) {
      await SessionDeadlineModel.finishRun(runId, { ...stats, error: String(error?.message ?? error).slice(0, 1000) })
        .catch((logError) => console.error("[session-deadlines] không ghi được job_runs:", logError.message));
      throw error;
    }
  }
}

export const sessionDeadlineService = new SessionDeadlineService();
export default sessionDeadlineService;
