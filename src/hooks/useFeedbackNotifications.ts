import { useFeedback } from '../context/FeedbackContext';

/**
 * Custom hook for easy access to feedback notifications
 * Provides convenient methods for showing different types of feedback
 */
export const useFeedbackNotifications = () => {
  const feedback = useFeedback();

  return {
    // Direct access to all feedback methods
    ...feedback,
    
    // Convenience methods with common patterns
    notifySuccess: (title: string, message?: string) => 
      feedback.showSuccess(title, message),
    
    notifyError: (title: string, message?: string) => 
      feedback.showError(title, message),
    
    notifyWarning: (title: string, message?: string) => 
      feedback.showWarning(title, message),
    
    notifyInfo: (title: string, message?: string) => 
      feedback.showInfo(title, message),
    
    // Quick notifications for common actions
    notifyButtonPress: (buttonName: string) => 
      feedback.showInfo('Action Completed', `${buttonName} button pressed`),
    
    notifyFileUploaded: (fileName: string) => 
      feedback.showSuccess('File Uploaded', `Successfully uploaded ${fileName}`),
    
    notifyFileUploadError: (fileName: string, error?: string) => 
      feedback.showError('Upload Failed', `Failed to upload ${fileName}${error ? `: ${error}` : ''}`),
    
    notifyCopySuccess: (content: string) => 
      feedback.showSuccess('Copied!', `${content} copied to clipboard`),
    
    notifyDownloadStarted: (fileName: string) => 
      feedback.showInfo('Download Started', `Downloading ${fileName}...`),
    
    notifySettingsSaved: () => 
      feedback.showSuccess('Settings Saved', 'Your preferences have been updated'),
    
    notifyNetworkError: () => 
      feedback.showError('Network Error', 'Please check your internet connection and try again'),
    
    notifyFeatureNotAvailable: (featureName: string) => 
      feedback.showWarning('Feature Unavailable', `${featureName} is not available in the current context`),
  };
};

export default useFeedbackNotifications;
