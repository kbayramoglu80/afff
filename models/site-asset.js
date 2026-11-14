import mongoose from "mongoose";

const siteAssetSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, maxlength: 700 },
  imageData: { type: String, required: true, maxlength: 2800000 },
  contentType: { type: String, required: true, enum: ["image/jpeg", "image/png", "image/webp"] },
}, { timestamps: true });

export const SiteAsset = mongoose.models.SiteAsset || mongoose.model("SiteAsset", siteAssetSchema);
