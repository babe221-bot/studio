
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
    
    let promptText = '';

    if (input.isBunja) {
        promptText = `A 2D texture representation of a pitched-face stone wall (Bunja). The stone blocks have a variable length and a height of ${input.width} cm. The edges are ${input.bunjaEdgeStyle === 'lomljene' ? 'hand-pitched and irregular' : 'saw-cut and sharp'}. The style should be a clean black and white line drawing on a white background. No 3D views, no dimensioning, just the texture pattern.`;
    } else {
        const promptParts = [
          'A professional 2D technical drawing of a rectangular stone slab, in the style of a clean, black and white CAD engineering blueprint.',
          'The drawing must consist of a single, clear orthographic top-down view (plan view).',
          `It must feature precise, clearly legible dimensioning. Draw clear dimension lines with arrows to label the overall length as '${input.length} cm' and the overall width as '${input.width} cm'.`,
        ];

        if (input.surfaceFinishName && input.surfaceFinishName !== 'Bez obrade') {
          promptParts.push(`The surface finish for the slab is "${input.surfaceFinishName}". This text must be annotated clearly in the center of the slab in a clean, uppercase, sans-serif font.`);
        }

        if (input.profileName && input.profileName !== 'Ravni rez (Pilan)') {
             promptParts.push(`The edge profile for all processed edges is "${input.profileName}".`);
        }

        if (input.processedEdges.length > 0) {
          const processedEdgesString = input.processedEdges.join(', ');
          promptParts.push(
            `The following edges are processed: ${processedEdgesString}. Indicate these processed edges on the drawing with a significantly thicker line weight (e.g., 2pt) compared to non-processed edges (e.g., 1pt).`
          );
        }

        if (input.okapnikEdges.length > 0) {
          const okapnikEdgesString = input.okapnikEdges.join(', ');
          promptParts.push(
            `The following edges have a drip edge (okapnik): ${okapnikEdgesString}. Indicate the drip edge on the drawing by using a dashed line placed just inside the main edge line on the specified edges.`
          );
        }

        promptParts.push(
            'The style must be clean black and white line art on a pure white background. Use standard drafting conventions and line weights.',
            'Crucially, there must be no isometric views, 3D perspectives, shadows, gradients, or any colors other than black and white. Do not include any logos or extraneous annotations. The output must be only the technical drawing itself.'
        );

        promptText = promptParts.join('\n');
    }


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
