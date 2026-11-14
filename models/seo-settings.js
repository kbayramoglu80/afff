import mongoose from "mongoose";

const seoSettingsSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, default: "home" },
  titleTr: { type: String, required: true, maxlength: 160, trim: true },
  titleEn: { type: String, default: "", maxlength: 160, trim: true },
  descriptionTr: { type: String, required: true, maxlength: 500, trim: true },
  descriptionEn: { type: String, default: "", maxlength: 500, trim: true },
}, { timestamps: true });

export const SeoSettings = mongoose.models.SeoSettings || mongoose.model("SeoSettings", seoSettingsSchema);
