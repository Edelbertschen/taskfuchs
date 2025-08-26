import React from 'react';

interface HtmlRendererProps {
  content: string;
  className?: string;
}

export function HtmlRenderer({ content, className = '' }: HtmlRendererProps) {
  return (
    <div 
      className={`html-renderer ${className}`}
      dangerouslySetInnerHTML={{ __html: content }}
      style={{
        // Ensure good typography for email content
        lineHeight: '1.6',
        fontSize: '14px',
        color: 'inherit',
      }}
    />
  );
} 