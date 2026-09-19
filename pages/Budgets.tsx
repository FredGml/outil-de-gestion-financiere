import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../services/electronDB';
import { Budget, AnnualBudget } from '../types';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import { PlusIcon, EditIcon, TrashIcon } from '../components/icons/Icons';
import { formatCurrency } from '../utils/formatter';

const BudgetForm: React.FC<{
    budget?: Budget | null;
    onSave: () => void;
    onClose: () => void;
}> = ({ budget, onSave, onClose }) => {
    const [category, setCategory] = useState('');
    const [monthlyLimit, setMonthlyLimit] = useState('');

    useEffect(() => {
        if (budget) {
            setCategory(budget.category);
            setMonthlyLimit(String(budget.monthlyLimit));
        } else {
            setCategory('');
            setMonthlyLimit('');
        }
    }, [budget]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const budgetData: Budget = {
            category,
            monthlyLimit: parseFloat(monthlyLimit)
        };
        if (budget && budget.id) {
            await db.budgets.update(budget.id, budgetData);
        } else {
            await db.budgets.add(budgetData);
        }
        onSave();
        onClose();
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Catégorie" value={category} onChange={e => setCategory(e.target.value)} placeholder="ex: Carburant" required />
            <Input label="Limite Mensuelle (F CFA)" type="number" value={monthlyLimit} onChange={e => setMonthlyLimit(e.target.value)} required />

            <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="secondary" onClick={onClose}>Annuler</Button>
                <Button type="submit">Enregistrer</Button>
            </div>
        </form>
    );
};

const AnnualBudgetForm: React.FC<{
    budget?: AnnualBudget | null;
    onSave: () => void;
    onClose: () => void;
}> = ({ budget, onSave, onClose }) => {
    const [category, setCategory] = useState('');
    const [yearlyLimit, setYearlyLimit] = useState('');

    useEffect(() => {
        if (budget) {
            setCategory(budget.category);
            setYearlyLimit(String(budget.yearlyLimit));
        } else {
            setCategory('');
            setYearlyLimit('');
        }
    }, [budget]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const budgetData: AnnualBudget = {
            category,
            yearlyLimit: parseFloat(yearlyLimit)
        };
        if (budget && budget.id) {
            await db.annualBudgets.update(budget.id, budgetData);
        } else {
            await db.annualBudgets.add(budgetData);
        }
        onSave();
        onClose();
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Catégorie" value={category} onChange={e => setCategory(e.target.value)} placeholder="ex: Maintenance Annuelle" required />
            <Input label="Limite Annuelle (F CFA)" type="number" value={yearlyLimit} onChange={e => setYearlyLimit(e.target.value)} required />

            <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="secondary" onClick={onClose}>Annuler</Button>
                <Button type="submit">Enregistrer</Button>
            </div>
        </form>
    );
};

