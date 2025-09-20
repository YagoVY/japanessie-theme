/**
 * Text Layout Engine - SIMPLIFIED FONT SIZING + SMART LINE BREAKING
 * File: assets/text-layout-engine.js
 * UPDATED: Fixed font size (40px) with adaptive scaling + proper line breaking
 */

console.log('[TLE v2025-09-16-b] loaded');


class TextLayoutEngine {
  constructor(canvasWidth = 600, canvasHeight = 600) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    
    this.config = {
      printArea: {
        widthInches: 12,
        heightInches: 16,
        dpi: 300
      },
      
      // EXACT MEASUREMENTS from your Photoshop analysis
      canvasMapping: {
        horizontal: {
          x: 200,
          y: 78,
          width: 200,
          height: 270
        },
        vertical: {
          x: 200,
          y: 78,
          width: 200,
          height: 270
        }
      },
      
      margins: {
        top: 3,
        bottom: 3,
        left: 3,
        right: 3
      },
      
      // SIMPLIFIED FONT SETTINGS
      baseFontSize: 40,        // Fixed starting size
      minFontSize: 12,         // Minimum readable size
      scaleStep: 2,            // Reduce by 2px each step
      
      lineSpacing: 1.1,
      
      verticalSpacing: {
        charSpacingMultiplier: 0.85,
        columnMarginFactor: 0.3
      }
    };
    
    console.log('TextLayoutEngine initialized with fixed 40px base font size');
  }
  
  /**
   * Get text area for specified orientation
   */
  getTextArea(orientation = 'horizontal') {
    const mapping = this.config.canvasMapping[orientation];
    
    return {
      x: mapping.x + this.config.margins.left,
      y: mapping.y + this.config.margins.top,
      width: mapping.width - this.config.margins.left - this.config.margins.right,
      height: mapping.height - this.config.margins.top - this.config.margins.bottom,
      orientation: orientation
    };
  }
  
  /**
   * MAIN FUNCTION: Smart text fitting with simplified rules
   */
  // helper to measure a string at a given size
textWidth(text, fontSize, fontFamily, ctx) {
  ctx.font = `${fontSize}px ${fontFamily}`;
  return ctx.measureText(String(text)).width;
}

