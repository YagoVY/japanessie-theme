/**
 * Complete T-Shirt Designer with Simplified Font Logic + Print Guides
 * File: assets/tshirt-designer.js
 *
 * Keeps all existing functionality:
 *  - Translation flow
 *  - Auto-scaling layout via TextLayoutEngine (40px base)
 *  - Persistent print guides
 *  - Variant, price, quantity handling
 *  - Form guards + errors
 *
 * Writes/refreshes the following line-item properties:
 *  - properties[_design_data]           (metadata blob)
 *  - properties[_layout_snapshot]       (precise layout snapshot)
 *  - properties[_preview_data_url]      (PNG of the canvas only)
 *  - properties[_preview_mockup_url]    (PNG of shirt + canvas overlay)
 */

console.log('[TSD v2025-09-16-b] loaded');


class TShirtDesigner {
  constructor() {
    this.container = document.querySelector('.minimalist-tshirt-designer');
    if (!this.container) {
      console.error('Container not found');
      return;
    }

    this.config = {
      translationApiUrl: 'https://tshirt-api.vercel.app/api/translate',
      maxTextLength: 16,
      canvasWidth: 600,
      canvasHeight: 600,
      baseFontSize: 40, // fixed starting size; engine will scale as needed
      fontFamilies: {
        'Yuji Syuku': 'Yuji Syuku, serif',
        'Shippori Antique': 'Shippori Antique, serif',
        'Huninn': 'Huninn, sans-serif',
        'Rampart One': 'Rampart One, cursive',
        'Cherry Bomb One': 'Cherry Bomb One, cursive'
      }
    };

    this.state = {
      originalText: '',
      translatedText: '',
      fontColor: '#FFFFFF',
      fontStyle: 'Yuji Syuku',
      orientation: 'horizontal',
      isTranslating: false,
      hasTranslation: false,
      selectedVariant: null,
      isBlankImageActive: false,
      currentLayout: null,
      actualFontSize: 40 // last computed font size used for drawing
    };

    this.layoutEngine = null;
    this.initLayoutEngine();
    this.init();
  }

  initLayoutEngine() {
    if (typeof TextLayoutEngine !== 'undefined') {
      this.layoutEngine = new TextLayoutEngine(this.config.canvasWidth, this.config.canvasHeight);
      console.log('TextLayoutEngine initialized with simplified font logic');
    } else {
      console.warn('TextLayoutEngine not found - will load and retry');
    }
  }

  async init() {
    console.log('Starting initialization with simplified font logic...');

    this.getElements();

    if (!this.elements.textInput) {
      console.error('Critical elements not found');
      return;
    }

    this.setupCanvas();
    await this.loadFonts();
    this.setInitialDefaults();
    this.bindEvents();
    this.updateUI();

    console.log('T-Shirt Designer initialized with fixed 40px base font size');
  }

  async loadFonts() {
    if (!document.fonts) return Promise.resolve();
    try {
      await document.fonts.ready;
      console.log('Fonts loaded for text layout calculations');
    } catch (error) {
      console.warn('Font loading error:', error);
    }
    return Promise.resolve();
  }

  setInitialDefaults() {
    if (this.elements.fontColorInputs) {
      this.elements.fontColorInputs.forEach((input) => {
        input.checked = input.value === this.state.fontColor;
      });
    }

    if (this.elements.fontStyleInputs) {
      this.elements.fontStyleInputs.forEach((input) => {
        input.checked = input.value === this.state.fontStyle;
      });
    }

    if (this.elements.orientationInputs) {
      this.elements.orientationInputs.forEach((input) => {
        input.checked = input.value === this.state.orientation;
      });
    }

    this.updateFormProperties();
    console.log('Initial defaults set (no font size selection)');
  }

