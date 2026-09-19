const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

class DatabaseManager {
  constructor(app) {
    this.userDataPath = app.getPath('userData');
    this.dbPath = path.join(this.userDataPath, 'secretaire.db');
    this.db = null;
    this._saveTimer = null; // Write-debounce timer
    
    console.log('Database path:', this.dbPath);
  }

  async initialize() {
    const SQL = await initSqlJs({
      locateFile: file => path.join(__dirname, '../../node_modules/sql.js/dist', file)
    });

    //  Load existing database or create new one
    let buffer;
    if (fs.existsSync(this.dbPath)) {
      buffer = fs.readFileSync(this.dbPath);
      this.db = new SQL.Database(buffer);
    } else {
      this.db = new SQL.Database();
    }

    // Initialize schema
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    this.db.exec(schema);
    
    this.save();
    console.log('Database initialized successfully');
  }

  save() {
    if (!this.db) return;
    const data = this.db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(this.dbPath, buffer);
  }

  /**
   * Planifie une sauvegarde avec un debounce de 200ms.
   * Évite d'écrire sur le disque à chaque opération CRUD individuelle.
   * Les opérations critiques (auth, settings) utilisent toujours save() immédiat.
   */
  scheduleSave() {
    if (this._saveTimer) clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => {
      this._saveTimer = null;
      this.save();
    }, 200);
  }

  transaction(callback) {
    if (!this.db) return;
    this.db.exec("BEGIN TRANSACTION;");
    try {
      callback();
      this.db.exec("COMMIT;");
    } catch (err) {
      this.db.exec("ROLLBACK;");
      throw err;
    }
  }

  // ===== EXPENSES =====
  getAllExpenses() {
    const stmt = this.db.prepare('SELECT * FROM expenses ORDER BY date DESC');
    const rows = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();
    return rows;
  }

  addExpense(expense) {
    this.db.run(
      'INSERT INTO expenses (date, description, category, amount) VALUES (?, ?, ?, ?)',
      [expense.date, expense.description, expense.category, expense.amount]
    );
    const id = this.db.exec('SELECT last_insert_rowid() as id')[0].values[0][0];
    this.scheduleSave();
    return { id, ...expense };
  }

  updateExpense(id, expense) {
    this.db.run(
      'UPDATE expenses SET date = ?, description = ?, category = ?, amount = ? WHERE id = ?',
      [expense.date, expense.description, expense.category, expense.amount, id]
    );
    this.scheduleSave();
    return { id, ...expense };
  }

  deleteExpense(id) {
    this.db.run('DELETE FROM expenses WHERE id = ?', [id]);
    this.scheduleSave();
  }

  // ===== INVOICES =====
  getAllInvoices() {
    const stmt = this.db.prepare('SELECT * FROM invoices ORDER BY issueDate DESC');
    const rows = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      row.items = JSON.parse(row.items);
      rows.push(row);
    }
    stmt.free();
    return rows;
  }

  addInvoice(invoice) {
    this.db.run(
      'INSERT INTO invoices (invoiceNumber, clientName, issueDate, dueDate, items, totalAmount, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [invoice.invoiceNumber, invoice.clientName, invoice.issueDate, invoice.dueDate, JSON.stringify(invoice.items), invoice.totalAmount, invoice.status]
    );
    const id = this.db.exec('SELECT last_insert_rowid() as id')[0].values[0][0];
    this.scheduleSave();
    return { id, ...invoice };
  }

  updateInvoice(id, invoice) {
    this.db.run(
      'UPDATE invoices SET invoiceNumber = ?, clientName = ?, issueDate = ?, dueDate = ?, items = ?, totalAmount = ?, status = ? WHERE id = ?',
      [invoice.invoiceNumber, invoice.clientName, invoice.issueDate, invoice.dueDate, JSON.stringify(invoice.items), invoice.totalAmount, invoice.status, id]
    );
    this.scheduleSave();
    return { id, ...invoice };
  }

  deleteInvoice(id) {
    this.db.run('DELETE FROM invoices WHERE id = ?', [id]);
    this.scheduleSave();
  }

  // ===== VOUCHERS =====
  getAllVouchers() {
    const stmt = this.db.prepare('SELECT * FROM vouchers ORDER BY issueDate DESC');
    const rows = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();
    return rows;
  }

  addVoucher(voucher) {
    this.db.run(
      'INSERT INTO vouchers (voucherNumber, beneficiary, issueDate, reason, amount) VALUES (?, ?, ?, ?, ?)',
      [voucher.voucherNumber, voucher.beneficiary, voucher.issueDate, voucher.reason, voucher.amount]
    );
    const id = this.db.exec('SELECT last_insert_rowid() as id')[0].values[0][0];
    this.scheduleSave();
    return { id, ...voucher };
  }

  updateVoucher(id, voucher) {
    this.db.run(
      'UPDATE vouchers SET voucherNumber = ?, beneficiary = ?, issueDate = ?, reason = ?, amount = ? WHERE id = ?',
      [voucher.voucherNumber, voucher.beneficiary, voucher.issueDate, voucher.reason, voucher.amount, id]
    );
    this.scheduleSave();
    return { id, ...voucher };
  }

  deleteVoucher(id) {
    this.db.run('DELETE FROM vouchers WHERE id = ?', [id]);
    this.scheduleSave();
  }

  // ===== RECETTES =====
  getAllRecettes() {
    const stmt = this.db.prepare('SELECT * FROM recettes ORDER BY date DESC');
    const rows = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();
    return rows;
  }

  addRecette(recette) {
    this.db.run(
      'INSERT INTO recettes (date, description, source, amount) VALUES (?, ?, ?, ?)',
      [recette.date, recette.description, recette.source, recette.amount]
    );
    const id = this.db.exec('SELECT last_insert_rowid() as id')[0].values[0][0];
    this.scheduleSave();
    return { id, ...recette };
  }

  updateRecette(id, recette) {
    this.db.run(
      'UPDATE recettes SET date = ?, description = ?, source = ?, amount = ? WHERE id = ?',
      [recette.date, recette.description, recette.source, recette.amount, id]
    );
    this.scheduleSave();
    return { id, ...recette };
  }

  deleteRecette(id) {
    this.db.run('DELETE FROM recettes WHERE id = ?', [id]);
    this.scheduleSave();
  }

  // ===== DOCUMENTS =====
  getAllDocuments() {
    const stmt = this.db.prepare('SELECT * FROM documents ORDER BY uploadDate DESC');
    const rows = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();
    return rows;
  }

  addDocument(doc) {
    this.db.run(
      'INSERT INTO documents (name, type, uploadDate, fileData) VALUES (?, ?, ?, ?)',
      [doc.name, doc.type, doc.uploadDate, doc.fileData]
    );
    const id = this.db.exec('SELECT last_insert_rowid() as id')[0].values[0][0];
    this.scheduleSave();
    return { id, ...doc };
  }

  deleteDocument(id) {
    this.db.run('DELETE FROM documents WHERE id = ?', [id]);
    this.scheduleSave();
  }

  // ===== ORGANIZATION CONFIG =====
  getAllOrganizationConfig() {
    const stmt = this.db.prepare('SELECT * FROM organization_config');
    const rows = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      row.isConfigured = row.isConfigured === 1;
      rows.push(row);
    }
    stmt.free();
    return rows;
  }

  addOrganizationConfig(config) {
    this.db.run(
      'INSERT INTO organization_config (name, registrationNumber, phone, email, brandColor, logo, isConfigured) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [config.name || '', config.registrationNumber || '', config.phone || '', config.email || '', config.brandColor || '#167d7e', config.logo || '', config.isConfigured ? 1 : 0]
    );
    const id = this.db.exec('SELECT last_insert_rowid() as id')[0].values[0][0];
    this.save(); // save() immédiat pour la config organisation (critique)
    return { id, ...config };
  }

  updateOrganizationConfig(id, config) {
    this.db.run(
      'UPDATE organization_config SET name = ?, registrationNumber = ?, phone = ?, email = ?, brandColor = ?, logo = ?, isConfigured = ? WHERE id = ?',
      [config.name || '', config.registrationNumber || '', config.phone || '', config.email || '', config.brandColor || '#167d7e', config.logo || '', config.isConfigured ? 1 : 0, id]
    );
    this.save(); // save() immédiat pour la config organisation (critique)
    return { id, ...config };
  }

  clearOrganizationConfig() {
    this.db.run('DELETE FROM organization_config');
    this.save();
  }

  // ===== SALARIES =====
  getAllSalaries() {
    const stmt = this.db.prepare('SELECT * FROM salaries ORDER BY paymentDate DESC');
    const rows = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();
    return rows;
  }

  addSalary(salary) {
    this.db.run(
      'INSERT INTO salaries (employeeName, period, amount, paymentDate, notes) VALUES (?, ?, ?, ?, ?)',
      [salary.employeeName, salary.period, salary.amount, salary.paymentDate, salary.notes || '']
    );
    const id = this.db.exec('SELECT last_insert_rowid() as id')[0].values[0][0];
    this.scheduleSave();
    return { id, ...salary };
  }

  updateSalary(id, salary) {
    this.db.run(
      'UPDATE salaries SET employeeName = ?, period = ?, amount = ?, paymentDate = ?, notes = ? WHERE id = ?',
      [salary.employeeName, salary.period, salary.amount, salary.paymentDate, salary.notes || '', id]
    );
    this.scheduleSave();
    return { id, ...salary };
  }

  deleteSalary(id) {
    this.db.run('DELETE FROM salaries WHERE id = ?', [id]);
    this.scheduleSave();
  }

  // ===== CONTACTS =====
  getAllContacts() {
    const stmt = this.db.prepare('SELECT * FROM contacts ORDER BY name ASC');
    const rows = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();
    return rows;
  }

  addContact(contact) {
    this.db.run(
      'INSERT INTO contacts (name, type, email, phone, address, notes) VALUES (?, ?, ?, ?, ?, ?)',
      [contact.name, contact.type, contact.email || '', contact.phone || '', contact.address || '', contact.notes || '']
    );
    const id = this.db.exec('SELECT last_insert_rowid() as id')[0].values[0][0];
    this.scheduleSave();
    return { id, ...contact };
  }

  updateContact(id, contact) {
    this.db.run(
      'UPDATE contacts SET name = ?, type = ?, email = ?, phone = ?, address = ?, notes = ? WHERE id = ?',
      [contact.name, contact.type, contact.email || '', contact.phone || '', contact.address || '', contact.notes || '', id]
    );
    this.scheduleSave();
    return { id, ...contact };
  }

  deleteContact(id) {
    this.db.run('DELETE FROM contacts WHERE id = ?', [id]);
    this.scheduleSave();
  }

  // ===== BUDGETS =====
  getAllBudgets() {
    const stmt = this.db.prepare('SELECT * FROM budgets ORDER BY category ASC');
    const rows = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();
    return rows;
  }

  addBudget(budget) {
    this.db.run(
      'INSERT INTO budgets (category, monthlyLimit) VALUES (?, ?)',
      [budget.category, budget.monthlyLimit]
    );
    const id = this.db.exec('SELECT last_insert_rowid() as id')[0].values[0][0];
    this.scheduleSave();
    return { id, ...budget };
  }

  updateBudget(id, budget) {
    this.db.run(
      'UPDATE budgets SET category = ?, monthlyLimit = ? WHERE id = ?',
      [budget.category, budget.monthlyLimit, id]
    );
    this.scheduleSave();
    return { id, ...budget };
  }

  deleteBudget(id) {
    this.db.run('DELETE FROM budgets WHERE id = ?', [id]);
    this.scheduleSave();
  }

  // ===== ANNUAL BUDGETS =====
  getAllAnnualBudgets() {
    const stmt = this.db.prepare('SELECT * FROM annual_budgets ORDER BY category ASC');
    const rows = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();
    return rows;
  }

  addAnnualBudget(budget) {
    this.db.run(
      'INSERT INTO annual_budgets (category, yearlyLimit) VALUES (?, ?)',
      [budget.category, budget.yearlyLimit]
    );
    const id = this.db.exec('SELECT last_insert_rowid() as id')[0].values[0][0];
    this.scheduleSave();
    return { id, ...budget };
  }

  updateAnnualBudget(id, budget) {
    this.db.run(
      'UPDATE annual_budgets SET category = ?, yearlyLimit = ? WHERE id = ?',
      [budget.category, budget.yearlyLimit, id]
    );
    this.scheduleSave();
    return { id, ...budget };
  }

  deleteAnnualBudget(id) {
    this.db.run('DELETE FROM annual_budgets WHERE id = ?', [id]);
    this.scheduleSave();
  }

  // ===== BACKUP / RESTORE =====
  restore(data) {
    if (!data) return;
    try {
      this.transaction(() => {
        // Clear existing data? Or merge? Usually restore means replace.
        // Let's go with replace for safety, but keep auth?
        // User might want to restore everything including settings.
        
        // Tables to restore
        const tables = ['expenses', 'invoices', 'recettes', 'vouchers', 'documents', 'salaries', 'contacts', 'budgets', 'annual_budgets', 'organization_config', 'auth'];
        
        tables.forEach(table => {
            // Check for both camelCase (from export) or snake_case
            const key = table === 'organization_config' ? 'organizationConfig' : (table === 'annual_budgets' ? 'annualBudgets' : table);
            
            if (data[key] && Array.isArray(data[key])) {
                // Clear table
                this.db.run(`DELETE FROM ${table}`);

                // Insert data
                if (table === 'expenses') {
                    const insert = this.db.prepare('INSERT INTO expenses (date, description, category, amount) VALUES (@date, @description, @category, @amount)');
                    data[key].forEach(row => insert.run({
                        '@date': row.date || new Date().toISOString().slice(0, 10),
                        '@description': row.description || '',
                        '@category': row.category || 'DIVERS',
                        '@amount': row.amount || 0
                    }));
                } else if (table === 'invoices') {
                    const insert = this.db.prepare('INSERT INTO invoices (invoiceNumber, clientName, issueDate, dueDate, totalAmount, status, items) VALUES (@invoiceNumber, @clientName, @issueDate, @dueDate, @totalAmount, @status, @items)');
                    data[key].forEach(row => insert.run({
                        '@invoiceNumber': row.invoiceNumber || '',
                        '@clientName': row.clientName || '',
                        '@issueDate': row.issueDate || new Date().toISOString().slice(0, 10),
                        '@dueDate': row.dueDate || new Date().toISOString().slice(0, 10),
                        '@totalAmount': row.totalAmount || 0,
                        '@status': row.status || 'DRAFT',
                        '@items': typeof row.items === 'string' ? row.items : JSON.stringify(row.items || [])
                    }));
                } else if (table === 'recettes') {
                    const insert = this.db.prepare('INSERT INTO recettes (date, description, source, amount) VALUES (@date, @description, @source, @amount)');
                    data[key].forEach(row => insert.run({
                        '@date': row.date || new Date().toISOString().slice(0, 10),
                        '@description': row.description || '',
                        '@source': row.source || '',
                        '@amount': row.amount || 0
                    }));
                } else if (table === 'vouchers') {
                    const insert = this.db.prepare('INSERT INTO vouchers (voucherNumber, beneficiary, reason, amount, issueDate) VALUES (@voucherNumber, @beneficiary, @reason, @amount, @issueDate)');
                    data[key].forEach(row => insert.run({
                        '@voucherNumber': row.voucherNumber || '',
                        '@beneficiary': row.beneficiary || '',
                        '@reason': row.reason || '',
                        '@amount': row.amount || 0,
                        '@issueDate': row.issueDate || new Date().toISOString().slice(0, 10)
                    }));
                } else if (table === 'documents') {
                    const insert = this.db.prepare('INSERT INTO documents (name, type, uploadDate, fileData) VALUES (@name, @type, @uploadDate, @fileData)');
                    data[key].forEach(row => insert.run({
                        '@name': row.name || 'Sans nom',
                        '@type': row.type || '',
                        '@uploadDate': row.uploadDate || new Date().toISOString(),
                        '@fileData': row.fileData
                    }));
                } else if (table === 'salaries') {
                    const insert = this.db.prepare('INSERT INTO salaries (employeeName, period, amount, paymentDate, notes) VALUES (@employeeName, @period, @amount, @paymentDate, @notes)');
                    data[key].forEach(row => insert.run({
                        '@employeeName': row.employeeName || '',
                        '@period': row.period || '',
                        '@amount': row.amount || 0,
                        '@paymentDate': row.paymentDate || new Date().toISOString().slice(0, 10),
                        '@notes': row.notes || ''
                    }));
                } else if (table === 'contacts') {
                    const insert = this.db.prepare('INSERT INTO contacts (name, type, email, phone, address, notes) VALUES (@name, @type, @email, @phone, @address, @notes)');
                    data[key].forEach(row => insert.run({
                        '@name': row.name || '',
                        '@type': row.type || 'CLIENT',
                        '@email': row.email || '',
                        '@phone': row.phone || '',
                        '@address': row.address || '',
                        '@notes': row.notes || ''
                    }));
                } else if (table === 'budgets') {
                    const insert = this.db.prepare('INSERT INTO budgets (category, monthlyLimit) VALUES (@category, @monthlyLimit)');
                    data[key].forEach(row => insert.run({
                        '@category': row.category || '',
                        '@monthlyLimit': row.monthlyLimit || 0
                    }));
                } else if (table === 'annual_budgets') {
                    const insert = this.db.prepare('INSERT INTO annual_budgets (category, yearlyLimit) VALUES (@category, @yearlyLimit)');
                    data[key].forEach(row => insert.run({
                        '@category': row.category || '',
                        '@yearlyLimit': row.yearlyLimit || 0
                    }));
                } else if (table === 'organization_config') {
                     const insert = this.db.prepare('INSERT INTO organization_config (name, registrationNumber, phone, email, brandColor, logo, isConfigured) VALUES (@name, @registrationNumber, @phone, @email, @brandColor, @logo, @isConfigured)');
                     data[key].forEach(row => insert.run({
                         '@name': row.name || '',
                         '@registrationNumber': row.registrationNumber || '',
                         '@phone': row.phone || '',
                         '@email': row.email || '',
                         '@brandColor': row.brandColor || '#167d7e',
                         '@logo': row.logo || '',
                         '@isConfigured': row.isConfigured ? 1 : 0
                     }));
                } else if (table === 'auth') {
                     const insert = this.db.prepare('INSERT INTO auth (passwordEncrypted, iv, authTag, createdAt, lastLogin) VALUES (@passwordEncrypted, @iv, @authTag, @createdAt, @lastLogin)');
                     data[key].forEach(row => insert.run({
                         '@passwordEncrypted': row.passwordEncrypted,
                         '@iv': row.iv,
                         '@authTag': row.authTag,
                         '@createdAt': row.createdAt || new Date().toISOString(),
                         '@lastLogin': row.lastLogin
                     }));
                }
            }
        });
      });
      console.log('Database restored successfully');
      return true;
    } catch (err) {
      console.error('Error restoring database:', err);
      throw err;
    }
  }

  // ===== FACTORY RESET =====
  factoryReset() {
    try {
      this.transaction(() => {
        const tables = [
          'expenses', 'invoices', 'vouchers', 'recettes', 'documents', 
          'salaries', 'contacts', 'budgets', 'annual_budgets', 
          'organization_config', 'auth'
        ];
        
        tables.forEach(table => {
          this.db.run(`DELETE FROM ${table}`);
        });
      });
      this.save();
      console.log('Factory reset executed successfully');
      return true;
    } catch (err) {
      console.error('Error executing factory reset:', err);
      throw err;
    }
  }

  // ===== AUTHENTICATION =====
  getPasswordData() {
    const stmt = this.db.prepare('SELECT * FROM auth LIMIT 1');
    let row = null;
    if (stmt.step()) {
      row = stmt.getAsObject();
    }
    stmt.free();
    return row;
  }

  /**
   * Stocke le hash scrypt du mot de passe.
   * @param {string} hash - Hash scrypt hex (colonne passwordEncrypted)
   * @param {string} salt - Sel hex (colonne iv)
   * Le champ authTag vaut 'scrypt_v1' pour identifier le schéma de hachage.
   */
  setPasswordData(hash, salt) {
    this.db.run('DELETE FROM auth');
    this.db.run(
      'INSERT INTO auth (passwordEncrypted, iv, authTag, createdAt) VALUES (?, ?, ?, ?)',
      [hash, salt, 'scrypt_v1', new Date().toISOString()]
    );
    this.save(); // save() immédiat pour les changements d'authentification
  }

  // ===== APP SETTINGS =====
  getSetting(key) {
    try {
      const stmt = this.db.prepare('SELECT value FROM app_settings WHERE key = ?');
      // sql.js stmt.get returns array of values or undefined
      const result = stmt.get([key]);
      stmt.free();
      // result is [value] if found
      return result ? result[0] : null;
    } catch (e) {
      console.error('Error getting setting:', e);
      return null;
    }
  }

  setSetting(key, value) {
    try {
      this.db.run('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)', [key, value]);
      this.save();
    } catch (e) {
      console.error('Error setting value:', e);
    }
  }

  updateLastLogin() {
    this.db.run('UPDATE auth SET lastLogin = ?', [new Date().toISOString()]);
    this.save();
  }

  close() {
    if (this.db) {
      // Annuler le debounce et forcer la sauvegarde avant fermeture
      if (this._saveTimer) {
        clearTimeout(this._saveTimer);
        this._saveTimer = null;
      }
      this.save();
      this.db.close();
    }
  }
}

module.exports = DatabaseManager;
