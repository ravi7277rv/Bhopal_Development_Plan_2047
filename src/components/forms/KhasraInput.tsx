import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Close } from '@mui/icons-material';

interface KhasraInputProps {
    value: string;
    options: string[];
    placeholder?: string;
    width?: number;
    onChange: (value: string) => void;
}

export const KhasraInput: React.FC<KhasraInputProps> = ({
    value,
    options,
    placeholder = 'Enter Khasra No.',
    width = 220,
    onChange,
}) => {
    const [open, setOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);

    // ✅ Filter options as user types
    const filteredOptions = useMemo(() => {
        const q = value.trim().toLowerCase();
        if (!q) return options.slice(0, 50); // show first 50 when empty
        return options.filter((o) => o.toLowerCase().includes(q)).slice(0, 50);
    }, [value, options]);

    // ✅ Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (!containerRef.current?.contains(e.target as Node)) {
                setOpen(false);
                setHighlightedIndex(-1);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // ✅ Auto-scroll highlighted option into view
    useEffect(() => {
        if (highlightedIndex < 0 || !listRef.current) return;
        const el = listRef.current.children[highlightedIndex] as HTMLElement;
        el?.scrollIntoView({ block: 'nearest' });
    }, [highlightedIndex]);

    const handleSelect = (option: string) => {
        onChange(option);
        setOpen(false);
        setHighlightedIndex(-1);
        inputRef.current?.blur();
    };

    const handleClear = () => {
        onChange('');
        setOpen(true);
        inputRef.current?.focus();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setOpen(true);
            setHighlightedIndex((i) => Math.min(i + 1, filteredOptions.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightedIndex((i) => Math.max(i - 1, 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (open && highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
                handleSelect(filteredOptions[highlightedIndex]);
            } else {
                // Free-text: apply whatever the user typed
                setOpen(false);
                inputRef.current?.blur();
            }
        } else if (e.key === 'Escape') {
            setOpen(false);
            setHighlightedIndex(-1);
        }
    };

    return (
        <div ref={containerRef} className="relative" style={{ width }}>
            {/* Input wrapper — mimics the styled white box */}
            <div
                className={`flex items-center bg-white rounded h-9 pl-2 pr-0 transition-shadow ${open ? 'ring-2 ring-blue-400' : ''
                    }`}
            >
                <input
                    ref={inputRef}
                    type="text"
                    value={value}
                    placeholder={placeholder}
                    onChange={(e) => {
                        onChange(e.target.value);
                        setOpen(true);
                        setHighlightedIndex(-1);
                    }}
                    onFocus={() => setOpen(true)}
                    onKeyDown={handleKeyDown}
                    className="flex-1 min-w-0 bg-transparent border-none outline-none text-sm text-gray-800 placeholder-gray-400"
                />

                {/* Clear button when there's text */}
                {value && (
                    <button
                        type="button"
                        onClick={handleClear}
                        className="p-1 text-gray-400 hover:text-gray-600"
                        aria-label="Clear"
                    >
                        <Close sx={{ fontSize: 16 }} />
                    </button>
                )}

                {/* Search icon — fixed right area with divider */}
                <div className="flex items-center justify-center w-9 h-full border-l border-gray-200">
                    <Search sx={{ fontSize: 18, color: '#374151' }} />
                </div>
            </div>

            {/* Dropdown */}
            {open && (
                <ul
                    ref={listRef}
                    className="absolute z-50 top-full left-0 right-0 mt-1 max-h-64 overflow-y-auto
                     bg-white rounded shadow-lg border border-gray-200 py-1"
                >
                    {filteredOptions.length === 0 ? (
                        <li className="px-3 py-2 text-xs text-gray-400 italic">
                            No Khasra matches "{value}"
                        </li>
                    ) : (
                        filteredOptions.map((option, idx) => {
                            const isHighlighted = idx === highlightedIndex;
                            const isSelected = option === value;
                            return (
                                <li
                                    key={option}
                                    onMouseEnter={() => setHighlightedIndex(idx)}
                                    onMouseDown={(e) => {
                                        e.preventDefault(); // prevent input blur
                                        handleSelect(option);
                                    }}
                                    className={`px-3 py-2 text-sm cursor-pointer transition-colors ${isHighlighted ? 'bg-blue-50 text-blue-900' : 'text-gray-700'
                                        } ${isSelected ? 'font-semibold' : ''}`}
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