import mongoose from "mongoose";

const siteContentSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, maxlength: 700 },
  type: { type: String, required: true, enum: ["text", "attribute"] },
  attribute: { type: String, default: null, maxlength: 20 },
  valueTr: { type: String, default: "", maxlength: 10000 },
  valueEn: { type: String, default: "", maxlength: 10000 },
}, { timestamps: true });

export const SiteContent = mongoose.models.SiteContent || mongoose.model("SiteContent", siteContentSchema);
