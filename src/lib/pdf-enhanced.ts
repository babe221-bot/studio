
'use client';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { OrderItem, Material, SurfaceFinish, EdgeProfile, ProcessedEdges } from '@/types';

type EdgeNameMap = {
    [key: string]: string;
};

interface PdfGenerationOptions {
    companyName?: string;
    companyAddress?: string;
    companyPhone?: string;
    companyEmail?: string;
    orderNumber?: string;
    customerName?: string;
    notes?: string;
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

// Generate 2D technical drawing as SVG data URI
function generateTechnicalDrawing2D(
    item: OrderItem,
    edgeNames: EdgeNameMap,
    view: 'top' | 'side' | 'front' = 'top'
): string {
    const { length, width, height } = item.dims;
    const scale = Math.min(150 / length, 100 / width, 80 / height);

    let svg = '';

    if (view === 'top') {
        // Top view (plan view)
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
        <rect x="${cx - w / 2}" y="${cy - h / 2}" width="${w}" height="${h}" 
              fill="none" stroke="black" stroke-width="2"/>
        <rect x="${cx - w / 2}" y="${cy - h / 2}" width="${w}" height="${h}" 
              fill="url(#hatch)" opacity="0.3"/>
        
        <!-- Dimension lines -->
        <line x1="${cx - w / 2}" y1="${cy - h / 2 - 15}" x2="${cx + w / 2}" y2="${cy - h / 2 - 15}" stroke="black" stroke-width="0.5"/>
        <line x1="${cx - w / 2}" y1="${cy - h / 2 - 10}" x2="${cx - w / 2}" y2="${cy - h / 2 - 20}" stroke="black" stroke-width="0.5"/>
        <line x1="${cx + w / 2}" y1="${cy - h / 2 - 10}" x2="${cx + w / 2}" y2="${cy - h / 2 - 20}" stroke="black" stroke-width="0.5"/>
        <text x="${cx}" y="${cy - h / 2 - 20}" text-anchor="middle" font-size="8" font-family="Arial">${length} cm</text>
        
        <line x1="${cx - w / 2 - 15}" y1="${cy - h / 2}" x2="${cx - w / 2 - 15}" y2="${cy + h / 2}" stroke="black" stroke-width="0.5"/>
        <line x1="${cx - w / 2 - 10}" y1="${cy - h / 2}" x2="${cx - w / 2 - 20}" y2="${cy - h / 2}" stroke="black" stroke-width="0.5"/>
        <line x1="${cx - w / 2 - 10}" y1="${cy + h / 2}" x2="${cx - w / 2 - 20}" y2="${cy + h / 2}" stroke="black" stroke-width="0.5"/>
        <text x="${cx - w / 2 - 25}" y="${cy}" text-anchor="middle" font-size="8" font-family="Arial" transform="rotate(-90 ${cx - w / 2 - 25} ${cy})">${width} cm</text>
        
        <!-- Edge processing indicators -->
        ${item.processedEdges.front ? `<line x1="${cx - w / 2}" y1="${cy - h / 2}" x2="${cx + w / 2}" y2="${cy - h / 2}" stroke="#2196F3" stroke-width="3"/>` : ''}
        ${item.processedEdges.back ? `<line x1="${cx - w / 2}" y1="${cy + h / 2}" x2="${cx + w / 2}" y2="${cy + h / 2}" stroke="#2196F3" stroke-width="3"/>` : ''}
        ${item.processedEdges.left ? `<line x1="${cx - w / 2}" y1="${cy - h / 2}" x2="${cx - w / 2}" y2="${cy + h / 2}" stroke="#2196F3" stroke-width="3"/>` : ''}
        ${item.processedEdges.right ? `<line x1="${cx + w / 2}" y1="${cy - h / 2}" x2="${cx + w / 2}" y2="${cy + h / 2}" stroke="#2196F3" stroke-width="3"/>` : ''}
        
        <!-- Okapnik indicators -->
        ${item.okapnikEdges.front ? `<rect x="${cx - w / 2 + 5}" y="${cy - h / 2 + 2}" width="${w - 10}" height="4" fill="#FF9800"/>` : ''}
        ${item.okapnikEdges.back ? `<rect x="${cx - w / 2 + 5}" y="${cy + h / 2 - 6}" width="${w - 10}" height="4" fill="#FF9800"/>` : ''}
        
        <!-- Labels -->
        <text x="${cx}" y="${cy}" text-anchor="middle" font-size="10" font-family="Arial" font-weight="bold">${item.material.name}</text>
        <text x="${cx}" y="${cy + 12}" text-anchor="middle" font-size="8" font-family="Arial">Pogled odozgo</text>
      </svg>
    `;
    } else if (view === 'side') {
        // Side view (section)
        const w = width * scale;
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
        <rect x="${cx - w / 2}" y="${cy - h / 2}" width="${w}" height="${h}" 
              fill="url(#hatch2)" stroke="black" stroke-width="2"/>
        <line x1="${cx + w / 2 + 10}" y1="${cy - h / 2}" x2="${cx + w / 2 + 10}" y2="${cy + h / 2}" stroke="black" stroke-width="0.5"/>
        <text x="${cx + w / 2 + 20}" y="${cy}" text-anchor="middle" font-size="8" font-family="Arial" transform="rotate(-90 ${cx + w / 2 + 20} ${cy})">${height} cm</text>
        <text x="${cx}" y="${cy + h / 2 + 15}" text-anchor="middle" font-size="8" font-family="Arial">Bočni pogled</text>
      </svg>
    `;
    } else {
        // Front view
        const w = length * scale;
        const h = height * scale * 2;
        const cx = 100;
        const cy = 75;

        svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="200" height="150" viewBox="0 0 200 150">
        <defs>
          <pattern id="hatch3" patternUnits="userSpaceOnUse" width="3" height="3" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="3" stroke="#888" stroke-width="0.5"/>
          </pattern>
        </defs>
        <rect x="${cx - w / 2}" y="${cy - h / 2}" width="${w}" height="${h}" 
              fill="url(#hatch3)" stroke="black" stroke-width="2"/>
        <text x="${cx}" y="${cy + h / 2 + 15}" text-anchor="middle" font-size="8" font-family="Arial">Prednji pogled</text>
      </svg>
    `;
    }

    return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
}

// Generate edge profile diagram
function generateProfileDiagram(profile: EdgeProfile, edgeName: string): string {
    const profileName = profile.name.toLowerCase();
    const smusMatch = profileName.match(/smuš c([\d.]+)/);
    const poluRMatch = profileName.match(/polu-zaobljena r([\d.]+)/);
    const punoRMatch = profileName.match(/puno-zaobljena/);

    let path = '';
    let label = '';

    if (smusMatch) {
        const size = smusMatch[1];
        path = 'M40,20 L40,100 L60,120 L60,20 Z';
        label = `Smuš C${size}`;
    } else if (poluRMatch) {
        const r = poluRMatch[1];
        path = 'M40,20 L40,100 Q40,120 60,120 L60,20 Z';
        label = `Polu-zaobljena R${r}`;
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
    </svg>
  `;

    return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
}

// Main PDF generation function
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
            companyName = 'Kamena Galanterija',
            companyAddress = '',
            companyPhone = '',
            companyEmail = '',
            orderNumber = `RN-${new Date().toISOString().split('T')[0].replace(/-/g, '')}`,
            customerName = '',
            notes = ''
        } = options;