fitText(text, ignoredFontSize, fontFamily, ctx, orientation = 'horizontal') {
  if (!text || !text.trim()) {
    return this.createEmptyLayout(orientation);
  }

  console.log(`Fitting text: "${text}" (${orientation}) - using fixed 40px base size`);
  
  const textArea = this.getTextArea(orientation);
  let currentFontSize = this.config.baseFontSize;
  let bestLayout = null;
  let attempts = 0;
  const maxAttempts = Math.ceil((this.config.baseFontSize - this.config.minFontSize) / this.config.scaleStep) + 5;

  // NEW: force a 2-line layout (split by space) when the base-size single line would overflow
  const hasSpace = /\s+/.test(text);
  const baseWidth = this.textWidth(text.trim(), currentFontSize, fontFamily, ctx);
  const forceTwoLines = (orientation === 'horizontal' && hasSpace && baseWidth > textArea.width);
  
  // ADAPTIVE SCALING LOOP
  while (currentFontSize >= this.config.minFontSize && attempts < maxAttempts) {
    attempts++;
    
    const layout = this.createLayoutAtSize(
      text,
      currentFontSize,
      fontFamily,
      ctx,
      orientation,
      textArea,
      /* forceTwoLines: */ forceTwoLines
    );
    const fitsCompletely = this.checkLayoutFits(layout, textArea, orientation, ctx);

      
      if (fitsCompletely) {
        bestLayout = layout;
        console.log(`✓ PERFECT FIT found at ${currentFontSize}px after ${attempts} attempts`);
        break;
      }
      
      // Store best attempt
      if (!bestLayout || currentFontSize > bestLayout.fontSize) {
        bestLayout = layout;
      }
      
      // Reduce font size
      currentFontSize -= this.config.scaleStep;
    }
    
    // Use best layout found
    if (!bestLayout) {
      bestLayout = this.createLayoutAtSize(text, this.config.minFontSize, fontFamily, ctx, orientation, textArea);
    }
    
    // Update metadata
    bestLayout.metadata.baseFontSize = this.config.baseFontSize;
    bestLayout.metadata.finalSize = bestLayout.fontSize;
    bestLayout.metadata.scalingAttempts = attempts;
    bestLayout.metadata.orientation = orientation;
    
    console.log(`✓ FINAL: ${bestLayout.fontSize}px, ${bestLayout.lines.length} lines, orientation: ${orientation}`);
    
    return bestLayout;
  }
  
  /**
   * Create layout with simplified line breaking rules
   */
  createLayoutAtSize(text, fontSize, fontFamily, ctx, orientation, textArea, forceTwoLines = false) {
  ctx.font = `${fontSize}px ${fontFamily}`;
  const lineHeight = fontSize * this.config.lineSpacing;

  let lines = [];
  if (orientation === 'vertical') {
    lines = [this.cleanTextForVertical(text)];
  } else {
    lines = this.createHorizontalLinesWithSpaceBreaking(
      text, fontSize, fontFamily, ctx, textArea, forceTwoLines
    );
  }
    
    // Calculate positions
    const positions = this.calculatePositions(lines, fontSize, fontFamily, lineHeight, ctx, orientation, textArea);
    
    return {
      fits: true,
      fitsInPrintArea: true,
      lines: lines,
      allLines: lines,
      positions,
      fontSize,
      lineHeight,
      totalHeight: lines.length * lineHeight,
      textArea: textArea,
      printArea: this.config.canvasMapping[orientation],
      metadata: {
        originalFontSize: fontSize,
        linesCount: lines.length,
        wasTruncated: false,
        orientation: orientation
      }
    };
  }
  
  /**
   * HORIZONTAL: Smart line breaking - max 2 lines, break only at spaces
   */
    createHorizontalLinesWithSpaceBreaking(text, fontSize, fontFamily, ctx, textArea, forceTwoLines = false) {
  ctx.font = `${fontSize}px ${fontFamily}`;
  const trimmed = String(text || '').trim();

  // If it fits in one line, keep it one line (unless forced)
  const oneLineWidth = ctx.measureText(trimmed).width;
  if (!forceTwoLines && oneLineWidth <= textArea.width) {
    return [trimmed];
  }

  const words = trimmed.split(/\s+/).filter(Boolean);

  // If forcing two lines and we have at least 2 "words", prefer one word per line.
  if (forceTwoLines && words.length >= 2) {
    const left  = words.slice(0, 1).join(' ');
    const right = words.slice(1).join(' ');
    if (ctx.measureText(left).width  <= textArea.width &&
        ctx.measureText(right).width <= textArea.width) {
      return [left, right];
    }
    // fall through to balanced split if that failed
  }

  // Try a balanced two-line split if there are spaces
  if (words.length > 1) {
    let bestIdx = -1;
    let bestScore = Infinity;
    for (let i = 1; i < words.length; i++) {
      const left  = words.slice(0, i).join(' ');
      const right = words.slice(i).join(' ');
      const wL = ctx.measureText(left).width;
      const wR = ctx.measureText(right).width;
      if (wL <= textArea.width && wR <= textArea.width) {
        const score = Math.abs(wL - wR);
        if (score < bestScore) { bestScore = score; bestIdx = i; }
      }
    }
    if (bestIdx > 0) {
      return [words.slice(0, bestIdx).join(' '), words.slice(bestIdx).join(' ')];
    }
  }

  // Fallback: single line (the engine will keep scaling down)
  return [trimmed];
}


  
  /**
   * Clean text for vertical orientation (remove spaces)
   */
  /**
 * Clean text for vertical orientation
 * - remove all whitespace (no visual gaps between words)
 * - map any hyphen-ish characters to the Japanese prolonged sound mark ー (U+30FC)
 */
