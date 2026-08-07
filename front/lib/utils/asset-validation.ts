/**
 * Asset Validation Utilities
 * 
 * Helper functions for validating asset accessibility and handling errors.
 * Requirements: 15.4, 15.5 (Task 15.3)
 */

/**
 * Check if an asset URL is accessible
 * @param url Asset URL to validate
 * @param timeout Timeout in milliseconds (default: 5000ms)
 * @returns Promise resolving to true if accessible, false otherwise
 */
export async function validateAssetAccessibility(
  url: string,
  timeout: number = 5000
): Promise<{ accessible: boolean; error?: string }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      return { accessible: true };
    } else {
      return {
        accessible: false,
        error: `Asset not accessible (HTTP ${response.status})`,
      };
    }
  } catch (error: any) {
    if (error.name === "AbortError") {
      return {
        accessible: false,
        error: "Asset validation timed out",
      };
    }
    return {
      accessible: false,
      error: error.message || "Failed to validate asset accessibility",
    };
  }
}

/**
 * Validate multiple assets in parallel
 * @param urls Array of asset URLs
 * @param timeout Timeout per asset in milliseconds
 * @returns Array of validation results
 */
export async function validateMultipleAssets(
  urls: string[],
  timeout: number = 5000
): Promise<
  Array<{ url: string; accessible: boolean; error?: string }>
> {
  const validations = urls.map(async (url) => {
    const result = await validateAssetAccessibility(url, timeout);
    return { url, ...result };
  });

  return Promise.all(validations);
}

/**
 * Check if a logo URL is valid and accessible
 * @param logoUrl Logo URL to validate
 * @returns Validation result with error message if any
 */
export async function validateLogoUrl(
  logoUrl: string | undefined
): Promise<{ valid: boolean; error?: string }> {
  if (!logoUrl) {
    return { valid: true }; // Empty logo is valid (optional)
  }

  // Check URL format
  try {
    new URL(logoUrl);
  } catch {
    return {
      valid: false,
      error: "Invalid logo URL format",
    };
  }

  // Check accessibility
  const result = await validateAssetAccessibility(logoUrl);
  if (!result.accessible) {
    return {
      valid: false,
      error: result.error || "Logo URL is not accessible",
    };
  }

  return { valid: true };
}

/**
 * Handle missing or inaccessible assets gracefully
 * @param assetUrl Asset URL
 * @param fallbackUrl Optional fallback URL
 * @returns Object with asset status and URL to use
 */
export async function handleMissingAsset(
  assetUrl: string | undefined,
  fallbackUrl?: string
): Promise<{
  url: string | undefined;
  status: "available" | "fallback" | "missing";
  error?: string;
}> {
  if (!assetUrl) {
    if (fallbackUrl) {
      return { url: fallbackUrl, status: "fallback" };
    }
    return { url: undefined, status: "missing" };
  }

  const validation = await validateAssetAccessibility(assetUrl, 3000);

  if (validation.accessible) {
    return { url: assetUrl, status: "available" };
  }

  if (fallbackUrl) {
    return {
      url: fallbackUrl,
      status: "fallback",
      error: validation.error,
    };
  }

  return {
    url: undefined,
    status: "missing",
    error: validation.error,
  };
}

/**
 * Create an error message for asset validation failures
 * @param assetType Type of asset (e.g., "logo", "header image")
 * @param error Error details
 * @returns User-friendly error message
 */
export function createAssetErrorMessage(
  assetType: string,
  error?: string
): string {
  if (!error) {
    return `The ${assetType} could not be loaded. Please re-upload.`;
  }

  if (error.includes("timeout")) {
    return `The ${assetType} took too long to load. Please check your internet connection and try again.`;
  }

  if (error.includes("404") || error.includes("not found")) {
    return `The ${assetType} was not found. It may have been deleted. Please re-upload.`;
  }

  if (error.includes("403") || error.includes("unauthorized")) {
    return `Access to the ${assetType} was denied. Please re-upload.`;
  }

  return `Failed to load ${assetType}: ${error}. Please re-upload or try again later.`;
}

/**
 * Validate template before saving
 * @param templateData Template configuration
 * @returns Validation result with errors
 */
export async function validateTemplateAssets(templateData: {
  name: string;
  logoUrl?: string;
  headerDocumentUrl?: string;
}): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  // Validate template name
  if (!templateData.name || templateData.name.trim().length < 3) {
    errors.push("Template name must be at least 3 characters");
  }

  // Validate logo if provided
  if (templateData.logoUrl) {
    const logoValidation = await validateLogoUrl(templateData.logoUrl);
    if (!logoValidation.valid) {
      errors.push(
        createAssetErrorMessage("logo", logoValidation.error)
      );
    }
  }

  // Validate header document if provided
  if (templateData.headerDocumentUrl) {
    const headerValidation = await validateAssetAccessibility(
      templateData.headerDocumentUrl
    );
    if (!headerValidation.accessible) {
      errors.push(
        createAssetErrorMessage("header document", headerValidation.error)
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Retry asset loading with exponential backoff
 * @param url Asset URL
 * @param maxRetries Maximum number of retry attempts
 * @returns Promise resolving to true if successful
 */
export async function retryAssetLoad(
  url: string,
  maxRetries: number = 3
): Promise<{ success: boolean; error?: string }> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const result = await validateAssetAccessibility(url);

    if (result.accessible) {
      return { success: true };
    }

    // Exponential backoff: 1s, 2s, 4s
    if (attempt < maxRetries - 1) {
      await new Promise((resolve) =>
        setTimeout(resolve, Math.pow(2, attempt) * 1000)
      );
    }
  }

  return {
    success: false,
    error: `Failed to load asset after ${maxRetries} attempts`,
  };
}
