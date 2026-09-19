
import React, { useState, useCallback } from 'react';
import { db } from '../services/electronDB';
import Button from '../components/ui/Button';
import { exportData } from '../services/exportService';
import { formatCurrency, formatDate, formatCompactCurrency } from '../utils/formatter';
import Input from '../components/ui/Input';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { captureMultipleCharts } from '../utils/chartCapture';

type ReportType = 'expenses' | 'income' | 'summary' | 'ledger';
type PeriodType = 'monthly' | 'yearly' | 'custom';

/** Entrée générique dans un rapport (ligne de tableau) */
interface ReportRow {
  date: string;
  description: string;
  category?: string;
  source?: string;
  amount: number;
  type?: string;
  [key: string]: string | number | undefined;
}

/** Donnée pour les graphiques de rapport (barres, courbes) */
interface ReportChartEntry {
  name: string;
  depenses?: number;
  revenus?: number;
  balance?: number;
  [key: string]: string | number | undefined;
}

/** Donnée pour les graphiques en secteurs de rapport */
interface ReportPieEntry {
  name: string;
  value: number;
}

const Reports: React.FC = () => {
  const [reportType, setReportType] = useState<ReportType>('summary');
  const [period, setPeriod] = useState<PeriodType>('monthly');

  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [reportData, setReportData] = useState<ReportRow[] | null>(null);
  const [reportTitle, setReportTitle] = useState('');
  const [chartData, setChartData] = useState<ReportChartEntry[]>([]);
  const [categoryChartData, setCategoryChartData] = useState<ReportPieEntry[]>([]);
  const [typeChartData, setTypeChartData] = useState<ReportPieEntry[]>([]);
  const [reportComments, setReportComments] = useState('');

  const generateReport = useCallback(async () => {
    let start: Date;
    let end: Date;
    let title = '';

    if (period === 'yearly') {
      start = new Date(year, 0, 1);
      end = new Date(year, 11, 31, 23, 59, 59);
      title = `Rapport Annuel ${year}`;
    } else if (period === 'monthly') {
      start = new Date(year, month - 1, 1);
      end = new Date(year, month, 0, 23, 59, 59);
      const monthName = start.toLocaleString('fr-FR', { month: 'long' });
      title = `Rapport Mensuel - ${monthName} ${year}`;
    } else {
      if (!startDate || !endDate) return;
      start = new Date(startDate);
      end = new Date(endDate);
      // Set end time to end of day
      end.setHours(23, 59, 59);
      title = `Rapport du ${formatDate(start.toISOString())} au ${formatDate(end.toISOString())}`;
    }

    setReportTitle(title);

    const startISO = start.toISOString().split('T')[0];
    const endISO = end.toISOString().split('T')[0];

    // Fetch data helpers
    const getInvoices = async () => (await db.invoices.where('issueDate').between(startISO, endISO)).filter(inv => inv.status === 'Payée').toArray();
    const getExpenses = async () => (await db.expenses.where('date').between(startISO, endISO)).toArray();
    const getRecettes = async () => (await db.recettes.where('date').between(startISO, endISO)).toArray();
    const getVouchers = async () => (await db.vouchers.where('issueDate').between(startISO, endISO)).toArray();
    const getSalaries = async () => (await db.salaries.where('paymentDate').between(startISO, endISO)).toArray();

    let data: any[] = [];

    switch (reportType) {
      case 'expenses':
        const exp = await getExpenses();
        const sal = await getSalaries();
        const vouch = await getVouchers();
        // Normalize
        data = [
          ...exp.map(e => ({ type: 'Dépense', date: e.date, desc: e.description, category: e.category, amount: e.amount })),
          ...sal.map(s => ({ type: 'Salaire', date: s.paymentDate, desc: s.employeeName, category: 'Salaires', amount: s.amount })),
          ...vouch.map(v => ({ type: 'Bon de Caisse', date: v.issueDate, desc: v.reason, category: 'Autre', amount: v.amount }))
        ];
        data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        setReportData(data);

        // Graphiques par catégorie
        const expensesByCategory: { [key: string]: number } = {};
        data.forEach(item => {
          expensesByCategory[item.category] = (expensesByCategory[item.category] || 0) + item.amount;
        });
        setCategoryChartData(Object.entries(expensesByCategory).map(([name, value]) => ({ name, value })));

        // Graphiques par type
        const expensesByType: { [key: string]: number } = {};
        data.forEach(item => {
          expensesByType[item.type] = (expensesByType[item.type] || 0) + item.amount;
        });
        setTypeChartData(Object.entries(expensesByType).map(([name, value]) => ({ name, value })));
        break;

      case 'income':
        const inv = await getInvoices();
        const rec = await getRecettes();
        data = [
          ...inv.map(i => ({ type: 'Facture', date: i.issueDate, desc: `Facture ${i.invoiceNumber}`, category: i.invoiceNumber, amount: i.totalAmount })),
          ...rec.map(r => ({ type: 'Recette', date: r.date, desc: r.description, category: r.source, amount: r.amount }))
        ];
        data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        setReportData(data);

        // Graphiques par type
        const incomeByType: { [key: string]: number } = {};
        data.forEach(item => {
          incomeByType[item.type] = (incomeByType[item.type] || 0) + item.amount;
        });
        setTypeChartData(Object.entries(incomeByType).map(([name, value]) => ({ name, value })));

        // Graphiques par source (pour les recettes)
        const incomeBySource: { [key: string]: number } = {};
        rec.forEach(item => {
          incomeBySource[item.source] = (incomeBySource[item.source] || 0) + item.amount;
        });
        if (inv.length > 0) {
          incomeBySource['Factures'] = inv.reduce((sum, x) => sum + x.totalAmount, 0);
        }
        setCategoryChartData(Object.entries(incomeBySource).map(([name, value]) => ({ name, value })));
        break;

      case 'summary':
        const e = await getExpenses();
        const s = await getSalaries();
        const v = await getVouchers();
        const i = await getInvoices();
        const r = await getRecettes();

        const totalExp = e.reduce((sum, x) => sum + x.amount, 0);
        const totalSal = s.reduce((sum, x) => sum + x.amount, 0);
        const totalVou = v.reduce((sum, x) => sum + x.amount, 0);
        const totalOut = totalExp + totalSal + totalVou;

        const totalInv = i.reduce((sum, x) => sum + x.totalAmount, 0);
        const totalRec = r.reduce((sum, x) => sum + x.amount, 0);
        const totalIn = totalInv + totalRec;

        setReportData([
          { item: 'Total Factures Payées', amount: totalInv },
          { item: 'Total Autres Recettes', amount: totalRec },
          { item: 'Total Revenus', amount: totalIn, isTotal: true },
          { item: 'Total Dépenses', amount: totalExp },
          { item: 'Total Salaires', amount: totalSal },
          { item: 'Total Bons de Caisse', amount: totalVou },
          { item: 'Total Sorties', amount: totalOut, isTotal: true },
          { item: 'SOLDE PÉRIODE', amount: totalIn - totalOut, isTotal: true, isNet: true }
        ]);

        // Graphique comparatif Revenus vs Dépenses
        setTypeChartData([
          { name: 'Revenus', value: totalIn },
          { name: 'Dépenses', value: totalOut }
        ]);

        // Graphique détaillé des dépenses
        const expensesBreakdown = [];
        if (totalExp > 0) expensesBreakdown.push({ name: 'Dépenses diverses', value: totalExp });
        if (totalSal > 0) expensesBreakdown.push({ name: 'Salaires', value: totalSal });
        if (totalVou > 0) expensesBreakdown.push({ name: 'Bons de Caisse', value: totalVou });
        setCategoryChartData(expensesBreakdown);

        // Chart Data Generation (Daily Balance)
        const allTx = [
          ...i.map(x => ({ date: x.issueDate, amount: x.totalAmount })),
          ...r.map(x => ({ date: x.date, amount: x.amount })),
          ...e.map(x => ({ date: x.date, amount: -x.amount })),
          ...s.map(x => ({ date: x.paymentDate, amount: -x.amount })),
          ...v.map(x => ({ date: x.issueDate, amount: -x.amount }))
        ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        let runningBalance = 0;
        const chartPoints: any[] = [];

        // Initial balance before period? For simplicity, we start at 0 or just show period flux
        // Showing flux over period
        allTx.forEach(tx => {
          runningBalance += tx.amount;
          chartPoints.push({ date: tx.date, solde: runningBalance });
        });
        setChartData(chartPoints);
        break;

      case 'ledger':
        const l_e = await getExpenses();
        const l_s = await getSalaries();
        const l_v = await getVouchers();
        const l_i = await getInvoices();
        const l_r = await getRecettes();

        data = [
          ...l_i.map(x => ({ date: x.issueDate, type: 'Recette', subtype: 'Facture', ref: x.invoiceNumber, tiers: x.clientName, debit: 0, credit: x.totalAmount })),
          ...l_r.map(x => ({ date: x.date, type: 'Recette', subtype: 'Autre', ref: 'REC', tiers: x.source, debit: 0, credit: x.amount })),
          ...l_e.map(x => ({ date: x.date, type: 'Dépense', subtype: 'Achat', ref: '', tiers: x.category, debit: x.amount, credit: 0 })),
          ...l_s.map(x => ({ date: x.paymentDate, type: 'Dépense', subtype: 'Salaire', ref: x.period, tiers: x.employeeName, debit: x.amount, credit: 0 })),
          ...l_v.map(x => ({ date: x.issueDate, type: 'Dépense', subtype: 'Bon', ref: x.voucherNumber, tiers: x.beneficiary, debit: x.amount, credit: 0 }))
        ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        setReportData(data);
        break;
    }
  }, [reportType, period, year, month, startDate, endDate]);

  const handleExport = async (format: 'pdf' | 'excel' | 'word') => {
    if (!reportData) return;

    let columns;
    let data = reportData;
    let title = reportTitle;

    switch (reportType) {
      case 'expenses':
        columns = [
          { header: 'Date', accessor: 'date' },
          { header: 'Type', accessor: 'type' },
          { header: 'Description', accessor: 'desc' },
          { header: 'Catégorie', accessor: 'category' },
          { header: 'Montant', accessor: 'amount' },
        ];
        data = data.map(d => ({ ...d, date: formatDate(d.date) }));
        break;
      case 'income':
        columns = [
          { header: 'Date', accessor: 'date' },
          { header: 'Type', accessor: 'type' },
          { header: 'Description', accessor: 'desc' },
          { header: 'Source', accessor: 'category' },
          { header: 'Montant', accessor: 'amount' },
        ];
        data = data.map(d => ({ ...d, date: formatDate(d.date) }));
        break;
      case 'summary':
        columns = [{ header: 'Élément', accessor: 'item' }, { header: 'Montant', accessor: 'amount' }];
        break;
      case 'ledger':
        columns = [
          { header: 'Date', accessor: 'date' },
          { header: 'Type', accessor: 'subtype' },
          { header: 'Réf.', accessor: 'ref' },
          { header: 'Tiers', accessor: 'tiers' },
          { header: 'Débit', accessor: 'debit' },
          { header: 'Crédit', accessor: 'credit' },
        ];
        data = data.map(d => ({ ...d, date: formatDate(d.date) }));
        title = `Grand Livre - ${title}`;
        break;
    }

    // Capture charts if exporting to PDF
    let chartImages: (string | null)[] = [];
    if (format === 'pdf') {
      const chartIds: string[] = [];

      // Collect chart IDs based on report type
      if (reportType === 'summary') {
        if (chartData.length > 0) chartIds.push('chart-evolution');
        if (typeChartData.length > 0) chartIds.push('chart-comparison');
        if (categoryChartData.length > 0) chartIds.push('chart-expenses-breakdown');
      } else if (reportType === 'expenses') {
        if (categoryChartData.length > 0) chartIds.push('chart-expenses-category');
        if (typeChartData.length > 0) chartIds.push('chart-expenses-type');
      } else if (reportType === 'income') {
        if (categoryChartData.length > 0) chartIds.push('chart-income-source');
        if (typeChartData.length > 0) chartIds.push('chart-income-type');
      }

      if (chartIds.length > 0) {
        chartImages = await captureMultipleCharts(chartIds);
      }
    }

    // Use enhanced export function that supports charts and comments
    await exportData(format, title, columns, data, reportComments, chartImages);
  };

  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);
  const months = Array.from({ length: 12 }, (_, i) => ({ val: i + 1, name: new Date(0, i).toLocaleString('fr-FR', { month: 'long' }) }));

  const renderContent = () => {
    if (!reportData) return <div className="text-center py-10 text-gray-500">Sélectionnez les paramètres et cliquez sur "Générer".</div>;

    return (
      <div className="mt-8 space-y-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-800">{reportTitle}</h3>
          <div className="space-x-2">
            <Button variant="secondary" onClick={() => handleExport('excel')}>Excel</Button>
            <Button variant="secondary" onClick={() => handleExport('pdf')}>PDF</Button>
          </div>
        </div>

        {/* Section Commentaires */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <label className="block text-sm font-semibold text-blue-900 mb-2">
            📝 Commentaires & Remarques (optionnel)
          </label>
          <textarea
            value={reportComments}
            onChange={(e) => setReportComments(e.target.value)}
            placeholder="Ajoutez vos commentaires, observations ou analyses sur ce rapport... Ces remarques seront incluses dans l'export PDF."
            className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            rows={4}
          />
          <p className="text-xs text-blue-700 mt-1">
            💡 Ces commentaires apparaîtront en début de rapport pour contextualiser les données.
          </p>
        </div>

        {/* CHARTS FOR SUMMARY */}
        {reportType === 'summary' && chartData.length > 0 && (
          <div className="space-y-6">
            <div className="bg-white p-4 border rounded-lg shadow-sm" id="chart-evolution">
              <h4 className="text-lg font-semibold mb-4">Évolution du Solde (Période)</h4>
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickFormatter={(t) => new Date(t).toLocaleDateString()} />
                    <YAxis width={60} tickFormatter={(v) => formatCompactCurrency(v)} />
                    <Tooltip labelFormatter={(t) => new Date(t).toLocaleDateString()} formatter={(v: number) => formatCurrency(v)} />
                    <Line type="monotone" dataKey="solde" stroke="#10b981" strokeWidth={2} dot={false} name="Solde" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Graphique comparatif */}
              {typeChartData.length > 0 && (
                <div className="bg-white p-4 border rounded-lg shadow-sm" id="chart-comparison">
                  <h4 className="text-lg font-semibold mb-4">Revenus vs Dépenses</h4>
                  <div style={{ width: '100%', height: 250 }}>
                    <ResponsiveContainer>
                      <BarChart data={typeChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis width={60} tickFormatter={(v) => formatCompactCurrency(v)} />
                        <Tooltip formatter={(v: number) => formatCurrency(v)} />
                        <Bar dataKey="value" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Répartition des dépenses */}
              {categoryChartData.length > 0 && (
                <div className="bg-white p-4 border rounded-lg shadow-sm" id="chart-expenses-breakdown">
                  <h4 className="text-lg font-semibold mb-4">Répartition des Dépenses</h4>
                  <div style={{ width: '100%', height: 250 }}>
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie data={categoryChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                          {categoryChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={['#ef4444', '#f59e0b', '#8b5cf6'][index % 3]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number) => formatCurrency(v)} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* CHARTS FOR EXPENSES */}
        {reportType === 'expenses' && (categoryChartData.length > 0 || typeChartData.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Par catégorie */}
            {categoryChartData.length > 0 && (
              <div className="bg-white p-4 border rounded-lg shadow-sm" id="chart-expenses-category">
                <h4 className="text-lg font-semibold mb-4">Dépenses par Catégorie</h4>
                <div style={{ width: '100%', height: 300 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={categoryChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                        {categoryChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={['#ef4444', '#f59e0b', '#8b5cf6', '#06b6d4', '#10b981', '#ec4899'][index % 6]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Par type */}
            {typeChartData.length > 0 && (
              <div className="bg-white p-4 border rounded-lg shadow-sm" id="chart-expenses-type">
                <h4 className="text-lg font-semibold mb-4">Dépenses par Type</h4>
                <div style={{ width: '100%', height: 300 }}>
                  <ResponsiveContainer>
                    <BarChart data={typeChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis tickFormatter={(v) => formatCurrency(v)} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <Bar dataKey="value" fill="#ef4444" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        )}

        {/* CHARTS FOR INCOME */}
        {reportType === 'income' && (categoryChartData.length > 0 || typeChartData.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Par source */}
            {categoryChartData.length > 0 && (
              <div className="bg-white p-4 border rounded-lg shadow-sm" id="chart-income-source">
                <h4 className="text-lg font-semibold mb-4">Revenus par Source</h4>
                <div style={{ width: '100%', height: 300 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={categoryChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                        {categoryChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={['#10b981', '#06b6d4', '#8b5cf6', '#f59e0b'][index % 4]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Par type */}
            {typeChartData.length > 0 && (
              <div className="bg-white p-4 border rounded-lg shadow-sm" id="chart-income-type">
                <h4 className="text-lg font-semibold mb-4">Revenus par Type</h4>
                <div style={{ width: '100%', height: 300 }}>
                  <ResponsiveContainer>
                    <BarChart data={typeChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis tickFormatter={(v) => formatCurrency(v)} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <Bar dataKey="value" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        )}

        {/* DATA TABLE */}
        <div className="overflow-x-auto bg-white border rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              {reportType === 'ledger' ? (
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Réf.</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tiers</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Débit</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Crédit</th>
                </tr>
              ) : reportType === 'summary' ? (
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Libellé</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Montant</th>
                </tr>
              ) : (
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{reportType === 'income' ? 'Source' : 'Catégorie'}</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Montant</th>
                </tr>
              )}
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reportData.map((row, i) => {
                if (reportType === 'ledger') {
                  return (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.date || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.subtype}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.ref}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.tiers}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">{row.debit > 0 ? formatCurrency(row.debit) : '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">{row.credit > 0 ? formatCurrency(row.credit) : '-'}</td>
                    </tr>
                  );
                } else if (reportType === 'summary') {
                  return (
                    <tr key={i} className={`${row.isNet ? 'bg-blue-50 font-bold' : (row.isTotal ? 'bg-gray-50 font-semibold' : '')}`}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.item}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">{formatCurrency(row.amount)}</td>
                    </tr>
                  );
                } else {
                  return (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.date || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.type}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.desc}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.category}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">{formatCurrency(row.amount)}</td>
                    </tr>
                  );
                }
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md min-h-[500px]">
      <h2 className="text-xl font-semibold mb-6">Rapports & Analyses Financières</h2>

      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 grid grid-cols-1 lg:grid-cols-4 gap-4 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type de Rapport</label>
          <select
            value={reportType}
            onChange={e => setReportType(e.target.value as ReportType)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          >
            <option value="summary">Synthèse Globale</option>
            <option value="ledger">Grand Livre</option>
            <option value="income">Détail Revenus</option>
            <option value="expenses">Détail Dépenses</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Période</label>
          <select
            value={period}
            onChange={e => setPeriod(e.target.value as PeriodType)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          >
            <option value="monthly">Mensuel</option>
            <option value="yearly">Annuel</option>
            <option value="custom">Personnalisée</option>
          </select>
        </div>

        {period === 'monthly' && (
          <div className="flex space-x-2 lg:col-span-1">
            <div className="w-1/2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Mois</label>
              <select value={month} onChange={e => setMonth(Number(e.target.value))} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500">
                {months.map(m => <option key={m.val} value={m.val}>{m.name}</option>)}
              </select>
            </div>
            <div className="w-1/2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Année</label>
              <select value={year} onChange={e => setYear(Number(e.target.value))} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500">
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
        )}

        {period === 'yearly' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Année</label>
            <select value={year} onChange={e => setYear(Number(e.target.value))} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500">
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        )}

        {period === 'custom' && (
          <div className="flex space-x-2 lg:col-span-2 text-sm">
            <div>
              <label className="block font-medium mb-1">Début</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="rounded-md border-gray-300" />
            </div>
            <div>
              <label className="block font-medium mb-1">Fin</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="rounded-md border-gray-300" />
            </div>
          </div>
        )}

        <div>
          <Button onClick={generateReport} className="w-full justify-center">Générer</Button>
        </div>
      </div>

      {renderContent()}

    </div>
  );
};

export default Reports;