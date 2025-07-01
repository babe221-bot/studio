import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { OrderItem } from '@/types';

// NOTE: This version uses standard jsPDF fonts to ensure stability.
// Support for special characters like č,ć,š may be limited in the final PDF.
export const generatePdfAsDataUri = (orderItems: OrderItem[]): string => {
  try {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;

    const setFont = (style: 'bold' | 'normal', size: number) => {
      // Using standard, built-in Helvetica font to avoid encoding errors
      doc.setFont('Helvetica', style);
      doc.setFontSize(size);
    };

    orderItems.forEach((item, index) => {
      if (index > 0) {
        doc.addPage();
      }

      // --- Page Border ---
      doc.setLineWidth(0.2);
      doc.setDrawColor(180);
      doc.rect(margin, margin, pageWidth - margin * 2, pageHeight - margin * 2);

      // --- Header ---
      setFont('bold', 24);
      doc.text('TEHNICKA SPECIFIKACIJA', margin + 10, margin + 15);
      
      setFont('normal', 12);
      doc.text(`ID Komada: ${item.id}`, margin + 10, margin + 25);
      
      // --- Info Block ---
      const titleBlockX = pageWidth - margin - 120;
      const titleBlockY = margin;
      doc.rect(titleBlockX, titleBlockY, 120, 30);
      setFont('normal', 10);
      doc.text('Klijent: _________________', titleBlockX + 5, titleBlockY + 8);
      doc.text('Projekt: _________________', titleBlockX + 5, titleBlockY + 16);
      doc.text(`Datum: ${new Date().toLocaleDateString('hr-HR')}`, titleBlockX + 5, titleBlockY + 24);

      // --- 3D Snapshot Image ---
      if (item.snapshotDataUri) {
        try {
          const imgWidth = 100;
          const imgHeight = 75;
          doc.addImage(item.snapshotDataUri, 'PNG', titleBlockX, margin + 40, imgWidth, imgHeight);
        } catch(e) {
            console.error("Failed to add image to PDF", e);
            setFont('normal', 9);
            doc.text("Greska pri dodavanju 3D slike.", titleBlockX, margin + 40);
        }
      }
      
      // --- Specifications Table ---
      const processedEdgesString = Object.entries(item.processedEdges)
        .filter(([, v]) => v)
        .map(([k]) => k.charAt(0).toUpperCase() + k.slice(1))
        .join(', ') || 'Nema';

      const okapnikEdgesString = Object.entries(item.okapnikEdges || {})
        .filter(([, v]) => v)
        .map(([k]) => k.charAt(0).toUpperCase() + k.slice(1))
        .join(', ') || 'Nema';

      autoTable(doc, {
        startY: margin + 35,
        head: [['Specifikacija', 'Vrijednost']],
        body: [
          ['Materijal', item.material.name],
          ['Obrada lica', item.finish.name],
          ['Profil ivice', item.profile.name],
          ['Dimenzije (DxSXV)', `${item.dims.length} x ${item.dims.width} x ${item.dims.height} cm`],
          ['Obrada ivica', processedEdgesString],
          ['Okapnik', okapnikEdgesString],
          ['Ukupni Trosak', `€ ${item.totalCost.toFixed(2)}`],
        ],
        theme: 'grid',
        headStyles: { fillColor: [52, 73, 94], textColor: 255, font: 'Helvetica', fontStyle: 'bold' },
        bodyStyles: { font: 'Helvetica', fontStyle: 'normal' },
        margin: { left: margin + 10 },
        tableWidth: pageWidth - (margin * 2) - 140, 
      });

      // --- Technical Drawings ---
      const drawingsY = margin + 130;
      const drawingsX = margin + 10;
      const scale = 0.5; 
      
      const L = Math.max(0, item.dims.length * scale);
      const W = Math.max(0, item.dims.width * scale);
      const H = Math.max(0, item.dims.height * scale);

      const drawTitle = (text: string, x: number, y: number) => {
          setFont('bold', 12);
          doc.text(text, x, y);
      }

      const drawDimension = (x1: number, y1: number, x2: number, y2: number, text: string, vertical = false) => {
          setFont('normal', 8);
          doc.setLineWidth(0.1);
          doc.setDrawColor(0);
          doc.line(x1, y1, x2, y2); // dimension line
          if (vertical) {
              doc.line(x1 - 2, y1, x1 + 2, y1);
              doc.line(x2 - 2, y2, x2 + 2, y2);
              doc.text(text, x1 - 4, y1 + (y2-y1)/2, {align: 'right', baseline: 'middle'});
          } else {
              doc.line(x1, y1 - 2, x1, y1 + 2);
              doc.line(x2, y2 - 2, x2, y2 + 2);
              doc.text(text, x1 + (x2-x1)/2, y1 - 3, {align: 'center'});
          }
      }
      
      const VIEW_WIDTH = 120;
      const VIEW_HEIGHT = 100;

      // --- Tlocrt (Top View) ---
      let currentX = drawingsX;
      drawTitle('Tlocrt (pogled odozgo)', currentX, drawingsY);
      let viewOriginX = currentX + (VIEW_WIDTH - L) / 2;
      let viewOriginY = drawingsY + 10 + (VIEW_HEIGHT - W) / 2;

      doc.setLineWidth(0.4);
      doc.setDrawColor(0);
      if (L > 0 && W > 0) doc.rect(viewOriginX, viewOriginY, L, W);
      
      doc.setLineWidth(0.8);
      doc.setDrawColor(231, 76, 60);
      if (item.processedEdges.front) doc.line(viewOriginX, viewOriginY + W, viewOriginX + L, viewOriginY + W);
      if (item.processedEdges.back) doc.line(viewOriginX, viewOriginY, viewOriginX + L, viewOriginY);
      if (item.processedEdges.left) doc.line(viewOriginX, viewOriginY, viewOriginX, viewOriginY + W);
      if (item.processedEdges.right) doc.line(viewOriginX + L, viewOriginY, viewOriginX + L, viewOriginY + W);
      
      doc.setDrawColor(0);
      setFont('normal', 9);
      if(L > 0 && W > 0) doc.text(item.finish.name, viewOriginX + L/2, viewOriginY + W/2, { align: 'center', baseline: 'middle' });
      
      if (L > 0) drawDimension(viewOriginX, viewOriginY - 8, viewOriginX + L, viewOriginY - 8, `${item.dims.length} cm`);
      if (W > 0) drawDimension(viewOriginX - 8, viewOriginY, viewOriginX - 8, viewOriginY + W, `${item.dims.width} cm`, true);

      // --- Nacrt (Front View) ---
      currentX += VIEW_WIDTH + 10;
      drawTitle('Nacrt (pogled sprijeda)', currentX, drawingsY);
      viewOriginX = currentX + (VIEW_WIDTH - L) / 2;
      viewOriginY = drawingsY + 10 + (VIEW_HEIGHT - H) / 2;

      doc.setLineWidth(0.4);
      doc.setDrawColor(0);
      if (L > 0 && H > 0) doc.rect(viewOriginX, viewOriginY, L, H);

      if (item.okapnikEdges.front) {
          doc.setLineDashPattern([2, 1], 0);
          const okapnikOffset = 2.0 * scale;
          if (L > okapnikOffset * 2) {
            doc.line(viewOriginX + okapnikOffset, viewOriginY + H, viewOriginX + L - okapnikOffset, viewOriginY + H);
          }
          doc.setLineDashPattern([], 0);
      }
      if (L > 0) drawDimension(viewOriginX, viewOriginY - 8, viewOriginX + L, viewOriginY - 8, `${item.dims.length} cm`);
      if (H > 0) drawDimension(viewOriginX - 8, viewOriginY, viewOriginX - 8, viewOriginY + H, `${item.dims.height} cm`, true);
      
      // --- Bokocrt (Side View) ---
      currentX += VIEW_WIDTH + 10;
      drawTitle('Bokocrt (pogled s lijeva)', currentX, drawingsY);
      viewOriginX = currentX + (VIEW_WIDTH - W) / 2;
      viewOriginY = drawingsY + 10 + (VIEW_HEIGHT - H) / 2;
      
      doc.setLineWidth(0.4);
      doc.setDrawColor(0);
      if (W > 0 && H > 0) doc.rect(viewOriginX, viewOriginY, W, H);
      
      if (item.okapnikEdges.left) {
          doc.setLineDashPattern([2, 1], 0);
          const okapnikOffset = 2.0 * scale;
          if (W > okapnikOffset * 2) {
            doc.line(viewOriginX + okapnikOffset, viewOriginY + H, viewOriginX + W - okapnikOffset, viewOriginY + H);
          }
          doc.setLineDashPattern([], 0);
      }
      if (W > 0) drawDimension(viewOriginX, viewOriginY - 8, viewOriginX + W, viewOriginY - 8, `${item.dims.width} cm`);
      if (H > 0) drawDimension(viewOriginX - 8, viewOriginY, viewOriginX - 8, viewOriginY + H, `${item.dims.height} cm`, true);
    });

    return doc.output('dataurlstring');

  } catch (error) {
    console.error("Critical error during PDF generation:", error);
    return "";
  }
};
