import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "~/components/ui/button";
import { CreateGroupModal } from "~/components/Modals";

function CreateGroupBtn({ onClick, onGroupCreated }) {
  const [open, setOpen] = useState(false);

  const handleClick = (e) => {
    setOpen(true);
    onClick?.(e);
  };

  const handleSuccess = (newGroup) => {
    console.log("New group created:", newGroup);
    onGroupCreated?.(newGroup);
  };

  return (
    <>
      <Button
        onClick={handleClick}
        size="default"
        className="gap-2 px-4 font-medium shadow-xs cursor-pointer"
      >
        <Plus size={16} strokeWidth={2.5} />
        <span>Create Group</span>
      </Button>

      <CreateGroupModal
        open={open}
        onOpenChange={setOpen}
        onSuccess={handleSuccess}
      />
    </>
  );
}

export default CreateGroupBtn;
