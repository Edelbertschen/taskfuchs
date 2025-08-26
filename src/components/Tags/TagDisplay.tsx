import React from 'react';
import { Hash } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface TagDisplayProps {
  tags: string[];
  size?: 'small' | 'medium';
  maxTags?: number;
  onClick?: (tagName: string) => void;
  className?: string;
}

export function TagDisplay({ 
  tags, 
  size = 'small', 
  maxTags = 3, 
  onClick, 
  className = "" 
}: TagDisplayProps) {
  const { state } = useApp();
  const isMinimalDesign = state.preferences.minimalDesign;

  // Single color for all tags - using a neutral blue-gray color
  const getTagColor = (): { bg: string; text: string; border: string } => {
    return { 
      bg: 'bg-slate-100 dark:bg-slate-800', 
      text: 'text-slate-700 dark:text-slate-300', 
      border: 'border-slate-200 dark:border-slate-600' 
    };
  };

  if (tags.length === 0) {
    return null;
  }

  const visibleTags = tags.slice(0, maxTags);
  const remainingCount = tags.length - maxTags;

  const sizeClasses = {
    small: 'text-xs px-2 py-1',
    medium: 'text-sm px-2.5 py-1.5'
  };

  const iconSize = size === 'small' ? 'w-3 h-3' : 'w-3.5 h-3.5';
  const colors = getTagColor();

  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {visibleTags.map((tagName) => (
        <span
          key={tagName}
          onClick={onClick ? (e) => {
            e.stopPropagation();
            onClick(tagName);
          } : undefined}
          className={`inline-flex items-center font-medium rounded-full border ${colors.bg} ${colors.text} ${colors.border} ${sizeClasses[size]} ${
            onClick ? 'cursor-pointer hover:scale-105 hover:shadow-sm transition-all duration-200' : ''
          }`}
          title={tagName}
        >
          <span className="truncate max-w-20">{tagName}</span>
        </span>
      ))}
      
      {remainingCount > 0 && (
        <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full">
          +{remainingCount}
        </span>
      )}
    </div>
  );
} 