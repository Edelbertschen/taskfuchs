import React, { useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChevronDown, ChevronRight, Mail, ExternalLink, Calendar, User, FileText, Clock, AlertCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { resolveImageUrls } from '../../utils/imageStorage';
import { ImageZoomModal } from './ImageZoomModal';
import { EmailViewModal } from './EmailViewModal';
import type { Note } from '../../types';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

// Helper function to get accent color styles
const getAccentColorStyles = () => {
  if (typeof window === 'undefined') return { 
    bgLight: { backgroundColor: '#f3f4f6' }, 
    border: { borderColor: '#d1d5db' }, 
    text: { color: '#374151' } 
  };
  
  const root = document.documentElement;
  const accentColor = getComputedStyle(root).getPropertyValue('--accent-color').trim() || '#3b82f6';
  
  // Convert hex to RGB for alpha transparency
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 59, g: 130, b: 246 };
  };
  
  const rgb = hexToRgb(accentColor);
  
  return {
    bgLight: { backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)` },
    border: { borderColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)` },
    text: { color: accentColor }
  };
};

interface MarkdownRendererProps {
  content: string;
  className?: string;
  onCheckboxChange?: (content: string) => void;
  emailViewModal?: { isOpen: boolean; email: Note | null };
  setEmailViewModal?: React.Dispatch<React.SetStateAction<{ isOpen: boolean; email: Note | null }>>;
}

interface MarkdownSection {
  id: string;
  level: number;
  title: string;
  content: string;
  isCollapsed: boolean;
}

