/**
 * Electron DB Service - Replaces Dexie with Electron IPC calls
 * Provides Dexie-compatible API interface including query methods
 */

import type { Expense, Invoice, Voucher, Recette, DocumentFile, OrganizationConfig, Salary, Contact, Budget, AnnualBudget } from '../types';

// Type declaration for window.electron
declare global {
  interface Window {
    electron?: {
      expenses: {
        getAll: () => Promise<Expense[]>;
        add: (expense: Omit<Expense, 'id'>) => Promise<Expense>;
        update: (id: number, expense: Partial<Expense>) => Promise<Expense>;
        delete: (id: number) => Promise<void>;
      };
      annualBudgets: {
        getAll: () => Promise<AnnualBudget[]>;
        add: (budget: Omit<AnnualBudget, 'id'>) => Promise<AnnualBudget>;
        update: (id: number, budget: Partial<AnnualBudget>) => Promise<AnnualBudget>;
        delete: (id: number) => Promise<void>;
      };
      invoices: {
        getAll: () => Promise<Invoice[]>;
        add: (invoice: Omit<Invoice, 'id'>) => Promise<Invoice>;
        update: (id: number, invoice: Partial<Invoice>) => Promise<Invoice>;
        delete: (id: number) => Promise<void>;
      };
      vouchers: {
        getAll: () => Promise<Voucher[]>;
        add: (voucher: Omit<Voucher, 'id'>) => Promise<Voucher>;
        update: (id: number, voucher: Partial<Voucher>) => Promise<Voucher>;
        delete: (id: number) => Promise<void>;
      };
      recettes: {
        getAll: () => Promise<Recette[]>;
        add: (recette: Omit<Recette, 'id'>) => Promise<Recette>;
        update: (id: number, recette: Partial<Recette>) => Promise<Recette>;
        delete: (id: number) => Promise<void>;
      };
      documents: {
        getAll: () => Promise<DocumentFile[]>;
        add: (doc: Omit<DocumentFile, 'id'>) => Promise<DocumentFile>;
        delete: (id: number) => Promise<void>;
      };
      organizationConfig: {
        getAll: () => Promise<OrganizationConfig[]>;
        add: (config: Omit<OrganizationConfig, 'id'>) => Promise<OrganizationConfig>;
        update: (id: number, config: Partial<OrganizationConfig>) => Promise<OrganizationConfig>;
        clear: () => Promise<void>;
      };
      salaries: {
        getAll: () => Promise<Salary[]>;
        add: (salary: Omit<Salary, 'id'>) => Promise<Salary>;
        update: (id: number, salary: Partial<Salary>) => Promise<Salary>;
        delete: (id: number) => Promise<void>;
      };
      contacts: {
        getAll: () => Promise<Contact[]>;
        add: (contact: Omit<Contact, 'id'>) => Promise<Contact>;
        update: (id: number, contact: Partial<Contact>) => Promise<Contact>;
        delete: (id: number) => Promise<void>;
      };
      budgets: {
        getAll: () => Promise<Budget[]>;
        add: (budget: Omit<Budget, 'id'>) => Promise<Budget>;
        update: (id: number, budget: Partial<Budget>) => Promise<Budget>;
        delete: (id: number) => Promise<void>;
      };
      auth: {
        hasPassword: () => Promise<boolean>;
        setPassword: (password: string) => Promise<boolean>;
        verifyPassword: (password: string) => Promise<boolean>;
        getData: () => Promise<any>;
        // adminDecrypt supprimé — les mots de passe sont des hashes one-way (scrypt)
        adminResetPassword: (adminKey: string, newPassword: string) => Promise<{success: boolean, error?: string}>;
        changePassword: (oldPassword: string, newPassword: string) => Promise<{success: boolean, error?: string}>;
      };
      backup: {
        save: (jsonData: string) => Promise<string>;
        restore: () => Promise<{ success: boolean; error?: string }>;
        selectCloudFolder: () => Promise<string | null>;
        getCloudConfig: () => Promise<{ path: string | null; lastBackup: string | null }>;
        setCloudPath: (path: string) => Promise<boolean>;
        saveToCloud: (jsonData: string) => Promise<{ success: boolean; path?: string; error?: string }>;
      };
      system: {
        factoryReset: (password: string) => Promise<{ success: boolean; error?: string }>;
      };
    };
  }
}

// Check if running in Electron
const isElectron = () => window.electron !== undefined;

// Dexie-compatible query builder
class QueryBuilder<T> {
  private data: T[];
  private filterFn?: (item: T) => boolean;
  private sortKey?: keyof T;
  private sortReverse: boolean = false;

  constructor(data: T[]) {
    this.data = data;
  }

