import React, { useState } from 'react';
import { authService } from '../services/authService';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

interface AdminPanelProps {
  onClose: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ onClose }) => {
  const [adminKey, setAdminKey] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!adminKey) {
      setError('Veuillez entrer la clé admin');
      return;
    }
    if (!newPassword) {
      setError('Veuillez entrer un nouveau mot de passe');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Les deux mots de passe ne correspondent pas');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const result = await authService.adminResetPassword(adminKey, newPassword);
      if (result.success) {
        setSuccessMsg('Le mot de passe a été réinitialisé avec succès ! Redémarrage dans 2s...');
        setNewPassword('');
        setConfirmPassword('');
        setAdminKey('');
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setError(result.error || 'Erreur lors de la réinitialisation');
      }
    } catch (err) {
      setError('Erreur système');
      console.error('Admin reset error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-red-600 flex items-center gap-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Panel Admin
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
          >
            ×
          </button>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg mb-6 text-sm">
          ⚠️ <strong>Attention :</strong> Cette interface est réservée à l'administrateur système uniquement.
        </div>

        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg mb-6 text-sm">
          ℹ️ La clé admin a été générée au premier démarrage de l'application et sauvegardée dans le fichier <strong>CLE_ADMIN.txt</strong> situé dans le dossier de données de l'application.
        </div>

        <div className="space-y-6">
          {/* Clé Admin */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Clé Administrateur
            </label>
            <Input
              type="password"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              placeholder="Entrez votre clé admin"
              disabled={loading}
              autoFocus
            />
          </div>

          <hr className="border-gray-200" />

          {/* Section : Réinitialiser le mot de passe */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Définir un nouveau mot de passe</h3>
            <div className="space-y-3">
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nouveau mot de passe"
                disabled={loading}
              />
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirmer le nouveau mot de passe"
                disabled={loading}
                onKeyDown={(e) => e.key === 'Enter' && handleReset()}
              />
              <Button
                onClick={handleReset}
                disabled={loading || !adminKey || !newPassword || !confirmPassword}
                className="w-full bg-red-600 hover:bg-red-700 text-white"
              >
                {loading ? 'Modification...' : '⚠️ Réinitialiser le mot de passe'}
              </Button>
            </div>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
              <strong>Erreur :</strong> {error}
            </div>
          )}

          {successMsg && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg">
              <strong>Succès :</strong> {successMsg}
            </div>
          )}
        </div>

        <div className="mt-6 pt-4 border-t border-gray-200">
          <Button
            onClick={onClose}
            className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800"
          >
            Fermer le panel
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
