// Image utility functions
const API_BASE_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

/**
 * Get the full URL for an image path
 * @param {string} imagePath - The image path from the database (e.g., "/uploads/images/medicines/image.jpg")
 * @returns {string} - The full URL to the image
 */
export const getImageUrl = (imagePath) => {
  if (!imagePath) return null;
  
  // If it's already a full URL, return as is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  
  // If it starts with /, remove it to avoid double slashes
  const cleanPath = imagePath.startsWith('/') ? imagePath.substring(1) : imagePath;
  
  return `${API_BASE_URL}/${cleanPath}`;
};

/**
 * Get a placeholder image URL
 * @param {number} width - Width of the placeholder
 * @param {number} height - Height of the placeholder
 * @param {string} text - Text to display in placeholder
 * @returns {string} - Placeholder image URL
 */
export const getPlaceholderImage = (width = 100, height = 100, text = 'No Image') => {
  return `https://via.placeholder.com/${width}x${height}/cccccc/666666?text=${encodeURIComponent(text)}`;
};

/**
 * Handle image error by setting a placeholder
 * @param {Event} event - The error event
 * @param {string} fallbackText - Text for the fallback image
 */
export const handleImageError = (event, fallbackText = 'No Image') => {
  const img = event.target;
  const width = img.width || 100;
  const height = img.height || 100;
  img.src = getPlaceholderImage(width, height, fallbackText);
};

export default {
  getImageUrl,
  getPlaceholderImage,
  handleImageError
}; 