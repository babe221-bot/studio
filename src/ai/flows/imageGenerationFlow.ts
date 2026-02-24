'use server';
/**
 * @fileOverview An AI flow for generating technical drawings of stone slabs and storing them.
 *
 * - generateTechnicalDrawing - A function that handles the drawing generation process.
 */

import { createClient } from '@supabase/supabase-js';
import {
  TechnicalDrawingInput,
  TechnicalDrawingOutput,
} from '@/types';

// Initialize Supabase Storage
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);
const bucketName = 'drawings';

async function uploadToSupabase(dataUri: string): Promise<string> {
  try {
    const match = dataUri.match(/^data:(image\/png);base64,(.*)$/);
    if (!match) {
      throw new Error('Invalid data URI format.');
    }

    const contentType = match[1];
    const base64Data = match[2];
    const buffer = Buffer.from(base64Data, 'base64');

    const fileName = `technical-drawings/${Date.now()}-${Math.round(Math.random() * 1E9)}.png`;

    const { data: uploadData, error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, buffer, {
        contentType: contentType,
        upsert: false
      });

    if (error) {
      throw error;
    }

    // Get the public URL
    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName);

    return publicUrlData.publicUrl;

  } catch (error) {
    console.error('Failed to upload image to Supabase:', error);
    // Return an empty string if upload fails, so the app doesn't crash.
    return '';
  }
}

export async function generateTechnicalDrawing(input: TechnicalDrawingInput): Promise<TechnicalDrawingOutput> {
  try {
    // Call Python backend for CAD generation instead of Genkit
    const PYTHON_API_URL = process.env.NEXT_PUBLIC_PYTHON_API_URL || 'http://localhost:8000';

    const response = await fetch(`${PYTHON_API_URL}/api/cad/generate-drawing`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dimensions: {
          width: input.width,
          height: input.length || input.width, // Map length to height for the 2D plane
          thickness: 2, // arbitrary default thickness
        },
        material: input.surfaceFinishName || 'standard',
        style: input.isBunja ? 'bunja' : 'technical'
      }),
    });

    if (!response.ok) {
      throw new Error(`Python API error: ${response.statusText}`);
    }

    const result = await response.json();

    // In actual implementation, if Python returns a base64 Data URI, we can upload it:
    // const imageUrl = await uploadToSupabase(result.url);

    return {
      imageDataUri: result.url || '',
      imageUrl: result.url || ''
    };
  } catch (error) {
    console.error('Error generating drawing via Python API:', error);
    return { imageDataUri: '', imageUrl: '' };
  }
}

