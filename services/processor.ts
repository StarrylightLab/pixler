import { AppConfig, ProcessedImage, ColorRGBA, PaletteItem, ProcessedPixel, BeadPaletteItem } from '../types';
import { colorDistance, rgbaToHex, getBrightness, rgbToHsl, hexToRgba } from '../utils/colorUtils';
import { parseBeadYaml, processPaletteToInternal, applyBeadPatches, rgbToLab, deltaE2000, deltaE76, rgbDistance, mapSliderToDeltaE } from '../utils/beadUtils';

const SIZE_THRESHOLD = 256;

const getPixel = (imgData: ImageData, x: number, y: number): ColorRGBA => {
  const i = (y * imgData.width + x) * 4;
  return {
    r: imgData.data[i],
    g: imgData.data[i + 1],
    b: imgData.data[i + 2],
    a: imgData.data[i + 3],
  };
};

const isSimilar = (c1: ColorRGBA, c2: ColorRGBA, tolerance: number): boolean => {
  if (Math.abs(c1.a - c2.a) > tolerance) return false;
  if (c1.a < 10 && c2.a < 10) return true;
  return colorDistance(c1, c2) <= tolerance; 
};

const getPaletteId = (index: number): string => {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (index < 26) return letters[index];
  const firstIdx = Math.floor(index / 26) - 1;
  const secondIdx = index % 26;
  if (firstIdx < 26) return letters[firstIdx] + letters[secondIdx];
  return '#' + (index + 1);
};

const isBackground = (c: ColorRGBA, config: AppConfig): boolean => {
     if (config.auto_crop === 'auto-transparent' || config.auto_crop === 'none') return c.a < 10;
     if (config.auto_crop === 'auto-white') return c.r > 255 - config.background_tolerance && c.g > 255 - config.background_tolerance && c.b > 255 - config.background_tolerance && c.a > 200;
     if (config.auto_crop === 'auto-black') return c.r < config.background_tolerance && c.g < config.background_tolerance && c.b < config.background_tolerance && c.a > 200;
     if (config.auto_crop === 'auto-custom') {
         const target = hexToRgba(config.custom_crop_color);
         return colorDistance(c, target) <= config.background_tolerance;
     }
     return false;
};

// --- New Scale Detection Logic ---

// Helper: Approx LAB L-channel (0-100)
const getLuminance = (r: number, g: number, b: number) => {
  let y = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 255;
  y = y > 0.008856 ? Math.pow(y, 1/3) : (7.787 * y) + (16/116);
  return 116 * y - 16;
};

// Helper: 5-point Cross Median smoothing to suppress noise
const getSmoothedL = (data: Float32Array, w: number, x: number, y: number) => {
    const c = data[y * w + x];
    const u = data[(y - 1) * w + x];
    const d = data[(y + 1) * w + x];
    const l = data[y * w + x - 1];
    const r = data[y * w + x + 1];
    
    // Simple sort to find median
    const vals = [c, u, d, l, r];
    vals.sort((a,b) => a-b);
    return vals[2];
};

