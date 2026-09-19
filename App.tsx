import React, { useState, useEffect } from 'react';
import { Page } from './types';
import { db } from './services/electronDB';
import { authService } from './services/authService';
import { checkAndPerformBackup } from './services/autoBackup';
import { checkAndPerformCloudBackup } from './services/cloudBackupService';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import Dashboard from './pages/Dashboard';
import Expenses from './pages/Expenses';
import Invoices from './pages/Invoices';
import Vouchers from './pages/Vouchers';
import Reports from './pages/Reports';
import Documents from './pages/Documents';
import Recettes from './pages/Recettes';
import Salaries from './pages/Salaries';
import Settings from './pages/Settings';
import Onboarding from './pages/Onboarding';
import Login from './pages/Login';
import AdminPanel from './pages/AdminPanel';
import Contacts from './pages/Contacts';
import Budgets from './pages/Budgets';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>(Page.Dashboard);
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [cloudAlert, setCloudAlert] = useState<string | null>(null);

  useEffect(() => {
    checkConfiguration();

    // Check and perform automatic backup if needed (every 72h)
    checkAndPerformBackup()
      .then(wasPerformed => {
        if (wasPerformed) {
          console.log(' Backup automatique effectué avec succès');
        }
      })
      .catch(err => console.error('Erreur lors du backup automatique:', err));

    // Cloud Backup Check (Intelligent Logic)
    checkAndPerformCloudBackup().then(result => {
      if (result === 'success') {
        console.log('✅ Sauvegarde Cloud effectuée avec succès.');
      } else if (result === 'offline') {
        setCloudAlert(
          "⚠️ Sauvegarde Cloud Requise\n\nVos données n'ont pas été synchronisées avec le Cloud depuis plus de 3 jours.\nVeuillez vous connecter à Internet pour sécuriser votre travail."
        );
        // Auto-dismiss après 8 secondes
        setTimeout(() => setCloudAlert(null), 8000);
      }
    });

    // Keyboard shortcut for admin panel: Ctrl+Shift+Alt+A
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.altKey && e.key === 'A') {
        setShowAdminPanel(true);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  const checkConfiguration = async () => {
    try {
      // Check if organization is configured
      const configs = await db.organizationConfig.toArray();
      const configured = configs.length > 0 && configs[0].isConfigured === true;
      setIsConfigured(configured);

      // Check if password exists
      const hasPwd = await authService.hasPassword();
      setHasPassword(hasPwd);

      // Auto-login if configured but no password set (e.g. skipped onboarding step)
      if (configured && !hasPwd) {
        setIsAuthenticated(true);
      }

    } catch (error) {
      console.error('Erreur lors de la vérification de la configuration:', error);
      setIsConfigured(false);
      setHasPassword(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOnboardingComplete = async () => {
    setIsConfigured(true);
    const hasPwd = await authService.hasPassword();
    setHasPassword(hasPwd);
    setIsAuthenticated(true); // Auto-login after onboarding
  };

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  const renderCurrentPage = () => {
    switch (currentPage) {
      case Page.Dashboard:
        return <Dashboard onNavigate={setCurrentPage} />;
      case Page.Expenses:
        return <Expenses />;
      case Page.Invoices:
        return <Invoices />;
      case Page.Recettes:
        return <Recettes />;
      case Page.Vouchers:
        return <Vouchers />;
      case Page.Salaries:
        return <Salaries />;
      case Page.Reports:
        return <Reports />;
      case Page.Documents:
        return <Documents />;
      case Page.Settings:
        return <Settings />;
      case Page.Contacts:
        return <Contacts />;
      case Page.Budgets:
        return <Budgets />;
      default:
        return <Dashboard onNavigate={setCurrentPage} />;
    }
  };

  // Determine main content based on state
  let content;
  if (isLoading) {
    content = (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#167d7e] mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  } else if (!isConfigured) {
    content = <Onboarding onComplete={handleOnboardingComplete} />;
  } else if (!isAuthenticated) {
    content = <Login onLoginSuccess={handleLoginSuccess} />;
  } else {
    content = (
      <div className="flex h-screen bg-gray-100 font-sans">
        <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header currentPage={currentPage} onNavigate={setCurrentPage} />
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-6">
            {renderCurrentPage()}
          </main>
        </div>
      </div>
    );
  }

  return (
    <>
      {content}
      {/* Notification toast cloud backup */}
      {cloudAlert && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm bg-amber-50 border border-amber-400 text-amber-900 rounded-xl shadow-xl p-4 flex gap-3 items-start animate-fade-in">
          <span className="text-amber-500 text-xl mt-0.5">⚠️</span>
          <div className="flex-1">
            <p className="font-semibold text-sm mb-1">Sauvegarde Cloud requise</p>
            <p className="text-xs leading-relaxed">
              Vos données n&apos;ont pas été synchronisées depuis plus de 3 jours. Connectez-vous à Internet.
            </p>
          </div>
          <button
            onClick={() => setCloudAlert(null)}
            className="text-amber-600 hover:text-amber-900 font-bold text-lg leading-none"
            aria-label="Fermer"
          >
            ×
          </button>
        </div>
      )}
      {/* Admin Panel (Global access via Ctrl+Shift+Alt+A) */}
      {showAdminPanel && <AdminPanel onClose={() => setShowAdminPanel(false)} />}
    </>
  );
};

export default App;
