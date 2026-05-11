import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const ai = new GoogleGenAI({ 
  apiKey: (process.env.GEMINI_API_KEY || '').trim() 
});

if (!process.env.GEMINI_API_KEY) {
  console.warn("⚠️ GEMINI_API_KEY is not defined in the server environment.");
} else {
  console.log("✅ GEMINI_API_KEY detected (Type: " + typeof process.env.GEMINI_API_KEY + ", Length: " + process.env.GEMINI_API_KEY.length + ")");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for URL Analysis
  app.post("/api/analyze-url", async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "URL is required" });

    try {
      // 1. Fetch the URL content (basic fetch)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const html = await response.text();
      // Basic cleanup to reduce tokens (remove scripts/styles)
      const cleanContent = html
        .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gi, "")
        .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, "")
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ") // Collapse whitespaces
        .trim()
        .slice(0, 30000); // Send first 30k chars to Gemini

      // 2. Call Gemini for analysis
      const prompt = `Analyze this law library/convention content:
      "${cleanContent}"
      
      Provide a highly precise legal-style suggested Title (Arabic and English) and a 1-sentence summary (Arabic and English).
      Suggest the most appropriate category from this list: law, regulation, decree, ministerial_decree, convention, recommendation, update, url.
      Return as JSON ONLY: { "arTitle": "...", "enTitle": "...", "arSummary": "...", "enSummary": "...", "suggestedType": "..." }`;

      const currentKey = (process.env.GEMINI_API_KEY || '').trim();
      if (!currentKey) {
        throw new Error("GEMINI_API_KEY is not configured on the server.");
      }

      const result = await ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: prompt
      });
      
      const output = result.text;
      if (!output) throw new Error("Empty response from AI engine");
      
      // Extract JSON from markdown if Gemini wraps it
      const jsonStr = output.match(/\{[\s\S]*\}/)?.[0] || output;
      const analysis = JSON.parse(jsonStr);

      res.json({
        ...analysis,
        capturedContent: cleanContent
      });
    } catch (error) {
      console.error("URL Analysis Error:", error);
      const msg = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: `Could not analyze URL contents: ${msg}` });
    }
  });

  // API Route for Content Analysis (Raw text classification)
  app.post("/api/analyze-content", async (req, res) => {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: "Content is required" });

    try {
      const prompt = `Analyze this legal document text:
      "${content.slice(0, 10000)}"
      
      Suggest the most appropriate category from this list: law, regulation, decree, ministerial_decree, convention, recommendation, update, circular, procedure.
      Provide a highly precise legal-style suggested Title (Arabic and English).
      Return as JSON ONLY: { "arTitle": "...", "enTitle": "...", "suggestedType": "..." }`;

      const currentKey = (process.env.GEMINI_API_KEY || '').trim();
      if (!currentKey) {
        throw new Error("GEMINI_API_KEY is not configured on the server.");
      }

      const result = await ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: prompt
      });
      
      const output = result.text;
      if (!output) throw new Error("Empty response from AI engine");
      
      const jsonStr = output.match(/\{[\s\S]*\}/)?.[0] || output;
      const analysis = JSON.parse(jsonStr);

      res.json(analysis);
    } catch (error) {
      console.error("Content Analysis Error:", error);
      res.status(500).json({ error: "Could not analyze content" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Legal Intelligence Server running on http://localhost:${PORT}`);
  });
}

startServer();
