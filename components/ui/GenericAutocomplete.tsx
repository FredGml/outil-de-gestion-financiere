import React, { useState, useEffect, useRef } from 'react';

interface Suggestion {
    id?: number;
    name: string;
    subtext?: string;
}

interface GenericAutocompleteProps {
    label?: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    required?: boolean;
    className?: string;
    fetchSuggestions: () => Promise<Suggestion[]>;
}

const GenericAutocomplete: React.FC<GenericAutocompleteProps> = ({
    label,
    value,
    onChange,
    placeholder,
    required,
    className,
    fetchSuggestions
}) => {
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [filteredSuggestions, setFilteredSuggestions] = useState<Suggestion[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchSuggestions().then(setSuggestions);

        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [fetchSuggestions]);

    useEffect(() => {
        if (showSuggestions) {
            const lowerValue = (value || '').toLowerCase();
            const filtered = suggestions.filter(s =>
                s.name.toLowerCase().includes(lowerValue)
            ).slice(0, 10);
            setFilteredSuggestions(filtered);
        }
    }, [value, suggestions, showSuggestions]);

    const handleFocus = () => {
        setShowSuggestions(true);
        if (value.length === 0) {
            setFilteredSuggestions(suggestions.slice(0, 10));
        }
    };

    const handleSelect = (name: string) => {
        onChange(name);
        setShowSuggestions(false);
    };

    return (
        <div className={`flex flex-col mb-4 relative ${className}`} ref={wrapperRef}>
            {label && <label className="mb-1 text-sm font-medium text-gray-700">{label} {required && '*'}</label>}
            <input
                type="text"
                value={value}
                onChange={(e) => {
                    onChange(e.target.value);
                    setShowSuggestions(true);
                }}
                onFocus={handleFocus}
                className="px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder={placeholder}
                required={required}
                autoComplete="off"
            />

            {showSuggestions && filteredSuggestions.length > 0 && (
                <ul className="absolute z-50 w-full bg-white border border-gray-300 rounded-md shadow-lg mt-1 max-h-60 overflow-auto top-full left-0">
                    {filteredSuggestions.map((suggestion, idx) => (
                        <li
                            key={suggestion.id || idx}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                handleSelect(suggestion.name);
                            }}
                            className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm text-gray-700"
                        >
                            <div className="font-medium">{suggestion.name}</div>
                            {suggestion.subtext && <div className="text-xs text-gray-500">{suggestion.subtext}</div>}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default GenericAutocomplete;
