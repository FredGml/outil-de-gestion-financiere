import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '../services/electronDB';
import { Invoice, InvoiceItem, InvoiceStatus } from '../types';
import { formatCurrency, getISODate, formatDate } from '../utils/formatter';
import { exportData, generateMultiInvoicePDF } from '../services/exportService';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import SearchInput from '../components/ui/SearchInput';
import Input from '../components/ui/Input';
import AutocompleteInput from '../components/ui/AutocompleteInput';
import { PlusIcon, EditIcon, TrashIcon } from '../components/icons/Icons';

const InvoiceForm: React.FC<{
    invoice?: Invoice | null;
    onSave: () => void;
    onClose: () => void;
}> = ({ invoice, onSave, onClose }) => {
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [clientName, setClientName] = useState('');
    const [issueDate, setIssueDate] = useState(getISODate());
    const [dueDate, setDueDate] = useState(getISODate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))); // 30 days later
    const [status, setStatus] = useState<InvoiceStatus>(InvoiceStatus.EnAttente);
    const [items, setItems] = useState<InvoiceItem[]>([{ description: '', quantity: '' as any, unitPrice: '' as any }]);

    const totalAmount = useMemo(() => items.reduce((sum, item) => {
        const qty = typeof item.quantity === 'number' ? item.quantity : parseFloat(item.quantity as any) || 0;
        const price = typeof item.unitPrice === 'number' ? item.unitPrice : parseFloat(item.unitPrice as any) || 0;
        return sum + (qty * price);
    }, 0), [items]);

    useEffect(() => {
        if (invoice) {
            setInvoiceNumber(invoice.invoiceNumber);
            setClientName(invoice.clientName);
            setIssueDate(invoice.issueDate);
            setDueDate(invoice.dueDate);
            setStatus(invoice.status);
            setItems(invoice.items);
        } else {
            setInvoiceNumber(`FACT-${Date.now()}`);
            setClientName('');
            setIssueDate(getISODate());
            setDueDate(getISODate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)));
            setStatus(InvoiceStatus.EnAttente);
            setItems([{ description: '', quantity: '' as any, unitPrice: '' as any }]);
        }
    }, [invoice]);

    const handleItemChange = (index: number, field: keyof InvoiceItem, value: string | number) => {
        const newItems = [...items];
        (newItems[index] as any)[field] = value;
        setItems(newItems);
    };

    const addItem = () => {
        setItems([...items, { description: '', quantity: '' as any, unitPrice: '' as any }]);
    };

    const removeItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Normaliser les items pour s'assurer que quantity et unitPrice sont des nombres
        const normalizedItems = items.map(item => ({
            description: item.description,
            quantity: typeof item.quantity === 'number' ? item.quantity : parseFloat(item.quantity as any) || 0,
            unitPrice: typeof item.unitPrice === 'number' ? item.unitPrice : parseFloat(item.unitPrice as any) || 0
        }));

        const invoiceData: Invoice = {
            invoiceNumber,
            clientName,
            issueDate,
            dueDate,
            items: normalizedItems,
            totalAmount,
            status
        };

        if (invoice && invoice.id) {
            await db.invoices.update(invoice.id, invoiceData);
        } else {
            await db.invoices.add(invoiceData);
        }
        onSave();
        onClose();
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Numéro de Facture" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} required />
                <AutocompleteInput label="Nom du Client" value={clientName} onChange={setClientName} required />
                <Input label="Date d'émission" type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} required />
                <Input label="Date d'échéance" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} required />
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                    <select value={status} onChange={e => setStatus(e.target.value as InvoiceStatus)} className="block w-full px-3 py-2 border border-gray-300 rounded-md">
                        {Object.values(InvoiceStatus).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
            </div>

            <h4 className="text-lg font-semibold pt-4 border-t mt-4">Articles</h4>

            {/* En-têtes des colonnes */}
            <div className="grid grid-cols-12 gap-2 mb-2">
                <div className="col-span-6">
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                </div>
                <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Quantité</label>
                </div>
                <div className="col-span-3">
                    <label className="block text-sm font-medium text-gray-700">Prix Unitaire (F CFA)</label>
                </div>
                <div className="col-span-1">
                    <label className="block text-sm font-medium text-gray-700">&nbsp;</label>
                </div>
            </div>

            {items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-center mb-2">
                    <div className="col-span-6">
                        <Input
                            placeholder="Ex: Consultation, Produit, Service..."
                            value={item.description}
                            onChange={e => handleItemChange(index, 'description', e.target.value)}
                            required
                        />
                    </div>
                    <div className="col-span-2">
                        <Input
                            type="number"
                            placeholder="1"
                            value={item.quantity || ''}
                            onChange={e => handleItemChange(index, 'quantity', e.target.value === '' ? '' : parseFloat(e.target.value))}
                            required
                            min="0"
                            step="0.01"
                        />
                    </div>
                    <div className="col-span-3">
                        <Input
                            type="number"
                            placeholder="0.00"
                            value={item.unitPrice || ''}
                            onChange={e => handleItemChange(index, 'unitPrice', e.target.value === '' ? '' : parseFloat(e.target.value))}
                            required
                            min="0"
                            step="0.01"
                        />
                    </div>
                    <div className="col-span-1">
                        <Button
                            type="button"
                            variant="danger"
                            onClick={() => removeItem(index)}
                            disabled={items.length === 1}
                        >
                            &times;
                        </Button>
                    </div>
                </div>
            ))}
            <Button type="button" variant="secondary" onClick={addItem}>Ajouter un article</Button>

            <div className="text-right font-bold text-xl pt-4">Total: {formatCurrency(totalAmount)}</div>

            <div className="flex justify-end space-x-2 pt-4 border-t mt-4">
                <Button type="button" variant="secondary" onClick={onClose}>Annuler</Button>
                <Button type="submit">Enregistrer</Button>
            </div>
        </form>
    );
};


