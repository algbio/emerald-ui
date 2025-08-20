import React, { useState, useEffect } from 'react';
import { generateShareableUrl, isAlignmentShareable, checkBrowserCompatibility } from '../../utils/export/urlSharing';
import '../shared/Panel.css';
import './ShareUrlPanel.css';

interface ShareUrlPanelProps {
  descriptorA: string;
  descriptorB: string;
  alpha: number;
  delta: number;
  accessionA?: string;
  accessionB?: string;
}

const ShareUrlPanel: React.FC<ShareUrlPanelProps> = ({
  descriptorA,
  descriptorB,
  alpha,
  delta,
  accessionA,
  accessionB
}) => {
  const [isCopied, setIsCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [browserSupport, setBrowserSupport] = useState<{ supported: boolean; missingFeatures: string[] } | null>(null);
  
  // Check browser compatibility on mount
  useEffect(() => {
    const support = checkBrowserCompatibility();
    setBrowserSupport(support);
    
    if (!support.supported) {
      console.warn('Browser missing required features for URL sharing:', support.missingFeatures);
    }
  }, []);
  
  // Check if this alignment can be shared
  const isShareable = isAlignmentShareable(descriptorA, descriptorB, accessionA, accessionB);
  
  if (!isShareable || !browserSupport?.supported) {
    return null;
  }
  
  const shareUrl = generateShareableUrl(descriptorA, descriptorB, alpha, delta, accessionA, accessionB);
  
  if (!shareUrl) {
    return null;
  }
  
  const handleCopyUrl = async () => {
    setCopyError(null);
    
    try {
      // Try modern clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
        return;
      }
      
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      textArea.style.position = 'fixed';
      textArea.style.top = '0';
      textArea.style.left = '0';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      if (successful) {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      } else {
        throw new Error('Copy command failed');
      }
    } catch (err) {
      console.error('Failed to copy URL:', err);
      setCopyError('Failed to copy URL. Please select and copy manually.');
      setTimeout(() => setCopyError(null), 5000);
    }
  };
  
  return (
    <div className="panel panel--compact">
      <div className="panel-header panel-header--compact">
        <h3>🔗 Share This Alignment</h3>
        <p className="panel-subtitle">This alignment uses UniProt sequences and can be shared with a URL</p>
      </div>
      
      <div className="panel-form-group">
        <div className="panel-display-group">
          <input
            type="text"
            value={shareUrl}
            readOnly
            className="panel-display-input"
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
          <button
            onClick={handleCopyUrl}
            className={`panel-button ${isCopied ? 'panel-button--success' : ''}`}
            title="Copy URL to clipboard"
          >
            {isCopied ? '✓ Copied!' : '📋 Copy'}
          </button>
        </div>
        
        {copyError && (
          <div className="panel-error">
            ⚠️ {copyError}
          </div>
        )}
        
        <div className="panel-info">
          <p>Share this URL to let others reproduce this exact alignment with:</p>
          <ul>
            <li>UniProt sequences A & B</li>
            <li>Alpha = {alpha}</li>
            <li>Delta = {delta}</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ShareUrlPanel;
