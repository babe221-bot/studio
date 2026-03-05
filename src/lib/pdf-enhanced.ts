
'use client';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { OrderItem, Material, SurfaceFinish, EdgeProfile, ProcessedEdges } from '@/types';

type EdgeNameMap = {
    [key: string]: string;
};

// Helper to yield control to the main thread to prevent UI freezing
const yieldToMain = () => new Promise(resolve => setTimeout(resolve, 0));

// Helper function to convert SVG data URI to PNG data URI
async function svgToPng(svgDataUri: string, width: number = 200, height: number = 150): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';

        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = width * 2; // Higher resolution for better quality
                canvas.height = height * 2;
                const ctx = canvas.getContext('2d');

                if (!ctx) {
                    reject(new Error('Could not get canvas context'));
                    return;
                }

                // Draw white background
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                // Draw the SVG image
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                // Convert to PNG data URI
                const pngDataUri = canvas.toDataURL('image/png');
                resolve(pngDataUri);
            } catch (e) {
                reject(e);
            }
        };

        img.onerror = () => {
            reject(new Error('Failed to load SVG image'));
        };

        img.src = svgDataUri;
    });
}

interface PdfGenerationOptions {
    companyName?: string;
    companyAddress?: string;
    companyPhone?: string;
    companyEmail?: string;
    companyIban?: string;
    orderNumber?: string;
    customerName?: string;
    notes?: string;
    isQuotation?: boolean;
}

// Itemized cost calculation for PDF
function calculateItemCosts(item: OrderItem) {
    const length_m = item.dims.length / 100;
    const width_m = item.dims.width / 100;
    const surfaceArea_m2 = length_m * width_m;
    const OKAPNIK_COST_PER_M = 5;

    const materialCost = item.orderUnit === 'sqm' 
        ? item.material.cost_sqm * item.quantity 
        : surfaceArea_m2 * item.material.cost_sqm * item.quantity;

    const finishCost = item.orderUnit === 'sqm'
        ? item.finish.cost_sqm * item.quantity
        : surfaceArea_m2 * item.finish.cost_sqm * item.quantity;

    let processed_perimeter_m = 0;
    if (item.processedEdges.front) processed_perimeter_m += length_m;
    if (item.processedEdges.back) processed_perimeter_m += length_m;
    if (item.processedEdges.left) processed_perimeter_m += width_m;
    if (item.processedEdges.right) processed_perimeter_m += width_m;
    const edgeCost = processed_perimeter_m * item.profile.cost_m * item.quantity;

    let okapnik_perimeter_m = 0;
    if (item.okapnikEdges.front) okapnik_perimeter_m += length_m;
    if (item.okapnikEdges.back) okapnik_perimeter_m += length_m;
    if (item.okapnikEdges.left) okapnik_perimeter_m += width_m;
    if (item.okapnikEdges.right) okapnik_perimeter_m += width_m;
    const okapnikCost = okapnik_perimeter_m * OKAPNIK_COST_PER_M * item.quantity;

    return { materialCost, finishCost, edgeCost, okapnikCost };
}

// Helper to get edge names in Croatian
const getEdgeName = (edge: string): string => {
    const names: { [key: string]: string } = {
        front: 'Prednja',
        back: 'Zadnja',
        left: 'Lijeva',
        right: 'Desna'
    };
    return names[edge] || edge;
};

