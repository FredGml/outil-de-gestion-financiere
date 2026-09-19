import React, { useRef, useState, useEffect } from 'react';
import { db } from '../services/electronDB';
import { authService } from '../services/authService';
import { OrganizationConfig } from '../types';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { ExportIcon, UploadIcon, RefreshIcon, TrashIcon } from '../components/icons/Icons';

const Settings: React.FC = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const resetPasswordRef = useRef<HTMLInputElement>(null);

    // Force focus when reset modal opens


    // Organization config state
    const [orgConfig, setOrgConfig] = useState<OrganizationConfig>({
        name: '',
        registrationNumber: '',
        phone: '',
        email: '',
        brandColor: '#167d7e',
        logo: '',
    });
    const [hasConfig, setHasConfig] = useState(false);
    const [logoPreview, setLogoPreview] = useState<string>('');
    const logoInputRef = useRef<HTMLInputElement>(null);

    // Factory Reset State
    const [showResetModal1, setShowResetModal1] = useState(false);
    const [showResetModal2, setShowResetModal2] = useState(false);
    const [resetPassword, setResetPassword] = useState('');

    // Force focus when reset modal opens
    useEffect(() => {
        if (showResetModal2) {
            setTimeout(() => {
                if (resetPasswordRef.current) {
                    resetPasswordRef.current.focus();
                }
            }, 150);
        }
    }, [showResetModal2]);

    const handleInitiateReset = () => {
        setShowResetModal1(true);
    };

    const handleFinalReset = async () => {
        if (!resetPassword) return;
        setIsLoading(true);
        try {
            const result = await db.system.factoryReset(resetPassword);
            if (result.success) {
                alert('Réinitialisation terminée. L\'application va redémarrer.');
                window.location.reload();
            } else {
                alert(`Erreur : ${result.error || 'Mot de passe incorrect'}`);
                setIsLoading(false);
            }
        } catch (error) {
            console.error('Reset failed', error);
            alert('Une erreur système est survenue.');
            setIsLoading(false);
        }
    };

    const [cloudPath, setCloudPath] = useState<string | null>(null);
    const [lastCloudBackup, setLastCloudBackup] = useState<string | null>(null);

    useEffect(() => {
        loadOrganizationConfig();
        loadCloudConfig();
    }, []);

    const loadCloudConfig = async () => {
        try {
            const config = await db.backup.getCloudConfig();
            setCloudPath(config.path);
            setLastCloudBackup(config.lastBackup);
        } catch (error) {
            console.error(error);
        }
    };

    const handleConfigureCloud = async () => {
        try {
            const path = await db.backup.selectCloudFolder();
            if (path) {
                await db.backup.setCloudPath(path);
                // Reload config
                loadCloudConfig();
                alert(`Configuration réussie !\n\nDossier Cloud : ${path}\n\nVos futures sauvegardes seront automatiquement copiées ici.`);
            }
        } catch (error) {
            console.error(error);
            alert("Erreur lors de la configuration du dossier.");
        }
    };

    const loadOrganizationConfig = async () => {
        try {
            const configs = await db.organizationConfig.toArray();
            if (configs.length > 0) {
                setOrgConfig(configs[0]);
                setHasConfig(true);
                if (configs[0].logo) {
                    setLogoPreview(configs[0].logo);
                }
            }
        } catch (error) {
            console.error('Erreur lors du chargement de la configuration:', error);
        }
    };

    const handleOrgChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setOrgConfig(prev => ({ ...prev, [name]: value }));
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            setFeedback({ type: 'error', message: 'Veuillez sélectionner une image valide (PNG, JPG, etc.)' });
            return;
        }

        // Validate file size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            setFeedback({ type: 'error', message: 'Le fichier est trop volumineux. Taille maximale : 2MB' });
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            setOrgConfig(prev => ({ ...prev, logo: base64String }));
            setLogoPreview(base64String);
        };
        reader.readAsDataURL(file);
    };

    const handleRemoveLogo = () => {
        setOrgConfig(prev => ({ ...prev, logo: '' }));
        setLogoPreview('');
        if (logoInputRef.current) {
            logoInputRef.current.value = '';
        }
    };

    const handleSaveOrganization = async () => {
        if (!orgConfig.name?.trim() && !orgConfig.logo) {
            setFeedback({ type: 'error', message: 'Veuillez fournir soit un nom, soit un logo pour votre organisation.' });
            return;
        }

        setIsLoading(true);
        setFeedback(null);
        try {
            if (hasConfig && orgConfig.id) {
                await db.organizationConfig.update(orgConfig.id, {
                    ...orgConfig,
                    isConfigured: true,
                });
            } else {
                await db.organizationConfig.add({
                    ...orgConfig,
                    isConfigured: true,
                });
            }
            setFeedback({ type: 'success', message: 'Configuration sauvegardée avec succès !' });
            await loadOrganizationConfig();
        } catch (error) {
            console.error('Erreur lors de la sauvegarde:', error);
            setFeedback({ type: 'error', message: 'Erreur lors de la sauvegarde.' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetOrganization = async () => {
        if (!window.confirm('Êtes-vous sûr de vouloir réinitialiser les informations de votre organisation ?')) {
            return;
        }

        setIsLoading(true);
        setFeedback(null);
        try {
            await db.organizationConfig.clear();
            setOrgConfig({
                name: '',
                registrationNumber: '',
                phone: '',
                email: '',
                brandColor: '#167d7e',
                logo: '',
            });
            setLogoPreview('');
            setHasConfig(false);
            setFeedback({ type: 'success', message: 'Configuration réinitialisée.' });
        } catch (error) {
            console.error('Erreur lors de la réinitialisation:', error);
            setFeedback({ type: 'error', message: 'Erreur lors de la réinitialisation.' });
        } finally {
            setIsLoading(false);
        }
    };

    const blobToBase64 = (blob: Blob): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    };

    const base64ToBlob = (base64: string, type: string): Blob => {
        const byteCharacters = atob(base64.split(',')[1]);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        return new Blob([byteArray], { type });
    };

    const handleExport = async () => {
        setIsLoading(true);
        setFeedback(null);
        try {
            const expenses = await db.expenses.toArray();
            const invoices = await db.invoices.toArray();
            const vouchers = await db.vouchers.toArray();
            const recettes = await db.recettes.toArray();
            const documents = await db.documents.toArray();
            const salaries = await db.salaries.toArray();
            const contacts = await db.contacts.toArray();
            const budgets = await db.budgets.toArray();
            const annualBudgets = await db.annualBudgets.toArray();
            const organizationConfig = await db.organizationConfig.toArray();
            const authData = await authService.getData();

            const serializableDocuments = await Promise.all(
                documents.map(async (doc) => ({
                    ...doc,
                    // Convert to base64 only if it's a Blob, otherwise keep the string
                    fileData: typeof doc.fileData === 'string' ? doc.fileData : await blobToBase64(doc.fileData),
                }))
            );

            const dataToExport = {
                expenses,
                invoices,
                vouchers,
                recettes,
                documents: serializableDocuments,
                salaries,
                contacts,
                budgets,
                annualBudgets,
                organizationConfig,
                auth: authData ? [authData] : [],
            };

            const json = JSON.stringify(dataToExport, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `backup-gestion-financiere-${new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').split('.')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            setFeedback({ type: 'success', message: 'Exportation réussie !' });
        } catch (error) {
            console.error("Erreur d'exportation:", error);
            setFeedback({ type: 'error', message: "L'exportation a échoué." });
        } finally {
            setIsLoading(false);
        }
    };


    return (
        <div className="space-y-6">
            {/* Organization Configuration Section */}
            <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="mb-6">
                    <h2 className="text-xl font-semibold mb-2">Informations de l'Organisation</h2>
                    <p className="text-gray-600">Ces informations apparaîtront sur vos documents exportés (bons de caisse, factures, etc.).</p>
                </div>

                <div className="space-y-4">
                    <div>
                        <label htmlFor="org-name" className="block text-sm font-medium text-gray-700 mb-2">
                            Nom de l'Organisation / Entreprise
                        </label>
                        <Input
                            id="org-name"
                            name="name"
                            type="text"
                            value={orgConfig.name}
                            onChange={handleOrgChange}
                            placeholder="Ex: Mon Organisation"
                        />
                    </div>

                    {/* Logo Upload Section */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Logo de l'Organisation
                        </label>
                        <div className="flex items-start gap-4">
                            <div className="flex-1">
                                <input
                                    ref={logoInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleLogoUpload}
                                    className="hidden"
                                    id="org-logo-upload"
                                />
                                <label
                                    htmlFor="org-logo-upload"
                                    className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                                >
                                    <UploadIcon className="h-4 w-4 mr-2" /> Choisir une image
                                </label>
                                <p className="text-xs text-gray-500 mt-2">
                                    PNG, JPG ou GIF (max. 2MB)
                                </p>
                            </div>
                            {logoPreview && (
                                <div className="relative">
                                    <img
                                        src={logoPreview}
                                        alt="Logo preview"
                                        className="w-24 h-24 object-contain border-2 border-gray-200 rounded-lg bg-gray-50"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleRemoveLogo}
                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                                    >
                                        <TrashIcon className="h-3 w-3" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div>
                        <label htmlFor="org-regnum" className="block text-sm font-medium text-gray-700 mb-2">
                            Numéro d'Enregistrement
                        </label>
                        <Input
                            id="org-regnum"
                            name="registrationNumber"
                            type="text"
                            value={orgConfig.registrationNumber || ''}
                            onChange={handleOrgChange}
                            placeholder="Ex: 2024/123/DEP-XX/XX/XX"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="org-phone" className="block text-sm font-medium text-gray-700 mb-2">
                                Téléphone
                            </label>
                            <Input
                                id="org-phone"
                                name="phone"
                                type="tel"
                                value={orgConfig.phone || ''}
                                onChange={handleOrgChange}
                                placeholder="Ex: 01 23 45 67 89"
                            />
                        </div>

                        <div>
                            <label htmlFor="org-email" className="block text-sm font-medium text-gray-700 mb-2">
                                Email
                            </label>
                            <Input
                                id="org-email"
                                name="email"
                                type="email"
                                value={orgConfig.email || ''}
                                onChange={handleOrgChange}
                                placeholder="Ex: contact@organisation.com"
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="org-color" className="block text-sm font-medium text-gray-700 mb-2">
                            Couleur de marque (pour les documents)
                        </label>
                        <div className="flex items-center gap-3">
                            <input
                                id="org-color"
                                name="brandColor"
                                type="color"
                                value={orgConfig.brandColor || '#167d7e'}
                                onChange={handleOrgChange}
                                className="h-10 w-20 cursor-pointer rounded border border-gray-300"
                            />
                            <Input
                                type="text"
                                value={orgConfig.brandColor || '#167d7e'}
                                onChange={handleOrgChange}
                                name="brandColor"
                                placeholder="#167d7e"
                                className="flex-1"
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <Button onClick={handleSaveOrganization} disabled={isLoading}>
                            {isLoading ? 'Enregistrement...' : 'Enregistrer'}
                        </Button>
                        {hasConfig && (
                            <Button variant="secondary" onClick={handleResetOrganization} disabled={isLoading}>
                                Réinitialiser
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Data Management Section */}
            <div className="bg-white p-6 rounded-lg shadow-md space-y-8">
                <div>
                    <h2 className="text-xl font-semibold mb-2">Gestion des Données</h2>
                    <p className="text-gray-600">Sauvegardez ou restaurez l'ensemble des données de votre application.</p>
                </div>

                <div className="p-4 border rounded-lg bg-indigo-50 border-indigo-200">
                    <h3 className="font-semibold text-lg mb-2 text-indigo-900">🛡️ Sauvegarde Cloud (Anti-Perte)</h3>
                    <p className="text-sm text-indigo-800 mb-4">
                        Protégez-vous contre le vol ou la panne de votre ordinateur.
                        Sélectionnez votre dossier <strong>Google Drive</strong> ou <strong>OneDrive</strong> local.
                        L'application y copiera automatiquement vos sauvegardes.
                    </p>

                    <div className="flex items-center gap-4 mb-4">
                        <div className="flex-1 bg-white p-2 rounded border border-indigo-200 text-sm text-gray-700 truncate font-mono">
                            {cloudPath || "Aucun dossier Cloud configuré"}
                        </div>
                        <Button variant="secondary" onClick={handleConfigureCloud} disabled={isLoading}>
                            {cloudPath ? 'Changer le dossier' : 'Choisir le dossier'}
                        </Button>
                    </div>

                    {cloudPath && (
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-indigo-700">
                                {lastCloudBackup
                                    ? `✅ Dernière copie sécurisée : ${new Date(lastCloudBackup).toLocaleString()}`
                                    : "⏳ En attente de la prochaine sauvegarde..."}
                            </span>
                        </div>
                    )}
                </div>

                <div className="p-4 border rounded-lg bg-gray-50 border-gray-200">
                    <h3 className="font-semibold text-lg mb-2">Sauvegarde Manuelle (Export)</h3>
                    <p className="text-sm text-gray-600 mb-4">
                        Créez une copie complète de vos données (Clients, Factures, Dépenses, etc.) dans un fichier `.json`.
                    </p>
                    <Button onClick={handleExport} disabled={isLoading}>
                        {isLoading ? 'Exportation...' : <><ExportIcon className="h-4 w-4 mr-2" /> Créer une sauvegarde</>}
                    </Button>
                </div>

                <div className="p-4 border rounded-lg bg-red-50 border-red-200">
                    <h3 className="font-semibold text-lg mb-2 text-red-800">Restauration (Import)</h3>
                    <p className="text-sm text-red-700 mb-4">
                        Restaurez vos données depuis un fichier de sauvegarde. <strong className="font-bold">ATTENTION : Cette action effacera toutes les données actuelles !</strong>
                    </p>
                    <Button
                        variant="danger"
                        onClick={async () => {
                            if (window.confirm("ATTENTION : La restauration va ÉCRASER toutes les données existantes. Voulez-vous continuer ?")) {
                                setIsLoading(true);
                                try {
                                    const result = await db.backup.restore();
                                    if (result.success) {
                                        alert("Restauration terminée avec succès ! L'application va redémarrer.");
                                        window.location.reload();
                                    } else if (result.error && result.error !== 'Annulé') {
                                        setFeedback({ type: 'error', message: `Erreur: ${result.error}` });
                                    }
                                } catch (e) {
                                    console.error(e);
                                    setFeedback({ type: 'error', message: "Erreur lors de la restauration." });
                                } finally {
                                    setIsLoading(false);
                                }
                            }
                        }}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Restauration...' : <><RefreshIcon className="h-4 w-4 mr-2" /> Restaurer une sauvegarde</>}
                    </Button>
                </div>

                {/* DANGER ZONE */}
                <div className="p-4 border border-red-300 rounded-lg bg-red-50 mt-8">
                    <div className="flex items-center gap-2 mb-2">
                        <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <h3 className="font-bold text-lg text-red-800">Zone de Danger</h3>
                    </div>
                    <p className="text-sm text-red-700 mb-6">
                        Les actions ci-dessous sont irréversibles.
                    </p>

                    <div className="flex items-center justify-between bg-white p-4 rounded border border-red-200">
                        <div>
                            <h4 className="font-bold text-gray-800">Formatage d'usine (Suppression Totale)</h4>
                            <p className="text-sm text-gray-600 mt-1">
                                Efface toutes les données, configurations, et comptes. L'application repartira à zéro (Onboarding).
                            </p>
                        </div>
                        <Button
                            variant="danger"
                            onClick={handleInitiateReset}
                            disabled={isLoading}
                        >
                            <TrashIcon className="h-4 w-4 mr-2" /> Tout supprimer
                        </Button>
                    </div>
                </div>

                {feedback && (
                    <div className={`p-4 rounded-md text-sm ${feedback.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {feedback.message}
                    </div>
                )}
                {/* MODAL 1: FIRST WARNING */}
                {
                    showResetModal1 && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                            <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full">
                                <div className="flex items-center gap-3 text-red-600 mb-4">
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    <h3 className="text-xl font-bold">Suppression Totale</h3>
                                </div>

                                <p className="text-gray-700 mb-4">
                                    Vous êtes sur le point de supprimer <strong>TOUTES</strong> les données de l'application :
                                </p>
                                <ul className="list-disc list-inside text-gray-600 mb-6 space-y-1">
                                    <li>Factures, Dépenses, Salaires...</li>
                                    <li>Documents stockés</li>
                                    <li>Paramètres de l'entreprise</li>
                                    <li>Votre compte administrateur</li>
                                </ul>
                                <p className="font-bold text-red-600 mb-6">
                                    Cette action est irréversible. Voulez-vous vraiment continuer ?
                                </p>

                                <div className="flex gap-3 justify-end">
                                    <Button variant="secondary" onClick={() => setShowResetModal1(false)}>
                                        Annuler
                                    </Button>
                                    <Button variant="danger" onClick={() => { setShowResetModal1(false); setShowResetModal2(true); }}>
                                        Continuer quand même
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* MODAL 2: FINAL CONFIRMATION & PASSWORD */}
                {
                    showResetModal2 && (
                        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
                            <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full border-2 border-red-500">
                                <h3 className="text-xl font-bold text-red-600 mb-4 text-center">
                                    ULTIME CONFIRMATION
                                </h3>

                                <p className="text-gray-700 mb-6 text-center">
                                    Pour confirmer le formatage complet, veuillez saisir votre mot de passe administrateur actuel.
                                </p>

                                <div className="mb-6">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Mot de passe</label>
                                    <Input
                                        ref={resetPasswordRef}
                                        type="password"
                                        value={resetPassword}
                                        onChange={(e) => setResetPassword(e.target.value)}
                                        placeholder="Votre mot de passe"
                                    />
                                </div>

                                <div className="flex gap-3 justify-end">
                                    <Button variant="secondary" onClick={() => { setShowResetModal2(false); setResetPassword(''); }}>
                                        Annuler
                                    </Button>
                                    <Button
                                        variant="danger"
                                        onClick={handleFinalReset}
                                        disabled={!resetPassword || isLoading}
                                    >
                                        {isLoading ? 'Suppression...' : 'CONFIRMER LA SUPPRESSION'}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )
                }
            </div>
        </div>
    );
};

export default Settings;