const analyzeRegion = (imgData: ImageData, startX: number, startY: number, rw: number, rh: number, isStrict: boolean, minPeriod: number): number => {
    // 1. Extract L channel for the region
    const lData = new Float32Array(rw * rh);
    const fullW = imgData.width;
    
    for(let y=0; y<rh; y++) {
        for(let x=0; x<rw; x++) {
             const idx = ((startY + y) * fullW + (startX + x)) * 4;
             lData[y*rw + x] = getLuminance(imgData.data[idx], imgData.data[idx+1], imgData.data[idx+2]);
        }
    }

    // 2. Compute Gradients and Run Lengths
    const runs = new Map<number, number>();
    // Threshold: User suggestion dE < 6 (small) / < 8 (large).
    // Using 5.0 for Strict (PNG) and 10.0 for Relaxed (JPG/Noise) to be robust.
    const threshold = isStrict ? 5.0 : 10.0;

    const addRun = (len: number) => {
        // Enforce minPeriod constraints
        // Cap at 128 to avoid structural layout elements being detected as pixels
        if (len >= minPeriod && len <= 128) { 
             runs.set(len, (runs.get(len) || 0) + 1);
        }
    }

    // Scan Rows
    for(let y=1; y<rh-1; y++) {
        let run = 1;
        let prev = getSmoothedL(lData, rw, 1, y);
        for(let x=2; x<rw-1; x++) {
            const curr = getSmoothedL(lData, rw, x, y);
            if (Math.abs(curr - prev) > threshold) {
                addRun(run);
                run = 1;
                prev = curr;
            } else {
                run++;
            }
        }
        addRun(run);
    }

    // Scan Cols
    for(let x=1; x<rw-1; x++) {
        let run = 1;
        let prev = getSmoothedL(lData, rw, x, 1);
        for(let y=2; y<rh-1; y++) {
            const curr = getSmoothedL(lData, rw, x, y);
            if (Math.abs(curr - prev) > threshold) {
                addRun(run);
                run = 1;
                prev = curr;
            } else {
                run++;
            }
        }
        addRun(run);
    }

    // 3. Post-process: Merge neighbors (|p1 - p2| <= 1)
    const sortedLens = Array.from(runs.keys()).sort((a,b) => a - b);
    if (sortedLens.length === 0) return 1;

    const mergedRuns = new Map<number, number>();
    sortedLens.forEach(l => mergedRuns.set(l, runs.get(l)!));

    for (let i = 0; i < sortedLens.length - 1; i++) {
        const a = sortedLens[i];
        const b = sortedLens[i+1];
        if (mergedRuns.has(a) && mergedRuns.has(b) && (b - a <= 1)) {
            const cA = mergedRuns.get(a)!;
            const cB = mergedRuns.get(b)!;
            if (cA >= cB) {
                mergedRuns.set(a, cA + cB);
                mergedRuns.delete(b);
            } else {
                mergedRuns.set(b, cA + cB);
                mergedRuns.delete(a);
            }
        }
    }

    // 4. Find Peak (Mode)
    let bestScale = 1;
    let maxCount = 0;
    
    mergedRuns.forEach((count, scale) => {
        if (count > maxCount) {
             maxCount = count;
             bestScale = scale;
        }
    });

    return bestScale;
};

const detectPixelScale = (imgData: ImageData, isStrict: boolean): number => {
  const w = imgData.width;
  const h = imgData.height;
  
  if (Math.max(w, h) <= SIZE_THRESHOLD) {
      // Small Image: Allow 1x scale (minPeriod = 1)
      return analyzeRegion(imgData, 0, 0, w, h, isStrict, 1);
  }

  // Large Image Strategy
  // Use fixed minPeriod = 2 to allow small scales (2x, 3x) even on large images
  // while filtering out 1px noise. Reverted dynamic calculation.
  const minPeriod = 2;

  // 2. Sample 8 regions of 384px
  const sampleSize = 384;
  const safeW = Math.max(0, w - sampleSize);
  const safeH = Math.max(0, h - sampleSize);
  
  // Define 8 sampling regions: Top-Left, Top-Right, Bottom-Left, Bottom-Right, Center, Top-Center, Bottom-Center, Left-Center
  const regions = [
      { x: 0, y: 0 }, // TL
      { x: safeW, y: 0 }, // TR
      { x: 0, y: safeH }, // BL
      { x: safeW, y: safeH }, // BR
      { x: safeW >> 1, y: safeH >> 1 }, // Center
      { x: safeW >> 1, y: 0 }, // TC
      { x: safeW >> 1, y: safeH }, // BC
      { x: 0, y: safeH >> 1 } // LC
  ];

  const votes = new Map<number, number>();
  
  for (const r of regions) {
      const rw = Math.min(sampleSize, w - r.x);
      const rh = Math.min(sampleSize, h - r.y);
      
      const scale = analyzeRegion(imgData, r.x, r.y, rw, rh, isStrict, minPeriod);
      if (scale > 1) {
          votes.set(scale, (votes.get(scale) || 0) + 1);
      }
  }

  // 3. Filter: Same multiple must exist in >= 5 sampling blocks to be considered stable
  for (const [scale, count] of votes) {
      if (count < 5) votes.delete(scale);
  }

  if (votes.size === 0) {
      // Fallback: Non-pixel art (Large Image) or no stable period found in > 5 blocks
      const targetGridCount = 32;
      const fallback = Math.round(Math.max(w, h) / targetGridCount);
      return Math.max(16, Math.min(64, fallback));
  }

  // 4. Determine Best Scale
  let dominantScale = 1;
  let maxVotes = 0;
  
  votes.forEach((count, scale) => {
      if (count > maxVotes) {
          maxVotes = count;
          dominantScale = scale;
      }
  });

  // Check if any larger stable candidate is a multiple of the dominant scale
  // With threshold >= 5 out of 8, dominantScale is likely unique, but logic retained for robustness
  let finalScale = dominantScale;
  for (const candidate of votes.keys()) {
      if (candidate > finalScale && candidate % finalScale === 0) {
          finalScale = candidate;
      }
  }

  return finalScale;
};

