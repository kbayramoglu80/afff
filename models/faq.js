import mongoose from "mongoose";

const faqSchema = new mongoose.Schema({
  question: { type: String, required: true, maxlength: 200, trim: true },
  answer: { type: String, required: true, maxlength: 10000, trim: true },
}, { timestamps: true });

faqSchema.index({ createdAt: 1 });

export const Faq = mongoose.models.Faq || mongoose.model("Faq", faqSchema);
