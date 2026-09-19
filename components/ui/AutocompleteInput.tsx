import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../services/electronDB';
import { Contact } from '../../types';

interface AutocompleteInputProps {
    label?: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    required?: boolean;
    type?: 'text';
    className?: string;
}

const AutocompleteInput: React.FC<AutocompleteInputProps> = ({
    label,
    value,
    onChange,
    placeholder,
    required,
    className
}) => {
    const [suggestions, setSuggestions] = useState<Contact[]>([]);
    const [filteredSuggestions, setFilteredSuggestions] = useState<Contact[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Load contacts once or on mount
        db.contacts.toArray().then(setSuggestions);

        // Handle clicks outside
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (showSuggestions) {
            const lowerValue = (value || '').toLowerCase();
            const filtered = suggestions.filter(c =>
                c.name.toLowerCase().includes(lowerValue)
            ).slice(0, 5); // Limit to 5 suggestions
            setFilteredSuggestions(filtered);
        }
    }, [value, suggestions, showSuggestions]);

    const handleFocus = () => {
        setShowSuggestions(true);
        // If empty, maybe show recent or all? For now, show none until typed or if we want to show all initially
        // Let's show all if value is short, limited to 5
        if (value.length === 0) {
            setFilteredSuggestions(suggestions.slice(0, 5));
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
                    {filteredSuggestions.map((contact) => (
                        <li
                            key={contact.id}
                            onMouseDown={(e) => {
                                e.preventDefault(); // Prevent blur before click
                                handleSelect(contact.name);
                            }}
                            className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm text-gray-700"
                        >
                            <div className="font-medium">{contact.name}</div>
                            {contact.type && <div className="text-xs text-gray-500">{contact.type}</div>}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default AutocompleteInput;
