/**
 * Layer Merging Utility
 * 
 * Merges all layers into a single image for export
 * Renders layers in correct Z-order (background first → topmost last)
 */

import { Platform } from 'react-native';

export interface LayerForMerge {
  id: string;
  type: string;
  visible?: boolean;
  enabled?: boolean;
  locked?: boolean;
  opacity?: number;
  source?: string | null;
  color?: string;
  transform?: {
    x: number;
    y: number;
    scale: number;
    rotate: number;
  };
  crop?: {
    x: number;
    y: number;
    w: number;
    h: number;
  } | null;
  drawing?: {
    paths?: Array<{
      points: string;
      color: string;
      strokeWidth: number;
      opacity?: number;
    }>;
  };
  text?: {
    content: string;
    x?: number;
    y?: number;
    fontSize: number;
    color: string;
    fontFamily?: string;
    bold?: boolean;
    italic?: boolean;
    align?: 'left' | 'center' | 'right';
  };
  shape?: {
    shapeType: string;
    x: number;
    y: number;
    width: number;
    height: number;
    strokeColor: string;
    fillColor?: string | null;
    strokeWidth: number;
  };
  adjustments?: {
    brightness?: number;
    contrast?: number;
    saturation?: number;
    hue?: number;
  };
}

/**
 * Load an image and return it as an HTMLImageElement
 */
async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Apply CSS filter string based on adjustment values
 */
function getFilterString(adjustments: LayerForMerge['adjustments']): string {
  if (!adjustments) return 'none';
  
  const brightness = 1 + ((adjustments.brightness || 0) / 100) * 0.5;
  const contrast = 1 + ((adjustments.contrast || 0) / 100) * 0.5;
  const saturate = 1 + ((adjustments.saturation || 0) / 100);
  const hueRotate = adjustments.hue || 0;
  
  return `brightness(${brightness}) contrast(${contrast}) saturate(${saturate}) hue-rotate(${hueRotate}deg)`;
}

/**
 * Merge all layers into a single canvas (Web only)
 * Returns a Blob of the merged image
 * 
 * @param layers - All layers to merge
 * @param canvasWidth - Export canvas width (actual dimensions)
 * @param canvasHeight - Export canvas height (actual dimensions)  
 * @param format - Output format
 * @param displayWidth - Display width (for scaling coordinates)
 * @param displayHeight - Display height (for scaling coordinates)
 */
