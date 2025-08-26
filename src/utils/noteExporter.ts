import type { Note } from '../types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Helper function to sanitize file names
const sanitizeFileName = (fileName: string): string => {
  return fileName
    .replace(/[^\w\s-]/g, '') // Remove special characters except spaces and hyphens
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .substring(0, 100); // Limit length
};

// Helper function to download file
const downloadFile = (content: string, fileName: string, mimeType: string): void => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up the URL object
  setTimeout(() => URL.revokeObjectURL(url), 100);
};

// Enhanced markdown to HTML converter
const markdownToHtml = (markdown: string): string => {
  if (!markdown || markdown.trim() === '') {
    return '<p>Kein Inhalt</p>';
  }

  let html = markdown;
  
  // Convert images first (before links)
  html = html.replace(/!\[([^\]]*)\]\(([^\)]*)\)/g, '<img src="$2" alt="$1" style="max-width: 100%; height: auto; border-radius: 8px; margin: 20px 0; display: block;" />');
  
  // Convert links
  html = html.replace(/\[([^\]]*)\]\(([^\)]*)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  
  // Convert headers (before other formatting)
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
  
  // Convert blockquotes
  html = html.replace(/^>\s*(.*)$/gim, '<blockquote>$1</blockquote>');
  
  // Convert code blocks (triple backticks)
  html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
  
  // Convert inline formatting
  html = html.replace(/\*\*([^*\n]+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*\n]+?)\*/g, '<em>$1</em>');
  html = html.replace(/`([^`]*)`/g, '<code>$1</code>');
  
  // Convert lists - improved version
  const lines = html.split('\n');
  const processedLines: string[] = [];
  let inUnorderedList = false;
  let inOrderedList = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Check for unordered list items
    const unorderedMatch = trimmedLine.match(/^[-*+]\s+(.+)$/);
    // Check for ordered list items
    const orderedMatch = trimmedLine.match(/^\d+\.\s+(.+)$/);
    
    if (unorderedMatch) {
      // Starting or continuing unordered list
      if (!inUnorderedList) {
        if (inOrderedList) {
          processedLines.push('</ol>');
          inOrderedList = false;
        }
        processedLines.push('<ul>');
        inUnorderedList = true;
      }
      processedLines.push(`<li>${unorderedMatch[1]}</li>`);
    } else if (orderedMatch) {
      // Starting or continuing ordered list
      if (!inOrderedList) {
        if (inUnorderedList) {
          processedLines.push('</ul>');
          inUnorderedList = false;
        }
        processedLines.push('<ol>');
        inOrderedList = true;
      }
      processedLines.push(`<li>${orderedMatch[1]}</li>`);
    } else {
      // Not a list item - close any open lists
      if (inUnorderedList) {
        processedLines.push('</ul>');
        inUnorderedList = false;
      }
      if (inOrderedList) {
        processedLines.push('</ol>');
        inOrderedList = false;
      }
      
      // Add the line (could be empty, header, paragraph, etc.)
      processedLines.push(line);
    }
  }
  
  // Close any remaining lists
  if (inUnorderedList) processedLines.push('</ul>');
  if (inOrderedList) processedLines.push('</ol>');
  
  html = processedLines.join('\n');
  
  // Convert paragraphs (skip lines that are already HTML elements)
  const paragraphs = html.split(/\n\s*\n/);
  html = paragraphs
    .filter(p => p.trim() !== '')
    .map(p => {
      const trimmed = p.trim();
      // Skip if already an HTML element or empty
      if (trimmed.match(/^<[^>]+>/) || trimmed === '') {
        return trimmed;
      }
      // Skip if it contains block elements
      if (trimmed.includes('<ul>') || trimmed.includes('<ol>') || 
          trimmed.includes('<h1>') || trimmed.includes('<h2>') || 
          trimmed.includes('<h3>') || trimmed.includes('<blockquote>') ||
          trimmed.includes('<pre>')) {
        return trimmed;
      }
      return `<p>${trimmed}</p>`;
    })
    .join('\n\n');
  
  return html;
};

// Markdown to clean text converter
export const markdownToText = (markdown: string): string => {
  return markdown
    .replace(/^#{1,6}\s+(.*)$/gm, '$1') // Remove headers
    .replace(/\*\*([^*]+?)\*\*/g, '$1') // Remove bold
    .replace(/\*([^*]+?)\*/g, '$1') // Remove italic
    .replace(/`([^`]*)`/g, '$1') // Remove code
    .replace(/\[([^\]]*)\]\([^\)]*\)/g, '$1') // Remove links, keep text
    .replace(/!\[([^\]]*)\]\([^\)]*\)/g, '[Bild: $1]') // Replace images with text
    .replace(/^[-*+]\s+/gm, '• ') // Convert unordered lists
    .replace(/^\d+\.\s+/gm, '• ') // Convert numbered lists
    .replace(/^>\s*/gm, '> ') // Clean up quotes
    .replace(/\n{3,}/g, '\n\n') // Clean up multiple newlines
    .trim();
};

