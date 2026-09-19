import React from 'react';
import { Page } from '../../types';
import { DashboardIcon, ExpensesIcon, InvoiceIcon, VoucherIcon, ReportIcon, DocumentIcon, LogoIcon, RecettesIcon, SettingsIcon, BudgetIcon, UsersIcon, SalaryIcon } from '../icons/Icons';

interface SidebarProps {
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentPage, setCurrentPage }) => {
  const navItems = [
    { page: Page.Dashboard, icon: <DashboardIcon /> },
    { page: Page.Expenses, icon: <ExpensesIcon /> },
    { page: Page.Invoices, icon: <InvoiceIcon /> },
    { page: Page.Budgets, icon: <BudgetIcon /> },
    { page: Page.Recettes, icon: <RecettesIcon /> },
    { page: Page.Salaries, icon: <SalaryIcon /> },
    { page: Page.Vouchers, icon: <VoucherIcon /> },
    { page: Page.Reports, icon: <ReportIcon /> },
    { page: Page.Documents, icon: <DocumentIcon /> },
    { page: Page.Contacts, icon: <UsersIcon /> },
  ];

  const bottomNavItems = [
    { page: Page.Settings, icon: <SettingsIcon /> },
  ]

  return (
    <aside className="w-64 bg-primary-800 text-white flex flex-col">
      <div className="h-16 flex items-center justify-center bg-primary-900">
        <LogoIcon className="h-8 w-8 mr-2" />
        <h1 className="text-xl font-bold">Admin</h1>
      </div>
      <nav className="flex-1 px-2 py-4 space-y-2">
        {navItems.map((item) => (
          <a
            key={item.page}
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setCurrentPage(item.page);
            }}
            className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors duration-150 ${currentPage === item.page
              ? 'bg-primary-700'
              : 'hover:bg-primary-700 hover:bg-opacity-75'
              }`}
          >
            {React.cloneElement(item.icon, { className: 'h-6 w-6 mr-3' })}
            <span>{item.page}</span>
          </a>
        ))}
      </nav>
      <div className="px-2 py-4 space-y-2 border-t border-primary-700">
        {bottomNavItems.map((item) => (
          <a
            key={item.page}
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setCurrentPage(item.page);
            }}
            className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors duration-150 ${currentPage === item.page
              ? 'bg-primary-700'
              : 'hover:bg-primary-700 hover:bg-opacity-75'
              }`}
          >
            {React.cloneElement(item.icon, { className: 'h-6 w-6 mr-3' })}
            <span>{item.page}</span>
          </a>
        ))}
      </div>
    </aside>
  );
};

export default Sidebar;
