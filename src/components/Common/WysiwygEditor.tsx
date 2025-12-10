import React, { useState, useRef, useEffect } from 'react';
import { 
  Bold, 
  Italic, 
  Code, 
  List, 
  ListOrdered, 
  CheckSquare, 
  Link, 
  Minus, 
  HelpCircle,
  Type,
  Quote,
  Eye,
  Edit3,
  Image,
  ChevronDown,
  Upload,
  Link2
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { handleImagePaste, getImageMarkdownReference } from '../../utils/imageStorage';
import type { Note } from '../../types';

interface WysiwygEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: number;
  maxHeight?: number;
  showToolbar?: boolean;
  useFullHeight?: boolean; // New prop to force full height usage
  onClickOutside?: () => void; // New prop for click outside functionality
  autoFocus?: boolean; // Auto focus textarea when mounted
}

export function WysiwygEditor({ 
  value, 
  onChange, 
  placeholder = "Text eingeben...", 
  className = "",
  minHeight = 120,
  maxHeight = 800,
  showToolbar = true,
  useFullHeight = false,
  onClickOutside,
  autoFocus = false
}: WysiwygEditorProps) {
  const { state, dispatch } = useApp();
  const [isPreviewMode, setIsPreviewMode] = useState(false); // Immer im Edit-Modus, da kein Switch mehr vorhanden
  const [showMarkdownHelp, setShowMarkdownHelp] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [isProcessingUrls, setIsProcessingUrls] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Cache for scraped titles to avoid repeated requests
  const titleCacheRef = useRef<Map<string, string>>(new Map());

  // Handle click outside to switch to preview mode
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (editorRef.current && !editorRef.current.contains(event.target as Node) && onClickOutside) {
        onClickOutside();
      }
    };

    if (onClickOutside) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [onClickOutside]);

  const getAccentColorStyles = () => {
    const accentColor = state.preferences.accentColor;
    return {
      text: { color: accentColor },
      bg: { backgroundColor: accentColor },
      border: { borderColor: accentColor },
    };
  };

  // Prevent toolbar buttons from stealing focus from the textarea
  const preventMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  // Auto-convert image URLs to markdown image syntax
  const autoConvertImageUrls = (text: string): string => {
    // Split text into lines to process each line separately
    return text.split('\n').map(line => {
      // Skip lines that already contain markdown image syntax
      if (line.includes('![') && line.includes('](')) {
        return line;
      }
      
      // Find standalone image URLs in the line
      return line.replace(
        /(^|\s)(https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|tiff)(\?[^\s]*)?)/gi,
        (match, prefix, url) => {
          // Extract filename for alt text
          const urlParts = url.split('/');
          const filename = urlParts[urlParts.length - 1].split('?')[0];
          const altText = filename.replace(/\.[^.]*$/, '').replace(/[_-]/g, ' ');
          return `${prefix}![${altText}](${url})`;
        }
      );
    }).join('\n');
  };

  // Fetch page title from URL with caching and parallel requests
  const fetchPageTitle = async (url: string): Promise<string> => {
    // Check cache first
    if (titleCacheRef.current.has(url)) {
      return titleCacheRef.current.get(url)!;
    }
    
    try {
      // Skip localhost and local development URLs
      const urlObj = new URL(url);
      if (urlObj.hostname === 'localhost' || 
          urlObj.hostname === '127.0.0.1' ||
          urlObj.hostname.startsWith('192.168.') ||
          urlObj.hostname.startsWith('10.') ||
          urlObj.hostname.includes('local')) {
        const fallback = getDomainName(url);
        addToCache(url, fallback);
        return fallback;
      }
      
      // Try direct URL extraction first for known patterns (fastest)
      const directTitle = extractTitleFromUrl(url);
      if (directTitle) {
        addToCache(url, directTitle);
        return directTitle;
      }
      
      // Create parallel proxy requests with timeouts
      const proxies = [
        {
          url: `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
          type: 'allorigins'
        },
        {
          url: `https://corsproxy.io/?${encodeURIComponent(url)}`,
          type: 'corsproxy'
        }
      ];
      
      const fetchWithTimeout = async (proxyConfig: any, timeoutMs: number = 3000) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        
        try {
          const response = await fetch(proxyConfig.url, {
            signal: controller.signal,
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; TaskFuchs/1.0)',
            }
          });
          
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          
          let htmlContent = '';
          if (proxyConfig.type === 'allorigins') {
            const data = await response.json();
            htmlContent = data.contents || '';
          } else {
            htmlContent = await response.text();
          }
          
          if (htmlContent) {
            const title = extractTitleFromHtml(htmlContent);
            if (title && title !== getDomainName(url)) {
              return title;
            }
          }
          
          throw new Error('No valid title found');
        } catch (error) {
          clearTimeout(timeoutId);
          throw error;
        }
      };
      
             // Race all proxy requests - first successful wins
       try {
         const title = await Promise.any(
           proxies.map(proxy => fetchWithTimeout(proxy, 2500))
         );
         
         addToCache(url, title);
         return title;
       } catch (error) {
         // All proxies failed, fallback to domain name
         const fallback = getDomainName(url);
         addToCache(url, fallback);
         return fallback;
       }
      
    } catch (error) {
      const fallback = getDomainName(url);
      addToCache(url, fallback);
      return fallback;
    }
  };

  // Extract title from HTML content
  const extractTitleFromHtml = (html: string): string => {
    // Try multiple title extraction methods
    const methods = [
      // Standard title tag
      () => {
        const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        return match ? match[1].trim() : null;
      },
      // Open Graph title
      () => {
        const match = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["'][^>]*>/i);
        return match ? match[1].trim() : null;
      },
      // Twitter title
      () => {
        const match = html.match(/<meta[^>]*name=["']twitter:title["'][^>]*content=["']([^"']+)["'][^>]*>/i);
        return match ? match[1].trim() : null;
      },
      // Alternative meta title
      () => {
        const match = html.match(/<meta[^>]*name=["']title["'][^>]*content=["']([^"']+)["'][^>]*>/i);
        return match ? match[1].trim() : null;
      }
    ];
    
    for (const method of methods) {
      try {
        const title = method();
        if (title) {
          return cleanTitle(title);
        }
      } catch (e) {
        continue;
      }
    }
    
    return '';
  };

  // Clean and format title
  const cleanTitle = (title: string): string => {
    return title
      // Decode HTML entities
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec))
      .replace(/&#x([a-fA-F0-9]+);/g, (match, hex) => String.fromCharCode(parseInt(hex, 16)))
      // Remove common site suffixes (but be more careful)
      .replace(/\s*[\|\-–—]\s*.{1,30}$/, '') // Remove short suffixes after | or -
      .replace(/^\s*.{1,30}:\s*/, '') // Remove short prefixes before :
      // Clean up whitespace
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Extract title from URL for special cases (fastest method)
  const extractTitleFromUrl = (url: string): string => {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      
      // Wikipedia special handling - high quality titles
      if (urlObj.hostname.includes('wikipedia.org')) {
        const match = pathname.match(/\/wiki\/(.+)$/);
        if (match) {
          let title = decodeURIComponent(match[1])
            .replace(/_/g, ' ')
            .replace(/\([^)]*\)/g, '') // Remove disambiguation
            .trim();
          
          // Add Wikipedia suffix for clarity
          return title + (urlObj.hostname.includes('de.') ? ' - Wikipedia' : ' - Wikipedia');
        }
      }
      
      // GitHub special handling
      if (urlObj.hostname.includes('github.com')) {
        const parts = pathname.split('/').filter(Boolean);
        if (parts.length >= 2) {
          return `${parts[1]} - ${parts[0]} - GitHub`;
        }
      }
      
      // YouTube special handling
      if (urlObj.hostname.includes('youtube.com') && urlObj.searchParams.has('v')) {
        return 'YouTube Video'; // Will be replaced by actual scraping
      }
      
      // Stack Overflow special handling
      if (urlObj.hostname.includes('stackoverflow.com')) {
        const match = pathname.match(/\/questions\/\d+\/([^/]+)/);
        if (match) {
          return decodeURIComponent(match[1])
            .replace(/-/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase()) + ' - Stack Overflow';
        }
      }
      
      // General URL-based title extraction for blogs/articles
      if (pathname && pathname !== '/') {
        const lastPart = pathname.split('/').pop();
        if (lastPart && lastPart !== 'index.html' && !lastPart.includes('.')) {
          return lastPart
            .replace(/[-_]/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase()) // Title case
            .trim();
        }
      }
    } catch (e) {
      // Ignore URL parsing errors
    }
    
    return '';
  };

  // Manage cache size to prevent memory leaks
  const addToCache = (url: string, title: string) => {
    const cache = titleCacheRef.current;
    
    // Limit cache size to 100 entries
    if (cache.size >= 100) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }
    
    cache.set(url, title);
  };

  // Helper function to extract a clean domain name
  const getDomainName = (url: string): string => {
    try {
      const urlObj = new URL(url);
      let domain = urlObj.hostname.replace('www.', '');
      
      // Capitalize first letter for better presentation
      domain = domain.charAt(0).toUpperCase() + domain.slice(1);
      
      return domain;
    } catch {
      return 'Link';
    }
  };

  // Auto-convert web URLs to markdown link syntax
  const autoConvertWebUrls = async (text: string): Promise<string> => {
    // Split text into lines to process each line separately
    const lines = text.split('\n');
    const processedLines = await Promise.all(
      lines.map(async (line) => {
        // Skip lines that already contain markdown link or image syntax
        if ((line.includes('[') && line.includes('](')) || line.includes('![')) {
          return line;
        }
        
        // Enhanced URL regex to better match URLs but exclude image URLs
        const urlRegex = /(^|\s)(https?:\/\/[^\s<>"{}|\\^`\[\]]+)(?!\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|tiff)(\?[^\s]*)?)/gi;
        const matches = [...line.matchAll(urlRegex)];
        
        if (matches.length === 0) {
          return line;
        }
        
        // Process each URL in the line
        let processedLine = line;
        for (const match of matches.reverse()) { // Reverse to maintain correct indices
          const [fullMatch, prefix, url] = match;
          try {
            // Clean up URL (remove trailing punctuation that might be part of sentence)
            const cleanUrl = url.replace(/[.,;:!?]+$/, '');
            const title = await fetchPageTitle(cleanUrl);
            const replacement = `${prefix}[${title}](${cleanUrl})`;
            const startIndex = match.index!;
            const endIndex = startIndex + fullMatch.length;
            
            // Adjust end index if we removed trailing punctuation
            const adjustedEndIndex = endIndex - (url.length - cleanUrl.length);
            processedLine = processedLine.slice(0, startIndex) + replacement + processedLine.slice(adjustedEndIndex);
          } catch (error) {
            console.warn('Failed to process URL:', url, error);
          }
        }
        
        return processedLine;
      })
    );
    
    return processedLines.join('\n');
  };

  // Convert markdown to HTML for display
  const markdownToHtml = (markdown: string): string => {
    if (!markdown) return '';
    
    // Split into lines for better processing
    const lines = markdown.split('\n');
    const processedLines: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      
      // Images
      line = line.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, src) => {
        return `<img src="${src}" alt="${alt}" class="max-w-full h-auto rounded-lg shadow-md border border-gray-200 dark:border-gray-600 my-2" style="max-height: 400px; object-fit: contain;" onError="this.style.display='none'; this.nextSibling.style.display='block';" /><div style="display:none;" class="text-sm text-gray-500 dark:text-gray-400 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg border border-dashed border-gray-300 dark:border-gray-600">❌ Bild konnte nicht geladen werden:<br/><code class="text-xs break-all">${src}</code></div>`;
      });
      
      // Headers
      if (line.startsWith('### ')) {
        line = `<h3 class="text-lg font-semibold mt-4 mb-2">${line.substring(4)}</h3>`;
      } else if (line.startsWith('## ')) {
        line = `<h2 class="text-xl font-semibold mt-4 mb-2">${line.substring(3)}</h2>`;
      } else if (line.startsWith('# ')) {
        line = `<h1 class="text-2xl font-bold mt-4 mb-2">${line.substring(2)}</h1>`;
      }
      // Blockquotes
      else if (line.startsWith('> ')) {
        line = `<blockquote class="border-l-4 border-gray-300 dark:border-gray-600 pl-4 italic text-gray-600 dark:text-gray-400 my-2">${line.substring(2)}</blockquote>`;
      }
      // Horizontal rule
      else if (line.trim() === '---') {
        line = '<hr class="border-gray-300 dark:border-gray-600 my-4">';
      }
      // Checkboxes (process before lists)
      else if (line.match(/^- \[ \] /)) {
        const text = line.substring(6);
        line = `<div class="flex items-center my-0.5 wysiwyg-checkbox-item"><input type="checkbox" data-line-index="${i}" class="mr-2 accent-current cursor-pointer" onclick="window.toggleCheckbox(${i}, false)"> <span>${text}</span></div>`;
      } else if (line.match(/^- \[x\] /)) {
        const text = line.substring(6);
        line = `<div class="flex items-center my-0.5 wysiwyg-checkbox-item"><input type="checkbox" data-line-index="${i}" checked class="mr-2 accent-current cursor-pointer" onclick="window.toggleCheckbox(${i}, true)"> <span class="line-through text-gray-500 dark:text-gray-400">${text}</span></div>`;
      }
      // Unordered lists
      else if (line.match(/^- /)) {
        const text = line.substring(2);
        line = `<div class="flex items-start gap-2 my-0.5 wysiwyg-list-item"><span class="text-gray-600 dark:text-gray-400 mt-1 select-none" style="line-height: 1.2;">•</span><span class="flex-1" style="line-height: 1.2;">${text}</span></div>`;
      }
      // Ordered lists
      else if (line.match(/^\d+\. /)) {
        const match = line.match(/^(\d+)\. (.*)$/);
        if (match) {
          const [, number, text] = match;
          line = `<div class="flex items-start gap-2 my-0.5 wysiwyg-list-item"><span class="text-gray-600 dark:text-gray-400 mt-1 min-w-[1.5rem] select-none" style="line-height: 1.2;">${number}.</span><span class="flex-1" style="line-height: 1.2;">${text}</span></div>`;
        }
      }
      
      // Inline formatting
      line = line
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code class="bg-gray-100 dark:bg-gray-700 px-1 rounded text-sm">$1</code>')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="underline text-blue-600 dark:text-blue-400 hover:opacity-80" target="_blank" rel="noopener noreferrer">$1</a>');
      
      processedLines.push(line);
    }
    
    // Process lines without grouping (since we use divs instead of ul/ol)
    const finalLines: string[] = [];
    
    for (let i = 0; i < processedLines.length; i++) {
      const line = processedLines[i];
      
      if (line.trim()) {
        finalLines.push(line);
      } else {
        finalLines.push('<br>');
      }
    }
    
    return finalLines.join('\n');
  };

  // Handle checkbox clicks in preview mode
  const handleCheckboxClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLInputElement;
    if (target.type === 'checkbox' && target.dataset.lineIndex) {
      e.preventDefault(); // Prevent default checkbox behavior
      e.stopPropagation(); // Stop event from bubbling up to container
      
      const lineIndex = parseInt(target.dataset.lineIndex);
      const lines = value.split('\n');
      
      if (lineIndex < lines.length) {
        const line = lines[lineIndex];
        let newLine = '';
        
        if (line.match(/^- \[ \] /)) {
          // Unchecked -> Checked
          newLine = line.replace(/^- \[ \] /, '- [x] ');
        } else if (line.match(/^- \[x\] /)) {
          // Checked -> Unchecked
          newLine = line.replace(/^- \[x\] /, '- [ ] ');
        }
        
        if (newLine) {
          const newLines = [...lines];
          newLines[lineIndex] = newLine;
          onChange(newLines.join('\n'));
        }
      }
    }
  };

  // Create global toggle function for checkboxes
  React.useEffect(() => {
    const toggleCheckbox = (lineIndex: number, isCurrentlyChecked: boolean) => {
      const lines = value.split('\n');
      
      if (lineIndex < lines.length) {
        const line = lines[lineIndex];
        let newLine = '';
        
        if (isCurrentlyChecked) {
          // Currently checked -> Uncheck
          newLine = line.replace(/^- \[x\] /, '- [ ] ');
        } else {
          // Currently unchecked -> Check
          newLine = line.replace(/^- \[ \] /, '- [x] ');
        }
        
        if (newLine && newLine !== line) {
          const newLines = [...lines];
          newLines[lineIndex] = newLine;
          onChange(newLines.join('\n'));
        }
      }
    };

    // Attach to window object
    (window as any).toggleCheckbox = toggleCheckbox;

    // Cleanup function
    return () => {
      delete (window as any).toggleCheckbox;
    };
  }, [value, onChange]);

  const insertFormatting = (before: string, after: string = '') => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    
    const newText = value.substring(0, start) + before + selectedText + after + value.substring(end);
    onChange(newText);
    
    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, end + before.length);
    }, 0);
  };

  const insertList = (ordered: boolean = false) => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const lines = value.split('\n');
    const currentLineIndex = value.substring(0, start).split('\n').length - 1;
    const prefix = ordered ? '1. ' : '- ';
    lines[currentLineIndex] = prefix + (lines[currentLineIndex] || '');
    const newText = lines.join('\n');
    onChange(newText);
    // Restore focus and place caret where it was, shifted by prefix length
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length);
    }, 0);
  };

  const insertHeading = (level: number) => {
    const prefix = '#'.repeat(level) + ' ';
    insertFormatting(prefix);
  };

  const insertLink = () => {
    const url = prompt('Link-URL eingeben:');
    if (url) {
      const text = prompt('Link-Text eingeben:', url);
      insertFormatting(`[${text || url}](${url})`);
    }
  };

  const insertImage = () => {
    insertFormatting('![Alt-Text](Bild-URL)');
  };

  const insertText = (text: string) => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    const newValue = value.substring(0, start) + text + value.substring(end);
    onChange(newValue);
    
    // Set cursor position after the inserted text
    setTimeout(() => {
      const newPos = start + text.length;
      textarea.setSelectionRange(newPos, newPos);
      textarea.focus();
    }, 0);
  };

  const insertHorizontalRule = () => {
    insertFormatting('\n---\n');
  };

  const insertBlockquote = () => {
    insertFormatting('> ');
  };

  const insertCheckbox = () => {
    insertFormatting('- [ ] ');
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    // First check for images in clipboard
    const imageResult = await handleImagePaste(e.nativeEvent, state.imageStorage);
    
    if (imageResult.error) {
      console.error('Error pasting image:', imageResult.error);
      // TODO: Show error notification
    }
    
    if (imageResult.image && imageResult.updatedStorage) {
      // Prevent default text paste since we're handling an image
      e.preventDefault();
      
      // Update image storage
      dispatch({ type: 'SET_IMAGE_STORAGE', payload: imageResult.updatedStorage });
      
      // Insert image markdown at cursor position
      const markdown = getImageMarkdownReference(imageResult.image);
      
      if (!textareaRef.current) return;
      
      const textarea = textareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      
      const newValue = value.substring(0, start) + markdown + value.substring(end);
      onChange(newValue);
      
      // Set cursor position after the inserted markdown
      setTimeout(() => {
        textarea.setSelectionRange(start + markdown.length, start + markdown.length);
        textarea.focus();
      }, 0);
      
      return;
    }
    
    // If no image was pasted, handle text paste
    const pastedText = e.clipboardData.getData('text');
    
    // Skip if text already contains markdown syntax
    if ((pastedText.includes('[') && pastedText.includes('](')) || pastedText.includes('![')) {
      return; // Let default paste behavior handle it
    }
    
    // Check if pasted text contains image URLs
    const imageUrlPattern = /https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|tiff)(\?[^\s]*)?/gi;
    // Check if pasted text contains web URLs (not images)
    const webUrlPattern = /https?:\/\/[^\s<>"{}|\\^`\[\]]+(?!\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|tiff)(\?[^\s]*)?)/gi;
    
    const hasImageUrls = imageUrlPattern.test(pastedText);
    const hasWebUrls = webUrlPattern.test(pastedText);
    
    if (hasImageUrls || hasWebUrls) {
      e.preventDefault();
      
      if (!textareaRef.current) return;
      
      const textarea = textareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      
      // First convert images
      let convertedText = autoConvertImageUrls(pastedText);
      
      // Then convert web URLs (async)
      if (hasWebUrls) {
        setIsProcessingUrls(true);
        try {
          convertedText = await autoConvertWebUrls(convertedText);
        } catch (error) {
          console.warn('Failed to convert web URLs:', error);
        } finally {
          setIsProcessingUrls(false);
        }
      }
      
      const newValue = value.substring(0, start) + convertedText + value.substring(end);
      onChange(newValue);
      
      setTimeout(() => {
        const newPos = start + convertedText.length;
        textarea.setSelectionRange(newPos, newPos);
      }, 0);
    }
  };

  const handleBlur = async () => {
    // Auto-convert image URLs when user finishes editing
    let convertedValue = autoConvertImageUrls(value);
    
    // Auto-convert web URLs when user finishes editing
    const webUrlPattern = /https?:\/\/[^\s<>"{}|\\^`\[\]]+(?!\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|tiff)(\?[^\s]*)?)/gi;
    
    // Only process if there are URLs that aren't already in markdown format
    const hasUrls = webUrlPattern.test(convertedValue);
    const hasMarkdownLinks = convertedValue.includes('[') && convertedValue.includes('](');
    
    if (hasUrls && !hasMarkdownLinks) {
      setIsProcessingUrls(true);
      try {
        convertedValue = await autoConvertWebUrls(convertedValue);
      } catch (error) {
        console.warn('Failed to convert web URLs on blur:', error);
      } finally {
        setIsProcessingUrls(false);
      }
    }
    
    if (convertedValue !== value) {
      onChange(convertedValue);
    }
  };

  const handleChange = (newValue: string) => {
    onChange(newValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      const textarea = e.currentTarget;
      const cursorPos = textarea.selectionStart;
      const textBeforeCursor = value.substring(0, cursorPos);
      const lines = textBeforeCursor.split('\n');
      const currentLine = lines[lines.length - 1];

      // Check for checkbox list FIRST - handles all checkbox formats including "- [ ]", "- []", "- [x]"
      const checkboxMatch = currentLine.match(/^(\s*)(-|\*|\+)\s*\[[ xX]?\]\s*(.*)$/);
      if (checkboxMatch) {
        const [, indent, bullet, content] = checkboxMatch;
        
        // If the line is empty (just checkbox), remove it and unindent
        if (!content.trim()) {
          e.preventDefault();
          const beforeCurrentLine = textBeforeCursor.substring(0, textBeforeCursor.lastIndexOf('\n') >= 0 ? textBeforeCursor.lastIndexOf('\n') : 0);
          const afterCursor = value.substring(cursorPos);
          const newValue = beforeCurrentLine + afterCursor;
          onChange(newValue);
          
          setTimeout(() => {
            const newPos = beforeCurrentLine.length;
            textarea.setSelectionRange(newPos, newPos);
          }, 0);
          return;
        }

        // Continue the checkbox list with a new unchecked checkbox
        e.preventDefault();
        const newListItem = `\n${indent}${bullet} [ ] `;
        const beforeCursor = value.substring(0, cursorPos);
        const afterCursor = value.substring(cursorPos);
        const newValue = beforeCursor + newListItem + afterCursor;
        onChange(newValue);
        
        setTimeout(() => {
          const newPos = cursorPos + newListItem.length;
          textarea.setSelectionRange(newPos, newPos);
        }, 0);
        return;
      }

      // Check for unordered list (but NOT checkboxes)
      const unorderedMatch = currentLine.match(/^(\s*)([-*+])\s(?!\[[ xX]?\])(.*)$/);
      if (unorderedMatch) {
        const [, indent, bullet, content] = unorderedMatch;
        
        // If the line is empty (just bullet), remove it and unindent
        if (!content.trim()) {
          e.preventDefault();
          const beforeCursor = value.substring(0, cursorPos - currentLine.length);
          const afterCursor = value.substring(cursorPos);
          const newValue = beforeCursor + afterCursor;
          onChange(newValue);
          
          setTimeout(() => {
            const newPos = cursorPos - currentLine.length;
            textarea.setSelectionRange(newPos, newPos);
          }, 0);
          return;
        }

        // Continue the list with same indentation and bullet
        e.preventDefault();
        const newListItem = `\n${indent}${bullet} `;
        const beforeCursor = value.substring(0, cursorPos);
        const afterCursor = value.substring(cursorPos);
        const newValue = beforeCursor + newListItem + afterCursor;
        onChange(newValue);
        
        setTimeout(() => {
          const newPos = cursorPos + newListItem.length;
          textarea.setSelectionRange(newPos, newPos);
        }, 0);
        return;
      }

      // Check for ordered list
      const orderedMatch = currentLine.match(/^(\s*)(\d+)\.\s(.*)$/);
      if (orderedMatch) {
        const [, indent, number, content] = orderedMatch;
        
        // If the line is empty (just number), remove it and unindent
        if (!content.trim()) {
          e.preventDefault();
          const beforeCursor = value.substring(0, cursorPos - currentLine.length);
          const afterCursor = value.substring(cursorPos);
          const newValue = beforeCursor + afterCursor;
          onChange(newValue);
          
          setTimeout(() => {
            const newPos = cursorPos - currentLine.length;
            textarea.setSelectionRange(newPos, newPos);
          }, 0);
          return;
        }

        // Continue the list with incremented number
        e.preventDefault();
        const nextNumber = parseInt(number) + 1;
        const newListItem = `\n${indent}${nextNumber}. `;
        const beforeCursor = value.substring(0, cursorPos);
        const afterCursor = value.substring(cursorPos);
        const newValue = beforeCursor + newListItem + afterCursor;
        onChange(newValue);
        
        setTimeout(() => {
          const newPos = cursorPos + newListItem.length;
          textarea.setSelectionRange(newPos, newPos);
        }, 0);
        return;
      }



      // Check for blockquote
      const blockquoteMatch = currentLine.match(/^(\s*)(>+)\s(.*)$/);
      if (blockquoteMatch) {
        const [, indent, quotes, content] = blockquoteMatch;
        
        // If the line is empty (just quote), remove it and unindent
        if (!content.trim()) {
          e.preventDefault();
          const beforeCursor = value.substring(0, cursorPos - currentLine.length);
          const afterCursor = value.substring(cursorPos);
          const newValue = beforeCursor + afterCursor;
          onChange(newValue);
          
          setTimeout(() => {
            const newPos = cursorPos - currentLine.length;
            textarea.setSelectionRange(newPos, newPos);
          }, 0);
          return;
        }

        // Continue the blockquote
        e.preventDefault();
        const newQuoteLine = `\n${indent}${quotes} `;
        const beforeCursor = value.substring(0, cursorPos);
        const afterCursor = value.substring(cursorPos);
        const newValue = beforeCursor + newQuoteLine + afterCursor;
        onChange(newValue);
        
        setTimeout(() => {
          const newPos = cursorPos + newQuoteLine.length;
          textarea.setSelectionRange(newPos, newPos);
        }, 0);
        return;
      }
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setIsPreviewMode(false);
  };

  const handlePreview = () => {
    setIsPreviewMode(true);
    setIsEditing(false);
  };

  const MarkdownHelpModal = () => {
    if (!showMarkdownHelp) return null;

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]" onClick={() => setShowMarkdownHelp(false)}>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Markdown Formatierung
            </h3>
            <button
              onClick={() => setShowMarkdownHelp(false)}
                              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                ✕
              </button>
          </div>
          
          <div className="p-6 overflow-y-auto max-h-[60vh] space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Text Formatierung</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">**fett**</code>
                    <span className="font-bold">fett</span>
                  </div>
                  <div className="flex justify-between">
                    <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">*kursiv*</code>
                    <span className="italic">kursiv</span>
                  </div>
                  <div className="flex justify-between">
                    <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">`code`</code>
                    <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">code</code>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Überschriften</h4>
                <div className="space-y-2 text-sm">
                  <div><code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded"># Überschrift 1</code></div>
                  <div><code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">## Überschrift 2</code></div>
                  <div><code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">### Überschrift 3</code></div>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Listen</h4>
                <div className="space-y-2 text-sm">
                  <div><code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">- Punkt 1</code></div>
                  <div><code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">- Punkt 2</code></div>
                  <div><code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">1. Nummeriert</code></div>
                  <div><code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">- [ ] Todo</code></div>
                  <div><code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">- [x] Erledigt</code></div>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Sonstiges</h4>
                <div className="space-y-2 text-sm">
                  <div><code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">[Link](url)</code></div>
                  <div><code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">![Alt](url)</code> (Bild)</div>
                  <div><code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">&gt; Zitat</code></div>
                  <div><code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">---</code> (Linie)</div>
                </div>
              </div>
              
              <div className="col-span-2">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3">⚡ Intelligente Eingabe</h4>
                <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                  <div>
                    <p className="font-medium">Auto-Fortsetzung mit Enter:</p>
                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded text-xs space-y-1">
                      <div>• Listen (<code>-</code>, <code>*</code>, <code>+</code>) werden automatisch fortgesetzt</div>
                      <div>• Nummerierte Listen (<code>1.</code>, <code>2.</code>) zählen automatisch hoch</div>
                      <div>• Checkboxen (<code>- [ ]</code>, <code>- [x]</code>) werden als neue leere Checkbox fortgesetzt</div>
                      <div>• Blockquotes (<code>&gt;</code>) werden automatisch fortgesetzt</div>
                      <div>• Leere Einträge werden durch Enter entfernt</div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="col-span-2">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3">💡 Automatische Konvertierung</h4>
                <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                  <div>
                    <p className="font-medium">Bilder:</p>
                    <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded text-xs">
                      <div>Einfügen: <code>https://example.com/bild.jpg</code></div>
                      <div>Wird zu: <code>![bild](https://example.com/bild.jpg)</code></div>
                    </div>
                  </div>
                  <div>
                    <p className="font-medium">Web-Links:</p>
                    <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded text-xs">
                      <div>Einfügen: <code>https://de.wikipedia.org/wiki/Wald</code></div>
                      <div>Wird zu: <code>[Wald - Wikipedia](https://de.wikipedia.org/wiki/Wald)</code></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div ref={editorRef} className={`${useFullHeight ? 'flex-1 flex flex-col h-full' : ''} ${className}`}>
      {showToolbar && (
        <div className="rounded-t-xl bg-gray-50/50 dark:bg-gray-800/50 px-3 py-1.5">
          <div className="flex items-center space-x-1 flex-wrap">
            {!isPreviewMode && (
              <>
                {/* Text Formatting */}
                <button onMouseDown={preventMouseDown}
                  onClick={() => insertFormatting('**', '**')}
                  className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  title="Fett"
                >
                  <Bold className="w-4 h-4" />
                </button>
                <button onMouseDown={preventMouseDown}
                  onClick={() => insertFormatting('*', '*')}
                  className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  title="Kursiv"
                >
                  <Italic className="w-4 h-4" />
                </button>
                <button onMouseDown={preventMouseDown}
                  onClick={() => insertFormatting('`', '`')}
                  className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  title="Code"
                >
                  <Code className="w-4 h-4" />
                </button>

                <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1"></div>

                {/* Headings */}
                <button onMouseDown={preventMouseDown}
                  onClick={() => insertHeading(1)}
                  className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-xs font-bold"
                  title="Überschrift 1"
                >
                  H1
                </button>
                <button onMouseDown={preventMouseDown}
                  onClick={() => insertHeading(2)}
                  className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-xs font-bold"
                  title="Überschrift 2"
                >
                  H2
                </button>
                <button onMouseDown={preventMouseDown}
                  onClick={() => insertHeading(3)}
                  className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-xs font-bold"
                  title="Überschrift 3"
                >
                  H3
                </button>

                <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1"></div>

                {/* Lists */}
                <button onMouseDown={preventMouseDown}
                  onClick={() => insertList(false)}
                  className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  title="Liste"
                >
                  <List className="w-4 h-4" />
                </button>
                <button onMouseDown={preventMouseDown}
                  onClick={() => insertList(true)}
                  className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  title="Nummerierte Liste"
                >
                  <ListOrdered className="w-4 h-4" />
                </button>
                <button onMouseDown={preventMouseDown}
                  onClick={insertCheckbox}
                  className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  title="Checkbox"
                >
                  <CheckSquare className="w-4 h-4" />
                </button>

                <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1"></div>

                {/* Other */}
                <button onMouseDown={preventMouseDown}
                  onClick={insertBlockquote}
                  className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  title="Zitat"
                >
                  <Quote className="w-4 h-4" />
                </button>
                <button onMouseDown={preventMouseDown}
                  onClick={insertLink}
                  className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  title="Link"
                >
                  <Link className="w-4 h-4" />
                </button>
                <button onMouseDown={preventMouseDown}
                  onClick={insertImage}
                  className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  title="Bild"
                >
                  <Image className="w-4 h-4" />
                </button>
                
                <button onMouseDown={preventMouseDown}
                  onClick={insertHorizontalRule}
                  className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  title="Horizontale Linie"
                >
                  <Minus className="w-4 h-4" />
                </button>
              </>
            )}

            <div className="flex-1"></div>

            {/* Help */}
            <button
              onClick={() => setShowMarkdownHelp(true)}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              style={getAccentColorStyles().text}
              title="Markdown-Hilfe"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Editor Content */}
      <div className={`relative ${useFullHeight ? 'flex-1 flex flex-col min-h-0' : ''}`}>
        {isPreviewMode ? (
          <div 
            className={`w-full p-3 rounded-b-xl bg-gray-50/30 dark:bg-gray-800/30 cursor-text hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-colors overflow-y-auto ${useFullHeight ? 'flex-1' : ''}`}
            style={{ 
              minHeight: useFullHeight ? undefined : `${minHeight}px`,
              maxHeight: useFullHeight ? undefined : `${maxHeight}px`
            }}
            onClick={handleEdit}
            title="Klicken zum Bearbeiten"
          >
            {value.trim() ? (
              <div 
                className="text-gray-900 dark:text-white text-sm leading-relaxed wysiwyg-content"
                style={{ 
                  fontFamily: 'inherit',
                  lineHeight: '1.6'
                }}
                dangerouslySetInnerHTML={{ __html: markdownToHtml(value) }}
              />
            ) : (
              <div className="text-gray-500 dark:text-gray-400 italic text-sm">
                {placeholder}
              </div>
            )}
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onBlur={handleBlur}
            className={`w-full p-3 rounded-b-xl focus:outline-none bg-gray-50/30 dark:bg-gray-800/30 text-gray-900 dark:text-white overflow-y-auto font-mono text-sm leading-relaxed ${useFullHeight ? 'flex-1 resize-none' : 'resize-vertical'}`}
            style={{ 
              minHeight: useFullHeight ? undefined : `${minHeight}px`,
              maxHeight: useFullHeight ? undefined : `${maxHeight}px`
            }}
            placeholder={placeholder}
            autoFocus={autoFocus || isEditing}
          />
        )}
        
        {/* URL Processing Indicator */}
        {isProcessingUrls && (
          <div 
            className="absolute top-2 right-2 text-white px-3 py-1.5 rounded-full text-xs flex items-center space-x-2 z-10 shadow-lg"
            style={getAccentColorStyles().bg}
          >
            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span className="font-medium">Links werden verarbeitet...</span>
          </div>
        )}
      </div>

      <MarkdownHelpModal />
    </div>
  );
} 