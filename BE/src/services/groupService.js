import { supabase } from '../config/supabase.js';

export const createGroupService = async (userId, name, description) => {
  const { data: group, error: groupError } = await supabase
    .from('groups')
    .insert([{ name, description, created_by: userId }])
    .select()
    .single();

  if (groupError) throw groupError;

  const { error: memberError } = await supabase
    .from('group_members')
    .insert([{ group_id: group.id, user_id: userId, role: 'LEAD' }]);

  if (memberError) throw memberError;

  return { ...group, role: 'LEAD' };
};

export const getUserGroupsService = async (userId) => {
  const { data, error } = await supabase
    .from('group_members')
    .select(`
      role,
      joined_at,
      groups (
        id,
        name,
        description,
        invite_code,
        created_at
      )
    `)
    .eq('user_id', userId);

  if (error) throw error;

  const as_lead = [];
  const as_member = [];

  data.forEach(item => {
    const groupInfo = { ...item.groups, role: item.role };
    if (item.role === 'LEAD') {
      as_lead.push(groupInfo);
    } else {
      as_member.push(groupInfo);
    }
  });

  return { as_lead, as_member };
};

export const joinGroupByCodeService = async (userId, inviteCode) => {
  const { data: group, error: groupError } = await supabase
    .from('groups')
    .select('id, name')
    .eq('invite_code', inviteCode)
    .single();

  if (groupError || !group) {
    const err = new Error('Mã mời không tồn tại hoặc không hợp lệ');
    err.status = 404;
    throw err;
  }

  const { data: member, error: memberError } = await supabase
    .from('group_members')
    .insert([{ group_id: group.id, user_id: userId, role: 'MEMBER' }])
    .select()
    .single();

  if (memberError) {
    if (memberError.code === '23505') {
      const err = new Error('Bạn đã là thành viên của nhóm này rồi');
      err.status = 400;
      throw err;
    }
    throw memberError;
  }

  return { group_id: group.id, group_name: group.name, role: 'MEMBER' };
};