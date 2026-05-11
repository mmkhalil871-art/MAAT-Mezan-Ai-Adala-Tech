import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';
import html2pdf from 'html2pdf.js';

/**
 * Downloads content as a PDF using html2pdf for high compatibility (RTL, Arabic).
 */
export async function downloadAsPDF(content: string, filename: string = 'legal_document.pdf', includeFooter: boolean = true) {
  const element = document.createElement('div');
  element.className = 'markdown-body pdf-export';
  element.style.padding = '40px';
  element.style.color = '#000';
  element.style.backgroundColor = '#fff';
  
  const footerHtml = includeFooter ? `
      <hr style="margin-top: 40px; border: 0; border-top: 1px solid #eee;"/>
      <div style="margin-top: 20px; font-size: 10pt; color: #666; text-align: center;">
        <strong>MAAT</strong><br/>
        <strong>Mezan Ai Adala Tech</strong><br/>
        <strong>Sovereign Legal Intelligent Assistant</strong>
      </div>
  ` : '';

  // Use a simpler approach for the PDF view
  element.innerHTML = `
    <div style="font-family: 'Times New Roman', serif; line-height: 1.6;">
      ${content}
      ${footerHtml}
    </div>
  `;

  const opt = {
    margin: [15, 15] as [number, number],
    filename: filename,
    image: { type: 'jpeg' as const, quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, letterRendering: true },
    jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
  };

  try {
    await html2pdf().set(opt).from(element).save();
  } catch (error) {
    console.error('PDF Generation Error:', error);
  }
}

/**
 * Downloads content as a Word document (.docx).
 */
export async function downloadAsWord(content: string, filename: string = 'legal_document.docx', includeFooter: boolean = true) {
  // Simple markdown parser for Word
  const paragraphs = content.split('\n').filter(line => line.trim() !== '').map(line => {
    let heading: (typeof HeadingLevel)[keyof typeof HeadingLevel] | undefined;
    const text = line.replace(/[#*`]/g, '').trim();
    let alignment: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.LEFT;
    
    // Detect Arabic for alignment
    if (/[\u0600-\u06FF]/.test(line)) {
      alignment = AlignmentType.RIGHT;
    }

    if (line.startsWith('### ')) heading = HeadingLevel.HEADING_3;
    else if (line.startsWith('## ')) heading = HeadingLevel.HEADING_2;
    else if (line.startsWith('# ')) heading = HeadingLevel.HEADING_1;

    return new Paragraph({
      children: [
        new TextRun({
          text: text,
          size: 24, // 12pt
          font: "Times New Roman"
        })
      ],
      heading: heading,
      alignment: alignment,
      spacing: { after: 200, line: 360 }
    });
  });

  if (includeFooter) {
    // Adding the mandatory signature
    paragraphs.push(new Paragraph({ children: [new TextRun({ text: "", break: 1 })] }));
    paragraphs.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: "--------------------------------------------------", color: "888888" }),
      ],
    }));
    paragraphs.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: "MAAT", bold: true, size: 20, color: "444444" }),
        new TextRun({ text: "", break: 1 }),
        new TextRun({ text: "Mezan Ai Adala Tech", bold: true, size: 18, color: "666666" }),
        new TextRun({ text: "", break: 1 }),
        new TextRun({ text: "Sovereign Legal Intelligent Assistant", bold: true, size: 16, color: "666666" }),
      ],
    }));
  }

  const doc = new Document({
    sections: [{
      properties: {},
      children: paragraphs,
    }],
  });

  try {
    const blob = await Packer.toBlob(doc);
    saveAs(blob, filename);
  } catch (error) {
    console.error('Word Generation Error:', error);
  }
}
