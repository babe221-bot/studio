import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import type { OrderItem } from '@/types';

type ProcessedEdges2D = {
    top?: boolean,
    bottom?: boolean,
    left?: boolean,
    right?: boolean,
};

type DrawRectOptions = {
    surfaceFinish?: string,
    processedEdges?: ProcessedEdges2D,
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
  options?: DrawRectOptions
) => {
    const scale = 5; // Increased scale for larger drawings on A3
    const rectW = w * scale;
    const rectH = h * scale;
    const textOffset = 4;
    const dimLineOffset = 8;
    const dimTickSize = 3;

    doc.setFontSize(10).setFont('helvetica', 'bold').text(title, x, y - 15);
    
    doc.setLineWidth(0.3).setDrawColor(0).rect(x, y, rectW, rectH);

    if (options?.surfaceFinish) {
      doc.setFontSize(8).setTextColor(120).setFont('helvetica', 'italic');
      doc.text(options.surfaceFinish, x + rectW / 2, y + rectH / 2, { align: 'center' });
    }
    
    doc.setFontSize(9).setTextColor(100).setFont('helvetica', 'normal');

    // Horizontal dimension line
    doc.line(x, y - dimLineOffset, x + rectW, y - dimLineOffset);
    doc.line(x, y - dimLineOffset - dimTickSize, x, y - dimLineOffset + dimTickSize);
    doc.line(x + rectW, y - dimLineOffset - dimTickSize, x + rectW, y - dimLineOffset + dimTickSize);
    doc.text(`${w_label}`, x + rectW / 2, y - dimLineOffset - textOffset, { align: 'center' });

    // Vertical dimension line
    doc.line(x - dimLineOffset, y, x - dimLineOffset, y + rectH);
    doc.line(x - dimLineOffset - dimTickSize, y, x - dimLineOffset + dimTickSize, y);
    doc.line(x - dimLineOffset - dimTickSize, y + rectH, x - dimLineOffset + dimTickSize, y + rectH);
    doc.text(`${h_label}`, x - dimLineOffset - textOffset, y + rectH / 2, { align: 'center', angle: -90 });

    if (options?.processedEdges) {
        doc.setLineWidth(1).setDrawColor(255, 215, 0); // Thicker line for visibility
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
  
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' });
  const margin = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const edgeNames = {
    front: 'Prednja',
    back: 'Zadnja',
    left: 'Lijeva',
    right: 'Desna'
  };
  
  for (const [index, item] of orderItems.entries()) {
    if (index > 0) {
      doc.addPage();
    }
    let yPos = margin + 10;
    
    doc.setFont('helvetica', 'bold').setFontSize(22).text('Radni nalog', margin, yPos);
    yPos += 10;
    doc.setFont('helvetica', 'normal').setFontSize(12).text(`Datum: ${new Date().toLocaleDateString()}`, margin, yPos);
    yPos += 15;

    doc.setLineWidth(0.5).setDrawColor(200).rect(margin, yPos, pageWidth - 2 * margin, pageHeight - yPos - margin);
    
    let textY = yPos + 12;
    const contentX = margin + 8;
    const rightColumnX = pageWidth / 2 + 30;

    doc.setFont('helvetica', 'bold').setFontSize(18).text(`Stavka ${index + 1}: ${item.id}`, contentX, textY);
    textY += 15;

    doc.setFont('helvetica', 'bold').setFontSize(12).text(`Specifikacije:`, contentX, textY);
    textY += 7;
    
    doc.setFont('helvetica', 'normal').setFontSize(11);
    doc.text(`- Materijal: ${item.material.name}`, contentX, textY);
    textY += 7;
    doc.text(`- Obrada lica: ${item.finish.name}`, contentX, textY);
    textY += 7;
    doc.text(`- Profil ivica: ${item.profile.name}`, contentX, textY);
    textY += 7;
    
    const processedEdgesString = (Object.entries(item.processedEdges)
          .filter(([, selected]) => selected)
          .map(([edge]) => edgeNames[edge as keyof typeof edgeNames])
          .join(', ') || 'Nijedna');
    
    doc.text(`- Primjena profila: ${processedEdgesString}`, contentX, textY);
    textY += 12;
    
    doc.setFont('helvetica', 'bold').setFontSize(14).text(`Cijena stavke: €${item.totalCost.toFixed(2)}`, contentX, textY);
    
    if (item.snapshotDataUri) {
       try {
        const snapshotW = 120;
        const snapshotH = 90;
        doc.setFont('helvetica', 'bold').setFontSize(12).text(`3D Prikaz:`, rightColumnX, yPos + 12);
        doc.addImage(item.snapshotDataUri, 'PNG', rightColumnX, yPos + 20, snapshotW, snapshotH);
      } catch (e) {
        console.error("Failed to add image to PDF", e);
        doc.text("3D Prikaz nedostupan", rightColumnX, yPos + 20);
      }
    }
    
    const drawingY = textY + 40;
    const drawingStartX = contentX + 20;

    // Tlocrt
    drawDimensionedRect(doc, drawingStartX, drawingY, item.dims.length, item.dims.width, `${item.dims.length.toFixed(1)} cm`, `${item.dims.width.toFixed(1)} cm`, 'Tlocrt (Top View)', {
      surfaceFinish: item.finish.name,
      processedEdges: {
        top: item.processedEdges.back,
        bottom: item.processedEdges.front,
        left: item.processedEdges.left,
        right: item.processedEdges.right,
      },
    });

    const frontViewX = rightColumnX;
    // Nacrt
    drawDimensionedRect(doc, frontViewX, drawingY, item.dims.length, item.dims.height, `${item.dims.length.toFixed(1)} cm`, `${item.dims.height.toFixed(1)} cm`, 'Nacrt (Front View)');
    doc.setFontSize(8).setTextColor(120).setFont('helvetica', 'normal').text(`Profil: ${item.profile.name}`, frontViewX, drawingY + (item.dims.height * 5) + 15);
    
    // Bokocrt
    const sideViewY = drawingY + (item.dims.height * 5) + 40;
    drawDimensionedRect(doc, frontViewX, sideViewY, item.dims.width, item.dims.height, `${item.dims.width.toFixed(1)} cm`, `${item.dims.height.toFixed(1)} cm`, 'Bokocrt (Side View)');
     doc.setFontSize(8).setTextColor(120).setFont('helvetica', 'normal').text(`Profil: ${item.profile.name}`, frontViewX, sideViewY + (item.dims.height * 5) + 15);
  }

  // Grand total could be on a summary page, for now we keep it per item.

  return doc.output('datauristring');
};
