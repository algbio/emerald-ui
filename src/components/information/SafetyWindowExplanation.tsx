import { useState } from 'react';
import explanationHtml from './SafetyWindowExplanationContent.html?raw';

export default function SafetyWindowExplanation() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="safety-window-explanation-section">
      <div className="safety-window-header" onClick={() => setIsExpanded(!isExpanded)}>
        <h2>Learn More about Alignment Safety</h2>
        <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>▼</span>
      </div>
      
      {isExpanded && (
        <div
          className="safety-window-content"
          dangerouslySetInnerHTML={{ __html: explanationHtml }}
        />
      )}
    </div>
  );
}
