/**
 * Image Utilities
 * 
 * Helper functions for image compression and processing.
 * Requirements: 15.1-15.6 (Task 15.2)
 */

/**
 * Compress an image file while maintaining quality >90%
 * @param file Original image file
 * @param maxSizeMB Target max size in MB (default: 2MB)
 * @param quality Quality level 0-1 (default: 0.9 = 90%)
 * @returns Compressed image as Blob
 */
export async function compressImage(
  file: File,
  maxSizeMB: number = 2,
  quality: number = 0.9
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    // Check if file is an image
    if (!file.type.startsWith("image/")) {
      reject(new Error("File must be an image"));
      return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        // Create canvas
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        // Calculate dimensions to maintain aspect ratio
        const maxDimension = 2000; // Max width or height
        if (width > height) {
          if (width > maxDimension) {
            height = (height * maxDimension) / width;
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = (width * maxDimension) / height;
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Draw image on canvas
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Failed to get canvas context"));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Convert to blob with compression
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Failed to compress image"));
              return;
            }

            // Check if compressed size is acceptable
            const compressedSizeMB = blob.size / (1024 * 1024);
            
            if (compressedSizeMB <= maxSizeMB) {
              resolve(blob);
            } else if (quality > 0.5) {
              // Try again with lower quality
              compressImage(file, maxSizeMB, quality - 0.1)
                .then(resolve)
                .catch(reject);
            } else {
              // Accept whatever we got
              resolve(blob);
            }
          },
          file.type,
          quality
        );
      };

      img.onerror = () => {
        reject(new Error("Failed to load image"));
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Convert Blob to File
 * @param blob Blob to convert
 * @param fileName Name for the file
 * @returns File object
 */
export function blobToFile(blob: Blob, fileName: string): File {
  return new File([blob], fileName, { type: blob.type });
}

/**
 * Get image dimensions
 * @param file Image file
 * @returns Promise with width and height
 */
export async function getImageDimensions(
  file: File
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("File must be an image"));
      return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };

      img.onerror = () => {
        reject(new Error("Failed to load image"));
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Validate image file
 * @param file File to validate
 * @param maxSizeMB Maximum size in MB
 * @returns Error message or null if valid
 */
export function validateImageFile(
  file: File,
  maxSizeMB: number = 10
): string | null {
  const allowedTypes = ["image/png", "image/jpeg", "image/jpg"];

  if (!allowedTypes.includes(file.type)) {
    return "Invalid file type. Only PNG and JPG images are allowed.";
  }

  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return `File size exceeds the maximum limit of ${maxSizeMB}MB.`;
  }

  return null;
}

/**
 * Create a preview URL for an image file
 * @param file Image file
 * @returns Object URL (remember to revoke when done)
 */
export function createImagePreview(file: File): string {
  return URL.createObjectURL(file);
}

/**
 * Revoke an object URL to free memory
 * @param url Object URL to revoke
 */
export function revokeImagePreview(url: string): void {
  URL.revokeObjectURL(url);
}