// --- Bead Palette Loading Logic ---
const loadBeadScope = async (
  config: AppConfig,
  cachedBeads?: {
    system?: Record<string, BeadPaletteItem>;
    user?: Record<string, BeadPaletteItem>;
    patches?: Record<string, Record<string, string>>;
  }
): Promise<Record<string, BeadPaletteItem>> => {
  let systemPal: Record<string, BeadPaletteItem> = {};
  
  // 1. Load System Palette
  if (cachedBeads?.system && Object.keys(cachedBeads.system).length > 0) {
    systemPal = cachedBeads.system;
  } else {
    try {
        const resp = await fetch('assets/bead_colors.default.yaml');
        if (resp.ok) {
            let text = await resp.text();
            text = text.replace(/^\uFEFF/, '');
            const parsed = parseBeadYaml(text);
            if (parsed) systemPal = processPaletteToInternal(parsed);
        }
    } catch (e) {
        console.warn("[Processor] Failed to load system beads", e);
    }
  }

  // 2. Apply User Patches to System Palette (if any)
  let patches = cachedBeads?.patches;
  if (!patches && config.user_yaml_content) {
      const parsed = parseBeadYaml(config.user_yaml_content);
      if (parsed) patches = parsed.patch_brands;
  }

  if (patches) {
      console.log(`[Processor] Applying ${Object.keys(patches).length} brand patches to System Palette.`);
      systemPal = applyBeadPatches(systemPal, patches);
  }

  // 3. Select Mode
  if (config.bead_source_mode === 'system') {
      return systemPal;
  }
  
  if (config.bead_source_mode === 'user') {
      // User mode uses ONLY the 'has_brands' inventory
      // We check cache first
      if (cachedBeads?.user && Object.keys(cachedBeads.user).length > 0) {
          return cachedBeads.user;
      }
      // If not in cache (e.g. first load), parse from content
      if (config.user_yaml_content) {
          const parsed = parseBeadYaml(config.user_yaml_content);
          if (parsed) {
              return processPaletteToInternal(parsed);
          }
      }
      return {}; // Empty if no user file
  }

  return {}; // Default fallthrough
};