// Export as plain text
export const exportAsTxt = (note: Note): void => {
  try {
    const content = `${note.title}\n${'='.repeat(note.title.length)}\n\n${markdownToText(note.content)}`;
    
    // Add metadata
    const metadata = `\n\n---\nErstellt: ${new Date(note.createdAt).toLocaleDateString('de-DE')}\nGeändert: ${new Date(note.updatedAt).toLocaleDateString('de-DE')}`;
    const tags = note.tags.length > 0 ? `\nTags: ${note.tags.join(', ')}` : '';
    
    const finalContent = content + metadata + tags;
    
    downloadFile(finalContent, `${sanitizeFileName(note.title || 'Unbenannte_Notiz')}.txt`, 'text/plain');
    console.log('TXT-Export erfolgreich:', note.title);
  } catch (error) {
    console.error('Fehler beim TXT-Export:', error);
    alert('Fehler beim Exportieren als TXT. Bitte versuchen Sie es erneut.');
  }
};

// Export as Markdown
export const exportAsMarkdown = (note: Note): void => {
  try {
    let content = `# ${note.title}\n\n${note.content}`;
    
    // Add metadata
    const metadata = `\n\n---\n**Erstellt:** ${new Date(note.createdAt).toLocaleDateString('de-DE')}\n**Geändert:** ${new Date(note.updatedAt).toLocaleDateString('de-DE')}`;
    const tags = note.tags.length > 0 ? `\n**Tags:** ${note.tags.join(', ')}` : '';
    
    content += metadata + tags;
    
    downloadFile(content, `${sanitizeFileName(note.title || 'Unbenannte_Notiz')}.md`, 'text/markdown');
    console.log('Markdown-Export erfolgreich:', note.title);
  } catch (error) {
    console.error('Fehler beim Markdown-Export:', error);
    alert('Fehler beim Exportieren als Markdown. Bitte versuchen Sie es erneut.');
  }
};

