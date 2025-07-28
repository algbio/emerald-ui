import React, { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import FeedbackNotification from '../components/ui/FeedbackNotification';
import type { FeedbackType, FeedbackNotificationProps } from '../components/ui/FeedbackNotification';

export interface FeedbackMessage {
  id: string;
  type: FeedbackType;
  title: string;
  message?: string;
  duration?: number;
  position?: FeedbackNotificationProps['position'];
  showIcon?: boolean;
}

interface FeedbackContextType {
  notifications: FeedbackMessage[];
  showFeedback: (feedback: Omit<FeedbackMessage, 'id'>) => string;
  showSuccess: (title: string, message?: string, options?: Partial<FeedbackMessage>) => string;
  showError: (title: string, message?: string, options?: Partial<FeedbackMessage>) => string;
  showWarning: (title: string, message?: string, options?: Partial<FeedbackMessage>) => string;
  showInfo: (title: string, message?: string, options?: Partial<FeedbackMessage>) => string;
  hideFeedback: (id: string) => void;
  clearAll: () => void;
}

const FeedbackContext = createContext<FeedbackContextType | undefined>(undefined);

export const useFeedback = () => {
  const context = useContext(FeedbackContext);
  if (!context) {
    throw new Error('useFeedback must be used within a FeedbackProvider');
  }
  return context;
};

interface FeedbackProviderProps {
  children: ReactNode;
  maxNotifications?: number;
}

export const FeedbackProvider: React.FC<FeedbackProviderProps> = ({ 
  children, 
  maxNotifications = 5 
}) => {
  const [notifications, setNotifications] = useState<FeedbackMessage[]>([]);
  const [notificationHeights, setNotificationHeights] = useState<Record<string, number>>({});

  const handleHeightMeasured = useCallback((id: string, height: number) => {
    setNotificationHeights(prev => ({
      ...prev,
      [id]: height
    }));
  }, []);

  const generateId = useCallback(() => {
    return `feedback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  const showFeedback = useCallback((feedback: Omit<FeedbackMessage, 'id'>): string => {
    const id = generateId();
    const newNotification: FeedbackMessage = {
      id,
      duration: 5000,
      position: 'top-right',
      showIcon: true,
      ...feedback,
    };

    setNotifications(prev => {
      const updated = [newNotification, ...prev];
      // Keep only the most recent notifications up to maxNotifications
      return updated.slice(0, maxNotifications);
    });

    return id;
  }, [generateId, maxNotifications]);

  const showSuccess = useCallback((
    title: string, 
    message?: string, 
    options?: Partial<FeedbackMessage>
  ): string => {
    return showFeedback({
      type: 'success',
      title,
      message,
      ...options,
    });
  }, [showFeedback]);

  const showError = useCallback((
    title: string, 
    message?: string, 
    options?: Partial<FeedbackMessage>
  ): string => {
    return showFeedback({
      type: 'error',
      title,
      message,
      duration: 0, // Don't auto-hide errors by default
      ...options,
    });
  }, [showFeedback]);

  const showWarning = useCallback((
    title: string, 
    message?: string, 
    options?: Partial<FeedbackMessage>
  ): string => {
    return showFeedback({
      type: 'warning',
      title,
      message,
      duration: 7000, // Slightly longer for warnings
      ...options,
    });
  }, [showFeedback]);

  const showInfo = useCallback((
    title: string, 
    message?: string, 
    options?: Partial<FeedbackMessage>
  ): string => {
    return showFeedback({
      type: 'info',
      title,
      message,
      ...options,
    });
  }, [showFeedback]);

  const hideFeedback = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
    setNotificationHeights(prev => {
      const updated = { ...prev };
      delete updated[id];
      return updated;
    });
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    setNotificationHeights({});
  }, []);

  const contextValue: FeedbackContextType = {
    notifications,
    showFeedback,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    hideFeedback,
    clearAll,
  };

  return (
    <FeedbackContext.Provider value={contextValue}>
      {children}
      {/* Render notifications grouped by position */}
      {Object.entries(
        notifications.reduce((groups: Record<string, FeedbackMessage[]>, notification) => {
          const position = notification.position || 'top-right';
          if (!groups[position]) groups[position] = [];
          groups[position].push(notification);
          return groups;
        }, {})
      ).map(([, positionNotifications]) => {
        // Calculate cumulative offsets for this position group
        let cumulativeOffset = 0;
        
        return positionNotifications.map((notification, index) => {
          const currentOffset = cumulativeOffset;
          
          // Add this notification's height to the cumulative offset for the next one
          const notificationHeight = notificationHeights[notification.id] || 0;
          cumulativeOffset += notificationHeight;
          
          return (
            <FeedbackNotification
              key={notification.id}
              {...notification}
              index={index}
              cumulativeOffset={currentOffset}
              onClose={hideFeedback}
              onHeightMeasured={handleHeightMeasured}
            />
          );
        });
      })}
    </FeedbackContext.Provider>
  );
};

export default FeedbackProvider;