        // --- Header Section ---
        doc.setFillColor(44, 62, 80);
        doc.rect(0, 0, pageWidth, 40, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(24);
        doc.text('RADNI NALOG', margin, 25);

        doc.setFontSize(10);
        doc.setFont('Helvetica', 'normal');
        doc.text(`Broj: ${orderNumber}`, pageWidth - margin - 50, 20);
        doc.text(`Datum: ${new Date().toLocaleDateString('hr-HR')}`, pageWidth - margin - 50, 27);

        cursorY = 50;

        // --- Company Info ---
        doc.setTextColor(44, 62, 80);
        doc.setFontSize(10);
        doc.setFont('Helvetica', 'bold');
        doc.text(companyName, margin, cursorY);
        doc.setFont('Helvetica', 'normal');
        cursorY += 5;
        if (companyAddress) {
            doc.text(companyAddress, margin, cursorY);
            cursorY += 5;
        }
        if (companyPhone) {
            doc.text(`Tel: ${companyPhone}`, margin, cursorY);
            cursorY += 5;
        }
        if (companyEmail) {
            doc.text(`Email: ${companyEmail}`, margin, cursorY);
            cursorY += 5;
        }

        if (customerName) {
            cursorY += 5;
            doc.setFont('Helvetica', 'bold');
            doc.text(`Kupac: ${customerName}`, margin, cursorY);
            cursorY += 10;
        } else {
            cursorY += 10;
        }

        // --- Items ---
        let totalCost = 0;

        for (let i = 0; i < orderItems.length; i++) {
            const item = orderItems[i];
            totalCost += item.totalCost;

            // Check page break
            if (cursorY > pageHeight - 100 && i < orderItems.length - 1) {
                doc.addPage();
                cursorY = margin;
            }

            // Item header
            doc.setFillColor(236, 240, 241);
            doc.rect(margin, cursorY - 5, pageWidth - margin * 2, 12, 'F');
            doc.setTextColor(44, 62, 80);
            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(12);

            let quantityString = '';
            switch (item.orderUnit) {
                case 'piece': quantityString = `${item.quantity} kom`; break;
                case 'sqm': quantityString = `${item.quantity.toFixed(2)} m²`; break;
                case 'lm': quantityString = `${item.quantity.toFixed(2)} m`; break;
            }

            doc.text(`Stavka ${i + 1}: ${item.id} (${quantityString})`, margin + 2, cursorY + 2);
            cursorY += 18;

            // --- 3D Visualization ---
            if (images3D[i]) {
                try {
                    doc.setFont('Helvetica', 'normal');
                    doc.setFontSize(8);
                    doc.setTextColor(100, 100, 100);
                    doc.text('3D Prikaz', margin, cursorY);
                    cursorY += 4;

                    const imgWidth = 80;
                    const imgHeight = 60;

                    // Detect image format from data URI
                    const imageData = images3D[i]!;
                    let format: 'PNG' | 'JPEG' | 'SVG' | 'WEBP' = 'PNG'; // Default to PNG

                    if (imageData.startsWith('data:image/')) {
                        // Extract format from data URI (e.g., "data:image/svg+xml;base64,...")
                        const match = imageData.match(/data:image\/([^;]+);/);
                        if (match) {
                            const detectedFormat = match[1].toLowerCase();

                            // Map common formats to jsPDF supported formats
                            if (detectedFormat.includes('jpeg') || detectedFormat.includes('jpg')) {
                                format = 'JPEG';
                            } else if (detectedFormat.includes('png')) {
                                format = 'PNG';
                            } else if (detectedFormat.includes('svg')) {
                                format = 'SVG';
                            } else if (detectedFormat.includes('webp')) {
                                format = 'WEBP';
                            }
                            // Else keep default PNG and let jsPDF attempt to decode
                        }
                    }

                    doc.addImage(imageData, format, margin, cursorY, imgWidth, imgHeight);
                } catch (e) {
                    console.error('Error adding 3D image:', e);
                }
            }

            // --- 2D Technical Drawings ---
            try {
                const topView = generateTechnicalDrawing2D(item, edgeNames, 'top');
                const sideView = generateTechnicalDrawing2D(item, edgeNames, 'side');

                const drawingX = margin + 85;
                const drawingY = cursorY;

                doc.setFontSize(8);
                doc.text('Tehnički crtež', drawingX, drawingY - 1);

                doc.addImage(topView, 'SVG', drawingX, drawingY, 50, 37.5);

                if (cursorY + 40 < pageHeight - 30) {
                    doc.addImage(sideView, 'SVG', drawingX + 55, drawingY, 50, 37.5);
                }
            } catch (e) {
                console.error('Error adding 2D drawings:', e);
            }

            cursorY += 70;

            // --- Item Details Table ---
            const processedEdgesString = Object.entries(item.processedEdges)
                .filter(([, v]) => v)
                .map(([k]) => getEdgeName(k))
                .join(', ') || 'Nema';

            const okapnikEdgesString = Object.entries(item.okapnikEdges || {})
                .filter(([, v]) => v)
                .map(([k]) => getEdgeName(k))
                .join(', ') || 'Nema';

            const tableData = [
                ['Materijal', item.material.name],
                ['Obrada lica', item.finish.name],
                ['Dimenzije', `${item.dims.length} × ${item.dims.width} × ${item.dims.height} cm`],
                ['Profil ivice', item.profile.name],
                ['Obrada ivica', processedEdgesString],
            ];

            if (okapnikEdgesString !== 'Nema') {
                tableData.push(['Okapnik', okapnikEdgesString]);
            }

            if (item.bunjaEdgeStyle) {
                tableData.push(['Stil ivica', item.bunjaEdgeStyle === 'lomljene' ? 'Lomljene' : 'Oštre']);
            }

            tableData.push([
                { content: 'Cijena', styles: { fontStyle: 'bold' } },
                { content: `€${item.totalCost.toFixed(2)}`, styles: { halign: 'right', fontStyle: 'bold' } }
            ] as any);

            autoTable(doc, {
                startY: cursorY,
                head: [],
                body: tableData,
                theme: 'grid',
                tableWidth: pageWidth - margin * 2,
                margin: { left: margin },
                styles: { font: 'Helvetica', fontSize: 9, cellPadding: 2 },
                columnStyles: {
                    0: { fontStyle: 'bold', cellWidth: 35, fillColor: [248, 249, 250] },
                    1: { cellWidth: 'auto' },
                },
                alternateRowStyles: { fillColor: [255, 255, 255] },
            });

            cursorY = (doc as any).lastAutoTable.finalY + 10;

            // --- Edge Profile Diagrams ---
            const processedEdges = Object.entries(item.processedEdges).filter(([, v]) => v);
            if (processedEdges.length > 0) {
                const diagramY = cursorY;
                let diagramX = margin;

                doc.setFontSize(8);
                doc.setTextColor(100, 100, 100);
                doc.text('Profil ivice:', margin, diagramY);

                for (const [edge] of processedEdges.slice(0, 3)) {
                    try {
                        const diagram = generateProfileDiagram(item.profile, getEdgeName(edge));
                        doc.addImage(diagram, 'SVG', diagramX, diagramY + 2, 25, 35);
                        diagramX += 30;
                    } catch (e) {
                        // Skip diagram if error
                    }
                }
                cursorY += 40;
            }

            // Separator
            if (i < orderItems.length - 1) {
                doc.setDrawColor(200, 200, 200);
                doc.setLineWidth(0.5);
                doc.line(margin, cursorY, pageWidth - margin, cursorY);
                cursorY += 10;
            }
        }

        // --- Notes Section ---
        if (notes) {
            if (cursorY + 30 > pageHeight - margin) {
                doc.addPage();
                cursorY = margin;
            }

            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(11);
            doc.setTextColor(44, 62, 80);
            doc.text('Napomene:', margin, cursorY);
            cursorY += 7;

            doc.setFont('Helvetica', 'normal');
            doc.setFontSize(10);
            const splitNotes = doc.splitTextToSize(notes, pageWidth - margin * 2);
            doc.text(splitNotes, margin, cursorY);
            cursorY += splitNotes.length * 5 + 10;
        }

        // --- Summary Section ---
        if (cursorY + 25 > pageHeight - margin) {
            doc.addPage();
            cursorY = margin;
        }

        doc.setFillColor(44, 62, 80);
        doc.rect(margin, cursorY, pageWidth - margin * 2, 20, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(14);
        doc.text(`UKUPNO: €${totalCost.toFixed(2)}`, pageWidth - margin - 5, cursorY + 13, { align: 'right' });

        // --- Footer ---
        const pageCount = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFont('Helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text(
                `Stranica ${i} od ${pageCount} | ${orderNumber}`,
                pageWidth / 2,
                pageHeight - 5,
                { align: 'center' }
            );
        }

        // Save PDF
        doc.save(`Radni_Nalog_${orderNumber}_${new Date().toISOString().split('T')[0]}.pdf`);

    } catch (error) {
        console.error('PDF generation error:', error);
        throw new Error('Greška pri izradi PDF-a');
    }
}

// Legacy function for backwards compatibility
export function generateAndDownloadPdf(orderItems: OrderItem[], edgeNames: EdgeNameMap) {
    const images3D = orderItems.map(() => null);
    return generateEnhancedPdf(orderItems, edgeNames, images3D);
}
