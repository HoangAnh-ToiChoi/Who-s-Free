import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pencil, Trash2 } from "lucide-react";

/** Các mục menu quản lý nhóm theo vai trò + modal nào đang mở ("edit" | "delete" | null). */
export function useGroupManageMenu(role) {
  const { t } = useTranslation();
  const [mode, setMode] = useState(null);
  const canManage = role === "owner" || role === "lead";

  const items = [
    { key: "edit", label: t("groupActions.edit"), icon: Pencil, onSelect: () => setMode("edit"), hidden: !canManage },
    { key: "delete", label: t("groupActions.delete"), icon: Trash2, onSelect: () => setMode("delete"), danger: true, hidden: role !== "owner" },
  ];

  return { items, mode, setMode };
}
