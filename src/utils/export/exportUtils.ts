/**
 * Utility functions for exporting canvas content as images
 */

/**
 * Export a canvas element as a PNG image
 * @param canvas - The canvas element to export
 * @param filename - The filename for the downloaded image
 * @param quality - Image quality (0-1, only for JPEG)
 */
export const exportCanvasAsPNG = (
  canvas: HTMLCanvasElement, 
  filename: string = 'alignment-graph.png', 
  quality: number = 1.0
): void => {
  try {
    // Create a download link
    const link = document.createElement('a');
    link.download = filename;
    
    // Export the canvas as PNG
    const dataURL = canvas.toDataURL('image/png', quality);
    link.href = dataURL;
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Failed to export canvas as PNG:', error);
    throw new Error('Failed to export image. Please try again.');
  }
};

/**
 * Export a canvas element as a JPEG image
 * @param canvas - The canvas element to export
 * @param filename - The filename for the downloaded image
 * @param quality - Image quality (0-1)
 */
export const exportCanvasAsJPEG = (
  canvas: HTMLCanvasElement, 
  filename: string = 'alignment-graph.jpg', 
  quality: number = 0.9
): void => {
  try {
    // Create a download link
    const link = document.createElement('a');
    link.download = filename;
    
    // Export the entire canvas
    const dataURL = canvas.toDataURL('image/jpeg', quality);
    
    link.href = dataURL;
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Failed to export canvas as JPEG:', error);
    throw new Error('Failed to export image. Please try again.');
  }
};

/**
 * Get a data URL from a canvas element
 * @param canvas - The canvas element
 * @param format - The image format ('png' or 'jpeg')
 * @param quality - Image quality (0-1, only for JPEG)
 * @returns Data URL string
 */
export const getCanvasDataURL = (canvas: HTMLCanvasElement, format: 'png' | 'jpeg' = 'png', quality: number = 1.0): string => {
  const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
  return canvas.toDataURL(mimeType, quality);
};

/**
 * Copy canvas content to clipboard as an image
 * @param canvas - The canvas element to copy
 */
export const copyCanvasToClipboard = async (
  canvas: HTMLCanvasElement
): Promise<void> => {
  try {
    // Convert canvas to blob directly
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob from canvas'));
        }
      }, 'image/png');
    });

    // Check if clipboard API is supported
    if (navigator.clipboard && navigator.clipboard.write) {
      const clipboardItem = new ClipboardItem({ 'image/png': blob });
      await navigator.clipboard.write([clipboardItem]);
    } else {
      throw new Error('Clipboard API not supported');
    }
  } catch (error) {
    console.error('Failed to copy canvas to clipboard:', error);
    throw new Error('Failed to copy image to clipboard. Your browser may not support this feature.');
  }
};

/**
 * Generate a filename based on descriptors and timestamp
 * @param descriptorA - First sequence descriptor
 * @param descriptorB - Second sequence descriptor
 * @param format - File format ('png' or 'jpeg')
 * @returns Generated filename
 */
export const generateExportFilename = (
  descriptorA?: string, 
  descriptorB?: string, 
  format: 'png' | 'jpeg' | 'svg' = 'png'
): string => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  
  if (descriptorA && descriptorB) {
    // Clean descriptors for filename (remove special characters)
    const cleanA = descriptorA.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 20);
    const cleanB = descriptorB.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 20);
    return `emerald_alignment_${cleanA}_vs_${cleanB}_${timestamp}.${format}`;
  }
  
  return `emerald_alignment_${timestamp}.${format}`;
};
