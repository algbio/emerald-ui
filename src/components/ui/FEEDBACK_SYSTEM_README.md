# Feedback Notification System

A comprehensive feedback notification system for the Emerald UI application that provides user feedback for various actions and events.

## Features

- **Multiple notification types**: success, error, warning, and info
- **Customizable positioning**: top/bottom, left/right/center
- **Auto-dismiss with configurable duration**
- **Manual dismiss capability**
- **Mobile responsive design**
- **Accessible with ARIA labels**
- **Stack multiple notifications**
- **Convenient pre-built notification functions**

## Components

### FeedbackNotification
The core notification component that displays individual notifications.

### FeedbackProvider
Context provider that manages the notification state and provides notification functions to child components.

### FeedbackDemo
A demo component showcasing all available notification types and functions.

## Setup

1. **Wrap your app with FeedbackProvider** (already done in App.tsx):

```tsx
import { FeedbackProvider } from './context/FeedbackContext';

function App() {
  return (
    <FeedbackProvider>
      {/* Your app content */}
    </FeedbackProvider>
  );
}
```

2. **Use the hook in your components**:

```tsx
import { useFeedbackNotifications } from '../../hooks/useFeedbackNotifications';

const MyComponent = () => {
  const { notifySuccess, notifyError } = useFeedbackNotifications();
  
  const handleAction = () => {
    try {
      // Your action here
      notifySuccess('Action Complete', 'The action was successful');
    } catch (error) {
      notifyError('Action Failed', 'Something went wrong');
    }
  };
  
  return <button onClick={handleAction}>Do Something</button>;
};
```

## Available Functions

### Basic Notification Types

- `notifySuccess(title, message?)` - Green success notification
- `notifyError(title, message?)` - Red error notification (doesn't auto-dismiss)
- `notifyWarning(title, message?)` - Orange warning notification
- `notifyInfo(title, message?)` - Blue info notification

### Convenience Functions

- `notifyButtonPress(buttonName)` - Quick notification for button presses
- `notifyFileUploaded(fileName)` - Success notification for file uploads
- `notifyFileUploadError(fileName, error?)` - Error notification for upload failures
- `notifyCopySuccess(content)` - Success notification for clipboard operations
- `notifyDownloadStarted(fileName)` - Info notification for downloads
- `notifySettingsSaved()` - Success notification for saved settings
- `notifyNetworkError()` - Error notification for network issues
- `notifyFeatureNotAvailable(featureName)` - Warning for unavailable features

### Control Functions

- `clearAll()` - Remove all notifications
- `hideFeedback(id)` - Remove a specific notification by ID

### Advanced Usage

For custom notifications with specific options:

```tsx
const { showFeedback } = useFeedbackNotifications();

const customNotification = showFeedback({
  type: 'success',
  title: 'Custom Notification',
  message: 'This is a custom notification',
  duration: 10000, // 10 seconds
  position: 'bottom-center',
  showIcon: false
});
```

## Configuration Options

### Notification Properties

- `type`: 'success' | 'error' | 'warning' | 'info'
- `title`: Main notification text (required)
- `message`: Optional detailed message
- `duration`: Auto-dismiss time in milliseconds (0 = no auto-dismiss)
- `position`: Where to show the notification
- `showIcon`: Whether to show the type icon

### Positions

- `top-right` (default)
- `top-left`
- `bottom-right`
- `bottom-left`
- `top-center`
- `bottom-center`

### Default Durations

- Success: 5 seconds
- Error: No auto-dismiss (manual dismiss only)
- Warning: 7 seconds
- Info: 5 seconds

## Styling

The notification system uses CSS custom properties from the existing design system:

- `--color-success`, `--color-error`, `--color-warning`, `--color-primary`
- `--bg-primary`, `--text-primary`, `--border-color`
- `--border-radius-lg`, `--shadow-lg`
- `--font-family-primary`

## Examples in the Codebase

### EmeraldInput Component
- Fetch button feedback for sequence loading
- Example data loading confirmation
- Alignment generation notifications

### ExportImagePanel Component
- Export start/complete notifications
- Copy to clipboard feedback
- Error handling for export failures

### ShareAndExportPanel Component
- Panel open notifications
- User guidance messages

## Testing

Use the `FeedbackDemo` component to test all notification types:

```tsx
import { FeedbackDemo } from './components/ui';

// Add this to your component temporarily for testing
<FeedbackDemo />
```

## Browser Support

- Modern browsers with ES2017+ support
- Clipboard API support for copy notifications
- CSS Grid and Flexbox support
- CSS custom properties support

## Accessibility

- ARIA labels for close buttons
- Keyboard navigation support
- High contrast mode compatible
- Screen reader friendly
- Focus management for notifications
