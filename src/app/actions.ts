'use server';

import { Storage } from '@google-cloud/storage';

const storage = new Storage({
  projectId: 'stone-464500',
});
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
  } catch (error: any) {
    console.error('FULL GCS UPLOAD ERROR:', JSON.stringify(error, null, 2));
    let errorMessage = 'Failed to upload file.';
    if (error.code === 403) {
      errorMessage = 'Permission denied. Ensure the service account has "Storage Object Creator" role.';
    } else if (error.code === 404) {
      errorMessage = `Bucket "${bucketName}" not found.`;
    } else if (error.message && error.message.includes('Could not refresh access token')) {
      errorMessage = 'Authentication failed. Please ensure the service account has the "Service Account Token Creator" role in your Google Cloud project\'s IAM settings.';
    } else if (error.message) {
      errorMessage = `An error occurred: ${error.message}`;
    }
    return { success: false, error: errorMessage };
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
    console.error('FULL GCS LIST ERROR:', JSON.stringify(error, null, 2));
    let errorMessage = 'Failed to list files from storage.';
    if (error.code === 403) {
      errorMessage = 'Permission denied. Ensure the service account has "Storage Object Viewer" role.';
    } else if (error.code === 404) {
      errorMessage = `Bucket "${bucketName}" not found.`;
    } else if (error.message && error.message.includes('Could not refresh access token')) {
      errorMessage = 'Authentication failed. Please ensure the service account has the "Service Account Token Creator" role in your Google Cloud project\'s IAM settings.';
    } else if (error.message) {
      errorMessage = `An error occurred: ${error.message}`;
    }
    return { success: false, error: errorMessage };
  }
}
