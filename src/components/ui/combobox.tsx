"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ComboboxOption {
  value: string;
  label: string;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  disabled?: boolean;
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Pilih opsi...",
  searchPlaceholder = "Cari...",
  className,
  disabled = false,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const containerRef = React.useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  const closeCombobox = React.useCallback(() => {
    setOpen(false);
    setSearch("");
  }, []);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        closeCombobox();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [closeCombobox]);

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (open) {
            closeCombobox();
          } else {
            setOpen(true);
          }
        }}
        className="flex h-9 w-full items-center justify-between rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-zinc-950 dark:focus:border-zinc-300 focus:ring-1 focus:ring-zinc-950 dark:focus:ring-zinc-300 disabled:cursor-not-allowed disabled:opacity-50 text-left"
      >
        <span className={cn("block truncate", !selectedOption && "text-zinc-400 dark:text-zinc-500")}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-zinc-500" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm animate-in fade-in-50 slide-in-from-top-1 duration-100">
          <div className="sticky top-0 z-10 flex items-center border-b border-zinc-150 dark:border-zinc-850 bg-white dark:bg-zinc-950 px-3 py-1.5">
            <Search className="mr-2 h-4 w-4 shrink-0 text-zinc-400" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent py-1 text-sm outline-none placeholder:text-zinc-400 text-zinc-900 dark:text-zinc-100"
              autoFocus
            />
          </div>

          <div className="py-1">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-zinc-500 text-center">
                Tidak ada hasil ditemukan.
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      closeCombobox();
                    }}
                    className={cn(
                      "relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm text-zinc-900 dark:text-zinc-100 outline-none hover:bg-zinc-100 dark:hover:bg-zinc-900 text-left",
                      isSelected && "font-semibold bg-zinc-50 dark:bg-zinc-900/50"
                    )}
                  >
                    {isSelected && (
                      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                        <Check className="h-4 w-4" />
                      </span>
                    )}
                    <span className="block truncate">{opt.label}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
