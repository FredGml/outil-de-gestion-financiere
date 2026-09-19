-- Table Expenses
CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    amount REAL NOT NULL
);

-- Table Invoices
CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoiceNumber TEXT NOT NULL,
    clientName TEXT NOT NULL,
    issueDate TEXT NOT NULL,
    dueDate TEXT NOT NULL,
    items TEXT NOT NULL,
    totalAmount REAL NOT NULL,
    status TEXT NOT NULL
);

-- Table Vouchers
CREATE TABLE IF NOT EXISTS vouchers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    voucherNumber TEXT NOT NULL,
    beneficiary TEXT NOT NULL,
    issueDate TEXT NOT NULL,
    reason TEXT NOT NULL,
    amount REAL NOT NULL
);

-- Table Recettes
CREATE TABLE IF NOT EXISTS recettes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    description TEXT NOT NULL,
    source TEXT NOT NULL,
    amount REAL NOT NULL
);

-- Table Documents
CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    uploadDate TEXT NOT NULL,
    fileData BLOB NOT NULL
);

-- Table Organization Config
CREATE TABLE IF NOT EXISTS organization_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    registrationNumber TEXT,
    phone TEXT,
    email TEXT,
    brandColor TEXT,
    logo TEXT,
    isConfigured INTEGER DEFAULT 0
);

-- Table Salaries
CREATE TABLE IF NOT EXISTS salaries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employeeName TEXT NOT NULL,
    period TEXT NOT NULL,
    amount REAL NOT NULL,
    paymentDate TEXT NOT NULL,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS budgets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL UNIQUE,
    monthlyLimit REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS annual_budgets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT UNIQUE NOT NULL,
  yearlyLimit REAL NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoiceNumber);
CREATE INDEX IF NOT EXISTS idx_vouchers_date ON vouchers(issueDate);
CREATE INDEX IF NOT EXISTS idx_recettes_date ON recettes(date);

-- Table Authentication
CREATE TABLE IF NOT EXISTS auth (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    passwordEncrypted TEXT NOT NULL,
    iv TEXT NOT NULL,
    authTag TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    lastLogin TEXT
);

-- Table App Settings (Key-Value Store)
CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT
);
