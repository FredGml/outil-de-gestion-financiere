import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../services/electronDB';
import { Contact, ContactType } from '../types';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import SearchInput from '../components/ui/SearchInput';
import Input from '../components/ui/Input';
import { PlusIcon, EditIcon, TrashIcon, MailIcon, PhoneIcon, MapPinIcon } from '../components/icons/Icons';

const ContactForm: React.FC<{
    contact?: Contact | null;
    onSave: () => void;
    onClose: () => void;
}> = ({ contact, onSave, onClose }) => {
    const [name, setName] = useState('');
    const [type, setType] = useState<ContactType>('Client');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [notes, setNotes] = useState('');

    useEffect(() => {
        if (contact) {
            setName(contact.name);
            setType(contact.type);
            setEmail(contact.email || '');
            setPhone(contact.phone || '');
            setAddress(contact.address || '');
            setNotes(contact.notes || '');
        } else {
            setName('');
            setType('Client');
            setEmail('');
            setPhone('');
            setAddress('');
            setNotes('');
        }
    }, [contact]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const contactData: Contact = {
            name, type, email, phone, address, notes
        };
        if (contact && contact.id) {
            await db.contacts.update(contact.id, contactData);
        } else {
            await db.contacts.add(contactData);
        }
        onSave();
        onClose();
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Nom Complet / Raison Sociale" value={name} onChange={e => setName(e.target.value)} required />

            <div className="flex flex-col mb-4">
                <label className="mb-1 text-sm font-medium text-gray-700">Type de Contact</label>
                <select
                    value={type}
                    onChange={e => setType(e.target.value as ContactType)}
                    className="px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                    <option value="Client">Client</option>
                    <option value="Fournisseur">Fournisseur</option>
                    <option value="Employé">Employé</option>
                    <option value="Autre">Autre</option>
                </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
                <Input label="Téléphone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>

            <Input label="Adresse" value={address} onChange={e => setAddress(e.target.value)} />
            <Input label="Notes" value={notes} onChange={e => setNotes(e.target.value)} />

            <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="secondary" onClick={onClose}>Annuler</Button>
                <Button type="submit">Enregistrer</Button>
            </div>
        </form>
    );
};

const Contacts: React.FC = () => {
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingContact, setEditingContact] = useState<Contact | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchContacts = useCallback(async () => {
        const all = await db.contacts.toArray();
        if (searchTerm) {
            setContacts(all.filter(c =>
                c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()))
            ));
        } else {
            setContacts(all);
        }
    }, [searchTerm]);

    useEffect(() => {
        fetchContacts();
    }, [fetchContacts]);

    const handleAdd = () => {
        setEditingContact(null);
        setIsModalOpen(true);
    };

    const handleEdit = (contact: Contact) => {
        setEditingContact(contact);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (window.confirm('Êtes-vous sûr de vouloir supprimer ce contact ?')) {
            await db.contacts.delete(id);
            fetchContacts();
        }
    };

    const getTypeColor = (type: ContactType) => {
        switch (type) {
            case 'Client': return 'bg-blue-100 text-blue-800';
            case 'Fournisseur': return 'bg-purple-100 text-purple-800';
            case 'Employé': return 'bg-green-100 text-green-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Annuaire des Contacts</h2>
                <div className="flex items-center space-x-2">
                    <div className="w-64">
                        <SearchInput
                            placeholder="Rechercher nom, email..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            onClear={() => setSearchTerm('')}
                        />
                    </div>
                    <Button onClick={handleAdd} className="flex items-center">
                        <PlusIcon className="h-5 w-5 mr-1" /> Ajouter Contact
                    </Button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full bg-white">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nom</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Coordonnées</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {contacts.map(contact => (
                            <tr key={contact.id}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900">{contact.name}</div>
                                    {contact.notes && <div className="text-xs text-gray-500 italic">{contact.notes}</div>}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getTypeColor(contact.type)}`}>
                                        {contact.type}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    <div className="flex flex-col space-y-1">
                                        {contact.email && <span className="flex items-center text-xs"><MailIcon className="h-3 w-3 mr-1 text-gray-400" /> {contact.email}</span>}
                                        {contact.phone && <span className="flex items-center text-xs"><PhoneIcon className="h-3 w-3 mr-1 text-gray-400" /> {contact.phone}</span>}
                                        {contact.address && <span className="flex items-center text-xs"><MapPinIcon className="h-3 w-3 mr-1 text-gray-400" /> {contact.address}</span>}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-center">
                                    <div className="flex items-center justify-center space-x-4">
                                        <button onClick={() => handleEdit(contact)} className="text-primary-600 hover:text-primary-900"><EditIcon className="h-5 w-5" /></button>
                                        <button onClick={() => handleDelete(contact.id!)} className="text-red-600 hover:text-red-900"><TrashIcon className="h-5 w-5" /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {contacts.length === 0 && <p className="text-center text-gray-500 py-8">Aucun contact enregistré.</p>}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingContact ? 'Modifier Contact' : 'Ajouter Contact'}>
                <ContactForm contact={editingContact} onSave={fetchContacts} onClose={() => setIsModalOpen(false)} />
            </Modal>
        </div>
    );
};

export default Contacts;
