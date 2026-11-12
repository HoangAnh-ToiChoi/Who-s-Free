/** Thành viên đã nhập lịch rảnh trong phiên (API trả mọi thành viên nhóm, người chưa nhập có slots rỗng). */
export const hasResponded = (member) => member?.slots?.length > 0;
