
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Document, Packer, Paragraph, Table, TableRow, TableCell, HeadingLevel, WidthType } from 'docx';
import { Voucher, Expense, Recette, Invoice, InvoiceItem, OrganizationConfig, Salary } from '../types';
import { formatCurrency, formatDate } from '../utils/formatter';
import { db } from './electronDB';

type ExportFormat = 'pdf' | 'excel' | 'word';

interface Column {
    header: string;
    accessor: string;
}

// Helper function to get organization config
const getOrganizationConfig = async (): Promise<OrganizationConfig | null> => {
    try {
        const configs = await db.organizationConfig.toArray();
        return configs.length > 0 ? configs[0] : null;
    } catch (error) {
        console.error('Error loading organization config:', error);
        return null;
    }
};

// Helper to generate unique filename with timestamp
const generateUniqueFilename = (baseName: string, extension: string = 'pdf'): string => {
    const now = new Date();
    const timestamp = now.toISOString()
        .replace(/[:.]/g, '-')
        .replace('T', '_')
        .split('.')[0]; // Format: YYYY-MM-DD_HH-MM-SS

    return `${baseName}_${timestamp}.${extension}`;
};

// Helper to get image dimensions
const getImageDimensions = (base64: string): Promise<{ width: number; height: number; ratio: number }> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            resolve({
                width: img.width,
                height: img.height,
                ratio: img.width / img.height
            });
        };
        img.src = base64;
    });
};

// Helper to resize/compress image
const resizeImage = (base64: string, maxWidth: number = 500): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            
            if (width > maxWidth) {
                height = (height * maxWidth) / width;
                width = maxWidth;
            }
            
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(img, 0, 0, width, height);
                // Use JPEG for charts (no alpha usually) to save massive space? 
                // But logo (alpha) needs PNG.
                // We'll stick to PNG but resized. Resizing from 4000px to 500px reduces size by 64x.
                resolve(canvas.toDataURL('image/png'));
            } else {
                resolve(base64);
            }
        };
        img.onerror = () => resolve(base64);
        img.src = base64;
    });
};

// Helper to calculate fitted dimensions
const getFittedDimensions = (
    originalWidth: number, 
    originalHeight: number, 
    maxWidth: number, 
    maxHeight: number
): { width: number; height: number } => {
    const ratio = originalWidth / originalHeight;
    
    let w = maxWidth;
    let h = w / ratio;
    
    if (h > maxHeight) {
        h = maxHeight;
        w = h * ratio;
    }
    
    return { width: w, height: h };
};

// Generic data export function
export const exportData = async (
    format: ExportFormat, 
    title: string, 
    columns: Column[], 
    data: any[], 
    comments?: string,
    chartImages?: (string | null)[]
) => {
    const config = await getOrganizationConfig();
    switch (format) {
        case 'pdf':
            await exportToPDF(title, columns, data, config, comments, chartImages);
            break;
        case 'excel':
            exportToExcel(title, columns, data);
            break;
        case 'word':
            exportToWord(title, columns, data);
            break;
    }
};

const addGenericHeader = async (doc: any, title: string, config: OrganizationConfig | null) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Determine brand color
    const brandColor = config?.brandColor || '#167d7e';
    const rgb = hexToRgb(brandColor);
    
    // Header background
    doc.setFillColor(rgb.r, rgb.g, rgb.b);
    doc.rect(0, 0, pageWidth, 25, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'normal');

    // Right Side: Contact Info (Always render if available)
    if (config) {
        doc.setFontSize(9);
        const rightMargin = pageWidth - 14;
        let yPos = 8;

        if (config.registrationNumber) {
            doc.text(`N°: ${config.registrationNumber}`, rightMargin, yPos, { align: 'right' });
            yPos += 5;
        }
        if (config.phone) {
            doc.text(`Tél: ${config.phone}`, rightMargin, yPos, { align: 'right' });
            yPos += 5;
        }
        if (config.email) {
            doc.text(`Email: ${config.email}`, rightMargin, yPos, { align: 'right' });
        }
    }

    // Left Side: Logo + Name (Centered at X=35)
    const leftAxis = 35; 
    let logoHeight = 0;

    if (config?.logo) {
        try {
            // Resize logo to avoid huge PDF size
            const resizedLogo = await resizeImage(config.logo, 400);
            const dims = await getImageDimensions(resizedLogo);
            // Fit to width 50, height 12 to leave room for text
            const { width, height } = getFittedDimensions(dims.width, dims.height, 50, 12);
            logoHeight = height;
            
            // Draw Image Centered at leftAxis
            doc.addImage(resizedLogo, 'PNG', leftAxis - (width / 2), 3, width, height);
        } catch (error) {
            console.error('Error adding logo to PDF:', error);
        }
    }
    
    if (config?.name) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        
        // Position name: if logo exists, below it. Else centered vertically.
        const nameY = logoHeight > 0 ? (logoHeight + 8) : 15;
        doc.text(config.name, leftAxis, nameY, { align: 'center' });
    }

    // Main Title
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 14, 38);
};

