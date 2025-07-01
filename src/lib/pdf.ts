
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
    // Use built-in Helvetica to avoid font issues with diacritics
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
      
      const itemHeightEstimate = 120; // Estimate for images + table
      if (cursorY + itemHeightEstimate > pageHeight - margin) {
        doc.addPage();
        cursorY = margin;
      }
      
      doc.setFontSize(14);
      doc.setFont('Helvetica', 'bold');
      doc.text(`Stavka ${index + 1}: ${item.id}`, margin, cursorY);
      cursorY += 8;

      // --- Images ---
      const imageBlockY = cursorY;
      let imageBlockHeight = 0;

      // --- Plan (Top-down) Image with Dimensions ---
      const planImageX = margin;
      const imageWidth = pageWidth - margin * 2;
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      doc.text('Tlocrt (mjere u cm)', planImageX, imageBlockY);

      if (item.planSnapshotDataUri) {
        try {
          const planImageHeight = (imageWidth * item.dims.width) / item.dims.length;
          doc.addImage(item.planSnapshotDataUri, 'PNG', planImageX, imageBlockY + 2, imageWidth, planImageHeight);
          imageBlockHeight = Math.max(imageBlockHeight, planImageHeight + 2);

          // Draw dimensions on plan view
          doc.setDrawColor(0);
          doc.setLineWidth(0.2);
          doc.setFontSize(7);
          doc.setTextColor(0);

          const p = 4; // padding for dimension lines

          // Length dimension (horizontal)
          const lenY = imageBlockY + 2 + planImageHeight + p;
          doc.line(planImageX, lenY, planImageX + imageWidth, lenY); // main line
          doc.line(planImageX, lenY - 1.5, planImageX, lenY + 1.5); // left tick
          doc.line(planImageX + imageWidth, lenY - 1.5, planImageX + imageWidth, lenY + 1.5); // right tick
          doc.text(item.dims.length.toString(), planImageX + imageWidth / 2, lenY - 1, { align: 'center' });
          imageBlockHeight = Math.max(imageBlockHeight, planImageHeight + p + 4); // update height with dimensions

          // Width dimension (vertical)
          const widX = planImageX + imageWidth + p;
          doc.line(widX, imageBlockY + 2, widX, imageBlockY + 2 + planImageHeight); // main line
          doc.line(widX - 1.5, imageBlockY + 2, widX + 1.5, imageBlockY + 2); // top tick
          doc.line(widX - 1.5, imageBlockY + 2 + planImageHeight, widX + 1.5, imageBlockY + 2 + planImageHeight); // bottom tick
          doc.text(item.dims.width.toString(), widX + 1, imageBlockY + 2 + planImageHeight / 2, { align: 'center', angle: -90 });
        } catch (e) {
          console.error("Greška pri dodavanju tlocrta:", item.id, e);
          doc.text("Tlocrt nije dostupan", planImageX, imageBlockY + 20);
        }
      }

      cursorY += imageBlockHeight + 10;
      
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
