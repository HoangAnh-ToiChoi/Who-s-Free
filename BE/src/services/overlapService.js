import { supabase } from '../config/supabase.js';
import { checkIsLead, checkIsGroupMember } from './calendarService.js';

export const getCalendarOverlapService = async (calendarId, userId) => {
  // 1. Lấy thông tin Calendar & Group
  const { data: calendar, error: calError } = await supabase
    .from('calendars')
    .select('*, groups(id)')
    .eq('id', calendarId)
    .single();

  if (calError || !calendar) {
    const err = new Error('Calendar không tồn tại');
    err.status = 404;
    throw err;
  }

  const groupId = calendar.group_id;

  // 2. Kiểm tra quyền truy cập (Authorization)
  const isLead = await checkIsLead(groupId, userId);
  const isMember = await checkIsGroupMember(groupId, userId);

  if (!isMember) {
    const err = new Error('Bạn không có quyền truy cập Calendar này');
    err.status = 403;
    throw err;
  }

  // Nếu là Member thường và Lead chưa bật visibility -> Không được phép xem
  if (!isLead && !calendar.is_visibility_on) {
    const err = new Error('Lead chưa cho phép hiển thị ma trận thời gian rảnh chung');
    err.status = 403;
    throw err;
  }

  // 3. Lấy danh sách tất cả thành viên trong Group
  const { data: members } = await supabase
    .from('group_members')
    .select('user_id, users(id, full_name, email, avatar_url)')
    .eq('group_id', groupId);

  const totalMembers = members ? members.length : 0;

  // 4. Lấy toàn bộ availability của Calendar này
  const { data: availabilities, error: avError } = await supabase
    .from('availability')
    .select('*, users(id, full_name, avatar_url)')
    .eq('calendar_id', calendarId);

  if (avError) throw avError;

  // Đếm số người đã phản hồi (đã nhập ít nhất 1 slot availability)
  const respondedUserIds = new Set(availabilities.map(a => a.user_id));
  const responseCount = `${respondedUserIds.size}/${totalMembers}`;

  // 5. Gom nhóm availability theo từng slot 30 phút
  // Sử dụng Map để lưu trữ key dạng ISO string của slot 30 phút
  const slotMap = new Map();

  availabilities.forEach(item => {
    let curr = new Date(item.start_time);
    const end = new Date(item.end_time);

    while (curr < end) {
      const slotKey = curr.toISOString();
      if (!slotMap.has(slotKey)) {
        slotMap.set(slotKey, {
          start_time: slotKey,
          end_time: new Date(curr.getTime() + 30 * 60000).toISOString(),
          users: new Map() // Dùng Map để tránh trùng lặp user trong cùng 1 slot
        });
      }

      slotMap.get(slotKey).users.set(item.users.id, {
        id: item.users.id,
        full_name: item.users.full_name,
        avatar_url: item.users.avatar_url,
        note: item.note
      });

      // Tăng thêm 30 phút
      curr = new Date(curr.getTime() + 30 * 60000);
    }
  });

  // Convert slotMap sang danh sách mảng trả về cho FE
  const slots = Array.from(slotMap.values()).map(slot => ({
    start_time: slot.start_time,
    end_time: slot.end_time,
    available_count: slot.users.size,
    available_users: Array.from(slot.users.values())
  })).sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

  return {
    calendar_id: calendarId,
    is_visibility_on: calendar.is_visibility_on,
    response_count: responseCount,
    total_members: totalMembers,
    responded_members: respondedUserIds.size,
    slots
  };
};

export const getSuggestedTimesService = async (calendarId, userId) => {
  const overlapData = await getCalendarOverlapService(calendarId, userId);
  const slots = overlapData.slots;

  if (slots.length === 0) {
    return { suggested_times: [], lowest_overlap_ranking: [] };
  }

  // 1. Sắp xếp các slot theo số lượng người rảnh giảm dần (Suggested Times)
  const sortedSlots = [...slots].sort((a, b) => b.available_count - a.available_count);
  const topSuggested = sortedSlots.slice(0, 5); // Lấy 5 khung giờ cao nhất

  // 2. Tính Lowest Overlap Ranking (Thành viên có ít sự trùng lặp nhất)
  const { data: members } = await supabase
    .from('group_members')
    .select('user_id, users(id, full_name, avatar_url)')
    .eq('group_id', (await supabase.from('calendars').select('group_id').eq('id', calendarId).single()).data.group_id);

  const memberScoreMap = new Map();
  members.forEach(m => {
    memberScoreMap.set(m.users.id, {
      id: m.users.id,
      full_name: m.users.full_name,
      avatar_url: m.users.avatar_url,
      overlap_score: 0 // Tổng số lượt slot trùng rảnh với nhóm
    });
  });

  slots.forEach(slot => {
    slot.available_users.forEach(u => {
      if (memberScoreMap.has(u.id)) {
        // Mỗi slot rảnh trùng với N người khác sẽ cộng điểm tương ứng N
        memberScoreMap.get(u.id).overlap_score += slot.available_count;
      }
    });
  });

  // Xếp hạng những người có điểm overlap từ thấp đến cao
  const lowestOverlapRanking = Array.from(memberScoreMap.values())
    .sort((a, b) => a.overlap_score - b.overlap_score);

  return {
    suggested_times: topSuggested,
    lowest_overlap_ranking: lowestOverlapRanking
  };
};

export const updateCalendarVisibilityService = async (calendarId, userId, isVisibilityOn) => {
  const { data: calendar } = await supabase
    .from('calendars')
    .select('group_id')
    .eq('id', calendarId)
    .single();

  if (!calendar) throw new Error('Calendar không tồn tại');

  const isLead = await checkIsLead(calendar.group_id, userId);
  if (!isLead) {
    const err = new Error('Chỉ có Lead mới có quyền chuyển đổi Visibility');
    err.status = 403;
    throw err;
  }

  const { data, error } = await supabase
    .from('calendars')
    .update({ is_visibility_on: isVisibilityOn, updated_at: new Date() })
    .eq('id', calendarId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const finalizeMeetingService = async (calendarId, userId, title, startTime, endTime, locationOrLink) => {
  const { data: calendar } = await supabase
    .from('calendars')
    .select('group_id')
    .eq('id', calendarId)
    .single();

  if (!calendar) throw new Error('Calendar không tồn tại');

  const isLead = await checkIsLead(calendar.group_id, userId);
  if (!isLead) {
    const err = new Error('Chỉ có Lead mới có quyền chốt lịch họp');
    err.status = 403;
    throw err;
  }

  const { data, error } = await supabase
    .from('meetings')
    .insert([{
      calendar_id: calendarId,
      group_id: calendar.group_id,
      title,
      start_time: startTime,
      end_time: endTime,
      location_or_link: locationOrLink,
      created_by: userId
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
};