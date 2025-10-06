// lib/cloudinary.js - SIMPLIFIED FOR IMAGE ONLY
import dotenv from "dotenv";
import { v2 as cloudinary } from "cloudinary";
dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// Upload bill image to Cloudinary
export const uploadBillImage = async (imageBuffer, orderNumber) => {
  return new Promise((resolve, reject) => {
    const publicId = `bill_${orderNumber}_${Date.now()}`;
    
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'image',
        folder: 'bills',
        public_id: publicId,
        format: 'png',
        type: 'upload',
        access_mode: 'public',
        use_filename: false,
        unique_filename: false,
        overwrite: true,
      },
      (error, result) => {
        if (error) {
          console.error('Error uploading bill image to Cloudinary:', error);
          return reject(new Error('Failed to upload bill image to Cloudinary'));
        }
        
        console.log('✅ Bill image uploaded to Cloudinary:', result.secure_url);
        resolve(result.secure_url);
      }
    );

    // Use streamifier to stream the buffer
    import('streamifier').then(streamifier => {
      streamifier.createReadStream(imageBuffer).pipe(uploadStream);
    });
  });
};

export default cloudinary;