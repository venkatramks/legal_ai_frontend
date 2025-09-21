import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';

interface TypingAnimationProps {
  text: string;
  speed?: number;
  onComplete?: () => void;
}

export const TypingAnimation: React.FC<TypingAnimationProps> = ({
  text,
  speed = 30,
  onComplete
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, speed);

      return () => clearTimeout(timer);
    } else if (onComplete) {
      onComplete();
    }
  }, [currentIndex, text, speed, onComplete]);

  // Reset when text changes
  useEffect(() => {
    setDisplayedText('');
    setCurrentIndex(0);
  }, [text]);

  // Format the displayed text with markdown
  const formatText = (markdownText: string) => {
    return (
      <ReactMarkdown rehypePlugins={[rehypeRaw as any]}
        components={{
          p: ({ children }) => <div className="gpt-paragraph">{children}</div>,
          ul: ({ children }) => <ul className="gpt-list">{children}</ul>,
          ol: ({ children }) => <ol className="gpt-list">{children}</ol>,
          li: ({ children }) => <li>{children}</li>,
          code: ({ children, ...props }) => 
            props.className?.includes('language-') ? 
              <pre className="gpt-code"><code>{children}</code></pre> : 
              <code className="gpt-inline-code">{children}</code>,
          strong: ({ children }) => <strong className="gpt-bold">{children}</strong>,
          em: ({ children }) => <em className="gpt-italic">{children}</em>,
          blockquote: ({ children }) => <blockquote className="gpt-quote">{children}</blockquote>,
          h1: ({ children }) => <h1 className="gpt-h1">{children}</h1>,
          h2: ({ children }) => <h2 className="gpt-h2">{children}</h2>,
          h3: ({ children }) => <h3 className="gpt-h3">{children}</h3>,
        }}
      >
        {markdownText}
      </ReactMarkdown>
    );
  };

  return (
    <span>
      {formatText(displayedText)}
      {currentIndex < text.length && (
        <span className="typing-cursor">|</span>
      )}
    </span>
  );
};