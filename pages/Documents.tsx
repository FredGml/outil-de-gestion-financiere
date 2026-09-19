
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '../services/electronDB';
import { DocumentFile } from '../types';
import Button from '../components/ui/Button';
import { formatDate, getISODate } from '../utils/formatter';
import { PlusIcon, DownloadIcon, TrashIcon } from '../components/icons/Icons';
import SearchInput from '../components/ui/SearchInput';

const Documents: React.FC = () => {
    const [documents, setDocuments] = useState<DocumentFile[]>([]);
    const [searchTerm, setSearchTerm] = useState(() => {
        const term = sessionStorage.getItem('globalSearchTerm');
        if (term) {
            sessionStorage.removeItem('globalSearchTerm');
            return term;
        }
        return '';
    });
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchDocuments = useCallback(async () => {
        const allDocs = await db.documents.orderBy('uploadDate').reverse().toArray();
        if (searchTerm) {
            setDocuments(allDocs.filter(doc =>
                doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                doc.type.toLowerCase().includes(searchTerm.toLowerCase())
            ));
        } else {
            setDocuments(allDocs);
        }
    }, [searchTerm]);

    useEffect(() => {
        fetchDocuments();
    }, [fetchDocuments]);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        const newDocs: Omit<DocumentFile, 'id'>[] = [];
        const fileReaders: Promise<void>[] = [];

        Array.from(files).forEach((file: File) => {
            const promise = new Promise<void>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const base64Data = reader.result as string;
                    newDocs.push({
                        name: file.name,
                        type: file.type,
                        uploadDate: getISODate(),
                        fileData: base64Data, // Store as base64 string
                    });
                    resolve();
                };
                reader.readAsDataURL(file);
            });
            fileReaders.push(promise);
        });

        await Promise.all(fileReaders);

        // Use bulkAdd if available, otherwise loop
        if (newDocs.length > 0) {
            await db.documents.bulkAdd(newDocs);
            fetchDocuments();

            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleDownload = (doc: DocumentFile) => {
        // Convert base64 back to Blob if it's a string
        let blob: Blob;
        if (typeof doc.fileData === 'string') {
            // Extract base64 data (remove data:mime;base64, prefix)
            const base64Data = doc.fileData.split(',')[1];
            const byteCharacters = atob(base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            blob = new Blob([byteArray], { type: doc.type });
        } else {
            blob = doc.fileData;
        }

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = doc.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleDelete = async (id: number) => {
        if (window.confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) {
            await db.documents.delete(id);
            fetchDocuments();
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Gestion des Documents</h2>
                <div className="flex items-center space-x-2">
                    <div className="w-64">
                        <SearchInput
                            placeholder="Rechercher document..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            onClear={() => setSearchTerm('')}
                        />
                    </div>
                    <Button onClick={handleUploadClick} className="flex items-center">
                        <PlusIcon className="h-5 w-5 mr-1" /> Uploader
                    </Button>
                </div>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    multiple
                />
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full bg-white">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nom du Fichier</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date d'Upload</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {documents.map(doc => (
                            <tr key={doc.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{doc.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{doc.type}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(doc.uploadDate)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-center">
                                    <button onClick={() => handleDownload(doc)} className="text-primary-600 hover:text-primary-900 mr-4">
                                        <DownloadIcon className="h-5 w-5" />
                                    </button>
                                    <button onClick={() => handleDelete(doc.id!)} className="text-red-600 hover:text-red-900">
                                        <TrashIcon className="h-5 w-5" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {documents.length === 0 && <p className="text-center text-gray-500 py-8">Aucun document trouvé. Cliquez sur "Uploader un Document" pour commencer.</p>}
        </div>
    );
};

export default Documents;
