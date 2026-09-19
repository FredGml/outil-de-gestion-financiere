import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../services/electronDB';
import { Recette } from '../types';
import { formatCurrency, getISODate, formatDate } from '../utils/formatter';
import { exportData, generateMultiRecettePDF } from '../services/exportService';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import SearchInput from '../components/ui/SearchInput';
import Input from '../components/ui/Input';
import { PlusIcon, EditIcon, TrashIcon } from '../components/icons/Icons';

const RecetteForm: React.FC<{
    recette?: Recette | null;
    onSave: () => void;
    onClose: () => void;
}> = ({ recette, onSave, onClose }) => {
    const [description, setDescription] = useState('');
    const [source, setSource] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(getISODate());

    useEffect(() => {
        if (recette) {
            setDescription(recette.description);
            setSource(recette.source);
            setAmount(String(recette.amount));
            setDate(recette.date);
        } else {
            setDescription('');
            setSource('');
            setAmount('');
            setDate(getISODate());
        }
    }, [recette]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const recetteData: Recette = {
            description, source, amount: parseFloat(amount), date
        };
        if (recette && recette.id) {
            await db.recettes.update(recette.id, recetteData);
        } else {
            await db.recettes.add(recetteData);
        }
        onSave();
        onClose();
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Description" value={description} onChange={e => setDescription(e.target.value)} required />
            <Input label="Source" value={source} onChange={e => setSource(e.target.value)} required />
            <Input label="Montant (F CFA)" type="number" value={amount} onChange={e => setAmount(e.target.value)} required />
            <Input label="Date" type="date" value={date} onChange={e => setDate(e.target.value)} required />
            <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="secondary" onClick={onClose}>Annuler</Button>
                <Button type="submit">Enregistrer</Button>
            </div>
        </form>
    );
};

const Recettes: React.FC = () => {
    const [recettes, setRecettes] = useState<Recette[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRecette, setEditingRecette] = useState<Recette | null>(null);
    const [searchTerm, setSearchTerm] = useState(() => {
        const term = sessionStorage.getItem('globalSearchTerm');
        if (term) {
            sessionStorage.removeItem('globalSearchTerm');
            return term;
        }
        return '';
    });
    const [selectedRecettes, setSelectedRecettes] = useState<number[]>([]);

    const fetchRecettes = useCallback(async () => {
        const all = await db.recettes.toArray();
        let result = all;

        if (searchTerm) {
            result = result.filter(r =>
                r.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                r.source.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Sort by date desc
        result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        setRecettes(result);
    }, [searchTerm]);

    useEffect(() => {
        fetchRecettes();
    }, [fetchRecettes]);

    const handleAdd = () => {
        setEditingRecette(null);
        setIsModalOpen(true);
    };

    const handleEdit = (recette: Recette) => {
        setEditingRecette(recette);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (window.confirm('Êtes-vous sûr de vouloir supprimer cette recette ?')) {
            await db.recettes.delete(id);
            fetchRecettes();
        }
    };

    const handleExport = (format: 'excel' | 'word' | 'pdf') => {
        const columns = [
            { header: 'Date', accessor: 'date' },
            { header: 'Description', accessor: 'description' },
            { header: 'Source', accessor: 'source' },
            { header: 'Montant', accessor: 'amount' },
        ];
        const dataToExport = recettes.map(r => ({ ...r, date: formatDate(r.date) }));
        exportData(format, 'Liste des Recettes', columns, dataToExport);
    };

    const handleSelect = (id: number) => {
        setSelectedRecettes(prev =>
            prev.includes(id) ? prev.filter(rid => rid !== id) : [...prev, id]
        );
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedRecettes(recettes.map(r => r.id!));
        } else {
            setSelectedRecettes([]);
        }
    };

    const handleExportSelected = () => {
        const recettesToExport = recettes.filter(r => selectedRecettes.includes(r.id!));
        if (recettesToExport.length > 0) {
            generateMultiRecettePDF(recettesToExport);
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Gestion des Recettes</h2>
                <div className="flex items-center space-x-2">
                    <div className="w-64">
                        <SearchInput
                            placeholder="Rechercher (description, source)..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            onClear={() => setSearchTerm('')}
                        />
                    </div>
                    <Button onClick={handleExportSelected} disabled={selectedRecettes.length === 0}>
                        Exporter la sélection ({selectedRecettes.length})
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
                                    checked={recettes.length > 0 && selectedRecettes.length === recettes.length}
                                    aria-label="Sélectionner tout"
                                />
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Montant</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {recettes.map(recette => (
                            <tr key={recette.id}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <input
                                        type="checkbox"
                                        checked={selectedRecettes.includes(recette.id!)}
                                        onChange={() => handleSelect(recette.id!)}
                                        aria-label={`Sélectionner la recette ${recette.description}`}
                                    />
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(recette.date)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{recette.description}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{recette.source}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{formatCurrency(recette.amount)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-center">
                                    <div className="flex items-center justify-center space-x-4">
                                        <button onClick={() => handleEdit(recette)} className="text-primary-600 hover:text-primary-900"><EditIcon className="h-5 w-5" /></button>
                                        <button onClick={() => handleDelete(recette.id!)} className="text-red-600 hover:text-red-900"><TrashIcon className="h-5 w-5" /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingRecette ? 'Modifier la recette' : 'Ajouter une recette'}>
                <RecetteForm recette={editingRecette} onSave={fetchRecettes} onClose={() => setIsModalOpen(false)} />
            </Modal>
        </div>
    );
};

export default Recettes;