export const processImage = async (
  file: File, 
  config: AppConfig,
  cachedBeads?: {
    system?: Record<string, BeadPaletteItem>;
    user?: Record<string, BeadPaletteItem>;
    patches?: Record<string, Record<string, string>>;
  }
): Promise<ProcessedImage> => {
  return new Promise(async (resolve, reject) => {
    const img = new Image();
    img.onload = async () => {
      if (img.width > 8192 || img.height > 8192) return reject(new Error("Image is too large"));
      const canvas = document.createElement('canvas');
      canvas.width = img.width; canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject('No context');
      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, img.width, img.height);
      
      try {
        // Determine strict mode based on file type
        const isStrict = file.type === 'image/png' || file.type === 'image/webp';
        
        let blockSize = config.custom_block_size > 0 ? config.custom_block_size : detectPixelScale(imgData, isStrict);
        
        let minX = 0, minY = 0, maxX = img.width, maxY = img.height;
        if (config.auto_crop !== 'none') {
           topLoop: for (let y = 0; y < img.height; y++) for (let x = 0; x < img.width; x++) if (!isBackground(getPixel(imgData, x, y), config)) { minY = y; break topLoop; }
           bottomLoop: for (let y = img.height - 1; y >= 0; y--) for (let x = 0; x < img.width; x++) if (!isBackground(getPixel(imgData, x, y), config)) { maxY = y + 1; break bottomLoop; }
           leftLoop: for (let x = 0; x < img.width; x++) for (let y = minY; y < maxY; y++) if (!isBackground(getPixel(imgData, x, y), config)) { minX = x; break leftLoop; }
           rightLoop: for (let x = img.width - 1; x >= 0; x--) for (let y = minY; y < maxY; y++) if (!isBackground(getPixel(imgData, x, y), config)) { maxX = x + 1; break rightLoop; }
        }
        
        const rawWidth = maxX - minX; const rawHeight = maxY - minY;
        const width = Math.ceil(rawWidth / blockSize); const height = Math.ceil(rawHeight / blockSize);
        const pixelGroups = new Map<string, ProcessedPixel[]>();
        const groupColors = new Map<string, ColorRGBA>();
        const offset = Math.floor(blockSize / 2);

        for(let y = 0; y < height; y++) {
          for(let x = 0; x < width; x++) {
            const physX = minX + (x * blockSize) + offset;
            const physY = minY + (y * blockSize) + offset;
            if (physX >= maxX || physY >= maxY) continue;
            const originalColor = getPixel(imgData, physX, physY);
            if (config.ignore_transparent && originalColor.a < 20) continue;
            let foundGroupKey = '';
            for (const key of groupColors.keys()) if (isSimilar(originalColor, groupColors.get(key)!, config.color_tolerance)) { foundGroupKey = key; break; }
            if (!foundGroupKey) { foundGroupKey = `group_${groupColors.size}`; groupColors.set(foundGroupKey, originalColor); }
            if (!pixelGroups.has(foundGroupKey)) pixelGroups.set(foundGroupKey, []);
            pixelGroups.get(foundGroupKey)!.push({ x, y, paletteId: '', originalColor });
          }
        }
        
        let finalPalette: PaletteItem[] = [];
        for (const [key, color] of groupColors.entries()) {
           const [h, s, l] = rgbToHsl(color.r, color.g, color.b);
           finalPalette.push({ id: '', color, hex: rgbaToHex(color), count: pixelGroups.get(key)!.length, brightness: getBrightness(color), hue: h });
        }
        
        if (config.legend_sort === 'by_count') finalPalette.sort((a, b) => b.count - a.count);
        else if (config.legend_sort === 'by_brightness') finalPalette.sort((a, b) => a.brightness - b.brightness);
        else if (config.legend_sort === 'by_hue') finalPalette.sort((a, b) => a.hue - b.hue);
        
        const finalGrid: ProcessedPixel[][] = Array(height).fill(null).map(() => Array(width).fill(null));

        // --- Bead Matching Logic ---
        const shouldMatch = config.bead_source_mode !== 'none';
        
        let primaryPalette: Record<string, BeadPaletteItem> = {};
        let fallbackPalette: Record<string, BeadPaletteItem> = {};

        if (shouldMatch) {
            // Load Primary Palette based on mode
            primaryPalette = await loadBeadScope(config, cachedBeads);
            
            // If mode is User, we also need System palette for fallbacks
            if (config.bead_source_mode === 'user') {
                // Determine System Palette (applying patches if available)
                let sysRaw = cachedBeads?.system;
                // If not in cache, try to load it manually (edge case)
                if (!sysRaw) {
                    try {
                        const resp = await fetch('assets/bead_colors.default.yaml');
                        if (resp.ok) {
                            const text = (await resp.text()).replace(/^\uFEFF/, '');
                            const parsed = parseBeadYaml(text);
                            if (parsed) sysRaw = processPaletteToInternal(parsed);
                        }
                    } catch(e) {}
                }
                
                fallbackPalette = sysRaw || {};
                
                // Apply User Patches to Fallback Palette so suggestions are correct per user fix
                if (cachedBeads?.patches && Object.keys(fallbackPalette).length > 0) {
                    fallbackPalette = applyBeadPatches(fallbackPalette, cachedBeads.patches);
                }
                console.log(`[Processor] User Mode: Loaded ${Object.keys(primaryPalette).length} user beads and ${Object.keys(fallbackPalette).length} system beads for fallback.`);
            } else {
                console.log(`[Processor] System Mode: Loaded ${Object.keys(primaryPalette).length} beads.`);
            }
        }

        // Configuration for matching
        const algorithm = config.bead_distance_algorithm || 'deltaE2000';
        let threshold = mapSliderToDeltaE(config.bead_accuracy_threshold);
        
        // Scale threshold if using RGB to align with slider expectation
        // DeltaE 20 is "Loose", RGB 100 is "Loose". Factor approx 5x.
        // If slider is maxed (100), we allow max distance.
        if (algorithm === 'rgb') {
             if (config.bead_accuracy_threshold >= 100) {
                 threshold = 450; // Effectively infinite for RGB (Max dist is ~441)
             } else {
                 threshold *= 5; 
             }
        }

        const findBestMatch = (targetRgb: [number, number, number], targetLab: [number, number, number], palette: Record<string, BeadPaletteItem>) => {
            let minDist = Infinity;
            let bestBead: BeadPaletteItem | undefined;
            for (const bead of Object.values(palette) as BeadPaletteItem[]) {
                let d = 0;
                if (algorithm === 'rgb') {
                    d = rgbDistance(targetRgb, bead.rgb);
                } else if (algorithm === 'deltaE76') {
                    d = deltaE76(targetLab, bead.lab);
                } else {
                    d = deltaE2000(targetLab, bead.lab);
                }
                
                if (d < minDist) {
                    minDist = d;
                    bestBead = bead;
                }
            }
            return { bead: bestBead, dist: minDist };
        };

        // 2. Perform matching
        finalPalette.forEach((item, index) => {
           item.id = getPaletteId(index);
           
           if (shouldMatch && Object.keys(primaryPalette).length > 0) {
              const itemLab = rgbToLab(item.color.r, item.color.g, item.color.b);
              const itemRgb: [number, number, number] = [item.color.r, item.color.g, item.color.b];
              
              // 1. Try Primary Match
              const { bead: bestPrimary, dist: primaryDist } = findBestMatch(itemRgb, itemLab, primaryPalette);
              
              let selectedBead = bestPrimary;
              let finalDist = primaryDist;
              let isMissing = false;

              // 2. Check Logic based on Mode
              if (config.bead_source_mode === 'user') {
                  // If matching against Inventory:
                  // If match is bad (> threshold) OR no match found
                  if (!bestPrimary || primaryDist > threshold) {
                      // Fallback to System Palette
                      const { bead: bestFallback, dist: fallbackDist } = findBestMatch(itemRgb, itemLab, fallbackPalette);
                      if (bestFallback) {
                          selectedBead = bestFallback;
                          finalDist = fallbackDist; // Use fallback distance
                          isMissing = true; // Mark as missing from inventory
                      } else {
                          // No system match either (unlikely)
                          isMissing = true; 
                      }
                  }
              } else {
                  // System Mode: Simple threshold
                  if (primaryDist > threshold) {
                      isMissing = true;
                  }
              }
              
              if (selectedBead) {
                // Clone best bead and sort refs by user priority
                const matched = JSON.parse(JSON.stringify(selectedBead));
                matched.refs.sort((a: any, b: any) => {
                   const pA = config.bead_priority_brands.indexOf(a.brand);
                   const pB = config.bead_priority_brands.indexOf(b.brand);
                   if (pA !== -1 && pB === -1) return -1;
                   if (pA === -1 && pB !== -1) return 1;
                   if (pA !== -1 && pB !== -1) return pA - pB;
                   return 0;
                });

                item.matchedBead = matched;
                item.beadDeltaE = finalDist;
                item.isBeadMissing = isMissing;
              }
           }

           for (const [key, color] of groupColors.entries()) {
             if (color.r === item.color.r && color.g === item.color.g && color.b === item.color.b && color.a === item.color.a) {
                pixelGroups.get(key)!.forEach(p => {
                  p.paletteId = item.id;
                  if (finalGrid[p.y]) finalGrid[p.y][p.x] = p;
                });
             }
           }
        });

        let beadAnalysis;
        // Generate analysis if matching was attempted
        if (shouldMatch) {
          const totalInDrawing = finalPalette.length;
          const missingCount = finalPalette.filter(p => p.isBeadMissing).length;
          
          // For missing refs, if we found a fallback bead, list IT. If no bead found at all, we can't list a code.
          const missingRefs = finalPalette
             .filter(p => p.isBeadMissing && p.matchedBead)
             .map(p => `${p.matchedBead!.refs[0].brand}:${p.matchedBead!.refs[0].code}`);

          beadAnalysis = {
            accuracy: Math.round(((totalInDrawing - missingCount) / totalInDrawing) * 100),
            missingCount,
            missingRefs: Array.from(new Set(missingRefs)),
            totalBeadsInScope: Object.keys(primaryPalette).length
          };
          console.log(`[Processor] Bead Analysis Complete. Accuracy: ${beadAnalysis.accuracy}%, Missing: ${missingCount}`);
        }
        
        resolve({ width, height, pixels: finalGrid, palette: finalPalette, originalWidth: img.width, originalHeight: img.height, blockSize, beadAnalysis });
      } catch (e) { reject(e); }
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
};