import React, { useState, useRef } from 'react';
import { OrganizationConfig } from '../types';
import { db } from '../services/electronDB';
import { authService } from '../services/authService';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

interface OnboardingProps {
  onComplete: () => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [formData, setFormData] = useState<Omit<OrganizationConfig, 'id' | 'isConfigured'>>({
    name: '',
    registrationNumber: '',
    phone: '',
    email: '',
    brandColor: '#167d7e',
    logo: '',
  });

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Veuillez sélectionner une image valide (PNG, JPG, etc.)');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('Le fichier est trop volumineux. Taille maximale : 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setFormData(prev => ({ ...prev, logo: base64String }));
      setLogoPreview(base64String);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setFormData(prev => ({ ...prev, logo: '' }));
    setLogoPreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() && !formData.logo) {
      alert('Veuillez fournir soit un nom, soit un logo pour votre organisation.');
      return;
    }

    // Validate password
    if (!password) {
      setPasswordError('Le mot de passe est requis');
      return;
    }

    if (password.length < 6) {
      setPasswordError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    if (password !== confirmPassword) {
      setPasswordError('Les mots de passe ne correspondent pas');
      return;
    }

    setPasswordError('');
    setIsLoading(true);

    try {
      // Save organization config
      await db.organizationConfig.add({
        ...formData,
        isConfigured: true,
      });

      // Set password
      await authService.setPassword(password);

      onComplete();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      alert('Une erreur est survenue lors de la sauvegarde.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = async () => {
    setIsLoading(true);
    try {
      // Save a minimal config to mark as configured
      await db.organizationConfig.add({
        name: '',
        isConfigured: true,
      });
      onComplete();
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#167d7e] to-[#0d5f60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8 md:p-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-3">
            Bienvenue ! 🎉
          </h1>
          <p className="text-gray-600 text-lg">
            Configuration initiale de votre outil de Gestion financière
          </p>
        </div>

        <div className="mb-8 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
          <p className="text-sm text-blue-800">
            <strong>Information :</strong> Ces informations apparaîtront sur vos documents exportés (bons de caisse, factures, etc.). Vous pourrez les modifier à tout moment dans les Paramètres.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Nom de l'Organisation / Entreprise
            </label>
            <Input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
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
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                  id="logo-upload"
                />
                <label
                  htmlFor="logo-upload"
                  className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                >
                  📁 Choisir une image
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
                    ✕
                  </button>
                </div>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="registrationNumber" className="block text-sm font-medium text-gray-700 mb-2">
              Numéro d'Enregistrement
            </label>
            <Input
              id="registrationNumber"
              name="registrationNumber"
              type="text"
              value={formData.registrationNumber}
              onChange={handleChange}
              placeholder="Ex: 2024/123/DEP-XX/XX/XX"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                Téléphone
              </label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Ex: 01 23 45 67 89"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Ex: contact@organisation.com"
              />
            </div>
          </div>

          <div>
            <label htmlFor="brandColor" className="block text-sm font-medium text-gray-700 mb-2">
              Couleur de marque (pour les documents)
            </label>
            <div className="flex items-center gap-3">
              <input
                id="brandColor"
                name="brandColor"
                type="color"
                value={formData.brandColor}
                onChange={handleChange}
                className="h-10 w-20 cursor-pointer rounded border border-gray-300"
              />
              <Input
                type="text"
                value={formData.brandColor}
                onChange={handleChange}
                name="brandColor"
                placeholder="#167d7e"
                className="flex-1"
              />
            </div>
          </div>

          {/* Section Sécurité */}
<div className="pt-4 border-t border-gray-200">
  <h3 className="text-lg font-semibold mb-4">🔒 Sécurité</h3>
  
  <div>
    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
      Créer un mot de passe <span className="text-red-500">*</span>
    </label>
    <Input
      id="password"
      type="password"
      value={password}
      onChange={(e) => setPassword(e.target.value)}
      placeholder="Min. 6 caractères"
      required
    />
  </div>

  <div className="mt-4">
    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
      Confirmer le mot de passe <span className="text-red-500">*</span>
    </label>
    <Input
      id="confirmPassword"
      type="password"
      value={confirmPassword}
      onChange={(e) => setConfirmPassword(e.target.value)}
      placeholder="Répétez le mot de passe"
      required
    />
  </div>

  {passwordError && (
    <div className="mt-2 text-red-600 text-sm">{passwordError}</div>
  )}
</div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              type="submit"
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? 'Enregistrement...' : 'Enregistrer et Commencer'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleSkip}
              disabled={isLoading}
              className="flex-1"
            >
              Passer cette étape
            </Button>
          </div>
        </form>

        <p className="text-xs text-gray-500 text-center mt-6">
          Vous pourrez modifier ces informations plus tard dans <strong>Paramètres</strong>
        </p>
      </div>
    </div>
  );
};

export default Onboarding;
