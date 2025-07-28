import React from 'react';
import { useFeedbackNotifications } from '../../hooks/useFeedbackNotifications';
import './FeedbackDemo.css';

/**
 * Demo component to showcase the feedback notification system
 * This component demonstrates all the different types of notifications available
 */
const FeedbackDemo: React.FC = () => {
  const {
    notifySuccess,
    notifyError,
    notifyWarning,
    notifyInfo,
    notifyButtonPress,
    notifyFileUploaded,
    notifyFileUploadError,
    notifyCopySuccess,
    notifyDownloadStarted,
    notifySettingsSaved,
    notifyNetworkError,
    notifyFeatureNotAvailable,
    showFeedback,
    clearAll
  } = useFeedbackNotifications();

  return (
    <div className="feedback-demo">
      <h3>Feedback Notification Demo</h3>
      <p>Click the buttons below to test different types of feedback notifications:</p>
      
      <div className="demo-section">
        <h4>Basic Types</h4>
        <div className="demo-buttons">
          <button 
            onClick={() => notifySuccess('Success!', 'This is a success message')}
            className="demo-button success"
          >
            Show Success
          </button>
          
          <button 
            onClick={() => notifyError('Error!', 'This is an error message')}
            className="demo-button error"
          >
            Show Error
          </button>
          
          <button 
            onClick={() => notifyWarning('Warning!', 'This is a warning message')}
            className="demo-button warning"
          >
            Show Warning
          </button>
          
          <button 
            onClick={() => notifyInfo('Info', 'This is an info message')}
            className="demo-button info"
          >
            Show Info
          </button>
        </div>
      </div>

      <div className="demo-section">
        <h4>Common Actions</h4>
        <div className="demo-buttons">
          <button 
            onClick={() => notifyButtonPress('Demo Button')}
            className="demo-button"
          >
            Button Press
          </button>
          
          <button 
            onClick={() => notifyFileUploaded('example.fasta')}
            className="demo-button"
          >
            File Uploaded
          </button>
          
          <button 
            onClick={() => notifyFileUploadError('example.fasta', 'Invalid format')}
            className="demo-button"
          >
            Upload Error
          </button>
          
          <button 
            onClick={() => notifyCopySuccess('Alignment data')}
            className="demo-button"
          >
            Copy Success
          </button>
        </div>
      </div>

      <div className="demo-section">
        <h4>System Actions</h4>
        <div className="demo-buttons">
          <button 
            onClick={() => notifyDownloadStarted('alignment.png')}
            className="demo-button"
          >
            Download Started
          </button>
          
          <button 
            onClick={() => notifySettingsSaved()}
            className="demo-button"
          >
            Settings Saved
          </button>
          
          <button 
            onClick={() => notifyNetworkError()}
            className="demo-button"
          >
            Network Error
          </button>
          
          <button 
            onClick={() => notifyFeatureNotAvailable('Advanced Export')}
            className="demo-button"
          >
            Feature Unavailable
          </button>
        </div>
      </div>

      <div className="demo-section">
        <h4>Stacking Test</h4>
        <div className="demo-buttons">
          <button 
            onClick={() => {
              // Test stacking with multiple notifications
              notifyInfo('Test 1', 'First notification');
              setTimeout(() => notifySuccess('Test 2', 'Second notification'), 100);
              setTimeout(() => notifyWarning('Test 3', 'Third notification'), 200);
              setTimeout(() => notifyError('Test 4', 'Fourth notification'), 300);
            }}
            className="demo-button"
          >
            Test Multiple Notifications
          </button>
          
          <button 
            onClick={() => {
              // Test different positions
              notifyInfo('Top Right', 'Testing top-right position');
              setTimeout(() => {
                showFeedback({
                  type: 'success',
                  title: 'Top Left',
                  message: 'Testing top-left position',
                  position: 'top-left'
                });
              }, 150);
            }}
            className="demo-button"
          >
            Test Different Positions
          </button>
        </div>
      </div>

      <div className="demo-section">
        <h4>Controls</h4>
        <div className="demo-buttons">
          <button 
            onClick={() => clearAll()}
            className="demo-button clear"
          >
            Clear All Notifications
          </button>
        </div>
      </div>
    </div>
  );
};

export default FeedbackDemo;
