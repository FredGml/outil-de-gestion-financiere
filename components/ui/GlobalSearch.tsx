import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../services/electronDB';
import { Invoice, Expense, Salary, DocumentFile, Recette, Page } from '../../types';
import { SearchIcon } from '../icons/Icons';
import { formatCurrency, formatDate } from '../../utils/formatter';

interface SearchResults {
    invoices: Invoice[];
    expenses: Expense[];
    salaries: Salary[];
    documents: DocumentFile[];
    recettes: Recette[];
}

interface GlobalSearchProps {
    onNavigate: (page: Page) => void;
}

const GlobalSearch: React.FC<GlobalSearchProps> = ({ onNavigate }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResults>({ invoices: [], expenses: [], salaries: [], documents: [], recettes: [] });
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        // Annuler le debounce précédent
        if (debounceRef.current) clearTimeout(debounceRef.current);

        if (query.length < 2) {
            setResults({ invoices: [], expenses: [], salaries: [], documents: [], recettes: [] });
            setIsLoading(false);
            return;
        }

        setIsLoading(true);

        // Déclencher la recherche après 300ms d'inactivité
        debounceRef.current = setTimeout(async () => {
            const lowerQuery = query.toLowerCase();
            try {
                // Parallel fetching of all data
                const [allInvoices, allExpenses, allSalaries, allDocs, allRecettes] = await Promise.all([
                    db.invoices.toArray(),
                    db.expenses.toArray(),
                    db.salaries.toArray(),
                    db.documents.toArray(),
                    db.recettes.toArray()
                ]);

                // Filter results
                const invoices = allInvoices.filter(i =>
                    i.invoiceNumber.toLowerCase().includes(lowerQuery) ||
                    i.clientName.toLowerCase().includes(lowerQuery) ||
                    String(i.totalAmount).includes(lowerQuery)
                ).slice(0, 5);

                const expenses = allExpenses.filter(e =>
                    e.description.toLowerCase().includes(lowerQuery) ||
                    e.category.toLowerCase().includes(lowerQuery) ||
                    String(e.amount).includes(lowerQuery)
                ).slice(0, 5);

                const salaries = allSalaries.filter(s =>
                    s.employeeName.toLowerCase().includes(lowerQuery) ||
                    s.period.toLowerCase().includes(lowerQuery)
                ).slice(0, 5);

                const documents = allDocs.filter(d =>
                    d.name.toLowerCase().includes(lowerQuery) ||
                    d.type.toLowerCase().includes(lowerQuery)
                ).slice(0, 5);

                const recettes = allRecettes.filter(r =>
                    r.description.toLowerCase().includes(lowerQuery) ||
                    r.source.toLowerCase().includes(lowerQuery)
                ).slice(0, 5);

                setResults({ invoices, expenses, salaries, documents, recettes });
                setIsOpen(true);
            } catch (error) {
                console.error("Search failed", error);
            } finally {
                setIsLoading(false);
            }
        }, 300); // debounce 300ms

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [query]);

    const hasResults = (Object.values(results) as any[]).some(arr => arr.length > 0);

    const handleClick = (page: any, term: string) => {
        // Use sessionStorage to pass the search intent to the target page
        // This is a simple decoupled way to filter the target list
        sessionStorage.setItem('globalSearchTerm', term);
        onNavigate(page);
        setIsOpen(false);
        setQuery(''); // Clear global search
    };

    return (
        <div className="relative w-full max-w-xl" ref={wrapperRef}>
            <div className="relative">
                <input
                    type="text"
                    className="w-full pl-10 pr-4 py-2 border-none rounded-full bg-gray-100 focus:bg-white focus:ring-2 focus:ring-primary-500 transition-all duration-200 outline-none text-gray-700 placeholder-gray-500 shadow-sm"
                    placeholder="Rechercher partout (facture, montant, nom...)"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => { if (query.length >= 2) setIsOpen(true); }}
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {isLoading ? (
                        <div className="animate-spin h-4 w-4 border-2 border-primary-500 border-t-transparent rounded-full"></div>
                    ) : (
                        <SearchIcon className="h-5 w-5" />
                    )}
                </div>
            </div>

            {isOpen && query.length >= 2 && (
                <div className="absolute top-full mt-2 w-full bg-white rounded-lg shadow-xl border border-gray-100 max-h-96 overflow-y-auto z-50 animate-in fade-in zoom-in-95 duration-100">
                    {!hasResults && !isLoading ? (
                        <div className="p-4 text-center text-gray-500 text-sm">Aucun résultat trouvé</div>
                    ) : (
                        <div className="py-2">
                            {results.invoices.length > 0 && (
                                <Section title="Factures">
                                    {results.invoices.map(inv => (
                                        <ResultItem
                                            key={inv.id}
                                            title={inv.clientName}
                                            subtitle={`${inv.invoiceNumber} - ${formatCurrency(inv.totalAmount)}`}
                                            date={inv.issueDate}
                                            onClick={() => handleClick(Page.Invoices, inv.invoiceNumber)}
                                        />
                                    ))}
                                </Section>
                            )}
                            {results.expenses.length > 0 && (
                                <Section title="Dépenses">
                                    {results.expenses.map(exp => (
                                        <ResultItem
                                            key={exp.id}
                                            title={exp.description}
                                            subtitle={`${exp.category} - ${formatCurrency(exp.amount)}`}
                                            date={exp.date}
                                            onClick={() => handleClick(Page.Expenses, exp.description)}
                                        />
                                    ))}
                                </Section>
                            )}
                            {results.salaries.length > 0 && (
                                <Section title="Salaires">
                                    {results.salaries.map(sal => (
                                        <ResultItem
                                            key={sal.id}
                                            title={sal.employeeName}
                                            subtitle={`${sal.period} - ${formatCurrency(sal.amount)}`}
                                            date={sal.paymentDate}
                                            onClick={() => handleClick(Page.Salaries, sal.employeeName)}
                                        />
                                    ))}
                                </Section>
                            )}
                            {results.recettes.length > 0 && (
                                <Section title="Recettes">
                                    {results.recettes.map(rec => (
                                        <ResultItem
                                            key={rec.id}
                                            title={rec.description}
                                            subtitle={`${rec.source} - ${formatCurrency(rec.amount)}`}
                                            date={rec.date}
                                            onClick={() => handleClick(Page.Recettes, rec.description)}
                                        />
                                    ))}
                                </Section>
                            )}
                            {results.documents.length > 0 && (
                                <Section title="Documents">
                                    {results.documents.map(doc => (
                                        <ResultItem
                                            key={doc.id}
                                            title={doc.name}
                                            subtitle={doc.type}
                                            date={doc.uploadDate}
                                            onClick={() => handleClick(Page.Documents, doc.name)}
                                        />
                                    ))}
                                </Section>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="border-b last:border-b-0 border-gray-100">
        <h3 className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider bg-gray-50">{title}</h3>
        <div>{children}</div>
    </div>
);

const ResultItem: React.FC<{ title: string; subtitle: string; date?: string; onClick?: () => void }> = ({ title, subtitle, date, onClick }) => (
    <div className="px-4 py-2 hover:bg-gray-50 cursor-pointer transition-colors duration-150 group" onClick={onClick}>
        <div className="flex justify-between items-start">
            <div>
                <div className="text-sm font-medium text-gray-900 group-hover:text-primary-700">{title}</div>
                <div className="text-xs text-gray-500">{subtitle}</div>
            </div>
            {date && <div className="text-xs text-gray-400 whitespace-nowrap ml-2">{formatDate(date)}</div>}
        </div>
    </div>
);

export default GlobalSearch;
