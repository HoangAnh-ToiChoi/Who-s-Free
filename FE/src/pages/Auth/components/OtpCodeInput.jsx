import { useEffect, useRef } from "react";
import { cn } from "~/lib/utils";
import { Input } from "~/components/ui/input";

export const OTP_LENGTH = 6;
const onlyDigits = (text) => String(text || "").replace(/\D/g, "");

/**
 * 6 ô nhập mã OTP: tự nhảy ô, Backspace lùi ô, dán cả mã vào ô bất kỳ.
 * value: chuỗi các chữ số đã nhập (tối đa 6); onChange(chuỗi mới).
 */
function OtpCodeInput({ value, onChange, invalid = false, autoFocus = true }) {
  const inputs = useRef([]);
  const digits = Array.from({ length: OTP_LENGTH }, (_, i) => value[i] || "");

  useEffect(() => {
    if (!autoFocus) return undefined;
    const timer = setTimeout(() => inputs.current[0]?.focus(), 100);
    return () => clearTimeout(timer);
  }, [autoFocus]);

  const fillFrom = (index, text) => {
    const next = [...digits];
    onlyDigits(text)
      .slice(0, OTP_LENGTH - index)
      .split("")
      .forEach((d, i) => {
        next[index + i] = d;
      });
    onChange(next.join(""));
    const filled = next.findIndex((d) => !d);
    inputs.current[filled === -1 ? OTP_LENGTH - 1 : filled]?.focus();
  };

  const handleChange = (index, raw) => {
    const clean = onlyDigits(raw);
    if (clean.length > 1) return fillFrom(index, clean);
    const next = [...digits];
    next[index] = clean;
    onChange(next.join(""));
    if (clean && index < OTP_LENGTH - 1) inputs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) inputs.current[index - 1]?.focus();
  };

  return (
    <div
      className="flex items-center justify-between gap-1.5 sm:gap-2.5"
      onPaste={(e) => {
        e.preventDefault();
        fillFrom(0, e.clipboardData.getData("text"));
      }}
    >
      {digits.map((digit, idx) => (
        <Input
          key={idx}
          ref={(el) => (inputs.current[idx] = el)}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={digit}
          autoComplete={idx === 0 ? "one-time-code" : "off"}
          onChange={(e) => handleChange(idx, e.target.value)}
          onKeyDown={(e) => handleKeyDown(idx, e)}
          aria-label={`OTP Digit ${idx + 1}`}
          className={cn(
            "h-12 w-11 rounded-xl bg-slate-50/50 p-0 text-center text-lg font-bold transition-all focus:bg-white sm:w-12",
            invalid
              ? "border-rose-500 bg-rose-50/40 text-rose-900 ring-1 ring-rose-500/50"
              : "border-slate-200/90 text-slate-800 focus:border-indigo-500 focus:ring-indigo-500/20"
          )}
        />
      ))}
    </div>
  );
}

export default OtpCodeInput;