export function MarkdownRenderer({ content, className = '', onCheckboxChange, emailViewModal, setEmailViewModal }: MarkdownRendererProps) {
  const { state, dispatch } = useApp();
  const [zoomImage, setZoomImage] = useState<{ src: string; alt: string } | null>(null);
  // Email view modal state ist jetzt von NotesView verwaltet - kein lokaler State mehr nötig
  
  // Parse content into collapsible sections
  const sections = useMemo(() => {
    if (!content || content.trim() === '') return [];
    
    const lines = content.split('\n');
    const sections: MarkdownSection[] = [];
    let currentSection: MarkdownSection | null = null;
    let preContent: string[] = []; // Content before first heading
    
    lines.forEach((line, index) => {
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
      
      if (headingMatch) {
        // Save previous section
        if (currentSection) {
          currentSection.content = currentSection.content.trim();
          sections.push(currentSection);
        }
        
        // If we have pre-content (before first heading), add as section
        if (preContent.length > 0 && sections.length === 0) {
          sections.push({
            id: 'pre-content',
            level: 0,
            title: '',
            content: preContent.join('\n').trim(),
            isCollapsed: false
          });
          preContent = [];
        }
        
        // Create new section
        const level = headingMatch[1].length;
        const title = headingMatch[2];
        currentSection = {
          id: `heading-${index}-${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
          level,
          title,
          content: '',
          isCollapsed: false
        };
      } else {
        // Add line to current section or pre-content
        if (currentSection) {
          currentSection.content += line + '\n';
        } else {
          preContent.push(line);
        }
      }
    });
    
    // Save last section
    if (currentSection) {
      currentSection.content = currentSection.content.trim();
      sections.push(currentSection);
    }
    
    // If only pre-content exists (no headings)
    if (preContent.length > 0 && sections.length === 0) {
      sections.push({
        id: 'pre-content',
        level: 0,
        title: '',
        content: preContent.join('\n').trim(),
        isCollapsed: false
      });
    }
    
    return sections;
  }, [content]);

  // State for collapsed sections
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  
  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };
  
  const getAccentColorStyles = () => {
    const accentColor = state.preferences.accentColor;
    return {
      text: { color: accentColor },
      bg: { backgroundColor: accentColor },
      bgHover: { backgroundColor: accentColor + 'E6' },
      bgLight: { backgroundColor: accentColor + '20' },
      border: { borderColor: accentColor },
    };
  };

  // Create collapsible heading component
  const CollapsibleHeading = ({ section, children }: { section: MarkdownSection; children: React.ReactNode }) => {
    const isCollapsed = collapsedSections.has(section.id);
    const HeadingTag = `h${section.level}` as keyof JSX.IntrinsicElements;
    
    // Track if user is selecting text to prevent toggle on text selection
    const mouseDownPosRef = React.useRef<{ x: number; y: number } | null>(null);
    
    // Elegant heading hierarchy - clear visual distinction
    const headingClasses = {
      1: "text-2xl font-bold mb-5 mt-8 first:mt-0 pb-3 border-b border-gray-200/60 dark:border-gray-700/60 tracking-tight",
      2: "text-xl font-semibold mb-4 mt-7 first:mt-0 pb-2 border-b border-gray-200/40 dark:border-gray-700/40 tracking-tight",
      3: "text-lg font-semibold mb-3 mt-6 first:mt-0 tracking-tight",
      4: "text-base font-semibold mb-2 mt-5 first:mt-0",
      5: "text-sm font-semibold mb-2 mt-4 first:mt-0 uppercase tracking-wide",
      6: "text-xs font-semibold mb-2 mt-3 first:mt-0 uppercase tracking-wider text-gray-500 dark:text-gray-400"
    };
    
    // Only toggle if it was a genuine click, not a text selection
    const handleClick = (e: React.MouseEvent) => {
      // Check if text is selected - if so, don't toggle
      const selection = window.getSelection();
      if (selection && selection.toString().length > 0) {
        return;
      }
      
      // Check if mouse moved significantly (indicating drag/selection)
      if (mouseDownPosRef.current) {
        const dx = Math.abs(e.clientX - mouseDownPosRef.current.x);
        const dy = Math.abs(e.clientY - mouseDownPosRef.current.y);
        if (dx > 5 || dy > 5) {
          // Mouse moved too much - likely a selection attempt
          return;
        }
      }
      
      toggleSection(section.id);
    };
    
    return (
      <div className="collapsible-section" style={{ userSelect: 'text', WebkitUserSelect: 'text' }}>
        <HeadingTag 
          className={`${headingClasses[section.level as keyof typeof headingClasses]} cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-2 group`}
          style={{ color: section.level === 1 ? getAccentColorStyles().text.color : undefined, userSelect: 'text', WebkitUserSelect: 'text' }}
          onMouseDown={(e) => {
            mouseDownPosRef.current = { x: e.clientX, y: e.clientY };
          }}
          onClick={handleClick}
        >
          <span className="transition-transform duration-200 flex-shrink-0 select-none" style={{ userSelect: 'none' }}>
            {isCollapsed ? (
              <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300" />
            )}
          </span>
          <span className="flex-1">{section.title}</span>
          <span className="text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity select-none" style={{ userSelect: 'none' }}>
            {isCollapsed ? 'Aufklappen' : 'Einklappen'}
          </span>
        </HeadingTag>
        
        <div 
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            isCollapsed ? 'max-h-0 opacity-0' : 'max-h-none opacity-100'
          }`}
          style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
        >
          <div className={isCollapsed ? 'pointer-events-none' : ''} style={{ userSelect: 'text', WebkitUserSelect: 'text' }}>
            {children}
          </div>
        </div>
      </div>
    );
  };

  // Shared markdown components for sections (without headings)
  const createSectionComponents = () => ({
    // Remove heading components for section content (headings are handled by CollapsibleHeading)
    h1: () => null,
    h2: () => null,
    h3: () => null,
    h4: () => null,
    h5: () => null,
    h6: () => null,
    
    // Elegant paragraph rendering
    p: ({ node, ...props }: any) => {
      if (node && 'children' in node && node.children && node.children.length === 1) {
        const child = node.children[0];
        if (child && 'tagName' in child && child.tagName === 'img') {
          return <>{props.children}</>;
        }
      }
      return (
        <p 
          {...props} 
          className="mb-3 leading-relaxed text-gray-700 dark:text-gray-300 text-sm" 
        />
      );
    },
    
    // Enhanced image rendering
    img: ({ node, ...props }: any) => {
      if (props.src && props.src.startsWith('__IMG_PLACEHOLDER_')) {
        const imageData = imageMap.get(props.src);
        if (imageData) {
          return (
            <div className="my-6 text-center">
              <img 
                src={imageData.src}
                alt={imageData.alt}
                className="max-w-full h-auto rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 mx-auto block cursor-pointer hover:opacity-90 transition-opacity"
                style={{ maxHeight: '500px', objectFit: 'contain' }}
                onClick={() => setZoomImage({ src: imageData.src, alt: imageData.alt })}
                title="Klicken zum Vergrößern"
              />
              {imageData.alt && (
                <span className="block text-sm text-gray-500 dark:text-gray-400 mt-2 italic">
                  {imageData.alt}
                </span>
              )}
            </div>
          );
        }
      }
      return (
        <div className="my-6 text-center">
          <img 
            src={props.src}
            alt={props.alt}
            className="max-w-full h-auto rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 mx-auto block cursor-pointer hover:opacity-90 transition-opacity"
            style={{ maxHeight: '500px', objectFit: 'contain' }}
            onClick={() => setZoomImage({ src: props.src || '', alt: props.alt || '' })}
            title="Klicken zum Vergrößern"
          />
          {props.alt && (
            <span className="block text-sm text-gray-500 dark:text-gray-400 mt-2 italic">
              {props.alt}
            </span>
          )}
        </div>
      );
    },
    
    // Enhanced checkbox rendering
    input: ({ node, ...props }: any) => {
      if (props.type === 'checkbox') {
        const isCurrentlyChecked = props.checked || false;
        
        return (
          <input
            {...props}
            className="mr-3 rounded border-gray-300 focus:ring-2 focus:ring-opacity-50 transform scale-110 cursor-pointer"
            style={{ 
              accentColor: getAccentColorStyles().text.color
            }}
            onClick={(e) => {
              e.stopPropagation();
            }}
            onChange={(e) => {
              if (onCheckboxChange) {
                const isChecked = e.target.checked;
                const lines = content.split('\n');
                let foundFirst = false;
                let changesMade = false;
                
                const updatedLines = lines.map(line => {
                  const checkboxMatch = line.match(/^(\s*)(-|\*|\+)\s*(\[[ xX]\])\s*(.*)$/);
                  if (checkboxMatch) {
                    const [, indent, bullet, checkbox, text] = checkboxMatch;
                    const currentStatus = checkbox.toLowerCase().includes('x') ? 'x' : ' ';
                    const lineIsChecked = currentStatus === 'x';
                    
                    if (!foundFirst && lineIsChecked === isCurrentlyChecked) {
                      foundFirst = true;
                      changesMade = true;
                      const newStatus = isChecked ? 'x' : ' ';
                      return `${indent}${bullet} [${newStatus}] ${text}`;
                    }
                  }
                  return line;
                });
                
                if (changesMade) {
                  const newContent = updatedLines.join('\n');
                  onCheckboxChange(newContent);
                }
              }
            }}
          />
        );
      }
      return <input {...props} />;
    },
    
    // Enhanced link rendering with email support
    a: ({ node, href, children, ...props }: any) => {
      // Check if this is an email link (note:// protocol)
      if (href && href.startsWith('note://')) {
        const noteId = href.replace('note://', '');
        console.log('🔍 Looking for note ID:', noteId, 'in notes array:', state.notes?.notes?.length || 0);
        
        const linkedNote = state.notes?.notes?.find(note => note?.id === noteId);
        console.log('🔎 Found linkedNote:', linkedNote ? `${linkedNote.id} - ${linkedNote.title}` : 'null');
        
        if (linkedNote) {
          // Check if it's an email note
          if (linkedNote.tags.includes('email')) {
            const metadata = linkedNote.metadata?.emailMetadata;
            const subject = metadata?.originalSubject || linkedNote.title.replace('📧 ', '');
            const from = metadata?.from.name || metadata?.from.email || 'Unbekannt';
            const date = metadata?.date ? format(new Date(metadata.date), 'dd.MM.yyyy', { locale: de }) : '';
            
            return (
              <div 
                className="inline-flex items-center space-x-2 px-3 py-2 my-1 border rounded-lg transition-all duration-200 cursor-pointer group hover:shadow-sm"
                style={{
                  backgroundColor: getAccentColorStyles().bgLight.backgroundColor,
                  borderColor: getAccentColorStyles().border.borderColor,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = getAccentColorStyles().bgLight.backgroundColor + 'DD';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = getAccentColorStyles().bgLight.backgroundColor;
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  
                  try {
                    console.log('📧 Mail-Link clicked:', { linkedNote, noteId, metadata });
                    
                    // Validate linkedNote exists and has required properties
                    if (!linkedNote) { 
                      console.error('❌ LinkedNote is null/undefined'); 
                      return; 
                    }
                    if (!linkedNote.id) { 
                      console.error('❌ LinkedNote has no ID'); 
                      return; 
                    }
                    if (!linkedNote.tags || !linkedNote.tags.includes('email')) { 
                      console.error('❌ LinkedNote is not tagged as email'); 
                      return; 
                    }
                    
                    // Validate setEmailViewModal function exists
                    if (!setEmailViewModal || typeof setEmailViewModal !== 'function') {
                      console.error('❌ setEmailViewModal is not available or not a function');
                      console.warn('⚠️ Email modal cannot be opened - state management not properly configured');
                      return;
                    }
                    
                    console.log('✅ Opening EmailViewModal for note:', linkedNote.id);
                    setEmailViewModal({ isOpen: true, email: linkedNote });
                    
                  } catch (error) {
                    console.error('❌ Error in mail-link click handler:', error);
                    console.error('❌ Error details:', { 
                      message: error.message, 
                      stack: error.stack,
                      linkedNote: linkedNote ? { id: linkedNote.id, title: linkedNote.title } : null
                    });
                  }
                }}
                title={`📧 E-Mail von ${from} vom ${date}\nKlicken zum Öffnen im Modal`}
              >
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 rounded" style={getAccentColorStyles().bgLight}>
                    <Mail className="w-4 h-4" style={getAccentColorStyles().text} />
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-sm font-semibold truncate" style={getAccentColorStyles().text}>
                      📧 {subject}
                    </span>
                    <div className="flex items-center space-x-3 text-xs mt-0.5" style={{ color: getAccentColorStyles().text.color + 'A3' }}>
                      <div className="flex items-center space-x-1">
                        <User className="w-3 h-3" />
                        <span className="truncate max-w-32">{from}</span>
                      </div>
                      {date && (
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3" />
                          <span>{date}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-all duration-200 flex-shrink-0" style={getAccentColorStyles().text} />
              </div>
            );
          } else {
            // Regular note link
            const noteTitle = linkedNote.title || 'Untitled Note';
            const notePreview = linkedNote.content.substring(0, 80).replace(/[#*`\[\]]/g, '').trim() || 'Keine Vorschau verfügbar';
            const updateDate = linkedNote.updatedAt ? format(new Date(linkedNote.updatedAt), 'dd.MM.yyyy', { locale: de }) : '';
            
            return (
              <div 
                className="inline-flex items-center space-x-2 px-3 py-2 my-1 border rounded-lg transition-all duration-200 cursor-pointer group hover:shadow-sm"
                style={{
                  backgroundColor: getAccentColorStyles().bgLight.backgroundColor,
                  borderColor: getAccentColorStyles().border.borderColor,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = getAccentColorStyles().bgLight.backgroundColor + 'DD';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = getAccentColorStyles().bgLight.backgroundColor;
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
                onClick={(e) => {
                  e.preventDefault();
                  dispatch({ type: 'SELECT_NOTE', payload: linkedNote });
                  dispatch({ type: 'SET_DAILY_NOTES_MODE', payload: !!linkedNote.dailyNoteDate });
                }}
                title={`📝 Notiz: ${noteTitle}\n${notePreview}\nKlicken zum Öffnen`}
              >
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 rounded" style={getAccentColorStyles().bgLight}>
                    <FileText className="w-4 h-4" style={getAccentColorStyles().text} />
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-sm font-semibold truncate" style={getAccentColorStyles().text}>
                      📝 {noteTitle}
                    </span>
                    <div className="flex items-center space-x-3 text-xs mt-0.5" style={{ color: getAccentColorStyles().text.color + 'A3' }}>
                      <span className="truncate max-w-48">{notePreview}</span>
                      {updateDate && (
                        <div className="flex items-center space-x-1 flex-shrink-0">
                          <Clock className="w-3 h-3" />
                          <span>{updateDate}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-all duration-200 flex-shrink-0" style={getAccentColorStyles().text} />
              </div>
            );
          }
        } else {
          // Note not found - show broken link indicator
          return (
            <span 
              className="inline-flex items-center space-x-1 px-2 py-1 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-red-600 dark:text-red-400 text-sm"
              title="Verlinkte Notiz wurde nicht gefunden"
            >
              <AlertCircle className="w-3 h-3" />
              <span>Notiz nicht gefunden</span>
            </span>
          );
        }
      }
      
      // Regular link rendering
      return (
        <a 
          {...props}
          href={href}
          className="font-medium hover:underline decoration-2 underline-offset-2 transition-all duration-200"
          style={{ color: getAccentColorStyles().text.color }}
          target="_blank"
          rel="noopener noreferrer"
        >
          {children}
        </a>
      );
    },
    
    // Elegant list rendering
    ul: ({ node, ...props }: any) => (
      <ul {...props} className="markdown-list list-none space-y-1 mb-3 pl-0" />
    ),
    ol: ({ node, ...props }: any) => (
      <ol {...props} className="markdown-list list-none space-y-1 mb-3 pl-0" />
    ),
    li: ({ node, ...props }: any) => {
      const hasTaskListItem = node && 'properties' in node && node.properties && 'className' in node.properties && 
        Array.isArray(node.properties.className) && node.properties.className.includes('task-list-item');
      
      if (hasTaskListItem) {
        return (
          <li {...props} className="task-list-item flex items-start space-x-2 py-0.5 text-sm text-gray-700 dark:text-gray-300" />
        );
      }
      
      return (
        <li {...props} className="flex items-start space-x-2 py-0.5 text-sm text-gray-700 dark:text-gray-300">
          <span 
            className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 opacity-60"
            style={{ backgroundColor: getAccentColorStyles().text.color }}
          />
          <span className="flex-1 leading-relaxed">{props.children}</span>
        </li>
      );
    },
    
    // Enhanced blockquote rendering
    blockquote: ({ node, ...props }: any) => (
      <blockquote 
        {...props} 
        className="border-l-4 pl-6 py-4 my-6 bg-gray-50 dark:bg-gray-800 rounded-r-lg italic text-gray-700 dark:text-gray-300"
        style={{ borderLeftColor: getAccentColorStyles().text.color }}
      />
    ),
    
    // Enhanced code rendering
    code: ({ node, className, children, ...props }: any) => {
      const isInline = !className || !className.includes('language-');
      if (isInline) {
        return (
          <code 
            {...props} 
            className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md text-sm font-mono border border-gray-200 dark:border-gray-700"
            style={{ color: getAccentColorStyles().text.color }}
          >
            {children}
          </code>
        );
      }
      
      const language = className ? className.replace('language-', '') : '';
      return (
        <div className="my-6">
          {language && (
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-mono uppercase tracking-wide">
              {language}
            </div>
          )}
          <pre className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
            <code 
              {...props} 
              className={`block bg-gray-50 dark:bg-gray-900 p-4 text-sm font-mono leading-relaxed ${className || ''}`}
            >
              {children}
            </code>
          </pre>
        </div>
      );
    },
    
    // Enhanced table rendering
    table: ({ node, ...props }: any) => (
      <div className="my-6 overflow-x-auto">
        <table 
          {...props} 
          className="min-w-full border-collapse border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden shadow-sm"
        />
      </div>
    ),
    thead: ({ node, ...props }: any) => (
      <thead 
        {...props} 
        className="bg-gray-50 dark:bg-gray-800"
        style={{ backgroundColor: getAccentColorStyles().bgLight.backgroundColor }}
      />
    ),
    th: ({ node, ...props }: any) => (
      <th 
        {...props} 
        className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700"
      />
    ),
    td: ({ node, ...props }: any) => (
      <td 
        {...props} 
        className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200 border-b border-gray-200 dark:border-gray-700"
      />
    ),
    
    // Enhanced horizontal rule
    hr: ({ node, ...props }: any) => (
      <hr 
        {...props} 
        className="my-8 border-0 h-0.5 rounded-full"
        style={{ backgroundColor: getAccentColorStyles().text.color + '40' }}
      />
    ),
    
    // Enhanced strong/bold rendering
    strong: ({ node, ...props }: any) => (
      <strong 
        {...props} 
        className="font-bold"
        style={{ color: getAccentColorStyles().text.color }}
      />
    ),
    
    // Enhanced emphasis/italic rendering
    em: ({ node, ...props }: any) => (
      <em 
        {...props} 
        className="italic text-gray-700 dark:text-gray-300"
      />
    ),
  });

  // Custom image renderer that handles storage:// URLs directly
  const renderCustomImage = (src: string, alt: string) => {
    if (src.startsWith('storage://')) {
      const imageId = src.replace('storage://', '');
      const image = state.imageStorage.images.find(img => img.id === imageId);
      
      if (image) {
        console.log('Custom image renderer found image:', imageId);
        return (
          <div className="my-6 text-center">
            <img 
              src={image.data}
              alt={alt}
              className="max-w-full h-auto rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 mx-auto block cursor-pointer hover:opacity-90 transition-opacity"
              style={{ maxHeight: '500px', objectFit: 'contain' }}
              onClick={() => setZoomImage({ src: image.data, alt })}
              onLoad={() => console.log('Custom image renderer loaded successfully:', imageId)}
              onError={(e) => {
                console.error('Custom image renderer failed:', imageId, e);
              }}
              title="Klicken zum Vergrößern"
            />
            {alt && (
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-2 italic">
                {alt}
              </div>
            )}
          </div>
        );
      } else {
        console.error('Custom image renderer: Image not found:', imageId);
        return (
          <div className="text-sm text-gray-500 dark:text-gray-400 p-6 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-dashed border-yellow-300 dark:border-yellow-600 text-center my-6">
            <div className="text-yellow-500 text-lg mb-2">⚠️</div>
            <div className="font-medium mb-2">Bild nicht im Storage gefunden</div>
            <code className="text-xs break-all bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded">{imageId}</code>
          </div>
        );
      }
    }
    
    // For non-storage URLs, use regular img tag
    return (
      <div className="my-6 text-center">
        <img 
          src={src}
          alt={alt}
          className="max-w-full h-auto rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 mx-auto block cursor-pointer hover:opacity-90 transition-opacity"
          style={{ maxHeight: '500px', objectFit: 'contain' }}
          onClick={() => setZoomImage({ src, alt })}
          onLoad={() => console.log('Regular image loaded:', src.substring(0, 50))}
          onError={(e) => console.error('Regular image failed:', src, e)}
          title="Klicken zum Vergrößern"
        />
        {alt && (
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-2 italic">
            {alt}
          </div>
        )}
      </div>
    );
  };

  if (!content || content.trim() === '') {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div 
          className="w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-all duration-200"
          style={{
            backgroundColor: state.preferences.accentColor + '15',
            border: `2px dashed ${state.preferences.accentColor}40`
          }}
        >
          <svg
            className="w-6 h-6 transition-colors"
            style={{ color: state.preferences.accentColor }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" 
            />
          </svg>
        </div>
        <p className="text-gray-600 dark:text-gray-400 font-medium mb-2">
          Noch keine Beschreibung vorhanden
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500">
          Klicke hier zum Erstellen einer Beschreibung
        </p>
      </div>
    );
  }

  // Pre-process content to handle data-URLs that ReactMarkdown can't handle
  const imageMap = new Map<string, { src: string; alt: string; }>();
  
  const preprocessContentForImages = (contentToProcess: string) => {
    let processedContent = contentToProcess;
    
    // First resolve storage:// URLs
    processedContent = resolveImageUrls(processedContent, state.imageStorage);
    
    // Then extract all data-URL images and replace with placeholders
    const dataUrlImageRegex = /!\[([^\]]*)\]\((data:[^)]+)\)/g;
    let match;
    let imageIndex = 0;
    
    while ((match = dataUrlImageRegex.exec(processedContent)) !== null) {
      const [fullMatch, alt, src] = match;
      const placeholderKey = `__IMG_PLACEHOLDER_${imageIndex}__`;
      imageMap.set(placeholderKey, { src, alt });
      processedContent = processedContent.replace(fullMatch, `![${alt}](${placeholderKey})`);
      imageIndex++;
    }
    
    return processedContent;
  };

  // If no headings found, render as single section
  if (sections.length <= 1 && sections[0]?.level === 0) {
    const processedContent = preprocessContentForImages(content);
    
    return (
      <div className={`markdown-renderer ${className}`} style={{ userSelect: 'text', WebkitUserSelect: 'text' }}>
        <ReactMarkdown 
          remarkPlugins={[remarkGfm]}
          components={{
            // Elegant heading rendering with clear hierarchy
            h1: ({ node, ...props }) => (
              <h1 
                {...props} 
                className="text-2xl font-bold mb-5 mt-8 first:mt-0 pb-3 border-b border-gray-200/60 dark:border-gray-700/60 tracking-tight"
                style={{ color: getAccentColorStyles().text.color }}
              />
            ),
            h2: ({ node, ...props }) => (
              <h2 
                {...props} 
                className="text-xl font-semibold mb-4 mt-7 first:mt-0 pb-2 border-b border-gray-200/40 dark:border-gray-700/40 tracking-tight text-gray-900 dark:text-white" 
              />
            ),
            h3: ({ node, ...props }) => (
              <h3 
                {...props} 
                className="text-lg font-semibold mb-3 mt-6 first:mt-0 tracking-tight text-gray-900 dark:text-white" 
              />
            ),
            h4: ({ node, ...props }) => (
              <h4 
                {...props} 
                className="text-base font-semibold mb-2 mt-5 first:mt-0 text-gray-900 dark:text-white" 
              />
            ),
            h5: ({ node, ...props }) => (
              <h5 
                {...props} 
                className="text-sm font-semibold mb-2 mt-4 first:mt-0 uppercase tracking-wide text-gray-900 dark:text-white" 
              />
            ),
            h6: ({ node, ...props }) => (
              <h6 
                {...props} 
                className="text-xs font-semibold mb-2 mt-3 first:mt-0 uppercase tracking-wider text-gray-500 dark:text-gray-400" 
              />
            ),
            
            // Elegant paragraph rendering
            p: ({ node, ...props }) => {
              // Check if this paragraph contains only an image
              if (node && 'children' in node && node.children && node.children.length === 1) {
                const child = node.children[0];
                if (child && 'tagName' in child && child.tagName === 'img') {
                  // Return a fragment instead of p tag for image-only paragraphs
                  return <>{props.children}</>;
                }
              }
              
              return (
                <p 
                  {...props} 
                  className="mb-3 leading-relaxed text-gray-700 dark:text-gray-300 text-sm" 
                />
              );
            },
            
            // Enhanced image rendering that handles placeholders
            img: ({ node, ...props }) => {
              // Handle our custom placeholders
              if (props.src && props.src.startsWith('__IMG_PLACEHOLDER_')) {
                const imageData = imageMap.get(props.src);
                if (imageData) {
                  return (
                    <div className="my-6 text-center">
                      <img 
                        src={imageData.src}
                        alt={imageData.alt}
                        className="max-w-full h-auto rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 mx-auto block cursor-pointer hover:opacity-90 transition-opacity"
                        style={{ maxHeight: '500px', objectFit: 'contain' }}
                        onClick={() => setZoomImage({ src: imageData.src, alt: imageData.alt })}
                        title="Klicken zum Vergrößern"
                      />
                      {imageData.alt && (
                        <span className="block text-sm text-gray-500 dark:text-gray-400 mt-2 italic">
                          {imageData.alt}
                        </span>
                      )}
                    </div>
                  );
                }
              }
              
              // Handle empty src
              if (!props.src || props.src.trim() === '') {
                return (
                  <div className="my-6 text-center">
                    <div className="max-w-full h-32 rounded-xl shadow-lg border-2 border-red-300 dark:border-red-700 mx-auto block bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-red-500 text-lg mb-2">❌</div>
                        <div className="text-sm text-red-600 dark:text-red-400 font-medium">
                          Fehler: Leeres src-Attribut
                        </div>
                      </div>
                    </div>
                    {props.alt && (
                      <span className="block text-sm text-gray-500 dark:text-gray-400 mt-2 italic">
                        {props.alt}
                      </span>
                    )}
                  </div>
                );
              }
              
              // Handle regular images
              return (
                <div className="my-6 text-center">
                  <img 
                    src={props.src}
                    alt={props.alt}
                    className="max-w-full h-auto rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 mx-auto block cursor-pointer hover:opacity-90 transition-opacity"
                    style={{ maxHeight: '500px', objectFit: 'contain' }}
                    onClick={() => setZoomImage({ src: props.src || '', alt: props.alt || '' })}
                    title="Klicken zum Vergrößern"
                  />
                  {props.alt && (
                    <span className="block text-sm text-gray-500 dark:text-gray-400 mt-2 italic">
                      {props.alt}
                    </span>
                  )}
                </div>
              );
            },
            
            // Enhanced checkbox rendering
            input: ({ node, ...props }) => {
              if (props.type === 'checkbox') {
                const isCurrentlyChecked = props.checked || false;
                
                return (
                  <input
                    {...props}
                    className="mr-3 rounded border-gray-300 focus:ring-2 focus:ring-opacity-50 transform scale-110 cursor-pointer"
                    style={{ 
                      accentColor: getAccentColorStyles().text.color
                    }}
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent any parent click handlers
                    }}
                    onChange={(e) => {
                      if (onCheckboxChange) {
                        const isChecked = e.target.checked;
                        const lines = content.split('\n');
                        let foundFirst = false;
                        let changesMade = false;
                        
                        const updatedLines = lines.map(line => {
                          const checkboxMatch = line.match(/^(\s*)(-|\*|\+)\s*(\[[ xX]\])\s*(.*)$/);
                          if (checkboxMatch) {
                            const [, indent, bullet, checkbox, text] = checkboxMatch;
                            const currentStatus = checkbox.toLowerCase().includes('x') ? 'x' : ' ';
                            const lineIsChecked = currentStatus === 'x';
                            
                            if (!foundFirst && lineIsChecked === isCurrentlyChecked) {
                              foundFirst = true;
                              changesMade = true;
                              const newStatus = isChecked ? 'x' : ' ';
                              return `${indent}${bullet} [${newStatus}] ${text}`;
                            }
                          }
                          return line;
                        });
                        
                        if (changesMade) {
                          const newContent = updatedLines.join('\n');
                          onCheckboxChange(newContent);
                        }
                      }
                    }}
                  />
                );
              }
              return <input {...props} />;
            },
            
            // Enhanced link rendering with copy functionality
            a: ({ node, ...props }) => {
              const copyToClipboard = (e: React.MouseEvent, url: string) => {
                e.preventDefault();
                e.stopPropagation();
                navigator.clipboard.writeText(url);
                // TODO: Add toast notification for copy success
              };

              return (
                <span className="group relative inline-flex items-center gap-1">
                  <a 
                    {...props} 
                    className="font-medium hover:underline decoration-2 underline-offset-2 transition-all duration-200 inline-flex items-center gap-1"
                    style={{ color: getAccentColorStyles().text.color }}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {props.children} 
                    <span className="inline-block w-3 h-3 opacity-70 transition-opacity group-hover:opacity-100">↗</span>
                  </a>
                  <button
                    onClick={(e) => copyToClipboard(e, props.href || '')}
                    className="ml-1 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded text-xs"
                    style={{ color: getAccentColorStyles().text.color }}
                    title="Link kopieren"
                  >
                    📋
                  </button>
                </span>
              );
            },
            
            // Elegant list rendering
            ul: ({ node, ...props }) => (
              <ul {...props} className="markdown-list list-none space-y-1 mb-3 pl-0" />
            ),
            ol: ({ node, ...props }) => (
              <ol {...props} className="markdown-list list-none space-y-1 mb-3 pl-0" />
            ),
            li: ({ node, ...props }) => {
              const hasTaskListItem = node && 'properties' in node && node.properties && 'className' in node.properties && 
                Array.isArray(node.properties.className) && node.properties.className.includes('task-list-item');
              
              if (hasTaskListItem) {
                return (
                  <li {...props} className="task-list-item flex items-start space-x-2 py-0.5 text-sm text-gray-700 dark:text-gray-300" />
                );
              }
              
              return (
                <li {...props} className="flex items-start space-x-2 py-0.5 text-sm text-gray-700 dark:text-gray-300">
                  <span 
                    className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 opacity-60"
                    style={{ backgroundColor: getAccentColorStyles().text.color }}
                  />
                  <span className="flex-1 leading-relaxed">{props.children}</span>
                </li>
              );
            },
            
            // Enhanced blockquote rendering
            blockquote: ({ node, ...props }) => (
              <blockquote 
                {...props} 
                className="border-l-4 pl-6 py-4 my-6 bg-gray-50 dark:bg-gray-800 rounded-r-lg italic text-gray-700 dark:text-gray-300"
                style={{ borderLeftColor: getAccentColorStyles().text.color }}
              />
            ),
            
            // Enhanced code rendering
            code: ({ node, className, children, ...props }: any) => {
              const isInline = !className || !className.includes('language-');
              if (isInline) {
                return (
                  <code 
                    {...props} 
                    className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md text-sm font-mono border border-gray-200 dark:border-gray-700"
                    style={{ color: getAccentColorStyles().text.color }}
                  >
                    {children}
                  </code>
                );
              }
              
              const language = className ? className.replace('language-', '') : '';
              return (
                <div className="my-6">
                  {language && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-mono uppercase tracking-wide">
                      {language}
                    </div>
                  )}
                  <pre className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                    <code 
                      {...props} 
                      className={`block bg-gray-50 dark:bg-gray-900 p-4 text-sm font-mono leading-relaxed ${className || ''}`}
                    >
                      {children}
                    </code>
                  </pre>
                </div>
              );
            },
            
            // Enhanced table rendering
            table: ({ node, ...props }) => (
              <div className="my-6 overflow-x-auto">
                <table 
                  {...props} 
                  className="min-w-full border-collapse border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden shadow-sm"
                />
              </div>
            ),
            thead: ({ node, ...props }) => (
              <thead 
                {...props} 
                className="bg-gray-50 dark:bg-gray-800"
                style={{ backgroundColor: getAccentColorStyles().bgLight.backgroundColor }}
              />
            ),
            th: ({ node, ...props }) => (
              <th 
                {...props} 
                className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700"
              />
            ),
            td: ({ node, ...props }) => (
              <td 
                {...props} 
                className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200 border-b border-gray-200 dark:border-gray-700"
              />
            ),
            
            // Enhanced horizontal rule
            hr: ({ node, ...props }) => (
              <hr 
                {...props} 
                className="my-8 border-0 h-0.5 rounded-full"
                style={{ backgroundColor: getAccentColorStyles().text.color + '40' }}
              />
            ),
            
            // Enhanced strong/bold rendering
            strong: ({ node, ...props }) => (
              <strong 
                {...props} 
                className="font-bold"
                style={{ color: getAccentColorStyles().text.color }}
              />
            ),
            
            // Enhanced emphasis/italic rendering
            em: ({ node, ...props }) => (
              <em 
                {...props} 
                className="italic text-gray-700 dark:text-gray-300"
              />
            ),
          }}
        >
          {processedContent}
        </ReactMarkdown>

        {/* Image Zoom Modal */}
        <ImageZoomModal
          src={zoomImage?.src || ''}
          alt={zoomImage?.alt || ''}
          isOpen={!!zoomImage}
          onClose={() => setZoomImage(null)}
        />
      </div>
    );
  }

  // Render collapsible sections
  return (
    <div className={`markdown-renderer ${className}`} style={{ userSelect: 'text', WebkitUserSelect: 'text' }}>
      {sections.map((section) => {
        const sectionContent = preprocessContentForImages(section.content);
        
        // Pre-content (content before first heading) - render without heading
        if (section.level === 0 && section.title === '') {
          return (
            <div key={section.id} className="pre-content-section mb-6">
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={createSectionComponents()}
              >
                {sectionContent}
              </ReactMarkdown>
            </div>
          );
        }
        
        // Regular collapsible section with heading
        return (
          <CollapsibleHeading key={section.id} section={section}>
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={createSectionComponents()}
            >
              {sectionContent}
            </ReactMarkdown>
          </CollapsibleHeading>
        );
      })}

      {/* Image Zoom Modal */}
      <ImageZoomModal
        src={zoomImage?.src || ''}
        alt={zoomImage?.alt || ''}
        isOpen={!!zoomImage}
        onClose={() => setZoomImage(null)}
      />

      {/* Email View Modal */}
      {emailViewModal?.isOpen && emailViewModal?.email && setEmailViewModal && (
        <EmailViewModal
          isOpen={emailViewModal.isOpen}
          email={emailViewModal.email}
          onClose={() => setEmailViewModal({ isOpen: false, email: null })}
        />
      )}
    </div>
  );
} 