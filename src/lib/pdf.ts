import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { OrderItem } from '@/types';

export const generatePdfAsDataUri = (orderItems: OrderItem[]): string => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;

  orderItems.forEach((item, index) => {
    if (index > 0) {
      doc.addPage();
    }

    doc.setLineWidth(0.2);
    doc.setDrawColor(180);
    doc.rect(margin, margin, pageWidth - margin * 2, pageHeight - margin * 2);

    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('TEHNIČKA SPECIFIKACIJA', margin + 10, margin + 15);
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`ID Komada: ${item.id}`, margin + 10, margin + 25);
    
    const titleBlockX = pageWidth - margin - 120;
    const titleBlockY = margin;
    doc.rect(titleBlockX, titleBlockY, 120, 30);
    doc.text('Klijent: _________________', titleBlockX + 5, titleBlockY + 8);
    doc.text('Projekt: _________________', titleBlockX + 5, titleBlockY + 16);
    doc.text(`Datum: ${new Date().toLocaleDateString('hr-HR')}`, titleBlockX + 5, titleBlockY + 24);

    if (item.snapshotDataUri) {
      const imgWidth = 100;
      const imgHeight = 75;
      doc.addImage(item.snapshotDataUri, 'PNG', titleBlockX, margin + 40, imgWidth, imgHeight);
    }
    
    autoTable(doc, {
      startY: margin + 40,
      head: [['Specifikacija', 'Vrijednost']],
      body: [
        ['Materijal', item.material.name],
        ['Obrada lica', item.finish.name],
        ['Profil ivice', item.profile.name],
        ['Dimenzije (DxŠxV)', `${item.dims.length} x ${item.dims.width} x ${item.dims.height} cm`],
        ['Obrada ivica', Object.entries(item.processedEdges).filter(([,v])=>v).map(([k])=>k).join(', ') || 'Nema'],
        ['Okapnik', Object.entries(item.okapnikEdges).filter(([,v])=>v).map(([k])=>k).join(', ') || 'Nema'],
        ['Ukupni Trošak', `€ ${item.totalCost.toFixed(2)}`],
      ],
      theme: 'grid',
      headStyles: { fillColor: [52, 73, 94], textColor: 255 },
      margin: { left: margin + 10, right: pageWidth - titleBlockX + 10 },
    });

    const drawingsY = margin + 125;
    const drawingsX = margin + 10;
    const scale = 0.5;
    
    const L = item.dims.length * scale;
    const W = item.dims.width * scale;
    const H = item.dims.height * scale;

    const drawTitle = (text: string, x: number, y: number) => {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(text, x, y);
    }

    const drawDimension = (x1: number, y1: number, x2: number, y2: number, text: string, vertical = false) => {
        doc.setFontSize(8);
        doc.setLineWidth(0.1);
        doc.line(x1, y1, x2, y2);
        if (vertical) {
            doc.line(x1 - 2, y1, x1 + 2, y1);
            doc.line(x2 - 2, y2, x2 + 2, y2);
            doc.text(text, x1 - 4, (y1+y2)/2, {align: 'right', baseline: 'middle'});
        } else {
            doc.line(x1, y1 - 2, x1, y1 + 2);
            doc.line(x2, y2 - 2, x2, y2 + 2);
            doc.text(text, (x1+x2)/2, y1 - 3, {align: 'center'});
        }
    }
    
    const viewGap = L + 30;

    // Tlocrt
    let currentX = drawingsX;
    drawTitle('Tlocrt (pogled odozgo)', currentX, drawingsY);
    let viewY = drawingsY + 10;
    doc.setLineWidth(0.4);
    doc.setDrawColor(0);
    doc.rect(currentX, viewY, L, W);
    doc.setLineWidth(0.8);
    doc.setDrawColor(231, 76, 60);
    if (item.processedEdges.front) doc.line(currentX, viewY, currentX + L, viewY);
    if (item.processedEdges.back) doc.line(currentX, viewY + W, currentX + L, viewY + W);
    if (item.processedEdges.left) doc.line(currentX, viewY, currentX, viewY + W);
    if (item.processedEdges.right) doc.line(currentX + L, viewY, currentX + L, viewY + W);
    doc.setDrawColor(0);
    doc.setFont('helvetica', 'italic');
    doc.text(item.finish.name, currentX + L/2, viewY + W/2, { align: 'center', baseline: 'middle' });
    drawDimension(currentX, viewY - 8, currentX + L, viewY - 8, `${item.dims.length} cm`);
    drawDimension(currentX - 8, viewY, currentX - 8, viewY + W, `${item.dims.width} cm`, true);

    // Nacrt
    currentX += viewGap;
    drawTitle('Nacrt (pogled sprijeda)', currentX, drawingsY);
    viewY = drawingsY + 10;
    doc.setLineWidth(0.4);
    doc.rect(currentX, viewY, L, H);
    if (item.okapnikEdges.front || item.okapnikEdges.back) {
        doc.setLineDashPattern([2, 1], 0);
        const okapnikOffset = 1.0 * scale;
        doc.line(currentX + okapnikOffset, viewY + H, currentX + L - okapnikOffset, viewY + H);
        doc.setLineDashPattern([], 0);
    }
    drawDimension(currentX, viewY - 8, currentX + L, viewY - 8, `${item.dims.length} cm`);
    drawDimension(currentX - 8, viewY, currentX - 8, viewY + H, `${item.dims.height} cm`, true);
    
    // Bokocrt
    currentX += viewGap;
    drawTitle('Bokocrt (pogled s lijeva)', currentX, drawingsY);
    viewY = drawingsY + 10;
    doc.setLineWidth(0.4);
    doc.rect(currentX, viewY, W, H);
    if (item.okapnikEdges.left || item.okapnikEdges.right) {
        doc.setLineDashPattern([2, 1], 0);
        const okapnikOffset = 1.0 * scale;
        doc.line(currentX + okapnikOffset, viewY + H, currentX + W - okapnikOffset, viewY + H);
        doc.setLineDashPattern([], 0);
    }
    drawDimension(currentX, viewY - 8, currentX + W, viewY - 8, `${item.dims.width} cm`);
    drawDimension(currentX - 8, viewY, currentX - 8, viewY + H, `${item.dims.height} cm`, true);

  });

  return doc.output('dataurlstring');
};
