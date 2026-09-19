import React from 'react';
import { SearchIcon } from '../icons/Icons';

interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    onClear?: () => void;
}

const SearchInput: React.FC<SearchInputProps> = ({ className = '', value, onClear, onChange, ...props }) => {
    return (
        <div className={`relative ${className}`}>
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                <SearchIcon className="h-5 w-5" />
            </div>
            <input
                {...props}
                value={value}
                onChange={onChange}
                type="text"
                className="w-full pl-10 pr-8 py-2 bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block shadow-sm hover:border-gray-400 transition-colors"
            />
            {value && onClear && (
                <button
                    type="button"
                    onClick={onClear}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                    aria-label="Effacer la recherche"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                </button>
            )}
        </div>
    );
};

export default SearchInput;
