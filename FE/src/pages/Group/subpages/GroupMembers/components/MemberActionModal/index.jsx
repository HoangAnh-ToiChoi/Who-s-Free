import { useTranslation } from "react-i18next";
import { LogOut, ShieldPlus, UserMinus } from "lucide-react";
import { ConfirmModal } from "~/components/Modals";

const CONFIGS = {
  promote: { tone: "warning", icon: ShieldPlus, key: "promote" },
  remove: { tone: "danger", icon: UserMinus, key: "remove" },
  leave: { tone: "danger", icon: LogOut, key: "leave" },
};

function MemberActionModal({ groupName, pending, isSubmitting, error, onClose, onConfirm }) {
  const { t } = useTranslation();
  const config = CONFIGS[pending?.type] || CONFIGS.remove;
  const name = pending?.type === "leave" ? groupName || "" : pending?.member?.name || "";

  return (
    <ConfirmModal
      open={Boolean(pending)}
      onOpenChange={(next) => !next && onClose()}
      title={t(`memberActions.${config.key}Title`, { name })}
      description={t(`memberActions.${config.key}Desc`)}
      confirmText={t(`memberActions.${config.key}Confirm`)}
      cancelText={t("manage.keep")}
      confirmIcon={config.icon}
      tone={config.tone}
      onConfirm={onConfirm}
      isLoading={isSubmitting}
      error={error}
    />
  );
}

export default MemberActionModal;
