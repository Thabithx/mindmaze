import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'pnpzpofa',
  api_key: process.env.CLOUDINARY_API_KEY || '926686436265684',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'RcDLNVypyU_z12ni0QWR8IUpMCM',
});

export default cloudinary;
