import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import type { OrderItem } from '@/types';

type ProcessedEdges2D = {
    top?: boolean,
    bottom?: boolean,
    left?: boolean,
    right?: boolean,
};

const drawDimensionedRect = (
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  w_label: string,
  h_label: string,
  title: string,
  options?: {
    surfaceFinish?: string,
    processedEdges?: ProcessedEdges2D,
  }
) => {
    const scale = 2.8;
    const rectW = w / scale;
    const rectH = h / scale;
    const textOffset = 3;
    const dimLineOffset = 4;
    const dimTickSize = 2;

    doc.setFontSize(9).setFont('helvetica', 'bold').text(title, x, y - 10);
    
    doc.setLineWidth(0.3).setDrawColor(0).rect(x, y, rectW, rectH);

    if (options?.surfaceFinish) {
      doc.setFontSize(7).setTextColor(120).setFont('helvetica', 'italic');
      doc.text(options.surfaceFinish, x + rectW / 2, y + rectH / 2, { align: 'center' });
    }
    
    doc.setFontSize(8).setTextColor(120).setFont('helvetica', 'normal');

    doc.line(x, y - dimLineOffset, x + rectW, y - dimLineOffset);
    doc.line(x, y - dimLineOffset - dimTickSize, x, y - dimLineOffset + dimTickSize);
    doc.line(x + rectW, y - dimLineOffset - dimTickSize, x + rectW, y - dimLineOffset + dimTickSize);
    doc.text(`${w_label}`, x + rectW / 2, y - dimLineOffset - textOffset, { align: 'center' });

    doc.line(x - dimLineOffset, y, x - dimLineOffset, y + rectH);
    doc.line(x - dimLineOffset - dimTickSize, y, x - dimLineOffset + dimTickSize, y);
    doc.line(x - dimLineOffset - dimTickSize, y + rectH, x - dimLineOffset + dimTickSize, y + rectH);
    doc.text(`${h_label}`, x - dimLineOffset - textOffset, y + rectH / 2, { align: 'center', angle: -90 });

    if (options?.processedEdges) {
        doc.setLineWidth(0.8).setDrawColor(255, 215, 0);
        const P = options.processedEdges;
        if (P.top) doc.line(x, y, x + rectW, y);
        if (P.bottom) doc.line(x, y + rectH, x + rectW, y + rectH);
        if (P.left) doc.line(x, y, x, y + rectH);
        if (P.right) doc.line(x + rectW, y, x + rectW, y + rectH);
        doc.setLineWidth(0.3).setDrawColor(0);
    }
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
    const itemHeight = 160;
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
    const snapshotH = 60;
    
    doc.setFont('helvetica', 'normal').setFontSize(9);
    doc.text(`- Materijal: ${item.material.name}`, detailsX, textY);
    textY += 5;
    doc.text(`- Obrada lica: ${item.finish.name}`, detailsX, textY);
    textY += 5;
    doc.text(`- Profil ivica: ${item.profile.name}`, detailsX, textY);
    textY += 5;
    
    const processedEdgesString = (Object.entries(item.processedEdges)
          .filter(([, selected]) => selected)
          .map(([edge]) => edgeNames[edge as keyof typeof edgeNames])
          .join(', ') || 'Nijedna');
    
    doc.text(`- Primjena profila: ${processedEdgesString}`, detailsX, textY);
    textY += 5;

    const okapnikString = item.okapnik && (Object.entries(item.okapnik)
          .filter(([, selected]) => selected)
          .map(([edge]) => edgeNames[edge as keyof typeof edgeNames])
          .join(', '));
    
    if (okapnikString) {
      doc.text(`- Okapnik: ${okapnikString}`, detailsX, textY);
      textY += 5;
    }
    
    textY += 3;
    
    doc.setFont('helvetica', 'bold').setFontSize(11).text(`Cijena stavke: €${item.totalCost.toFixed(2)}`, detailsX, textY);
    
    if (item.snapshotDataUri) {
       try {
        doc.addImage(item.snapshotDataUri, 'PNG', snapshotX, yPos + 8, snapshotW, snapshotH);
      } catch (e) {
        console.error("Failed to add image to PDF", e);
        doc.text("3D Prikaz nedostupan", snapshotX, yPos + 20);
      }
    }
    
    const drawingY = yPos + 90;
    const drawingStartX = margin + 20;
    const drawingScale = 2.8;

    drawDimensionedRect(doc, drawingStartX, drawingY, item.dims.length, item.dims.width, `${item.dims.length.toFixed(1)} cm`, `${item.dims.width.toFixed(1)} cm`, 'Tlocrt', {
      surfaceFinish: item.finish.name,
      processedEdges: {
        top: item.processedEdges.back,
        bottom: item.processedEdges.front,
        left: item.processedEdges.left,
        right: item.processedEdges.right,
      },
    });

    const frontViewX = drawingStartX + (item.dims.length / drawingScale) + 30;
    drawDimensionedRect(doc, frontViewX, drawingY, item.dims.length, item.dims.height, `${item.dims.length.toFixed(1)} cm`, `${item.dims.height.toFixed(1)} cm`, 'Nacrt');
    doc.setFontSize(7).setTextColor(120).setFont('helvetica', 'normal').text(`Profil: ${item.profile.name}`, frontViewX, drawingY + (item.dims.height / drawingScale) + 10);
    
    const sideViewX = frontViewX + (item.dims.length / drawingScale) + 30;
    drawDimensionedRect(doc, sideViewX, drawingY, item.dims.width, item.dims.height, `${item.dims.width.toFixed(1)} cm`, `${item.dims.height.toFixed(1)} cm`, 'Bokocrt');
     doc.setFontSize(7).setTextColor(120).setFont('helvetica', 'normal').text(`Profil: ${item.profile.name}`, sideViewX, drawingY + (item.dims.height / drawingScale) + 10);
    
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
