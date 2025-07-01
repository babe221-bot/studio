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

const drawingPrompt = ai.definePrompt({
    name: 'technicalDrawingPrompt',
    input: { schema: TechnicalDrawingInputSchema },
    prompt: `
      Create a very clean, minimalist, black and white technical line drawing of a rectangular stone slab.
      The drawing must be a simple orthographic top-down view (plan view).
      The background must be pure white. The lines must be black.

      The dimensions of the slab are {{length}} cm (length) by {{width}} cm (width).
      Draw dimension lines and clearly label the length and width with these values.

      The edge profile for this slab is "{{profileName}}".

      The following edges are processed: {{#each processedEdges}}{{{this}}}{{#unless @last}}, {{/unless}}{{else}}Nema{{/each}}.
      Indicate the processed edges on the drawing with a slightly thicker line weight compared to the non-processed edges.

      The following edges have a drip edge (okapnik): {{#each okapnikEdges}}{{{this}}}{{#unless @last}}, {{/unless}}{{else}}Nema{{/each}}.
      Indicate the drip edge on the drawing using a dashed line just inside the main edge line.

      Do not add any other text, logos, or annotations. The output must be only the technical drawing itself.
    `,
});


const technicalDrawingFlow = ai.defineFlow(
  {
    name: 'technicalDrawingFlow',
    inputSchema: TechnicalDrawingInputSchema,
    outputSchema: TechnicalDrawingOutputSchema,
  },
  async (input) => {
    const { media } = await ai.generate({
      model: 'googleai/gemini-2.0-flash-preview-image-generation',
      prompt: (await drawingPrompt(input)).prompt,
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
