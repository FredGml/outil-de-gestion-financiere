import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../services/electronDB';
import { Expense } from '../types';
import { formatCurrency, getISODate, formatDate } from '../utils/formatter';
import { exportData, generateMultiExpensePDF } from '../services/exportService';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import SearchInput from '../components/ui/SearchInput';
import Input from '../components/ui/Input';
import GenericAutocomplete from '../components/ui/GenericAutocomplete';
import { PlusIcon, EditIcon, TrashIcon } from '../components/icons/Icons';

const ExpenseForm: React.FC<{
    expense?: Expense | null;
    onSave: () => void;
    onClose: () => void;
}> = ({ expense, onSave, onClose }) => {
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(getISODate());

    useEffect(() => {
        if (expense) {
            setDescription(expense.description);
            setCategory(expense.category);
            setAmount(String(expense.amount));
            setDate(expense.date);
        } else {
            setDescription('');
            setCategory('');
            setAmount('');
            setDate(getISODate());
        }
    }, [expense]);

    const fetchCategories = async () => {
        const budgets = await db.budgets.toArray();
        const annualBudgets = await db.annualBudgets.toArray();

        // Map budgets to suggestions
        const monthlySuggestions = budgets.map(b => ({
            id: `monthly-${b.id}`, // Prefix ID to avoid collisions
            name: b.category,
            subtext: `Budget Mensuel: ${formatCurrency(b.monthlyLimit)}`
        }));

        const annualSuggestions = annualBudgets.map(b => ({
            id: `annual-${b.id}`, // Prefix ID to avoid collisions, though GenericAutocomplete might not use ID for keying if value is string
            name: b.category,
            subtext: `Budget Annuel: ${formatCurrency(b.yearlyLimit)}`
        }));

        return [...monthlySuggestions, ...annualSuggestions];
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const expenseData: Expense = {
            description, category, amount: parseFloat(amount), date
        };
        if (expense && expense.id) {
            await db.expenses.update(expense.id, expenseData);
        } else {
            await db.expenses.add(expenseData);
        }
        onSave();
        onClose();
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Description" value={description} onChange={e => setDescription(e.target.value)} required />
            <GenericAutocomplete
                label="Catégorie"
                value={category}
                onChange={setCategory}
                fetchSuggestions={fetchCategories}
                placeholder="Sélectionnez ou tapez une catégorie"
                required
            />
            <Input label="Montant (F CFA)" type="number" value={amount} onChange={e => setAmount(e.target.value)} required />
            <Input label="Date" type="date" value={date} onChange={e => setDate(e.target.value)} required />
            <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="secondary" onClick={onClose}>Annuler</Button>
                <Button type="submit">Enregistrer</Button>
            </div>
        </form>
    );
};

const Expenses: React.FC = () => {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
    const [searchTerm, setSearchTerm] = useState(() => {
        const term = sessionStorage.getItem('globalSearchTerm');
        if (term) {
            sessionStorage.removeItem('globalSearchTerm');
            return term;
        }
        return '';
    });
    const [selectedExpenses, setSelectedExpenses] = useState<number[]>([]);

    const fetchExpenses = useCallback(async () => {
        const all = await db.expenses.toArray();
        let result = all;

        if (searchTerm) {
            result = result.filter(e =>
                e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                e.category.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Sort by date desc
        result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        setExpenses(result);
    }, [searchTerm]);

    useEffect(() => {
        fetchExpenses();
    }, [fetchExpenses]);

    const handleAdd = () => {
        setEditingExpense(null);
        setIsModalOpen(true);
    };

    const handleEdit = (expense: Expense) => {
        setEditingExpense(expense);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (window.confirm('Êtes-vous sûr de vouloir supprimer cette dépense ?')) {
            await db.expenses.delete(id);
            fetchExpenses();
        }
    };

    const handleExport = (format: 'excel' | 'word' | 'pdf') => {
        const columns = [
            { header: 'Date', accessor: 'date' },
            { header: 'Description', accessor: 'description' },
            { header: 'Catégorie', accessor: 'category' },
            { header: 'Montant', accessor: 'amount' },
        ];
        const dataToExport = expenses.map(e => ({ ...e, date: formatDate(e.date) }));
        exportData(format, 'Liste des Dépenses', columns, dataToExport);
    };

    const handleSelect = (id: number) => {
        setSelectedExpenses(prev =>
            prev.includes(id) ? prev.filter(eid => eid !== id) : [...prev, id]
        );
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedExpenses(expenses.map(exp => exp.id!));
        } else {
            setSelectedExpenses([]);
        }
    };

    const handleExportSelected = () => {
        const expensesToExport = expenses.filter(e => selectedExpenses.includes(e.id!));
        if (expensesToExport.length > 0) {
            generateMultiExpensePDF(expensesToExport);
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Gestion des Dépenses</h2>
                <div className="flex items-center space-x-2">
                    <div className="w-64">
                        <SearchInput
                            placeholder="Rechercher (description, catégorie)..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            onClear={() => setSearchTerm('')}
                        />
                    </div>
                    <Button onClick={handleExportSelected} disabled={selectedExpenses.length === 0}>
                        Exporter la sélection ({selectedExpenses.length})
                    </Button>
                    <Button onClick={() => handleExport('excel')}>Exporter Tout (Excel)</Button>
                    <Button onClick={handleAdd} className="flex items-center">
                        <PlusIcon className="h-5 w-5 mr-1" /> Ajouter
                    </Button>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full bg-white">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3">
                                <input
                                    type="checkbox"
                                    onChange={handleSelectAll}
                                    checked={expenses.length > 0 && selectedExpenses.length === expenses.length}
                                    aria-label="Sélectionner tout"
                                />
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Catégorie</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Montant</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {expenses.map(expense => (
                            <tr key={expense.id}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <input
                                        type="checkbox"
                                        checked={selectedExpenses.includes(expense.id!)}
                                        onChange={() => handleSelect(expense.id!)}
                                        aria-label={`Sélectionner la dépense ${expense.description}`}
                                    />
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(expense.date)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{expense.description}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{expense.category}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{formatCurrency(expense.amount)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-center">
                                    <div className="flex items-center justify-center space-x-4">
                                        <button onClick={() => handleEdit(expense)} className="text-primary-600 hover:text-primary-900"><EditIcon className="h-5 w-5" /></button>
                                        <button onClick={() => handleDelete(expense.id!)} className="text-red-600 hover:text-red-900"><TrashIcon className="h-5 w-5" /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingExpense ? 'Modifier la dépense' : 'Ajouter une dépense'}>
                <ExpenseForm expense={editingExpense} onSave={fetchExpenses} onClose={() => setIsModalOpen(false)} />
            </Modal>
        </div>
    );
};

export default Expenses;