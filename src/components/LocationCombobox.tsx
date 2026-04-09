import { useState, useRef, useEffect } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

const PREDEFINED_LOCATIONS = [
  "Mount Pleasant",
  "Avondale",
  "Belgravia",
  "Strathaven",
  "Marlborough",
  "Borrowdale",
  "Vainona",
];

interface LocationComboboxProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

function formatLocation(input: string): string {
  return input
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export function LocationCombobox({ value, onChange, disabled }: LocationComboboxProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        if (inputValue.trim() && inputValue !== value) {
          onChange(formatLocation(inputValue));
        }
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [inputValue, value, onChange]);

  const filtered = PREDEFINED_LOCATIONS.filter((loc) =>
    loc.toLowerCase().includes(inputValue.toLowerCase())
  );

  const selectLocation = (loc: string) => {
    onChange(loc);
    setInputValue(loc);
    setOpen(false);
  };

  const handleBlur = () => {
    setTimeout(() => {
      if (inputValue.trim() && inputValue !== value) {
        onChange(formatLocation(inputValue));
      }
    }, 150);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          disabled={disabled}
          onChange={(e) => {
            setInputValue(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={handleBlur}
          placeholder="Select or type a location..."
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pr-8"
          )}
          required
        />
        <ChevronsUpDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50 pointer-events-none" />
      </div>

      {open && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md max-h-48 overflow-y-auto">
          {filtered.map((loc) => (
            <button
              key={loc}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => selectLocation(loc)}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer"
            >
              <Check
                className={cn("h-4 w-4", value === loc ? "opacity-100" : "opacity-0")}
              />
              {loc}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