  where(key: keyof T) {
    return {
      equals: (value: any) => {
        this.filterFn = (item) => item[key] === value;
        return this;
      },
      above: (value: any) => {
        this.filterFn = (item) => item[key] > value;
        return this;
      },
      below: (value: any) => {
        this.filterFn = (item) => item[key] < value;
        return this;
      },
      between: (lower: any, upper: any, includeLower = true, includeUpper = false) => {
        this.filterFn = (item) => {
          const val = item[key];
          const lowerMatch = includeLower ? val >= lower : val > lower;
          const upperMatch = includeUpper ? val <= upper : val < upper;
          return lowerMatch && upperMatch;
        };
        return this;
      },
    };
  }

  filter(fn: (item: T) => boolean) {
    const prevFilterFn = this.filterFn;
    if (prevFilterFn) {
      this.filterFn = (item) => prevFilterFn(item) && fn(item);
    } else {
      this.filterFn = fn;
    }
    return this;
  }

  orderBy(key: keyof T) {
    this.sortKey = key;
    return this;
  }

  reverse() {
    this.sortReverse = true;
    return this;
  }

  async toArray(): Promise<T[]> {
    let result = [...this.data];

    // Apply filter
    if (this.filterFn) {
      result = result.filter(this.filterFn);
    }

    // Apply sort
    if (this.sortKey) {
      result.sort((a, b) => {
        const aVal = a[this.sortKey!];
        const bVal = b[this.sortKey!];
        
        if (aVal < bVal) return this.sortReverse ? 1 : -1;
        if (aVal > bVal) return this.sortReverse ? -1 : 1;
        return 0;
      });
    }

    return result;
  }
}

// Collection wrapper with Dexie-compatible methods
class Collection<T> {
  private getData: () => Promise<T[]>;
  private addItem: (item: Omit<T, 'id'>) => Promise<T>;
  private updateItem: (id: number, item: Partial<T>) => Promise<T>;
  private deleteItem: (id: number) => Promise<void>;

  constructor(
    getData: () => Promise<T[]>,
    addItem: (item: Omit<T, 'id'>) => Promise<T>,
    updateItem: (id: number, item: Partial<T>) => Promise<T>,
    deleteItem: (id: number) => Promise<void>
  ) {
    this.getData = getData;
    this.addItem = addItem;
    this.updateItem = updateItem;
    this.deleteItem = deleteItem;
  }

  async toArray(): Promise<T[]> {
    if (!isElectron()) throw new Error('Not running in Electron');
    return this.getData();
  }

  async add(item: Omit<T, 'id'>): Promise<T> {
    if (!isElectron()) throw new Error('Not running in Electron');
    return this.addItem(item);
  }

  async update(id: number, changes: Partial<T>): Promise<T> {
    if (!isElectron()) throw new Error('Not running in Electron');
    return this.updateItem(id, changes);
  }

  async delete(id: number): Promise<void> {
    if (!isElectron()) throw new Error('Not running in Electron');
    return this.deleteItem(id);
  }

  // Dexie-compatible query methods
  where(key: keyof T) {
    const self = this;
    return {
      equals: async (value: any) => {
        const data = await self.getData();
        const builder = new QueryBuilder(data);
        builder.where(key).equals(value);
        return builder;
      },
      above: async (value: any) => {
        const data = await self.getData();
        const builder = new QueryBuilder(data);
        builder.where(key).above(value);
        return builder;
      },
      below: async (value: any) => {
        const data = await self.getData();
        const builder = new QueryBuilder(data);
        builder.where(key).below(value);
        return builder;
      },
      between: async (lower: any, upper: any, includeLower = true, includeUpper = false) => {
        const data = await self.getData();
        const builder = new QueryBuilder(data);
        builder.where(key).between(lower, upper, includeLower, includeUpper);
        return builder;
      },
    };
  }

  orderBy(key: keyof T) {
    const self = this;
    return {
      toArray: async () => {
        const data = await self.getData();
        return new QueryBuilder(data).orderBy(key).toArray();
      },
      reverse: () => {
        return {
          toArray: async () => {
            const data = await self.getData();
            return new QueryBuilder(data).orderBy(key).reverse().toArray();
          },
        };
      },
    };
  }

  // Bulk operations
  async bulkAdd(items: Omit<T, 'id'>[]): Promise<void> {
    if (!isElectron()) throw new Error('Not running in Electron');
    for (const item of items) {
      await this.addItem(item);
    }
  }

  async clear(): Promise<void> {
    if (!isElectron()) throw new Error('Not running in Electron');
    const all = await this.getData();
    for (const item of all) {
      await this.deleteItem((item as any).id);
    }
  }
}

