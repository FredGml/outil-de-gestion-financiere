const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const DatabaseManager = require('./database/database.cjs');
const {
  hashPassword,
  verifyPasswordScrypt,
  verifyPasswordLegacy,
  generateAdminKey,
  verifyAdminKey,
} = require('./crypto.cjs');

let mainWindow;
let db;

async function createWindow() {
  // Initialize database
  db = new DatabaseManager(app);
  await db.initialize();

  // ── Génération de la clé admin au premier démarrage ──────────────────────
  const existingAdminHash = db.getSetting('adminKeyHash');
  if (!existingAdminHash) {
    const { key, hash, salt } = generateAdminKey();
    db.setSetting('adminKeyHash', hash);
    db.setSetting('adminKeySalt', salt);

    // Écrire la clé dans un fichier texte dans userData (lisible par l'admin)
    const adminKeyPath = path.join(app.getPath('userData'), 'CLE_ADMIN.txt');
    fs.writeFileSync(
      adminKeyPath,
      [
        'CLÉ ADMINISTRATEUR — À CONSERVER PRÉCIEUSEMENT',
        '================================================',
        '',
        `Clé : ${key}`,
        '',
        'Cette clé permet de réinitialiser le mot de passe en cas d\'oubli.',
        'Elle ne sera plus affichée après cette session.',
        'Notez-la et supprimez ce fichier une fois la clé enregistrée.',
        '',
        `Généré le : ${new Date().toLocaleString('fr-FR')}`,
        `Chemin : ${adminKeyPath}`,
      ].join('\n'),
      'utf-8'
    );

    // Affichage natif (bloquant) pour être sûr que l'admin voit la clé
    await dialog.showMessageBox({
      type: 'info',
      title: '🔑 Clé Administrateur — Configuration initiale',
      message: 'Votre clé administrateur a été générée.',
      detail:
        `Clé : ${key}\n\n` +
        `Notez-la dès maintenant — elle ne sera plus affichée.\n` +
        `Elle a également été sauvegardée dans :\n${adminKeyPath}`,
      buttons: ["J'ai noté ma clé"],
    });
  }
  // ─────────────────────────────────────────────────────────────────────────

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, '../build/icon.ico'),
  });

  // Load app
  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();
  registerIPCHandlers();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (db) {
    db.close();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

function registerIPCHandlers() {
  // ===== EXPENSES =====
  ipcMain.handle('expenses:getAll', () => db.getAllExpenses());
  ipcMain.handle('expenses:add', (_, expense) => db.addExpense(expense));
  ipcMain.handle('expenses:update', (_, id, expense) => db.updateExpense(id, expense));
  ipcMain.handle('expenses:delete', (_, id) => db.deleteExpense(id));

  // ===== INVOICES =====
  ipcMain.handle('invoices:getAll', () => db.getAllInvoices());
  ipcMain.handle('invoices:add', (_, invoice) => db.addInvoice(invoice));
  ipcMain.handle('invoices:update', (_, id, invoice) => db.updateInvoice(id, invoice));
  ipcMain.handle('invoices:delete', (_, id) => db.deleteInvoice(id));

  // ===== VOUCHERS =====
  ipcMain.handle('vouchers:getAll', () => db.getAllVouchers());
  ipcMain.handle('vouchers:add', (_, voucher) => db.addVoucher(voucher));
  ipcMain.handle('vouchers:update', (_, id, voucher) => db.updateVoucher(id, voucher));
  ipcMain.handle('vouchers:delete', (_, id) => db.deleteVoucher(id));

  // ===== RECETTES =====
  ipcMain.handle('recettes:getAll', () => db.getAllRecettes());
  ipcMain.handle('recettes:add', (_, recette) => db.addRecette(recette));
  ipcMain.handle('recettes:update', (_, id, recette) => db.updateRecette(id, recette));
  ipcMain.handle('recettes:delete', (_, id) => db.deleteRecette(id));

  // ===== DOCUMENTS =====
  ipcMain.handle('documents:getAll', () => db.getAllDocuments());
  ipcMain.handle('documents:add', (_, doc) => db.addDocument(doc));
  ipcMain.handle('documents:delete', (_, id) => db.deleteDocument(id));

  // ===== ORGANIZATION CONFIG =====
  ipcMain.handle('organizationConfig:getAll', () => db.getAllOrganizationConfig());
  ipcMain.handle('organizationConfig:add', (_, config) => db.addOrganizationConfig(config));
  ipcMain.handle('organizationConfig:update', (_, id, config) => db.updateOrganizationConfig(id, config));
  ipcMain.handle('organizationConfig:clear', () => db.clearOrganizationConfig());

  // ===== SALARIES =====
  ipcMain.handle('salaries:getAll', () => db.getAllSalaries());
  ipcMain.handle('salaries:add', (_, salary) => db.addSalary(salary));
  ipcMain.handle('salaries:update', (_, id, salary) => db.updateSalary(id, salary));
  ipcMain.handle('salaries:delete', (_, id) => db.deleteSalary(id));

  // ===== CONTACTS =====
  ipcMain.handle('contacts:getAll', () => db.getAllContacts());
  ipcMain.handle('contacts:add', (_, contact) => db.addContact(contact));
  ipcMain.handle('contacts:update', (_, id, contact) => db.updateContact(id, contact));
  ipcMain.handle('contacts:delete', (_, id) => db.deleteContact(id));

  // ===== BUDGETS =====
  ipcMain.handle('budgets:getAll', () => db.getAllBudgets());
  ipcMain.handle('budgets:add', (_, budget) => db.addBudget(budget));
  ipcMain.handle('budgets:update', (_, id, budget) => db.updateBudget(id, budget));
  ipcMain.handle('budgets:delete', (_, id) => db.deleteBudget(id));

  // ===== ANNUAL BUDGETS =====
  ipcMain.handle('annual-budgets:getAll', () => db.getAllAnnualBudgets());
  ipcMain.handle('annual-budgets:add', (_, budget) => db.addAnnualBudget(budget));
  ipcMain.handle('annual-budgets:update', (_, id, budget) => db.updateAnnualBudget(id, budget));
  ipcMain.handle('annual-budgets:delete', (_, id) => db.deleteAnnualBudget(id));

  // ===== AUTHENTICATION =====
  ipcMain.handle('auth:hasPassword', () => {
    const auth = db.getPasswordData();
    return !!auth;
  });

  ipcMain.handle('auth:setPassword', (_, password) => {
    const { hash, salt } = hashPassword(password);
    db.setPasswordData(hash, salt);
    return true;
  });

  /**
   * Vérifie le mot de passe avec migration automatique :
   * - Si le schéma est 'scrypt_v1' → vérification scrypt directe.
   * - Sinon (ancien format AES-GCM) → vérification legacy puis migration
   *   silencieuse vers scrypt pour les prochains logins.
   */
  ipcMain.handle('auth:verifyPassword', (_, password) => {
    const auth = db.getPasswordData();
    if (!auth) return false;

    let isValid = false;

    if (auth.authTag === 'scrypt_v1') {
      // Schéma actuel — vérification scrypt
      isValid = verifyPasswordScrypt(password, auth.passwordEncrypted, auth.iv);
    } else {
      // Ancien schéma AES-GCM — migration transparente
      isValid = verifyPasswordLegacy(password, auth.passwordEncrypted, auth.iv, auth.authTag);
      if (isValid) {
        // Mise à jour silencieuse vers scrypt
        const { hash, salt } = hashPassword(password);
        db.setPasswordData(hash, salt);
        console.log('[Auth] Mot de passe migré vers scrypt_v1');
      }
    }

    if (isValid) {
      db.updateLastLogin();
    }
    return isValid;
  });

  ipcMain.handle('auth:getData', async () => {
    return db.getPasswordData();
  });

  // NOTE : auth:adminDecrypt a été supprimé volontairement.
  // Le déchiffrement réversible du mot de passe n'est plus possible ni nécessaire.
  // Utilisez auth:adminResetPassword pour réinitialiser le mot de passe.

  ipcMain.handle('auth:adminResetPassword', (_, adminKey, newPassword) => {
    const adminKeyHash = db.getSetting('adminKeyHash');
    const adminKeySalt = db.getSetting('adminKeySalt');

    if (!adminKeyHash || !adminKeySalt) {
      return { success: false, error: 'Clé admin non configurée' };
    }
    if (!verifyAdminKey(adminKey, adminKeyHash, adminKeySalt)) {
      return { success: false, error: 'Clé admin incorrecte' };
    }

    try {
      const { hash, salt } = hashPassword(newPassword);
      db.setPasswordData(hash, salt);
      return { success: true };
    } catch (error) {
      console.error('Admin reset password error:', error);
      return { success: false, error: 'Erreur lors de la réinitialisation' };
    }
  });

  ipcMain.handle('auth:changePassword', (_, oldPassword, newPassword) => {
    const auth = db.getPasswordData();
    if (!auth) {
      return { success: false, error: 'Aucun mot de passe configuré' };
    }

    // Vérifier l'ancien mot de passe (compatible scrypt + legacy)
    let isValid = false;
    if (auth.authTag === 'scrypt_v1') {
      isValid = verifyPasswordScrypt(oldPassword, auth.passwordEncrypted, auth.iv);
    } else {
      isValid = verifyPasswordLegacy(oldPassword, auth.passwordEncrypted, auth.iv, auth.authTag);
    }

    if (!isValid) {
      return { success: false, error: 'Ancien mot de passe incorrect' };
    }

    const { hash, salt } = hashPassword(newPassword);
    db.setPasswordData(hash, salt);
    return { success: true };
  });

  // ===== AUTO-BACKUP =====
  ipcMain.handle('backup:save', (_, jsonData) => {
    const documentsPath = app.getPath('documents');
    const backupDir = path.join(documentsPath, 'Gestion Financière', 'Backups');
    
    // Créer dossier si n'existe pas
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').split('.')[0];
    const filename = `auto-backup-${timestamp}.json`;
    const filepath = path.join(backupDir, filename);
    
    fs.writeFileSync(filepath, jsonData, 'utf-8');
    console.log('Auto-backup saved to:', filepath);
    return filepath;
  });

  ipcMain.handle('backup:restore', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'JSON', extensions: ['json'] }]
    });
    
    if (canceled || filePaths.length === 0) {
      return { success: false, error: 'Annulé' };
    }
    
    try {
      const data = fs.readFileSync(filePaths[0], 'utf-8');
      const jsonData = JSON.parse(data);
      db.restore(jsonData);
      return { success: true };
    } catch (err) {
      console.error('Restore failed:', err);
      return { success: false, error: err.message };
    }
  });

  // ===== CLOUD BACKUP =====
  ipcMain.handle('backup:selectCloudFolder', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory']
    });
    if (canceled || filePaths.length === 0) return null;
    return filePaths[0];
  });

  ipcMain.handle('backup:getCloudConfig', () => {
     return {
         path: db.getSetting('cloudBackupPath'),
         lastBackup: db.getSetting('lastCloudBackup')
     };
  });

  ipcMain.handle('backup:setCloudPath', (_, folderPath) => {
      db.setSetting('cloudBackupPath', folderPath);
      return true;
  });

  ipcMain.handle('backup:saveToCloud', (_, jsonData) => {
      const cloudPath = db.getSetting('cloudBackupPath');
      if (!cloudPath) return { success: false, error: 'Dossier Cloud non configuré' };
      
      try {
          if (!fs.existsSync(cloudPath)) {
              return { success: false, error: 'Le dossier Cloud est introuvable (disque déconnecté ?)' };
          }
          
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').split('.')[0];
          const filename = `backup-cloud-${timestamp}.json`;
          const fullPath = path.join(cloudPath, filename);
          
          fs.writeFileSync(fullPath, jsonData, 'utf-8');
          
          // Update last backup date
          db.setSetting('lastCloudBackup', new Date().toISOString());
          
          return { success: true, path: fullPath };
      } catch (e) {
          console.error('Cloud backup error:', e);
          return { success: false, error: e.message };
      }
  });

  // ===== SYSTEM =====
  ipcMain.handle('system:factoryReset', async (_, password) => {
    // 1. Verify password again for security
    const auth = db.getPasswordData();
    if (!auth) return { success: false, error: 'Non authentifié' };
    
    let isValid = false;
    if (auth.authTag === 'scrypt_v1') {
      isValid = verifyPasswordScrypt(password, auth.passwordEncrypted, auth.iv);
    } else {
      isValid = verifyPasswordLegacy(password, auth.passwordEncrypted, auth.iv, auth.authTag);
    }

    if (!isValid) {
      return { success: false, error: 'Mot de passe incorrect' };
    }

    // 2. Perform Reset
    try {
      db.factoryReset();
      return { success: true };
    } catch (err) {
      console.error('Factory reset failed:', err);
      return { success: false, error: err.message };
    }
  });
}
