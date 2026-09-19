// FIX: Removed self-import of `Page` which caused a declaration conflict.
export enum Page {
  Dashboard = 'Tableau de bord',
  Expenses = 'Dépenses',
  Invoices = 'Factures',
  Recettes = 'Recettes',
  Vouchers = 'Bons de caisse',
  Salaries = 'Salaires',
  Reports = 'Rapports',
  Documents = 'Documents',
  Settings = 'Paramètres',
  Contacts = 'Contacts',
  Budgets = 'Budgets',
}

export type ContactType = 'Client' | 'Fournisseur' | 'Employé' | 'Autre';

export interface Contact {
  id?: number;
  name: string;
  type: ContactType;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
}

export interface Budget {
  id?: number;
  category: string;
  monthlyLimit: number;
}

export interface AnnualBudget {
  id?: number;
  category: string;
  yearlyLimit: number;
}

export interface Expense {
  id?: number;
  date: string;
  description: string;
  category: string;
  amount: number;
}

export interface Recette {
  id?: number;
  date: string;
  description: string;
  source: string;
  amount: number;
}

export enum InvoiceStatus {
  Payee = 'Payée',
  EnAttente = 'En attente',
  EnRetard = 'En retard',
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface Invoice {
  id?: number;
  invoiceNumber: string;
  clientName: string;
  issueDate: string;
  dueDate: string;
  items: InvoiceItem[];
  totalAmount: number;
  status: InvoiceStatus;
}

export interface Voucher {
  id?: number;
  voucherNumber: string;
  beneficiary: string;
  issueDate: string;
  reason: string;
  amount: number;
}

export interface Salary {
  id?: number;
  employeeName: string;
  period: string; // e.g., "Janvier 2024"
  amount: number;
  paymentDate: string;
  notes?: string;
}

export interface DocumentFile {
  id?: number;
  name: string;
  type: string;
  uploadDate: string;
  fileData: Blob | string; // Can be Blob or base64 string
}

export interface OrganizationConfig {
  id?: number;
  name?: string;
  registrationNumber?: string;
  phone?: string;
  email?: string;
  brandColor?: string; // Hex color code (e.g., #167d7e)
  logo?: string; // Base64 encoded logo image
  isConfigured?: boolean; // To track if initial setup is complete
}