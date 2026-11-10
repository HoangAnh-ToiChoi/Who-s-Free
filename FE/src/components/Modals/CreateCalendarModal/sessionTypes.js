/** Danh mục sự kiện (tag hiển thị trên thẻ phiên). Ô chọn danh mục đang ẩn khỏi form tạo phiên. */
export function getSessionTypes(t, isVietnamese) {
  return [
    {
      id: "work",
      tag: isVietnamese ? "CÔNG VIỆC & HỌC TẬP" : "WORK & STUDY",
      tagColor: "primary",
      label: t("createCalendarModal.workStudy"),
      desc: t("createCalendarModal.workStudyDesc"),
      badgeStyle: "bg-indigo-50 text-indigo-700 border-indigo-200/80",
    },
    {
      id: "hangout",
      tag: isVietnamese ? "ĐI CHƠI & TỤ TẬP" : "HANGOUT & CHILL",
      tagColor: "secondary",
      label: t("createCalendarModal.hangoutChill"),
      desc: t("createCalendarModal.hangoutChillDesc"),
      badgeStyle: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
    },
    {
      id: "other",
      tag: isVietnamese ? "HOẠT ĐỘNG KHÁC" : "OTHER",
      tagColor: "tertiary",
      label: t("createCalendarModal.otherActivity"),
      desc: t("createCalendarModal.otherActivityDesc"),
      badgeStyle: "bg-amber-50 text-amber-700 border-amber-200/80",
    },
  ];
}
