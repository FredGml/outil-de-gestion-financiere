import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../services/electronDB';
import { Salary } from '../types';
import { formatCurrency, getISODate, formatDate } from '../utils/formatter';
import { exportData, exportDataItem } from '../services/exportService';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import SearchInput from '../components/ui/SearchInput';
import Input from '../components/ui/Input';
import AutocompleteInput from '../components/ui/AutocompleteInput';
import { PlusIcon, EditIcon, TrashIcon, PrintIcon } from '../components/icons/Icons';

const SalaryForm: React.FC<{
    salary?: Salary | null;
    onSave: () => void;
    onClose: () => void;
}> = ({ salary, onSave, onClose }) => {
    const [employeeName, setEmployeeName] = useState('');
    const [period, setPeriod] = useState('');
    const [amount, setAmount] = useState('');
    const [paymentDate, setPaymentDate] = useState(getISODate());
    const [notes, setNotes] = useState('');

    useEffect(() => {
        if (salary) {
            setEmployeeName(salary.employeeName);
            setPeriod(salary.period);
            setAmount(String(salary.amount));
            setPaymentDate(salary.paymentDate);
            setNotes(salary.notes || '');
        } else {
            setEmployeeName('');
            // Default period to current month
            const now = new Date();
            const monthName = now.toLocaleString('fr-FR', { month: 'long', year: 'numeric' });
            setPeriod(monthName.charAt(0).toUpperCase() + monthName.slice(1));
            setAmount('');
            setPaymentDate(getISODate());
            setNotes('');
        }
    }, [salary]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const salaryData: Salary = {
            employeeName, period, amount: parseFloat(amount), paymentDate, notes
        };
        if (salary && salary.id) {
            await db.salaries.update(salary.id, salaryData);
        } else {
            await db.salaries.add(salaryData);
        }
        onSave();
        onClose();
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <AutocompleteInput label="Nom de l'Employé" value={employeeName} onChange={setEmployeeName} required />
            <Input label="Période (Mois/Année)" value={period} onChange={e => setPeriod(e.target.value)} placeholder="ex: Mars 2024" required />
            <Input label="Montant Net (F CFA)" type="number" value={amount} onChange={e => setAmount(e.target.value)} required />
            <Input label="Date de Paiement" type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} required />
            <Input label="Notes / Motif" value={notes} onChange={e => setNotes(e.target.value)} />

            <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="secondary" onClick={onClose}>Annuler</Button>
                <Button type="submit">Enregistrer</Button>
            </div>
        </form>
    );
};

const Salaries: React.FC = () => {
    const [salaries, setSalaries] = useState<Salary[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSalary, setEditingSalary] = useState<Salary | null>(null);
    const [searchTerm, setSearchTerm] = useState(() => {
        const term = sessionStorage.getItem('globalSearchTerm');
        if (term) {
            sessionStorage.removeItem('globalSearchTerm');
            return term;
        }
        return '';
    });

    const fetchSalaries = useCallback(async () => {
        const all = await db.salaries.toArray();
        if (searchTerm) {
            setSalaries(all.filter(s =>
                s.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.period.toLowerCase().includes(searchTerm.toLowerCase())
            ));
        } else {
            setSalaries(all);
        }
    }, [searchTerm]);

    useEffect(() => {
        fetchSalaries();
    }, [fetchSalaries]);

    const handleAdd = () => {
        setEditingSalary(null);
        setIsModalOpen(true);
    };

    const handleEdit = (salary: Salary) => {
        setEditingSalary(salary);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (window.confirm('Êtes-vous sûr de vouloir supprimer ce paiement ?')) {
            await db.salaries.delete(id);
            fetchSalaries();
        }
    };

    const handlePrintPayload = (salary: Salary) => {
        exportDataItem('pdf', salary);
    };

    const handleExportList = () => {
        const columns = [
            { header: 'Date', accessor: 'paymentDate' },
            { header: 'Employé', accessor: 'employeeName' },
            { header: 'Période', accessor: 'period' },
            { header: 'Montant', accessor: 'amount' },
        ];
        const data = salaries.map(s => ({ ...s, paymentDate: formatDate(s.paymentDate) }));
        exportData('excel', 'Historique des Salaires', columns, data);
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Gestion des Salaires</h2>
                <div className="flex items-center space-x-2">
                    <div className="w-64">
                        <SearchInput
                            placeholder="Rechercher..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            onClear={() => setSearchTerm('')}
                        />
                    </div>
                    <Button onClick={handleExportList}>Exporter (Excel)</Button>
                    <Button onClick={handleAdd} className="flex items-center">
                        <PlusIcon className="h-5 w-5 mr-1" /> Ajouter Paiement
                    </Button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full bg-white">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employé</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Période</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date Paiement</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Montant</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {salaries.map(salary => (
                            <tr key={salary.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{salary.employeeName}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{salary.period}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(salary.paymentDate)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{formatCurrency(salary.amount)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-center">
                                    <div className="flex items-center justify-center space-x-3">
                                        <button onClick={() => handlePrintPayload(salary)} title="Imprimer Bordereau" className="text-blue-600 hover:text-blue-900 border border-blue-600 rounded p-1"><PrintIcon className="h-4 w-4" /></button>
                                        <button onClick={() => handleEdit(salary)} className="text-primary-600 hover:text-primary-900"><EditIcon className="h-5 w-5" /></button>
                                        <button onClick={() => handleDelete(salary.id!)} className="text-red-600 hover:text-red-900"><TrashIcon className="h-5 w-5" /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {salaries.length === 0 && <p className="text-center text-gray-500 py-8">Aucun paiement de salaire enregistré.</p>}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingSalary ? 'Modifier paiement' : 'Nouveau paiement salaire'}>
                <SalaryForm salary={editingSalary} onSave={fetchSalaries} onClose={() => setIsModalOpen(false)} />
            </Modal>
        </div>
    );
};

export default Salaries;