const Budgets: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'monthly' | 'yearly'>('monthly');
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [annualBudgets, setAnnualBudgets] = useState<AnnualBudget[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
    const [editingAnnualBudget, setEditingAnnualBudget] = useState<AnnualBudget | null>(null);

    const fetchBudgets = useCallback(async () => {
        const monthly = await db.budgets.toArray();
        const annual = await db.annualBudgets.toArray();
        setBudgets(monthly);
        setAnnualBudgets(annual);
    }, []);

    useEffect(() => {
        fetchBudgets();
    }, [fetchBudgets]);

    const handleAdd = () => {
        if (activeTab === 'monthly') {
            setEditingBudget(null);
        } else {
            setEditingAnnualBudget(null);
        }
        setIsModalOpen(true);
    };

    const handleEdit = (budget: any) => {
        if (activeTab === 'monthly') {
            setEditingBudget(budget as Budget);
        } else {
            setEditingAnnualBudget(budget as AnnualBudget);
        }
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (window.confirm('Voulez-vous supprimer ce budget ?')) {
            if (activeTab === 'monthly') {
                await db.budgets.delete(id);
            } else {
                await db.annualBudgets.delete(id);
            }
            fetchBudgets();
        }
    };

    const renderMonthlyBudgets = () => (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {budgets.map(budget => (
                    <div key={budget.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow relative">
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="font-semibold text-lg text-gray-800">{budget.category}</h3>
                            <div className="flex space-x-1">
                                <button onClick={() => handleEdit(budget)} className="p-1 text-gray-400 hover:text-primary-600"><EditIcon className="h-4 w-4" /></button>
                                <button onClick={() => handleDelete(budget.id!)} className="p-1 text-gray-400 hover:text-red-600"><TrashIcon className="h-4 w-4" /></button>
                            </div>
                        </div>
                        <div className="text-2xl font-bold text-gray-900">{formatCurrency(budget.monthlyLimit)}</div>
                        <div className="text-xs text-gray-500 mt-1 uppercase tracking-wide text-blue-600 font-semibold">Plafond mensuel</div>
                    </div>
                ))}
            </div>
            {budgets.length === 0 && (
                <div className="text-center py-10 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                    <p className="text-gray-500">Aucun budget mensuel défini.</p>
                </div>
            )}
        </>
    );

    const renderAnnualBudgets = () => (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {annualBudgets.map(budget => (
                    <div key={budget.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow relative bg-green-50/30 border-green-100">
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="font-semibold text-lg text-gray-800">{budget.category}</h3>
                            <div className="flex space-x-1">
                                <button onClick={() => handleEdit(budget)} className="p-1 text-gray-400 hover:text-primary-600"><EditIcon className="h-4 w-4" /></button>
                                <button onClick={() => handleDelete(budget.id!)} className="p-1 text-gray-400 hover:text-red-600"><TrashIcon className="h-4 w-4" /></button>
                            </div>
                        </div>
                        <div className="text-2xl font-bold text-gray-900">{formatCurrency(budget.yearlyLimit)}</div>
                        <div className="text-xs text-gray-500 mt-1 uppercase tracking-wide text-green-600 font-semibold">Plafond annuel</div>
                    </div>
                ))}
            </div>
            {annualBudgets.length === 0 && (
                <div className="text-center py-10 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                    <p className="text-gray-500">Aucun budget annuel défini.</p>
                </div>
            )}
        </>
    );

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-semibold">Gestion des Budgets</h2>
                    <p className="text-sm text-gray-500">Définissez des plafonds pour mieux contrôler vos dépenses.</p>
                </div>
                <Button onClick={handleAdd} className="flex items-center">
                    <PlusIcon className="h-5 w-5 mr-1" />
                    {activeTab === 'monthly' ? 'Nouveau Budget Mensuel' : 'Nouveau Budget Annuel'}
                </Button>
            </div>

            {/* Onglets */}
            <div className="flex space-x-4 mb-6 border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('monthly')}
                    className={`pb-2 px-1 text-sm font-medium transition-colors border-b-2 ${activeTab === 'monthly'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                >
                    Budgets Mensuels
                </button>
                <button
                    onClick={() => setActiveTab('yearly')}
                    className={`pb-2 px-1 text-sm font-medium transition-colors border-b-2 ${activeTab === 'yearly'
                            ? 'border-green-600 text-green-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                >
                    Budgets Annuels
                </button>
            </div>

            {/* Contenu */}
            {activeTab === 'monthly' ? renderMonthlyBudgets() : renderAnnualBudgets()}

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={activeTab === 'monthly'
                    ? (editingBudget ? 'Modifier Budget Mensuel' : 'Nouveau Budget Mensuel')
                    : (editingAnnualBudget ? 'Modifier Budget Annuel' : 'Nouveau Budget Annuel')
                }
            >
                {activeTab === 'monthly' ? (
                    <BudgetForm budget={editingBudget} onSave={fetchBudgets} onClose={() => setIsModalOpen(false)} />
                ) : (
                    <AnnualBudgetForm budget={editingAnnualBudget} onSave={fetchBudgets} onClose={() => setIsModalOpen(false)} />
                )}
            </Modal>
        </div>
    );
};

export default Budgets;
