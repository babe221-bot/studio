'use client';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { OrderItem } from '@/types';

type EdgeNameMap = {
  [key: string]: string;
};

// This function generates and downloads a PDF document from the order items.
export function generateAndDownloadPdf(orderItems: OrderItem[], edgeNames: EdgeNameMap) {
  try {
    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    const margin = 14;
    let cursorY = margin;

    // --- Title ---
    // Use built-in Helvetica to avoid font issues
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(18);
    doc.text(`Radni Nalog`, margin, cursorY);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(12);
    cursorY += 7;
    doc.text(`${new Date().toLocaleDateString('hr-HR')}`, margin, cursorY);
    cursorY += 15;
    
    let totalCost = 0;

    // --- Items Loop ---
    orderItems.forEach((item, index) => {
      totalCost += item.totalCost;
      const processedEdgesString = Object.entries(item.processedEdges)
        .filter(([, v]) => v)
        .map(([k]) => edgeNames[k as keyof typeof edgeNames])
        .join(', ') || 'Nema';

      const okapnikEdgesString = Object.entries(item.okapnikEdges || {})
        .filter(([, v]) => v)
        .map(([k]) => edgeNames[k as keyof typeof edgeNames])
        .join(', ') || 'Nema';
      
      const itemHeightEstimate = 70; // Rough estimate for image + table
      if (cursorY + itemHeightEstimate > pageHeight - margin) {
        doc.addPage();
        cursorY = margin;
      }
      
      doc.setFontSize(14);
      doc.setFont('Helvetica', 'bold');
      doc.text(`Stavka ${index + 1}: ${item.id}`, margin, cursorY);
      cursorY += 6;

      const imageWidth = 60;
      const imageHeight = 45;

      if (item.snapshotDataUri) {
        try {
          // Add the 2D snapshot
          doc.addImage(item.snapshotDataUri, 'PNG', margin, cursorY, imageWidth, imageHeight);
        } catch (e) {
          console.error("Greška pri dodavanju slike za stavku:", item.id, e);
          doc.text("Slika nije dostupna", margin, cursorY + imageHeight / 2);
        }
      } else {
        doc.text("Nema 2D crteža", margin, cursorY + imageHeight / 2);
      }
      
      // Create the table with item details
      const tableRows = [
        ['Materijal', item.material.name],
        ['Obrada lica', item.finish.name],
        ['Profil ivice', item.profile.name],
        ['Dimenzije (cm)', `${item.dims.length} x ${item.dims.width} x ${item.dims.height}`],
        ['Obrada ivica', processedEdgesString],
        ['Okapnik', okapnikEdgesString],
        [{ content: 'Cijena stavke', styles: { fontStyle: 'bold' } }, { content: `€${item.totalCost.toFixed(2)}`, styles: { halign: 'right', fontStyle: 'bold' } }]
      ];
      
      const tableX = margin + imageWidth + 10;
      
      autoTable(doc, {
        startY: cursorY,
        head: [],
        body: tableRows,
        theme: 'grid',
        tableWidth: pageWidth - tableX - margin,
        margin: { left: tableX },
        styles: { font: 'Helvetica', fontSize: 9, cellPadding: 1.5 },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 35 },
            1: { cellWidth: 'auto' },
        },
      });

      const tableFinalY = (doc as any).lastAutoTable.finalY;
      cursorY = Math.max(cursorY + imageHeight, tableFinalY) + 10;

      // Add a separator line
      if (index < orderItems.length - 1) {
          doc.setDrawColor(200, 200, 200); // light grey
          doc.line(margin, cursorY, pageWidth - margin, cursorY);
          cursorY += 10;
      }
    });

    // --- Total Cost Summary ---
    if (cursorY + 20 > pageHeight - margin) {
      doc.addPage();
      cursorY = margin;
    }
    
    doc.setFontSize(16);
    doc.setFont('Helvetica', 'bold');
    doc.text(`UKUPNO: €${totalCost.toFixed(2)}`, margin, cursorY);

    // --- Save PDF ---
    doc.save(`Radni_Nalog_${new Date().toISOString().split('T')[0]}.pdf`);

  } catch (error) {
    console.error("PDF generation error:", error);
    alert("Došlo je do greške pri izradi PDF-a. Provjerite konzolu za detalje.");
  }
}
