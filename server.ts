import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { GoogleGenAI, ThinkingLevel, LiveServerMessage, Modality } from "@google/genai";
import dotenv from "dotenv";
import { WebSocketServer } from "ws";

dotenv.config();

const ai = new GoogleGenAI({ 
  apiKey: (process.env.GEMINI_API_KEY || '').trim(),
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

if (!process.env.GEMINI_API_KEY) {
  console.warn("⚠️ GEMINI_API_KEY is not defined in the server environment.");
} else {
  console.log("✅ GEMINI_API_KEY detected (Type: " + typeof process.env.GEMINI_API_KEY + ", Length: " + process.env.GEMINI_API_KEY.length + ")");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // API Route for Key Verification Ping
  app.get("/api/verify-key", async (_req, res) => {
    const key = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : '';
    if (!key) {
      return res.json({
        ok: false,
        status: "invalid_key",
        message: "GEMINI_API_KEY is not set in server environment."
      });
    }

    try {
      // Perform lightweight ping request to verify API key with fallback
      const pingModels = ["gemini-2.5-flash", "gemini-3.1-flash-lite", "gemini-2.0-flash", "gemini-1.5-flash"];
      let pingSuccess = false;
      let pingError: unknown = null;

      for (const mName of pingModels) {
        try {
          const result = await ai.models.generateContent({
            model: mName,
            contents: "ping",
            config: { maxOutputTokens: 1 }
          });
          if (result) {
            pingSuccess = true;
            break;
          }
        } catch (err) {
          pingError = err;
        }
      }

      if (pingSuccess) {
        return res.json({
          ok: true,
          status: "valid",
          message: "Gemini API Key is valid and functional."
        });
      }
      throw pingError || new Error("Ping returned empty response.");
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const isQuota = errMsg.includes("RESOURCE_EXHAUSTED") || 
                      errMsg.includes("429") || 
                      errMsg.includes("quota") || 
                      errMsg.includes("Quota");
      const isInvalidKey = errMsg.includes("API_KEY_INVALID") ||
                           errMsg.includes("API key not valid") ||
                           errMsg.includes("INVALID_ARGUMENT") ||
                           errMsg.includes("UNAUTHENTICATED") ||
                           errMsg.includes("API_KEY");

      if (isQuota) {
        return res.json({
          ok: false,
          status: "quota_exceeded",
          message: "Gemini API Key quota rate limit exceeded."
        });
      } else if (isInvalidKey) {
        return res.json({
          ok: false,
          status: "invalid_key",
          message: "Gemini API Key is invalid or unauthorized."
        });
      } else {
        return res.json({
          ok: false,
          status: "error",
          message: errMsg
        });
      }
    }
  });

  // API Route for Streaming Chat
  app.post("/api/chat-stream", async (req, res) => {
    const { contents, systemInstruction, enableSearch, highThinking } = req.body;
    
    if (!contents) return res.status(400).json({ error: "Contents are required" });

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');

    const isHighThinking = highThinking === true;
    const modelCandidates = isHighThinking 
      ? ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-flash-latest"]
      : ["gemini-2.5-flash", "gemini-3.1-flash-lite", "gemini-3.5-flash", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-flash-latest"];

    let lastError: unknown = null;
    let streamSuccess = false;

    for (const modelName of modelCandidates) {
      try {
        console.log(`Starting chat streaming attempt with model: ${modelName}`);
        
        const isGemini3 = modelName.startsWith("gemini-3");
        const config = {
          systemInstruction,
          temperature: isHighThinking ? 0.7 : 0.2, 
          tools: enableSearch ? [{ googleSearch: {} }] : undefined,
          thinkingConfig: isGemini3 ? {
            thinkingLevel: isHighThinking ? ThinkingLevel.HIGH : ThinkingLevel.LOW
          } : undefined
        };

        const response = await ai.models.generateContentStream({
          model: modelName,
          contents,
          config
        });

        for await (const chunk of response) {
          if (chunk.text) {
            res.write(chunk.text);
          }
        }
        
        streamSuccess = true;
        console.log(`Successfully completed chat stream with model: ${modelName}`);
        break;
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        const isQuota = errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("429") || errMsg.includes("quota") || errMsg.includes("Quota");
        if (isQuota) {
          console.warn(`Model ${modelName} stream reached API quota limit (429 RESOURCE_EXHAUSTED). Trying next candidate...`);
        } else {
          console.warn(`Model ${modelName} stream failed:`, errMsg);
        }
        lastError = err;
        // Continue to the next candidate model
      }
    }

    try {
      if (!streamSuccess) {
        throw lastError || new Error("All candidate models failed to stream.");
      }
      res.end();
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      const isQuotaExceeded = errMsg.includes("RESOURCE_EXHAUSTED") || 
                              errMsg.includes("429") || 
                              errMsg.includes("quota") || 
                              errMsg.includes("Quota");
      const isInvalidKey = errMsg.includes("API_KEY_INVALID") ||
                           errMsg.includes("API key not valid") ||
                           errMsg.includes("INVALID_ARGUMENT") ||
                           errMsg.includes("UNAUTHENTICATED") ||
                           errMsg.includes("API_KEY");

      if (isQuotaExceeded || isInvalidKey) {
        const title = isInvalidKey 
          ? "⚠️ Gemini API Key Invalid / مفتاح غير صالح" 
          : "⚠️ Gemini API Quota Exceeded / نفاد حصة واجهة برمجة التطبيقات";
        
        console.warn("Chat streaming error handled:", title);
        res.write(`\n\n---\n\n### ${title}\n\n` +
          `The Gemini API key is missing, invalid, or has exceeded its quota rate limits. / مفتاح واجهة برمجة التطبيقات لـ Gemini غير صالح أو غير موجود أو تجاوز حد الحصة المتاحة.\n\n` +
          `**How to fix this issue / كيفية حل المشكلة:**\n\n` +
          `1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey) to generate or copy a fresh **Gemini API Key**. / احصل على مفتاح جديد من [Google AI Studio](https://aistudio.google.com/app/apikey).\n` +
          `2. Open the **Settings > Secrets** menu in the bottom-left sidebar of AI Studio. / افتح قائمة **الإعدادات > الأسرار (Settings > Secrets)** من الشريط الجانبي الأيسر السفلي.\n` +
          `3. Set or update **GEMINI_API_KEY** with your valid key. / أضف أو حدث قيمة **GEMINI_API_KEY** بمفتاحك الصحيح.\n` +
          `4. Try sending your message or analyzing content again! / أعد محاولة إرسال الرسالة أو تحليل المحتوى.\n\n` +
          `*(Technical Details: ${isInvalidKey ? "API_KEY_INVALID" : "RESOURCE_EXHAUSTED / 429 Too Many Requests"})*`);
      } else {
        console.error("Streaming Chat Error:", errMsg);
        res.write(`\n\n[ERROR: ${errMsg}]`);
      }
      res.end();
    }
  });

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

      const modelCandidates = ["gemini-2.5-flash", "gemini-3.1-flash-lite", "gemini-3.5-flash", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-flash-latest"];
      let result = null;
      let lastError: unknown = null;

      for (const modelName of modelCandidates) {
        try {
          console.log(`Starting URL analysis with model candidate: ${modelName}`);
          const isGemini3 = modelName.startsWith("gemini-3");
          const config = isGemini3 ? {
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
          } : undefined;
          result = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config
          });
          if (result && result.text) {
            console.log(`Successfully analyzed URL using model: ${modelName}`);
            break;
          }
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          const isQuota = errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("429") || errMsg.includes("quota") || errMsg.includes("Quota");
          if (isQuota) {
            console.warn(`URL Analysis with model ${modelName} reached API quota limit.`);
          } else {
            console.warn(`URL Analysis with model ${modelName} failed:`, errMsg);
          }
          lastError = err;
        }
      }

      if (!result || !result.text) {
        throw lastError || new Error("All URL analysis model candidates failed.");
      }
      
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
      const msg = error instanceof Error ? error.message : String(error);
      const isQuota = msg.includes("RESOURCE_EXHAUSTED") || msg.includes("429") || msg.includes("quota") || msg.includes("Quota");
      if (isQuota) {
        console.warn("URL Analysis failed due to Gemini API Quota limit.");
      } else {
        console.error("URL Analysis Error:", msg);
      }
      res.status(isQuota ? 429 : 500).json({ 
        error: isQuota 
          ? "Gemini API Quota Exceeded. Please configure your GEMINI_API_KEY under Settings > Secrets." 
          : `Could not analyze URL contents: ${msg}`,
        isQuotaError: isQuota
      });
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

      console.log("Starting content analysis...");

      const modelCandidates = ["gemini-2.5-flash", "gemini-3.1-flash-lite", "gemini-3.5-flash", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-flash-latest"];
      let result = null;
      let lastError: unknown = null;

      for (const modelName of modelCandidates) {
        try {
          console.log(`Starting content analysis with model candidate: ${modelName}`);
          const isGemini3 = modelName.startsWith("gemini-3");
          const config = isGemini3 ? {
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
          } : undefined;
          result = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config
          });
          if (result && result.text) {
            console.log(`Successfully analyzed content using model: ${modelName}`);
            break;
          }
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          const isQuota = errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("429") || errMsg.includes("quota") || errMsg.includes("Quota");
          if (isQuota) {
            console.warn(`Content Analysis with model ${modelName} reached API quota limit.`);
          } else {
            console.warn(`Content Analysis with model ${modelName} failed:`, errMsg);
          }
          lastError = err;
        }
      }

      if (!result || !result.text) {
        throw lastError || new Error("All content analysis model candidates failed.");
      }
      
      const output = result.text;
      if (!output) throw new Error("Empty response from AI engine");
      
      const jsonStr = output.match(/\{[\s\S]*\}/)?.[0] || output;
      const analysis = JSON.parse(jsonStr);

      res.json(analysis);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      const isQuota = msg.includes("RESOURCE_EXHAUSTED") || msg.includes("429") || msg.includes("quota") || msg.includes("Quota");
      if (isQuota) {
        console.warn("Content Analysis failed due to Gemini API Quota limit.");
      } else {
        console.error("Content Analysis Error:", msg);
      }
      res.status(isQuota ? 429 : 500).json({ 
        error: isQuota 
          ? "Gemini API Quota Exceeded. Please configure your GEMINI_API_KEY under Settings > Secrets." 
          : "Could not analyze content",
        isQuotaError: isQuota
      });
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

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Legal Intelligence Server running on http://localhost:${PORT}`);
  });

  const wss = new WebSocketServer({ server, path: '/api/live' });

  wss.on("connection", async (clientWs) => {
    console.log("Live conversation started via WebSocket");
    
    try {
      const session = await ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        callbacks: {
          onmessage: (message: LiveServerMessage) => {
            // Forward audio from Gemini to client
            const parts = message.serverContent?.modelTurn?.parts;
            if (parts && parts.length > 0) {
              const audio = parts[0]?.inlineData?.data;
              if (audio) {
                clientWs.send(JSON.stringify({ type: 'audio', data: audio }));
              }
              
              const text = parts[0]?.text;
              if (text) {
                clientWs.send(JSON.stringify({ type: 'text', data: text }));
              }
            }

            if (message.serverContent?.interrupted) {
              clientWs.send(JSON.stringify({ type: 'interrupted' }));
            }
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction: "You are MAAT, the Sovereign Legal Intelligent Assistant. You are specialized in Egyptian law and international conventions. Communicate with high legal authority and professional poise. Use professional legal terminology. Respond in the same language the user uses. Your goal is to provide immediate, low-latency legal advice via voice.",
          outputAudioTranscription: {},
          inputAudioTranscription: {},
        },
      });

      clientWs.on("message", (data) => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.audio) {
            session.sendRealtimeInput({
              audio: { data: msg.audio, mimeType: "audio/pcm;rate=16000" },
            });
          }
          if (msg.text) {
            session.sendRealtimeInput({
              text: msg.text
            });
          }
        } catch (e) {
          console.error("WebSocket message parsing error:", e);
        }
      });

      clientWs.on("close", () => {
        console.log("Live conversation closed");
      });

    } catch (error) {
      console.error("Gemini Live Connection Error:", error);
      clientWs.send(JSON.stringify({ type: 'error', message: "Jurisprudence engine failed to establish live link." }));
      clientWs.close();
    }
  });
}

startServer();
