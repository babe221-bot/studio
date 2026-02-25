import { openai } from '@ai-sdk/openai';
import { streamText, APICallError } from 'ai';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

// Rate limiting: simple in-memory store (for production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 20; // 20 requests per minute

function checkRateLimit(ip: string): boolean {
    const now = Date.now();
    const entry = rateLimitStore.get(ip);

    if (!entry || now > entry.resetTime) {
        rateLimitStore.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
        return true;
    }

    if (entry.count >= RATE_LIMIT_MAX) {
        return false;
    }

    entry.count++;
    return true;
}

export async function POST(req: Request) {
    try {
        // Rate limiting
        const ip = req.headers.get('x-forwarded-for') || 'unknown';
        if (!checkRateLimit(ip)) {
            return new Response(
                JSON.stringify({ error: 'Too many requests. Please try again later.' }),
                { status: 429, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const { messages, cadContext } = await req.json();

        // Build system prompt with optional CAD context
        let systemPrompt = `Ti si profesionalni AI asistent za 'Upravljač Radova s Kamenom', aplikaciju za kamenoklesare. Pomažeš korisnicima oko tehničkih pitanja, vrsta materijala (mramor, granit, kvarc, itd.), obrade kamena, preporuka za dimenzije i sl. Odgovaraj isključivo na hrvatskom jeziku. Budi vrlo precizan, stručan i koncizan.`;

        if (cadContext) {
            systemPrompt += `\n\nTrenutni kontekst CAD projekta:\n${cadContext}`;
        }

        const result = streamText({
            model: openai('gpt-4o'),
            system: systemPrompt,
            messages,
        });

        return result.toTextStreamResponse();
    } catch (error) {
        console.error('Chat API error:', error);

        if (error instanceof APICallError) {
            if (error.statusCode === 429) {
                return new Response(
                    JSON.stringify({ error: 'AI service rate limit exceeded. Please try again later.' }),
                    { status: 429, headers: { 'Content-Type': 'application/json' } }
                );
            }
        }

        return new Response(
            JSON.stringify({ error: 'An error occurred processing your request.' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
