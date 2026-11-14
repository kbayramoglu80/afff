import { randomBytes, timingSafeEqual } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import connectMongo from "connect-mongo";
import dotenv from "dotenv";
import express from "express";
import { rateLimit } from "express-rate-limit";
import session from "express-session";
import helmet from "helmet";
import mongoose from "mongoose";
import { Admin } from "./models/admin.js";
import { BlogPost } from "./models/blog-post.js";
import { ContactSubmission } from "./models/contact-submission.js";
import { Faq } from "./models/faq.js";
import { SiteAsset } from "./models/site-asset.js";
import { SiteContent } from "./models/site-content.js";
import { SeoSettings } from "./models/seo-settings.js";
import { TreatmentPage } from "./models/treatment-page.js";
import { validatePost } from "./lib/blog.js";
import { validateContactSubmission } from "./lib/contact.js";
import { validateFaq } from "./lib/faq.js";
import { validateSiteAsset, validateSiteContentBatch } from "./lib/site-content.js";
import { buildSitemapXml, escapeHtml, renderParagraphs, renderReferences, validateSeoSettings } from "./lib/seo.js";
import { treatmentPages } from "./lib/treatment-seeds.js";
import { validateTreatmentPage } from "./lib/treatment.js";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SESSION_COOKIE = "doctor_site_session";
const DEFAULT_SITE_URL = "https://mesutkariksiz.com.tr";
const DEFAULT_GA4_ID = "G-48FC4N5Z6D";
const DEFAULT_HOME_SEO = {
  titleTr: "Doç. Dr. Mesut Karıksız | Ortopedi ve Travmatoloji",
  titleEn: "Assoc. Prof. Mesut Karıksız | Orthopedics and Traumatology",
  descriptionTr: "Doç. Dr. Mesut Karıksız'ın ortopedi ve travmatoloji alanındaki mesleki deneyimi, akademik çalışmaları ve iletişim bilgileri.",
  descriptionEn: "Information about Assoc. Prof. Mesut Karıksız, orthopedic and traumatology practice, academic work, and contact details.",
};
const PROFILE_IMAGE = "WhatsApp Image 2026-09-15 at 16.21.43-Photoroom.png";
const asyncRoute = handler => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

function getPublicOrigin() {
  const configuredUrl = process.env.PUBLIC_SITE_URL || DEFAULT_SITE_URL;
  const url = new URL(configuredUrl);
  if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("PUBLIC_SITE_URL HTTPS adresi olmalı ve yol, sorgu ya da parça içermemelidir.");
  }
  return url.origin;
}

function getGa4Id() {
  const measurementId = process.env.GA4_MEASUREMENT_ID || DEFAULT_GA4_ID;
  if (!/^G-[A-Z0-9]{10}$/.test(measurementId)) {
    throw new Error("GA4_MEASUREMENT_ID G- ve 10 harf/rakamdan oluşmalıdır.");
  }
  return measurementId;
}

function createAnalyticsScript() {
  const measurementId = getGa4Id();
  return `<script async src="https://www.googletagmanager.com/gtag/js?id=${measurementId}"></script>
  <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${measurementId}');</script>`;
}

function injectSeo(html, { title, description, canonical, image, structuredData }) {
  const safeJson = JSON.stringify(structuredData).replace(/</g, "\\u003c");
  return html
    .replaceAll("__SEO_TITLE__", () => escapeHtml(title))
    .replaceAll("__SEO_DESCRIPTION__", () => escapeHtml(description))
    .replaceAll("__SEO_CANONICAL__", () => escapeHtml(canonical))
    .replaceAll("__SEO_IMAGE__", () => escapeHtml(image))
    .replace("__SEO_JSONLD__", () => safeJson)
    .replace("__GA4_SCRIPT__", () => createAnalyticsScript());
}

function createPhysicianSchema(origin, description, image) {
  const organizationId = `${origin}/#medical-organization`;
  const physicianId = `${origin}/#physician`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "MedicalOrganization",
        "@id": organizationId,
        name: "Doç. Dr. Mesut Karıksız Ortopedi ve Travmatoloji",
        url: origin,
        telephone: "+905446289488",
        email: "mesutkariksiz@hotmail.com",
        sameAs: ["https://www.instagram.com/assoc.prof.mesutkariksiz/"],
      },
      {
        "@type": "Physician",
        "@id": physicianId,
        name: "Doç. Dr. Mesut Karıksız",
        url: origin,
        image,
        description,
        medicalSpecialty: "https://schema.org/Orthopedic",
        worksFor: { "@id": organizationId },
      },
    ],
  };
}

