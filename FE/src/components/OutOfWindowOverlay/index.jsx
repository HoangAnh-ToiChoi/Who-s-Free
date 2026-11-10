/**
 * Phủ gạch chéo lên cột ngày nằm ngoài khoảng khảo sát của phiên: chặn kéo thả/bấm ô bên dưới.
 * Dùng chung cho lưới nhập lịch (member) và heatmap (lead); cột cha phải `relative`.
 */
function OutOfWindowOverlay() {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 z-10 cursor-not-allowed bg-[repeating-linear-gradient(135deg,rgb(241_245_249/0.9)_0,rgb(241_245_249/0.9)_6px,rgb(255_255_255/0.75)_6px,rgb(255_255_255/0.75)_12px)]"
    />
  );
}

export default OutOfWindowOverlay;
