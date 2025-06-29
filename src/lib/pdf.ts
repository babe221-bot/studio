import { jsPDF } from 'jspdf';
import type { OrderItem } from '@/types';

const drawPlateOutline = (doc: jsPDF, x: number, y: number, dims: { length: number, width: number, height: number }, scale = 3) => {
    const w = dims.width / scale;
    const l = dims.length / scale;
    doc.setLineWidth(0.2).setDrawColor(100).rect(x, y, l, w);
    doc.setFontSize(8).setTextColor(120);

    // Horizontal dimension
    doc.line(x, y - 5, x + l, y - 5);
    doc.line(x, y - 7, x, y - 3);
    doc.line(x + l, y - 7, x + l, y - 3);
    doc.text(`${dims.length.toFixed(1)} cm`, x + l / 2, y - 8, { align: 'center' });

    // Vertical dimension
    doc.line(x - 5, y, x - 5, y + w);
    doc.line(x - 7, y, x - 3, y);
    doc.line(x - 7, y + w, x - 3, w);
    doc.text(`${dims.width.toFixed(1)} cm`, x - 8, y + w / 2, { align: 'center', angle: -90 });
};

export const generatePdfDataUri = (orderItems: OrderItem[]): string | null => {
  if (orderItems.length === 0) {
    alert('Nema stavki za PDF.');
    return null;
  }
  
  const doc = new jsPDF();
  let yPos = 15;
  const margin = 15;
  const pageWidth = doc.internal.pageSize.getWidth();

  const edgeNames = {
    front: 'Prednja',
    back: 'Zadnja',
    left: 'Lijeva',
    right: 'Desna'
  };
  
  doc.setFont('helvetica', 'bold').setFontSize(18).text('Radni nalog', margin, yPos);
  yPos += 10;
  doc.setFont('helvetica', 'normal').setFontSize(10).text(`Datum: ${new Date().toLocaleDateString()}`, margin, yPos);
  yPos += 15;

  let grandTotal = 0;
  orderItems.forEach((item, index) => {
    const drawingHeight = 70;
    if (yPos > doc.internal.pageSize.getHeight() - drawingHeight - 40) {
      doc.addPage();
      yPos = 15;
    }

    doc.setLineWidth(0.5).rect(margin, yPos, pageWidth - 2 * margin, drawingHeight + 30);
    
    let textY = yPos + 8;
    doc.setFont('helvetica', 'bold').setFontSize(12).text(`${index + 1}. Stavka: ${item.id}`, margin + 5, textY);
    textY += 7;
    doc.setFont('helvetica', 'normal').setFontSize(10);
    doc.text(`- Materijal: ${item.material.name}`, margin + 10, textY);
    textY += 5;
    doc.text(`- Obrada: ${item.finish.name}, Ivice: ${item.profile.name}`, margin + 10, textY);
    textY += 5;

    const processedEdgesString = !item.processedEdges
      ? 'Sve (stari unos)'
      : (Object.entries(item.processedEdges)
          .filter(([, selected]) => selected)
          .map(([edge]) => edgeNames[edge as keyof typeof edgeNames])
          .join(', ') || 'Nijedna');
    
    doc.text(`- Obrađene ivice: ${processedEdgesString}`, margin + 10, textY);
    textY += 7;
    
    doc.setFont('helvetica', 'bold').text(`Cijena stavke: €${item.totalCost.toFixed(2)}`, margin + 10, textY);
    
    drawPlateOutline(doc, margin + 5, yPos + 45, item.dims);
    
    yPos += drawingHeight + 40;
    grandTotal += item.totalCost;
  });

  if (yPos > doc.internal.pageSize.getHeight() - 30) {
    doc.addPage();
    yPos = 20;
  }
  
  doc.setLineWidth(0.5).line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;
  doc.setFont('helvetica', 'bold').setFontSize(14).text(`UKUPNO NALOG: €${grandTotal.toFixed(2)}`, margin, yPos, {
    align: 'left',
  });

  return doc.output('datauristring');
};
