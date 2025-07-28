import React, { useEffect, useState, useRef } from 'react';
import './FeedbackNotification.css';

export type FeedbackType = 'success' | 'error' | 'warning' | 'info';

export interface FeedbackNotificationProps {
  id: string;
  type: FeedbackType;
  title: string;
  message?: string;
  duration?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  showIcon?: boolean;
  index?: number; // Add index for stacking
  cumulativeOffset?: number; // Cumulative height offset from previous notifications
  onClose: (id: string) => void;
  onHeightMeasured?: (id: string, height: number) => void; // Callback to report measured height
}

const FeedbackNotification: React.FC<FeedbackNotificationProps> = ({
  id,
  type,
  title,
  message,
  duration = 5000,
  position = 'top-right',
  showIcon = true,
  index = 0,
  cumulativeOffset = 0,
  onClose,
  onHeightMeasured,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Measure height and report to parent when component is visible
  useEffect(() => {
    if (isVisible && notificationRef.current && onHeightMeasured) {
      const height = notificationRef.current.getBoundingClientRect().height;
      onHeightMeasured(id, height);
    }
  }, [isVisible, id, onHeightMeasured]);

  useEffect(() => {
    // Trigger animation on mount with a stagger delay
    const staggerDelay = index * 100; // 100ms delay between each notification
    const timer = setTimeout(() => setIsVisible(true), 10 + staggerDelay);
    return () => clearTimeout(timer);
  }, [index]);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration]);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => {
      onClose(id);
    }, 300); // Match animation duration
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
      default:
        return 'ℹ️';
    }
  };

  // Calculate dynamic positioning based on cumulative height
  const getStackOffset = () => {
    const baseSpacing = 16; // Base spacing between notifications in pixels
    const offset = cumulativeOffset + (index * baseSpacing);
    const zIndex = 1000 + (10 - index); // Higher z-index for newer notifications
    
    if (position.includes('top')) {
      return { 
        transform: `translateY(${offset}px)`,
        zIndex: zIndex
      };
    } else {
      return { 
        transform: `translateY(-${offset}px)`,
        zIndex: zIndex
      };
    }
  };

  const stackStyle = isVisible ? getStackOffset() : {};

  return (
    <div
      ref={notificationRef}
      className={`feedback-notification feedback-notification--${type} feedback-notification--${position} ${
        isVisible ? 'feedback-notification--visible' : ''
      } ${isLeaving ? 'feedback-notification--leaving' : ''}`}
      style={stackStyle}
    >
      <div className="feedback-notification__content">
        <div className="feedback-notification__header">
          {showIcon && (
            <span className="feedback-notification__icon">
              {getIcon()}
            </span>
          )}
          <h4 className="feedback-notification__title">{title}</h4>
          <button
            className="feedback-notification__close"
            onClick={handleClose}
            title="Close notification"
            aria-label="Close notification"
          >
            ×
          </button>
        </div>
        {message && (
          <div className="feedback-notification__body">
            <p className="feedback-notification__message">{message}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FeedbackNotification;
