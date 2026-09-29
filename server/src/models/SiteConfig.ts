import mongoose, { Schema, Document } from 'mongoose';

export interface ISiteConfig extends Document {
  key: string;
  value: string;
  updatedAt: Date;
}

const SiteConfigSchema = new Schema<ISiteConfig>(
  {
    key: { type: String, required: true, unique: true, trim: true },
    value: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

export default mongoose.model<ISiteConfig>('SiteConfig', SiteConfigSchema);
