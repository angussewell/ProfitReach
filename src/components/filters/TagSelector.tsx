'use client';

import { useState, useEffect } from 'react';

// Type for a single tag
interface Tag {
  id?: string;
  name: string;
}

// Type for API response
interface TagApiResponse {
  success: boolean;
  data: {
    id: string;
    name: string;
  }[];
  message?: string;
}

interface TagSelectorProps {
  selectedTags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function TagSelector({ selectedTags, onChange, placeholder = 'Select tags...', disabled = false }: TagSelectorProps) {
  const [inputValue, setInputValue] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  
  // Fetch tags from API when component mounts
  useEffect(() => {
    const fetchTags = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch('/api/tags');
        
        if (!response.ok) {
          throw new Error(`Error fetching tags: ${response.status}`);
        }
        
        const result: TagApiResponse = await response.json();
        
        if (result.success) {
          // Map the API response to match our Tag interface
          const fetchedTags = result.data.map(tag => ({ 
            id: tag.id, 
            name: tag.name 
          }));
          setAvailableTags(fetchedTags);
        } else {
          throw new Error(result.message || 'Failed to fetch tags');
        }
      } catch (err) {
        console.error('Error fetching tags:', err);
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
        // If we can't fetch tags, initialize with an empty array
        setAvailableTags([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTags();
  }, []); // Empty dependency array means this runs once when component mounts
  
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
        onClick={() => !disabled && setIsMenuOpen(!isMenuOpen)}
        className={`min-h-[36px] w-full flex flex-wrap gap-1.5 items-center border border-gray-300 rounded-md py-1.5 px-3 ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:border-gray-400'}`}
      >
        {selectedTags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 w-full">
            {selectedTags.map(tag => (
              <span 
                key={tag} 
                className="bg-blue-100 text-blue-800 text-xs font-medium rounded-full px-2.5 py-1 flex items-center"
              >
                {tag}
                <button 
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeTag(tag);
                  }}
                  className="ml-1.5 text-blue-500 hover:text-blue-700 focus:outline-none"
                  aria-label={`Remove ${tag} tag`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        ) : (
          <span className="text-gray-500">{placeholder}</span>
        )}
      </div>
      
      {/* Dropdown for tag selection */}
      {isMenuOpen && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
          <div className="sticky top-0 px-3 py-2 bg-white border-b border-gray-100">
            <input
              type="text"
              className="w-full border border-gray-300 rounded-md py-1.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Search or create tag..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
          </div>
          
          {inputValue && !filteredTags.some(tag => tag.name.toLowerCase() === inputValue.toLowerCase()) && (
            <div className="px-3 py-1 cursor-pointer hover:bg-gray-100" onClick={() => createTag(inputValue)}>
              <span className="text-sm text-gray-500">
                Create tag: <strong>"{inputValue}"</strong>
              </span>
            </div>
          )}
          
          {isLoading ? (
            <div className="px-3 py-4 text-sm text-gray-500 text-center">
              <div className="inline-block animate-spin mr-2">⟳</div> Loading tags...
            </div>
          ) : error ? (
            <div className="px-3 py-4 text-sm text-red-500 text-center">
              Error loading tags. Please try again.
            </div>
          ) : (
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
          )}
        </div>
      )}
    </div>
  );
}
