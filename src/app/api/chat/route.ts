import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
    const { messages } = await req.json();

    const result = streamText({
        model: openai('gpt-4o-mini'),
        system: "Ti si profesionalni AI asistent za 'Upravljač Radova s Kamenom', aplikaciju za kamenoklesare. Pomažeš korisnicima oko tehničkih pitanja, vrsta materijala (mramor, granit, kvarc, itd.), obrade kamena, preporuka za dimenzije i sl. Odgovaraj isključivo na hrvatskom jeziku. Budi vrlo precizan, stručan i koncizan.",
        messages,
    });

    return result.toTextStreamResponse();
}
