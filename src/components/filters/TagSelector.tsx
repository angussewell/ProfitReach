'use client';

import { useState, useEffect } from 'react';

// Type for a single tag
interface Tag {
  id?: string;
  name: string;
}

interface TagSelectorProps {
  selectedTags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

export default function TagSelector({ selectedTags, onChange, placeholder = 'Select tags...' }: TagSelectorProps) {
  const [inputValue, setInputValue] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // In a real implementation, we'd fetch this from the server
  // For now, include a mix of example tags and any currently selected tags
  const [availableTags, setAvailableTags] = useState<Tag[]>([
    { name: 'VIP' },
    { name: 'Cold Lead' },
    { name: 'Warm Lead' },
    { name: 'Hot Lead' },
    { name: 'Sales Qualified' },
    { name: 'Marketing Qualified' },
    { name: 'Decision Maker' },
    { name: 'Influencer' },
    { name: 'Follow Up' },
    { name: 'Conference 2025' },
    { name: 'Demo Requested' },
    { name: 'Demo Completed' },
    { name: 'Proposal Sent' },
  ]);
  
  // Add selected tags to available tags if they're not already there
  useEffect(() => {
    // Ensure all selected tags are in the available tags list
    const newAvailableTags = [...availableTags];
    let changed = false;
    
    selectedTags.forEach(tagName => {
      if (!availableTags.some(tag => tag.name === tagName)) {
        newAvailableTags.push({ name: tagName });
        changed = true;
      }
    });
    
    if (changed) {
      setAvailableTags(newAvailableTags);
    }
  }, [selectedTags, availableTags]);
  
  // Filter tags by search query
  const filteredTags = availableTags.filter(tag => 
    tag.name.toLowerCase().includes(inputValue.toLowerCase())
  );
  
  // Add a new tag
  const createTag = (name: string) => {
    if (!name.trim()) return;
    
    // Add to available tags if it doesn't exist
    if (!availableTags.some(tag => tag.name === name)) {
      setAvailableTags(prev => [...prev, { name }]);
    }
    
    // Add to selected tags
    if (!selectedTags.includes(name)) {
      onChange([...selectedTags, name]);
    }
    
    // Clear input
    setInputValue('');
  };
  
  // Toggle a tag selection
  const toggleTag = (tagName: string) => {
    if (selectedTags.includes(tagName)) {
      onChange(selectedTags.filter(t => t !== tagName));
    } else {
      onChange([...selectedTags, tagName]);
    }
  };
  
  // Remove a tag
  const removeTag = (tagName: string) => {
    onChange(selectedTags.filter(t => t !== tagName));
  };
  
  // Handle keyboard events for adding a new tag
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue) {
      e.preventDefault();
      createTag(inputValue);
    }
  };
  
  return (
    <div className="relative">
      {/* Selected tags display */}
      <div 
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className="min-h-9 w-full flex flex-wrap gap-1 items-center border border-gray-300 rounded-md py-1 px-2 cursor-pointer"
      >
        {selectedTags.length > 0 ? (
          <>
            {selectedTags.map(tag => (
              <span 
                key={tag} 
                className="bg-blue-100 text-blue-800 text-xs font-medium rounded-full px-2.5 py-0.5 flex items-center"
              >
                {tag}
                <button 
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeTag(tag);
                  }}
                  className="ml-1 text-blue-500 hover:text-blue-700"
                >
                  ×
                </button>
              </span>
            ))}
          </>
        ) : (
          <span className="text-gray-500">{placeholder}</span>
        )}
      </div>
      
      {/* Dropdown for tag selection */}
      {isMenuOpen && (
        <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
          <div className="px-3 py-2">
            <input
              type="text"
              className="w-full border border-gray-300 rounded-md py-1 px-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Search or create tag..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
          
          {inputValue && !filteredTags.some(tag => tag.name.toLowerCase() === inputValue.toLowerCase()) && (
            <div className="px-3 py-1 cursor-pointer hover:bg-gray-100" onClick={() => createTag(inputValue)}>
              <span className="text-sm text-gray-500">
                Create tag: <strong>"{inputValue}"</strong>
              </span>
            </div>
          )}
          
          <ul className="max-h-40 overflow-auto">
            {filteredTags.length > 0 ? (
              filteredTags.map(tag => (
                <li 
                  key={tag.name}
                  className={`px-3 py-2 cursor-pointer hover:bg-gray-100 flex items-center justify-between ${
                    selectedTags.includes(tag.name) ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => toggleTag(tag.name)}
                >
                  <span className="text-sm">{tag.name}</span>
                  {selectedTags.includes(tag.name) && (
                    <span className="text-blue-500">✓</span>
                  )}
                </li>
              ))
            ) : (
              <li className="px-3 py-2 text-sm text-gray-500">No tags found</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