  getElements() {
    this.elements = {
      textInput: document.getElementById('custom-text'),
      charCount: document.getElementById('char-count'),
      translateBtn: document.getElementById('translate-btn'),
      retryBtn: document.getElementById('retry-btn'),
      translationDisplay: document.getElementById('translation-display'),
      japaneseResult: document.getElementById('japanese-result'),
      errorDisplay: document.getElementById('error-display'),
      errorText: document.getElementById('error-text'),
      canvas: document.getElementById('preview-canvas'),
      mainImage: document.getElementById('main-product-image'),
      fontColorInputs: document.querySelectorAll('input[name="font-color"]'),
      fontStyleInputs: document.querySelectorAll('input[name="font-style"]'),
      orientationInputs: document.querySelectorAll('input[name="text-orientation"]'),
      fontPreviewTexts: document.querySelectorAll('.font-preview-text'),
      quantityInput: document.getElementById('quantity'),
      qtyBtns: document.querySelectorAll('.qty-btn'),
      form: document.getElementById('add-to-cart-form'),
      addToCartBtn: document.getElementById('add-to-cart-btn'),
      variantIdInput: document.getElementById('variant-id'),
      originalTextProp: document.getElementById('original-text-prop'),
      japaneseTextProp: document.getElementById('japanese-text-prop'),
      fontColorProp: document.getElementById('font-color-prop'),
      fontStyleProp: document.getElementById('font-style-prop'),
      orientationProp: document.getElementById('orientation-prop'),
      designParamsProp: document.getElementById('design-params-prop')
    };

    console.log('Elements found:', {
      textInput: !!this.elements.textInput,
      translateBtn: !!this.elements.translateBtn,
      canvas: !!this.elements.canvas,
      fontColorInputs: this.elements.fontColorInputs.length,
      orientationInputs: this.elements.orientationInputs.length
    });
  }

  setupCanvas() {
    const canvas = this.elements.canvas;
    if (!canvas) {
      console.error('Canvas not found');
      return;
    }

    const ctx = canvas.getContext('2d');
    canvas.width = this.config.canvasWidth;
    canvas.height = this.config.canvasHeight;

    ctx.textRenderingOptimization = 'optimizeQuality';
    ctx.imageSmoothingEnabled = true;

    this.ctx = ctx;
    this.clearCanvas();
    console.log('Canvas setup with simplified text rendering');
  }

