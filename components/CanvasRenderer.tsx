
import React, { useRef, useEffect, useState, useLayoutEffect } from 'react';
import { AppConfig, ProcessedImage } from '../types';
import { getContrastColor, rgbaToHex, getHsbValues, hexToRgba } from '../utils/colorUtils';
import { formatBeadCode } from '../utils/beadUtils';
import { PrintableSizeIcon, PlusIcon, MinusIcon, ReloadIcon, ToastWarningIcon } from './Icons';
import { t } from '../utils/translations';

interface Props {
  data: ProcessedImage | null;
  config: AppConfig;
  onCanvasReady: (canvas: HTMLCanvasElement) => void;
  onReset: () => void;
}

const CanvasRenderer: React.FC<Props> = ({ data, config, onCanvasReady, onReset }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [fitScale, setFitScale] = useState(1.0);
  const [zoomMode, setZoomMode] = useState<'fit' | 'custom'>('fit');
  const [customScale, setCustomScale] = useState(1.0);
  const [canvasDims, setCanvasDims] = useState({ w: 0, h: 0 });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useLayoutEffect(() => {
    const handleResize = () => {
      if (containerRef.current && canvasDims.w > 0) {
        const container = containerRef.current;
        const scaleX = (container.clientWidth - 40) / canvasDims.w;
        const scaleY = (container.clientHeight - 40) / canvasDims.h;
        setFitScale(Math.min(scaleX, scaleY, 1.0));
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [canvasDims]);

  useEffect(() => {
    if (!data || !canvasRef.current) return;
    document.fonts.ready.then(() => renderCanvas());
  }, [data, config]);

  const getFontFamily = (type: 'text' | 'code') => type === 'code' ? "'PixelIBM', monospace" : "'PixelMain', sans-serif";

  const renderCanvas = () => {
    if (!data || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const { scale, margin, show_coordinates, show_grid, grid_color, grid_opacity, legend_position, show_color_value, major_grid_interval, color_format, bead_source_mode } = config;
    
    // --- 1. CONFIGURATION & FONTS ---
    const majorInterval = major_grid_interval || 5;
    const axisSize = show_coordinates ? scale : 0; 
    const axisGap = show_coordinates ? Math.max(2, scale * 0.1) : 0; 
    const axisTotalSpace = show_coordinates ? axisSize + axisGap : 0; 

    // Grid Dimensions
    const gridPixelW = data.width * scale;
    const gridPixelH = data.height * scale;
    const gridBlockW = gridPixelW + (axisTotalSpace * 2); // Includes coordinates
    const gridBlockH = gridPixelH + (axisTotalSpace * 2);

    const baseFontSize = Math.max(16, scale * 0.65); 
    const swatchSize = Math.max(20, scale); // Ensure swatch isn't too tiny on small scales
    const legendRowGap = 4;
    const legendItemHeight = Math.max(swatchSize, baseFontSize * 1.5) + legendRowGap;
    
    // Set fonts for measurement matching render exactly
    const fontExtraInfo = `${baseFontSize * 0.8}px ${getFontFamily('code')}`;
    const fontExtraInfoBold = `bold ${baseFontSize * 0.8}px ${getFontFamily('code')}`;
    const fontCount = `bold ${baseFontSize}px ${getFontFamily('code')}`;
    const textFont = `bold ${baseFontSize}px ${getFontFamily('text')}`;

    // Find darkest color for legend border
    let darkestColor = '#000000';
    let minBrightness = 255;
    if (data.palette.length > 0) {
        data.palette.forEach(p => {
             if (p.brightness < minBrightness) {
                 minBrightness = p.brightness;
                 darkestColor = p.hex;
             }
        });
    }

    // --- 2. MEASUREMENT PASS (PRE-CALCULATION) ---
    
    // 2a. Measure Legend Columns
    let maxExtraTextW = 0;
    let maxCountW = 0;
    
    data.palette.forEach(item => {
        // Measure "Extra Text" (e.g. Hex, HSB, or Bead Refs)
        let textWidth = 0;
        const hasBeadMatch = bead_source_mode !== 'none' && item.matchedBead;

        if (hasBeadMatch) {
            if (item.isBeadMissing) {
                // When missing, we show ALL codes: ( [Bold Prio] , Other, Other )
                const prioCode = item.matchedBead!.refs[0].code;
                const others = item.matchedBead!.refs.slice(1).map(r => r.code).join(',');
                
                ctx.save();
                // Measure prefix '('
                ctx.font = fontExtraInfo;
                const wPrefix = ctx.measureText('(').width;
                
                // Measure bold priority code
                ctx.font = fontExtraInfoBold;
                const wBold = ctx.measureText(prioCode).width;
                
                // Measure suffix ', others)'
                ctx.font = fontExtraInfo;
                const suffixStr = others ? `, ${others})` : ')';
                const wSuffix = ctx.measureText(suffixStr).width;
                ctx.restore();
                
                textWidth = wPrefix + wBold + wSuffix;
            } else {
                // Normal match: show only alternatives
                const others = item.matchedBead!.refs.slice(1).map(r => r.code).join(',');
                if (others) {
                    const text = `(${others})`;
                    ctx.save();
                    ctx.font = fontExtraInfo;
                    textWidth = ctx.measureText(text).width;
                    ctx.restore();
                }
            }
        } else if (show_color_value) {
            const text = color_format === 'hex' ? item.hex : `[${getHsbValues(item.color).h}°,${getHsbValues(item.color).s}%,${getHsbValues(item.color).b}%]`;
            ctx.save();
            ctx.font = fontExtraInfo;
            textWidth = ctx.measureText(text).width;
            ctx.restore();
        }
        
        if (textWidth > maxExtraTextW) maxExtraTextW = textWidth;

        // Measure Count Text
        const countStr = item.count.toString();
        ctx.save();
        ctx.font = fontCount;
        const cw = ctx.measureText(countStr).width;
        ctx.restore();
        if (cw > maxCountW) maxCountW = cw;
    });

    const gapSwatchToText = 10;
    const gapTextToCount = 15;
    const gapColToCol = 40; 
    const boxPadding = 20; // Padding inside the legend border

    // Calculate dynamic column width
    let legendItemWidth = swatchSize + gapSwatchToText + maxCountW;
    if (maxExtraTextW > 0) {
        legendItemWidth += maxExtraTextW + gapTextToCount;
    }
    legendItemWidth += gapColToCol; 

    // 2b. Measure Header (Statistics)
    ctx.font = textFont;
    const isHorizontal = legend_position === 'top' || legend_position === 'bottom';
    
    // Build stat strings
    const statLinesSource = [];
    statLinesSource.push(`${t('totalPixels', config.language)}: ${data.palette.reduce((s, p) => s + p.count, 0)}`);
    statLinesSource.push(`${t('totalColors', config.language)}: ${data.palette.length}`);
    if (show_color_value && bead_source_mode === 'none') {
        statLinesSource.push(`${t('legendColorFormat', config.language)}: ${color_format.toUpperCase()}`);
    }

    // Layout stats: Single line for Horz, Multi-line for Vert
    let headerLines: string[] = [];
    if (isHorizontal) {
        headerLines = [statLinesSource.join('   ')];
    } else {
        headerLines = statLinesSource;
    }

    let maxHeaderW = 0;
    headerLines.forEach(line => {
        const w = ctx.measureText(line).width;
        if (w > maxHeaderW) maxHeaderW = w;
    });

    const headerLineHeight = baseFontSize * 1.5;
    // Header section height including spacing below it
    const headerSectionHeight = (headerLines.length * headerLineHeight) + 10; 

    // 2c. Determine Grid of Legend Items
    let legendCols = 1;
    let legendRows = data.palette.length;

    if (isHorizontal) {
        // Top/Bottom: Try to fit as many cols as the grid width allows, minimum 1
        // We want the legend to match the grid width if possible, or be wider if content demands
        const targetWidth = Math.max(gridBlockW, 400); 
        // Available width for columns needs to account for padding
        const effectiveWidth = targetWidth - (boxPadding * 2);
        
        legendCols = Math.floor(effectiveWidth / legendItemWidth);
        if (legendCols < 1) legendCols = 1;
        legendRows = Math.ceil(data.palette.length / legendCols);
    } else {
        // Left/Right: Try to fit within grid height
        const availableHeight = Math.max(gridBlockH, 400);
        const effectiveHeight = availableHeight - (boxPadding * 2) - headerSectionHeight;
        
        const itemsPerCol = Math.floor(effectiveHeight / legendItemHeight);
        const safeItemsPerCol = Math.max(1, itemsPerCol);
        
        legendCols = Math.ceil(data.palette.length / safeItemsPerCol);
        legendRows = Math.ceil(data.palette.length / legendCols); // actually max rows per col here
    }

    // 2d. Calculate Total Legend Box Dimensions
    // Width: Columns * ItemWidth OR Header Width, plus padding
    const legendContentW = Math.max(legendCols * legendItemWidth, maxHeaderW);
    const legendContentH = headerSectionHeight + (legendRows * legendItemHeight);

    let legendBoxW = legendContentW + (boxPadding * 2);
    let legendBoxH = legendContentH + (boxPadding * 2);
    
    // For Top/Bottom layouts, ensure the box border matches the grid width (if grid is wider than content)
    if (isHorizontal) {
        legendBoxW = Math.max(legendBoxW, gridBlockW);
    }

    // --- 3. LAYOUT & COORDINATES ---
    const layoutGap = 30; // Gap between Grid and Legend Box
    const titleGap = config.title ? 20 : 0; // Gap between Title and Content
    
    let canvasW = 0, canvasH = 0;
    let gridX = 0, gridY = 0;
    let legendBoxX = 0, legendBoxY = 0;
    
    const titleHeight = config.title ? (baseFontSize * 1.5) : 0;
    const contentStartY = margin + titleHeight + titleGap;

    switch (legend_position) {
        case 'top':
            legendBoxX = margin;
            legendBoxY = contentStartY;
            gridX = margin + axisTotalSpace;
            // Grid starts below legend box
            gridY = legendBoxY + legendBoxH + layoutGap + axisTotalSpace;
            
            canvasW = Math.max(gridBlockW, legendBoxW) + margin * 2;
            canvasH = gridY + gridPixelH + axisTotalSpace + margin;
            break;
            
        case 'bottom':
            gridX = margin + axisTotalSpace;
            gridY = contentStartY + axisTotalSpace;
            legendBoxX = margin;
            // Legend starts below grid
            legendBoxY = gridY + gridPixelH + axisTotalSpace + layoutGap;
            
            canvasW = Math.max(gridBlockW, legendBoxW) + margin * 2;
            canvasH = legendBoxY + legendBoxH + margin;
            break;
            
        case 'left':
            legendBoxX = margin;
            legendBoxY = contentStartY;
            // Grid starts right of legend box
            gridX = margin + legendBoxW + layoutGap + axisTotalSpace;
            gridY = contentStartY + axisTotalSpace;
            
            canvasW = gridX + gridPixelW + axisTotalSpace + margin;
            canvasH = Math.max(gridBlockH + axisTotalSpace * 2, legendBoxH) + contentStartY + margin;
            break;
            
        case 'right':
            gridX = margin + axisTotalSpace;
            gridY = contentStartY + axisTotalSpace;
            // Legend starts right of grid
            legendBoxX = gridX + gridPixelW + axisTotalSpace + layoutGap;
            legendBoxY = contentStartY;
            
            canvasW = legendBoxX + legendBoxW + margin;
            canvasH = Math.max(gridBlockH + axisTotalSpace * 2, legendBoxH) + contentStartY + margin;
            break;
    }

    // Ensure integer dimensions for clean rendering and display
    canvasW = Math.ceil(canvasW);
    canvasH = Math.ceil(canvasH);

    if (canvasW > 16384 || canvasH > 16384) { 
        setErrorMsg(t('canvasTooLarge', config.language)); 
        return; 
    } else {
        setErrorMsg(null);
    }

    // --- 4. RENDER PASS ---
    canvasRef.current.width = canvasW; 
    canvasRef.current.height = canvasH;
    setCanvasDims({ w: canvasW, h: canvasH });

    // Background
    ctx.fillStyle = '#FFFFFF'; 
    ctx.fillRect(0, 0, canvasW, canvasH);
    
    // Title
    if (config.title) { 
        ctx.fillStyle = '#000000'; 
        ctx.font = `bold ${baseFontSize * 1.5}px ${getFontFamily('text')}`; 
        ctx.textAlign = 'left'; 
        ctx.textBaseline = 'top';
        ctx.fillText(config.title, margin, margin); 
    }

    // Helper: Draw Cross
    const drawCross = (x: number, y: number, s: number) => {
        ctx.fillStyle = '#FFFFFF'; 
        ctx.fillRect(x, y, s, s); 
        ctx.strokeStyle = '#FF0000'; 
        ctx.lineWidth = 1.5; 
        ctx.strokeRect(x, y, s, s);
        ctx.beginPath(); 
        ctx.moveTo(x, y); ctx.lineTo(x+s, y+s); 
        ctx.moveTo(x+s, y); ctx.lineTo(x, y+s); 
        ctx.stroke();
    };

    // --- Draw Legend Box ---
    // 1. Box Border
    ctx.strokeStyle = darkestColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(legendBoxX, legendBoxY, legendBoxW, legendBoxH);

    // Calculate internal start point (accounting for padding)
    const contentX = legendBoxX + boxPadding;
    const contentY = legendBoxY + boxPadding;

    // 2. Header Text
    ctx.fillStyle = '#000000'; 
    ctx.textAlign = 'left'; 
    ctx.textBaseline = 'top'; 
    ctx.font = textFont; 
    
    headerLines.forEach((line, idx) => {
        ctx.fillText(line, contentX, contentY + (idx * headerLineHeight));
    });

    // 3. Items
    const itemsStartY = contentY + headerSectionHeight;

    data.palette.forEach((item, i) => {
        // Calculate Row/Col index
        let colIndex, rowIndex;
        
        if (isHorizontal) {
            colIndex = i % legendCols;
            rowIndex = Math.floor(i / legendCols);
        } else {
            // Vertical Layout: Fill column first
            colIndex = Math.floor(i / legendRows);
            rowIndex = i % legendRows;
        }

        const lx = contentX + (colIndex * legendItemWidth);
        const ly = itemsStartY + (rowIndex * legendItemHeight);
        const centerY = ly + swatchSize / 2;

        // Draw Swatch
        if (bead_source_mode !== 'none' && item.isBeadMissing) {
            drawCross(lx, ly, swatchSize);
        } else if (bead_source_mode !== 'none' && item.matchedBead) {
            // Split swatch for Bead
            ctx.fillStyle = item.hex; 
            ctx.fillRect(lx, ly, swatchSize / 2, swatchSize);
            ctx.fillStyle = item.matchedBead.hex; 
            ctx.fillRect(lx + swatchSize / 2, ly, swatchSize / 2, swatchSize);
            ctx.strokeStyle = '#CCCCCC'; 
            ctx.lineWidth = 1; 
            ctx.strokeRect(lx, ly, swatchSize, swatchSize);
        } else {
            // Normal Swatch
            ctx.fillStyle = item.hex; 
            ctx.fillRect(lx, ly, swatchSize, swatchSize);
            ctx.strokeStyle = '#CCCCCC'; 
            ctx.strokeRect(lx, ly, swatchSize, swatchSize);
        }

        // Swatch Inner Label (ID or Code)
        const swatchLabel = (bead_source_mode !== 'none' && item.matchedBead && !item.isBeadMissing) 
            ? item.matchedBead.refs[0].code 
            : item.id;
        
        const contrastBaseColor = (bead_source_mode !== 'none' && item.matchedBead && !item.isBeadMissing) 
            ? hexToRgba(item.matchedBead.hex) 
            : item.color;

        ctx.fillStyle = item.isBeadMissing ? '#FF0000' : getContrastColor(contrastBaseColor);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const labelLines = formatBeadCode(swatchLabel).split('\n');
        // Dynamic font size for inside swatch
        const swatchFS = Math.max(6, (swatchSize * 0.45) / (labelLines.length > 1 ? 1.2 : 1));
        ctx.font = `${swatchFS}px ${getFontFamily('code')}`;

        labelLines.forEach((line, idx) => {
            const lineY = centerY + (idx - (labelLines.length - 1) / 2) * swatchFS * 1.1;
            ctx.fillText(line, lx + swatchSize / 2, lineY);
        });

        // Legend Text (Extra Info & Count)
        let cursorX = lx + swatchSize + gapSwatchToText;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';

        // 1. Extra Text (Hex/HSB/Refs)
        const startTextX = cursorX;
        
        if (bead_source_mode !== 'none' && item.matchedBead) {
             if (item.isBeadMissing) {
                  // If missing, show ALL codes (Priority in Bold)
                  const prioCode = item.matchedBead.refs[0].code;
                  const others = item.matchedBead.refs.slice(1).map(r => r.code).join(',');

                  ctx.fillStyle = '#666666';
                  ctx.font = fontExtraInfo;
                  
                  // Draw '('
                  ctx.fillText('(', startTextX, centerY);
                  const wParen = ctx.measureText('(').width;
                  
                  // Draw Prio Code (Bold & Darker)
                  ctx.save();
                  ctx.font = fontExtraInfoBold;
                  ctx.fillStyle = '#333333';
                  ctx.fillText(prioCode, startTextX + wParen, centerY);
                  const wBold = ctx.measureText(prioCode).width;
                  ctx.restore();
                  
                  // Draw rest
                  const suffixStr = others ? `, ${others})` : ')';
                  ctx.fillStyle = '#666666';
                  ctx.font = fontExtraInfo;
                  ctx.fillText(suffixStr, startTextX + wParen + wBold, centerY);

             } else {
                  // Normal match: show only alternatives
                  const others = item.matchedBead.refs.slice(1).map(r => r.code).join(',');
                  if (others) {
                      ctx.fillStyle = '#666666';
                      ctx.font = fontExtraInfo;
                      ctx.fillText(`(${others})`, startTextX, centerY);
                  }
             }
        } else if (show_color_value) {
            const text = color_format === 'hex' ? item.hex : `[${getHsbValues(item.color).h}°,${getHsbValues(item.color).s}%,${getHsbValues(item.color).b}%]`;
            ctx.fillStyle = '#666666';
            ctx.font = fontExtraInfo;
            ctx.fillText(text, startTextX, centerY);
        }
        
        // Advance cursor regardless of whether THIS item has text, if ANY item has text.
        if (maxExtraTextW > 0) {
            cursorX += maxExtraTextW + gapTextToCount;
        }

        // 2. Count
        ctx.fillStyle = '#000000'; 
        ctx.font = fontCount; 
        ctx.fillText(item.count.toString(), cursorX, centerY);
    });

    // --- Draw Grid & Pixels ---

    // Pre-calculate labels and optimized font sizes for each palette item
    const labelCache = new Map<string, { lines: string[], fontSize: number }>();
    if (data && data.palette) {
        data.palette.forEach(pItem => {
             // Determine label text based on config
             const label = bead_source_mode === 'none' 
                ? pItem.id 
                : (pItem.matchedBead?.refs[0].code || pItem.id);
             
             const formatted = formatBeadCode(label);
             const lines = formatted.split('\n');
             
             const maxChars = Math.max(...lines.map(l => l.length));
             const fontAspect = 0.6; // Approximate font aspect ratio for pixel fonts
             
             // Start with a standard size ratio
             let fs = scale * 0.5;
             
             // Constraint 1: Width
             if (maxChars > 0) {
                 const wFs = (scale * 0.9) / (maxChars * fontAspect);
                 fs = Math.min(fs, wFs);
             }
             
             // Constraint 2: Height
             if (lines.length > 0) {
                 const hFs = (scale * 0.9) / (lines.length * 1.1); // 1.1 line spacing factor
                 fs = Math.min(fs, hFs);
             }
             
             // Clamping limits
             fs = Math.min(fs, scale * 0.7);
             fs = Math.max(4, fs);
             
             labelCache.set(pItem.id, { lines, fontSize: fs });
        });
    }

    const missingBeadMap = new Set<string>();
    data.palette.forEach(p => {
        if (p.isBeadMissing) missingBeadMap.add(p.id);
    });
    
    // 1. Draw Pixels (Rects Only)
    data.pixels.forEach(row => row.forEach(pixel => {
        if (!pixel) return; 
        const px = gridX + pixel.x * scale; 
        const py = gridY + pixel.y * scale;
        const pItem = data.palette.find(p => p.id === pixel.paletteId);
        
        if (pItem?.isBeadMissing) { 
            drawCross(px, py, scale); 
        } else if (pixel.originalColor.a > 20) {
            const fillColorHex = bead_source_mode === 'none' 
                    ? rgbaToHex(pixel.originalColor) 
                    : (config.show_original_color ? rgbaToHex(pixel.originalColor) : pItem?.matchedBead?.hex || rgbaToHex(pixel.originalColor));
            
            ctx.fillStyle = fillColorHex;
            ctx.fillRect(px, py, scale + 0.5, scale + 0.5); 
        }
    }));

    // 2. Draw Grid Lines (Behind Text)
    if (show_grid) {
        ctx.strokeStyle = grid_color; 
        ctx.lineCap = 'butt';
        
        // Vertical Lines
        for (let x = 0; x <= data.width; x++) { 
            const isMajor = x % majorInterval === 0; 
            ctx.lineWidth = isMajor ? 1.5 : 0.5; 
            ctx.globalAlpha = isMajor ? grid_opacity + 0.2 : grid_opacity; 
            ctx.beginPath(); 
            ctx.moveTo(gridX + x * scale, gridY); 
            ctx.lineTo(gridX + x * scale, gridY + gridPixelH); 
            ctx.stroke(); 
        }
        // Horizontal Lines
        for (let y = 0; y <= data.height; y++) { 
            const isMajor = y % majorInterval === 0; 
            ctx.lineWidth = isMajor ? 1.5 : 0.5; 
            ctx.globalAlpha = isMajor ? grid_opacity + 0.2 : grid_opacity; 
            ctx.beginPath(); 
            ctx.moveTo(gridX, gridY + y * scale); 
            ctx.lineTo(gridX + gridPixelW, gridY + y * scale); 
            ctx.stroke(); 
        }
        ctx.globalAlpha = 1;
    }
    
    // Grid Border
    ctx.strokeStyle = '#000000'; 
    ctx.lineWidth = 2; 
    ctx.strokeRect(gridX, gridY, gridPixelW, gridPixelH);

    // 3. Draw Labels (Region Optimization)
    // Algorithm:
    // 1. Identify continuous regions (BFS).
    // 2. For each region:
    //    a. Calculate Centroid (average X, Y). Ensure it's inside the region.
    //    b. If region is small (< 3x3 approx), just label Centroid.
    //    c. If region is large:
    //       i.  Find all boundary pixels (pixels with missing neighbors).
    //       ii. Clean Edge Optimization: Check if a boundary pixel is continuous with its neighbors on the same edge (e.g. top with top). If so, skip it. Keep corners and ends.
    //       iv. Combine Centroid + Optimized Boundaries.
    
    const visited = Array.from({length: data.height}, () => new Uint8Array(data.width)); // 0: unvisited, 1: visited
    const labelsToRender: {x: number, y: number, paletteId: string, hex: string}[] = [];

    for (let y = 0; y < data.height; y++) {
        for (let x = 0; x < data.width; x++) {
            if (visited[y][x]) continue;

            const pixel = data.pixels[y][x];
            if (!pixel || pixel.originalColor.a <= 20) {
                visited[y][x] = 1;
                continue;
            }

            if (missingBeadMap.has(pixel.paletteId)) {
                visited[y][x] = 1;
                continue;
            }

            // --- Step 1: Region Extraction (BFS) ---
            const queue = [{x, y}];
            visited[y][x] = 1;
            const currentId = pixel.paletteId;
            const regionPixels: {x: number, y: number}[] = [{x, y}];
            // Use Set for fast lookup during boundary check
            const pixelSet = new Set<string>();
            pixelSet.add(`${x},${y}`);

            let minX = x, maxX = x, minY = y, maxY = y;
            let head = 0;

            while(head < queue.length) {
                const p = queue[head++];
                
                if (p.x < minX) minX = p.x;
                if (p.x > maxX) maxX = p.x;
                if (p.y < minY) minY = p.y;
                if (p.y > maxY) maxY = p.y;

                const neighbors = [
                    {x: p.x+1, y: p.y}, {x: p.x-1, y: p.y}, 
                    {x: p.x, y: p.y+1}, {x: p.x, y: p.y-1}
                ];

                for (const n of neighbors) {
                    if (n.x >= 0 && n.x < data.width && n.y >= 0 && n.y < data.height) {
                         if (visited[n.y][n.x] === 0) {
                             const np = data.pixels[n.y][n.x];
                             if (np && np.paletteId === currentId && np.originalColor.a > 20) {
                                 visited[n.y][n.x] = 1;
                                 queue.push(n);
                                 regionPixels.push(n);
                                 pixelSet.add(`${n.x},${n.y}`);
                             }
                         }
                    }
                }
            }

            const regionCandidates = new Set<string>(); // "x,y"

            // --- Step 2: Centroid ---
            let sumX = 0, sumY = 0;
            regionPixels.forEach(p => { sumX += p.x; sumY += p.y; });
            const cX = Math.round(sumX / regionPixels.length);
            const cY = Math.round(sumY / regionPixels.length);
            
            // Ensure centroid is actually in the region (handle U-shapes)
            let finalCentroid = {x: cX, y: cY};
            if (!pixelSet.has(`${cX},${cY}`)) {
                let minDist = Infinity;
                let bestP = regionPixels[0];
                for(const p of regionPixels) {
                    const d = Math.pow(p.x - cX, 2) + Math.pow(p.y - cY, 2);
                    if (d < minDist) { minDist = d; bestP = p; }
                }
                finalCentroid = bestP;
            }
            regionCandidates.add(`${finalCentroid.x},${finalCentroid.y}`);

            // --- Step 3: Boundary Labeling (Large Regions) ---
            const w = maxX - minX + 1;
            const h = maxY - minY + 1;
            // Define "Large" as >= 3x3 bounding box area (heuristic per user request)
            if (w >= 3 || h >= 3) {
                const boundaryPixels: {x: number, y: number}[] = [];
                // Only consider pixels with < 4 neighbors as candidates for edges
                for (const p of regionPixels) {
                    let neighbors = 0;
                    if (pixelSet.has(`${p.x},${p.y-1}`)) neighbors++;
                    if (pixelSet.has(`${p.x},${p.y+1}`)) neighbors++;
                    if (pixelSet.has(`${p.x-1},${p.y}`)) neighbors++;
                    if (pixelSet.has(`${p.x+1},${p.y}`)) neighbors++;
                    if (neighbors < 4) boundaryPixels.push(p);
                }

                for (const p of boundaryPixels) {
                    const {x, y} = p;
                    const has = (tx: number, ty: number) => pixelSet.has(`${tx},${ty}`);
                    
                    // Top Edge Check
                    // Criteria: 1. Is on Top Edge (no neighbor above) 
                    // 2. Is NOT a continuation of a Top Edge (i.e. Left neighbor is Top OR Right neighbor is Top)
                    // If Left is Top AND Right is Top, then I am a middle point -> SKIP.
                    if (!has(x, y-1)) {
                         const leftIsTop = has(x-1, y) && !has(x-1, y-1);
                         const rightIsTop = has(x+1, y) && !has(x+1, y-1);
                         if (!leftIsTop || !rightIsTop) regionCandidates.add(`${x},${y}`);
                    }

                    // Bottom Edge Check
                    if (!has(x, y+1)) {
                         const leftIsBottom = has(x-1, y) && !has(x-1, y+1);
                         const rightIsBottom = has(x+1, y) && !has(x+1, y+1);
                         if (!leftIsBottom || !rightIsBottom) regionCandidates.add(`${x},${y}`);
                    }

                    // Left Edge Check
                    if (!has(x-1, y)) {
                         const topIsLeft = has(x, y-1) && !has(x-1, y-1);
                         const bottomIsLeft = has(x, y+1) && !has(x-1, y+1);
                         if (!topIsLeft || !bottomIsLeft) regionCandidates.add(`${x},${y}`);
                    }

                    // Right Edge Check
                    if (!has(x+1, y)) {
                         const topIsRight = has(x, y-1) && !has(x+1, y-1);
                         const bottomIsRight = has(x, y+1) && !has(x+1, y+1);
                         if (!topIsRight || !bottomIsRight) regionCandidates.add(`${x},${y}`);
                    }
                }
            }

            // --- Step 4: Add Final Candidates ---
            const pItem = data.palette.find(p => p.id === currentId);
            if (pItem) {
                regionCandidates.forEach(coordStr => {
                    const [cx, cy] = coordStr.split(',').map(Number);
                    // Double check valid (should be valid by logic, but safe guard)
                    if (cx >= 0 && cy >= 0) {
                        const usedHex = bead_source_mode === 'none' 
                            ? rgbaToHex(data.pixels[cy][cx].originalColor) 
                            : (config.show_original_color ? rgbaToHex(data.pixels[cy][cx].originalColor) : pItem?.matchedBead?.hex || rgbaToHex(data.pixels[cy][cx].originalColor));
                        
                        labelsToRender.push({x: cx, y: cy, paletteId: currentId, hex: usedHex});
                    }
                });
            }
        }
    }

    // Render the labels
    labelsToRender.forEach(lbl => {
        const px = gridX + lbl.x * scale;
        const py = gridY + lbl.y * scale;
        const cache = labelCache.get(lbl.paletteId);
        
        if (cache) {
             ctx.fillStyle = getContrastColor(hexToRgba(lbl.hex));
             const { lines, fontSize } = cache;
             ctx.font = `${fontSize}px ${getFontFamily('code')}`; 
             ctx.textAlign = 'center'; 
             ctx.textBaseline = 'middle';
             
             const lineHeight = fontSize * 1.1;
             const totalH = lineHeight * lines.length;
             const blockTop = py + (scale - totalH) / 2;
             
             lines.forEach((line, i) => {
                 const ly = blockTop + (i * lineHeight) + (lineHeight / 2);
                 ctx.fillText(line, px + scale / 2, ly);
             });
        }
    });

    // Draw Coordinates
    if (show_coordinates) {
       ctx.textAlign = 'center';
       ctx.textBaseline = 'middle';
       const coordFontSize = Math.max(8, Math.min(scale * 0.45, 16));
       
       const drawCoordCell = (cx: number, cy: number, val: number) => {
           const isMajor = val % majorInterval === 0;
           // Bg for major
           if (isMajor) {
               ctx.fillStyle = '#00000014'; 
               ctx.fillRect(cx, cy, scale, scale);
           }
           // Border
           ctx.strokeStyle = grid_color;
           ctx.lineWidth = 0.5;
           ctx.globalAlpha = 0.3;
           ctx.strokeRect(cx, cy, scale, scale);
           
           ctx.globalAlpha = 1.0;
           ctx.fillStyle = '#000000'; 
           const currentFontSize = isMajor ? coordFontSize * 1.1 : coordFontSize;
           ctx.font = `${isMajor ? 'bold' : 'normal'} ${currentFontSize}px ${getFontFamily('code')}`;
           ctx.fillText(val.toString(), cx + scale/2, cy + scale/2);
       };

       // Top/Bottom Axis
       for(let x=0; x<data.width; x++) {
          const val = x + 1;
          const px = gridX + (x * scale);
          drawCoordCell(px, gridY - axisTotalSpace + axisGap, val);
          drawCoordCell(px, gridY + gridPixelH + axisGap, val);
       }
       // Left/Right Axis
       for(let y=0; y<data.height; y++) {
          const val = y + 1;
          const py = gridY + (y * scale);
          drawCoordCell(gridX - axisTotalSpace + axisGap, py, val);
          drawCoordCell(gridX + gridPixelW + axisGap, py, val);
       }
    }

    onCanvasReady(canvasRef.current);
  };

  const currentScale = zoomMode === 'fit' ? fitScale : customScale;
  return (
    <div className="relative flex-1 w-full h-full bg-gray-100 dark:bg-gray-800 flex flex-col overflow-hidden">
        
       {/* Top Toolbar: Reset, Dimensions, Zoom */}
       <div className="absolute top-6 left-0 right-0 z-40 flex justify-center pointer-events-none">
          <div className="bg-white/90 dark:bg-gray-900/90 border border-gray-200 dark:border-gray-700 shadow-md backdrop-blur-sm rounded-none px-4 py-2 flex items-center gap-4 pointer-events-auto transition-all">
              {/* Reset */}
              <button 
                  onClick={onReset} 
                  className="text-gray-500 hover:text-red-500 transition-colors flex items-center gap-1"
                  title={t('reset', config.language)}
              >
                  <ReloadIcon width={16} height={16} />
              </button>

              {!errorMsg && (
                  <>
                      {/* Divider */}
                      <div className="w-px h-4 bg-gray-300 dark:bg-gray-600" />

                      {/* Dimensions */}
                      <div className="flex items-center gap-2 text-xs font-bold font-mono text-gray-600 dark:text-gray-300 select-none">
                          {(canvasDims.w > 1242 || canvasDims.h > 1242) && (
                              <PrintableSizeIcon width={14} height={14} className="text-primary-500" />
                          )}
                          <span>{canvasDims.w} x {canvasDims.h} px</span>
                      </div>

                      {/* Divider */}
                      <div className="w-px h-4 bg-gray-300 dark:bg-gray-600" />

                      {/* Zoom */}
                      <div className="flex items-center gap-1">
                          <button onClick={() => { setCustomScale(Math.max(0.1, (zoomMode === 'fit' ? fitScale : customScale) - 0.1)); setZoomMode('custom'); }} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-none text-gray-500 dark:text-gray-400">
                              <MinusIcon width={14} height={14} />
                          </button>
                          <button onClick={() => zoomMode === 'fit' ? (setZoomMode('custom'), setCustomScale(1.0)) : setZoomMode('fit')} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-none text-[10px] font-mono font-bold text-primary-600 dark:text-primary-400 min-w-[3rem] border border-gray-200 dark:border-gray-700">
                              {zoomMode === 'fit' ? t('fit', config.language) : Math.round(currentScale * 100) + '%'}
                          </button>
                          <button onClick={() => { setCustomScale((zoomMode === 'fit' ? fitScale : customScale) + 0.1); setZoomMode('custom'); }} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-none text-gray-500 dark:text-gray-400">
                              <PlusIcon width={14} height={14} />
                          </button>
                      </div>
                  </>
              )}
          </div>
       </div>

       <div ref={containerRef} className={`flex-1 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] overflow-auto flex ${zoomMode !== 'fit' && !errorMsg ? 'cursor-grab active:cursor-grabbing' : ''}`} onMouseDown={(e) => { if (zoomMode === 'fit') return; const s = { x: e.clientX, y: e.clientY, l: containerRef.current!.scrollLeft, t: containerRef.current!.scrollTop }; const mv = (ev: MouseEvent) => { containerRef.current!.scrollLeft = s.l - (ev.clientX - s.x); containerRef.current!.scrollTop = s.t - (ev.clientY - s.y); }; const up = () => { window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', up); }; window.addEventListener('mousemove', mv); window.addEventListener('mouseup', up); }}>
          {errorMsg ? <div className="m-auto p-8 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex flex-col items-center gap-2"><ToastWarningIcon width={32} height={32} className="text-red-500" /><p className="text-sm text-red-600 dark:text-red-400">{errorMsg}</p></div> : <div className="shadow-2xl bg-white m-auto" style={{ width: canvasDims.w * currentScale, height: canvasDims.h * currentScale, minWidth: canvasDims.w * currentScale, minHeight: canvasDims.h * currentScale }}><canvas ref={canvasRef} className="block w-full h-full" /></div>}
       </div>
    </div>
  );
};

export default CanvasRenderer;