// Helper function to convert hex to RGB
const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 22, g: 125, b: 126 }; // Default color
};

const exportToPDF = async (
    title: string, 
    columns: Column[], 
    data: any[], 
    config: OrganizationConfig | null,
    comments?: string,
    chartImages?: (string | null)[]
) => {
    const doc = new jsPDF();
    const brandColor = config?.brandColor || '#167d7e';
    const rgb = hexToRgb(brandColor);
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    await addGenericHeader(doc, title, config);
    
    let currentY = 45;
    
    // ====== SECTION 1: DATE DE GENERATION ======
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    const generatedDate = new Date().toLocaleDateString('fr-FR', { 
        day: '2-digit', 
        month: 'long', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    doc.text(`Document genere le ${generatedDate}`, pageWidth - 14, currentY, { align: 'right' });
    currentY += 10;
    
    // ====== SECTION 2: RESUME STATISTIQUES ======
    if (data && data.length > 0) {
        let stats: { label: string; value: string; color: number[] }[] = [];
        
        const isSummary = data.some(row => row.item && row.item.includes('Total'));
        
        if (isSummary) {
            const revenusRow = data.find(row => row.item === 'Total Revenus');
            const sortiesRow = data.find(row => row.item === 'Total Sorties');
            const soldeRow = data.find(row => row.item === 'SOLDE PÉRIODE');
            
            if (revenusRow) stats.push({ label: 'Revenus', value: formatCurrency(revenusRow.amount), color: [16, 185, 129] });
            if (sortiesRow) stats.push({ label: 'Depenses', value: formatCurrency(sortiesRow.amount), color: [239, 68, 68] });
            if (soldeRow) {
                const color = soldeRow.amount >= 0 ? [16, 185, 129] : [239, 68, 68];
                stats.push({ label: 'Solde', value: formatCurrency(soldeRow.amount), color });
            }
        } else {
            stats.push({ label: 'Nombre d\'entrees', value: data.length.toString(), color: [59, 130, 246] });
            
            const totalAmount = data.reduce((sum, row) => {
                const amount = row.amount || row.debit || row.credit || 0;
                return sum + (typeof amount === 'number' ? amount : 0);
            }, 0);
            
            if (totalAmount > 0) {
                stats.push({ label: 'Montant total', value: formatCurrency(totalAmount), color: [139, 92, 246] });
            }
        }
        
        if (stats.length > 0) {
            const boxWidth = (pageWidth - 30) / stats.length;
            const boxHeight = 22;
            
            stats.forEach((stat, index) => {
                const x = 15 + (index * boxWidth);
                
                // Draw colored box with shadow effect
                doc.setFillColor(stat.color[0], stat.color[1], stat.color[2]);
                doc.roundedRect(x, currentY, boxWidth - 5, boxHeight, 3, 3, 'F');
                
                // Add subtle border
                doc.setDrawColor(stat.color[0] - 20, stat.color[1] - 20, stat.color[2] - 20);
                doc.setLineWidth(0.3);
                doc.roundedRect(x, currentY, boxWidth - 5, boxHeight, 3, 3, 'S');
                
                // Label
                doc.setFontSize(9);
                doc.setTextColor(255, 255, 255);
                doc.setFont('helvetica', 'normal');
                doc.text(stat.label, x + (boxWidth - 5) / 2, currentY + 8, { align: 'center' });
                
                // Value
                doc.setFontSize(13);
                doc.setFont('helvetica', 'bold');
                doc.text(stat.value, x + (boxWidth - 5) / 2, currentY + 17, { align: 'center' });
            });
            
            currentY += boxHeight + 12;
        }
    }
    
    // ====== SECTION 3: COMMENTAIRES (si fournis) ======
    if (comments && comments.trim()) {
        // Title bar
        doc.setFillColor(30, 64, 175);
        doc.roundedRect(14, currentY, pageWidth - 28, 8, 2, 2, 'F');
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text('ANALYSE & OBSERVATIONS', 18, currentY + 5.5);
        
        currentY += 8;
        
        // Content box
        const maxWidth = pageWidth - 36;
        const lines = doc.splitTextToSize(comments, maxWidth);
        const boxHeight = (lines.length * 4.5) + 12;
        
        doc.setFillColor(239, 246, 255);
        doc.setDrawColor(191, 219, 254);
        doc.setLineWidth(0.5);
        doc.roundedRect(14, currentY, pageWidth - 28, boxHeight, 2, 2, 'FD');
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(30, 30, 30);
        doc.text(lines, 18, currentY + 8);
        
        currentY += boxHeight + 10;
    }
    
    // ====== SECTION 4: TABLEAU DE DONNEES (EN PREMIER!) ======
    // Section title
    doc.setFillColor(rgb.r, rgb.g, rgb.b);
    doc.rect(14, currentY - 2, 25, 3, 'F');
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(rgb.r, rgb.g, rgb.b);
    doc.text('DONNEES DETAILLEES', 14, currentY + 6);
    currentY += 12;
    
    // Add data table
    autoTable(doc, {
        head: [columns.map(c => c.header)],
        body: data.map(row => columns.map(c => {
            const value = row[c.accessor];
            if (typeof value === 'number' && c.accessor.toLowerCase().includes('amount')) {
                return formatCurrency(value);
            }
            if (c.accessor === 'debit' && value > 0) {
                return formatCurrency(value);
            }
            if (c.accessor === 'credit' && value > 0) {
                return formatCurrency(value);
            }
            if (value === null || typeof value === 'undefined') {
                return '-';
            }
            return String(value);
        })),
        startY: currentY,
        headStyles: {
            fillColor: [rgb.r, rgb.g, rgb.b],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 10,
            halign: 'left',
            cellPadding: 4
        },
        bodyStyles: {
            fontSize: 9,
            cellPadding: 4,
            textColor: [40, 40, 40]
        },
        alternateRowStyles: {
            fillColor: [245, 247, 250]
        },
        styles: {
            lineColor: [220, 220, 220],
            lineWidth: 0.2
        },
        margin: { left: 14, right: 14 }
    });
    
    // Get position after table
    const finalY = (doc as any).lastAutoTable.finalY;
    currentY = finalY + 15;
    
    // ====== SECTION 5: GRAPHIQUES (APRES LE TABLEAU!) ======
    if (chartImages && chartImages.length > 0) {
        const validCharts = chartImages.filter(img => img !== null) as string[];
        
        if (validCharts.length > 0) {
            // Check if we need a new page
            if (currentY + 100 > pageHeight - 20) {
                doc.addPage();
                currentY = 20;
            }
            
            // Section title
            doc.setFillColor(rgb.r, rgb.g, rgb.b);
            doc.rect(14, currentY - 2, 25, 3, 'F');
            
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(rgb.r, rgb.g, rgb.b);
            doc.text('VISUALISATIONS GRAPHIQUES', 14, currentY + 6);
            currentY += 14;
            
            for (const chartImage of validCharts) {
                // Check if we need a new page
                if (currentY + 95 > pageHeight - 20) {
                    doc.addPage();
                    currentY = 20;
                }
                
                try {
                    // Resize chart image to reduce file size
                    const optimizedImage = await resizeImage(chartImage, 1000);
                    
                    const img = new Image();
                    img.src = optimizedImage;
                    
                    await new Promise<void>((resolve) => {
                        img.onload = () => {
                            const imgRatio = img.width / img.height;
                            const maxWidth = pageWidth - 35;
                            const maxHeight = 85;
                            
                            let imgWidth = maxWidth;
                            let imgHeight = imgWidth / imgRatio;
                            
                            if (imgHeight > maxHeight) {
                                imgHeight = maxHeight;
                                imgWidth = imgHeight * imgRatio;
                            }
                            
                            // Center the image
                            const xPos = (pageWidth - imgWidth) / 2;
                            
                            // Add background box
                            doc.setFillColor(255, 255, 255);
                            doc.setDrawColor(200, 200, 200);
                            doc.setLineWidth(0.5);
                            doc.rect(xPos - 3, currentY - 3, imgWidth + 6, imgHeight + 6, 'FD');
                            
                            // Add image
                            doc.addImage(optimizedImage, 'PNG', xPos, currentY, imgWidth, imgHeight);
                            currentY += imgHeight + 15;
                            
                            resolve();
                        };
                        img.onerror = () => {
                            console.error('Failed to load chart image');
                            resolve();
                        };
                    });
                } catch (error) {
                    console.error('Error adding chart to PDF:', error);
                }
            }
        }
    }
    
    // ====== FOOTER: PAGE NUMBERS ======
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        
        // Footer line
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.3);
        doc.line(14, pageHeight - 15, pageWidth - 14, pageHeight - 15);
        
        // Page number
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.setFont('helvetica', 'normal');
        doc.text(
            `Page ${i} / ${totalPages}`,
            pageWidth / 2,
            pageHeight - 10,
            { align: 'center' }
        );
    }
    
    doc.save(generateUniqueFilename(title));
};