  // Helper: create or update a hidden input on the form
  createOrUpdateHidden(name, id, value) {
    if (!this.elements.form) return null;
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement('input');
      el.type = 'hidden';
      el.name = name;
      el.id = id;
      this.elements.form.appendChild(el);
    }
    el.value = value;
    return el;
  }

  bindEvents() {
    console.log('Binding events...');

    if (this.elements.textInput) {
      this.elements.textInput.addEventListener('input', (e) => this.handleTextInput(e));
      this.elements.textInput.addEventListener('keypress', (e) => this.handleKeyPress(e));
    }

    if (this.elements.translateBtn) {
      this.elements.translateBtn.addEventListener('click', () => this.handleTranslate());
    }

    if (this.elements.retryBtn) {
      this.elements.retryBtn.addEventListener('click', () => this.handleTranslate());
    }

    this.elements.fontColorInputs.forEach((input) =>
      input.addEventListener('change', (e) => this.handleFontColorChange(e))
    );

    this.elements.fontStyleInputs.forEach((input) =>
      input.addEventListener('change', (e) => this.handleFontStyleChange(e))
    );

    this.elements.orientationInputs.forEach((input) =>
      input.addEventListener('change', (e) => this.handleOrientationChange(e))
    );

    const allVariantInputs = document.querySelectorAll('.variant-input');
    allVariantInputs.forEach((input) => input.addEventListener('change', (e) => this.handleVariantChange(e)));

    this.elements.qtyBtns.forEach((btn) => btn.addEventListener('click', (e) => this.handleQuantityChange(e)));

    if (this.elements.form) {
      // mark async so we can await preview generation
      this.elements.form.addEventListener('submit', async (e) => {
        const allow = await this.handleFormSubmit(e);
        return allow;
      });
    }

    this.setupMobileStickyBehavior();
    console.log('All events bound');
  }

  handleTextInput(e) {
    const value = e.target.value;
    if (value.length > this.config.maxTextLength) {
      e.target.value = value.substring(0, this.config.maxTextLength);
      return;
    }

    this.state.originalText = e.target.value;
    this.updateCharCounter();
    this.hideTranslationResult();
    this.hideError();
    this.updateTranslateButton();
    this.updateAddToCartButton();
  }

  handleKeyPress(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (this.canTranslate()) this.handleTranslate();
    }
  }

  async handleTranslate() {
    const text = this.state.originalText.trim();
    if (!this.canTranslate()) return;

    console.log('Starting translation...');
    this.setTranslatingState(true);
    this.hideError();
    this.hideTranslationResult();

    try {
      const response = await fetch(this.config.translationApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });

      if (!response.ok) throw new Error(`Translation failed (${response.status})`);

      const data = await response.json();
      if (data.success && data.translation) {
        this.state.translatedText = data.translation;
        this.state.hasTranslation = true;

        this.resetToDefaults();
        this.showTranslationResult(data.translation);
        this.switchToBlankImage();

        await this.updateAllComponentsWithLayout();

        console.log('Translation complete with auto-sized text layout');
      } else {
        throw new Error(data.error || 'Translation failed');
      }
} catch (error) {
  console.error('Translation error:', error);
  // Only show error if it's actually a translation failure, not a UI update failure
  if (error.message && !error.message.includes('addSimpleDesignParams')) {
    this.showError('Translation failed. Please try again.');
  }
} finally {
  this.setTranslatingState(false);
}
}

  resetToDefaults() {
    console.log('Resetting to defaults...');
    this.state.fontColor = '#FFFFFF';
    this.state.fontStyle = 'Yuji Syuku';

    this.elements.fontColorInputs.forEach((input) => {
      input.checked = input.value === this.state.fontColor;
    });

    this.elements.fontStyleInputs.forEach((input) => {
      input.checked = input.value === this.state.fontStyle;
    });
  }

  async updateAllComponentsWithLayout() {
    await new Promise((resolve) => requestAnimationFrame(resolve));

    this.updateFormProperties();
    this.updateFontPreviewCards();
    this.updateCanvasWithLayout();
    this.updateAddToCartButton();

    // keep hidden props in sync (design/snapshot/previews)
    await this.syncHiddenProps();
  }

  updateCanvasWithLayout() {
    if (!this.ctx) {
      this.clearCanvas();
      return;
    }

    console.log('Updating canvas:', {
      text: this.state.translatedText,
      baseFontSize: this.config.baseFontSize,
      color: this.state.fontColor,
      style: this.state.fontStyle,
      orientation: this.state.orientation
    });

    this.clearCanvas();

    // Draw guides under text
    // Always draw guides while debugging
if (this.layoutEngine) {
  this.drawPrintAreaGuides();
}


    if (!this.state.hasTranslation) return;

    const fontFamily = this.config.fontFamilies[this.state.fontStyle] || 'Arial, sans-serif';

    if (this.layoutEngine) {
      try {
        const layout = this.layoutEngine.fitText(
          this.state.translatedText,
          this.config.baseFontSize,
          fontFamily,
          this.ctx,
          this.state.orientation
        );

        this.state.currentLayout = layout;
        this.state.actualFontSize = layout.fontSize;
        this.renderSmartLayout(layout);

        // write properties opportunistically (async)
        this.syncHiddenProps();

        console.log('Text rendered with auto-scaling:', {
          requestedSize: this.config.baseFontSize,
          actualSize: layout.fontSize,
          lines: layout.lines.length,
          orientation: layout.metadata.orientation
        });
      } catch (error) {
        console.error('TextLayoutEngine error:', error);
        this.renderFallbackText(fontFamily);
        this.addPreviewDataUrlToForm();
      }
    } else {
      this.renderFallbackText(fontFamily);
      this.addPreviewDataUrlToForm();
    }
  }

  renderSmartLayout(layout) {
    if (!layout || !layout.positions || layout.positions.length === 0) {
      console.warn('No layout positions available');
      return;
    }

    this.ctx.fillStyle = this.state.fontColor;
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'alphabetic';
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);

    layout.positions.forEach((position) => {
      this.ctx.font = `${layout.fontSize}px ${this.config.fontFamilies[this.state.fontStyle] || 'Arial, sans-serif'}`;


      if (position.useReducedSpacing && position.line.length > 1) {
        // reduced spacing for horizontal lines
        let currentX = Math.round(position.x);
        const y = Math.round(position.y);
        const reduction = position.letterSpacingReduction || 0;

        for (let i = 0; i < position.line.length; i++) {
          const char = position.line[i];
          this.ctx.fillText(char, currentX, y);

          const charWidth = this.ctx.measureText(char).width;
          const extraSpacing = layout.fontSize * 0.12; // 12% of font size
          currentX += charWidth - reduction + extraSpacing;
        }
      } else {
        // normal rendering (vertical or 1-char line)
        this.ctx.fillText(position.line, Math.round(position.x), Math.round(position.y));
      }
    });

    // redraw guides on top so they remain visible
    if (window.showPrintGuides && this.layoutEngine) {
      this.drawPrintAreaGuides();
    }
  }

  renderFallbackText(fontFamily) {
    const fontSize = this.state.actualFontSize || this.config.baseFontSize;

    this.ctx.font = `${fontSize}px ${fontFamily}`;
    this.ctx.fillStyle = this.state.fontColor;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    let x, y;
    if (this.state.orientation === 'vertical') {
      x = 380;
      y = this.config.canvasHeight * 0.25;
    } else {
      x = this.config.canvasWidth / 2;
      y = this.config.canvasHeight * 0.45;
    }

    this.ctx.setTransform(1, 0, 0, 1, 0, 0);

    const text = this.state.translatedText;
    if (this.state.orientation === 'vertical') {
      const chars = text.replace(/\s+/g, '');
      chars.split('').forEach((char, index) => {
        this.ctx.fillText(char, x, y + index * fontSize * 1.2);
      });
    } else {
      this.ctx.fillText(text, x, y);
    }

    if (window.showPrintGuides && this.layoutEngine) {
      this.drawPrintAreaGuides();
    }
  }

  /** Print area guides (persist) */
  drawPrintAreaGuides() {
    if (!this.layoutEngine) return;

    const bounds = this.layoutEngine.getPrintAreaBounds(this.state.orientation);

    this.ctx.save();

    // outer print area (red dashed)
    this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([8, 4]);
    this.ctx.strokeRect(bounds.outer.x, bounds.outer.y, bounds.outer.width, bounds.outer.height);

    // inner safe text area (green dashed)
    this.ctx.strokeStyle = 'rgba(0, 255, 0, 0.8)';
    this.ctx.lineWidth = 1;
    this.ctx.setLineDash([4, 2]);
    this.ctx.strokeRect(bounds.inner.x, bounds.inner.y, bounds.inner.width, bounds.inner.height);

    // labels
    this.ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
    this.ctx.font = '10px Arial';
    this.ctx.setLineDash([]);
    this.ctx.fillText('PRINT AREA', bounds.outer.x + 5, bounds.outer.y - 5);

    this.ctx.fillStyle = 'rgba(0, 128, 0, 0.8)';
    this.ctx.fillText('TEXT AREA', bounds.inner.x + 5, bounds.inner.y - 5);

    this.ctx.restore();
  }

  clearCanvas() {
    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.config.canvasWidth, this.config.canvasHeight);
    }
  }

  handleFontColorChange(e) {
    this.state.fontColor = e.target.value;
    this.updateCanvasWithLayout();
    this.updateFormProperties();
    this.syncHiddenProps();
  }

  handleFontStyleChange(e) {
    this.state.fontStyle = e.target.value;
    this.updateCanvasWithLayout();
    this.updateFormProperties();
    this.syncHiddenProps();
  }

  handleOrientationChange(e) {
    this.state.orientation = e.target.value;
    console.log('Orientation changed to:', this.state.orientation);
    this.updateCanvasWithLayout(); // redraw guides with new orientation
    this.updateFormProperties();
    this.syncHiddenProps();
  }


  handleVariantChange(e) {
    const selectedOptions = this.getSelectedOptions();
    const matchingVariant = this.findVariantByOptions(selectedOptions);

    if (matchingVariant) {
      if (this.elements.variantIdInput) {
        this.elements.variantIdInput.value = matchingVariant.id;
      }

      this.updatePriceDisplay(matchingVariant);

      if (matchingVariant.featured_image) {
        if (this.state.hasTranslation) {
          this.state.isBlankImageActive = false;
          this.switchToBlankImage();
        } else {
          this.updateMainImage(matchingVariant.featured_image.src);
          this.state.isBlankImageActive = false;
        }
      }

      this.updateAvailability(matchingVariant.available);
      this.state.selectedVariant = matchingVariant;

      // variant change could swap shirt image → refresh mockup preview later
      this.syncHiddenProps();
    }
  }

  switchToBlankImage() {
    const mainImage = this.elements.mainImage;
    if (!mainImage) return;

    const selectedColorInput = document.querySelector('.color-input:checked');
    if (selectedColorInput) {
      const colorValue = (selectedColorInput.dataset.optionValue || '').toLowerCase();

      if (window.blankImageUrls && window.blankImageUrls[colorValue]) {
        const blankImageUrl = window.blankImageUrls[colorValue];
        mainImage.src = blankImageUrl;
        this.state.isBlankImageActive = true;
        console.log('Switched to blank image:', blankImageUrl);

        // update composed preview when base shirt changes
        this.syncHiddenProps();
      }
    }
  }

  getSelectedOptions() {
    const options = {};
    const variantInputs = document.querySelectorAll('.variant-input:checked');

    variantInputs.forEach((input) => {
      const optionIndex = input.dataset.optionIndex;
      const optionValue = input.dataset.optionValue;
      if (optionIndex && optionValue) {
        options[optionIndex] = optionValue;
      }
    });

    return options;
  }

  findVariantByOptions(selectedOptions) {
    const productData = window.productData || window.product;

    if (productData && productData.variants) {
      return productData.variants.find((variant) => {
        return variant.options.every((option, index) => {
          const optionIndex = (index + 1).toString();
          return selectedOptions[optionIndex] === option;
        });
      });
    }

    return null;
  }

  updateFontPreviewCards() {
    const textToShow = this.state.translatedText || 'カタカナ';
    this.elements.fontPreviewTexts.forEach((preview) => {
      preview.textContent = textToShow;
    });
  }

  updateFormProperties() {
    if (this.elements.originalTextProp) this.elements.originalTextProp.value = this.state.originalText;
    if (this.elements.japaneseTextProp) this.elements.japaneseTextProp.value = this.state.translatedText;
    if (this.elements.fontColorProp) this.elements.fontColorProp.value = this.state.fontColor;
    if (this.elements.fontStyleProp) this.elements.fontStyleProp.value = this.state.fontStyle;
    if (this.elements.orientationProp) this.elements.orientationProp.value = this.state.orientation;
  }

  handleQuantityChange(e) {
    const action = e.target.dataset.action;
    const currentQty = parseInt(this.elements.quantityInput.value, 10);

    if (action === 'plus' && currentQty < 10) {
      this.elements.quantityInput.value = currentQty + 1;
    } else if (action === 'minus' && currentQty > 1) {
      this.elements.quantityInput.value = currentQty - 1;
    }
  }

  async handleFormSubmit(e) {
    if (!this.state.hasTranslation) {
      e.preventDefault();
      this.showError('Please translate your text before adding to cart.');
      this.elements.textInput?.focus();
      return false;
    }

    // ensure all hidden inputs exist & are fresh before submit
    await this.syncHiddenProps();

    const btnText = this.elements.addToCartBtn?.querySelector('.cart-text');
    if (btnText) btnText.textContent = 'Adding...';
    if (this.elements.addToCartBtn) this.elements.addToCartBtn.disabled = true;

    return true;
  }



  // raw PNG of the canvas (text + guides)
  addPreviewDataUrlToForm() {
    try {
      if (!this.state.hasTranslation || !this.elements.canvas) return;
      const dataUrl = this.elements.canvas.toDataURL('image/png');
      this.createOrUpdateHidden('properties[_preview_data_url]', 'preview-data-url', dataUrl);
    } catch (err) {
      console.warn('Failed writing _preview_data_url:', err);
    }
  }

  // composed PNG of shirt mockup + current canvas overlay
  async addPreviewMockupUrlToForm() {
    try {
      if (!this.state.hasTranslation || !this.elements.canvas) return;

      const mockupUrl = await this.buildMockupDataUrl();
      if (mockupUrl) {
        this.createOrUpdateHidden('properties[_preview_mockup_url]', 'preview-mockup-url', mockupUrl);
      }
    } catch (err) {
      console.warn('Failed writing _preview_mockup_url (falling back to canvas only):', err);
      // still ensure at least canvas preview exists
      this.addPreviewDataUrlToForm();
    }
  }

  // Create a composed preview (shirt + canvas). Handles image load and CORS-taint fallback.
  async buildMockupDataUrl() {
    const shirtImg = this.elements?.mainImage;
    const overlay = this.elements?.canvas;
    if (!overlay) return '';

    // If no base image, just return the overlay
    if (!shirtImg || !shirtImg.src) {
      return overlay.toDataURL('image/png');
    }

    // wait until the shirt <img> is ready
    if (!shirtImg.complete || !shirtImg.naturalWidth) {
      await new Promise((res) => {
        const done = () => res();
        shirtImg.addEventListener('load', done, { once: true });
        shirtImg.addEventListener('error', done, { once: true });
      });
    }

    const W = overlay.width;
    const H = overlay.height;

    const off = document.createElement('canvas');
    off.width = W;
    off.height = H;
    const octx = off.getContext('2d');

    try {
      // center-crop shirt image to cover W×H
      const sw = shirtImg.naturalWidth;
      const sh = shirtImg.naturalHeight;
      const sRatio = sw / sh;
      const dRatio = W / H;

      let sx, sy, sW, sH;
      if (sRatio > dRatio) {
        // crop sides
        sH = sh;
        sW = sh * dRatio;
        sx = (sw - sW) / 2;
        sy = 0;
      } else {
        // crop top/bottom
        sW = sw;
        sH = sw / dRatio;
        sx = 0;
        sy = (sh - sH) / 2;
      }

      octx.drawImage(shirtImg, sx, sy, sW, sH, 0, 0, W, H);
      octx.drawImage(overlay, 0, 0);

      return off.toDataURL('image/png');
    } catch (err) {
      // If the shirt image is cross-origin and taints the canvas, fall back to overlay only.
      console.warn('Mockup composition failed (likely CORS). Falling back to overlay only.', err);
      return overlay.toDataURL('image/png');
    }
  }

