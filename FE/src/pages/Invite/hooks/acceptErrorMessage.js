const ACCEPT_ERRORS = {
  EMAIL_MISMATCH: ["invitePage.errorMismatchDetail", "Email tài khoản hiện tại không khớp với email được mời."],
  INVITATION_EXPIRED: ["invitePage.errorExpired", "Lời mời đã hết hạn sau 24 giờ. Vui lòng yêu cầu lời mời mới."],
  INVITATION_REVOKED: ["invitePage.errorRevoked", "Lời mời đã bị thu hồi bởi quản trị viên nhóm."],
  GROUP_CAPACITY_FULL: ["invitePage.errorGroupFull", "Nhóm đã đạt số lượng thành viên tối đa."],
};

export function getAcceptErrorMessage(err, t) {
  const known = ACCEPT_ERRORS[err?.code];
  if (known) return t(known[0], { defaultValue: known[1] });
  return (
    err?.message ||
    t("invitePage.errorAcceptFailed", {
      defaultValue: "Không thể chấp nhận lời mời lúc này. Vui lòng thử lại sau.",
    })
  );
}
