import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

// Import local bundled worker URL from pdfjs-dist package (zero external network reliance)
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

if (typeof window !== 'undefined' && pdfjsLib) {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
  } catch (e) {
    console.warn('Could not set PDF worker URL', e);
  }
}

export interface ParsedDocumentResult {
  fileName: string;
  fileType: 'pdf' | 'docx' | 'txt' | 'pasted';
  text: string;
  charCount: number;
  wordCount: number;
  sectionsCount: number;
}

/**
 * Extract clean plain text from PDF File or ArrayBuffer
 */
export async function parsePdf(file: File | ArrayBuffer, fileName = 'document.pdf'): Promise<ParsedDocumentResult> {
  const buffer = file instanceof File ? await file.arrayBuffer() : file;
  
  try {
    const loadingTask = pdfjsLib.getDocument({ 
      data: buffer,
      useWorkerFetch: false,
    });
    const pdfDoc = await loadingTask.promise;
    
    let fullText = '';
    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const content = await page.getTextContent();
      
      let pageText = '';
      for (const item of content.items as any[]) {
        if ('str' in item) {
          if (item.hasEOL) {
            pageText += item.str + '\n';
          } else {
            pageText += item.str + ' ';
          }
        }
      }
      
      fullText += `--- Page ${pageNum} ---\n` + pageText.trim() + '\n\n';
    }

    return processExtractedText(fullText, fileName, 'pdf');
  } catch (err: any) {
    console.warn('PDF.js standard parse failed, attempting fallback raw stream decoding:', err);
    // Fallback: decode raw text streams from PDF buffer
    const uint8 = new Uint8Array(buffer);
    const rawString = new TextDecoder('latin1').decode(uint8);
    const textMatches = rawString.match(/\(([^()]{2,})\)\s*T[jJ]/g);
    if (textMatches && textMatches.length > 0) {
      const decoded = textMatches
        .map((m) => m.replace(/^[(\s]+|[)\sTjJ]+$/g, ''))
        .join(' ');
      return processExtractedText(decoded, fileName, 'pdf');
    }
    throw new Error(`Unable to extract readable text from PDF: ${err.message || 'Corrupt or protected PDF'}`);
  }
}

/**
 * Extract clean text from DOCX File or ArrayBuffer using Mammoth
 */
export async function parseDocx(file: File | ArrayBuffer, fileName = 'document.docx'): Promise<ParsedDocumentResult> {
  const buffer = file instanceof File ? await file.arrayBuffer() : file;
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  return processExtractedText(result.value, fileName, 'docx');
}

/**
 * Process raw text from user paste or text file upload
 */
export function parsePlainText(text: string, fileName = 'pasted_text.txt'): ParsedDocumentResult {
  return processExtractedText(text, fileName, 'pasted');
}

function processExtractedText(
  rawText: string,
  fileName: string,
  fileType: 'pdf' | 'docx' | 'txt' | 'pasted'
): ParsedDocumentResult {
  const cleaned = rawText.replace(/\r\n/g, '\n').trim();
  const words = cleaned.length ? cleaned.split(/\s+/).filter(Boolean).length : 0;
  
  // Count approximate major sections
  const sectionMatches = cleaned.match(/(?:SECTION|ARTICLE|CLAUSE|\bRULE\b)\s+\d+/gi);
  const sectionsCount = sectionMatches ? sectionMatches.length : Math.max(1, Math.round(words / 200));

  return {
    fileName,
    fileType,
    text: cleaned,
    charCount: cleaned.length,
    wordCount: words,
    sectionsCount,
  };
}