// Generate 2D technical drawing as PNG data URI
async function generateTechnicalDrawing2D(
    item: OrderItem,
    edgeNames: EdgeNameMap,
    view: 'top' | 'side' | 'front' = 'top'
): Promise<string> {
    const { length, width, height } = item.dims;
    const scale = Math.min(150 / length, 100 / width, 80 / height);

    let svg = '';

    if (view === 'top') {
        const w = length * scale;
        const h = width * scale;
        const cx = 100;
        const cy = 75;

        svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="200" height="150" viewBox="0 0 200 150">
        <defs>
          <pattern id="hatch" patternUnits="userSpaceOnUse" width="4" height="4" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="4" stroke="#666" stroke-width="0.5"/>
          </pattern>
        </defs>
        <rect x="${cx - w / 2}" y="${cy - h / 2}" width="${w}" height="${h}" fill="none" stroke="black" stroke-width="2"/>
        <rect x="${cx - w / 2}" y="${cy - h / 2}" width="${w}" height="${h}" fill="url(#hatch)" opacity="0.3"/>
        <line x1="${cx - w / 2}" y1="${cy - h / 2 - 15}" x2="${cx + w / 2}" y2="${cy - h / 2 - 15}" stroke="black" stroke-width="0.5"/>
        <line x1="${cx - w / 2}" y1="${cy - h / 2 - 10}" x2="${cx - w / 2}" y2="${cy - h / 2 - 20}" stroke="black" stroke-width="0.5"/>
        <line x1="${cx + w / 2}" y1="${cy - h / 2 - 10}" x2="${cx + w / 2}" y2="${cy - h / 2 - 20}" stroke="black" stroke-width="0.5"/>
        <text x="${cx}" y="${cy - h / 2 - 20}" text-anchor="middle" font-size="8" font-family="Arial">${length} cm</text>
        <line x1="${cx - w / 2 - 15}" y1="${cy - h / 2}" x2="${cx - w / 2 - 15}" y2="${cy + h / 2}" stroke="black" stroke-width="0.5"/>
        <line x1="${cx - w / 2 - 10}" y1="${cy - h / 2}" x2="${cx - w / 2 - 20}" y2="${cy - h / 2}" stroke="black" stroke-width="0.5"/>
        <line x1="${cx - w / 2 - 10}" y1="${cy + h / 2}" x2="${cx - w / 2 - 20}" y2="${cy + h / 2}" stroke="black" stroke-width="0.5"/>
        <text x="${cx - w / 2 - 25}" y="${cy}" text-anchor="middle" font-size="8" font-family="Arial" transform="rotate(-90 ${cx - w / 2 - 25} ${cy})">${width} cm</text>
        ${item.processedEdges.front ? `<line x1="${cx - w / 2}" y1="${cy - h / 2}" x2="${cx + w / 2}" y2="${cy - h / 2}" stroke="#2196F3" stroke-width="3"/>` : ''}
        ${item.processedEdges.back ? `<line x1="${cx - w / 2}" y1="${cy + h / 2}" x2="${cx + w / 2}" y2="${cy + h / 2}" stroke="#2196F3" stroke-width="3"/>` : ''}
        ${item.processedEdges.left ? `<line x1="${cx - w / 2}" y1="${cy - h / 2}" x2="${cx - w / 2}" y2="${cy + h / 2}" stroke="#2196F3" stroke-width="3"/>` : ''}
        ${item.processedEdges.right ? `<line x1="${cx + w / 2}" y1="${cy - h / 2}" x2="${cx + w / 2}" y2="${cy + h / 2}" stroke="#2196F3" stroke-width="3"/>` : ''}
        ${item.okapnikEdges.front ? `<rect x="${cx - w / 2 + 5}" y="${cy - h / 2 + 2}" width="${w - 10}" height="4" fill="#FF9800"/>` : ''}
        ${item.okapnikEdges.back ? `<rect x="${cx - w / 2 + 5}" y="${cy + h / 2 - 6}" width="${w - 10}" height="4" fill="#FF9800"/>` : ''}
        <text x="${cx}" y="${cy}" text-anchor="middle" font-size="10" font-family="Arial" font-weight="bold">${item.material.name}</text>
        <text x="${cx}" y="${cy + 12}" text-anchor="middle" font-size="8" font-family="Arial">Pogled odozgo</text>
      </svg>`;
    } else {
        const w = (view === 'side' ? width : length) * scale;
        const h = height * scale * 2;
        const cx = 100;
        const cy = 75;
        svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="200" height="150" viewBox="0 0 200 150">
        <defs>
          <pattern id="hatch2" patternUnits="userSpaceOnUse" width="3" height="3" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="3" stroke="#888" stroke-width="0.5"/>
          </pattern>
        </defs>
        <rect x="${cx - w / 2}" y="${cy - h / 2}" width="${w}" height="${h}" fill="url(#hatch2)" stroke="black" stroke-width="2"/>
        <line x1="${cx + w / 2 + 10}" y1="${cy - h / 2}" x2="${cx + w / 2 + 10}" y2="${cy + h / 2}" stroke="black" stroke-width="0.5"/>
        <text x="${cx + w / 2 + 20}" y="${cy}" text-anchor="middle" font-size="8" font-family="Arial" transform="rotate(-90 ${cx + w / 2 + 20} ${cy})">${height} cm</text>
        <text x="${cx}" y="${cy + h / 2 + 15}" text-anchor="middle" font-size="8" font-family="Arial">${view === 'side' ? 'Bočni' : 'Prednji'} pogled</text>
      </svg>`;
    }
    const svgDataUri = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
    return await svgToPng(svgDataUri, 200, 150);
}

