'use server';

import { Storage } from '@google-cloud/storage';

const storage = new Storage();
const bucketName = 'radninalog';

export async function uploadPdfToStorage(pdfBase64: string, fileName: string) {
  try {
    const buffer = Buffer.from(pdfBase64, 'base64');

    await storage.bucket(bucketName).file(fileName).save(buffer, {
      contentType: 'application/pdf',
      predefinedAcl: 'publicRead', // Optional: makes the file publicly readable
    });
    
    console.log(`${fileName} uploaded to ${bucketName}.`);
    return { success: true };
  } catch (error) {
    console.error('ERROR uploading file to GCS:', error);
    return { success: false, error: 'Failed to upload file.' };
  }
}
