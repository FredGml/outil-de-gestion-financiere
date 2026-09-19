const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  // EXPENSES
  expenses: {
    getAll: () => ipcRenderer.invoke('expenses:getAll'),
    add: (expense) => ipcRenderer.invoke('expenses:add', expense),
    update: (id, expense) => ipcRenderer.invoke('expenses:update', id, expense),
    delete: (id) => ipcRenderer.invoke('expenses:delete', id),
  },
  
  // INVOICES
  invoices: {
    getAll: () => ipcRenderer.invoke('invoices:getAll'),
    add: (invoice) => ipcRenderer.invoke('invoices:add', invoice),
    update: (id, invoice) => ipcRenderer.invoke('invoices:update', id, invoice),
    delete: (id) => ipcRenderer.invoke('invoices:delete', id),
  },
  
  // VOUCHERS
  vouchers: {
    getAll: () => ipcRenderer.invoke('vouchers:getAll'),
    add: (voucher) => ipcRenderer.invoke('vouchers:add', voucher),
    update: (id, voucher) => ipcRenderer.invoke('vouchers:update', id, voucher),
    delete: (id) => ipcRenderer.invoke('vouchers:delete', id),
  },
  
  // RECETTES
  recettes: {
    getAll: () => ipcRenderer.invoke('recettes:getAll'),
    add: (recette) => ipcRenderer.invoke('recettes:add', recette),
    update: (id, recette) => ipcRenderer.invoke('recettes:update', id, recette),
    delete: (id) => ipcRenderer.invoke('recettes:delete', id),
  },
  
  // DOCUMENTS
  documents: {
    getAll: () => ipcRenderer.invoke('documents:getAll'),
    add: (doc) => ipcRenderer.invoke('documents:add', doc),
    delete: (id) => ipcRenderer.invoke('documents:delete', id),
  },
  
  // ORGANIZATION CONFIG
  organizationConfig: {
    getAll: () => ipcRenderer.invoke('organizationConfig:getAll'),
    add: (config) => ipcRenderer.invoke('organizationConfig:add', config),
    update: (id, config) => ipcRenderer.invoke('organizationConfig:update', id, config),
    clear: () => ipcRenderer.invoke('organizationConfig:clear'),
  },

  // SALARIES
  salaries: {
    getAll: () => ipcRenderer.invoke('salaries:getAll'),
    add: (salary) => ipcRenderer.invoke('salaries:add', salary),
    update: (id, salary) => ipcRenderer.invoke('salaries:update', id, salary),
    delete: (id) => ipcRenderer.invoke('salaries:delete', id),
  },

  // CONTACTS
  contacts: {
    getAll: () => ipcRenderer.invoke('contacts:getAll'),
    add: (contact) => ipcRenderer.invoke('contacts:add', contact),
    update: (id, contact) => ipcRenderer.invoke('contacts:update', id, contact),
    delete: (id) => ipcRenderer.invoke('contacts:delete', id),
  },

  // BUDGETS
  budgets: {
    getAll: () => ipcRenderer.invoke('budgets:getAll'),
    add: (budget) => ipcRenderer.invoke('budgets:add', budget),
    update: (id, budget) => ipcRenderer.invoke('budgets:update', id, budget),
    delete: (id) => ipcRenderer.invoke('budgets:delete', id),
  },

  // ANNUAL BUDGETS
  annualBudgets: {
    getAll: () => ipcRenderer.invoke('annual-budgets:getAll'),
    add: (budget) => ipcRenderer.invoke('annual-budgets:add', budget),
    update: (id, budget) => ipcRenderer.invoke('annual-budgets:update', id, budget),
    delete: (id) => ipcRenderer.invoke('annual-budgets:delete', id),
  },

  // AUTHENTICATION
  auth: {
    hasPassword: () => ipcRenderer.invoke('auth:hasPassword'),
    setPassword: (password) => ipcRenderer.invoke('auth:setPassword', password),
    verifyPassword: (password) => ipcRenderer.invoke('auth:verifyPassword', password),
    getData: () => ipcRenderer.invoke('auth:getData'),
    adminDecrypt: (adminKey) => ipcRenderer.invoke('auth:adminDecrypt', adminKey),
    adminResetPassword: (adminKey, newPassword) => ipcRenderer.invoke('auth:adminResetPassword', adminKey, newPassword),
    changePassword: (oldPassword, newPassword) => ipcRenderer.invoke('auth:changePassword', oldPassword, newPassword),
  },

  // AUTO-BACKUP
  backup: {
    save: (jsonData) => ipcRenderer.invoke('backup:save', jsonData),
    restore: () => ipcRenderer.invoke('backup:restore'),
    selectCloudFolder: () => ipcRenderer.invoke('backup:selectCloudFolder'),
    getCloudConfig: () => ipcRenderer.invoke('backup:getCloudConfig'),
    setCloudPath: (path) => ipcRenderer.invoke('backup:setCloudPath', path),
    saveToCloud: (jsonData) => ipcRenderer.invoke('backup:saveToCloud', jsonData),
  },

  // SYSTEM
  system: {
    factoryReset: (password) => ipcRenderer.invoke('system:factoryReset', password),
  },
});