async function generateProfileDiagram(profile: EdgeProfile, edgeName: string): Promise<string> {
    const profileName = profile.name.toLowerCase();
    const smusMatch = profileName.match(/smuš c([\d.]+)/);
    const poluRMatch = profileName.match(/polu-zaobljena r([\d.]+)/);
    const punoRMatch = profileName.match(/puno-zaobljena/);

    let path = '';
    let label = '';

    if (smusMatch) {
        path = 'M40,20 L40,100 L60,120 L60,20 Z';
        label = `Smuš C${smusMatch[1]}`;
    } else if (poluRMatch) {
        path = 'M40,20 L40,100 Q40,120 60,120 L60,20 Z';
        label = `Polu-zaobljena R${poluRMatch[1]}`;
    } else if (punoRMatch) {
        path = 'M40,20 Q40,120 50,120 Q60,120 60,20 Z';
        label = 'Puno zaobljena';
    } else {
        path = 'M40,20 L40,120 L60,120 L60,20 Z';
        label = 'Ravni rez';
    }

    const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="100" height="140" viewBox="0 0 100 140">
      <rect x="35" y="10" width="30" height="120" fill="#f0f0f0" stroke="#999" stroke-width="1"/>
      <path d="${path}" fill="none" stroke="black" stroke-width="2"/>
      <text x="50" y="135" text-anchor="middle" font-size="8" font-family="Arial">${label}</text>
      <text x="50" y="8" text-anchor="middle" font-size="7" font-family="Arial" fill="#666">${edgeName}</text>
    </svg>`;
    const svgDataUri = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
    return await svgToPng(svgDataUri, 100, 140);
}

export async function generateEnhancedPdf(
    orderItems: OrderItem[],
    edgeNames: EdgeNameMap,
    images3D: (string | null)[],
    options: PdfGenerationOptions = {}
): Promise<void> {
    try {
        const doc = new jsPDF();
        const pageHeight = doc.internal.pageSize.height;
        const pageWidth = doc.internal.pageSize.width;
        const margin = 14;
        let cursorY = margin;

        const {
            companyName = 'Kamen Studio d.o.o.',
            companyAddress = 'Put Kamena 42, 21000 Split, Hrvatska',
            companyPhone = '+385 21 555 123',
            companyEmail = 'prodaja@kamen-studio.hr',
            companyIban = 'HR12 2340 0091 1100 2233 4',
            orderNumber = `RN-${new Date().toISOString().split('T')[0].replace(/-/g, '')}`,
            customerName = '',
            notes = '',
            isQuotation = true
        } = options;

        // Header Background
        doc.setFillColor(30, 41, 59); // Slate 800
        doc.rect(0, 0, pageWidth, 45, 'F');
        
        // Branded Accent
        doc.setFillColor(245, 158, 11); // Amber 500
        doc.rect(0, 45, pageWidth, 2, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(28);
        doc.text(isQuotation ? 'PONUDA' : 'RADNI NALOG', margin, 28);
        
        doc.setFontSize(10);
        doc.setFont('Helvetica', 'normal');
        doc.text(`ID: ${orderNumber}`, pageWidth - margin - 60, 20);
        doc.text(`DATUM: ${new Date().toLocaleDateString('hr-HR')}`, pageWidth - margin - 60, 27);
        doc.text(`VALUTA: 15 dana`, pageWidth - margin - 60, 34);

        cursorY = 60;
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(14);
        doc.setFont('Helvetica', 'bold');
        doc.text(companyName, margin, cursorY);
        doc.setFontSize(9);
        doc.setFont('Helvetica', 'normal');
        doc.setTextColor(100, 116, 139); // Slate 500
        cursorY += 6;
        doc.text(companyAddress, margin, cursorY);
        cursorY += 5;
        doc.text(`Tel: ${companyPhone} | Email: ${companyEmail}`, margin, cursorY);
        cursorY += 5;
        doc.text(`IBAN: ${companyIban}`, margin, cursorY);
        
        // Customer Info Card
        const customerBoxY = 55;
        const customerBoxX = pageWidth / 2 + 10;
        doc.setFillColor(248, 250, 252); // Slate 50
        doc.setDrawColor(226, 232, 240); // Slate 200
        doc.roundedRect(customerBoxX, customerBoxY, pageWidth - customerBoxX - margin, 35, 2, 2, 'FD');
        
        doc.setTextColor(100, 116, 139);
        doc.setFontSize(8);
        doc.setFont('Helvetica', 'bold');
        doc.text('KLIJENT / PRIMATELJ:', customerBoxX + 5, customerBoxY + 8);
        
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(11);
        doc.setFont('Helvetica', 'bold');
        doc.text(customerName || 'Veleprodajni kupac', customerBoxX + 5, customerBoxY + 18);
        doc.setFontSize(9);
        doc.setFont('Helvetica', 'normal');
        doc.text('Identifikacijski broj: ---', customerBoxX + 5, customerBoxY + 26);

        cursorY = 105;
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.5);
        doc.line(margin, cursorY, pageWidth - margin, cursorY);
        cursorY += 10;

        let totalCost = 0;
        let totalWeight = 0;

        for (let i = 0; i < orderItems.length; i++) {
            if (i > 0 && i % 2 === 0) await yieldToMain();
            const item = orderItems[i];
            totalCost += item.totalCost;
            totalWeight += (item.dims.length * item.dims.width * item.dims.height * item.material.density) / 1000 * item.quantity;

            if (cursorY > pageHeight - 120) {
                doc.addPage();
                cursorY = margin + 10;
            }

            doc.setFillColor(245, 247, 249);
            doc.rect(margin, cursorY - 5, pageWidth - margin * 2, 10, 'F');
            doc.setTextColor(44, 62, 80);
            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(11);
            doc.text(`${i + 1}. ${item.id} - ${item.material.name}`, margin + 2, cursorY + 2);
            cursorY += 12;

            // --- 3D Visualization ---
            // Optimization: If on mobile or image is too large, use a placeholder or reduced quality
            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
            const previewHeight = 45;
            
            if (images3D[i]) {
                try { 
                    // Only add 3D image if it's a valid data URI
                    if (images3D[i]!.length > 100) {
                        doc.addImage(images3D[i]!, 'PNG', margin, cursorY, 60, previewHeight, undefined, isMobile ? 'FAST' : 'MEDIUM'); 
                    }
                } catch (e) { console.error("3D Image add failed", e); }
            }
            
            // --- 2D Technical Drawings ---
            // Generate these one by one to avoid OOM
            try {
                const topView = await generateTechnicalDrawing2D(item, edgeNames, 'top');
                doc.addImage(topView, 'PNG', margin + 65, cursorY, 60, previewHeight, undefined, 'FAST');
                
                // Optional side view on mobile to save memory
                if (!isMobile || (isMobile && i === 0)) {
                    const sideView = await generateTechnicalDrawing2D(item, edgeNames, 'side');
                    doc.addImage(sideView, 'PNG', margin + 130, cursorY, 60, previewHeight, undefined, 'FAST');
                }
            } catch (e) { console.error("2D Drawing failed", e); }

            cursorY += previewHeight + 8;
            const costs = calculateItemCosts(item);
            const edgeStr = Object.entries(item.processedEdges).filter(([, v]) => v).map(([k]) => getEdgeName(k)).join(', ') || 'Nema';
            
            const itemTableData = [
                ['Materijal', `${item.material.name} (${item.dims.height}cm)`, `€${costs.materialCost.toFixed(2)}`],
                ['Obrada lica', item.finish.name, `€${costs.finishCost.toFixed(2)}`],
                ['Obrada ivica', `${item.profile.name} (${edgeStr})`, `€${costs.edgeCost.toFixed(2)}`],
            ];
            if (costs.okapnikCost > 0) itemTableData.push(['Okapnik', 'Izrada okapnika', `€${costs.okapnikCost.toFixed(2)}`]);
            itemTableData.push([{ content: 'SUBTOTAL', colSpan: 2, styles: { halign: 'right', fontStyle: 'bold' } }, { content: `€${item.totalCost.toFixed(2)}`, styles: { fontStyle: 'bold', halign: 'right' } }] as any);

            autoTable(doc, {
                startY: cursorY,
                head: [['STAVKA', 'DETALJI OBRADE', 'IZNOS']],
                body: itemTableData,
                theme: 'grid',
                margin: { left: margin },
                tableWidth: pageWidth - margin * 2,
                styles: { 
                    fontSize: 8,
                    cellPadding: 3,
                    lineColor: [226, 232, 240],
                    lineWidth: 0.1,
                },
                headStyles: { 
                    fillColor: [51, 65, 85], // Slate 700
                    textColor: [255, 255, 255],
                    fontStyle: 'bold'
                },
                alternateRowStyles: {
                    fillColor: [248, 250, 252]
                },
                columnStyles: { 
                    2: { halign: 'right', cellWidth: 35, fontStyle: 'bold' } 
                }
            });
            cursorY = (doc as any).lastAutoTable.finalY + 15;
        }

        if (cursorY > pageHeight - 80) { doc.addPage(); cursorY = margin + 10; }
        const summaryX = pageWidth - margin - 85;
        doc.setFillColor(30, 41, 59);
        doc.rect(summaryX, cursorY, 85, 45, 'F');
        
        doc.setFontSize(9);
        doc.setTextColor(203, 213, 225); // Slate 300
        doc.text('UKUPNO ZA NAPLATU:', summaryX + 5, cursorY + 12);
        
        doc.setFontSize(18);
        doc.setTextColor(255, 255, 255);
        doc.setFont('Helvetica', 'bold');
        doc.text(`€ ${totalCost.toLocaleString('hr-HR', { minimumFractionDigits: 2 })}`, pageWidth - margin - 5, cursorY + 25, { align: 'right' });
        
        doc.setFontSize(8);
        doc.setFont('Helvetica', 'normal');
        doc.setTextColor(148, 163, 184); // Slate 400
        doc.text(`Ukupna masa: ${totalWeight.toFixed(1)} kg`, summaryX + 5, cursorY + 35);
        doc.text(`PDV (25%) uključen: € ${(totalCost * 0.2).toFixed(2)}`, summaryX + 5, cursorY + 40);
        
        cursorY += 55;
        doc.setTextColor(100, 116, 139);
        doc.setFontSize(8);
        doc.text('Napomena: Ova ponuda je informativnog karaktera. Rok izrade počinje teći od uplate avansa.', margin, cursorY);
        cursorY += 4;
        doc.text('Uvjeti plaćanja: 50% avans, 50% prije isporuke. Svi proizvodi ostaju u vlasništvu prodavatelja do potpune isplate.', margin, cursorY);
        const sigY = cursorY + 25;
        doc.line(margin, sigY, margin + 60, sigY);
        doc.text('Potpis kupca', margin, sigY + 5);
        doc.line(pageWidth - margin - 60, sigY, pageWidth - margin, sigY);
        doc.text('Za Kamena Galanterija d.o.o.', pageWidth - margin - 60, sigY + 5);

        const pageCount = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(`Stranica ${i} od ${pageCount} | ${orderNumber}`, pageWidth / 2, pageHeight - 5, { align: 'center' });
        }
        doc.save(`Ponuda_${orderNumber}.pdf`);
    } catch (error) {
        console.error('PDF error:', error);
        throw new Error('Greška pri izradi PDF-a');
    }
}

export function generateAndDownloadPdf(orderItems: OrderItem[], edgeNames: EdgeNameMap) {
    const images3D = orderItems.map(() => null);
    return generateEnhancedPdf(orderItems, edgeNames, images3D);
}
