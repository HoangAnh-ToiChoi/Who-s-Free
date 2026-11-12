/** Màn hẹp (điện thoại, < 640px — cùng mốc `sm` của Tailwind). Đọc một lần lúc dựng, không theo dõi xoay màn. */
export const isNarrowScreen = () =>
  typeof window !== "undefined" && window.matchMedia("(max-width: 639px)").matches;