async syncHiddenProps() {
    if (!this.state.hasTranslation) return;

    this.addSimpleDesignParams();
    this.addPreviewDataUrlToForm(); // Keep for your manual review
    await this.addPreviewMockupUrlToForm(); // Keep for your manual review
  }

  addSimpleDesignParams() {
  try {
    // Capture exact coordinates from current layout
    const coordinateData = this.captureTextCoordinates();
    
    const designParams = {
      translatedText: this.state.translatedText,
      fontStyle: this.state.fontStyle,
      fontColor: this.state.fontColor,
      orientation: this.state.orientation,
      originalText: this.state.originalText,
      canvasWidth: this.config.canvasWidth,
      canvasHeight: this.config.canvasHeight,
      textCoordinates: coordinateData // NEW: exact coordinates
    };

    this.createOrUpdateHidden(
      'properties[_design_params]',
      'design-params-prop',
      JSON.stringify(designParams)
    );

    console.log('✅ Design params with coordinates updated:', designParams);
  } catch (err) {
    console.warn('Failed to update design params:', err);
  }
}

captureTextCoordinates() {
  if (!this.state.currentLayout || !this.state.hasTranslation) {
    return [];
  }

  const coordinates = [];
  const layout = this.state.currentLayout;
  const printArea = layout.printArea; // This is the 200x270 area

  // Capture each character's exact position RELATIVE to print area
  layout.positions.forEach((position, index) => {
    if (this.state.orientation === 'horizontal') {
      if (position.useReducedSpacing && position.line.length > 1) {
        let currentX = position.x;
        const y = position.y;
        const reduction = position.letterSpacingReduction || 0;
        const extraSpacing = layout.fontSize * 0.12;
        
        for (let i = 0; i < position.line.length; i++) {
          const char = position.line[i];
          const charWidth = this.ctx.measureText(char).width;
          
          coordinates.push({
            char: char,
            x: Math.round(currentX - printArea.x), // CONVERT TO PRINT AREA RELATIVE
            y: Math.round(y - printArea.y),        // CONVERT TO PRINT AREA RELATIVE
            fontSize: layout.fontSize,
            lineIndex: index
          });
          
          currentX += charWidth - reduction + extraSpacing;
        }
      } else {
        coordinates.push({
          char: position.line,
          x: Math.round(position.x - printArea.x), // CONVERT TO PRINT AREA RELATIVE
          y: Math.round(position.y - printArea.y), // CONVERT TO PRINT AREA RELATIVE
          fontSize: layout.fontSize,
          lineIndex: index
        });
      }
    } else {
      coordinates.push({
        char: position.line,
        x: Math.round(position.x - printArea.x), // CONVERT TO PRINT AREA RELATIVE
        y: Math.round(position.y - printArea.y), // CONVERT TO PRINT AREA RELATIVE
        fontSize: layout.fontSize,
        lineIndex: index
      });
    }
  });

  return {
    coordinates: coordinates,
    printArea: {
      x: 0, // Now all coordinates are relative to 0,0 of print area
      y: 0,
      width: printArea.width,  // 200
      height: printArea.height // 270
    },
    canvasSize: {
      width: this.config.canvasWidth,
      height: this.config.canvasHeight
    },
    fontFamily: this.state.fontStyle,
    fontColor: this.state.fontColor,
    orientation: this.state.orientation
  };
}


  // ===========================================================================
  // Misc UI & helpers
  // ===========================================================================

  setupMobileStickyBehavior() {
    const gallery = document.getElementById('product-gallery');

    if (gallery && window.innerWidth <= 768) {
      let ticking = false;

      const updateGalleryPosition = () => {
        const currentScrollY = window.scrollY;

        if (currentScrollY > 80) {
          gallery.classList.add('scrolled');
        } else {
          gallery.classList.remove('scrolled');
        }

        ticking = false;
      };

      const requestTick = () => {
        if (!ticking) {
          requestAnimationFrame(updateGalleryPosition);
          ticking = true;
        }
      };

      window.addEventListener('scroll', requestTick, { passive: true });
    }
  }

  updatePriceDisplay(variant) {
    const priceElement = document.querySelector('.current-price');
    if (priceElement && variant.price !== undefined) {
      const formattedPrice = this.formatMoney(variant.price);
      priceElement.textContent = formattedPrice;
    }

    const comparePriceElement = document.querySelector('.original-price');
    if (comparePriceElement && variant.compare_at_price) {
      const formattedComparePrice = this.formatMoney(variant.compare_at_price);
      comparePriceElement.textContent = formattedComparePrice;
      comparePriceElement.style.display = variant.compare_at_price > variant.price ? 'inline' : 'none';
    }

    const cartPriceElement = document.querySelector('.cart-price');
    if (cartPriceElement && variant.price !== undefined) {
      cartPriceElement.textContent = this.formatMoney(variant.price);
    }
  }

  updateAvailability(available) {
    if (!this.elements.addToCartBtn) return;
    const cartText = this.elements.addToCartBtn.querySelector('.cart-text');

    if (!available) {
      this.elements.addToCartBtn.disabled = true;
      if (cartText) cartText.textContent = 'Out of Stock';
    } else {
      this.elements.addToCartBtn.disabled = !this.state.hasTranslation;
      if (cartText && this.state.hasTranslation) cartText.textContent = 'Add to Cart';
    }
  }

  updateMainImage(imageSrc) {
    if (this.elements.mainImage && imageSrc) {
      this.elements.mainImage.src = imageSrc;
    }
  }

  formatMoney(cents) {
    if (typeof Shopify !== 'undefined' && Shopify.formatMoney) return Shopify.formatMoney(cents);
    const dollars = (cents / 100).toFixed(2);
    return `$${dollars}`;
  }

  canTranslate() {
    return this.state.originalText.trim().length > 0 && !this.state.isTranslating;
  }

  updateCharCounter() {
    if (this.elements.charCount) {
      this.elements.charCount.textContent = this.state.originalText.length;
    }
  }

  updateTranslateButton() {
    if (this.elements.translateBtn) {
      this.elements.translateBtn.disabled = !this.canTranslate();
    }
  }

  setTranslatingState(isTranslating) {
    this.state.isTranslating = isTranslating;

    if (!this.elements.translateBtn) return;

    const translateText = this.elements.translateBtn.querySelector('.translate-text');
    const translateLoading = this.elements.translateBtn.querySelector('.translate-loading');

    if (isTranslating) {
      if (translateText) translateText.classList.add('hidden');
      if (translateLoading) translateLoading.classList.remove('hidden');
      this.elements.translateBtn.disabled = true;
    } else {
      if (translateText) translateText.classList.remove('hidden');
      if (translateLoading) translateLoading.classList.add('hidden');
      this.elements.translateBtn.disabled = !this.canTranslate();
    }
  }

  showTranslationResult(translation) {
    if (this.elements.japaneseResult) {
      this.elements.japaneseResult.textContent = translation;
    }
    if (this.elements.translationDisplay) {
      this.elements.translationDisplay.classList.remove('hidden');
    }
  }

  hideTranslationResult() {
    if (this.elements.translationDisplay) {
      this.elements.translationDisplay.classList.add('hidden');
    }
    this.state.hasTranslation = false;
  }

  showError(message) {
    if (this.elements.errorText) this.elements.errorText.textContent = message;
    if (this.elements.errorDisplay) this.elements.errorDisplay.classList.remove('hidden');
  }

  hideError() {
    if (this.elements.errorDisplay) this.elements.errorDisplay.classList.add('hidden');
  }

  updateAddToCartButton() {
    if (!this.elements.addToCartBtn) return;

    const hasTranslation = this.state.hasTranslation;
    const cartText = this.elements.addToCartBtn.querySelector('.cart-text');

    this.elements.addToCartBtn.disabled = !hasTranslation;
    if (cartText) cartText.textContent = hasTranslation ? 'Add to Cart' : 'Translate Text First';
  }

  updateUI() {
    this.updateCharCounter();
    this.updateTranslateButton();
    this.updateAddToCartButton();
    this.updateFormProperties();
    if (window.showPrintGuides && this.layoutEngine) {
      this.drawPrintAreaGuides();
    }
  }

  setText(text) {
    if (this.elements.textInput) {
      this.elements.textInput.value = text;
      this.handleTextInput({ target: this.elements.textInput });
    }
  }

  getCurrentState() {
    return { ...this.state };
  }
}

