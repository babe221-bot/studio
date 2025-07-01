'use client';

import jsPDF from 'jspdf';
import 'jspdf-autotable';
import type { UserOptions } from 'jspdf-autotable';
import { robotoRegularBase64, robotoBoldBase64 } from './fonts';
import type { OrderItem } from '@/types';

interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: UserOptions) => jsPDF;
}

// Main function to generate and download the PDF
export const generateAndDownloadPdf = (orderItems: OrderItem[]) => {
  try {
    const doc = new jsPDF() as jsPDFWithAutoTable;

    // Register fonts
    doc.addFileToVFS('Roboto-Regular.ttf', robotoRegularBase64);
    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
    doc.addFileToVFS('Roboto-Bold.ttf', robotoBoldBase64);
    doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');

    // Set font for the entire document
    doc.setFont('Roboto', 'normal');

    // Add header
    doc.setFontSize(20);
    doc.setFont('Roboto', 'bold');
    doc.text('Radni Nalog', 14, 22);
    doc.setFontSize(11);
    doc.setFont('Roboto', 'normal');
    const date = new Date().toLocaleDateString('hr-HR');
    doc.text(date, 14, 29);

    // Table
    const tableColumn = ["Stavka", "Materijal", "Dimenzije", "Obrada ivica", "Cijena (€)"];
    const tableRows: (string | number)[][] = [];

    orderItems.forEach(item => {
      const processedEdgesString = Object.entries(item.processedEdges)
            .filter(([, v]) => v)
            .map(([k]) => k.charAt(0).toUpperCase() + k.slice(1))
            .join(', ') || 'Nema';

      const itemData = [
        item.id,
        item.material.name,
        `${item.dims.length} x ${item.dims.width} x ${item.dims.height}`,
        processedEdgesString,
        item.totalCost.toFixed(2),
      ];
      tableRows.push(itemData);
    });

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 35,
      theme: 'grid',
      headStyles: {
        fillColor: [38, 50, 56], // Dark grey
        textColor: 255,
        fontStyle: 'bold',
        font: 'Roboto',
      },
      styles: {
        font: 'Roboto',
        fontStyle: 'normal',
        cellPadding: 2,
        fontSize: 10,
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245] // Light grey for alternate rows
      },
    });
    
    // Total
    const totalCost = orderItems.reduce((acc, item) => acc + item.totalCost, 0);
    const finalY = (doc as any).autoTable.previous.finalY;
    doc.setFontSize(12);
    doc.setFont('Roboto', 'bold');
    doc.text(`UKUPNO: ${totalCost.toFixed(2)} €`, 14, finalY + 15);

    doc.save(`Radni_Nalog_${date.replace(/\./g, '-')}.pdf`);

  } catch (error) {
    console.error("Error generating PDF:", error);
    throw new Error("Failed to generate PDF. Check console for details.");
  }
};