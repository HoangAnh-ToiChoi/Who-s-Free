import { useRef, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "~/components/ui/input";

function SearchBar({ value, onChange, placeholder = "Search...", ...props }) {
  const [internalValue, setInternalValue] = useState("");
  const inputRef = useRef(null);

  const isControlled = value !== undefined;
  const currentValue = isControlled ? value : internalValue;

  const handleChange = (e) => {
    if (!isControlled) {
      setInternalValue(e.target.value);
    }
    onChange?.(e);
  };

  return (
    <div
      onClick={() => inputRef.current?.focus()}
      className="flex h-9 w-80 items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 text-sm text-slate-400 transition-all hover:border-slate-300 hover:bg-white focus-within:border-slate-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-500/20 cursor-text"
    >
      <Search size={16} className="shrink-0 text-slate-400" />
      <Input
        ref={inputRef}
        type="text"
        value={currentValue}
        onChange={handleChange}
        placeholder={placeholder}
        className="h-full flex-1 rounded-none border-0 bg-transparent px-0 py-0 text-sm text-slate-800 placeholder:text-slate-400 shadow-none outline-none focus-visible:border-0 focus-visible:ring-0"
        {...props}
      />
      <kbd className="hidden rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-500 sm:inline shadow-2xs pointer-events-none select-none">
        ⌘K
      </kbd>
    </div>
  );
}

export default SearchBar;
