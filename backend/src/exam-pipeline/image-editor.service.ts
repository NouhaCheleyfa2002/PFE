import { Injectable, Logger } from '@nestjs/common';
import sharp from 'sharp';

export interface CropOptions {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RotateOptions {
  angle: number; // 0, 90, 180, 270
}

export interface AdjustOptions {
  brightness?: number; // -100 to 100
  contrast?: number; // -100 to 100
  saturation?: number; // -100 to 100
}

export interface AnnotationOptions {
  type: 'arrow' | 'circle' | 'rectangle' | 'text';
  x: number;
  y: number;
  width?: number;
  height?: number;
  text?: string;
  color?: string;
}

@Injectable()
export class ImageEditorService {
  private readonly logger = new Logger(ImageEditorService.name);

  /**
   * Crop an image
   */
  async crop(base64Data: string, options: CropOptions): Promise<string> {
    try {
      const buffer = Buffer.from(base64Data, 'base64');

      const cropped = await sharp(buffer)
        .extract({
          left: Math.round(options.x),
          top: Math.round(options.y),
          width: Math.round(options.width),
          height: Math.round(options.height),
        })
        .toBuffer();

      return cropped.toString('base64');
    } catch (error) {
      this.logger.error('Failed to crop image:', error);
      throw error;
    }
  }

  /**
   * Rotate an image
   */
  async rotate(base64Data: string, options: RotateOptions): Promise<string> {
    try {
      const buffer = Buffer.from(base64Data, 'base64');

      const rotated = await sharp(buffer)
        .rotate(options.angle)
        .toBuffer();

      return rotated.toString('base64');
    } catch (error) {
      this.logger.error('Failed to rotate image:', error);
      throw error;
    }
  }

  /**
   * Adjust image brightness, contrast, saturation
   */
  async adjust(base64Data: string, options: AdjustOptions): Promise<string> {
    try {
      const buffer = Buffer.from(base64Data, 'base64');

      let pipeline = sharp(buffer);

      // Apply adjustments
      if (options.brightness !== undefined || options.contrast !== undefined || options.saturation !== undefined) {
        pipeline = pipeline.modulate({
          brightness: options.brightness !== undefined 
            ? 1 + (options.brightness / 100) 
            : 1,
          saturation: options.saturation !== undefined 
            ? 1 + (options.saturation / 100) 
            : 1,
        });
      }

      // Contrast is handled differently
      if (options.contrast !== undefined) {
        const contrast = 1 + (options.contrast / 100);
        pipeline = pipeline.linear(contrast, -(128 * contrast) + 128);
      }

      const adjusted = await pipeline.toBuffer();
      return adjusted.toString('base64');
    } catch (error) {
      this.logger.error('Failed to adjust image:', error);
      throw error;
    }
  }

  /**
   * Enhance image quality (sharpen, denoise)
   */
  async enhance(base64Data: string): Promise<string> {
    try {
      const buffer = Buffer.from(base64Data, 'base64');

      const enhanced = await sharp(buffer)
        .sharpen()
        .normalize()
        .toBuffer();

      return enhanced.toString('base64');
    } catch (error) {
      this.logger.error('Failed to enhance image:', error);
      throw error;
    }
  }

  /**
   * Convert image to grayscale
   */
  async grayscale(base64Data: string): Promise<string> {
    try {
      const buffer = Buffer.from(base64Data, 'base64');

      const gray = await sharp(buffer)
        .grayscale()
        .toBuffer();

      return gray.toString('base64');
    } catch (error) {
      this.logger.error('Failed to convert to grayscale:', error);
      throw error;
    }
  }

  /**
   * Increase contrast for better readability
   */
  async increaseContrast(base64Data: string, amount: number = 50): Promise<string> {
    try {
      return this.adjust(base64Data, { contrast: amount });
    } catch (error) {
      this.logger.error('Failed to increase contrast:', error);
      throw error;
    }
  }

  /**
   * Remove background (make transparent or white)
   */
  async removeBackground(base64Data: string, color: 'transparent' | 'white' = 'white'): Promise<string> {
    try {
      const buffer = Buffer.from(base64Data, 'base64');

      let pipeline = sharp(buffer);

      if (color === 'white') {
        pipeline = pipeline.flatten({ background: { r: 255, g: 255, b: 255 } });
      }

      const processed = await pipeline.toBuffer();
      return processed.toString('base64');
    } catch (error) {
      this.logger.error('Failed to remove background:', error);
      throw error;
    }
  }

  /**
   * Add border to image
   */
  async addBorder(
    base64Data: string,
    borderWidth: number = 2,
    borderColor: string = '#000000',
  ): Promise<string> {
    try {
      const buffer = Buffer.from(base64Data, 'base64');
      const metadata = await sharp(buffer).metadata();

      const r = parseInt(borderColor.slice(1, 3), 16);
      const g = parseInt(borderColor.slice(3, 5), 16);
      const b = parseInt(borderColor.slice(5, 7), 16);

      const bordered = await sharp(buffer)
        .extend({
          top: borderWidth,
          bottom: borderWidth,
          left: borderWidth,
          right: borderWidth,
          background: { r, g, b },
        })
        .toBuffer();

      return bordered.toString('base64');
    } catch (error) {
      this.logger.error('Failed to add border:', error);
      throw error;
    }
  }

  /**
   * Resize image to specific dimensions
   */
  async resize(
    base64Data: string,
    width?: number,
    height?: number,
    fit: 'cover' | 'contain' | 'fill' = 'contain',
  ): Promise<string> {
    try {
      const buffer = Buffer.from(base64Data, 'base64');

      const resized = await sharp(buffer)
        .resize(width, height, {
          fit: fit as any,
          withoutEnlargement: false,
        })
        .toBuffer();

      return resized.toString('base64');
    } catch (error) {
      this.logger.error('Failed to resize image:', error);
      throw error;
    }
  }

  /**
   * Flip image horizontally or vertically
   */
  async flip(base64Data: string, direction: 'horizontal' | 'vertical'): Promise<string> {
    try {
      const buffer = Buffer.from(base64Data, 'base64');

      let flipped;
      if (direction === 'horizontal') {
        flipped = await sharp(buffer).flop().toBuffer();
      } else {
        flipped = await sharp(buffer).flip().toBuffer();
      }

      return flipped.toString('base64');
    } catch (error) {
      this.logger.error('Failed to flip image:', error);
      throw error;
    }
  }

  /**
   * Apply blur effect
   */
  async blur(base64Data: string, sigma: number = 3): Promise<string> {
    try {
      const buffer = Buffer.from(base64Data, 'base64');

      const blurred = await sharp(buffer)
        .blur(sigma)
        .toBuffer();

      return blurred.toString('base64');
    } catch (error) {
      this.logger.error('Failed to blur image:', error);
      throw error;
    }
  }

  /**
   * Get image metadata
   */
  async getMetadata(base64Data: string): Promise<{
    width: number;
    height: number;
    format: string;
    size: number;
    hasAlpha: boolean;
  }> {
    try {
      const buffer = Buffer.from(base64Data, 'base64');
      const metadata = await sharp(buffer).metadata();

      return {
        width: metadata.width || 0,
        height: metadata.height || 0,
        format: metadata.format || 'unknown',
        size: buffer.length,
        hasAlpha: metadata.hasAlpha || false,
      };
    } catch (error) {
      this.logger.error('Failed to get metadata:', error);
      throw error;
    }
  }
}
