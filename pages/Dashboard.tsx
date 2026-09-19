import React, { useState, useEffect } from 'react';
import { db } from '../services/electronDB';
import { formatCurrency, formatCompactCurrency } from '../utils/formatter';
import Card from '../components/ui/Card';
import { Invoice, Expense, Voucher, Recette, Salary, Page, Budget, AnnualBudget } from '../types';
import { ExpensesIcon, InvoiceIcon, ReportIcon, RecettesIcon, SettingsIcon } from '../components/icons/Icons';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import Button from '../components/ui/Button';

interface DashboardProps {
  onNavigate: (page: Page) => void;
}

/** Données mensuelles pour le graphique en barres (revenus vs dépenses) */
interface MonthlyChartEntry {
  name: string;      // Label du mois (ex: "Jan")
  revenus: number;
  depenses: number;
}

/** Données pour les graphiques en secteurs (camembert) */
interface PieChartEntry {
  name: string;      // Libellé de la catégorie ou source
  value: number;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [balance, setBalance] = useState(0);

  const [monthlyChartData, setMonthlyChartData] = useState<MonthlyChartEntry[]>([]);
  const [expensePieData, setExpensePieData] = useState<PieChartEntry[]>([]);
  const [incomePieData, setIncomePieData] = useState<PieChartEntry[]>([]);

  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [budgetUsage, setBudgetUsage] = useState<{ [category: string]: number }>({});

  const [annualBudgets, setAnnualBudgets] = useState<AnnualBudget[]>([]);
  const [annualBudgetUsage, setAnnualBudgetUsage] = useState<{ [category: string]: number }>({});

