'use server';
/**
 * @fileOverview A Genkit flow for creating a Google Doc from work order items.
 *
 * - createDocumentFlow - The main flow to generate the document.
 */
import { z } from 'genkit';
import { ai } from '@/ai/genkit';
import { google } from 'googleapis';

const OrderItemSchema = z.object({
  orderId: z.number(),
  id: z.string(),
  dims: z.object({
    length: z.number(),
    width: z.number(),
    height: z.number(),
  }),
  material: z.object({
    id: z.number(),
    name: z.string(),
    density: z.number(),
    cost_sqm: z.number(),
    texture: z.string(),
    color: z.string(),
  }),
  finish: z.object({
    id: z.number(),
    name: z.string(),
    cost_sqm: z.number(),
  }),
  profile: z.object({
    id: z.number(),
    name: z.string(),
    cost_m: z.number(),
  }),
  processedEdges: z.object({
    front: z.boolean(),
    back: z.boolean(),
    left: z.boolean(),
    right: z.boolean(),
  }),
  okapnikEdges: z.object({
    front: z.boolean(),
    back: z.boolean(),
    left: z.boolean(),
    right: z.boolean(),
  }),
  totalCost: z.number(),
});

const CreateDocumentInputSchema = z.array(OrderItemSchema);

// Using any for requests to avoid excessive type complexity for Google API
const insertText = (text: string, props?: { bold?: boolean; fontSize?: number }) => {
    const textStyle: any = {
        foregroundColor: {
            color: {
                rgbColor: { red: 0, green: 0, blue: 0 }
            }
        },
    };
    if (props?.fontSize) {
        textStyle.weightedFontFamily = { fontFamily: 'Roboto' };
        textStyle.fontSize = { magnitude: props.fontSize, unit: 'PT' };
    }
    if (props?.bold) {
        textStyle.bold = true;
    }
    return {
      insertText: {
        location: { index: 1 },
        text: text,
      },
      updateTextStyle: {
          range: { startIndex: 1, endIndex: text.length },
          textStyle: textStyle,
          fields: '*',
      }
    };
  };
  
const insertTable = (rows: number, columns: number) => {
    return {
      insertTable: {
        location: { index: 1 },
        rows,
        columns,
      },
    };
};
  
const insertPageBreak = () => ({
      insertPageBreak: {
          location: { index: 1 }
      }
});

export const createDocumentFlow = ai.defineFlow(
  {
    name: 'createDocumentFlow',
    inputSchema: CreateDocumentInputSchema,
    outputSchema: z.object({ documentId: z.string() }),
  },
  async (orderItems) => {
    const auth = await google.auth.getClient({
      scopes: ['https://www.googleapis.com/auth/documents'],
    });

    const docs = google.docs({ version: 'v1', auth });

    const docTitle = `Radni Nalog - ${new Date().toLocaleDateString('hr-HR')}`;
    const createResponse = await docs.documents.create({
      requestBody: { title: docTitle },
    });

    const documentId = createResponse.data.documentId;
    if (!documentId) throw new Error('Failed to create Google Doc.');

    let requests: any[] = [];
    
    // Reverse items to insert them from bottom to top, as required by the API
    const reversedItems = [...orderItems].reverse();

    reversedItems.forEach((item, index) => {
        if (index > 0) {
            requests.push(insertPageBreak());
        }

        const processedEdgesString = Object.entries(item.processedEdges)
            .filter(([, v]) => v)
            .map(([k]) => k.charAt(0).toUpperCase() + k.slice(1))
            .join(', ') || 'Nema';
        
        const okapnikEdgesString = Object.entries(item.okapnikEdges || {})
            .filter(([, v]) => v)
            .map(([k]) => k.charAt(0).toUpperCase() + k.slice(1))
            .join(', ') || 'Nema';

        const tableRows = [
            ['Materijal', item.material.name],
            ['Obrada lica', item.finish.name],
            ['Profil ivice', item.profile.name],
            ['Dimenzije (DxŠxV)', `${item.dims.length} x ${item.dims.width} x ${item.dims.height} cm`],
            ['Obrada ivica', processedEdgesString],
            ['Okapnik', okapnikEdgesString],
            ['Ukupni Trošak', `€ ${item.totalCost.toFixed(2)}`],
        ];
        
        // This is a simplified way to insert text into a table.
        // It inserts the whole table content as a single text block,
        // with tabs separating columns and newlines separating rows.
        const tableContentString = tableRows.map(row => row.join('\t')).join('\n') + '\n';

        requests.push({ insertText: { location: { index: 1 }, text: tableContentString }});
        requests.push(insertTable(tableRows.length, 2));

        // Add headers for the item
        requests.push(insertText(`\n`)); // Spacing
        requests.push(insertText(`ID Komada: ${item.id}\n`, { fontSize: 14 }));
        requests.push(insertText(`TEHNIČKA SPECIFIKACIJA\n`, { fontSize: 18, bold: true }));
    });
    
    requests.push(insertText(`${docTitle}\n`, { fontSize: 24, bold: true }));

    if (requests.length > 0) {
        await docs.documents.batchUpdate({
            documentId,
            requestBody: { requests },
        });
    }

    return { documentId };
  }
);
