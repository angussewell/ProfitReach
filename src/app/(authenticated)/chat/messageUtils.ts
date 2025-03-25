export interface MessagePart {
  type: 'text' | 'code';
  content: string;
  language?: string;
}

export function parseMessageContent(content: string): MessagePart[] {
  if (!content) return [];
  
  // Use non-greedy matching for code blocks
  const codeBlockRegex = /```([\s\S]*?)```/g;
  const parts: MessagePart[] = [];
  
  let lastIndex = 0;
  let match;
  
  try {
    while ((match = codeBlockRegex.exec(content)) !== null) {
      // Add text before code block
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: content.slice(lastIndex, match.index)
        });
      }
      
      // Extract code and possible language identifier
      let fullCodeBlock = match[1];
      let language: string | undefined;
      let code = fullCodeBlock;
      
      // Check for language identifier in the opening code fence
      const firstLineEnd = fullCodeBlock.indexOf('\n');
      
      if (firstLineEnd > 0) {
        const firstLine = fullCodeBlock.substring(0, firstLineEnd).trim();
        
        // If first line is just a word (likely a language identifier)
        if (/^[a-zA-Z0-9]+$/.test(firstLine)) {
          language = firstLine;
          code = fullCodeBlock.substring(firstLineEnd + 1);
        }
      }
      
      parts.push({
        type: 'code',
        content: code.trim(),
        language
      });
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text after last code block
    if (lastIndex < content.length) {
      parts.push({
        type: 'text',
        content: content.slice(lastIndex)
      });
    }
    
    // If no code blocks were found, return original content as text
    if (parts.length === 0) {
      return [{
        type: 'text',
        content
      }];
    }
    
    return parts;
  } catch (error) {
    console.error('Error parsing message content:', error);
    // If parsing fails, fall back to displaying the raw content
    return [{
      type: 'text',
      content
    }];
  }
} 