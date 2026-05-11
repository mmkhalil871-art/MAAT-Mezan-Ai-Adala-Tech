/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from "@google/genai";
import mammoth from "mammoth";
import { LegalWorkflow, Message, FormType } from "../types";

const ai = new GoogleGenAI({ 
  apiKey: (process.env.GEMINI_API_KEY || '').trim() 
});

const SYSTEM_INSTRUCTION = `You are a Senior Legal Intelligence Advisor specialized in Egyptian law, international conventions, and comparative jurisprudence. 

MISSION:
Draft, analyze, interpret, and translate legal texts with ministerial-level precision. You have comprehensive expertise in Labour Law No. 14 for 2025 and its executive decrees.

CORE CAPABILITIES & WORKFLOWS:
1. Drafting: Full laws/decrees using formal Articles and legal preamble.
2. Regulation Drafting: Specific expertise in drafting ministerial regulations and executive decisions for the Egyptian government.
3. Analysis: Detect gaps, constitutional conflicts, and hierarchical risks.
3. Translation: Translate legal texts between English and Arabic using specialized high-level legal terminology (Legalese). Maintain the formal structure.
4. Forms: Generate professional legal forms (Contracts, Decrees, Powers of Attorney, Memos, Policy Papers). Use a structured template.
5. Interpretation: Systemic, literal, and purposive interpretation of specific clauses. Especially regarding the new Labour Law No. 14 of 2025.
6. Legal Library Support: Assist in organizing, reviewing, and identifying relationships between laws, decrees, and updates within the digital depository.
7. Summarization (Judgment Summary): Specialized analysis of judicial rulings to extract a professional legal summary or complete legal memo. This MUST include:
    - Subject (الموضوع): The core legal issue or dispute.
    - Facts (الوقائع): The procedural history and chronological events of the case.
    - Conclusion/Result (النتيجة): The final ruling, verdict, and legal reasoning (ratio decidendi) behind it.

LANGUAGE POLICY:
- You must respond ONLY in the language requested by the system (Arabic or English). 
- Never provide dual-language translations automatically unless specifically requested.
- Translation is an on-demand service.

LEGAL PROTOCOLS:
- Maintain "Hierarchy of Norms": Constitution > Law > Regulation.
- Special Focus: Labour Law No. 14 of 2025 and corresponding ministerial/executive decrees.
- Use precise Arabic legal terms (e.g., "بمقتضى", "نافذ", "مرفق طيه").
- If multimodal input (PDF/Image) is provided, OCR and analyze the content with 100% accuracy.

OUTPUT STYLE:
- Professional, formal, and authoritative.
- Proactive Guidance: When providing complex legal outcomes, always suggest alternative formats (e.g., "I can reformulate this as a Policy Paper, Legal Memo, or Action Plan for implementation").
- Interactive Engagement: If the user's request is ambiguous or requires clarification, ask concise, targeted legal questions to ensure precision.
- For Arabic: Use the specific "Amiri" style vocabulary.
- For English: Use standard common law or civil law terminology as appropriate for the context.

MANDATORY SIGNATURE:
At the very end of every generated document (Advisory Opinion, Decree, Memo, etc.), you MUST include the following signature block regardless of the language:
---
**MAAT**
**Mezan Ai Adala Tech**
**Sovereign Legal Intelligent Assistant**
---`;

