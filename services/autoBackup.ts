/**
 * Auto-Backup Service
 * Performs automatic backup every 72 hours
 */

import { db } from './electronDB';

const BACKUP_INTERVAL_MS = 72 * 60 * 60 * 1000; // 72 heures
const LAST_BACKUP_KEY = 'lastBackupTimestamp';

/**
 * Check if backup is needed and perform it if necessary
 * @returns true if backup was performed, false otherwise
 */
export const checkAndPerformBackup = async (): Promise<boolean> => {
  try {
    const lastBackup = localStorage.getItem(LAST_BACKUP_KEY);
    const now = Date.now();
    
    // Check if 72 hours have passed since last backup
    if (!lastBackup || (now - parseInt(lastBackup)) > BACKUP_INTERVAL_MS) {
      console.log('Performing automatic backup...');
      await performAutomaticBackup();
      localStorage.setItem(LAST_BACKUP_KEY, now.toString());
      console.log('Automatic backup completed successfully');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error during automatic backup:', error);
    return false;
  }
};

/**
 * Perform the actual backup
 */
async function performAutomaticBackup() {
  // Gather all data from database
  const [expenses, invoices, vouchers, recettes, documents, organizationConfig, salaries, contacts, budgets, annualBudgets] = await Promise.all([
    db.expenses.toArray(),
    db.invoices.toArray(),
    db.vouchers.toArray(),
    db.recettes.toArray(),
    db.documents.toArray(),
    db.organizationConfig.toArray(),
    db.salaries.toArray(),
    db.contacts.toArray(),
    db.budgets.toArray(),
    db.annualBudgets.toArray(),
  ]);

  // Prepare documents for serialization (convert Blob to base64)
  const serializedDocuments = await Promise.all(
    documents.map(async (doc: any) => ({
      ...doc,
      fileData: doc.fileData instanceof Blob ? await blobToBase64(doc.fileData) : doc.fileData,
    }))
  );

  // Create backup object
  const backup = {
    timestamp: new Date().toISOString(),
    version: '1.1.0',
    expenses,
    invoices,
    vouchers,
    recettes,
    documents: serializedDocuments,
    organizationConfig,
    salaries,
    contacts,
    budgets,
    annualBudgets,
  };

  // Save backup via Electron IPC
  if (window.electron?.backup) {
    await window.electron.backup.save(JSON.stringify(backup, null, 2));
  } else {
    console.warn('Backup API not available - running outside Electron?');
  }
}

/**
 * Convert Blob to base64 string
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Get time until next backup in human-readable format
 */
export const getTimeUntilNextBackup = (): string => {
  const lastBackup = localStorage.getItem(LAST_BACKUP_KEY);
  if (!lastBackup) return 'Aucune sauvegarde effectuée';
  
  const nextBackupTime = parseInt(lastBackup) + BACKUP_INTERVAL_MS;
  const timeRemaining = nextBackupTime - Date.now();
  
  if (timeRemaining <= 0) return 'Sauvegarde en attente';
  
  const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  
  if (days > 0) {
    return `${days}j ${remainingHours}h`;
  }
  return `${hours}h`;
};
