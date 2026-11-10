/** Các nấc sức chứa nhóm (BE chặn tối đa 30 — BE/src/validations/group.validation.js). Dùng chung cho tạo và sửa nhóm. */
export const MAX_GROUP_CAPACITY = 30;

export const CAPACITY_OPTIONS = [5, 10, 20, 30].map((n) => ({
  value: String(n),
  label: `${n} members`,
  viLabel: `${n} thành viên`,
}));