const exportToExcel = (title: string, columns: Column[], data: any[]) => {
    const worksheet = XLSX.utils.json_to_sheet(
        data.map(row => {
            const newRow: {[key: string]: any} = {};
            columns.forEach(c => {
                newRow[c.header] = row[c.accessor];
            });
            return newRow;
        })
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Données');
    XLSX.writeFile(workbook, generateUniqueFilename(title, 'xlsx'));
};

const exportToWord = (title: string, columns: Column[], data: any[]) => {
    const tableHeader = new TableRow({
        children: columns.map(c => new TableCell({
            children: [new Paragraph({ text: c.header, heading: HeadingLevel.HEADING_3 })],
        })),
    });

    const tableRows = data.map((row: any) => new TableRow({
        children: columns.map(c => new TableCell({
            children: [new Paragraph(String(row[c.accessor] ?? ''))],
        })),
    }));

    const table = new Table({
        rows: [tableHeader, ...tableRows],
        width: {
            size: 100,
            type: WidthType.PERCENTAGE,
        },
    });

    const doc = new Document({
        sections: [{
            children: [
                new Paragraph({ text: title, heading: HeadingLevel.HEADING_1 }),
                table,
            ],
        }],
    });

    Packer.toBlob(doc).then((blob: Blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = generateUniqueFilename(title, 'docx');
        a.click();
        URL.revokeObjectURL(url);
    });
};

// Specific item export (example for Voucher)
export const exportDataItem = (format: ExportFormat, item: any) => {
    if ('voucherNumber' in item) { // It's a voucher
        const voucher = item as Voucher;
        if (format === 'pdf') {
            generateMultiVoucherPDF([voucher]);
            return;
        }
        
        const title = `Bon de Caisse - ${voucher.voucherNumber}`;
        const columns = [
            { header: 'N° Bon', accessor: 'voucherNumber' },
            { header: 'Date', accessor: 'issueDate' },
            { header: 'Bénéficiaire', accessor: 'beneficiary' },
            { header: 'Motif', accessor: 'reason' },
            { header: 'Montant', accessor: 'amount' },
        ];
        const data = [{
            ...voucher,
            issueDate: formatDate(voucher.issueDate),
        }];
        exportData(format, title, columns, data);
    } else if ('employeeName' in item) { // It's a salary
        const salary = item as Salary;
        if (format === 'pdf') {
            generatePayslipPDF(salary);
            return;
        }
        
        const title = `Bordereau Paiement - ${salary.employeeName}`;
        const columns = [
             { header: 'Période', accessor: 'period' },
             { header: 'Désignation', accessor: 'employeeName' },
             { header: 'Motif', accessor: 'notes' },
             { header: 'Montant', accessor: 'amount' },
        ];
        const data = [{
            ...salary,
            employeeName: `Salaire ${salary.period} - ${salary.employeeName}`,
            notes: 'Paiement salaire',
        }];
        exportData(format, title, columns, data);
    }
};

export const generatePayslipPDF = async (salary: Salary) => {
    const config = await getOrganizationConfig();
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const brandColor = config?.brandColor || '#167d7e';
    const rgb = hexToRgb(brandColor);

    // Header background
    doc.setFillColor(rgb.r, rgb.g, rgb.b);
    doc.rect(0, 0, pageWidth, 25, 'F');
    doc.setTextColor(255, 255, 255);
    
    // Right Side: Contact Info
    if (config) {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        const rightMargin = pageWidth - 14;
        let yPos = 8;
        
        if (config.registrationNumber) {
            doc.text(`N°: ${config.registrationNumber}`, rightMargin, yPos, { align: 'right' });
            yPos += 5;
        }
        if (config.phone) {
            doc.text(`Tél: ${config.phone}`, rightMargin, yPos, { align: 'right' });
            yPos += 5;
        }
        if (config.email) {
            doc.text(`Email: ${config.email}`, rightMargin, yPos, { align: 'right' });
        }
    }

    // Left Side: Logo + Name (Centered at X=35)
    const leftAxis = 35;
    let logoHeight = 0;

    if (config?.logo) {
        try {
            const resizedLogo = await resizeImage(config.logo, 400);
            const dims = await getImageDimensions(resizedLogo);
            const { width, height } = getFittedDimensions(dims.width, dims.height, 50, 12);
            logoHeight = height;
            doc.addImage(resizedLogo, 'PNG', leftAxis - (width / 2), 3, width, height);
        } catch (e) { console.error(e); }
    }
    
    if (config?.name) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        const nameY = logoHeight > 0 ? (logoHeight + 8) : 15;
        doc.text(config.name, leftAxis, nameY, { align: 'center' });
    }

    // Title
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('BORDEREAU DE PAIEMENT', pageWidth / 2, 45, { align: 'center' });
    
    // Details
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    
    const startY = 60;
    doc.text(`Période : ${salary.period}`, 14, startY);
    doc.text(`Date : ${formatDate(salary.paymentDate)}`, pageWidth - 14, startY, { align: 'right' });
    
    doc.text(`Bénéficiaire : ${salary.employeeName}`, 14, startY + 10);
    
    // Amount Box
    doc.setDrawColor(0);
    doc.setFillColor(245, 245, 245);
    doc.rect(14, startY + 20, pageWidth - 28, 15, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.text(`Montant Payé : ${formatCurrency(salary.amount)}`, pageWidth / 2, startY + 30, { align: 'center' });
    
    // Signature
    doc.setFont('helvetica', 'normal');
    doc.text('Signature du Bénéficiaire :', 14, startY + 50);
    doc.text('Signature de la Direction :', pageWidth - 80, startY + 50);
    
    doc.save(generateUniqueFilename(`Bordereau_${salary.employeeName}_${salary.period}`));
};


export const generateMultiVoucherPDF = async (vouchers: Voucher[]) => {
    const config = await getOrganizationConfig();
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const brandColor = config?.brandColor || '#167d7e';
    const rgb = hexToRgb(brandColor);

    for (const [index, voucher] of vouchers.entries()) {
        if (index > 0) {
            doc.addPage();
        }

        // Header background
        doc.setFillColor(rgb.r, rgb.g, rgb.b);
        doc.rect(0, 0, pageWidth, 25, 'F');
        doc.setTextColor(255, 255, 255);
        
        // Right Side: Contact Info (Including logic used in other exports)
        if (config) {
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            
            const rightMargin = pageWidth - 14;
            let yPos = 8;
            
            if (config.registrationNumber) {
                doc.text(`N°: ${config.registrationNumber}`, rightMargin, yPos, { align: 'right' });
                yPos += 5;
            }
            if (config.phone) {
                doc.text(`Tél: ${config.phone}`, rightMargin, yPos, { align: 'right' });
                yPos += 5;
            }
            if (config.email) {
                doc.text(`Email: ${config.email}`, rightMargin, yPos, { align: 'right' });
            }
        }
        
        // Left Side: Logo + Name (Centered at X=35)
        const leftAxis = 35;
        let logoHeight = 0;
        
        if (config?.logo) {
            try {
                const resizedLogo = await resizeImage(config.logo, 400);
                const dims = await getImageDimensions(resizedLogo);
                // Fit to width 50, height 12
                const { width, height } = getFittedDimensions(dims.width, dims.height, 50, 12);
                logoHeight = height;
                
                doc.addImage(resizedLogo, 'PNG', leftAxis - (width / 2), 3, width, height);
            } catch (error) {
                console.error('Error adding logo to voucher PDF:', error);
            }
        }
        
        if (config && config.name) {
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            const nameY = logoHeight > 0 ? (logoHeight + 8) : 15;
            doc.text(config.name, leftAxis, nameY, { align: 'center' });
        }

        // Title
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        const title = 'Bon de Caisse';
        const separator = '______________________';
        doc.text(separator, pageWidth / 2, 42, { align: 'center' });
        doc.text(title, pageWidth / 2, 48, { align: 'center' });
        doc.text(separator, pageWidth / 2, 50, { align: 'center' });

        // Info
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text(`N° ${voucher.voucherNumber}`, 14, 65);
        doc.text(`Date : ${formatDate(voucher.issueDate)}`, pageWidth - 14, 65, { align: 'right' });

        // Table
        const body = [];
        body.push([voucher.beneficiary, voucher.reason, formatCurrency(voucher.amount), '']);
        for (let i = 0; i < 4; i++) {
            body.push(['', '', '', '']);
        }
        
        autoTable(doc, {
            head: [['Nom complet', 'Désignation', 'Montant', 'Emargement']],
            body: body,
            startY: 75,
            styles: {
                lineColor: [0, 0, 0],
                lineWidth: 0.1,
                valign: 'middle',
            },
            headStyles: {
                fillColor: [rgb.r, rgb.g, rgb.b],
                textColor: [255, 255, 255],
                lineWidth: { top: 0.1, right: 0.1, bottom: 0.1, left: 0.1 },
            },
            bodyStyles: {
                lineWidth: { right: 0.1, left: 0.1 }
            },
            columnStyles: {
                0: { cellWidth: 60 },
                2: { halign: 'right', cellWidth: 35 },
                3: { cellWidth: 30 }
            },
            didParseCell: (data: any) => {
                // Add bottom border to the last row of the body
                if (data.row.section === 'body' && data.row.index === data.table.body.length - 1) {
                    data.cell.styles.lineWidth = { ...data.cell.styles.lineWidth, bottom: 0.1 };
                }
            },
        });

        // Footer
        const finalY = (doc as any).lastAutoTable.finalY;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(
            'Visa du Secrétariat Administratif et Financier', 
            pageWidth - 14, 
            finalY + 20, 
            { align: 'right' }
        );
    } // End for loop

    const fileName = vouchers.length > 1 ? 'Bons_de_caisse_selection' : `Bon_de_caisse_${vouchers[0].voucherNumber}`;
    doc.save(generateUniqueFilename(fileName));
};

export const generateMultiExpensePDF = async (expenses: Expense[]) => {
    const config = await getOrganizationConfig();
    const doc = new jsPDF();
    const brandColor = config?.brandColor || '#167d7e';
    const rgb = hexToRgb(brandColor);
    
    await addGenericHeader(doc, 'Dépenses Sélectionnées', config);
    autoTable(doc, {
        head: [['Date', 'Description', 'Catégorie', 'Montant']],
        body: expenses.map(e => [
            formatDate(e.date),
            e.description,
            e.category,
            formatCurrency(e.amount)
        ]),
        startY: 45,
        headStyles: {
            fillColor: [rgb.r, rgb.g, rgb.b]
        },
    });
    doc.save(generateUniqueFilename('Dépenses_sélectionnées'));
};

export const generateMultiRecettePDF = async (recettes: Recette[]) => {
    const config = await getOrganizationConfig();
    const doc = new jsPDF();
    const brandColor = config?.brandColor || '#167d7e';
    const rgb = hexToRgb(brandColor);
    
    await addGenericHeader(doc, 'Recettes Sélectionnées', config);
    autoTable(doc, {
        head: [['Date', 'Description', 'Source', 'Montant']],
        body: recettes.map(r => [
            formatDate(r.date),
            r.description,
            r.source,
            formatCurrency(r.amount)
        ]),
        startY: 45,
        headStyles: {
            fillColor: [rgb.r, rgb.g, rgb.b]
        },
    });
    doc.save(generateUniqueFilename('Recettes_sélectionnées'));
};

export const generateMultiInvoicePDF = async (invoices: Invoice[]) => {
    const config = await getOrganizationConfig();
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const brandColor = config?.brandColor || '#167d7e';
    const rgb = hexToRgb(brandColor);

    for (const [index, invoice] of invoices.entries()) {
        if (index > 0) {
            doc.addPage();
        }

        await addGenericHeader(doc, 'Facture', config);

        // Invoice details below header
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        
        const startY = 50;
        
        doc.text(`Numéro: ${invoice.invoiceNumber}`, 14, startY);
        doc.text(`Date d'émission: ${formatDate(invoice.issueDate)}`, pageWidth - 14, startY, { align: 'right' });
        doc.text(`Client: ${invoice.clientName}`, 14, startY + 10);
        doc.text(`Date d'échéance: ${formatDate(invoice.dueDate)}`, pageWidth - 14, startY + 10, { align: 'right' });
        doc.text(`Statut: ${invoice.status}`, 14, startY + 20);

        autoTable(doc, {
            head: [['Description', 'Quantité', 'Prix Unitaire', 'Total']],
            body: invoice.items.map(item => [
                item.description,
                item.quantity,
                formatCurrency(item.unitPrice),
                formatCurrency(item.quantity * item.unitPrice)
            ]),
            startY: startY + 30,
            theme: 'striped',
            headStyles: {
                fillColor: [rgb.r, rgb.g, rgb.b]
            },
        });

        const finalY = (doc as any).lastAutoTable.finalY || 100;
        doc.setFontSize(14);
        doc.text(`Total: ${formatCurrency(invoice.totalAmount)}`, pageWidth - 14, finalY + 15, { align: 'right' });
    }

    doc.save(generateUniqueFilename('Factures_sélectionnées'));
};

export const getAllData = async () => {
    return {
        expenses: await db.expenses.toArray(),
        invoices: await db.invoices.toArray(),
        vouchers: await db.vouchers.toArray(),
        recettes: await db.recettes.toArray(),
        documents: await db.documents.toArray(),
        salaries: await db.salaries.toArray(),
        contacts: await db.contacts.toArray(),
        budgets: await db.budgets.toArray(),
        annualBudgets: await db.annualBudgets.toArray(),
        organizationConfig: await db.organizationConfig.toArray(),
        // For security, we might exclude sensitive auth data or encrypt it?
        // But for BACKUP, we NEED it.
        // db.auth.getData() calls ipc 'auth:getData' which returns the row { passwordEncrypted, ... }
        // This is safe since it's already encrypted.
        auth: [await db.auth.getData()] 
    };
};

export const exportService = {
    getAllData,
    exportToPDF,
    exportToExcel,
    exportToWord,
    generatePayslipPDF,
    generateMultiVoucherPDF,
    generateMultiExpensePDF,
    generateMultiRecettePDF,
    generateMultiInvoicePDF
};
