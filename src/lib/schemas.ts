import { z } from 'zod';

export const TechnicalDrawingInputSchema = z.object({
    length: z.number().describe('The length of the slab in cm.'),
    width: z.number().describe('The width of the slab in cm.'),
    profileName: z.string().describe('The name of the edge profile.'),
    surfaceFinishName: z.string().describe('The name of the surface finish.'),
    processedEdges: z.array(z.string()).describe('A list of edges to be processed (e.g., "Prednja", "Lijeva").'),
    okapnikEdges: z.array(z.string()).describe('A list of edges with a drip edge (okapnik).'),
    bunjaEdgeStyle: z.optional(z.enum(['oštre', 'lomljene'])).describe('The edge style for Bunja stone, if applicable.'),
    isBunja: z.boolean().describe('A flag indicating if the item is Bunja stone, requiring a different drawing style.'),
});

export type TechnicalDrawingInput = z.infer<typeof TechnicalDrawingInputSchema>;

export const TechnicalDrawingOutputSchema = z.object({
    imageDataUri: z.string().describe("The generated technical drawing as a data URI. Expected format: 'data:image/png;base64,<encoded_data>'."),
    imageUrl: z.string().describe("The public URL of the generated drawing stored in Supabase Storage."),
});

export type TechnicalDrawingOutput = z.infer<typeof TechnicalDrawingOutputSchema>;
