import React, { useState, useRef, useEffect } from 'react';
import { X, Plus, Hash } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAppTranslation } from '../../utils/i18nHelpers';

interface TagInputProps {
  taskTags: string[];
  onTagsChange: (tags: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function TagInput({ taskTags, onTagsChange, placeholder, className = "" }: TagInputProps) {
  const { state, dispatch } = useApp();
  const { tagInput } = useAppTranslation();
  const isMinimalDesign = state.preferences.minimalDesign;
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const availableTags = state.tags.filter(tag => 
    !taskTags.includes(tag.name) && 
    tag.name.toLowerCase().includes(inputValue.toLowerCase())
  );

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && availableTags[selectedIndex]) {
        addTag(availableTags[selectedIndex].name);
      } else if (inputValue.trim()) {
        addTag(inputValue.trim());
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, availableTags.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, -1));
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setInputValue('');
      setSelectedIndex(-1);
    } else if (e.key === 'Backspace' && !inputValue && taskTags.length > 0) {
      // Remove last tag when backspace on empty input
      removeTag(taskTags[taskTags.length - 1]);
    }
  };

  const addTag = (tagName: string) => {
    if (!taskTags.includes(tagName)) {
      const newTags = [...taskTags, tagName];
      onTagsChange(newTags);
      
      // Add to global tags if it doesn't exist
      const existingTag = state.tags.find(t => t.name === tagName);
      if (!existingTag) {
        const newTag = {
          id: `tag-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: tagName,
          color: '#6b7280', // dezente graue Farbe
          count: 1
        };
        dispatch({ type: 'ADD_TAG', payload: newTag });
      } else {
        // Update count
        dispatch({ 
          type: 'UPDATE_TAG', 
          payload: { ...existingTag, count: existingTag.count + 1 }
        });
      }
    }
    
    setInputValue('');
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  const removeTag = (tagName: string) => {
    const newTags = taskTags.filter(tag => tag !== tagName);
    onTagsChange(newTags);
    
    // Update count in global tags
    const existingTag = state.tags.find(t => t.name === tagName);
    if (existingTag && existingTag.count > 1) {
      dispatch({ 
        type: 'UPDATE_TAG', 
        payload: { ...existingTag, count: existingTag.count - 1 }
      });
    } else if (existingTag) {
      // Remove tag if count would be 0 and no other tasks use it
      const isUsedElsewhere = state.tasks.some(task => 
        task.tags.includes(tagName) && !taskTags.includes(tagName)
      );
      if (!isUsedElsewhere) {
        dispatch({ type: 'DELETE_TAG', payload: existingTag.id });
      }
    }
  };

  const getTagColor = (tagName: string): string => {
    // Dezente einfarbige Tags in Grautönen
    return '#6b7280'; // neutral-500
  };

  useEffect(() => {
    setSelectedIndex(-1);
  }, [inputValue]);

  return (
    <div className={`relative ${className}`}>
      {/* Tag Pills */}
      <div className="flex flex-wrap gap-1 mb-2">
        {taskTags.map((tagName) => {
          const color = getTagColor(tagName);
          return (
            <span
              key={tagName}
              className="group inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-white rounded-full"
              style={{ backgroundColor: color }}
            >
              <Hash className="w-3 h-3" />
              <span className="truncate max-w-20">{tagName}</span>
              <button
                onClick={() => removeTag(tagName)}
                className="hover:bg-black hover:bg-opacity-20 rounded-full p-0.5 transition-all opacity-0 group-hover:opacity-100"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          );
        })}
      </div>

      {/* Input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setIsOpen(e.target.value.length > 0);
          }}
          onKeyDown={handleInputKeyDown}
          onFocus={() => setIsOpen(inputValue.length > 0)}
          onBlur={(e) => {
            // Delay hiding to allow clicks on suggestions
            setTimeout(() => {
              if (!e.currentTarget.contains(document.activeElement)) {
                setIsOpen(false);
                setSelectedIndex(-1);
              }
            }, 150);
          }}
          placeholder={placeholder || tagInput.addTagPlaceholder()}
          className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
        />
        
        <Plus className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
      </div>

      {/* Suggestions Dropdown */}
      {isOpen && availableTags.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {availableTags.map((tag, index) => (
            <button
              key={tag.id}
              onClick={() => addTag(tag.name)}
              className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2 ${
                index === selectedIndex ? 'bg-gray-50 dark:bg-gray-700' : ''
              }`}
            >
              <div 
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: tag.color }}
              />
              <span className="flex-1 truncate">{tag.name}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {tag.count}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
} 