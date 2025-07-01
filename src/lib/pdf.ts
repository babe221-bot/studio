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

    // Set font - Using standard Helvetica to avoid encoding issues.
    // Croatian characters might not display correctly.
    doc.setFont('Helvetica', 'normal');

    // Title
    doc.setFontSize(18);
    doc.text(`Radni Nalog - ${new Date().toLocaleDateString('hr-HR')}`, 14, 22);

    // Prepare data for the table
    const tableColumn = ["ID", "Opis", "Dimenzije (cm)", "Cijena"];
    const tableRows: (string | number)[][] = [];

    let totalCost = 0;

    orderItems.forEach(item => {
      const processedEdgesString = Object.entries(item.processedEdges)
        .filter(([, v]) => v)
        .map(([k]) => edgeNames[k as keyof typeof edgeNames])
        .join(', ') || 'Nema';

      const okapnikEdgesString = Object.entries(item.okapnikEdges || {})
        .filter(([, v]) => v)
        .map(([k]) => edgeNames[k as keyof typeof edgeNames])
        .join(', ') || 'Nema';

      const description = [
        `Materijal: ${item.material.name}`,
        `Obrada lica: ${item.finish.name}`,
        `Profil ivice: ${item.profile.name}`,
        `Obrada ivica: ${processedEdgesString}`,
        `Okapnik: ${okapnikEdgesString}`
      ].join('\n');

      const dimensions = `${item.dims.length} x ${item.dims.width} x ${item.dims.height}`;
      const price = `€${item.totalCost.toFixed(2)}`;
      
      const itemRow = [
        item.id,
        description,
        dimensions,
        price
      ];
      tableRows.push(itemRow);
      totalCost += item.totalCost;
    });

    // Add table to the document
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 30,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
      styles: { font: 'Helvetica', fontSize: 9, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 80 },
        2: { cellWidth: 'auto' },
        3: { cellWidth: 25, halign: 'right' }
      },
      didDrawPage: function (data) {
        // This is a workaround to ensure the startY is respected on every page
        data.settings.startY = 30;
      }
    });

    // Add total cost
    const finalY = (doc as any).lastAutoTable.finalY; // Eensure we get the end of the table
    doc.setFontSize(12);
    doc.setFont('Helvetica', 'bold');
    doc.text(`UKUPNO: €${totalCost.toFixed(2)}`, 14, finalY + 15);


    // Save the PDF
    doc.save(`Radni_Nalog_${new Date().toISOString().split('T')[0]}.pdf`);

  } catch (error) {
    console.error("PDF generation error:", error);
    alert("Došlo je do greške pri izradi PDF-a.");
  }
}
