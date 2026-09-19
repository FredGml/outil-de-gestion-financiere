import React, { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '../services/electronDB';
import { Voucher } from '../types';
import { formatCurrency, getISODate, formatDate } from '../utils/formatter';
import { exportData, exportDataItem, generateMultiVoucherPDF } from '../services/exportService';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import SearchInput from '../components/ui/SearchInput';
import Input from '../components/ui/Input';
import AutocompleteInput from '../components/ui/AutocompleteInput';
import { PlusIcon, EditIcon, TrashIcon, ExportIcon } from '../components/icons/Icons';

const VoucherForm: React.FC<{
    voucher?: Voucher | null;
    onSave: () => void;
    onClose: () => void;
}> = ({ voucher, onSave, onClose }) => {
    const [voucherNumber, setVoucherNumber] = useState('');
    const [beneficiary, setBeneficiary] = useState('');
    const [reason, setReason] = useState('');
    const [amount, setAmount] = useState('');
    const [issueDate, setIssueDate] = useState(getISODate());

    useEffect(() => {
        if (voucher) {
            setVoucherNumber(voucher.voucherNumber);
            setBeneficiary(voucher.beneficiary);
            setReason(voucher.reason);
            setAmount(String(voucher.amount));
            setIssueDate(voucher.issueDate);
        } else {
            setVoucherNumber(`BON-${Date.now()}`);
            setBeneficiary('');
            setReason('');
            setAmount('');
            setIssueDate(getISODate());
        }
    }, [voucher]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const voucherData: Voucher = {
            voucherNumber, beneficiary, reason, amount: parseFloat(amount), issueDate
        };
        if (voucher && voucher.id) {
            await db.vouchers.update(voucher.id, voucherData);
        } else {
            await db.vouchers.add(voucherData);
        }
        onSave();
        onClose();
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Numéro du Bon" value={voucherNumber} onChange={e => setVoucherNumber(e.target.value)} required />
            <AutocompleteInput label="Bénéficiaire" value={beneficiary} onChange={setBeneficiary} required />
            <Input label="Motif" value={reason} onChange={e => setReason(e.target.value)} required />
            <Input label="Montant (F CFA)" type="number" value={amount} onChange={e => setAmount(e.target.value)} required />
            <Input label="Date d'émission" type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} required />
            <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="secondary" onClick={onClose}>Annuler</Button>
                <Button type="submit">Enregistrer</Button>
            </div>
        </form>
    );
};

const ActionsMenu: React.FC<{ voucher: Voucher }> = ({ voucher }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const handleExport = (format: 'pdf' | 'excel' | 'word') => {
        exportDataItem(format, voucher);
        setIsOpen(false);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={menuRef}>
            <button onClick={() => setIsOpen(!isOpen)} className="text-gray-500 hover:text-gray-700">
                <ExportIcon className="h-5 w-5" />
            </button>
            {isOpen && (
                <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                    <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                        <a href="#" onClick={(e) => { e.preventDefault(); handleExport('pdf'); }} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Exporter en PDF</a>
                        <a href="#" onClick={(e) => { e.preventDefault(); handleExport('excel'); }} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Exporter en Excel</a>
                        <a href="#" onClick={(e) => { e.preventDefault(); handleExport('word'); }} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Exporter en Word</a>
                    </div>
                </div>
            )}
        </div>
    );
}

const Vouchers: React.FC = () => {
    const [vouchers, setVouchers] = useState<Voucher[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedVouchers, setSelectedVouchers] = useState<number[]>([]);

    const fetchVouchers = useCallback(async () => {
        const all = await db.vouchers.toArray();
        let result = all;

        if (searchTerm) {
            result = result.filter(v =>
                v.voucherNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                v.beneficiary.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Sort by date desc (issueDate)
        result.sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());

        setVouchers(result);
    }, [searchTerm]);

    useEffect(() => {
        fetchVouchers();
    }, [fetchVouchers]);

    const handleAdd = () => {
        setEditingVoucher(null);
        setIsModalOpen(true);
    };

    const handleEdit = (voucher: Voucher) => {
        setEditingVoucher(voucher);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (window.confirm('Êtes-vous sûr de vouloir supprimer ce bon de caisse ?')) {
            await db.vouchers.delete(id);
            fetchVouchers();
        }
    };

    const handleExport = (format: 'pdf' | 'excel' | 'word') => {
        const columns = [
            { header: 'N° Bon', accessor: 'voucherNumber' },
            { header: 'Date', accessor: 'issueDate' },
            { header: 'Bénéficiaire', accessor: 'beneficiary' },
            { header: 'Motif', accessor: 'reason' },
            { header: 'Montant', accessor: 'amount' },
        ];
        const dataToExport = vouchers.map(v => ({ ...v, issueDate: formatDate(v.issueDate) }));
        exportData(format, 'Liste des Bons de Caisse', columns, dataToExport);
    };

    const handleSelect = (id: number) => {
        setSelectedVouchers(prev =>
            prev.includes(id) ? prev.filter(vid => vid !== id) : [...prev, id]
        );
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedVouchers(vouchers.map(v => v.id!));
        } else {
            setSelectedVouchers([]);
        }
    };

    const handleExportSelected = () => {
        const vouchersToExport = vouchers.filter(v => selectedVouchers.includes(v.id!));
        if (vouchersToExport.length > 0) {
            generateMultiVoucherPDF(vouchersToExport);
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Gestion des Bons de Caisse</h2>
                <div className="flex items-center space-x-2">
                    <div className="w-64">
                        <SearchInput
                            placeholder="Rechercher (n°, nom)..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            onClear={() => setSearchTerm('')}
                        />
                    </div>
                    <Button onClick={handleExportSelected} disabled={selectedVouchers.length === 0}>
                        Exporter Sélection (PDF)
                    </Button>
                    <Button onClick={() => handleExport('excel')}>Excel</Button>
                    <Button onClick={() => handleExport('word')}>Word</Button>
                    <Button onClick={handleAdd} className="flex items-center"><PlusIcon className="h-5 w-5 mr-1" /> Ajouter</Button>
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
                                    checked={vouchers.length > 0 && selectedVouchers.length === vouchers.length}
                                    aria-label="Sélectionner tout"
                                />
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">N° Bon</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bénéficiaire</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Montant</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {vouchers.map(voucher => (
                            <tr key={voucher.id}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <input
                                        type="checkbox"
                                        checked={selectedVouchers.includes(voucher.id!)}
                                        onChange={() => handleSelect(voucher.id!)}
                                        aria-label={`Sélectionner le bon ${voucher.voucherNumber}`}
                                    />
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{voucher.voucherNumber}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(voucher.issueDate)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{voucher.beneficiary}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{formatCurrency(voucher.amount)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                    <div className="flex items-center justify-center space-x-4">
                                        <ActionsMenu voucher={voucher} />
                                        <button onClick={() => handleEdit(voucher)} className="text-primary-600 hover:text-primary-900"><EditIcon className="h-5 w-5" /></button>
                                        <button onClick={() => handleDelete(voucher.id!)} className="text-red-600 hover:text-red-900"><TrashIcon className="h-5 w-5" /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingVoucher ? 'Modifier le bon' : 'Ajouter un bon'}>
                <VoucherForm voucher={editingVoucher} onSave={fetchVouchers} onClose={() => setIsModalOpen(false)} />
            </Modal>
        </div>
    );
};

export default Vouchers;