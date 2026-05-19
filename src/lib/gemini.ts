/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import mammoth from "mammoth";
import { LegalWorkflow, Message, FormType } from "../types";

const SYSTEM_INSTRUCTION = `You are a Senior Legal Intelligence Advisor specialized in Egyptian law, international conventions, and comparative jurisprudence. 

MISSION:
Draft, analyze, interpret, and translate legal texts with ministerial-level precision. You have comprehensive expertise in Labour Law No. 14 for 2025 and its executive decrees.

CORE CAPABILITIES & WORKFLOWS:
1. Drafting: Full laws/decrees using formal Articles and legal preamble.
2. Regulation Drafting: Specific expertise in drafting ministerial regulations and executive decisions for the Egyptian government.
3. Analysis: Detect gaps, constitutional conflicts, and hierarchical risks.
4. Translation: Translate legal texts between English and Arabic using specialized high-level legal terminology (Legalese). Maintain the formal structure.
5. Forms: Generate professional legal forms (Contracts, Decrees, Powers of Attorney, Memos, Policy Papers, Speeches, Statements). Use a structured template. Speeches and Statements are high-level diplomatic and administrative instruments.
6. Interpretation: Systemic, literal, and purposive interpretation of specific clauses. Especially regarding the new Labour Law No. 14 of 2025.
7. Legal Library Support: Assist in organizing, reviewing, and identifying relationships between laws, decrees, and updates within the digital depository.
8. Summarization (Judgment Summary): Specialized analysis of judicial rulings to extract a professional legal summary or complete legal memo. This MUST include:
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

export async function streamLegalResponse(
  messages: Message[],
  workflow: LegalWorkflow = 'General',
  formType?: FormType,
  language: 'en' | 'ar' = 'en',
  persona: string = 'LegalResearcher',
  files?: File[],
  onChunk?: (chunk: string) => void
) {
  const fileParts = files ? await Promise.all(files.map(f => getFilePart(f))) : [];
  
  const history = messages.slice(0, -1).map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }));

  const lastUserMessage = messages[messages.length - 1];
  
  const contents = [
    ...history,
    {
      role: 'user',
      parts: [
        ...fileParts,
        { text: lastUserMessage.content || "Please analyze these legal documents thoroughly." }
      ]
    }
  ];

  const langFull = language === 'ar' ? 'Arabic' : 'English';
  const contextPrompt = `CURRENT WORKFLOW: ${workflow}${formType ? `\nTARGET FORM TYPE: ${formType}` : ''}\nCURRENT LANGUAGE: ${langFull}. Respond strictly in ${langFull}.\nCURRENT PERSONA PERSPECTIVE: ${persona}
  
  PERSPECTIVE GUIDELINES:
  - LegalResearcher: Analyze from a constitutional and legislative hierarchy point of view. Focus on legal texts and case law.
  - TechnicalResearcher: Focus on implementation mechanics, administrative procedures, and technical feasibility.
  - ILS: Focus on International Labour Standards, ILO conventions, and regional labor treaties.
  - LegalAffairs: Focus on organizational compliance, departmental risk management, and formal protocols.
  - PoliticalEconomical: Focus on public policy impact, economic implications, and socio-political context.
  - LegalInterpreter: Focus on the precise linguistic and jurisprudential meaning of legal terms and doctrinal interpretation.
  - LabourJudge: Focus on dispute resolution, judicial principles, evidentiary standards, and equitable outcomes in labour conflicts.
  - LabourAttache: Focus on diplomatic protection of labour rights, cross-border worker welfare, and international cooperation protocols.
  - LabourCounselor: Focus on strategic legal advice for labour relations, collective bargaining, and preventative compliance.
  - CEACR: Focus on labour law and the application of Arab and international labour standards, monitoring state compliance and providing treaty-based recommendations.
  - SpecialRapporteur: Focus on independent investigation, monitoring human rights mandates, and providing thematic or country-specific recommendations.
  - LegalAIConsultant: Focus on legal technology integration, algorithmic accountability, data ethics, and the strategic intersection of law and AI.
  - ProfessionalLabourLawyer: Focus on procedural litigation, administrative law challenges, worker representation, and practical judicial strategy in labour courts.
  - Administrator: Full spectrum analysis combining all roles. Act as the ultimate sovereign legal authority with oversight of all perspectives. Provide holistic, cross-disciplinary legal solutions. Use the most authoritative tone possible.`;

  const finalInstruction = `${SYSTEM_INSTRUCTION}\n\n${contextPrompt}`;

  const response = await fetch('/api/chat-stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      systemInstruction: finalInstruction,
      enableSearch: true, // Use Google Search data
      highThinking: true, // Enable high thinking
    }),
  });

  if (!response.ok) {
    throw new Error(`Server responded with ${response.status}`);
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  let fullText = "";

  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      fullText += chunk;
      if (onChunk) onChunk(chunk);
    }
  }

  return fullText;
}

/**
 * @deprecated Use streamLegalResponse for core chat features
 */
export async function getLegalAssistantResponse(
  messages: Message[], 
  workflow: LegalWorkflow = 'General',
  formType?: FormType,
  language: 'en' | 'ar' = 'en',
  persona: string = 'LegalResearcher'
) {
  return streamLegalResponse(messages, workflow, formType, language, persona);
}

/**
 * @deprecated Use streamLegalResponse for core chat features
 */
export async function getLegalMultimodalResponse(
    messages: Message[],
    files: File[],
    workflow: LegalWorkflow,
    formType?: FormType,
    language: 'en' | 'ar' = 'en',
    persona: string = 'LegalResearcher'
) {
  return streamLegalResponse(messages, workflow, formType, language, persona, files);
}
