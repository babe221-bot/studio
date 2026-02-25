import { openai } from '@ai-sdk/openai';
import { generateText, APICallError } from 'ai';
import type { CADAIRequest, CADAIResponse } from '@/types';

// Allow responses up to 60 seconds for complex CAD operations
export const maxDuration = 60;

/**
 * AI-powered CAD operations endpoint.
 * Communicates with the Python backend for geometry analysis, constraint solving, etc.
 */
export async function POST(req: Request) {
    try {
        const body: CADAIRequest = await req.json();
        const { operation, payload } = body;

        // Forward to Python backend for heavy CAD processing
        const PYTHON_API_URL = process.env.NEXT_PUBLIC_PYTHON_API_URL || 'http://localhost:8000';

        // For CAD-specific AI operations, we use Python backend
        if (operation === 'analyze_geometry' || operation === 'optimize_layout') {
            const pythonResponse = await fetch(`${PYTHON_API_URL}/api/cad/ai/${operation}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!pythonResponse.ok) {
                throw new Error(`Python API error: ${pythonResponse.status}`);
            }

            const result = await pythonResponse.json();
            return Response.json({ success: true, result } as CADAIResponse);
        }

        // For suggestion-based operations, use OpenAI
        if (operation === 'suggest_dimensions' || operation === 'check_constraints') {
            const prompt = buildCADPrompt(operation, payload);

            const { text } = await generateText({
                model: openai('gpt-4o'),
                prompt,
                system: `Ti si CAD asistent specijaliziran za kamene ploče. Pomažeš korisnicima s dimenzijama, ograničenjima i tehničkim preporukama. Odgovaraj na hrvatskom jeziku u JSON formatu.`,
            });

            try {
                const parsed = JSON.parse(text);
                return Response.json({ success: true, result: parsed } as CADAIResponse);
            } catch {
                return Response.json({
                    success: true,
                    result: { suggestions: [{ description: text, confidence: 0.8 }] }
                } as CADAIResponse);
            }
        }

        return Response.json({
            success: false,
            error: `Unknown operation: ${operation}`
        } as CADAIResponse, { status: 400 });

    } catch (error) {
        console.error('CAD AI API error:', error);

        if (error instanceof APICallError) {
            if (error.statusCode === 429) {
                return Response.json({
                    success: false,
                    error: 'AI service rate limit exceeded'
                } as CADAIResponse, { status: 429 });
            }
        }

        return Response.json({
            success: false,
            error: 'An error occurred processing the CAD request'
        } as CADAIResponse, { status: 500 });
    }
}

/**
 * Build a prompt for CAD-specific AI operations.
 */
function buildCADPrompt(operation: string, payload: CADAIRequest['payload']): string {
    const dims = payload.dimensions
        ? `${payload.dimensions.length}×${payload.dimensions.width}×${payload.dimensions.height} cm`
        : 'nije specificirano';

    const material = payload.material || 'nije specificiran';

    switch (operation) {
        case 'suggest_dimensions':
            return `Predloži optimalne dimenzije za kamenu ploču.
Trenutne dimenzije: ${dims}
Materijal: ${material}
Ograničenja: ${JSON.stringify(payload.constraints || [])}

Odgovori u JSON formatu:
{
  "suggestions": [
    { "description": "opis prijedloga", "confidence": 0.0-1.0, "dimensions": { "length": 0, "width": 0, "height": 0 } }
  ]
}`;

        case 'check_constraints':
            return `Provjeri tehnička ograničenja za kamenu ploču.
Dimenzije: ${dims}
Materijal: ${material}
Ograničenja: ${JSON.stringify(payload.constraints || [])}

Odgovori u JSON formatu:
{
  "issues": [
    { "severity": "warning" | "error", "message": "opis problema" }
  ]
}`;

        default:
            return `Operacija: ${operation}
Podaci: ${JSON.stringify(payload)}`;
    }
}
