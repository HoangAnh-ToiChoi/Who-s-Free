import { useJoinPage } from "./hooks/useJoinPage";
import {
  InviteBrandHeader,
  InviteNotFoundCard,
  InviteSuccessCard,
  InviteStatusAlert,
} from "~/pages/Invite/components";
import {
  JoinGroupCard,
  JoinAction,
  JoinGuestActions,
  JoinSkeletonCard,
} from "./components";

/**
 * JoinPage - Trang tiếp nhận và xem trước liên kết tham gia nhóm (/join/:token)
 *
 * Áp dụng kiến trúc SRP & Layout Stability (fe-guidelines & design doc):
 *   - File đóng vai trò Orchestrator
 *   - Skeleton loading hiển thị tại Frame 0 trong container chuẩn, chống giật hình
 *   - Tái sử dụng các UI components dùng chung từ Invite/components
 */
function JoinPage() {
  const {
    token,
    user,
    preview,
    isLoading,
    error,
    isJoining,
    acceptSuccess,
    acceptedData,
    isAlreadyMember,
    isInvalid,
    handleJoin,
  } = useJoinPage();

  // 1. Trạng thái Tham gia thành công
  if (acceptSuccess) {
    return (
      <InviteSuccessCard
        groupName={acceptedData?.group?.name || preview?.group?.name}
        targetGroupId={acceptedData?.group?.id || preview?.group?.id}
        groupData={acceptedData?.group}
      />
    );
  }

  // 2. Trạng thái Lỗi / Token không tồn tại
  if (error && !preview && !isLoading) {
    return <InviteNotFoundCard error={error} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <InviteBrandHeader />

      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white rounded-3xl border border-slate-200/90 p-7 sm:p-8 shadow-xs space-y-6">
          {/* Trạng thái Skeleton Loading ở Frame 0 */}
          {isLoading && <JoinSkeletonCard />}

          {/* Khi đã tải xong dữ liệu Preview */}
          {!isLoading && preview && (
            <>
              {/* Thẻ thông tin nhóm */}
              <JoinGroupCard group={preview.group} />

              {/* Các trạng thái vô hiệu hóa (Đã là thành viên, Hết hạn, Thu hồi, Nhóm đầy) */}
              {isInvalid && (
                <InviteStatusAlert
                  isAlreadyMember={isAlreadyMember}
                  isExpired={preview.isExpired}
                  isRevoked={preview.isRevoked}
                  isGroupFull={preview.isGroupFull}
                  groupId={preview.group?.id}
                />
              )}

              {/* Chưa đăng nhập: Nút Login/Register kèm returnUrl */}
              {!isInvalid && !user && <JoinGuestActions token={token} />}

              {/* Đã đăng nhập: Nút tham gia nhóm */}
              {!isInvalid && user && (
                <JoinAction
                  isJoining={isJoining}
                  error={error}
                  onJoin={handleJoin}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default JoinPage;
