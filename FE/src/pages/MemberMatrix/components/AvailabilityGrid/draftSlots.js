/**
 * Tạo các slot nháp sau khi kéo chọn xong (chưa lưu DB cho tới khi bấm Áp dụng).
 * Kéo qua nhiều ngày → một slot nháp cho mỗi ngày; `active` là slot gắn với cột kết thúc kéo.
 */
export function buildDraftSlots({ weekDays, dayIndices, dayIndex, startMinutes, endMinutes, now = Date.now() }) {
  const base = { startMinutes, endMinutes, label: "Available", note: "" };

  if (dayIndices && dayIndices.length > 1) {
    const drafts = dayIndices.map((dIdx) => ({
      ...base,
      id: `draft-${now}-${dIdx}`,
      dayIndex: dIdx,
      dateStr: weekDays.find((d) => d.dayIndex === dIdx)?.dateStr,
    }));
    const active = drafts.find((s) => s.dayIndex === dayIndex) || drafts[drafts.length - 1];
    return { drafts, active };
  }

  const selectedDay =
    weekDays.find((d) => d.dayIndex === dayIndex) || weekDays[dayIndex] || weekDays[0];
  const draft = { ...base, id: `draft-${now}`, dayIndex, dateStr: selectedDay?.dateStr };
  return { drafts: [draft], active: draft };
}

/**
 * Chuyển slot nháp thành slot thật khi bấm Áp dụng: nhiều ngày → mỗi ngày một slot
 * cùng khung giờ/ghi chú vừa chỉnh trong popover.
 */
export function promoteDrafts(draftSlots, slotData, now = Date.now()) {
  if (draftSlots.length > 1) {
    return draftSlots.map((ds) => ({
      ...ds,
      id: `slot-${now}-${ds.dayIndex}`,
      startMinutes: slotData.startMinutes,
      endMinutes: slotData.endMinutes,
      note: slotData.note || "",
      label: slotData.label || "Available",
    }));
  }
  return { ...slotData, id: `slot-${now}` };
}
