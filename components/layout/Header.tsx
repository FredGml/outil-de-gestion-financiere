import React from 'react';
import { Page } from '../../types';
import GlobalSearch from '../ui/GlobalSearch';
import NotificationCenter from '../ui/NotificationCenter';

interface HeaderProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

const Header: React.FC<HeaderProps> = ({ currentPage, onNavigate }) => {
  return (
    <header className="bg-white shadow-md px-6 py-3 flex justify-between items-center space-x-6 z-10 relative">
      <h1 className="text-2xl font-semibold text-gray-800 shrink-0 min-w-[200px]">{currentPage}</h1>
      <div className="flex-1 flex justify-center max-w-3xl">
        <GlobalSearch onNavigate={onNavigate} />
      </div>
      <div className="flex items-center space-x-4 shrink-0">
        <NotificationCenter />
      </div>
    </header>
  );
};

export default Header;