  useEffect(() => {
    const fetchData = async () => {
      // 1. Fetch Basic Data
      const allInvoices = await db.invoices.toArray();
      const invoices = allInvoices.filter(inv => inv.status === 'Payée');
      const invoiceIncome = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);

      const recettes = await db.recettes.toArray();
      const recetteIncome = recettes.reduce((sum, rec) => sum + rec.amount, 0);

      const allExpenses = await db.expenses.toArray();
      const expenseTotal = allExpenses.reduce((sum, exp) => sum + exp.amount, 0);

      const vouchers = await db.vouchers.toArray();
      const voucherTotal = vouchers.reduce((sum, vch) => sum + vch.amount, 0);

      const salaries = await db.salaries.toArray();
      const salaryTotal = salaries.reduce((sum, sal) => sum + sal.amount, 0);

      const totalOut = expenseTotal + voucherTotal + salaryTotal;
      const totalIn = invoiceIncome + recetteIncome;

      setTotalIncome(totalIn);
      setTotalExpenses(totalOut);
      setBalance(totalIn - totalOut);

      // 2. Monthly Bar Chart Data - Derniers 3 mois
      const monthlyData: { [key: string]: { revenus: number, depenses: number } } = {};
      const today = new Date();
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();

      for (let i = 2; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthKey = d.toLocaleString('fr-FR', { month: 'long', year: 'numeric' });
        monthlyData[monthKey] = { revenus: 0, depenses: 0 };
      }

      [...invoices, ...recettes].forEach(item => {
        const itemDate = new Date((item as Invoice).issueDate || (item as Recette).date);
        const monthKey = itemDate.toLocaleString('fr-FR', { month: 'long', year: 'numeric' });
        if (monthlyData[monthKey]) monthlyData[monthKey].revenus += (item as Invoice).totalAmount || (item as Recette).amount;
      });

      [...allExpenses, ...vouchers, ...salaries].forEach(item => {
        const itemDate = new Date((item as Expense).date || (item as Voucher).issueDate || (item as Salary).paymentDate);
        const monthKey = itemDate.toLocaleString('fr-FR', { month: 'long', 'year': 'numeric' });
        if (monthlyData[monthKey]) monthlyData[monthKey].depenses += item.amount;
      });
      setMonthlyChartData(Object.entries(monthlyData).map(([name, values]) => ({ name, ...values })));

      // 3. Expense Pie Chart Data
      const expenseByCategory = allExpenses.reduce((acc, exp) => {
        // Normalize category if needed
        acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
        return acc;
      }, {} as { [key: string]: number });
      setExpensePieData(Object.entries(expenseByCategory).map(([name, value]) => ({ name, value })));

      // 4. Income Pie Chart Data
      setIncomePieData([
        { name: 'Factures Payées', value: invoiceIncome },
        { name: 'Autres Recettes', value: recetteIncome },
      ]);

      // 5. Budget Data for Current Month
      const allBudgets = await db.budgets.toArray();
      setBudgets(allBudgets);

      const currentMonthUsage: { [category: string]: number } = {};
      const currentMonthStart = new Date(currentYear, currentMonth, 1);
      const currentMonthEnd = new Date(currentYear, currentMonth + 1, 0);

      const currentMonthExpenses = allExpenses.filter(e => {
        const d = new Date(e.date);
        return d >= currentMonthStart && d <= currentMonthEnd;
      });

      currentMonthExpenses.forEach(e => {
        const categoryKey = e.category.trim().toLowerCase();
        const budgetCategory = allBudgets.find(b => b.category.toLowerCase() === categoryKey)?.category;
        const key = budgetCategory || e.category;
        currentMonthUsage[key] = (currentMonthUsage[key] || 0) + e.amount;
      });
      setBudgetUsage(currentMonthUsage);

      // --- BUDGETS ANNUELS ---
      const allAnnualBudgets = await db.annualBudgets.toArray();
      setAnnualBudgets(allAnnualBudgets);

      const currentYearUsage: { [category: string]: number } = {};
      const currentYearStart = new Date(currentYear, 0, 1);
      const currentYearEnd = new Date(currentYear, 11, 31);

      const currentYearExpenses = allExpenses.filter(e => {
        const d = new Date(e.date);
        return d >= currentYearStart && d <= currentYearEnd;
      });

      currentYearExpenses.forEach(e => {
        const categoryKey = e.category.trim().toLowerCase();
        const budgetCategory = allAnnualBudgets.find(b => b.category.toLowerCase() === categoryKey)?.category;
        const key = budgetCategory || e.category;
        currentYearUsage[key] = (currentYearUsage[key] || 0) + e.amount;
      });
      setAnnualBudgetUsage(currentYearUsage);
    };

    fetchData();
  }, []);

  const renderMonthlyChart = () => {
    return (
      <ResponsiveContainer>
        <BarChart data={monthlyChartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="name"
            angle={-15}
            textAnchor="end"
            height={80}
            style={{ fontSize: '12px' }}
          />
          <YAxis width={60} tickFormatter={(value: any) => formatCompactCurrency(Number(value))} />
          <Tooltip formatter={(value: number) => formatCurrency(value)} />
          <Legend />
          <Bar dataKey="revenus" fill="#4ade80" name="Revenus" />
          <Bar dataKey="depenses" fill="#f87171" name="Dépenses" />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  const renderPieChart = (data: any[]) => {
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF195E'];
    return (
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} fill="#8884d8" label>
            {data.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
          </Pie>
          <Tooltip formatter={(value: number) => formatCurrency(value)} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  const renderBudgets = () => {
    return (
      <div className="space-y-4">
        {budgets.map(budget => {
          const used = budgetUsage[budget.category] || 0;
          const percent = Math.min((used / budget.monthlyLimit) * 100, 100);
          const isOver = used > budget.monthlyLimit;

          return (
            <div key={budget.id} className="w-full">
              <div className="flex justify-between items-center mb-1 text-sm">
                <span className="font-semibold">{budget.category}</span>
                <span className={`${isOver ? 'text-red-600 font-bold' : 'text-gray-600'}`}>
                  {formatCurrency(used)} / {formatCurrency(budget.monthlyLimit)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                <div
                  className={`h-2.5 rounded-full ${isOver ? 'bg-red-600' : (percent > 80 ? 'bg-yellow-400' : 'bg-green-500')}`}
                  style={{ width: `${percent}%` }}
                ></div>
              </div>
            </div>
          );
        })}
        {budgets.length === 0 && <p className="text-gray-500 text-sm">Aucun budget mensuel défini.</p>}
      </div>
    );
  };

  const renderAnnualBudgets = () => {
    return (
      <div className="space-y-4">
        {annualBudgets.map(budget => {
          const used = annualBudgetUsage[budget.category] || 0;
          const percent = Math.min((used / budget.yearlyLimit) * 100, 100);
          const isOver = used > budget.yearlyLimit;

          return (
            <div key={budget.id} className="w-full">
              <div className="flex justify-between items-center mb-1 text-sm">
                <span className="font-semibold">{budget.category}</span>
                <span className={`${isOver ? 'text-red-600 font-bold' : 'text-gray-600'}`}>
                  {formatCurrency(used)} / {formatCurrency(budget.yearlyLimit)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                <div
                  className={`h-2.5 rounded-full ${isOver ? 'bg-red-600' : (percent > 80 ? 'bg-yellow-400' : 'bg-green-500')}`}
                  style={{ width: `${percent}%` }}
                ></div>
              </div>
            </div>
          );
        })}
        {annualBudgets.length === 0 && <p className="text-gray-500 text-sm">Aucun budget annuel défini.</p>}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card
          title="Revenus Totaux"
          value={formatCurrency(totalIncome)}
          icon={<RecettesIcon className="h-6 w-6" />}
          colorClass="text-green-500"
        />
        <Card
          title="Dépenses Totales"
          value={formatCurrency(totalExpenses)}
          icon={<ExpensesIcon className="h-6 w-6" />}
          colorClass="text-red-500"
        />
        <Card
          title="Solde en Caisse"
          value={formatCurrency(balance)}
          icon={<ReportIcon className="h-6 w-6" />}
          colorClass="text-blue-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md lg:col-span-3">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Aperçu Mensuel (3 derniers mois)</h2>
          <div style={{ width: '100%', height: 300 }}>
            {renderMonthlyChart()}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Budgets Mensuels */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Suivi Mensuel</h2>
            <Button variant="secondary" onClick={() => onNavigate(Page.Budgets)} className="!p-1">
              <SettingsIcon className="h-5 w-5" />
            </Button>
          </div>
          <div className="max-h-[300px] overflow-y-auto">
            {renderBudgets()}
          </div>
        </div>

        {/* Budgets Annuels */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Suivi Annuel</h2>
            <Button variant="secondary" onClick={() => onNavigate(Page.Budgets)} className="!p-1">
              <SettingsIcon className="h-5 w-5" />
            </Button>
          </div>
          <div className="max-h-[300px] overflow-y-auto">
            {renderAnnualBudgets()}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Répartition des Dépenses</h2>
          <div style={{ width: '100%', height: 300 }}>
            {renderPieChart(expensePieData)}
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Sources de Revenus</h2>
          <div style={{ width: '100%', height: 300 }}>
            {renderPieChart(incomePieData)}
          </div>
        </div>
      </div>

    </div>
  );
};

export default Dashboard;
