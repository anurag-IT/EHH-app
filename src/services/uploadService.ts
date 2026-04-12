import cloudinary from '../config/cloudinary.js';

/**
 * Uploads a buffer to Cloudinary using a stream.
 * Includes a 2-stage retry mechanism for network resilience.
 */
export const uploadImage = async (fileBuffer: Buffer, retries = 2): Promise<{secure_url: string, public_id: string}> => {
  try {
    return await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { 
          folder: 'ehh_app',
          // REQUIREMENT: Optimize at source
          transformation: [
            { width: 1080, crop: "limit" },
            { quality: "auto", fetch_format: "auto" }
          ]
        },
        (error, result) => {
          if (error) return reject(error);
          if (!result) return reject(new Error('Cloudinary upload failed'));
          
          console.log(`[CLOUDINARY] Upload successful: ${result.public_id}`);
          resolve({
            secure_url: result.secure_url,
            public_id: result.public_id
          });
        }
      );
      uploadStream.end(fileBuffer);
    });
  } catch (error) {
    if (retries > 0) {
      console.warn(`[CLOUDINARY] Upload attempt failed. Retrying... (${retries} left)`);
      return uploadImage(fileBuffer, retries - 1);
    }
    console.error("[CLOUDINARY] All upload attempts failed:", error);
    throw error;
  }
};