const Invoices: React.FC = () => {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
    const [searchTerm, setSearchTerm] = useState(() => {
        const term = sessionStorage.getItem('globalSearchTerm');
        if (term) {
            sessionStorage.removeItem('globalSearchTerm');
            return term;
        }
        return '';
    });
    const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all');
    const [selectedInvoices, setSelectedInvoices] = useState<number[]>([]);

    const fetchInvoices = useCallback(async () => {
        let allInvoices;
        if (statusFilter !== 'all') {
            const query = await db.invoices.where('status').equals(statusFilter);
            allInvoices = await query.reverse().toArray();
        } else {
            allInvoices = await db.invoices.orderBy('issueDate').reverse().toArray();
        }

        if (searchTerm) {
            setInvoices(allInvoices.filter(inv =>
                inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                inv.clientName.toLowerCase().includes(searchTerm.toLowerCase())
            ));
        } else {
            setInvoices(allInvoices);
        }
    }, [searchTerm, statusFilter]);

    useEffect(() => {
        fetchInvoices();
    }, [fetchInvoices]);

    const handleAdd = () => {
        setEditingInvoice(null);
        setIsModalOpen(true);
    };

    const handleEdit = (invoice: Invoice) => {
        setEditingInvoice(invoice);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (window.confirm('Êtes-vous sûr de vouloir supprimer cette facture ?')) {
            await db.invoices.delete(id);
            fetchInvoices();
        }
    };

    const handleExport = (format: 'excel' | 'word' | 'pdf') => {
        const columns = [
            { header: 'N° Facture', accessor: 'invoiceNumber' },
            { header: 'Client', accessor: 'clientName' },
            { header: "Date d'émission", accessor: 'issueDate' },
            { header: "Date d'échéance", accessor: 'dueDate' },
            { header: 'Montant Total', accessor: 'totalAmount' },
            { header: 'Statut', accessor: 'status' },
        ];
        const dataToExport = invoices.map(i => ({ ...i, issueDate: formatDate(i.issueDate), dueDate: formatDate(i.dueDate) }));
        exportData(format, 'Liste des Factures', columns, dataToExport);
    };

    const handleSelect = (id: number) => {
        setSelectedInvoices(prev =>
            prev.includes(id) ? prev.filter(vid => vid !== id) : [...prev, id]
        );
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedInvoices(invoices.map(v => v.id!));
        } else {
            setSelectedInvoices([]);
        }
    };

    const handleExportSelected = () => {
        const invoicesToExport = invoices.filter(v => selectedInvoices.includes(v.id!));
        if (invoicesToExport.length > 0) {
            generateMultiInvoicePDF(invoicesToExport);
        }
    };

    const getStatusColor = (status: InvoiceStatus) => {
        switch (status) {
            case InvoiceStatus.Payee: return 'bg-green-100 text-green-800';
            case InvoiceStatus.EnAttente: return 'bg-yellow-100 text-yellow-800';
            case InvoiceStatus.EnRetard: return 'bg-red-100 text-red-800';
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Gestion des Factures</h2>
                <div className="flex items-center space-x-2">
                    <div className="w-64">
                        <SearchInput
                            placeholder="Rechercher (numéro, client)..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            onClear={() => setSearchTerm('')}
                        />
                    </div>
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className="px-3 py-2 border border-gray-300 rounded-md">
                        <option value="all">Tous les statuts</option>
                        {Object.values(InvoiceStatus).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <Button onClick={handleExportSelected} disabled={selectedInvoices.length === 0}>
                        Exporter la sélection ({selectedInvoices.length})
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
                                    checked={invoices.length > 0 && selectedInvoices.length === invoices.length}
                                    aria-label="Sélectionner tout"
                                />
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">N° Facture</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date d'émission</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Montant Total</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Statut</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {invoices.map(invoice => (
                            <tr key={invoice.id}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <input
                                        type="checkbox"
                                        checked={selectedInvoices.includes(invoice.id!)}
                                        onChange={() => handleSelect(invoice.id!)}
                                        aria-label={`Sélectionner la facture ${invoice.invoiceNumber}`}
                                    />
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{invoice.invoiceNumber}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{invoice.clientName}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(invoice.issueDate)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{formatCurrency(invoice.totalAmount)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                                        {invoice.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-center">
                                    <div className="flex items-center justify-center space-x-4">
                                        <button onClick={() => handleEdit(invoice)} className="text-primary-600 hover:text-primary-900"><EditIcon className="h-5 w-5" /></button>
                                        <button onClick={() => handleDelete(invoice.id!)} className="text-red-600 hover:text-red-900"><TrashIcon className="h-5 w-5" /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingInvoice ? 'Modifier la facture' : 'Ajouter une facture'}>
                <InvoiceForm invoice={editingInvoice} onSave={fetchInvoices} onClose={() => setIsModalOpen(false)} />
            </Modal>
        </div>
    );
};

export default Invoices;