// Dexie-compatible API wrapper
export const db = {
  expenses: new Collection<Expense>(
    () => window.electron!.expenses.getAll(),
    (item) => window.electron!.expenses.add(item),
    (id, changes) => window.electron!.expenses.update(id, changes),
    (id) => window.electron!.expenses.delete(id)
  ),

  invoices: new Collection<Invoice>(
    () => window.electron!.invoices.getAll(),
    (item) => window.electron!.invoices.add(item),
    (id, changes) => window.electron!.invoices.update(id, changes),
    (id) => window.electron!.invoices.delete(id)
  ),

  vouchers: new Collection<Voucher>(
    () => window.electron!.vouchers.getAll(),
    (item) => window.electron!.vouchers.add(item),
    (id, changes) => window.electron!.vouchers.update(id, changes),
    (id) => window.electron!.vouchers.delete(id)
  ),

  recettes: new Collection<Recette>(
    () => window.electron!.recettes.getAll(),
    (item) => window.electron!.recettes.add(item),
    (id, changes) => window.electron!.recettes.update(id, changes),
    (id) => window.electron!.recettes.delete(id)
  ),

  documents: new Collection<DocumentFile>(
    () => window.electron!.documents.getAll(),
    (item) => window.electron!.documents.add(item),
    () => Promise.resolve({} as DocumentFile), // no update for documents
    (id) => window.electron!.documents.delete(id)
  ),

  organizationConfig: {
    toArray: async () => {
      if (!isElectron()) throw new Error('Not running in Electron');
      return window.electron!.organizationConfig.getAll();
    },
    add: async (config: Omit<OrganizationConfig, 'id'>) => {
      if (!isElectron()) throw new Error('Not running in Electron');
      return window.electron!.organizationConfig.add(config);
    },
    update: async (id: number, changes: Partial<OrganizationConfig>) => {
      if (!isElectron()) throw new Error('Not running in Electron');
      return window.electron!.organizationConfig.update(id, changes);
    },
    clear: async () => {
      if (!isElectron()) throw new Error('Not running in Electron');
      return window.electron!.organizationConfig.clear();
    },
    bulkAdd: async (items: Omit<OrganizationConfig, 'id'>[]) => {
      if (!isElectron()) throw new Error('Not running in Electron');
      for (const item of items) {
        await window.electron!.organizationConfig.add(item);
      }
    },
  },

  salaries: new Collection<Salary>(
    () => window.electron!.salaries.getAll(),
    (item) => window.electron!.salaries.add(item),
    (id, changes) => window.electron!.salaries.update(id, changes),
    (id) => window.electron!.salaries.delete(id)
  ),

  contacts: new Collection<Contact>(
    () => window.electron!.contacts.getAll(),
    (item) => window.electron!.contacts.add(item),
    (id, changes) => window.electron!.contacts.update(id, changes),
    (id) => window.electron!.contacts.delete(id)
  ),

  budgets: new Collection<Budget>(
    () => window.electron!.budgets.getAll(),
    (item) => window.electron!.budgets.add(item),
    (id, changes) => window.electron!.budgets.update(id, changes),
    (id) => window.electron!.budgets.delete(id)
  ),

  annualBudgets: new Collection<AnnualBudget>(
    () => window.electron!.annualBudgets.getAll(),
    (item) => window.electron!.annualBudgets.add(item),
    (id, changes) => window.electron!.annualBudgets.update(id, changes),
    (id) => window.electron!.annualBudgets.delete(id)
  ),

  // Utility to check tables (for compatibility)
  tables: ['expenses', 'invoices', 'vouchers', 'recettes', 'documents', 'organizationConfig', 'salaries', 'contacts', 'budgets', 'annualBudgets'],
  
  // Transaction support (simplified for Electron)
  transaction: async (_mode: string, tables: any[], callback: () => Promise<void>) => {
    // In Electron, we don't have real transactions, but we can still execute the callback
    await callback();
  },

  backup: {
    save: async (jsonData: string) => {
        if (!isElectron()) throw new Error('Not running in Electron');
        return window.electron!.backup.save(jsonData);
    },
    restore: async () => {
        if (!isElectron()) throw new Error('Not running in Electron');
        return window.electron!.backup.restore();
    },
    selectCloudFolder: async () => {
        if (!isElectron()) throw new Error('Not running in Electron');
        return window.electron!.backup.selectCloudFolder();
    },
    getCloudConfig: async () => {
        if (!isElectron()) throw new Error('Not running in Electron');
        return window.electron!.backup.getCloudConfig();
    },
    setCloudPath: async (path: string) => {
        if (!isElectron()) throw new Error('Not running in Electron');
        return window.electron!.backup.setCloudPath(path);
    },
    saveToCloud: async (jsonData: string) => {
        if (!isElectron()) throw new Error('Not running in Electron');
        return window.electron!.backup.saveToCloud(jsonData);
    }
  },
  
  auth: {
      getData: async () => {
          if (!isElectron()) throw new Error('Not running in Electron');
          return window.electron!.auth.getData();
      }
  },

  system: {
    factoryReset: async (password: string) => {
        if (!isElectron()) throw new Error('Not running in Electron');
        return window.electron!.system.factoryReset(password);
    }
  }
};

export default db;
