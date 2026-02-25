
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

      const itemHeightEstimate = 120;
      if (cursorY + itemHeightEstimate > pageHeight - margin) {
        doc.addPage();
        cursorY = margin;
      }

      let quantityString = '';
      switch (item.orderUnit) {
        case 'piece': quantityString = `${item.quantity} kom`; break;
        case 'sqm': quantityString = `${item.quantity.toFixed(2)} m²`; break;
        case 'lm': quantityString = `${item.quantity.toFixed(2)} m`; break;
      }

      doc.setFontSize(14);
      doc.setFont('Helvetica', 'bold');
      doc.text(`Stavka ${index + 1}: ${item.id} (${quantityString})`, margin, cursorY);
      cursorY += 8;

      // --- AI-Generated Technical Drawing ---
      const imageBlockY = cursorY;
      let imageBlockHeight = 0;

      const planImageX = margin;
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      doc.text('Tehnički crtež / Prikaz', planImageX, imageBlockY);

      if (item.planSnapshotDataUri) {
        try {
          const imageWidth = pageWidth - margin * 2;
          const imageHeight = 80; // Fixed height for the drawing area for consistency
          doc.addImage(item.planSnapshotDataUri, 'PNG', planImageX, imageBlockY + 4, imageWidth, imageHeight, undefined, 'FAST');
          imageBlockHeight = Math.max(imageBlockHeight, imageHeight + 4);
        } catch (e) {
          console.error("Greška pri dodavanju AI crteža:", item.id, e);
          doc.text("Tehnički crtež nije dostupan", planImageX, imageBlockY + 20);
        }
      } else {
        doc.text("Tehnički crtež nije generiran", planImageX, imageBlockY + 20);
        imageBlockHeight = 20;
      }

      cursorY += imageBlockHeight + 10;

      // --- Table with item details ---
      const tableRows = [
        ['Materijal', item.material.name],
        ['Obrada lica', item.finish.name],
        ['Dimenzije (cm)', `${item.dims.length} x ${item.dims.width} x ${item.dims.height}`],
      ];

      if (item.bunjaEdgeStyle) {
        tableRows.push(['Obrada ivica', item.bunjaEdgeStyle === 'lomljene' ? 'Lomljene' : 'Oštre']);
      } else {
        const processedEdgesString = Object.entries(item.processedEdges)
          .filter(([, v]) => v)
          .map(([k]) => edgeNames[k as keyof typeof edgeNames])
          .join(', ') || 'Nema';

        const okapnikEdgesString = Object.entries(item.okapnikEdges || {})
          .filter(([, v]) => v)
          .map(([k]) => edgeNames[k as keyof typeof edgeNames])
          .join(', ') || 'Nema';

        tableRows.push(['Profil ivice', item.profile.name]);
        tableRows.push(['Obrada ivica', processedEdgesString]);
        if (okapnikEdgesString !== 'Nema') {
          tableRows.push(['Okapnik', okapnikEdgesString]);
        }
      }

      tableRows.push([{ content: 'Cijena stavke', styles: { fontStyle: 'bold' } }, { content: `€${item.totalCost.toFixed(2)}`, styles: { halign: 'right', fontStyle: 'bold' } }] as any);

      autoTable(doc, {
        startY: cursorY,
        head: [],
        body: tableRows,
        theme: 'grid',
        tableWidth: pageWidth - margin * 2,
        margin: { left: margin },
        styles: { font: 'Helvetica', fontSize: 9, cellPadding: 1.5 },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 40 },
          1: { cellWidth: 'auto' },
        },
      });

      const tableFinalY = (doc as any).lastAutoTable.finalY;
      cursorY = tableFinalY + 15;

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
    const totalString = `UKUPNO: €${totalCost.toFixed(2)}`;
    doc.text(totalString, pageWidth - margin, cursorY, { align: 'right' });

    // --- Save PDF ---
    doc.save(`Radni_Nalog_${new Date().toISOString().split('T')[0]}.pdf`);

  } catch (error) {
    console.error("PDF generation error:", error);
    alert("Došlo je do greške pri izradi PDF-a. Provjerite konzolu za detalje.");
  }
}