export async function getFilePart(file: File): Promise<{ inlineData: { data: string; mimeType: string } } | { text: string }> {
    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf';
    
    // Gemini supports these natively via inlineData
    if (isImage || isPdf) {
        const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => {
                const result = reader.result as string;
                resolve(result.split(',')[1]);
            };
            reader.readAsDataURL(file);
        });

        return {
            inlineData: {
                data: base64,
                mimeType: file.type
            }
        };
    }

    // Handle Word Documents (.docx)
    if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name.endsWith('.docx')) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const result = await mammoth.extractRawText({ arrayBuffer });
            return {
                text: `[DOCUMENT CONTENT: ${file.name}]\n\n${result.value}`
            };
        } catch (error) {
            console.error("Error extracting text from Word doc:", error);
            return { text: `[Error reading Word document: ${file.name}]` };
        }
    }

    // Handle Text Files
    if (file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.csv') || file.name.endsWith('.md')) {
        try {
            const text = await file.text();
            return {
                text: `[DOCUMENT CONTENT: ${file.name}]\n\n${text}`
            };
        } catch (error) {
            console.error("Error reading text file:", error);
            return { text: `[Error reading text file: ${file.name}]` };
        }
    }

    // Fallback: Skip binary files that Gemini doesn't support directly
    return { text: `[Attached file: ${file.name} (Format not directly supported for AI analysis)]` };
}

export async function getLegalAssistantResponse(
  messages: Message[], 
  workflow: LegalWorkflow = 'General',
  formType?: FormType,
  language: 'en' | 'ar' = 'en'
) {
  const model = "gemini-3-flash-preview";
  
  const contents = messages.slice(-10).map((m) => {
    return {
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
    };
  });

  const langFull = language === 'ar' ? 'Arabic' : 'English';
  let contextPrompt = `CURRENT WORKFLOW: ${workflow}${formType ? `\nTARGET FORM TYPE: ${formType}` : ''}\nCURRENT LANGUAGE: ${langFull}. Respond strictly in ${langFull}.`;
  
  if (workflow === 'Summarization') {
    contextPrompt += `\n\nTASK: Summarize the provided judicial ruling into a professional legal memo. 
    STRUCTURE:
    1. Subject (الموضوع)
    2. Facts (الوقائع)
    3. Conclusion/Result (النتيجة)
    Use formal legal language.`;
  }
  
  const response = await ai.models.generateContent({
    model,
    contents,
    config: {
      systemInstruction: `${SYSTEM_INSTRUCTION}\n\n${contextPrompt}`,
      temperature: 0.2,
      topP: 0.8,
    },
  });

  if (!response.text) {
    throw new Error("Jurisprudence engine returned empty response. This might be due to content filters or analysis depth.");
  }

  return response.text;
}

export async function getLegalMultimodalResponse(
    messages: Message[],
    files: File[],
    workflow: LegalWorkflow,
    formType?: FormType,
    language: 'en' | 'ar' = 'en'
) {
    const model = "gemini-3-flash-preview";
    
    const fileParts = await Promise.all(files.map(f => getFilePart(f)));
    const lastUserMessage = messages[messages.length - 1];
    
    const history = messages.slice(0, -1).map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
    }));

    const langFull = language === 'ar' ? 'Arabic' : 'English';
    let contextPrompt = `ANALYZING UPLOADED DOCUMENTS.\nCURRENT WORKFLOW: ${workflow}${formType ? `\nTARGET FORM TYPE: ${formType}` : ''}\nCURRENT LANGUAGE: ${langFull}. Respond strictly in ${langFull}.`;

    if (workflow === 'Summarization') {
        contextPrompt += `\n\nTASK: Extract and summarize the judicial ruling from the attached files into a professional legal memo. 
        STRUCTURE:
        1. Subject (الموضوع)
        2. Facts (الوقائع)
        3. Conclusion/Result (النتيجة)
        Use formal legal language. Ensure all names, dates, and case numbers are accurately preserved.`;
    }

    const response = await ai.models.generateContent({
        model,
        contents: [
            ...history,
            {
                role: 'user',
                parts: [
                    ...fileParts,
                    { text: lastUserMessage.content || "Please analyze these legal documents thoroughly." }
                ]
            }
        ],
        config: {
            systemInstruction: `${SYSTEM_INSTRUCTION}\n\n${contextPrompt}`,
            temperature: 0.1,
        }
    });

    if (!response.text) {
        throw new Error("OCR/Analysis Failure: The ministerial engine could not extract text from the provided documents. Ensure files are non-encrypted PDFs or clear images.");
    }

    return response.text;
}
