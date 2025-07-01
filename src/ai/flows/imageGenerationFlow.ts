'use server';
/**
 * @fileOverview An AI flow for generating technical drawings of stone slabs.
 *
 * - generateTechnicalDrawing - A function that handles the drawing generation process.
 */

import { ai } from '@/ai/genkit';
import { 
  TechnicalDrawingInput, 
  TechnicalDrawingOutput, 
  TechnicalDrawingInputSchema, 
  TechnicalDrawingOutputSchema
} from '@/types';


export async function generateTechnicalDrawing(input: TechnicalDrawingInput): Promise<TechnicalDrawingOutput> {
  return await technicalDrawingFlow(input);
}

const technicalDrawingFlow = ai.defineFlow(
  {
    name: 'technicalDrawingFlow',
    inputSchema: TechnicalDrawingInputSchema,
    outputSchema: TechnicalDrawingOutputSchema,
  },
  async (input) => {
    
    const promptParts = [
      'Create a very clean, minimalist, black and white technical line drawing of a rectangular stone slab, in the style of a CAD drawing.',
      'The drawing must be a simple orthographic top-down view (plan view).',
      'The background must be pure white. The lines must be black.',
      'Do not add any perspective, shadows, or gradients. The output should be only the 2D drawing.',
      `The dimensions of the slab are ${input.length} cm (length) by ${input.width} cm (width).`,
      'Draw clear dimension lines with arrows and label the length and width with their respective values.',
      `The surface finish for this slab is "${input.surfaceFinishName}". Add this text centered on the slab drawing in a clean, uppercase, sans-serif font.`,
      `The edge profile for this slab is "${input.profileName}".`
    ];

    if (input.processedEdges.length > 0) {
      const processedEdgesString = input.processedEdges.join(', ');
      promptParts.push(
        `The following edges are processed: ${processedEdgesString}.`,
        'Indicate the processed edges on the drawing with a slightly thicker line weight (e.g., 2pt) compared to the non-processed edges (e.g., 1pt).'
      );
    }

    if (input.okapnikEdges.length > 0) {
      const okapnikEdgesString = input.okapnikEdges.join(', ');
      promptParts.push(
        `The following edges have a drip edge (okapnik): ${okapnikEdgesString}.`,
        'Indicate the drip edge on the drawing using a dashed line placed just inside the main edge line on the specified edges.'
      );
    }

    promptParts.push('Do not add any other text, logos, or annotations. The output must be only the technical drawing itself on a white background.');

    const promptText = promptParts.join('\n');

    const { media } = await ai.generate({
      model: 'googleai/gemini-2.0-flash-preview-image-generation',
      prompt: promptText,
      config: {
          responseModalities: ['TEXT', 'IMAGE'],
      }
    });

    if (!media?.url) {
        throw new Error('Image generation failed to return an image.');
    }

    return { imageDataUri: media.url };
  }
);
