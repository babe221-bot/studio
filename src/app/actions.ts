'use server';

import { Storage } from '@google-cloud/storage';

const storage = new Storage();
const bucketName = 'radninalog';

export async function uploadPdfToStorage(pdfBase64: string, fileName: string) {
  try {
    const buffer = Buffer.from(pdfBase64, 'base64');

    await storage.bucket(bucketName).file(fileName).save(buffer, {
      contentType: 'application/pdf',
      predefinedAcl: 'publicRead',
    });
    
    console.log(`${fileName} uploaded to ${bucketName}.`);
    return { success: true };
  } catch (error) {
    console.error('ERROR uploading file to GCS:', error);
    return { success: false, error: 'Failed to upload file.' };
  }
}

export async function listPdfsFromStorage() {
  try {
    const [files] = await storage.bucket(bucketName).getFiles();
    const pdfs = files
      .filter(file => file.name.toLowerCase().endsWith('.pdf'))
      .map(file => ({
        name: file.name,
        url: `https://storage.googleapis.com/${bucketName}/${file.name}`,
      }));
    return { success: true, pdfs };
  } catch (error: any) {
    console.error('ERROR listing files from GCS:', error);
    let errorMessage = 'Failed to list files from storage.';
    if (error.code === 403) {
      errorMessage = 'Permission denied. Ensure the service account has "Storage Object Viewer" role.';
    } else if (error.code === 404) {
      errorMessage = `Bucket "${bucketName}" not found.`;
    }
    return { success: false, error: errorMessage };
  }
}
