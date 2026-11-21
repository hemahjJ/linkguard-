/**
 * Code Rain — ASCII Art Raster Engine (21st.dev Pipeline Re-creation)
 * Canvas2D Implementation supporting 23 Render Modes, Full Color Pipeline,
 * 9 Post-Effects (PFX), Multi-Style Animation, Glow Lights & Reveal Mask.
 */

(function () {
  'use strict';

  // =========================================================================
  // 1. Default Parameters (Exact JSON Specification from Prompt)
  // =========================================================================
  const DEFAULT_PARAMS = {
    renderMode: "characters",
    bgMode: "solid",
    bgBlur: 12,
    bgOpacity: 90,
    cellSize: 14,
    coverage: 96,
    invert: false,
    styleBlend: "source-over",
    charSet: "binary",
    customChars: "",
    brightness: 0,
    contrast: 115,
    edgeEmphasis: 40,
    density: 0,
    toneCurve: [
      { x: 0, y: 0 },
      { x: 1, y: 1 }
    ],
    tint: "#00ff66",
    tintOpacity: 45,
    overlayBlend: "overlay",
    saturation: 100,
    grayscale: 0,
    blurType: "off",
    blurAmount: 35,
    blurAngle: 0,
    directionalBothSides: false,
    tiltFocus: 35,
    tiltPosition: 50,
    tiltFeather: 15,
    lensFocus: 40,
    blurCenterX: 50,
    blurCenterY: 50,
    progressivePosition: 55,
    progressiveReverse: false,
    pfx: {
      vignette: { enabled: true, intensity: 38 },
      scanLines: { enabled: true, intensity: 28 },
      chromatic: { enabled: false, intensity: 15 },
      bloom: { enabled: true, intensity: 25 },
      filmGrain: { enabled: true, intensity: 40 },
      glitch: { enabled: true, intensity: 20 },
      pixelate: { enabled: false, intensity: 15 },
      halftone: { enabled: false, intensity: 20 },
      filmDust: { enabled: false, intensity: 20 }
    },
    animated: true,
    animStyle: "flicker",
    animSpeed: { enabled: true, intensity: 100 },
    animIntensity: { enabled: true, intensity: 60 },
    lights: {
      enabled: false,
      points: []
    },
    mask: {
      enabled: false,
      tool: "freehand",
      brushSize: 30,
      showOverlay: true,
      invert: false,
      dataUrl: null,
      shapes: []
    }
  };

  // Clone active params
  let params = JSON.parse(JSON.stringify(DEFAULT_PARAMS));

  // Character sets dictionary
  const CHAR_SETS = {
    binary: "01",
    matrix: "ｦｱｳｴｵｶｷｹｺｻｼｽｾｿﾀﾂﾃﾅﾆﾇﾈﾊﾋﾎﾏﾐﾑﾒﾓﾔﾕﾗﾘﾜ1234567890:・.=",
    standard: " .:-=+*#%@",
    blocks: " ░▒▓█",
    dense: "$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,\"^`'. ",
    minimal: " .oO@",
    hex: "0123456789ABCDEF"
  };

  // 4x4 Bayer Dithering Matrix
  const BAYER_4X4 = [
    [ 0,  8,  2, 10],
    [12,  4, 14,  6],
    [ 3, 11,  1,  9],
    [15,  7, 13,  5]
  ];

  // =========================================================================
  // 2. High-Quality Procedural Cyber Artwork Generators (Ref-006 & Fallbacks)
  // =========================================================================
  function createProceduralImage(type = 'cyber') {
    const w = 900;
    const h = 680;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');

    if (type === 'cyber') {
      // Dark futuristic sci-fi portrait representing Ref-006
      const bgGrad = ctx.createLinearGradient(0, 0, w, h);
      bgGrad.addColorStop(0, '#04070d');
      bgGrad.addColorStop(0.5, '#0b1324');
      bgGrad.addColorStop(1, '#020408');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Cyber grid background lines
      ctx.strokeStyle = 'rgba(0, 255, 102, 0.08)';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 0; y < h; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }

      // Neon background glow ring
      const ringGrad = ctx.createRadialGradient(w * 0.5, h * 0.42, 60, w * 0.5, h * 0.42, 280);
      ringGrad.addColorStop(0, 'rgba(0, 255, 102, 0.35)');
      ringGrad.addColorStop(0.7, 'rgba(14, 165, 233, 0.15)');
      ringGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = ringGrad;
      ctx.beginPath();
      ctx.arc(w * 0.5, h * 0.42, 280, 0, Math.PI * 2);
      ctx.fill();

      // Stylized Portrait Silhouette / Cybernetic Android Head
      const cx = w * 0.5;
      const cy = h * 0.42;

      // Shoulders / torso
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(cx - 220, h);
      ctx.quadraticCurveTo(cx - 180, cy + 180, cx - 90, cy + 140);
      ctx.lineTo(cx + 90, cy + 140);
      ctx.quadraticCurveTo(cx + 180, cy + 180, cx + 220, h);
      ctx.closePath();
      ctx.fill();

      // Neck
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(cx - 45, cy + 70, 90, 80);

      // Head / Face Contour
      const faceGrad = ctx.createLinearGradient(cx - 100, cy - 140, cx + 100, cy + 90);
      faceGrad.addColorStop(0, '#f8fafc');
      faceGrad.addColorStop(0.4, '#cbd5e1');
      faceGrad.addColorStop(0.8, '#475569');
      faceGrad.addColorStop(1, '#0f172a');
      ctx.fillStyle = faceGrad;
      ctx.beginPath();
      ctx.ellipse(cx, cy - 20, 85, 115, 0, 0, Math.PI * 2);
      ctx.fill();

      // Cyber Visor / Sunglasses
      ctx.fillStyle = '#020617';
      ctx.beginPath();
      ctx.roundRect(cx - 82, cy - 42, 164, 42, 10);
      ctx.fill();

      // Visor Neon Reflection Streak
      const visorGrad = ctx.createLinearGradient(cx - 80, cy - 40, cx + 80, cy);
      visorGrad.addColorStop(0, '#00ff66');
      visorGrad.addColorStop(0.5, '#38bdf8');
      visorGrad.addColorStop(1, '#a855f7');
      ctx.fillStyle = visorGrad;
      ctx.fillRect(cx - 75, cy - 32, 150, 6);

      // Visor Glow
      ctx.shadowColor = '#00ff66';
      ctx.shadowBlur = 15;
      ctx.fillStyle = '#00ff66';
      ctx.fillRect(cx - 70, cy - 22, 40, 2);
      ctx.fillRect(cx + 30, cy - 22, 40, 2);
      ctx.shadowBlur = 0;

      // Cybernetic Jaw Linework & Chiseled Features
      ctx.strokeStyle = 'rgba(0, 255, 102, 0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - 65, cy + 10);
      ctx.lineTo(cx - 35, cy + 60);
      ctx.lineTo(cx + 35, cy + 60);
      ctx.lineTo(cx + 65, cy + 10);
      ctx.stroke();

      // Collar lights
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(cx - 70, cy + 190, 8, 0, Math.PI * 2);
      ctx.arc(cx + 70, cy + 190, 8, 0, Math.PI * 2);
      ctx.fill();

      // High-contrast textual stamps (Ref-006 / Matrix Terminal aesthetic)
      ctx.font = '700 13px monospace';
      ctx.fillStyle = 'rgba(0, 255, 102, 0.4)';
      ctx.fillText('REF // 006 — CYBERNETIC SUB-01', 35, 45);
      ctx.fillText('LATENCY: 0.12ms // BUFFER: OK', 35, 65);
      ctx.fillText('SYS.ARCH.RASTER.MATRIX.V2', w - 240, h - 35);

    } else if (type === 'city') {
      // Cyberpunk Neon Metropolis Skyline
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#030712');
      grad.addColorStop(0.6, '#111827');
      grad.addColorStop(1, '#020617');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Moon / Data Orb
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(w * 0.72, h * 0.28, 65, 0, Math.PI * 2);
      ctx.fill();

      // Buildings
      const bldgs = [
        { x: 30, w: 90, h: 380 }, { x: 130, w: 70, h: 460 },
        { x: 210, w: 120, h: 520 }, { x: 340, w: 85, h: 410 },
        { x: 435, w: 140, h: 560 }, { x: 585, w: 110, h: 480 },
        { x: 705, w: 95, h: 510 }, { x: 810, w: 80, h: 390 }
      ];

      bldgs.forEach(b => {
        ctx.fillStyle = '#090d16';
        ctx.fillRect(b.x, h - b.h, b.w, b.h);
        // Windows
        ctx.fillStyle = Math.random() > 0.5 ? '#00ff66' : '#38bdf8';
        for (let wy = h - b.h + 20; wy < h - 40; wy += 25) {
          for (let wx = b.x + 10; wx < b.x + b.w - 15; wx += 16) {
            if (Math.random() > 0.35) {
              ctx.fillRect(wx, wy, 8, 12);
            }
          }
        }
      });
    }

    return canvas;
  }

  // =========================================================================
  // 3. AsciiRenderPipeline Engine Class
  // =========================================================================
  class AsciiRenderPipeline {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d', { willReadFrequently: true });

      // Offscreen buffers
      this.sourceCanvas = document.createElement('canvas');
      this.sourceCtx = this.sourceCanvas.getContext('2d', { willReadFrequently: true });

      this.bgCanvas = document.createElement('canvas');
      this.bgCtx = this.bgCanvas.getContext('2d');

      this.effectCanvas = document.createElement('canvas');
      this.effectCtx = this.effectCanvas.getContext('2d');

      this.bloomCanvas = document.createElement('canvas');
      this.bloomCtx = this.bloomCanvas.getContext('2d');

      this.maskCanvas = document.createElement('canvas');
      this.maskCtx = this.maskCanvas.getContext('2d');

      // State
      this.sourceImage = null;
      this.width = 840;
      this.height = 630;
      this.time = 0;
      this.frameCount = 0;
      this.lastFpsUpdate = 0;
      this.fps = 60;
      this.isPlaying = true;
      this.animationId = null;

      // Matrix Rain Columns State (for "matrix" mode)
      this.matrixDrops = [];

      // Lights glow points array
      this.lightPoints = [];
    }

    init(sourceImg) {
      this.sourceImage = sourceImg;
      this.resize(sourceImg.width, sourceImg.height);
      this.resetMatrixDrops();
    }

    resize(origW, origH) {
      // Constrain to reasonable high-res viewport size
      const maxW = 960;
      const maxH = 720;
      let targetW = origW;
      let targetH = origH;

      if (targetW > maxW || targetH > maxH) {
        const ratio = Math.min(maxW / targetW, maxH / targetH);
        targetW = Math.round(targetW * ratio);
        targetH = Math.round(targetH * ratio);
      }

      this.width = targetW;
      this.height = targetH;

      [this.canvas, this.sourceCanvas, this.bgCanvas, this.effectCanvas, this.bloomCanvas, this.maskCanvas].forEach(c => {
        c.width = this.width;
        c.height = this.height;
      });

      // Draw source into sourceCanvas
      this.sourceCtx.drawImage(this.sourceImage, 0, 0, this.width, this.height);
      this.resetMatrixDrops();
    }

    resetMatrixDrops() {
      const cellSize = params.cellSize || 14;
      const cols = Math.ceil(this.width / cellSize);
      this.matrixDrops = [];
      for (let i = 0; i < cols; i++) {
        this.matrixDrops.push({
          y: Math.floor(Math.random() * -50),
          speed: 1 + Math.random() * 2,
          char: '0'
        });
      }
    }

    // =======================================================================
    // Step 1: Render Background Layer
    // =======================================================================
    renderBackground() {
      const { bgMode, bgBlur, bgOpacity } = params;
      const ctx = this.bgCtx;
      ctx.clearRect(0, 0, this.width, this.height);

      const alpha = Math.max(0, Math.min(1, (bgOpacity || 90) / 100));

      if (bgMode === 'solid') {
        ctx.fillStyle = '#060a12';
        ctx.fillRect(0, 0, this.width, this.height);
        // Soft gradient
        const g = ctx.createRadialGradient(this.width * 0.5, this.height * 0.5, 40, this.width * 0.5, this.height * 0.5, this.width * 0.6);
        g.addColorStop(0, 'rgba(0, 255, 102, 0.04)');
        g.addColorStop(1, 'rgba(2, 4, 8, 0.95)');
        ctx.fillStyle = g;
        ctx.globalAlpha = alpha;
        ctx.fillRect(0, 0, this.width, this.height);
        ctx.globalAlpha = 1.0;

      } else if (bgMode === 'blurred') {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.filter = `blur(${bgBlur || 12}px)`;
        ctx.drawImage(this.sourceCanvas, 0, 0, this.width, this.height);
        ctx.restore();

      } else if (bgMode === 'photo') {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.drawImage(this.sourceCanvas, 0, 0, this.width, this.height);
        ctx.restore();

      } else if (bgMode === 'none') {
        ctx.fillStyle = 'transparent';
        ctx.clearRect(0, 0, this.width, this.height);
      }
    }

    // =======================================================================
    // Step 2 & 3: Sample Grid & Draw Shapes per renderMode
    // =======================================================================
    renderAsciiLayer() {
      const ctx = this.effectCtx;
      ctx.clearRect(0, 0, this.width, this.height);

      const cellSize = Math.max(4, params.cellSize || 14);
      const cols = Math.floor(this.width / cellSize);
      const rows = Math.floor(this.height / cellSize);

      // Get pixel data from source canvas
      const srcData = this.sourceCtx.getImageData(0, 0, this.width, this.height).data;
      const w = this.width;

      const coverage = (params.coverage ?? 96) / 100;
      const edgeEmphasis = (params.edgeEmphasis ?? 40) / 100;
      const densityOffset = (params.density ?? 0) / 100;
      const invert = params.invert;
      const mode = params.renderMode || 'characters';
      const charSet = (params.charSet === 'custom' && params.customChars)
        ? params.customChars
        : (CHAR_SETS[params.charSet] || CHAR_SETS.binary);

      // Animation parameters
      const animSpeed = params.animated && params.animSpeed?.enabled ? (params.animSpeed.intensity / 100) : 0;
      const animIntensity = params.animated && params.animIntensity?.enabled ? (params.animIntensity.intensity / 100) : 0;
      const animStyle = params.animStyle || 'flicker';

      ctx.save();
      ctx.globalCompositeOperation = params.styleBlend || 'source-over';
      ctx.font = `bold ${Math.round(cellSize * 0.95)}px "Fira Code", monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Loop through each grid cell
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          // Coverage pseudo-random check
          const cellHash = Math.abs(Math.sin(c * 12.9898 + r * 78.233) * 43758.5453) % 1;
          if (cellHash > coverage) continue;

          const startX = c * cellSize;
          const startY = r * cellSize;
          const centerX = startX + cellSize * 0.5;
          const centerY = startY + cellSize * 0.5;

          // Sample average color in cell
          let sumR = 0, sumG = 0, sumB = 0, count = 0;
          const step = Math.max(1, Math.floor(cellSize / 4));

          for (let y = startY; y < startY + cellSize && y < this.height; y += step) {
            for (let x = startX; x < startX + cellSize && x < this.width; x += step) {
              const idx = (y * w + x) * 4;
              sumR += srcData[idx];
              sumG += srcData[idx + 1];
              sumB += srcData[idx + 2];
              count++;
            }
          }

          if (count === 0) continue;
          let rVal = sumR / count;
          let gVal = sumG / count;
          let bVal = sumB / count;

          // Calculate normalized luminance (ITU-R BT.709 standard)
          let lum = (0.2126 * rVal + 0.7152 * gVal + 0.0722 * bVal) / 255;

          // Edge Emphasis (Sobel approximation against adjacent cells)
          if (edgeEmphasis > 0 && c < cols - 1 && r < rows - 1) {
            const nextIdxX = (startY * w + Math.min(w - 1, startX + cellSize)) * 4;
            const nextIdxY = (Math.min(this.height - 1, startY + cellSize) * w + startX) * 4;
            const lumX = (0.2126 * srcData[nextIdxX] + 0.7152 * srcData[nextIdxX + 1] + 0.0722 * srcData[nextIdxX + 2]) / 255;
            const lumY = (0.2126 * srcData[nextIdxY] + 0.7152 * srcData[nextIdxY + 1] + 0.0722 * srcData[nextIdxY + 2]) / 255;
            const edge = Math.abs(lum - lumX) + Math.abs(lum - lumY);
            lum = Math.min(1, lum + edge * edgeEmphasis * 1.5);
          }

          // Density offset
          lum = Math.max(0, Math.min(1, lum + densityOffset));

          // Invert
          if (invert) lum = 1 - lum;

          // Animation phase modulation
          let animMod = 0;
          if (animSpeed > 0 && animIntensity > 0) {
            const t = this.time * animSpeed * 0.003;
            if (animStyle === 'flicker') {
              // High-frequency terminal noise flicker
              const noise = Math.sin(c * 17.1 + r * 31.4 + t * 8.0) * Math.cos(c * 5.3 + t * 4.2);
              animMod = noise * 0.22 * animIntensity;
            } else if (animStyle === 'wave') {
              // Smooth sweeping sine wave
              animMod = Math.sin(c * 0.15 + t * 3.0) * 0.25 * animIntensity;
            } else if (animStyle === 'pulse') {
              // Breathing intensity pulse
              animMod = Math.sin(t * 2.5) * 0.28 * animIntensity;
            } else if (animStyle === 'shimmer') {
              // Sparkling shimmer
              animMod = (Math.random() - 0.5) * 0.3 * animIntensity;
            } else if (animStyle === 'ripple') {
              // Concentric ripple from center
              const dx = c - cols * 0.5;
              const dy = r - rows * 0.5;
              const dist = Math.sqrt(dx * dx + dy * dy);
              animMod = Math.sin(dist * 0.25 - t * 4.0) * 0.25 * animIntensity;
            }
          }

          let finalLum = Math.max(0.02, Math.min(1, lum + animMod));

          // Base cell color from luminance (or sampled color)
          const baseColor = `rgb(${Math.round(rVal)}, ${Math.round(gVal)}, ${Math.round(bVal)})`;
          ctx.fillStyle = baseColor;
          ctx.strokeStyle = baseColor;

          // -----------------------------------------------------------------
          // Draw Shape based on renderMode
          // -----------------------------------------------------------------
          this.drawCellShape(ctx, mode, charSet, c, r, startX, startY, centerX, centerY, cellSize, finalLum, rVal, gVal, bVal);
        }
      }

      ctx.restore();
    }

    // Individual Primitive Drawer for All 23 Modes
    drawCellShape(ctx, mode, charSet, c, r, sx, sy, cx, cy, sz, lum, rV, gV, bV) {
      const radius = (sz * 0.5) * lum;

      switch (mode) {
        case 'characters': {
          // Select glyph based on luminance
          let charIndex = Math.floor(lum * (charSet.length - 1));
          // If flicker animation is high, occasionally jitter the glyph
          if (params.animStyle === 'flicker' && Math.random() < 0.04 * (params.animIntensity?.intensity || 60) / 100) {
            charIndex = Math.floor(Math.random() * charSet.length);
          }
          const ch = charSet[charIndex] || charSet[0];
          ctx.fillText(ch, cx, cy);
          break;
        }

        case 'matrix': {
          // Self-animated green matrix code rain
          const drop = this.matrixDrops[c];
          let isHead = false;
          if (drop) {
            const dropRow = Math.floor(drop.y);
            if (r === dropRow) {
              isHead = true;
              ctx.fillStyle = '#ffffff'; // Glowing white head
            } else if (r < dropRow && r > dropRow - 12) {
              // Fading green tail
              const fade = 1 - (dropRow - r) / 12;
              ctx.fillStyle = `rgba(0, 255, 102, ${fade * lum})`;
            }
          }
          const glyphs = CHAR_SETS.matrix;
          const char = glyphs[(c * 7 + r * 13 + Math.floor(this.frameCount * 0.1)) % glyphs.length];
          ctx.fillText(char, cx, cy);
          break;
        }

        case 'hexdump': {
          const hexChars = "0123456789ABCDEF";
          const hex = hexChars[Math.floor(lum * 15.99)];
          ctx.fillText(hex, cx, cy);
          break;
        }

        case 'braille': {
          // Braille Unicode: 2x4 sub-pixels mapped into \u2800 block
          const baseBraille = 0x2800;
          let offset = 0;
          if (lum > 0.15) offset |= 0x1;
          if (lum > 0.3)  offset |= 0x8;
          if (lum > 0.45) offset |= 0x2;
          if (lum > 0.6)  offset |= 0x10;
          if (lum > 0.75) offset |= 0x4;
          if (lum > 0.85) offset |= 0x20;
          if (lum > 0.92) offset |= 0x40;
          if (lum > 0.98) offset |= 0x80;
          const brailleChar = String.fromCharCode(baseBraille + offset);
          ctx.fillText(brailleChar, cx, cy);
          break;
        }

        case 'halfblocks': {
          // Upper / lower half-block Unicode
          const halfChar = lum > 0.75 ? '█' : (lum > 0.5 ? '▀' : (lum > 0.25 ? '▄' : ' '));
          ctx.fillText(halfChar, cx, cy);
          break;
        }

        case 'dither': {
          // 4x4 Bayer Dithering
          const bayerVal = BAYER_4X4[r % 4][c % 4] / 16;
          if (lum > bayerVal) {
            ctx.fillRect(sx, sy, sz, sz);
          }
          break;
        }

        case 'mosaic': {
          // Square tiles with 1px border gap
          ctx.fillRect(sx + 1, sy + 1, sz - 2, sz - 2);
          break;
        }

        case 'pixel': {
          // Sharp raster pixel block
          ctx.fillRect(sx, sy, sz, sz);
          break;
        }

        case 'dots': {
          // Circles sized by luminance
          ctx.beginPath();
          ctx.arc(cx, cy, Math.max(1, radius), 0, Math.PI * 2);
          ctx.fill();
          break;
        }

        case 'cross': {
          // + Crosshairs
          const arm = (sz * 0.45) * lum;
          ctx.lineWidth = Math.max(1, sz * 0.15 * lum);
          ctx.beginPath();
          ctx.moveTo(cx - arm, cy); ctx.lineTo(cx + arm, cy);
          ctx.moveTo(cx, cy - arm); ctx.lineTo(cx, cy + arm);
          ctx.stroke();
          break;
        }

        case 'diamond': {
          // 45° Rhombus
          const d = (sz * 0.5) * lum;
          ctx.beginPath();
          ctx.moveTo(cx, cy - d);
          ctx.lineTo(cx + d, cy);
          ctx.lineTo(cx, cy + d);
          ctx.lineTo(cx - d, cy);
          ctx.closePath();
          ctx.fill();
          break;
        }

        case 'voxel': {
          // Pseudo-3D Isometric Cube Box
          const s = (sz * 0.4) * lum;
          ctx.beginPath();
          ctx.moveTo(cx, cy - s);
          ctx.lineTo(cx + s, cy - s * 0.5);
          ctx.lineTo(cx, cy);
          ctx.lineTo(cx - s, cy - s * 0.5);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = 'rgba(0,0,0,0.25)';
          ctx.beginPath();
          ctx.moveTo(cx, cy); ctx.lineTo(cx + s, cy - s * 0.5); ctx.lineTo(cx + s, cy + s * 0.5); ctx.lineTo(cx, cy + s);
          ctx.closePath(); ctx.fill();
          break;
        }

        case 'lego': {
          // Studded Brick
          ctx.fillRect(sx + 1, sy + 1, sz - 2, sz - 2);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.beginPath();
          ctx.arc(cx, cy, sz * 0.22, 0, Math.PI * 2);
          ctx.fill();
          break;
        }

        case 'mixed': {
          // Composite: dots in shadows, crosses in midtones, blocks in highlights
          if (lum > 0.7) {
            ctx.fillText('█', cx, cy);
          } else if (lum > 0.4) {
            ctx.fillText('+', cx, cy);
          } else {
            ctx.beginPath();
            ctx.arc(cx, cy, Math.max(1, radius * 0.8), 0, Math.PI * 2);
            ctx.fill();
          }
          break;
        }

        case 'lines': {
          // Horizontal scanline band with height = sz * lum
          const h = sz * lum;
          ctx.fillRect(sx, cy - h * 0.5, sz, h);
          break;
        }

        case 'diagonal': {
          // 45° Hatching lines
          ctx.lineWidth = Math.max(1, sz * 0.2 * lum);
          ctx.beginPath();
          ctx.moveTo(sx, sy + sz);
          ctx.lineTo(sx + sz, sy);
          ctx.stroke();
          break;
        }

        case 'disco': {
          // Radial Gradient Disco Orbs
          const discoGrad = ctx.createRadialGradient(cx, cy, 1, cx, cy, Math.max(2, radius));
          discoGrad.addColorStop(0, '#ffffff');
          discoGrad.addColorStop(0.5, `hsl(${(c * 15 + r * 12 + this.time * 0.1) % 360}, 100%, 55%)`);
          discoGrad.addColorStop(1, 'transparent');
          ctx.fillStyle = discoGrad;
          ctx.beginPath();
          ctx.arc(cx, cy, Math.max(2, radius), 0, Math.PI * 2);
          ctx.fill();
          break;
        }

        case 'rings': {
          // Concentric circular rings
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(cx, cy, Math.max(1, radius), 0, Math.PI * 2);
          ctx.stroke();
          if (lum > 0.6) {
            ctx.beginPath();
            ctx.arc(cx, cy, Math.max(1, radius * 0.5), 0, Math.PI * 2);
            ctx.stroke();
          }
          break;
        }

        case 'hearts': {
          const s = (sz * 0.4) * lum;
          ctx.beginPath();
          ctx.moveTo(cx, cy + s * 0.4);
          ctx.bezierCurveTo(cx - s, cy - s * 0.5, cx - s, cy - s, cx, cy - s * 0.4);
          ctx.bezierCurveTo(cx + s, cy - s, cx + s, cy - s * 0.5, cx, cy + s * 0.4);
          ctx.fill();
          break;
        }

        case 'stars': {
          const s = (sz * 0.5) * lum;
          ctx.beginPath();
          ctx.moveTo(cx, cy - s);
          ctx.quadraticCurveTo(cx, cy, cx + s, cy);
          ctx.quadraticCurveTo(cx, cy, cx, cy + s);
          ctx.quadraticCurveTo(cx, cy, cx - s, cy);
          ctx.quadraticCurveTo(cx, cy, cx, cy - s);
          ctx.fill();
          break;
        }

        case 'hexagons': {
          const hRadius = (sz * 0.55) * lum;
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI) / 3;
            const x = cx + hRadius * Math.cos(angle);
            const y = cy + hRadius * Math.sin(angle);
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.fill();
          break;
        }

        case 'triangles': {
          const s = (sz * 0.5) * lum;
          ctx.beginPath();
          if ((c + r) % 2 === 0) {
            ctx.moveTo(cx, cy - s); ctx.lineTo(cx + s, cy + s); ctx.lineTo(cx - s, cy + s);
          } else {
            ctx.moveTo(cx, cy + s); ctx.lineTo(cx + s, cy - s); ctx.lineTo(cx - s, cy - s);
          }
          ctx.closePath();
          ctx.fill();
          break;
        }

        case 'bubbles': {
          ctx.beginPath();
          ctx.arc(cx, cy, Math.max(1, radius), 0, Math.PI * 2);
          ctx.fill();
          // Crescent highlight
          ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
          ctx.beginPath();
          ctx.arc(cx - radius * 0.3, cy - radius * 0.3, Math.max(1, radius * 0.25), 0, Math.PI * 2);
          ctx.fill();
          break;
        }

        case 'hatch': {
          // Pencil cross-hatch strokes
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(sx, sy); ctx.lineTo(sx + sz, sy + sz);
          ctx.stroke();
          if (lum > 0.5) {
            ctx.beginPath();
            ctx.moveTo(sx + sz, sy); ctx.lineTo(sx, sy + sz);
            ctx.stroke();
          }
          break;
        }

        case 'contour': {
          // Stepped topographic iso-curve rings
          const stepRing = Math.floor(lum * 4) * (sz * 0.12);
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(cx, cy, Math.max(1, stepRing), 0, Math.PI * 2);
          ctx.stroke();
          break;
        }

        default:
          ctx.fillText(charSet[0] || '#', cx, cy);
      }
    }

    // =======================================================================
    // Step 4: Apply Color Adjustments in Exact Order
    // (Brightness, Contrast, Saturation, Grayscale, Tint Overlay, Blur)
    // =======================================================================
    applyColorPipeline() {
      const {
        brightness = 0,
        contrast = 115,
        saturation = 100,
        grayscale = 0,
        tint = "#00ff66",
        tintOpacity = 45,
        overlayBlend = "overlay",
        blurType = "off",
        blurAmount = 35
      } = params;

      const ctx = this.effectCtx;
      const w = this.width;
      const h = this.height;

      // Pixel manipulation for Brightness, Contrast, Saturation, Grayscale
      const imgData = ctx.getImageData(0, 0, w, h);
      const data = imgData.data;
      const len = data.length;

      const cFactor = (contrast / 100);
      const bOffset = brightness * 1.5;
      const satFactor = saturation / 100;
      const grayFactor = grayscale / 100;

      for (let i = 0; i < len; i += 4) {
        if (data[i + 3] === 0) continue; // skip transparent pixels

        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        // 1. Brightness
        if (brightness !== 0) {
          r += bOffset;
          g += bOffset;
          b += bOffset;
        }

        // 2. Contrast: formula (val - 128) * factor + 128
        if (contrast !== 100) {
          r = (r - 128) * cFactor + 128;
          g = (g - 128) * cFactor + 128;
          b = (b - 128) * cFactor + 128;
        }

        // Luminance for saturation & grayscale
        const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;

        // 3. Saturation
        if (saturation !== 100) {
          r = lum + (r - lum) * satFactor;
          g = lum + (g - lum) * satFactor;
          b = lum + (b - lum) * satFactor;
        }

        // 4. Grayscale
        if (grayscale > 0) {
          r = r * (1 - grayFactor) + lum * grayFactor;
          g = g * (1 - grayFactor) + lum * grayFactor;
          b = b * (1 - grayFactor) + lum * grayFactor;
        }

        data[i] = Math.max(0, Math.min(255, r));
        data[i + 1] = Math.max(0, Math.min(255, g));
        data[i + 2] = Math.max(0, Math.min(255, b));
      }

      ctx.putImageData(imgData, 0, 0);

      // 5. Tint Color at tintOpacity via overlayBlend
      if (tintOpacity > 0 && tint) {
        ctx.save();
        ctx.globalCompositeOperation = overlayBlend || 'overlay';
        ctx.globalAlpha = Math.max(0, Math.min(1, tintOpacity / 100));
        ctx.fillStyle = tint;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
      }

      // 6. Blur Type / Blur Amount
      if (blurType && blurType !== 'off' && blurAmount > 0) {
        ctx.save();
        ctx.filter = `blur(${Math.round(blurAmount * 0.25)}px)`;
        ctx.drawImage(this.effectCanvas, 0, 0);
        ctx.restore();
      }
    }

    // =======================================================================
    // Step 5: Layer Post-Effects (PFX)
    // (Scanlines, Vignette, Bloom, Chromatic, FilmGrain, Glitch, Halftone, Pixelate, FilmDust)
    // =======================================================================
    applyPostEffects() {
      const pfx = params.pfx || {};
      const ctx = this.ctx;
      const w = this.width;
      const h = this.height;

      // 1. Pixelate (Downsample / Upsample)
      if (pfx.pixelate?.enabled && pfx.pixelate.intensity > 0) {
        const factor = Math.max(2, Math.floor((pfx.pixelate.intensity / 100) * 12));
        const smallCanvas = document.createElement('canvas');
        smallCanvas.width = Math.ceil(w / factor);
        smallCanvas.height = Math.ceil(h / factor);
        const sCtx = smallCanvas.getContext('2d');
        sCtx.drawImage(this.effectCanvas, 0, 0, smallCanvas.width, smallCanvas.height);

        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(smallCanvas, 0, 0, w, h);
        ctx.imageSmoothingEnabled = true;
      }

      // 2. Glitch (Signal displacement & horizontal slices)
      if (pfx.glitch?.enabled && pfx.glitch.intensity > 0) {
        const glitchProb = (pfx.glitch.intensity / 100) * 0.4;
        if (Math.random() < glitchProb) {
          const sliceH = 10 + Math.random() * 40;
          const sliceY = Math.random() * (h - sliceH);
          const shiftX = (Math.random() - 0.5) * (pfx.glitch.intensity * 0.6);

          ctx.drawImage(this.effectCanvas, 0, sliceY, w, sliceH, shiftX, sliceY, w, sliceH);

          // Color fringing line
          ctx.fillStyle = 'rgba(0, 255, 102, 0.4)';
          ctx.fillRect(0, sliceY, w, 2);
        }
      }

      // 3. Chromatic Aberration (RGB Channel Split)
      if (pfx.chromatic?.enabled && pfx.chromatic.intensity > 0) {
        const offset = Math.round((pfx.chromatic.intensity / 100) * 6);
        if (offset > 0) {
          ctx.save();
          ctx.globalCompositeOperation = 'screen';
          ctx.globalAlpha = 0.5;
          ctx.drawImage(this.effectCanvas, -offset, 0, w, h);
          ctx.drawImage(this.effectCanvas, offset, 0, w, h);
          ctx.restore();
        }
      }

      // 4. Bloom (Phosphor Glow / Highlight Bloom)
      if (pfx.bloom?.enabled && pfx.bloom.intensity > 0) {
        const bloomAlpha = (pfx.bloom.intensity / 100) * 0.65;
        this.bloomCtx.clearRect(0, 0, w, h);
        this.bloomCtx.save();
        this.bloomCtx.filter = `blur(${Math.round(pfx.bloom.intensity * 0.35)}px)`;
        this.bloomCtx.drawImage(this.effectCanvas, 0, 0, w, h);
        this.bloomCtx.restore();

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = bloomAlpha;
        ctx.drawImage(this.bloomCanvas, 0, 0, w, h);
        ctx.restore();
      }

      // 5. Halftone Screen
      if (pfx.halftone?.enabled && pfx.halftone.intensity > 0) {
        const dotSpacing = 8;
        const htAlpha = (pfx.halftone.intensity / 100) * 0.25;
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, ' + htAlpha + ')';
        for (let y = 0; y < h; y += dotSpacing) {
          for (let x = 0; x < w; x += dotSpacing) {
            ctx.beginPath();
            ctx.arc(x, y, 1.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.restore();
      }

      // 6. Scanlines (CRT Raster Effect)
      if (pfx.scanLines?.enabled && pfx.scanLines.intensity > 0) {
        const scanAlpha = (pfx.scanLines.intensity / 100) * 0.45;
        ctx.save();
        ctx.fillStyle = `rgba(0, 0, 0, ${scanAlpha})`;
        for (let y = 0; y < h; y += 4) {
          ctx.fillRect(0, y, w, 2);
        }
        ctx.restore();
      }

      // 7. Film Grain (Noise texture)
      if (pfx.filmGrain?.enabled && pfx.filmGrain.intensity > 0) {
        const grainIntensity = (pfx.filmGrain.intensity / 100) * 28;
        const grainData = ctx.getImageData(0, 0, w, h);
        const gPixels = grainData.data;
        const total = gPixels.length;

        for (let i = 0; i < total; i += 8) { // sample every 2nd pixel for speed
          const noise = (Math.random() - 0.5) * grainIntensity;
          gPixels[i] = Math.max(0, Math.min(255, gPixels[i] + noise));
          gPixels[i + 1] = Math.max(0, Math.min(255, gPixels[i + 1] + noise));
          gPixels[i + 2] = Math.max(0, Math.min(255, gPixels[i + 2] + noise));
        }
        ctx.putImageData(grainData, 0, 0);
      }

      // 8. Film Dust & Scratches
      if (pfx.filmDust?.enabled && pfx.filmDust.intensity > 0) {
        const count = Math.floor((pfx.filmDust.intensity / 100) * 12);
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        for (let i = 0; i < count; i++) {
          if (Math.random() > 0.4) {
            // Dust speck
            ctx.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2);
          } else {
            // Hair scratch
            const sx = Math.random() * w;
            const sy = Math.random() * h;
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(sx + (Math.random() - 0.5) * 20, sy + 15 + Math.random() * 30);
            ctx.stroke();
          }
        }
        ctx.restore();
      }

      // 9. Vignette (Dark Corner Falloff)
      if (pfx.vignette?.enabled && pfx.vignette.intensity > 0) {
        const vigIntensity = (pfx.vignette.intensity / 100);
        ctx.save();
        const outerR = Math.sqrt(w * w + h * h) * 0.55;
        const innerR = outerR * (0.65 - vigIntensity * 0.35);
        const vigGrad = ctx.createRadialGradient(w * 0.5, h * 0.5, Math.max(0, innerR), w * 0.5, h * 0.5, outerR);
        vigGrad.addColorStop(0, 'transparent');
        vigGrad.addColorStop(0.7, `rgba(2, 4, 8, ${vigIntensity * 0.5})`);
        vigGrad.addColorStop(1, `rgba(0, 0, 0, ${vigIntensity * 0.95})`);
        ctx.fillStyle = vigGrad;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
      }
    }

    // =======================================================================
    // Step 6: Glow Lights (lights.enabled)
    // =======================================================================
    renderGlowLights() {
      if (!params.lights?.enabled) return;
      const points = params.lights.points || this.lightPoints;
      if (!points || points.length === 0) return;

      const ctx = this.ctx;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      points.forEach(pt => {
        const px = (pt.x <= 1 ? pt.x * this.width : pt.x);
        const py = (pt.y <= 1 ? pt.y * this.height : pt.y);
        const radius = pt.radius || 120;
        const intensity = (pt.intensity || 50) / 100;

        const lightGrad = ctx.createRadialGradient(px, py, 2, px, py, radius);
        lightGrad.addColorStop(0, `rgba(0, 255, 102, ${0.8 * intensity})`);
        lightGrad.addColorStop(0.3, `rgba(56, 189, 248, ${0.4 * intensity})`);
        lightGrad.addColorStop(1, 'transparent');

        ctx.fillStyle = lightGrad;
        ctx.beginPath();
        ctx.arc(px, py, radius, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.restore();
    }

    // =======================================================================
    // Step 7: Reveal Mask (mask.enabled)
    // =======================================================================
    renderRevealMask() {
      if (!params.mask?.enabled) return;

      const ctx = this.ctx;
      ctx.save();

      if (params.mask.invert) {
        // Invert: show ASCII where masked, photo elsewhere
        ctx.globalCompositeOperation = 'destination-out';
        ctx.drawImage(this.maskCanvas, 0, 0);
        ctx.globalCompositeOperation = 'destination-over';
        ctx.drawImage(this.sourceCanvas, 0, 0);
      } else {
        // Standard: reveal plain photo through the painted mask strokes
        const tempC = document.createElement('canvas');
        tempC.width = this.width;
        tempC.height = this.height;
        const tCtx = tempC.getContext('2d');
        tCtx.drawImage(this.sourceCanvas, 0, 0);
        tCtx.globalCompositeOperation = 'destination-in';
        tCtx.drawImage(this.maskCanvas, 0, 0);

        ctx.drawImage(tempC, 0, 0);
      }

      ctx.restore();
    }

    // =======================================================================
    // Step 8: Master Render Loop
    // =======================================================================
    render(timestamp = 0) {
      if (!this.lastTime) this.lastTime = timestamp;
      const delta = timestamp - this.lastTime;
      this.lastTime = timestamp;

      if (this.isPlaying) {
        this.time += delta;
        this.frameCount++;

        // Update Matrix drops if matrix mode
        if (params.renderMode === 'matrix') {
          const rows = Math.ceil(this.height / (params.cellSize || 14));
          this.matrixDrops.forEach(drop => {
            drop.y += drop.speed;
            if (drop.y > rows + 12) {
              drop.y = Math.floor(Math.random() * -30);
              drop.speed = 1 + Math.random() * 2.2;
            }
          });
        }
      }

      // FPS Counter calculation
      if (timestamp - this.lastFpsUpdate > 500) {
        this.fps = Math.round(1000 / (delta || 16.6));
        this.lastFpsUpdate = timestamp;
        const hudFps = document.getElementById('hudFps');
        if (hudFps) hudFps.textContent = `${Math.min(60, this.fps)} FPS`;
      }

      // Pipeline Execution
      // 1. Draw Background
      this.renderBackground();

      // 2 & 3. Sample grid & render shape layer
      this.renderAsciiLayer();

      // 4. Color Adjustments on effect canvas
      this.applyColorPipeline();

      // Composite effect onto background on main canvas
      this.ctx.clearRect(0, 0, this.width, this.height);
      this.ctx.drawImage(this.bgCanvas, 0, 0);
      this.ctx.drawImage(this.effectCanvas, 0, 0);

      // 5. Post-Effects
      this.applyPostEffects();

      // 6. Glow Lights
      this.renderGlowLights();

      // 7. Reveal Mask
      this.renderRevealMask();

      // Request next frame
      if (this.isPlaying) {
        this.animationId = requestAnimationFrame((t) => this.render(t));
      }
    }

    start() {
      if (!this.isPlaying) {
        this.isPlaying = true;
        this.render();
      }
    }

    pause() {
      this.isPlaying = false;
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
        this.animationId = null;
      }
    }

    togglePlay() {
      if (this.isPlaying) {
        this.pause();
      } else {
        this.start();
      }
      return this.isPlaying;
    }
  }

  // =========================================================================
  // 4. Application Bootstrapper & UI Controller
  // =========================================================================
  let pipeline;
  const canvas = document.getElementById('asciiCanvas');

  // Procedural presets catalog
  let currentPresetImgIdx = 0;
  const presetImages = [
    { name: 'Portrait: Cyber Ref-006', gen: () => createProceduralImage('cyber') },
    { name: 'City: Cyberpunk Metropolis', gen: () => createProceduralImage('city') }
  ];

  function loadInitialImage() {
    // 1. First, attempt to load ref-006.webp if it exists
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = '/ascii-editor/demos/generated/ref-006.webp';

    img.onload = () => {
      pipeline = new AsciiRenderPipeline(canvas);
      pipeline.init(img);
      pipeline.start();
      bindUiControls();
      updateHudDisplay();
    };

    img.onerror = () => {
      // 2. Fallback: generate high-resolution Cyber Ref-006 Canvas artwork
      const fallbackCanvas = presetImages[0].gen();
      pipeline = new AsciiRenderPipeline(canvas);
      pipeline.init(fallbackCanvas);
      pipeline.start();
      bindUiControls();
      updateHudDisplay();
    };
  }

  // =========================================================================
  // 5. UI Controls & Two-Way Parameter Synchronization
  // =========================================================================
  function bindUiControls() {
    // Accordion expand/collapse
    document.querySelectorAll('.accordion-header').forEach(header => {
      header.addEventListener('click', () => {
        const accordion = header.closest('.param-accordion');
        accordion.classList.toggle('active');
      });
    });

    // Top Play/Pause button
    const btnTogglePlay = document.getElementById('btnTogglePlay');
    const playIcon = document.getElementById('playIcon');
    if (btnTogglePlay) {
      btnTogglePlay.addEventListener('click', () => {
        const playing = pipeline.togglePlay();
        btnTogglePlay.classList.toggle('active', playing);
        playIcon.textContent = playing ? '⏸' : '▶';
        const label = btnTogglePlay.querySelector('.label');
        if (label) label.textContent = playing ? 'Play' : 'Pause';
      });
    }

    // Reset Parameters
    const btnResetParams = document.getElementById('btnResetParams');
    if (btnResetParams) {
      btnResetParams.addEventListener('click', () => {
        params = JSON.parse(JSON.stringify(DEFAULT_PARAMS));
        syncParamsToUi();
        pipeline.resetMatrixDrops();
        updateHudDisplay();
      });
    }

    // Switch Preset Images
    const btnSwitchPresetImg = document.getElementById('btnSwitchPresetImg');
    const presetImgLabel = document.getElementById('presetImgLabel');
    if (btnSwitchPresetImg) {
      btnSwitchPresetImg.addEventListener('click', () => {
        currentPresetImgIdx = (currentPresetImgIdx + 1) % presetImages.length;
        const p = presetImages[currentPresetImgIdx];
        if (presetImgLabel) presetImgLabel.textContent = p.name;
        const newImg = p.gen();
        pipeline.init(newImg);
      });
    }

    // File Upload Handler
    const imageUploadInput = document.getElementById('imageUploadInput');
    if (imageUploadInput) {
      imageUploadInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          const userImg = new Image();
          userImg.onload = () => {
            pipeline.init(userImg);
            if (presetImgLabel) presetImgLabel.textContent = `Custom: ${file.name.slice(0, 15)}`;
          };
          userImg.src = ev.target.result;
        };
        reader.readAsDataURL(file);
      });
    }

    // Drag and drop image onto canvas
    const viewportContainer = document.getElementById('viewportContainer');
    if (viewportContainer) {
      viewportContainer.addEventListener('dragover', (e) => e.preventDefault());
      viewportContainer.addEventListener('drop', (e) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (!file || !file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          const dropImg = new Image();
          dropImg.onload = () => {
            pipeline.init(dropImg);
            if (presetImgLabel) presetImgLabel.textContent = `Dropped: ${file.name.slice(0, 15)}`;
          };
          dropImg.src = ev.target.result;
        };
        reader.readAsDataURL(file);
      });
    }

    // Export PNG
    const btnExportPng = document.getElementById('btnExportPng');
    if (btnExportPng) {
      btnExportPng.addEventListener('click', () => {
        const link = document.createElement('a');
        link.download = `code-rain-ascii-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      });
    }

    // Sidebar Mobile Toggle
    const btnToggleSidebar = document.getElementById('btnToggleSidebar');
    const sidebarPanel = document.getElementById('sidebarPanel');
    if (btnToggleSidebar && sidebarPanel) {
      btnToggleSidebar.addEventListener('click', () => {
        sidebarPanel.classList.toggle('open');
      });
    }

    // -----------------------------------------------------------------------
    // Parameter Inspector Controls Bindings
    // -----------------------------------------------------------------------
    // Render Mode
    const selRenderMode = document.getElementById('selRenderMode');
    if (selRenderMode) {
      selRenderMode.addEventListener('change', (e) => {
        params.renderMode = e.target.value;
        updateHudDisplay();
      });
    }

    // CharSet
    const selCharSet = document.getElementById('selCharSet');
    const groupCustomChars = document.getElementById('groupCustomChars');
    if (selCharSet) {
      selCharSet.addEventListener('change', (e) => {
        params.charSet = e.target.value;
        if (groupCustomChars) {
          groupCustomChars.style.display = e.target.value === 'custom' ? 'flex' : 'none';
        }
        updateHudDisplay();
      });
    }

    const inputCustomChars = document.getElementById('inputCustomChars');
    if (inputCustomChars) {
      inputCustomChars.addEventListener('input', (e) => {
        params.customChars = e.target.value;
      });
    }

    // Sliders Helper
    function bindSlider(sliderId, valId, paramKey, parentObj = params, callback) {
      const slider = document.getElementById(sliderId);
      const valDisplay = document.getElementById(valId);
      if (slider) {
        slider.addEventListener('input', (e) => {
          const val = parseFloat(e.target.value);
          parentObj[paramKey] = val;
          if (valDisplay) valDisplay.textContent = val;
          if (callback) callback(val);
        });
      }
    }

    bindSlider('rangeCellSize', 'valCellSize', 'cellSize', params, () => {
      pipeline.resetMatrixDrops();
      updateHudDisplay();
    });
    bindSlider('rangeCoverage', 'valCoverage', 'coverage');
    bindSlider('rangeEdgeEmphasis', 'valEdgeEmphasis', 'edgeEmphasis');
    bindSlider('rangeDensity', 'valDensity', 'density');
    bindSlider('rangeBgOpacity', 'valBgOpacity', 'bgOpacity');
    bindSlider('rangeBgBlur', 'valBgBlur', 'bgBlur');
    bindSlider('rangeTintOpacity', 'valTintOpacity', 'tintOpacity');
    bindSlider('rangeContrast', 'valContrast', 'contrast');
    bindSlider('rangeBrightness', 'valBrightness', 'brightness');
    bindSlider('rangeSaturation', 'valSaturation', 'saturation');
    bindSlider('rangeGrayscale', 'valGrayscale', 'grayscale');
    bindSlider('rangeBlurAmount', 'valBlurAmount', 'blurAmount');

    // Invert Toggle
    const chkInvert = document.getElementById('chkInvert');
    if (chkInvert) {
      chkInvert.addEventListener('change', (e) => params.invert = e.target.checked);
    }

    // Style Blend Mode
    const selStyleBlend = document.getElementById('selStyleBlend');
    if (selStyleBlend) {
      selStyleBlend.addEventListener('change', (e) => params.styleBlend = e.target.value);
    }

    // Background Mode
    const selBgMode = document.getElementById('selBgMode');
    if (selBgMode) {
      selBgMode.addEventListener('change', (e) => params.bgMode = e.target.value);
    }

    // Tint Color Picker & Hex Input
    const colorTint = document.getElementById('colorTint');
    const colorTintHex = document.getElementById('colorTintHex');
    if (colorTint && colorTintHex) {
      colorTint.addEventListener('input', (e) => {
        params.tint = e.target.value;
        colorTintHex.value = e.target.value;
      });
      colorTintHex.addEventListener('input', (e) => {
        params.tint = e.target.value;
        colorTint.value = e.target.value;
      });
    }

    // Overlay Blend Mode
    const selOverlayBlend = document.getElementById('selOverlayBlend');
    if (selOverlayBlend) {
      selOverlayBlend.addEventListener('change', (e) => params.overlayBlend = e.target.value);
    }

    // Blur Type
    const selBlurType = document.getElementById('selBlurType');
    const groupBlurAmount = document.getElementById('groupBlurAmount');
    if (selBlurType) {
      selBlurType.addEventListener('change', (e) => {
        params.blurType = e.target.value;
        if (groupBlurAmount) {
          groupBlurAmount.style.display = e.target.value !== 'off' ? 'flex' : 'none';
        }
      });
    }

    // Post-Effects (PFX) Checkboxes & Sliders
    const pfxList = [
      { key: 'scanLines', chk: 'chkPfxScanlines', range: 'rangePfxScanlines', val: 'valPfxScanlines' },
      { key: 'vignette', chk: 'chkPfxVignette', range: 'rangePfxVignette', val: 'valPfxVignette' },
      { key: 'bloom', chk: 'chkPfxBloom', range: 'rangePfxBloom', val: 'valPfxBloom' },
      { key: 'filmGrain', chk: 'chkPfxFilmGrain', range: 'rangePfxFilmGrain', val: 'valPfxFilmGrain' },
      { key: 'glitch', chk: 'chkPfxGlitch', range: 'rangePfxGlitch', val: 'valPfxGlitch' },
      { key: 'chromatic', chk: 'chkPfxChromatic', range: 'rangePfxChromatic', val: 'valPfxChromatic' },
      { key: 'pixelate', chk: 'chkPfxPixelate', range: 'rangePfxPixelate', val: 'valPfxPixelate' },
      { key: 'halftone', chk: 'chkPfxHalftone', range: 'rangePfxHalftone', val: 'valPfxHalftone' },
      { key: 'filmDust', chk: 'chkPfxFilmDust', range: 'rangePfxFilmDust', val: 'valPfxFilmDust' }
    ];

    pfxList.forEach(item => {
      const chk = document.getElementById(item.chk);
      const range = document.getElementById(item.range);
      const valDisp = document.getElementById(item.val);

      if (chk) {
        chk.addEventListener('change', (e) => {
          if (!params.pfx[item.key]) params.pfx[item.key] = { enabled: false, intensity: 20 };
          params.pfx[item.key].enabled = e.target.checked;
        });
      }

      if (range) {
        range.addEventListener('input', (e) => {
          const v = parseFloat(e.target.value);
          if (!params.pfx[item.key]) params.pfx[item.key] = { enabled: true, intensity: v };
          params.pfx[item.key].intensity = v;
          if (valDisp) valDisp.textContent = v;
        });
      }
    });

    // Animation Controls
    const chkAnimated = document.getElementById('chkAnimated');
    if (chkAnimated) {
      chkAnimated.addEventListener('change', (e) => {
        params.animated = e.target.checked;
        updateHudDisplay();
      });
    }

    const selAnimStyle = document.getElementById('selAnimStyle');
    if (selAnimStyle) {
      selAnimStyle.addEventListener('change', (e) => {
        params.animStyle = e.target.value;
        updateHudDisplay();
      });
    }

    bindSlider('rangeAnimSpeed', 'valAnimSpeed', 'intensity', params.animSpeed, () => updateHudDisplay());
    bindSlider('rangeAnimIntensity', 'valAnimIntensity', 'intensity', params.animIntensity);

    // Glow Lights & Reveal Mask
    const chkLightsEnabled = document.getElementById('chkLightsEnabled');
    if (chkLightsEnabled) {
      chkLightsEnabled.addEventListener('change', (e) => {
        params.lights.enabled = e.target.checked;
      });
    }

    const chkMaskEnabled = document.getElementById('chkMaskEnabled');
    const maskBrushControls = document.getElementById('maskBrushControls');
    if (chkMaskEnabled) {
      chkMaskEnabled.addEventListener('change', (e) => {
        params.mask.enabled = e.target.checked;
        if (maskBrushControls) {
          maskBrushControls.style.display = e.target.checked ? 'block' : 'none';
        }
      });
    }

    const chkMaskInvert = document.getElementById('chkMaskInvert');
    if (chkMaskInvert) {
      chkMaskInvert.addEventListener('change', (e) => {
        params.mask.invert = e.target.checked;
      });
    }

    const rangeBrushSize = document.getElementById('rangeBrushSize');
    const valBrushSize = document.getElementById('valBrushSize');
    if (rangeBrushSize) {
      rangeBrushSize.addEventListener('input', (e) => {
        params.mask.brushSize = parseFloat(e.target.value);
        if (valBrushSize) valBrushSize.textContent = e.target.value;
      });
    }

    const btnClearMask = document.getElementById('btnClearMask');
    if (btnClearMask) {
      btnClearMask.addEventListener('click', () => {
        pipeline.maskCtx.clearRect(0, 0, pipeline.width, pipeline.height);
      });
    }

    // Canvas Mouse Click: Add Glow Light or Paint Mask
    let isPaintingMask = false;
    canvas.addEventListener('mousedown', (e) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;

      if (params.mask?.enabled) {
        isPaintingMask = true;
        paintMaskStroke(x, y);
      } else if (params.lights?.enabled) {
        // Add light point
        pipeline.lightPoints.push({
          x: x / pipeline.width,
          y: y / pipeline.height,
          radius: 140,
          intensity: 65
        });
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (isPaintingMask && params.mask?.enabled) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;
        paintMaskStroke(x, y);
      }
    });

    window.addEventListener('mouseup', () => {
      isPaintingMask = false;
    });

    function paintMaskStroke(x, y) {
      const ctx = pipeline.maskCtx;
      const bSize = params.mask.brushSize || 30;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x, y, bSize, 0, Math.PI * 2);
      ctx.fill();
    }

    // -----------------------------------------------------------------------
    // JSON Modal Editor Handlers
    // -----------------------------------------------------------------------
    const btnOpenJsonModal = document.getElementById('btnOpenJsonModal');
    const btnCloseJsonModal = document.getElementById('btnCloseJsonModal');
    const jsonModal = document.getElementById('jsonModal');
    const jsonTextarea = document.getElementById('jsonTextarea');
    const btnCopyJson = document.getElementById('btnCopyJson');
    const btnApplyJson = document.getElementById('btnApplyJson');
    const jsonModalStatus = document.getElementById('jsonModalStatus');

    if (btnOpenJsonModal && jsonModal) {
      btnOpenJsonModal.addEventListener('click', () => {
        jsonTextarea.value = JSON.stringify(params, null, 2);
        jsonModal.classList.add('active');
        if (jsonModalStatus) jsonModalStatus.textContent = 'Edit JSON values and click Apply to update live.';
      });
    }

    if (btnCloseJsonModal && jsonModal) {
      btnCloseJsonModal.addEventListener('click', () => {
        jsonModal.classList.remove('active');
      });
    }

    if (btnCopyJson && jsonTextarea) {
      btnCopyJson.addEventListener('click', () => {
        navigator.clipboard.writeText(jsonTextarea.value).then(() => {
          if (jsonModalStatus) jsonModalStatus.textContent = '✓ JSON copied to clipboard!';
        });
      });
    }

    if (btnApplyJson && jsonTextarea) {
      btnApplyJson.addEventListener('click', () => {
        try {
          const parsed = JSON.parse(jsonTextarea.value);
          params = parsed;
          syncParamsToUi();
          pipeline.resetMatrixDrops();
          updateHudDisplay();
          if (jsonModalStatus) jsonModalStatus.textContent = '✓ Configuration applied successfully!';
          setTimeout(() => jsonModal.classList.remove('active'), 600);
        } catch (err) {
          if (jsonModalStatus) jsonModalStatus.textContent = `⚠️ JSON Syntax Error: ${err.message}`;
        }
      });
    }
  }

  // Synchronize UI Controls with parameters object
  function syncParamsToUi() {
    const sel = (id) => document.getElementById(id);
    const setVal = (id, v) => { const el = sel(id); if (el) el.value = v; };
    const setTxt = (id, v) => { const el = sel(id); if (el) el.textContent = v; };
    const setChk = (id, v) => { const el = sel(id); if (el) el.checked = !!v; };

    setVal('selRenderMode', params.renderMode);
    setVal('selCharSet', params.charSet);
    setVal('inputCustomChars', params.customChars || '');
    setVal('rangeCellSize', params.cellSize); setTxt('valCellSize', params.cellSize);
    setVal('rangeCoverage', params.coverage); setTxt('valCoverage', params.coverage);
    setVal('rangeEdgeEmphasis', params.edgeEmphasis); setTxt('valEdgeEmphasis', params.edgeEmphasis);
    setVal('rangeDensity', params.density); setTxt('valDensity', params.density);
    setChk('chkInvert', params.invert);
    setVal('selStyleBlend', params.styleBlend);
    setVal('selBgMode', params.bgMode);
    setVal('rangeBgOpacity', params.bgOpacity); setTxt('valBgOpacity', params.bgOpacity);
    setVal('rangeBgBlur', params.bgBlur); setTxt('valBgBlur', params.bgBlur);
    setVal('colorTint', params.tint);
    setVal('colorTintHex', params.tint);
    setVal('rangeTintOpacity', params.tintOpacity); setTxt('valTintOpacity', params.tintOpacity);
    setVal('selOverlayBlend', params.overlayBlend);
    setVal('rangeContrast', params.contrast); setTxt('valContrast', params.contrast);
    setVal('rangeBrightness', params.brightness); setTxt('valBrightness', params.brightness);
    setVal('rangeSaturation', params.saturation); setTxt('valSaturation', params.saturation);
    setVal('rangeGrayscale', params.grayscale); setTxt('valGrayscale', params.grayscale);
    setVal('selBlurType', params.blurType);
    setVal('rangeBlurAmount', params.blurAmount); setTxt('valBlurAmount', params.blurAmount);

    // PFX
    const pfx = params.pfx || {};
    setChk('chkPfxScanlines', pfx.scanLines?.enabled);
    setVal('rangePfxScanlines', pfx.scanLines?.intensity || 28);
    setTxt('valPfxScanlines', pfx.scanLines?.intensity || 28);

    setChk('chkPfxVignette', pfx.vignette?.enabled);
    setVal('rangePfxVignette', pfx.vignette?.intensity || 38);
    setTxt('valPfxVignette', pfx.vignette?.intensity || 38);

    setChk('chkPfxBloom', pfx.bloom?.enabled);
    setVal('rangePfxBloom', pfx.bloom?.intensity || 25);
    setTxt('valPfxBloom', pfx.bloom?.intensity || 25);

    setChk('chkPfxFilmGrain', pfx.filmGrain?.enabled);
    setVal('rangePfxFilmGrain', pfx.filmGrain?.intensity || 40);
    setTxt('valPfxFilmGrain', pfx.filmGrain?.intensity || 40);

    setChk('chkPfxGlitch', pfx.glitch?.enabled);
    setVal('rangePfxGlitch', pfx.glitch?.intensity || 20);
    setTxt('valPfxGlitch', pfx.glitch?.intensity || 20);

    setChk('chkPfxChromatic', pfx.chromatic?.enabled);
    setVal('rangePfxChromatic', pfx.chromatic?.intensity || 15);
    setTxt('valPfxChromatic', pfx.chromatic?.intensity || 15);

    // Animation
    setChk('chkAnimated', params.animated);
    setVal('selAnimStyle', params.animStyle);
    setVal('rangeAnimSpeed', params.animSpeed?.intensity || 100);
    setTxt('valAnimSpeed', params.animSpeed?.intensity || 100);
    setVal('rangeAnimIntensity', params.animIntensity?.intensity || 60);
    setTxt('valAnimIntensity', params.animIntensity?.intensity || 60);
  }

  function updateHudDisplay() {
    const hudMode = document.getElementById('hudMode');
    const hudGrid = document.getElementById('hudGrid');
    const hudAnim = document.getElementById('hudAnim');

    if (hudMode) {
      hudMode.textContent = `${params.renderMode} (${params.charSet})`;
    }
    if (hudGrid && pipeline) {
      const c = Math.floor(pipeline.width / params.cellSize);
      const r = Math.floor(pipeline.height / params.cellSize);
      hudGrid.textContent = `${c} × ${r} (${params.cellSize}px)`;
    }
    if (hudAnim) {
      hudAnim.textContent = params.animated
        ? `${params.animStyle} (${params.animSpeed?.intensity || 100}%)`
        : 'paused';
    }
  }

  // =========================================================================
  // Kickoff Initialization
  // =========================================================================
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadInitialImage);
  } else {
    loadInitialImage();
  }

})();
