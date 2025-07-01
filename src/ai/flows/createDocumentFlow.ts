'use server';
/**
 * @fileOverview A Genkit flow for creating a Google Doc from work order items.
 *
 * - createDocumentFlow - The main flow to generate the document.
 */
import { z } from 'genkit';
import { ai } from '@/ai/genkit';
import { GoogleAuth } from 'google-auth-library';
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

export const createDocumentFlow = ai.defineFlow(
  {
    name: 'createDocumentFlow',
    inputSchema: CreateDocumentInputSchema,
    outputSchema: z.object({ documentId: z.string() }),
  },
  async (orderItems) => {
    // Use GoogleAuth explicitly to get a token.
    // This can sometimes resolve environment-specific issues.
    const auth = new GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/documents'],
    });

    const client = await auth.getClient();
    const docs = google.docs({ version: 'v1', auth: client });

    const docTitle = `Radni Nalog - ${new Date().toLocaleDateString('hr-HR')}`;
    
    const createResponse = await docs.documents.create({
      requestBody: { title: docTitle },
    });

    const documentId = createResponse.data.documentId;
    if (!documentId) throw new Error('Failed to create Google Doc.');

    let requests: any[] = [];
    
    // Build content as a single string to ensure reliability
    let fullTextContent = '';
    orderItems.forEach((item, index) => {
      const processedEdgesString = Object.entries(item.processedEdges)
            .filter(([, v]) => v)
            .map(([k]) => k.charAt(0).toUpperCase() + k.slice(1))
            .join(', ') || 'Nema';
        
      const okapnikEdgesString = Object.entries(item.okapnikEdges || {})
            .filter(([, v]) => v)
            .map(([k]) => k.charAt(0).toUpperCase() + k.slice(1))
            .join(', ') || 'Nema';

      fullTextContent += `\n\nStavka ${index + 1}: ${item.id}\n`;
      fullTextContent += `---------------------------------\n`;
      fullTextContent += `Materijal: ${item.material.name}\n`;
      fullTextContent += `Dimenzije (DxŠxV): ${item.dims.length} x ${item.dims.width} x ${item.dims.height} cm\n`;
      fullTextContent += `Obrada lica: ${item.finish.name}\n`;
      fullTextContent += `Profil ivice: ${item.profile.name}\n`;
      fullTextContent += `Obrada ivica: ${processedEdgesString}\n`;
      fullTextContent += `Okapnik: ${okapnikEdgesString}\n`;
      fullTextContent += `Ukupni Trošak: € ${item.totalCost.toFixed(2)}\n`;
    });

    // A single request to insert the title and the content
    requests.push({
      insertText: {
        location: { index: 1 },
        text: `${docTitle}\n${fullTextContent}`,
      },
    });
    
    // Style the title as a heading
    requests.push({
        updateTextStyle: {
            range: { startIndex: 1, endIndex: docTitle.length + 1 },
            textStyle: {
                bold: true,
                fontSize: { magnitude: 18, unit: 'PT' },
            },
            fields: 'bold,fontSize',
        }
    });

    if (requests.length > 0) {
      await docs.documents.batchUpdate({
        documentId,
        requestBody: { requests },
      });
    }

    return { documentId };
  }
);
