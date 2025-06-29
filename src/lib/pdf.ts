import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import type { OrderItem, ProcessedEdges } from '@/types';

type DrawRectOptions = {
    surfaceFinish?: string;
    processedEdges?: ProcessedEdges;
    okapnikEdges?: ProcessedEdges;
    profileName?: string;
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
  view: 'tlocrt' | 'nacrt' | 'bokocrt',
  options?: DrawRectOptions
) => {
    const scale = 5; 
    const rectW = w * scale;
    const rectH = h * scale;
    const textOffset = 4;
    const dimLineOffset = 8;
    const dimTickSize = 3;

    doc.setFontSize(10).setFont('helvetica', 'bold').text(title, x, y - 20);
    
    // Draw main rectangle
    doc.setLineWidth(0.3).setDrawColor(0).rect(x, y, rectW, rectH);

    // Write text inside
    if (view === 'tlocrt' && options?.surfaceFinish) {
      doc.setFontSize(8).setTextColor(120).setFont('helvetica', 'italic');
      doc.text(options.surfaceFinish, x + rectW / 2, y + rectH / 2, { align: 'center' });
    }
     if (view !== 'tlocrt' && options?.profileName) {
      doc.setFontSize(8).setTextColor(120).setFont('helvetica', 'normal');
      doc.text(`Profil: ${options.profileName}`, x + rectW / 2, y + rectH + 10, {align: 'center'});
    }

    // Dimension lines
    doc.setFontSize(9).setTextColor(100).setFont('helvetica', 'normal');
    // Horizontal
    doc.line(x, y - dimLineOffset, x + rectW, y - dimLineOffset);
    doc.line(x, y - dimLineOffset - dimTickSize, x, y - dimLineOffset + dimTickSize);
    doc.line(x + rectW, y - dimLineOffset - dimTickSize, x + rectW, y - dimLineOffset + dimTickSize);
    doc.text(w_label, x + rectW / 2, y - dimLineOffset - textOffset, { align: 'center' });
    // Vertical
    doc.line(x - dimLineOffset, y, x - dimLineOffset, y + rectH);
    doc.line(x - dimLineOffset - dimTickSize, y, x - dimLineOffset + dimTickSize, y);
    doc.line(x - dimLineOffset - dimTickSize, y + rectH, x - dimLineOffset + dimTickSize, y + rectH);
    doc.text(h_label, x - dimLineOffset - textOffset, y + rectH / 2, { align: 'center', angle: -90 });

    // Processed edges indicator
    if (view === 'tlocrt' && options?.processedEdges) {
        doc.setLineWidth(1).setDrawColor(255, 215, 0); // Gold line for processed edges
        const P = options.processedEdges;
        if (P.back) doc.line(x + 1, y + 1, x + rectW - 1, y + 1); // Inset slightly
        if (P.front) doc.line(x + 1, y + rectH - 1, x + rectW - 1, y + rectH - 1);
        if (P.left) doc.line(x + 1, y + 1, x + 1, y + rectH - 1);
        if (P.right) doc.line(x + rectW - 1, y + 1, x + rectW - 1, y + rectH - 1);
    }
    
    // Okapnik indicator
    if (options?.okapnikEdges) {
        doc.setLineWidth(0.3).setDrawColor(0).setLineDashPattern([2, 2], 0); // Dashed line
        const O = options.okapnikEdges;
        const okapnikPdfOffset = 1.5 * scale; // 1.5cm from edge
        
        if (view === 'nacrt' && O.front) {
            doc.line(x, y + rectH - okapnikPdfOffset, x + rectW, y + rectH - okapnikPdfOffset);
            doc.setFontSize(7).text('okapnik', x + rectW/2, y + rectH - okapnikPdfOffset - 1, {align: 'center'});
        }
        if (view === 'bokocrt' && O.left) { // Assuming bokocrt shows left side
             doc.line(x, y + rectH - okapnikPdfOffset, x + rectW, y + rectH - okapnikPdfOffset);
             doc.setFontSize(7).text('okapnik', x + rectW/2, y + rectH - okapnikPdfOffset - 1, {align: 'center'});
        }
         if (view === 'bokocrt' && O.right) {
             doc.line(x, y + rectH - okapnikPdfOffset, x + rectW, y + rectH - okapnikPdfOffset);
             doc.setFontSize(7).text('okapnik', x + rectW/2, y + rectH - okapnikPdfOffset - 1, {align: 'center'});
        }
    }
    doc.setLineDashPattern([], 0).setDrawColor(0); // Reset line style
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

    let textY = yPos + 12;
    const contentX = margin + 8;
    const rightColumnX = pageWidth / 2 + 10;

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
    
    const processedEdgesString = Object.entries(item.processedEdges)
          .filter(([, selected]) => selected)
          .map(([edge]) => edgeNames[edge as keyof typeof edgeNames])
          .join(', ') || 'Nijedna';
    doc.text(`- Primjena profila: ${processedEdgesString}`, contentX, textY);
    textY += 7;

    const okapnikEdgesString = Object.entries(item.okapnikEdges)
          .filter(([, selected]) => selected)
          .map(([edge]) => edgeNames[edge as keyof typeof edgeNames])
          .join(', ') || 'Nema';
    doc.text(`- Okapnik na ivicama: ${okapnikEdgesString}`, contentX, textY);
    textY += 12;
    
    doc.setFont('helvetica', 'bold').setFontSize(14).text(`Cijena stavke: €${item.totalCost.toFixed(2)}`, contentX, textY);
    
    if (item.snapshotDataUri) {
       try {
        const snapshotW = 100;
        const snapshotH = 75;
        doc.setFont('helvetica', 'bold').setFontSize(12).text(`3D Prikaz:`, rightColumnX, yPos + 12);
        doc.addImage(item.snapshotDataUri, 'PNG', rightColumnX, yPos + 20, snapshotW, snapshotH);
      } catch (e) {
        console.error("Failed to add image to PDF", e);
        doc.text("3D Prikaz nedostupan", rightColumnX, yPos + 20);
      }
    }
    
    const drawingY = pageHeight / 2 + 10;
    const drawingStartX = margin + 30;
    const drawingGap = item.dims.length * 5 + 60;

    // Tlocrt
    drawDimensionedRect(doc, drawingStartX, drawingY, item.dims.length, item.dims.width, `${item.dims.length.toFixed(1)} cm`, `${item.dims.width.toFixed(1)} cm`, 'Tlocrt (Top View)', 'tlocrt', {
      surfaceFinish: item.finish.name,
      processedEdges: item.processedEdges
    });

    // Nacrt
    drawDimensionedRect(doc, drawingStartX + drawingGap, drawingY, item.dims.length, item.dims.height, `${item.dims.length.toFixed(1)} cm`, `${item.dims.height.toFixed(1)} cm`, 'Nacrt (Front View)', 'nacrt', {
        okapnikEdges: item.okapnikEdges,
        profileName: item.profile.name,
    });
    
    // Bokocrt
    drawDimensionedRect(doc, drawingStartX + drawingGap * 2, drawingY, item.dims.width, item.dims.height, `${item.dims.width.toFixed(1)} cm`, `${item.dims.height.toFixed(1)} cm`, 'Bokocrt (Side View)', 'bokocrt', {
        okapnikEdges: item.okapnikEdges,
        profileName: item.profile.name,
    });
  }

  return doc.output('datauristring');
};