export async function mergeAllLayers(
  layers: LayerForMerge[],
  canvasWidth: number,
  canvasHeight: number,
  format: 'png' | 'jpeg' = 'png',
  displayWidth?: number,
  displayHeight?: number
): Promise<Blob | null> {
  // Calculate scale factor from display to actual canvas
  const scaleX = displayWidth ? canvasWidth / displayWidth : 1;
  const scaleY = displayHeight ? canvasHeight / displayHeight : 1;
  console.log('📦 Export scale factors:', scaleX.toFixed(2), 'x', scaleY.toFixed(2));
  // Only works on web
  if (Platform.OS !== 'web') {
    console.warn('mergeAllLayers only works on web platform');
    return null;
  }

  // Create offscreen canvas
  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    console.error('Failed to get canvas context');
    return null;
  }

  // Clear canvas with white background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Draw layers in order (index 0 = bottom, last = top)
  for (const layer of layers) {
    // Skip invisible layers
    if (layer.visible === false || layer.enabled === false) continue;

    // Set layer opacity
    ctx.globalAlpha = layer.opacity ?? 1;

    // === BACKGROUND LAYER ===
    if (layer.type === 'background') {
      ctx.save();
      
      // Apply adjustments as filter (brightness, contrast, saturation, hue)
      if (layer.adjustments) {
        ctx.filter = getFilterString(layer.adjustments);
        console.log('📦 Applying background adjustments:', layer.adjustments);
      }
      
      // Apply transform if any (rotation, scale, position)
      const transform = layer.transform || { x: 0, y: 0, scale: 1, rotate: 0 };
      if (transform.rotate || transform.x || transform.y || transform.scale !== 1) {
        ctx.translate(canvasWidth / 2, canvasHeight / 2);
        ctx.rotate((transform.rotate || 0) * Math.PI / 180);
        ctx.scale(transform.scale || 1, transform.scale || 1);
        ctx.translate(-canvasWidth / 2, -canvasHeight / 2);
        ctx.translate(transform.x || 0, transform.y || 0);
      }
      
      if (layer.color) {
        ctx.fillStyle = layer.color;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      } else if (layer.source) {
        try {
          const img = await loadImage(layer.source);
          ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
          console.log('📦 Background image rendered with adjustments');
        } catch (e) {
          console.warn('Failed to load background image:', e);
        }
      }
      
      ctx.restore();
      continue;
    }

    // === IMAGE LAYER ===
    if (layer.type === 'image' && layer.source) {
      try {
        const img = await loadImage(layer.source);
        const transform = layer.transform || { x: 0, y: 0, scale: 1, rotate: 0 };
        
        ctx.save();
        
        // Apply adjustments as filter
        if (layer.adjustments) {
          ctx.filter = getFilterString(layer.adjustments);
        }
        
        // Apply transform
        ctx.translate(transform.x, transform.y);
        
        // Rotate around image center
        if (transform.rotate) {
          const imgCenterX = (img.width * transform.scale) / 2;
          const imgCenterY = (img.height * transform.scale) / 2;
          ctx.translate(imgCenterX, imgCenterY);
          ctx.rotate((transform.rotate * Math.PI) / 180);
          ctx.translate(-imgCenterX, -imgCenterY);
        }
        
        // Apply scale
        ctx.scale(transform.scale, transform.scale);
        
        // Handle crop
        if (layer.crop) {
          const { x: cx, y: cy, w, h } = layer.crop;
          ctx.drawImage(img, cx, cy, w, h, 0, 0, w, h);
        } else {
          ctx.drawImage(img, 0, 0);
        }
        
        ctx.restore();
      } catch (e) {
        console.warn('Failed to load image layer:', e);
      }
      continue;
    }

    // === DRAWING LAYER ===
    if (layer.type === 'drawing' && layer.drawing?.paths) {
      ctx.save();
      
      // Apply layer transform if any
      const transform = layer.transform || { x: 0, y: 0, scale: 1, rotate: 0 };
      ctx.translate(transform.x * scaleX, transform.y * scaleY);
      if (transform.rotate) {
        ctx.rotate((transform.rotate * Math.PI) / 180);
      }
      ctx.scale(transform.scale, transform.scale);
      
      for (const path of layer.drawing.paths) {
        ctx.beginPath();
        ctx.strokeStyle = path.color || '#000000';
        // Scale stroke width for export
        ctx.lineWidth = (path.strokeWidth || 2) * Math.max(scaleX, scaleY);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalAlpha = (path.opacity ?? 1) * (layer.opacity ?? 1);
        
        // Parse SVG path points and SCALE them for export
        const pathData = path.points;
        if (pathData && typeof pathData === 'string') {
          // Match M/L commands with coordinates
          const commands = pathData.match(/[ML]\s*-?[\d.]+[\s,]-?[\d.]+/gi);
          if (commands) {
            commands.forEach((cmd, i) => {
              const parts = cmd.trim().replace(/,/g, ' ').split(/\s+/);
              const cmdType = parts[0].toUpperCase();
              const x = parseFloat(parts[1] || parts[0].substring(1)) * scaleX;
              const y = parseFloat(parts[2] || parts[1]) * scaleY;
              
              if (cmdType === 'M' || i === 0) {
                ctx.moveTo(x, y);
              } else {
                ctx.lineTo(x, y);
              }
            });
          }
        }
        
        ctx.stroke();
      }
      
      ctx.restore();
      console.log('📦 Rendered drawing layer:', layer.name, layer.drawing.paths.length, 'paths (scaled)');
      continue;
    }

    // === TEXT LAYER ===
    if (layer.type === 'text' && layer.text) {
      ctx.save();
      
      // Apply layer transform with scaling
      const transform = layer.transform || { x: 0, y: 0, scale: 1, rotate: 0 };
      const textX = ((layer.text.x ?? transform.x) || canvasWidth / 2) * (layer.text.x ? scaleX : 1);
      const textY = ((layer.text.y ?? transform.y) || canvasHeight / 2) * (layer.text.y ? scaleY : 1);
      
      ctx.translate(textX, textY);
      if (transform.rotate) {
        ctx.rotate((transform.rotate * Math.PI) / 180);
      }
      ctx.scale(transform.scale, transform.scale);
      
      // Build font string - scale font size for export
      const fontStyle = layer.text.italic ? 'italic ' : '';
      const fontWeight = layer.text.bold ? 'bold ' : '';
      const scaledFontSize = (layer.text.fontSize || 24) * Math.max(scaleX, scaleY);
      ctx.font = `${fontStyle}${fontWeight}${scaledFontSize}px ${layer.text.fontFamily || 'Arial'}`;
      ctx.fillStyle = layer.text.color || '#FFFFFF';
      ctx.globalAlpha = layer.opacity ?? 1;
      ctx.textAlign = layer.text.align || 'center';
      ctx.textBaseline = 'middle';
      
      ctx.fillText(layer.text.content, 0, 0);
      ctx.restore();
      console.log('📦 Rendered text layer:', layer.name, layer.text.content, '(scaled)');
      continue;
    }

    // === SHAPE LAYER ===
    if (layer.type === 'shape' && layer.shape) {
      ctx.save();
      const { shapeType, strokeColor, fillColor, strokeWidth } = layer.shape;
      // Scale shape coordinates for export
      const x = layer.shape.x * scaleX;
      const y = layer.shape.y * scaleY;
      const width = layer.shape.width * scaleX;
      const height = layer.shape.height * scaleY;
      
      ctx.strokeStyle = strokeColor || '#000000';
      ctx.lineWidth = (strokeWidth || 2) * Math.max(scaleX, scaleY);
      
      if (fillColor) {
        ctx.fillStyle = fillColor;
      }
      
      ctx.beginPath();
      
      switch (shapeType) {
        case 'rectangle':
          if (fillColor) ctx.fillRect(x, y, width, height);
          ctx.strokeRect(x, y, width, height);
          break;
        case 'circle':
          const radius = Math.min(width, height) / 2;
          ctx.arc(x + radius, y + radius, radius, 0, Math.PI * 2);
          if (fillColor) ctx.fill();
          ctx.stroke();
          break;
        case 'triangle':
          ctx.moveTo(x + width / 2, y);
          ctx.lineTo(x + width, y + height);
          ctx.lineTo(x, y + height);
          ctx.closePath();
          if (fillColor) ctx.fill();
          ctx.stroke();
          break;
        case 'line':
          ctx.moveTo(x, y);
          ctx.lineTo(x + width, y + height);
          ctx.stroke();
          break;
        default:
          if (fillColor) ctx.fillRect(x, y, width, height);
          ctx.strokeRect(x, y, width, height);
      }
      
      ctx.restore();
      continue;
    }
  }

  // Reset global alpha
  ctx.globalAlpha = 1;

  // Return as blob
  return new Promise((resolve) => {
    const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
    canvas.toBlob((blob) => resolve(blob), mimeType, 0.95);
  });
}

/**
 * Merge layers and return as data URL
 */
export async function mergeAllLayersToDataURL(
  layers: LayerForMerge[],
  canvasWidth: number,
  canvasHeight: number,
  format: 'png' | 'jpeg' = 'png'
): Promise<string | null> {
  const blob = await mergeAllLayers(layers, canvasWidth, canvasHeight, format);
  if (!blob) return null;
  
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}

