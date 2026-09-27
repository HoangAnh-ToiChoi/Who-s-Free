import { supabase } from '../config/supabase.js';

export const createAvailabilityService = async (calendarId, userId, startTime, endTime, note) => {
  const { data, error } = await supabase
    .from('availability')
    .insert([{
      calendar_id: calendarId,
      user_id: userId,
      start_time: startTime,
      end_time: endTime,
      note
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getMyAvailabilityService = async (calendarId, userId) => {
  const { data, error } = await supabase
    .from('availability')
    .select('*')
    .eq('calendar_id', calendarId)
    .eq('user_id', userId)
    .order('start_time', { ascending: true });

  if (error) throw error;
  return data;
};

export const updateAvailabilityService = async (availabilityId, userId, startTime, endTime, note) => {
  // Ownership Check: Đảm bảo chỉ sửa đúng bản ghi của mình
  const { data: existing } = await supabase
    .from('availability')
    .select('user_id')
    .eq('id', availabilityId)
    .single();

  if (!existing || existing.user_id !== userId) {
    const err = new Error('Bạn không có quyền chỉnh sửa thời gian rảnh này');
    err.status = 403;
    throw err;
  }

  const { data, error } = await supabase
    .from('availability')
    .update({ start_time: startTime, end_time: endTime, note, updated_at: new Date() })
    .eq('id', availabilityId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteAvailabilityService = async (availabilityId, userId) => {
  // Ownership Check
  const { data: existing } = await supabase
    .from('availability')
    .select('user_id')
    .eq('id', availabilityId)
    .single();

  if (!existing || existing.user_id !== userId) {
    const err = new Error('Bạn không có quyền xóa thời gian rảnh này');
    err.status = 403;
    throw err;
  }

  const { error } = await supabase
    .from('availability')
    .delete()
    .eq('id', availabilityId);

  if (error) throw error;
  return { id: availabilityId };
};