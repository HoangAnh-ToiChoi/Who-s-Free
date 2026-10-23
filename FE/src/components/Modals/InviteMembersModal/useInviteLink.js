import { useState, useEffect } from "react";
import { groupService } from "~/service/groupService/groupService";

export function useInviteLink(groupId, canInvite, open) {
  const [inviteLinkData, setInviteLinkData] = useState(null);
  const [isLoadingLink, setIsLoadingLink] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [prevOpen, setPrevOpen] = useState(open);

  if (prevOpen !== open) {
    setPrevOpen(open);
    if (!open) {
      setInviteLinkData(null);
      setCopied(false);
      setIsConfirmOpen(false);
      setIsLoadingLink(false);
    } else if (groupId && canInvite) {
      setIsLoadingLink(true);
    }
  }

  useEffect(() => {
    if (!open || !groupId || !canInvite) return;
    let cancelled = false;
    groupService.getGroupInviteLink(groupId)
      .then((data) => { if (!cancelled) { setInviteLinkData(data?.token ? data : null); setIsLoadingLink(false); } })
      .catch(() => { if (!cancelled) { setInviteLinkData(null); setIsLoadingLink(false); } });
    return () => { cancelled = true; };
  }, [open, groupId, canInvite]);

  const activeToken = inviteLinkData?.token;
  const inviteLink = activeToken
    ? `${window.location.origin}/join/${activeToken}`
    : "";

  const handleCopy = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  const handleCreateOrReset = async () => {
    if (!groupId || isGenerating) return;
    try {
      setIsGenerating(true);
      const data = await groupService.createGroupInviteLink(groupId);
      setInviteLinkData(data);
      setIsConfirmOpen(false);
    } catch {
      // ignore
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRequestGenerate = () => {
    if (activeToken) setIsConfirmOpen(true);
    else handleCreateOrReset();
  };

  return {
    inviteLink,
    activeToken,
    isLoadingLink,
    isGenerating,
    isConfirmOpen,
    setIsConfirmOpen,
    copied,
    handleCopy,
    handleCreateOrReset,
    handleRequestGenerate,
  };
}
