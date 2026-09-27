import { supabase } from '../config/supabase.js';

// Helper: Check xem user có phải Lead của Group không
export const checkIsLead = async (groupId, userId) => {
  const { data, error } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .single();

  if (error || !data) return false;
  return data.role === 'LEAD';
};

// Helper: Check xem user có nằm trong Group không
export const checkIsGroupMember = async (groupId, userId) => {
  const { data, error } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .single();

  return !error && !!data;
};

export const createCalendarService = async (groupId, userId, title, startDate, endDate) => {
  const isLead = await checkIsLead(groupId, userId);
  if (!isLead) {
    const err = new Error('Chỉ có Lead mới có quyền tạo Calendar cho nhóm');
    err.status = 403;
    throw err;
  }

  const { data, error } = await supabase
    .from('calendars')
    .insert([{
      group_id: groupId,
      title,
      start_date: startDate,
      end_date: endDate,
      created_by: userId
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getCalendarsByGroupService = async (groupId, userId) => {
  const isMember = await checkIsGroupMember(groupId, userId);
  if (!isMember) {
    const err = new Error('Bạn không có quyền xem lịch của nhóm này');
    err.status = 403;
    throw err;
  }

  const { data, error } = await supabase
    .from('calendars')
    .select('*')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};