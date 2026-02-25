'use server';
/**
 * @fileOverview AI flow for generating technical drawings of stone slabs and
 * persisting them to Supabase Storage.
 *
 * - generateTechnicalDrawing — calls the Python CAD backend, uploads the
 *   resulting SVG/PNG to the `drawings` bucket, and returns the public URL.
 */

import { createClient } from '@supabase/supabase-js';
import {
  TechnicalDrawingInput,
  TechnicalDrawingOutput,
} from '@/types';

// ── Supabase Storage client (server-side, service-role key) ─────────────────
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  '';
const supabase = createClient(supabaseUrl, supabaseKey);
const BUCKET = 'drawings';

// ── helpers ─────────────────────────────────────────────────────────────────

/**
 * Upload a base64 data URI (image/png or image/svg+xml) to Supabase Storage.
 * Returns the public URL, or an empty string if the upload fails.
 */
async function uploadToSupabase(dataUri: string): Promise<string> {
  try {
    // Support both PNG data URIs (from Python) and raw base64 SVG strings
    const match = dataUri.match(/^data:(image\/(?:png|svg\+xml));base64,(.*)$/);
    if (!match) {
      throw new Error(`Invalid data URI format — expected data:image/png or data:image/svg+xml. Got: ${dataUri.slice(0, 40)}…`);
    }

    const contentType = match[1];
    const ext = contentType === 'image/svg+xml' ? 'svg' : 'png';
    const base64Data = match[2];
    const buffer = Buffer.from(base64Data, 'base64');
    const fileName = `technical-drawings/${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(fileName, buffer, { contentType, upsert: false });

    if (error) throw error;

    const { data: publicUrlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(fileName);

    return publicUrlData.publicUrl;
  } catch (error) {
    console.error('Failed to upload drawing to Supabase Storage:', error);
    return '';
  }
}

/**
 * Encode a plain base64 string (SVG bytes from Python) into a data URI so it
 * can be passed to uploadToSupabase().
 */
function toSvgDataUri(base64: string): string {
  return `data:image/svg+xml;base64,${base64}`;
}

// ── main export ──────────────────────────────────────────────────────────────

export async function generateTechnicalDrawing(
  input: TechnicalDrawingInput,
): Promise<TechnicalDrawingOutput> {
  const PYTHON_API_URL =
    process.env.NEXT_PUBLIC_PYTHON_API_URL || 'http://localhost:8000';

  try {
    const response = await fetch(`${PYTHON_API_URL}/api/cad/generate-drawing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dims: {
          length: input.length || input.width,
          width: input.width,
          height: 2, // default slab thickness (cm)
        },
        material: { name: input.surfaceFinishName || 'standard' },
        finish: { name: input.surfaceFinishName || 'Bez obrade' },
        profile: { name: input.profileName || 'Ravni rez (Pilan)' },
        processedEdges: {
          front: input.processedEdges.includes('Prednja'),
          back: input.processedEdges.includes('Zadnja'),
          left: input.processedEdges.includes('Lijeva'),
          right: input.processedEdges.includes('Desna'),
        },
        okapnikEdges: {
          front: input.okapnikEdges.includes('Prednja'),
          back: input.okapnikEdges.includes('Zadnja'),
          left: input.okapnikEdges.includes('Lijeva'),
          right: input.okapnikEdges.includes('Desna'),
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Python API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();

    // Python returns { success, svg (base64 SVG), dxf_filename, data }
    // Upload the SVG to Supabase Storage and expose a stable public URL.
    let imageUrl = '';
    let imageDataUri = '';

    if (result.svg) {
      imageDataUri = toSvgDataUri(result.svg);
      imageUrl = await uploadToSupabase(imageDataUri);
    }

    return { imageDataUri, imageUrl };
  } catch (error) {
    console.error('Error generating drawing via Python API:', error);
    return { imageDataUri: '', imageUrl: '' };
  }
}