function getCitationText(references) {
  return String(references || "").split(/\r?\n/).map(line => line.split("|")[0].trim()).filter(Boolean);
}
function requireEnvironment() {
  const missing = ["MONGODB_URI", "SESSION_SECRET"].filter(key => !process.env[key]);
  if (missing.length) {
    throw new Error(`Eksik ortam değişkenleri: ${missing.join(", ")}. .env.example dosyasını .env olarak kopyalayıp doldurun.`);
  }
  if (process.env.SESSION_SECRET.length < 32) {
    throw new Error("SESSION_SECRET en az 32 karakter olmalıdır.");
  }
}

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  if (process.env.NODE_ENV === "production") app.set("trust proxy", 1);
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://www.googletagmanager.com", "https://translate.google.com", "https://translate.googleapis.com", "https://translate-pa.googleapis.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://www.gstatic.com"],
        imgSrc: ["'self'", "data:", "https://www.gstatic.com", "https://fonts.gstatic.com", "https://translate.googleapis.com", "https://www.google.com", "https://i.ytimg.com", "https://www.google-analytics.com"],
        fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
        connectSrc: ["'self'", "https://translate.googleapis.com", "https://translate-pa.googleapis.com", "https://www.google-analytics.com", "https://region1.google-analytics.com"],
        frameSrc: ["'self'", "https://translate.google.com", "https://maps.google.com", "https://www.google.com"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
      },
    },
  }));
  app.use(express.json({ limit: "3mb" }));
  app.use(session({
    name: SESSION_COOKIE,
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: connectMongo.create({
      mongoUrl: process.env.MONGODB_URI,
      collectionName: "sessions",
      ttl: 60 * 60 * 8,
    }),
    cookie: {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 8,
    },
  }));

  app.get("/health", (req, res) => {
    res.json({ status: mongoose.connection.readyState === 1 ? "ok" : "connecting" });
  });

  app.get("/sitemap.xml", asyncRoute(async (req, res) => {
    const origin = getPublicOrigin();
    const pages = await TreatmentPage.find().select("slug updatedAt").lean();
    res.type("application/xml").send(buildSitemapXml(origin, pages));
  }));

  app.get("/api/csrf", (req, res) => {
    if (!req.session.csrfToken) req.session.csrfToken = randomBytes(32).toString("hex");
    res.set("Cache-Control", "no-store").json({ csrfToken: req.session.csrfToken });
  });

  app.get("/api/posts", asyncRoute(async (req, res) => {
    const posts = await BlogPost.find({ status: "published" })
      .sort({ publishedAt: -1 })
      .select("title slug excerpt content imageData publishedAt")
      .lean();
    res.set("Cache-Control", "no-store").json(posts);
  }));

  app.get("/api/faqs", asyncRoute(async (req, res) => {
    const faqs = await Faq.find().sort({ createdAt: 1 }).select("question answer").lean();
    res.set("Cache-Control", "no-store").json(faqs);
  }));

  app.get("/api/treatments/:slug", asyncRoute(async (req, res) => {
    const treatment = await TreatmentPage.findOne({ slug: req.params.slug })
      .select("slug titleTr titleEn summaryTr summaryEn contentTr contentEn seoTitleTr seoTitleEn seoDescriptionTr seoDescriptionEn referencesTr referencesEn")
      .lean();
    if (!treatment) return res.status(404).json({ error: "Tedavi sayfası bulunamadı." });
    res.set("Cache-Control", "no-store").json(treatment);
  }));

  app.get("/api/site-content", asyncRoute(async (req, res) => {
    const [entries, assets] = await Promise.all([
      SiteContent.find().select("key valueTr valueEn").lean(),
      SiteAsset.find().select("key updatedAt").lean(),
    ]);
    const content = Object.fromEntries(entries.map(entry => [
      entry.key,
      { tr: entry.valueTr, en: entry.valueEn },
    ]));
    const imageUrls = Object.fromEntries(assets.map(asset => [
      asset.key,
      `/api/site-assets/${asset.key}?v=${asset.updatedAt.getTime()}`,
    ]));
    res.set("Cache-Control", "no-store").json({ entries: content, assets: imageUrls });
  }));

  app.get("/api/site-assets/:key", asyncRoute(async (req, res) => {
    const asset = await SiteAsset.findOne({ key: req.params.key }).select("imageData contentType").lean();
    if (!asset) return res.status(404).json({ error: "Görsel bulunamadı." });
    const imageData = asset.imageData.replace(/^data:image\/(?:jpeg|png|webp);base64,/, "");
    res.set({
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Type": asset.contentType,
      "X-Content-Type-Options": "nosniff",
    }).send(Buffer.from(imageData, "base64"));
  }));

  const contactLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "Çok fazla form gönderildi. Lütfen daha sonra tekrar deneyin." },
  });

  app.post("/api/contact", contactLimiter, verifyCsrf, asyncRoute(async (req, res) => {
    const parsed = validateContactSubmission(req.body);
    if (parsed.error) return res.status(400).json({ error: parsed.error });
    await ContactSubmission.create({
      ...parsed.value,
      consentedAt: new Date(),
    });
    res.status(201).json({ message: "Mesajınız iletildi. Teşekkür ederiz." });
  }));

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "Çok fazla giriş denemesi. Lütfen daha sonra tekrar deneyin." },
  });

  function verifyCsrf(req, res, next) {
    const token = req.get("x-csrf-token");
    const expected = req.session.csrfToken;
    if (typeof token !== "string" || typeof expected !== "string") {
      return res.status(403).json({ error: "Oturum doğrulanamadı. Sayfayı yenileyip tekrar deneyin." });
    }
    const tokenBuffer = Buffer.from(token);
    const expectedBuffer = Buffer.from(expected);
    if (tokenBuffer.length !== expectedBuffer.length || !timingSafeEqual(tokenBuffer, expectedBuffer)) {
      return res.status(403).json({ error: "Oturum doğrulanamadı. Sayfayı yenileyip tekrar deneyin." });
    }
    next();
  }

  function requireAdmin(req, res, next) {
    if (!req.session.adminId) return res.status(401).json({ error: "Yönetici girişi gerekli." });
    next();
  }

  app.post("/api/admin/login", loginLimiter, verifyCsrf, asyncRoute(async (req, res, next) => {
    const { password } = req.body ?? {};
    const username = process.env.ADMIN_USERNAME?.trim().toLowerCase();
    if (!username || typeof password !== "string" || password.length > 200) {
      return res.status(400).json({ error: "Parola hatalı." });
    }

    const admin = await Admin.findOne({ username });
    const matches = admin ? await bcrypt.compare(password, admin.passwordHash) : false;
    if (!matches) return res.status(401).json({ error: "Parola hatalı." });

    req.session.regenerate(error => {
      if (error) return next(error);
      req.session.adminId = admin.id;
      req.session.csrfToken = randomBytes(32).toString("hex");
      req.session.save(saveError => {
        if (saveError) return next(saveError);
        res.set("Cache-Control", "no-store").json({ authenticated: true, csrfToken: req.session.csrfToken });
      });
    });
  }));

  app.get("/api/admin/session", (req, res) => {
    res.set("Cache-Control", "no-store").json({ authenticated: Boolean(req.session.adminId) });
  });

  app.get("/api/admin/seo", requireAdmin, asyncRoute(async (req, res) => {
    const settings = await SeoSettings.findOne({ key: "home" }).lean();
    res.set("Cache-Control", "no-store").json(settings || DEFAULT_HOME_SEO);
  }));

  app.put("/api/admin/seo", verifyCsrf, requireAdmin, asyncRoute(async (req, res) => {
    const parsed = validateSeoSettings(req.body);
    if (parsed.error) return res.status(400).json({ error: parsed.error });
    const settings = await SeoSettings.findOneAndUpdate(
      { key: "home" },
      { $set: parsed.value, $setOnInsert: { key: "home" } },
      { upsert: true, new: true, runValidators: true },
    ).lean();
    res.json(settings);
  }));

  app.get("/api/admin/site-content", requireAdmin, asyncRoute(async (req, res) => {
    const [entries, assets] = await Promise.all([
      SiteContent.find().select("key type attribute valueTr valueEn").lean(),
      SiteAsset.find().select("key updatedAt").lean(),
    ]);
    res.set("Cache-Control", "no-store").json({
      entries,
      assets: Object.fromEntries(assets.map(asset => [
        asset.key,
        `/api/site-assets/${asset.key}?v=${asset.updatedAt.getTime()}`,
      ])),
    });
  }));

  app.put("/api/admin/site-content", verifyCsrf, requireAdmin, asyncRoute(async (req, res) => {
    const parsed = validateSiteContentBatch(req.body);
    if (parsed.error) return res.status(400).json({ error: parsed.error });
    if (parsed.value.length) {
      await SiteContent.bulkWrite(parsed.value.map(entry => ({
        updateOne: {
          filter: { key: entry.key },
          update: { $set: entry },
          upsert: true,
        },
      })));
    }
    res.json({ saved: parsed.value.length });
  }));

  app.put("/api/admin/site-assets", verifyCsrf, requireAdmin, asyncRoute(async (req, res) => {
    const parsed = validateSiteAsset(req.body);
    if (parsed.error) return res.status(400).json({ error: parsed.error });
    if (!parsed.value.imageData) {
      await SiteAsset.findOneAndDelete({ key: parsed.value.key });
      return res.status(204).end();
    }
    await SiteAsset.findOneAndUpdate(
      { key: parsed.value.key },
      { $set: parsed.value },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
    );
    res.json({ saved: true });
  }));

  app.post("/api/admin/logout", verifyCsrf, requireAdmin, (req, res, next) => {
    req.session.destroy(error => {
      if (error) return next(error);
      res.clearCookie(SESSION_COOKIE, {
        httpOnly: true,
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production",
      });
      res.status(204).end();
    });
  });

  app.get("/api/admin/posts", requireAdmin, asyncRoute(async (req, res) => {
    const posts = await BlogPost.find().sort({ updatedAt: -1 }).lean();
    res.set("Cache-Control", "no-store").json(posts);
  }));

  app.post("/api/admin/posts", verifyCsrf, requireAdmin, asyncRoute(async (req, res) => {
    const parsed = validatePost(req.body);
    if (parsed.error) return res.status(400).json({ error: parsed.error });
    const now = new Date();
    const post = await BlogPost.create({
      ...parsed.value,
      publishedAt: parsed.value.status === "published" ? now : null,
    });
    res.status(201).json(post);
  }));

  app.put("/api/admin/posts/:id", verifyCsrf, requireAdmin, asyncRoute(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: "Yazı kimliği geçersiz." });
    const parsed = validatePost(req.body);
    if (parsed.error) return res.status(400).json({ error: parsed.error });
    const post = await BlogPost.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Yazı bulunamadı." });

    const wasPublished = post.status === "published";
    post.title = parsed.value.title;
    post.slug = parsed.value.slug;
    post.excerpt = parsed.value.excerpt;
    post.content = parsed.value.content;
    post.status = parsed.value.status;
    if (post.status === "draft") post.publishedAt = null;
    else if (!wasPublished || !post.publishedAt) post.publishedAt = new Date();
    await post.save();
    res.json(post);
  }));

  app.delete("/api/admin/posts/:id", verifyCsrf, requireAdmin, asyncRoute(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: "Yazı kimliği geçersiz." });
    const post = await BlogPost.findByIdAndDelete(req.params.id);
    if (!post) return res.status(404).json({ error: "Yazı bulunamadı." });
    res.status(204).end();
  }));

  app.get("/api/admin/faqs", requireAdmin, asyncRoute(async (req, res) => {
    const faqs = await Faq.find().sort({ createdAt: 1 }).lean();
    res.set("Cache-Control", "no-store").json(faqs);
  }));

  app.get("/api/admin/treatments", requireAdmin, asyncRoute(async (req, res) => {
    const pages = await TreatmentPage.find().sort({ order: 1 }).lean();
    res.set("Cache-Control", "no-store").json(pages);
  }));

  app.put("/api/admin/treatments/:key", verifyCsrf, requireAdmin, asyncRoute(async (req, res) => {
    const parsed = validateTreatmentPage(req.body);
    if (parsed.error) return res.status(400).json({ error: parsed.error });
    const page = await TreatmentPage.findOneAndUpdate(
      { key: req.params.key },
      { $set: parsed.value },
      { new: true, runValidators: true },
    );
    if (!page) return res.status(404).json({ error: "Tedavi sayfası bulunamadı." });
    res.json(page);
  }));

  app.post("/api/admin/faqs", verifyCsrf, requireAdmin, asyncRoute(async (req, res) => {
    const parsed = validateFaq(req.body);
    if (parsed.error) return res.status(400).json({ error: parsed.error });
    const faq = await Faq.create(parsed.value);
    res.status(201).json(faq);
  }));

  app.put("/api/admin/faqs/:id", verifyCsrf, requireAdmin, asyncRoute(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: "SSS kimliği geçersiz." });
    const parsed = validateFaq(req.body);
    if (parsed.error) return res.status(400).json({ error: parsed.error });
    const faq = await Faq.findByIdAndUpdate(req.params.id, parsed.value, {
      new: true,
      runValidators: true,
    });
    if (!faq) return res.status(404).json({ error: "SSS kaydı bulunamadı." });
    res.json(faq);
  }));

  app.delete("/api/admin/faqs/:id", verifyCsrf, requireAdmin, asyncRoute(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: "SSS kimliği geçersiz." });
    const faq = await Faq.findByIdAndDelete(req.params.id);
    if (!faq) return res.status(404).json({ error: "SSS kaydı bulunamadı." });
    res.status(204).end();
  }));

  app.get("/api/admin/contact-submissions", requireAdmin, asyncRoute(async (req, res) => {
    const submissions = await ContactSubmission.find()
      .sort({ createdAt: -1 })
      .limit(100)
      .select("fullName phone email message isRead createdAt")
      .lean();
    res.set("Cache-Control", "no-store").json(submissions);
  }));

  app.patch("/api/admin/contact-submissions/:id", verifyCsrf, requireAdmin, asyncRoute(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: "Form kaydı kimliği geçersiz." });
    if (typeof req.body?.isRead !== "boolean") return res.status(400).json({ error: "Okunma durumu geçersiz." });
    const submission = await ContactSubmission.findByIdAndUpdate(
      req.params.id,
      { $set: { isRead: req.body.isRead } },
      { new: true, runValidators: true },
    ).select("isRead").lean();
    if (!submission) return res.status(404).json({ error: "Form kaydı bulunamadı." });
    res.json({ isRead: submission.isRead });
  }));

  app.delete("/api/admin/contact-submissions/:id", verifyCsrf, requireAdmin, asyncRoute(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: "Form kaydı kimliği geçersiz." });
    const submission = await ContactSubmission.findByIdAndDelete(req.params.id);
    if (!submission) return res.status(404).json({ error: "Form kaydı bulunamadı." });
    res.status(204).end();
  }));

  app.get("/tedavi/:slug", asyncRoute(async (req, res) => {
    const page = await TreatmentPage.findOne({ slug: req.params.slug }).lean();
    if (!page) return res.status(404).type("text").send("Tedavi sayfası bulunamadı.");

    const origin = getPublicOrigin();
    const canonical = `${origin}/tedavi/${encodeURIComponent(page.slug)}`;
    const image = `${origin}/${encodeURIComponent(PROFILE_IMAGE)}`;
    const title = page.seoTitleTr || `${page.titleTr} | Doç. Dr. Mesut Karıksız`;
    const description = page.seoDescriptionTr || page.summaryTr;
    const content = await readFile(path.join(__dirname, "public", "treatment.html"), "utf8");
    const citations = getCitationText(page.referencesTr);
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "MedicalWebPage",
      name: title,
      description,
      url: canonical,
      about: { "@id": `${origin}/#physician` },
      citation: citations,
      breadcrumb: {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Ana sayfa", item: `${origin}/` },
          { "@type": "ListItem", position: 2, name: page.titleTr, item: canonical },
        ],
      },
    };
    const html = content
      .replace("__TREATMENT_TITLE__", escapeHtml(page.titleTr))
      .replace("__TREATMENT_SUMMARY__", escapeHtml(page.summaryTr))
      .replace("__TREATMENT_CONTENT__", renderParagraphs(page.contentTr))
      .replace("__TREATMENT_REFERENCES__", renderReferences(page.referencesTr));
    res.send(injectSeo(html, { title, description, canonical, image, structuredData }));
  }));
  app.get("/admin", (req, res) => res.sendFile(path.join(__dirname, "public", "admin.html")));
  app.get("/robots.txt", (req, res) => res.sendFile(path.join(__dirname, "robots.txt")));
  app.get("/", asyncRoute(async (req, res) => {
    const origin = getPublicOrigin();
    const settings = await SeoSettings.findOne({ key: "home" }).lean() || DEFAULT_HOME_SEO;
    const image = `${origin}/${encodeURIComponent(PROFILE_IMAGE)}`;
    const html = await readFile(path.join(__dirname, "index.html"), "utf8");
    res.send(injectSeo(html, {
      title: settings.titleTr,
      description: settings.descriptionTr,
      canonical: `${origin}/`,
      image,
      structuredData: createPhysicianSchema(origin, settings.descriptionTr, image),
    }));
  }));
  app.get("/fonts.css", (req, res) => res.sendFile(path.join(__dirname, "fonts.css")));
  app.get("/lenis.min.js", (req, res) => res.sendFile(path.join(__dirname, "lenis.min.js")));
  app.get("/public/admin.js", (req, res) => res.sendFile(path.join(__dirname, "public", "admin.js")));
  app.get("/public/site-content.js", (req, res) => res.sendFile(path.join(__dirname, "public", "site-content.js")));
  app.get("/public/treatment.js", (req, res) => res.sendFile(path.join(__dirname, "public", "treatment.js")));
  app.use("/fonts", express.static(path.join(__dirname, "fonts"), { dotfiles: "deny", index: false }));
  app.use("/galeri", express.static(path.join(__dirname, "galeri"), { dotfiles: "deny", index: false }));
  const publicAssets = new Set([
    "image.png",
    "WhatsApp Image 2026-09-15 at 16.21.43.jpeg",
    "WhatsApp Image 2026-09-15 at 16.21.43-Photoroom.png",
    "o-n-c-apraz-bag-yaralanmasi-nedenleri-belirtileri-ve-tedavisi.webp",
    "meniscal-tear-mri.webp",
    "images.jpg",
    "egemen-turhan-diz-kapag\u{306}i-cikmasi-img-4.jpg",
    "Omuz-kas-y\u{131}rt\u{131}\u{11f}\u{131}-1.jpg",
    "omuz-cikigi-1024x576.webp",
    "prosthesis-revision.png",
    "knee-osteoarthritis.jpg",
    "knee-replacement.jpg",
    "hip-replacement.jpg",
    "hip-osteoarthritis.jpg",
    "ganz-pao.jpg",
    "stem-cells.jpg",
    "pediatric-hip-dysplasia.jpg",
    "clubfoot-openstax.jpg",
    "hip-arthroscopy.png",
  ]);
  app.get("/:asset", (req, res, next) => {
    if (!publicAssets.has(req.params.asset)) return next();
    res.sendFile(path.join(__dirname, req.params.asset));
  });
  app.use("/api", (req, res) => res.status(404).json({ error: "API uç noktası bulunamadı." }));
  app.use((err, req, res, next) => {
    console.error("İstek işlenirken hata oluştu:", err);
    if (res.headersSent) return next(err);
    res.status(500).json({ error: "Sunucu isteği işlerken bir hata oluştu." });
  });
  return app;
}

