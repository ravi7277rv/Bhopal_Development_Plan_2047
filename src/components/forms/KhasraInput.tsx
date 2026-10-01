import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Close } from '@mui/icons-material';

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
    placeholder = 'Enter Khasra No.',
    width = '100%',
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
        if (!q) return options.slice(0, 50);
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
        // keep focus on input so user can continue typing
        requestAnimationFrame(() => inputRef.current?.focus());
    };

    const handleClear = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onChange('');
        setOpen(true);
        requestAnimationFrame(() => inputRef.current?.focus());
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
                setOpen(false);
                inputRef.current?.blur();
            }
        } else if (e.key === 'Escape') {
            setOpen(false);
            setHighlightedIndex(-1);
        }
    };

    return (
        <div ref={containerRef} className="relative w-full" style={{ width }}>
            {/* Input wrapper */}
            <div
                className="flex items-center bg-white transition-all duration-150"
                style={{
                    height: 42,
                    borderRadius: 10,
                    border: open ? '1.5px solid #fbbf24' : '1px solid transparent',
                    paddingLeft: 14,
                    paddingRight: 6,
                }}
                onMouseEnter={(e) => {
                    if (!open) e.currentTarget.style.border = '1px solid #cbd5e1';
                }}
                onMouseLeave={(e) => {
                    if (!open) e.currentTarget.style.border = '1px solid transparent';
                }}
            >
                {/* ✅ Input — flex-1 to occupy remaining space */}
                <input
                    ref={inputRef}
                    type="text"
                    value={value}
                    placeholder={placeholder}
                    autoComplete="off"
                    spellCheck={false}
                    onChange={(e) => {
                        onChange(e.target.value);
                        setOpen(true);
                        setHighlightedIndex(-1);
                    }}
                    onFocus={() => setOpen(true)}
                    onKeyDown={handleKeyDown}
                    className="flex-1 min-w-0 bg-transparent border-none outline-none"
                    style={{
                        fontSize: 14.5,
                        fontWeight: 500,
                        color: '#0f172a',
                        caretColor: '#0f2c4a',
                        padding: 0,
                        margin: 0,
                    }}
                />

                {/* ✅ Clear button — shows when there's text */}
                {value && (
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
                            color: '#94a3b8',
                            marginRight: 6,
                            background: 'transparent',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.color = '#475569';
                            e.currentTarget.style.background = '#f1f5f9';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.color = '#94a3b8';
                            e.currentTarget.style.background = 'transparent';
                        }}
                    >
                        <Close sx={{ fontSize: 15 }} />
                    </button>
                )}

                {/* ✅ Search icon — clean, no divider */}
                <div
                    className="flex items-center justify-center flex-shrink-0"
                    style={{
                        width: 34,
                        height: '100%',
                        color: '#94a3b8',
                    }}
                >
                    <Search sx={{ fontSize: 19 }} />
                </div>
            </div>

            {/* Dropdown */}
            {open && (
                <ul
                    ref={listRef}
                    onMouseDown={(e) => e.preventDefault()}
                    className="absolute z-50 left-0 right-0"
                    style={{
                        top: 'calc(100% + 4px)',
                        maxHeight: 280,
                        background: '#ffffff',
                        borderRadius: 10,
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 10px 32px rgba(0, 0, 0, 0.14)',
                        padding: '6px 0',
                        margin: 0,
                        listStyle: 'none',
                        overflowY: 'auto',
                    }}
                >
                    {filteredOptions.length === 0 ? (
                        <li
                            style={{
                                padding: '10px 14px',
                                fontSize: 13,
                                color: '#94a3b8',
                                fontStyle: 'italic',
                            }}
                        >
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
                                        e.preventDefault();
                                        handleSelect(option);
                                    }}
                                    className="cursor-pointer transition-colors"
                                    style={{
                                        padding: '10px 14px',
                                        fontSize: 14,
                                        color: isHighlighted ? '#1e40af' : '#334155',
                                        background: isHighlighted ? '#eff6ff' : 'transparent',
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