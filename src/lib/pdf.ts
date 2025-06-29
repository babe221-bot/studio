import { jsPDF } from 'jspdf';
import 'jspdf-autotable'; // Ensure this is installed for more complex tables if needed.
import type { OrderItem } from '@/types';

const drawDimensionedRect = (
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  w_label: string,
  h_label: string,
  title: string
) => {
    const scale = 3.5;
    const rectW = w / scale;
    const rectH = h / scale;
    const textOffset = 5;
    const dimLineOffset = 4;
    const dimTickSize = 2;

    doc.setFontSize(9).setFont('helvetica', 'bold').text(title, x, y - 15);
    
    doc.setLineWidth(0.3).setDrawColor(0).rect(x, y, rectW, rectH);
    doc.setFontSize(8).setTextColor(120).setFont('helvetica', 'normal');

    // Horizontal dimension
    doc.line(x, y - dimLineOffset, x + rectW, y - dimLineOffset);
    doc.line(x, y - dimLineOffset - dimTickSize, x, y - dimLineOffset + dimTickSize);
    doc.line(x + rectW, y - dimLineOffset - dimTickSize, x + rectW, y - dimLineOffset + dimTickSize);
    doc.text(`${w_label}`, x + rectW / 2, y - dimLineOffset - textOffset, { align: 'center' });

    // Vertical dimension
    doc.line(x - dimLineOffset, y, x - dimLineOffset, y + rectH);
    doc.line(x - dimLineOffset - dimTickSize, y, x - dimLineOffset + dimTickSize, y);
    doc.line(x - dimLineOffset - dimTickSize, y + rectH, x - dimLineOffset + dimTickSize, y + rectH);
    doc.text(`${h_label}`, x - dimLineOffset - textOffset, y + rectH / 2, { align: 'center', angle: -90 });
};


export const generatePdfDataUri = async (orderItems: OrderItem[]): Promise<string | null> => {
  if (orderItems.length === 0) {
    alert('Nema stavki za PDF.');
    return null;
  }
  
  const doc = new jsPDF();
  let yPos = 15;
  const margin = 15;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const edgeNames = {
    front: 'Prednja',
    back: 'Zadnja',
    left: 'Lijeva',
    right: 'Desna'
  };
  
  doc.setFont('helvetica', 'bold').setFontSize(18).text('Radni nalog', margin, yPos);
  yPos += 7;
  doc.setFont('helvetica', 'normal').setFontSize(10).text(`Datum: ${new Date().toLocaleDateString()}`, margin, yPos);
  yPos += 10;

  let grandTotal = 0;
  for (const [index, item] of orderItems.entries()) {
    const itemHeight = 135;
    if (yPos > pageHeight - itemHeight) {
      doc.addPage();
      yPos = 15;
    }

    doc.setLineWidth(0.5).setDrawColor(200).rect(margin, yPos, pageWidth - 2 * margin, itemHeight);
    
    let textY = yPos + 8;
    const contentX = margin + 5;

    doc.setFont('helvetica', 'bold').setFontSize(14).text(`${index + 1}. Stavka: ${item.id}`, contentX, textY);
    textY += 8;

    const detailsX = contentX;
    const snapshotX = pageWidth / 2 + 10;
    const snapshotW = pageWidth - snapshotX - margin;
    const snapshotH = 50;
    
    doc.setFont('helvetica', 'normal').setFontSize(9);
    doc.text(`- Materijal: ${item.material.name}`, detailsX, textY);
    textY += 5;
    doc.text(`- Obrada lica: ${item.finish.name}`, detailsX, textY);
    textY += 5;
    doc.text(`- Obrada ivica: ${item.profile.name}`, detailsX, textY);
    textY += 5;
    
    const processedEdgesString = !item.processedEdges
      ? 'Sve (stari unos)'
      : (Object.entries(item.processedEdges)
          .filter(([, selected]) => selected)
          .map(([edge]) => edgeNames[edge as keyof typeof edgeNames])
          .join(', ') || 'Nijedna');
    
    doc.text(`- Primjena na ivicama: ${processedEdgesString}`, detailsX, textY);
    textY += 8;
    
    doc.setFont('helvetica', 'bold').setFontSize(11).text(`Cijena stavke: €${item.totalCost.toFixed(2)}`, detailsX, textY);
    
    if (item.snapshotDataUri) {
       try {
        doc.addImage(item.snapshotDataUri, 'PNG', snapshotX, yPos + 8, snapshotW, snapshotH);
      } catch (e) {
        console.error("Failed to add image to PDF", e);
        doc.text("3D Prikaz nedostupan", snapshotX, yPos + 20);
      }
    }
    
    const drawingY = yPos + 70;
    const drawingStartX = margin + 20;

    // Tlocrt (Top View)
    drawDimensionedRect(doc, drawingStartX, drawingY, item.dims.length, item.dims.width, `${item.dims.length.toFixed(1)} cm`, `${item.dims.width.toFixed(1)} cm`, 'Tlocrt');
    
    // Nacrt (Front View)
    const frontViewX = drawingStartX + (item.dims.length / 3.5) + 30;
    drawDimensionedRect(doc, frontViewX, drawingY, item.dims.length, item.dims.height, `${item.dims.length.toFixed(1)} cm`, `${item.dims.height.toFixed(1)} cm`, 'Nacrt');
    
    // Bokocrt (Side View)
    const sideViewX = frontViewX + (item.dims.length / 3.5) + 30;
    drawDimensionedRect(doc, sideViewX, drawingY, item.dims.width, item.dims.height, `${item.dims.width.toFixed(1)} cm`, `${item.dims.height.toFixed(1)} cm`, 'Bokocrt');
    
    yPos += itemHeight + 10;
    grandTotal += item.totalCost;
  }

  if (yPos > pageHeight - 30) {
    doc.addPage();
    yPos = 20;
  }
  
  doc.setLineWidth(0.5).line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;
  doc.setFont('helvetica', 'bold').setFontSize(14).text(`UKUPNO NALOG: €${grandTotal.toFixed(2)}`, margin, yPos);

  return doc.output('datauristring');
};
