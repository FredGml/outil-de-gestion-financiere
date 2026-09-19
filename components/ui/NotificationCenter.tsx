import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../services/electronDB';
import { formatCurrency, getISODate } from '../../utils/formatter';
import { BellIcon } from '../icons/Icons';

interface Notification {
    id: string;
    type: 'invoice' | 'budget';
    message: string;
    date: string; // ISO date for sorting
}

const NotificationCenter: React.FC = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const checkNotifications = async () => {
        const alerts: Notification[] = [];
        const today = getISODate();

        // 1. Overdue Invoices
        const invoices = await db.invoices.toArray();
        const overdue = invoices.filter(inv => inv.status !== 'Pay\u00e9e' && inv.dueDate < today);
        overdue.forEach(inv => {
            alerts.push({
                id: `inv-${inv.id}`,
                type: 'invoice',
                message: `Facture ${inv.invoiceNumber} (${inv.clientName}) en retard de paiement.`,
                date: inv.dueDate
            });
        });

        // 2. Budget Overruns
        const budgets = await db.budgets.toArray();
        const expenses = await db.expenses.toArray();

        // Calculate current month expenses per category
        const currentMonthExpenses = expenses.filter(e => {
            const d = new Date(e.date);
            const now = new Date();
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });

        const usage: { [key: string]: number } = {};
        currentMonthExpenses.forEach(e => {
            usage[e.category] = (usage[e.category] || 0) + e.amount;
        });

        budgets.forEach(b => {
            const used = usage[b.category] || 0;
            if (used > b.monthlyLimit) {
                alerts.push({
                    id: `bud-${b.id}`,
                    type: 'budget',
                    message: `Budget dépassé pour ${b.category}: ${formatCurrency(used)} / ${formatCurrency(b.monthlyLimit)}`,
                    date: today
                });
            } else if (used > b.monthlyLimit * 0.9) {
                alerts.push({
                    id: `bud-warn-${b.id}`,
                    type: 'budget',
                    message: `Attention: Budget ${b.category} atteint à 90%`,
                    date: today
                });
            }
        });

        setNotifications(alerts);
    };

    useEffect(() => {
        checkNotifications();
        const interval = setInterval(checkNotifications, 60000); // Check every minute
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={wrapperRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-gray-500 hover:text-gray-700 focus:outline-none"
                aria-label="Notifications"
            >
                <BellIcon className="h-6 w-6" />
                {notifications.length > 0 && (
                    <span className="absolute top-1 right-1 block h-4 w-4 rounded-full bg-red-500 text-white text-xs font-bold text-center leading-4">
                        {notifications.length > 9 ? '9+' : notifications.length}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg py-1 z-20 border border-gray-200">
                    <div className="px-4 py-2 border-b border-gray-100 flex justify-between items-center">
                        <h3 className="text-sm font-semibold text-gray-700">Notifications</h3>
                        <span className="text-xs text-gray-500">{notifications.length} nouvelles</span>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="px-4 py-6 text-center text-sm text-gray-500">
                                Aucune notification.
                            </div>
                        ) : (
                            notifications.map(note => (
                                <div key={note.id} className="px-4 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-0">
                                    <div className="flex items-start">
                                        <div className={`shrink-0 h-2 w-2 mt-1.5 rounded-full ${note.type === 'invoice' ? 'bg-red-500' : 'bg-yellow-500'}`}></div>
                                        <div className="ml-3">
                                            <p className="text-sm font-medium text-gray-900">{note.type === 'invoice' ? 'Facture en retard' : 'Alerte Budget'}</p>
                                            <p className="text-xs text-gray-500 mt-1">{note.message}</p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationCenter;
