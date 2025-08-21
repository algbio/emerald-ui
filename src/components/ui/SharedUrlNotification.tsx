import React, { useState, useEffect } from 'react';
import { getShareableDataFromUrl } from '../../utils/export/urlSharing';
import './SharedUrlNotification.css';

// Helper function to get cost matrix name
const getCostMatrixName = (matrixType: number): string => {
  const names = {
    0: 'BLOSUM45',
    1: 'BLOSUM50', 
    2: 'BLOSUM62',
    3: 'BLOSUM80',
    4: 'BLOSUM90',
    5: 'PAM30',
    6: 'PAM70',
    7: 'PAM250',
    8: 'IDENTITY'
  };
  return names[matrixType as keyof typeof names] || 'Unknown';
};

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
            {shareableData.gapCost !== undefined && shareableData.gapCost !== -1 && (
              <li><strong>Gap Cost:</strong> {shareableData.gapCost}</li>
            )}
            {shareableData.startGap !== undefined && shareableData.startGap !== -11 && (
              <li><strong>Start Gap:</strong> {shareableData.startGap}</li>
            )}
            {shareableData.costMatrixType !== undefined && shareableData.costMatrixType !== 2 && (
              <li><strong>Cost Matrix:</strong> {getCostMatrixName(shareableData.costMatrixType)}</li>
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
