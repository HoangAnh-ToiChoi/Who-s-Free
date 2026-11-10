import { useContext, useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { groupService } from "~/service/groupService/groupService";
import { notifyGroupMembersChanged } from "~/events/groupEvents";
import { GroupContext } from "~/contexts/GroupContext";

// Vai trò thật trong group_members (owner|lead|member) — không dùng isLead vì cờ đó còn bật với groupRole "leadership".
export const getMemberRole = (member) => {
  const role = String(member?.role || "member").toLowerCase();
  return role === "owner" || role === "lead" ? role : "member";
};

// Phản chiếu luật BE: owner/lead xóa member, chỉ owner xóa lead, không ai xóa owner, owner không tự rời.
export function getMemberPermissions(member, { myRole, myUserId }) {
  const targetRole = getMemberRole(member);
  const isSelf = Boolean(myUserId) && String(member?.userId) === String(myUserId);
  const isManager = myRole === "owner" || myRole === "lead";
  return {
    isSelf,
    canPromote: !isSelf && isManager && targetRole === "member",
    canRemove:
      !isSelf &&
      ((isManager && targetRole === "member") || (myRole === "owner" && targetRole === "lead")),
    canLeave: isSelf && myRole !== "owner",
  };
}

export function useMemberActions(group) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { loadGroups } = useContext(GroupContext) || {};
  const [pending, setPending] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const open = (type, member) => {
    setError("");
    setPending({ type, member });
  };

  const close = () => {
    if (isSubmitting) return;
    setPending(null);
    setError("");
  };

  const confirm = async () => {
    if (!pending || !group?.id) return;
    const { type, member } = pending;
    setIsSubmitting(true);
    setError("");
    try {
      if (type === "promote") {
        await groupService.promoteMember(group.id, member.userId);
      } else {
        await groupService.removeMember(group.id, member.userId);
      }
      setPending(null);
      if (type === "leave") {
        loadGroups?.();
        navigate("/");
        return;
      }
      notifyGroupMembersChanged(group.id);
    } catch (err) {
      setError(err?.message || t("manage.failed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return { pending, isSubmitting, error, open, close, confirm };
}
