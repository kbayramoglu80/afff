import mongoose from "mongoose";

const treatmentPageSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, trim: true },
  slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
  order: { type: Number, required: true, default: 0 },
  titleTr: { type: String, required: true, maxlength: 160, trim: true },
  titleEn: { type: String, default: "", maxlength: 160, trim: true },
  summaryTr: { type: String, required: true, maxlength: 500, trim: true },
  summaryEn: { type: String, default: "", maxlength: 500, trim: true },
  contentTr: { type: String, required: true, maxlength: 20000, trim: true },
  contentEn: { type: String, default: "", maxlength: 20000, trim: true },
}, { timestamps: true });

export const TreatmentPage = mongoose.models.TreatmentPage || mongoose.model("TreatmentPage", treatmentPageSchema);
