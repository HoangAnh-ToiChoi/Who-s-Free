import { useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { ConfirmModal, EditGroupModal } from "~/components/Modals";
import { groupService } from "~/service/groupService/groupService";
import { useGroups } from "~/hooks";

/** Modal sửa / xóa nhóm do menu 3 chấm mở (header trang nhóm, thẻ nhóm ở trang chủ). mode: "edit" | "delete" | null. */
function GroupManageDialogs({ group, mode, onModeChange, onChanged }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { loadGroups } = useGroups();
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const handleOpenChange = (open) => {
    if (open) return;
    setDeleteError("");
    onModeChange(null);
  };

  const handleUpdate = async (payload) => {
    await groupService.updateGroup(group.id, payload);
    onChanged?.();
    loadGroups();
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setDeleteError("");
    try {
      await groupService.deleteGroup(group.id);
      await loadGroups();
      navigate("/");
    } catch (err) {
      setDeleteError(err?.message || t("manage.failed"));
      setIsDeleting(false);
    }
  };

  return (
    <>
      <EditGroupModal open={mode === "edit"} onOpenChange={handleOpenChange} group={group} onSubmit={handleUpdate} />
      <ConfirmModal
        open={mode === "delete"}
        onOpenChange={handleOpenChange}
        title={t("groupActions.deleteTitle", { name: group?.name || "" })}
        description={t("groupActions.deleteDesc")}
        confirmText={t("groupActions.deleteConfirm")}
        cancelText={t("manage.keep")}
        onConfirm={handleDelete}
        isLoading={isDeleting}
        requireText={group?.name || ""}
        requireTextHint={t("groupActions.deleteTypeHint")}
        error={deleteError}
      />
    </>
  );
}

export default GroupManageDialogs;