// Enhanced initialization with persistent print guides
// Guaranteed initialization that always exposes a global + ready event/promise
// --- Robust bootstrap: ensure TextLayoutEngine is present before starting ---
(function bootstrapDesigner() {
  const SECTION_SEL = '.minimalist-tshirt-designer';

  function start() {
    if (!document.querySelector(SECTION_SEL)) {
      console.error('[TSD] Designer section not found');
      return;
    }
    try {
      window.tshirtDesigner = new TShirtDesigner();
      window.showPrintGuides = true;
      requestAnimationFrame(() => window.tshirtDesigner.updateCanvasWithLayout());
      window.dispatchEvent(new CustomEvent('designer:ready', { detail: { instance: window.tshirtDesigner } }));
      console.log('[TSD] ready');
    } catch (e) {
      console.error('[TSD] init failed:', e);
    }
  }

  function hasEngine() {
    return typeof window.TextLayoutEngine === 'function';
  }

  function waitForEngineThenStart(maxMs = 8000) {
    const startedAt = Date.now();

    // If engine already present, go
    if (hasEngine()) return start();

    // Try to hook into the engine script in the section
    let tag = document.getElementById('tle-script');
    if (!tag) {
      // Fallback: create it if the section didn’t render it for some reason
      tag = document.createElement('script');
      tag.id = 'tle-script';
      tag.src = (window.Shopify && window.Shopify.routes ? '' : '') + '/assets/text-layout-engine.js?v=fix3';
      tag.defer = true;
      document.head.appendChild(tag);
    }

    let resolved = false;

    const onReadyCheck = () => {
      if (resolved) return;
      if (hasEngine()) {
        resolved = true;
        return start();
      }
      if (Date.now() - startedAt > maxMs) {
        resolved = true;
        console.error('[TSD] TextLayoutEngine missing — timed out waiting');
      }
    };

    tag.addEventListener('load', onReadyCheck, { once: true });
    tag.addEventListener('error', () => {
      if (!resolved) {
        resolved = true;
        console.error('[TSD] Failed to load TextLayoutEngine script');
      }
    });

    // Poll as a safety net (in case of caching/async defers)
    const iv = setInterval(() => {
      if (resolved) return clearInterval(iv);
      onReadyCheck();
    }, 100);

    // Also try once after DOM is ready (if we got here very early)
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      onReadyCheck();
    } else {
      document.addEventListener('DOMContentLoaded', onReadyCheck, { once: true });
    }
  }

  waitForEngineThenStart();
})();


// Optional: a promise you can await from the Console
window.designerReady = new Promise(res => { window.__designerReadyResolve = res; });


// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TShirtDesigner;
}
