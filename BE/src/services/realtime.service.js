import supabase, { supabaseAdmin } from "../configs/supabase.config.js";

/**
 * RealtimeService - Quản lý và phát sự kiện thời gian thực (Realtime Events)
 *
 * Trách nhiệm duy nhất (SRP):
 *   - Phát các sự kiện Realtime qua kênh Supabase Realtime Broadcast Channels
 *   - Đồng bộ hóa tức thì các thay đổi về ma trận giờ rảnh, phiên biểu quyết và nhóm
 *   - Đảm bảo non-blocking (fire-and-forget an toàn, không làm gián đoạn luồng HTTP chính)
 */
class RealtimeService {
  /**
   * Phát sự kiện tới một kênh cụ thể
   * @param {string} channelName - Tên kênh (vd: "session:sess-123", "group:ws-456")
   * @param {string} event - Tên sự kiện (vd: "SLOT_UPDATED", "SESSION_CREATED")
   * @param {object} payload - Dữ liệu kèm theo sự kiện
   */
  static async broadcast(channelName, event, payload = {}) {
    if (!channelName || !event) return;

    try {
      const client = supabaseAdmin || supabase;
      const channel = client.channel(channelName);

      await channel.send({
        type: "broadcast",
        event,
        payload: {
          ...payload,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (err) {
      // Ghi log cảnh báo nhưng không làm gián đoạn request người dùng
      console.warn(`[RealtimeService] Không thể phát sự kiện ${event} tới ${channelName}:`, err?.message || err);
    }
  }

  /**
   * Phát thông báo cập nhật khung giờ rảnh trong phiên khảo sát
   * @param {string} sessionId
   * @param {object} slotData
   */
  static async broadcastSlotUpdate(sessionId, slotData) {
    return this.broadcast(`session:${sessionId}`, "AVAILABILITY_UPDATED", slotData);
  }

  /**
   * Phát thông báo cập nhật trạng thái hoặc dữ liệu của nhóm
   * @param {string} groupId
   * @param {string} eventName
   * @param {object} data
   */
  static async broadcastGroupUpdate(groupId, eventName, data) {
    return this.broadcast(`group:${groupId}`, eventName, data);
  }
}

export default RealtimeService;
