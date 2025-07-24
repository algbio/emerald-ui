import React, { useState, useEffect } from 'react';
import { getShareableDataFromUrl } from '../../utils/export/urlSharing';
import './SharedUrlNotification.css';

const SharedUrlNotification: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [shareableData, setShareableData] = useState<any>(null);

  useEffect(() => {
    const data = getShareableDataFromUrl();
    if (data) {
      setShareableData(data);
      setIsVisible(true);
      
      // Auto-hide after 10 seconds
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 10000);
      
      return () => clearTimeout(timer);
    }
  }, []);

  if (!isVisible || !shareableData) {
    return null;
  }

  return (
    <div className="shared-url-notification">
      <div className="notification-content">
        <div className="notification-header">
          <span className="notification-icon">🔗</span>
          <h3>Loading Shared Alignment</h3>
          <button 
            className="close-button"
            onClick={() => setIsVisible(false)}
            title="Close notification"
          >
            ×
          </button>
        </div>
        <div className="notification-body">
          <p>Loading alignment with:</p>
          <ul>
            <li><strong>Sequence A:</strong> {shareableData.seqA}</li>
            <li><strong>Sequence B:</strong> {shareableData.seqB}</li>
            {shareableData.alpha !== undefined && (
              <li><strong>Alpha:</strong> {shareableData.alpha}</li>
            )}
            {shareableData.delta !== undefined && (
              <li><strong>Delta:</strong> {shareableData.delta}</li>
            )}
          </ul>
          <p className="notification-status">
            Fetching sequences from UniProt...
          </p>
        </div>
      </div>
    </div>
  );
};

export default SharedUrlNotification;