async function ensureInitialAdmin() {
  const existingAdmin = await Admin.exists();
  if (existingAdmin) return;
  const { ADMIN_USERNAME, ADMIN_PASSWORD } = process.env;
  if (!ADMIN_USERNAME || !ADMIN_PASSWORD || ADMIN_PASSWORD.length < 8) {
    throw new Error("İlk yönetici için ADMIN_USERNAME ve en az 8 karakterli ADMIN_PASSWORD tanımlanmalıdır.");
  }
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  await Admin.create({ username: ADMIN_USERNAME.trim().toLowerCase(), passwordHash });
  console.log("İlk yönetici hesabı güvenli biçimde oluşturuldu.");
}

async function ensureInitialTreatmentPages() {
  await Promise.all(treatmentPages.map(page => TreatmentPage.updateOne(
    { key: page.key },
    { $setOnInsert: page },
    { upsert: true },
  )));
}

async function ensureInitialSeoSettings() {
  await SeoSettings.updateOne(
    { key: "home" },
    { $setOnInsert: { key: "home", ...DEFAULT_HOME_SEO } },
    { upsert: true },
  );
}

async function start() {
  requireEnvironment();
  await mongoose.connect(process.env.MONGODB_URI);
  await ensureInitialAdmin();
  await ensureInitialTreatmentPages();
  await ensureInitialSeoSettings();
  const port = Number(process.env.PORT) || 3000;
  createApp().listen(port, () => console.log(`Site http://localhost:${port} adresinde çalışıyor.`));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  start().catch(error => {
    console.error("Sunucu başlatılamadı:", error.message);
    process.exitCode = 1;
  });
}
