import React, { useEffect, useMemo, useRef, useState } from "react";
import { Search, Close } from "@mui/icons-material";

interface KhasraInputProps {
  value: string;
  options: string[];
  placeholder?: string;
  width?: number | string;
  onChange: (value: string) => void;
}

export const KhasraInput: React.FC<KhasraInputProps> = ({
  value,
  options,
  placeholder = "Enter Khasra No.",
  width = "100%",
  onChange,
}) => {
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const isUserTypingRef = useRef(false);
  // ✅ Local state — cursor safe rakhta hai
  const [query, setQuery] = useState(value);
  const [debouncedQuery, setDebouncedQuery] = useState(value);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    // ✅ Only sync when change came from outside (not user typing)
    if (!isUserTypingRef.current && value !== query) {
      setQuery(value);
      setDebouncedQuery(value);
    }
  }, [value, query]);

  // ✅ DEBOUNCE — 250ms baad filter hoga
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQuery(query);
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  // ✅ Memoized filter
  const filteredOptions = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    if (!q) return options.slice(0, 50);
    return options.filter((o) => o.toLowerCase().includes(q)).slice(0, 50);
  }, [debouncedQuery, options]);

  // ✅ Outside click close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setHighlightedIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ✅ Auto-scroll
  useEffect(() => {
    if (highlightedIndex < 0 || !listRef.current) return;
    const el = listRef.current.children[highlightedIndex] as HTMLElement;
    el?.scrollIntoView({ block: "nearest" });
  }, [highlightedIndex]);

  const handleSelect = (option: string) => {
    setQuery(option);
    setDebouncedQuery(option);
    onChange(option);
    setOpen(false);
    setHighlightedIndex(-1);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setQuery("");
    setDebouncedQuery("");
    onChange("");
    setOpen(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setHighlightedIndex((i) => Math.min(i + 1, filteredOptions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (open && highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
        handleSelect(filteredOptions[highlightedIndex]);
      } else {
        setOpen(false);
        inputRef.current?.blur();
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setHighlightedIndex(-1);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full" style={{ width }}>
      <div
        className="flex items-center bg-white transition-all duration-150"
        style={{
          height: 42,
          borderRadius: 10,
          border: open ? "1.5px solid #fbbf24" : "1px solid transparent",
          paddingLeft: 14,
          paddingRight: 6,
        }}
        onMouseEnter={(e) => {
          if (!open) e.currentTarget.style.border = "1px solid #cbd5e1";
        }}
        onMouseLeave={(e) => {
          if (!open) e.currentTarget.style.border = "1px solid transparent";
        }}
      >
        <input
          ref={inputRef}
          type="text"
          value={query}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => {
            const newVal = e.target.value;
            isUserTypingRef.current = true; // mark: user is typing
            setQuery(newVal);
            onChange(newVal);
            setOpen(true);
            setHighlightedIndex(-1);
            // reset flag after render
            requestAnimationFrame(() => {
              isUserTypingRef.current = false;
            });
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          className="flex-1 min-w-0 bg-transparent border-none outline-none"
          style={{
            fontSize: 14.5,
            fontWeight: 500,
            color: "#0f172a",
            caretColor: "#0f2c4a",
            padding: 0,
            margin: 0,
          }}
        />

        {query && (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleClear}
            aria-label="Clear"
            className="flex items-center justify-center flex-shrink-0 transition-colors"
            style={{
              width: 26,
              height: 26,
              borderRadius: 6,
              color: "#94a3b8",
              marginRight: 6,
              background: "transparent",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#475569";
              e.currentTarget.style.background = "#f1f5f9";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "#94a3b8";
              e.currentTarget.style.background = "transparent";
            }}
          >
            <Close sx={{ fontSize: 15 }} />
          </button>
        )}

        <div
          className="flex items-center justify-center flex-shrink-0"
          style={{ width: 34, height: "100%", color: "#94a3b8" }}
        >
          <Search sx={{ fontSize: 19 }} />
        </div>
      </div>

      {open && (
        <ul
          ref={listRef}
          onMouseDown={(e) => e.preventDefault()}
          className="absolute z-50 left-0 right-0"
          style={{
            top: "calc(100% + 4px)",
            maxHeight: 280,
            background: "#ffffff",
            borderRadius: 10,
            border: "1px solid #e2e8f0",
            boxShadow: "0 10px 32px rgba(0, 0, 0, 0.14)",
            padding: "6px 0",
            margin: 0,
            listStyle: "none",
            overflowY: "auto",
          }}
        >
          {filteredOptions.length === 0 ? (
            <li
              style={{
                padding: "10px 14px",
                fontSize: 13,
                color: "#94a3b8",
                fontStyle: "italic",
              }}
            >
              No Khasra matches "{query}"
            </li>
          ) : (
            filteredOptions.map((option, idx) => {
              const isHighlighted = idx === highlightedIndex;
              const isSelected = option === query;
              return (
                <li
                  key={option}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(option);
                  }}
                  className="cursor-pointer transition-colors"
                  style={{
                    padding: "10px 14px",
                    fontSize: 14,
                    color: isHighlighted ? "#1e40af" : "#334155",
                    background: isHighlighted ? "#eff6ff" : "transparent",
                    fontWeight: isSelected ? 600 : 500,
                  }}
                >
                  {option}
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
};