cleanTextForVertical(text) {
  return String(text || '')
    .replace(/\s+/g, '')
    .replace(/[ー\-‒–—−﹘﹣－]/g, '｜') // includes U+30FC now
    .trim();
}



  
  /**
   * Check if layout fits within constraints
   */
  checkLayoutFits(layout, textArea, orientation, ctx) {
    if (orientation === 'vertical') {
      // Vertical: Check if single column fits in height
      const text = layout.lines[0] || '';
      const charHeight = layout.lineHeight * this.config.verticalSpacing.charSpacingMultiplier;
      const totalHeight = text.length * charHeight;
      return totalHeight <= textArea.height;
    } else {
      // Horizontal: Check if all lines fit in width and height
      const totalHeight = layout.lines.length * layout.lineHeight;
      if (totalHeight > textArea.height) return false;
      
      // Check each line width
      ctx.font = `${layout.fontSize}px ${layout.fontFamily || 'Arial'}`;
      return layout.lines.every(line => {
        const lineWidth = ctx.measureText(line).width;
        return lineWidth <= textArea.width;
      });
    }
  }
  
  /**
   * Calculate positions for rendering
   */
  calculatePositions(lines, fontSize, fontFamily, lineHeight, ctx, orientation, textArea) {
    ctx.font = `${fontSize}px ${fontFamily}`;
    const positions = [];
    
    if (orientation === 'vertical') {
      // VERTICAL: Single column, characters top to bottom
      const startY = textArea.y + fontSize * 0.85;
      const columnX = textArea.x + (textArea.width / 2 + 45); // Center horizontally
      const charSpacing = lineHeight * this.config.verticalSpacing.charSpacingMultiplier;
      
      const text = lines[0] || '';
      const chars = text.split('');
      
      chars.forEach((char, charIndex) => {
        const x = columnX;
        const y = startY + (charIndex * charSpacing);
        
        positions.push({
          x,
          y,
          line: char,
          width: ctx.measureText(char).width,
          height: fontSize,
          useReducedSpacing: false
        });
      });
      
    } else {
      // HORIZONTAL: Lines top to bottom, centered horizontally
      const startY = textArea.y + fontSize * 1.6;
      
      lines.forEach((line, index) => {
        const metrics = ctx.measureText(line);
        const x = textArea.x + (textArea.width - metrics.width) / 2;
        const y = startY + (index * lineHeight);
        
        positions.push({
          x,
          y,
          line,
          width: metrics.width,
          height: fontSize,
          useReducedSpacing: true,
          letterSpacingReduction: fontSize * 0.10
        });
      });
    }
    
    return positions;
  }
  
  /**
   * Empty layout
   */
  createEmptyLayout(orientation = 'horizontal') {
    const textArea = this.getTextArea(orientation);
    
    return {
      fits: true,
      fitsInPrintArea: true,
      lines: [],
      positions: [],
      fontSize: 0,
      lineHeight: 0,
      totalHeight: 0,
      textArea: textArea,
      printArea: this.config.canvasMapping[orientation],
      metadata: { 
        empty: true,
        orientation: orientation
      }
    };
  }
  
  /**
   * Get boundaries for visual guides
   */
  getPrintAreaBounds(orientation = 'horizontal') {
    const textArea = this.getTextArea(orientation);
    
    return {
      outer: this.config.canvasMapping[orientation],
      inner: textArea,
      printDimensions: {
        widthInches: this.config.printArea.widthInches,
        heightInches: this.config.printArea.heightInches
      }
    };
  }
  
  /**
   * Export for Printful
   */
  exportForPrintful(layout) {
    if (!layout || layout.metadata.empty) {
      return null;
    }
    
    const orientation = layout.metadata.orientation || 'horizontal';
    
    return {
      printArea: {
        width: this.config.printArea.widthInches,
        height: this.config.printArea.heightInches,
        dpi: this.config.printArea.dpi
      },
      textElements: layout.positions.map((pos) => ({
        text: pos.line,
        x: this.pixelsToInches(pos.x - this.config.canvasMapping[orientation].x),
        y: this.pixelsToInches(pos.y - this.config.canvasMapping[orientation].y),
        fontSize: this.pixelsToPoints(layout.fontSize),
        fontFamily: layout.fontFamily || 'Arial',
        width: this.pixelsToInches(pos.width),
        height: this.pixelsToInches(pos.height)
      })),
      metadata: {
        exactCoordinates: this.config.canvasMapping[orientation],
        totalLines: layout.lines.length,
        fontSize: layout.fontSize,
        baseFontSize: layout.metadata.baseFontSize,
        orientation: orientation
      }
    };
  }
  
  pixelsToInches(pixels) {
  // derive from our preview canvas and print area
  // canvas width: 600px → print width: 12in  =>  pxToIn = 12 / 600 = 0.02
  const pxToIn = this.config.printArea.widthInches / this.canvasWidth;
  return pixels * pxToIn;
}

pixelsToPoints(pixels) {
  return pixels * (72 / 96);
}

} // <-- close class TextLayoutEngine here

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TextLayoutEngine;
} else {
  window.TextLayoutEngine = TextLayoutEngine;
}
