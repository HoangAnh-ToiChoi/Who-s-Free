import { useInvitePage } from "./hooks/useInvitePage";
import {
  InviteBrandHeader,
  InviteLoadingState,
  InviteNotFoundCard,
  InviteSuccessCard,
  InviteGroupCard,
  InviteStatusAlert,
  InviteGuestActions,
  InviteMismatchAlert,
  InviteAcceptAction,
} from "./components";

/**
 * InvitePage - Trang tiếp nhận và xem trước lời mời tham gia nhóm (/invite/:token)
 *
 * Áp dụng kiến trúc SRP & Layout Stability (fe-guidelines):
 *   - File chỉ làm vai trò Orchestrator
 *   - Tách nhỏ toàn bộ logic sang custom hook useInvitePage
 *   - Tách các khối giao diện sang components độc lập, giải phóng tài nguyên render
 */
function InvitePage() {
  const {
    token,
    user,
    preview,
    isLoading,
    error,
    isAccepting,
    acceptSuccess,
    acceptedData,
    isAlreadyMember,
    isInvalid,
    isEmailMatching,
    isEmailMismatch,
    handleAccept,
    handleLogoutAndSwitch,
  } = useInvitePage();

  // 1. Trạng thái Loading
  if (isLoading) {
    return <InviteLoadingState />;
  }

  // 2. Trạng thái Chấp nhận thành công
  if (acceptSuccess) {
    return (
      <InviteSuccessCard
        groupName={acceptedData?.group?.name || preview?.group?.name}
        targetGroupId={acceptedData?.group?.id || preview?.group?.id}
        groupData={acceptedData?.group}
      />
    );
  }

  // 3. Trạng thái Lỗi / Token không tồn tại
  if (error && !preview) {
    return <InviteNotFoundCard error={error} />;
  }

  // 4. Trạng thái Xem trước và xử lý nghiệp vụ
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <InviteBrandHeader />

      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white rounded-3xl border border-slate-200/90 p-7 sm:p-8 shadow-xs space-y-6">
          {/* Thẻ thông tin nhóm và người mời */}
          <InviteGroupCard
            group={preview?.group}
            role={preview?.role}
            inviter={preview?.inviter}
          />

          {/* Các trạng thái vô hiệu hóa (Đã là thành viên, Hết hạn, Thu hồi, Nhóm đầy) */}
          {isInvalid && (
            <InviteStatusAlert
              isAlreadyMember={isAlreadyMember}
              isExpired={preview?.isExpired}
              isRevoked={preview?.isRevoked}
              isGroupFull={preview?.isGroupFull}
              groupId={preview?.group?.id}
            />
          )}

          {/* Chưa đăng nhập: Hướng dẫn đăng nhập / đăng ký bằng email được mời */}
          {!isInvalid && !user && (
            <InviteGuestActions
              invitedEmail={preview?.email}
              token={token}
            />
          )}

          {/* Đang đăng nhập sai email: Cảnh báo và nút đổi tài khoản */}
          {!isInvalid && isEmailMismatch && (
            <InviteMismatchAlert
              invitedEmail={preview?.email}
              currentEmail={user?.email}
              onSwitchAccount={handleLogoutAndSwitch}
            />
          )}

          {/* Đã đăng nhập đúng email: Nút chấp nhận lời mời */}
          {!isInvalid && isEmailMatching && (
            <InviteAcceptAction
              userEmail={user?.email}
              isAccepting={isAccepting}
              error={error}
              onAccept={handleAccept}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default InvitePage;