// Enhanced print function with optimized styling
export const printNote = (note: Note): void => {
  try {
    console.log('Druckvorschau gestartet für:', note.title);
    
    // Convert markdown to HTML
    const htmlContent = markdownToHtml(note.content);
    
    // Create print-optimized HTML
    const printHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>${note.title}</title>
          <style>
            @media print {
              @page {
                margin: 2cm;
                size: A4;
              }
              body {
                -webkit-print-color-adjust: exact;
                color-adjust: exact;
              }
            }
            
            * {
              box-sizing: border-box;
            }
            
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #1f2937;
              background: white;
              margin: 0;
              padding: 0;
              font-size: 14px;
            }
            
            .container {
              max-width: 100%;
              margin: 0 auto;
              padding: 20px;
            }
            
            .header {
              margin-bottom: 40px;
              padding-bottom: 20px;
              border-bottom: 2px solid #e5e7eb;
            }
            
            .title {
              font-size: 32px;
              font-weight: bold;
              color: #111827;
              margin: 0 0 10px 0;
            }
            
            .metadata {
              font-size: 12px;
              color: #6b7280;
              margin: 5px 0;
            }
            
            .tags {
              margin-top: 10px;
            }
            
            .tag {
              display: inline-block;
              background: #f3f4f6;
              color: #374151;
              padding: 4px 8px;
              border-radius: 4px;
              font-size: 11px;
              margin-right: 8px;
              margin-bottom: 4px;
            }
            
            .content {
              margin-top: 20px;
            }
            
            /* Enhanced markdown styling */
            h1, h2, h3, h4, h5, h6 {
              color: #111827;
              margin-top: 32px;
              margin-bottom: 16px;
              line-height: 1.25;
              page-break-after: avoid;
            }
            
            h1 {
              font-size: 28px;
              font-weight: bold;
              border-bottom: 2px solid #e5e7eb;
              padding-bottom: 8px;
            }
            
            h2 {
              font-size: 24px;
              font-weight: 600;
              border-bottom: 1px solid #e5e7eb;
              padding-bottom: 4px;
            }
            
            h3 {
              font-size: 20px;
              font-weight: 600;
            }
            
            h4 {
              font-size: 18px;
              font-weight: 600;
            }
            
            h5 {
              font-size: 16px;
              font-weight: 600;
            }
            
            h6 {
              font-size: 14px;
              font-weight: 600;
              color: #374151;
            }
            
            p {
              margin-bottom: 16px;
              line-height: 1.7;
            }
            
            blockquote {
              margin: 16px 0;
              padding: 16px;
              border-left: 4px solid #d1d5db;
              background: #f9fafb;
              font-style: italic;
              color: #374151;
            }
            
            ul, ol {
              margin: 16px 0;
              padding-left: 20px;
            }
            
            li {
              margin-bottom: 8px;
              line-height: 1.7;
            }
            
            code {
              background: #f3f4f6;
              color: #111827;
              padding: 2px 4px;
              border-radius: 4px;
              font-family: 'Monaco', 'Menlo', monospace;
              font-size: 13px;
            }
            
            pre {
              background: #f9fafb;
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              padding: 16px;
              overflow-x: auto;
              margin: 16px 0;
              page-break-inside: avoid;
            }
            
            pre code {
              background: none;
              padding: 0;
              font-size: 13px;
              line-height: 1.5;
            }
            
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 16px 0;
              page-break-inside: avoid;
            }
            
            th, td {
              border: 1px solid #e5e7eb;
              padding: 8px 12px;
              text-align: left;
            }
            
            th {
              background: #f9fafb;
              font-weight: 600;
            }
            
            img {
              max-width: 100%;
              height: auto;
              border-radius: 8px;
              margin: 16px 0;
              page-break-inside: avoid;
            }
            
            hr {
              border: none;
              border-top: 1px solid #e5e7eb;
              margin: 32px 0;
            }
            
            a {
              color: #2563eb;
              text-decoration: none;
            }
            
            a:hover {
              text-decoration: underline;
            }
            
            strong {
              font-weight: 600;
              color: #111827;
            }
            
            em {
              font-style: italic;
              color: #374151;
            }
            
            /* Print-specific styles */
            @media print {
              .header {
                margin-bottom: 30px;
                padding-bottom: 15px;
              }
              
              .title {
                font-size: 28px;
              }
              
              h1 {
                font-size: 24px;
              }
              
              h2 {
                font-size: 20px;
              }
              
              h3 {
                font-size: 18px;
              }
              
              h4 {
                font-size: 16px;
              }
              
              h5 {
                font-size: 14px;
              }
              
              h6 {
                font-size: 13px;
              }
              
              p {
                margin-bottom: 12px;
              }
              
              ul, ol {
                margin: 12px 0;
              }
              
              li {
                margin-bottom: 6px;
              }
              
              blockquote {
                margin: 12px 0;
                padding: 12px;
              }
              
              pre {
                margin: 12px 0;
                padding: 12px;
              }
              
              table {
                margin: 12px 0;
              }
              
              img {
                margin: 12px 0;
              }
              
              hr {
                margin: 24px 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 class="title">${note.title}</h1>
              <div class="metadata">
                <div>📅 Erstellt: ${new Date(note.createdAt).toLocaleDateString('de-DE', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</div>
                <div>✏️ Geändert: ${new Date(note.updatedAt).toLocaleDateString('de-DE', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</div>
              </div>
              ${note.tags.length > 0 ? `
                <div class="tags">
                  <strong>🏷️ Tags:</strong>
                  ${note.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                </div>
              ` : ''}
            </div>
            
            <div class="content">
              ${htmlContent}
            </div>
          </div>
        </body>
      </html>
    `;
    
    // Open print preview in new window
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printHtml);
      printWindow.document.close();
      
      // Wait for content to load, then print
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 500);
      };
    } else {
      alert('Popup wurde blockiert. Bitte erlauben Sie Popups für diese Seite.');
    }
    
    console.log('Druckvorschau geöffnet für:', note.title);
  } catch (error) {
    console.error('Fehler beim Drucken:', error);
    alert('Fehler beim Öffnen der Druckvorschau. Bitte versuchen Sie es erneut.');
  }
};

// Enhanced PDF export with better image handling
export const exportAsPdf = async (note: Note): Promise<void> => {
  try {
    console.log('PDF-Export gestartet für:', note.title);
    
    // Convert markdown to HTML
    const htmlContent = markdownToHtml(note.content);
    
    // Create a temporary container for rendering
    const tempContainer = document.createElement('div');
    tempContainer.style.cssText = `
      position: absolute;
      top: -10000px;
      left: -10000px;
      width: 800px;
      padding: 60px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #1f2937;
      background: white;
      font-size: 14px;
    `;
    
    // Create styled HTML content
    tempContainer.innerHTML = `
      <div style="border-bottom: 3px solid #3b82f6; padding-bottom: 24px; margin-bottom: 40px;">
        <h1 style="font-size: 32px; font-weight: 700; color: #111827; margin: 0 0 16px 0; line-height: 1.2;">
          ${note.title}
        </h1>
        <div style="color: #6b7280; font-size: 12px; display: flex; gap: 24px; flex-wrap: wrap;">
          <span><strong>Erstellt:</strong> ${new Date(note.createdAt).toLocaleDateString('de-DE')}</span>
          <span><strong>Geändert:</strong> ${new Date(note.updatedAt).toLocaleDateString('de-DE')}</span>
        </div>
        ${note.tags.length > 0 ? `
          <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px;">
            ${note.tags.map(tag => `
              <span style="background: #e0f2fe; color: #0277bd; padding: 6px 12px; border-radius: 6px; font-size: 11px; font-weight: 500;">
                ${tag}
              </span>
            `).join('')}
          </div>
        ` : ''}
      </div>
      
      <div id="content" style="font-size: 14px; line-height: 1.8;">
        ${htmlContent}
      </div>
      
      <div style="margin-top: 60px; padding-top: 24px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 11px; text-align: center;">
        Exportiert aus TaskFuchs • ${new Date().toLocaleDateString('de-DE')}
      </div>
    `;
    
    // Enhanced styling function
    const applyEnhancedStyles = (container: HTMLElement) => {
      const contentDiv = container.querySelector('#content');
      if (!contentDiv) return;
      
      // Style all elements
      const elements = contentDiv.querySelectorAll('*');
      elements.forEach(element => {
        const el = element as HTMLElement;
        const tagName = el.tagName.toLowerCase();
        
        switch (tagName) {
          case 'h1':
            el.style.cssText = 'font-size: 24px; font-weight: 700; color: #111827; margin: 40px 0 16px 0; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; line-height: 1.3;';
            break;
          case 'h2':
            el.style.cssText = 'font-size: 20px; font-weight: 600; color: #1f2937; margin: 32px 0 14px 0; line-height: 1.3;';
            break;
          case 'h3':
            el.style.cssText = 'font-size: 16px; font-weight: 600; color: #374151; margin: 24px 0 12px 0; line-height: 1.4;';
            break;
          case 'p':
            el.style.cssText = 'margin: 16px 0; text-align: justify; line-height: 1.7;';
            break;
          case 'strong':
            el.style.cssText = 'font-weight: 600; color: #111827;';
            break;
          case 'em':
            el.style.cssText = 'font-style: italic; color: #4b5563;';
            break;
          case 'code':
            el.style.cssText = 'background: #f3f4f6; padding: 3px 6px; border-radius: 4px; font-family: "SF Mono", Monaco, monospace; font-size: 12px; color: #dc2626; border: 1px solid #e5e7eb;';
            break;
          case 'pre':
            el.style.cssText = 'background: #f8fafc; padding: 16px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0; font-family: "SF Mono", Monaco, monospace; font-size: 12px; overflow-x: auto;';
            break;
          case 'ul':
            el.style.cssText = 'padding-left: 24px; margin: 16px 0; list-style-type: disc;';
            break;
          case 'ol':
            el.style.cssText = 'padding-left: 24px; margin: 16px 0; list-style-type: decimal;';
            break;
          case 'li':
            el.style.cssText = 'margin: 8px 0; line-height: 1.6;';
            break;
          case 'blockquote':
            el.style.cssText = 'border-left: 4px solid #3b82f6; background: #f8fafc; margin: 24px 0; padding: 16px 20px; font-style: italic; color: #475569; border-radius: 0 8px 8px 0;';
            break;
          case 'a':
            el.style.cssText = 'color: #3b82f6; text-decoration: none; border-bottom: 1px dotted #93c5fd;';
            break;
          case 'img':
            el.style.cssText = 'max-width: 100%; height: auto; border-radius: 8px; margin: 24px 0; display: block; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);';
            break;
        }
      });
    };
    
    // Function to load and convert images to base64
    const loadImagesAsBase64 = async (container: HTMLElement): Promise<void> => {
      const images = container.querySelectorAll('img');
      const imagePromises = Array.from(images).map(async (img) => {
        return new Promise<void>((resolve) => {
          if (img.src.startsWith('data:')) {
            resolve();
            return;
          }
          
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          const tempImg = new Image();
          
          tempImg.crossOrigin = 'anonymous';
          
          tempImg.onload = () => {
            try {
              canvas.width = tempImg.naturalWidth;
              canvas.height = tempImg.naturalHeight;
              ctx?.drawImage(tempImg, 0, 0);
              
              const dataURL = canvas.toDataURL('image/png', 0.9);
              img.src = dataURL;
              
              console.log('✓ Bild erfolgreich konvertiert:', img.alt || img.src.substring(0, 50) + '...');
            } catch (error) {
              console.warn('Fehler beim Konvertieren des Bildes:', error);
              // Setze Platzhalter-Bild
              img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDMwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjZjNmNGY2IiBzdHJva2U9IiNkMWQ1ZGIiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWRhc2hhcnJheT0iMTAiLz4KPHA+CjxyZWN0IHg9IjEyMCIgeT0iNzUiIHdpZHRoPSI2MCIgaGVpZ2h0PSI1MCIgZmlsbD0iIzljYTNhZiIgcng9IjUiLz4KPHA+CjxjaXJjbGUgY3g9IjEzNSIgY3k9Ijg1IiByPSI1IiBmaWxsPSIjNjY2NiIvPgo8cGF0aCBkPSJNMTI1IDEwNUwxMzUgOTVMMTQ1IDEwNUwxNjUgOTVMMTc1IDEwNUwxNzUgMTE1TDEyNSAxMTVaIiBmaWxsPSIjNjY2NiIvPgo8L3N2Zz4K';
            }
            resolve();
          };
          
          tempImg.onerror = () => {
            console.warn('Bild konnte nicht geladen werden:', img.src);
            // Setze Platzhalter-Bild
            img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDMwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjZjNmNGY2IiBzdHJva2U9IiNkMWQ1ZGIiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWRhc2hhcnJheT0iMTAiLz4KPHA+CjxyZWN0IHg9IjEyMCIgeT0iNzUiIHdpZHRoPSI2MCIgaGVpZ2h0PSI1MCIgZmlsbD0iIzljYTNhZiIgcng9IjUiLz4KPHA+CjxjaXJjbGUgY3g9IjEzNSIgY3k9Ijg1IiByPSI1IiBmaWxsPSIjNjY2NiIvPgo8cGF0aCBkPSJNMTI1IDEwNUwxMzUgOTVMMTQ1IDEwNUwxNjUgOTVMMTc1IDEwNUwxNzUgMTE1TDEyNSAxMTVaIiBmaWxsPSIjNjY2NiIvPgo8L3N2Zz4K';
            resolve();
          };
          
          tempImg.src = img.src;
        });
      });
      
      await Promise.all(imagePromises);
    };
    
    // Add container to DOM
    document.body.appendChild(tempContainer);
    
    // Apply styles
    applyEnhancedStyles(tempContainer);
    
    // Load images and generate PDF
    await loadImagesAsBase64(tempContainer);
    
    // Wait for everything to render
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Generate PDF
    const canvas = await html2canvas(tempContainer, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: tempContainer.scrollWidth,
      height: tempContainer.scrollHeight,
      logging: false
    });
    
    // Remove temporary container
    document.body.removeChild(tempContainer);
    
    // Create PDF with proper page handling
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4'
    });
    
    const imgData = canvas.toDataURL('image/png', 1.0);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pdfWidth - 40; // 20pt margin on each side
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    let yPosition = 0;
    let pageNumber = 1;
    
    // Add content to PDF, creating new pages as needed
    while (yPosition < imgHeight) {
      const remainingHeight = imgHeight - yPosition;
      const pageContentHeight = Math.min(remainingHeight, pdfHeight - 40);
      
      pdf.addImage(
        imgData,
        'PNG',
        20,
        20 - yPosition,
        imgWidth,
        imgHeight,
        undefined,
        'FAST'
      );
      
      yPosition += pdfHeight - 40;
      
      if (yPosition < imgHeight) {
        pdf.addPage();
        pageNumber++;
      }
    }
    
    // Save PDF
    const fileName = `${sanitizeFileName(note.title || 'Unbenannte_Notiz')}.pdf`;
    pdf.save(fileName);
    
    console.log('✅ PDF erfolgreich erstellt:', fileName);
    
  } catch (error) {
    console.error('❌ Fehler beim PDF-Export:', error);
    alert('Fehler beim PDF-Export. Bitte versuchen Sie es erneut.');
  }
}; 