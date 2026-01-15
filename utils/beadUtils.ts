
import { ColorRGBA, BeadPaletteItem, BeadRef } from '../types';
// @ts-ignore
import { load } from 'js-yaml';

// --- Color Space Conversion (CIE Lab) ---

export const rgbToLab = (r: number, g: number, b: number): [number, number, number] => {
  let rL = r / 255, gL = g / 255, bL = b / 255;
  rL = rL > 0.04045 ? Math.pow((rL + 0.055) / 1.055, 2.4) : rL / 12.92;
  gL = gL > 0.04045 ? Math.pow((gL + 0.055) / 1.055, 2.4) : gL / 12.92;
  bL = bL > 0.04045 ? Math.pow((bL + 0.055) / 1.055, 2.4) : bL / 12.92;

  let x = (rL * 0.4124 + gL * 0.3576 + bL * 0.1805) * 100;
  let y = (rL * 0.2126 + gL * 0.7152 + bL * 0.0722) * 100;
  let z = (rL * 0.0193 + gL * 0.1192 + bL * 0.9505) * 100;

  x /= 95.047; y /= 100.000; z /= 108.883;

  x = x > 0.008856 ? Math.pow(x, 1/3) : (7.787 * x) + (16/116);
  y = y > 0.008856 ? Math.pow(y, 1/3) : (7.787 * y) + (16/116);
  z = z > 0.008856 ? Math.pow(z, 1/3) : (7.787 * z) + (16/116);

  return [(116 * y) - 16, 500 * (x - y), 200 * (y - z)];
};

export const rgbDistance = (rgb1: [number, number, number], rgb2: [number, number, number]): number => {
  return Math.sqrt(
    Math.pow(rgb1[0] - rgb2[0], 2) +
    Math.pow(rgb1[1] - rgb2[1], 2) +
    Math.pow(rgb1[2] - rgb2[2], 2)
  );
};

// Legacy Euclidean DeltaE (CIE76) - kept for fallback or lightweight needs
export const deltaE76 = (lab1: [number, number, number], lab2: [number, number, number]): number => {
  return Math.sqrt(Math.pow(lab1[0]-lab2[0], 2) + Math.pow(lab1[1]-lab2[1], 2) + Math.pow(lab1[2]-lab2[2], 2));
};

/**
 * CIE Delta E 2000 Calculation
 * Standard implementation for perceptually uniform color difference.
 */
export const deltaE2000 = (lab1: [number, number, number], lab2: [number, number, number]): number => {
  const [L1, a1, b1] = lab1;
  const [L2, a2, b2] = lab2;

  const avgL = (L1 + L2) / 2;
  const C1 = Math.sqrt(a1 * a1 + b1 * b1);
  const C2 = Math.sqrt(a2 * a2 + b2 * b2);
  const avgC = (C1 + C2) / 2;

  const G = 0.5 * (1 - Math.sqrt(Math.pow(avgC, 7) / (Math.pow(avgC, 7) + Math.pow(25, 7))));
  
  const a1p = a1 * (1 + G);
  const a2p = a2 * (1 + G);

  const C1p = Math.sqrt(a1p * a1p + b1 * b1);
  const C2p = Math.sqrt(a2p * a2p + b2 * b2);

  const h1p = (a1p === 0 && b1 === 0) ? 0 : Math.atan2(b1, a1p) * (180 / Math.PI);
  const h1p_deg = h1p >= 0 ? h1p : h1p + 360;

  const h2p = (a2p === 0 && b2 === 0) ? 0 : Math.atan2(b2, a2p) * (180 / Math.PI);
  const h2p_deg = h2p >= 0 ? h2p : h2p + 360;

  const avgLp = (L1 + L2) / 2;
  const avgCp = (C1p + C2p) / 2;

  let avghp_deg = 0;
  if (C1p * C2p !== 0) {
      if (Math.abs(h1p_deg - h2p_deg) <= 180) {
          avghp_deg = (h1p_deg + h2p_deg) / 2;
      } else {
          avghp_deg = (h1p_deg + h2p_deg + 360) / 2;
      }
  } else {
      avghp_deg = h1p_deg + h2p_deg;
  }

  const T = 1 - 0.17 * Math.cos((avghp_deg - 30) * Math.PI / 180) 
              + 0.24 * Math.cos((2 * avghp_deg) * Math.PI / 180) 
              + 0.32 * Math.cos((3 * avghp_deg + 6) * Math.PI / 180) 
              - 0.20 * Math.cos((4 * avghp_deg - 63) * Math.PI / 180);

  let delzahp = 0;
  if (C1p * C2p !== 0) {
      if (Math.abs(h1p_deg - h2p_deg) <= 180) {
          delzahp = h2p_deg - h1p_deg;
      } else if (h2p_deg <= h1p_deg) {
          delzahp = h2p_deg - h1p_deg + 360;
      } else {
          delzahp = h2p_deg - h1p_deg - 360;
      }
  }

  const deltaLp = L2 - L1;
  const deltaCp = C2p - C1p;
  const deltaHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(delzahp / 2 * Math.PI / 180);

  const SL = 1 + (0.015 * Math.pow(avgLp - 50, 2)) / Math.sqrt(20 + Math.pow(avgLp - 50, 2));
  const SC = 1 + 0.045 * avgCp;
  const SH = 1 + 0.015 * avgCp * T;

  const deltaTheta = 30 * Math.exp(-Math.pow((avghp_deg - 275) / 25, 2));
  const RC = 2 * Math.sqrt(Math.pow(avgCp, 7) / (Math.pow(avgCp, 7) + Math.pow(25, 7)));
  const RT = -Math.sin(2 * deltaTheta * Math.PI / 180) * RC;

  const dE = Math.sqrt(
      Math.pow(deltaLp / (1 * SL), 2) + 
      Math.pow(deltaCp / (1 * SC), 2) + 
      Math.pow(deltaHp / (1 * SH), 2) + 
      RT * (deltaCp / (1 * SC)) * (deltaHp / (1 * SH))
  );

  return dE;
};

// --- Mappers ---

export const mapSliderToDeltaE = (sliderValue: number): number => {
    if (sliderValue <= 0) return 1.0;
    if (sliderValue >= 100) return 100.0;
    return 1 + Math.pow(sliderValue / 100, 2) * 19;
};

export const getDeltaELabel = (sliderValue: number): string => {
    const val = mapSliderToDeltaE(sliderValue);
    if (sliderValue >= 100) return "∞";
    return `ΔE ${val.toFixed(1)}`;
};

// --- YAML Parsing (Using js-yaml library) ---

export interface YamlParsed {
  meta?: { name: string; updated_at: string; description?: string };
  brands: Record<string, Record<string, string>>; // Used for inventory/has_brands
  patch_brands?: Record<string, Record<string, string>>; // Used for fixes
}

export const parseBeadYamlDetailed = (yaml: string): { parsed: YamlParsed | null; error: string | null } => {
  try {
    // Note: js-yaml load throws on syntax errors, including duplicate keys.
    const parsed = load(yaml) as any;

    if (!parsed || typeof parsed !== 'object') {
        return { parsed: null, error: "Result is not an object or valid YAML." };
    }

    // --- Validation Logic ---
    
    // 1. Check Meta (Relaxed)
    if (!parsed.meta) {
         // Create default meta if missing
         parsed.meta = { name: "Untitled Palette", updated_at: new Date().toISOString() };
    }
    
    // Ensure basic meta fields exist
    if (!parsed.meta.name) parsed.meta.name = "Untitled Palette";
    if (!parsed.meta.updated_at) parsed.meta.updated_at = new Date().toISOString();
    
    // Ensure updated_at is a string
    if (parsed.meta.updated_at instanceof Date) {
        parsed.meta.updated_at = parsed.meta.updated_at.toISOString();
    }

    // 2. Check Root Structure (Supports 'has_brands' for user files, 'brands' for system)
    let brandsData = parsed.has_brands || parsed.brands;

    if (!brandsData) {
        brandsData = {};
    }

    return {
      parsed: {
        meta: parsed.meta,
        brands: brandsData, 
        patch_brands: parsed.patch_brands 
      },
      error: null
    };

  } catch (e: any) {
    console.error("YAML Parse Error (Library):", e);
    // Return the library error message (e.g. "duplicated mapping key")
    return { parsed: null, error: e.message || "Unknown YAML Error" };
  }
};

export const parseBeadYaml = (yaml: string): YamlParsed | null => {
    return parseBeadYamlDetailed(yaml).parsed;
};

// --- YAML Generation ---
export const generateBeadYaml = (data: {
    meta: { name: string; updated_at: string };
    brands: Array<{ name: string; colors: Array<{ code: string; hex: string }> }>;
    patch_brands?: Record<string, Record<string, string>>;
}): string => {
    const { meta, brands, patch_brands } = data;
    
    // Manual construction to ensure consistent key ordering and simple format
    let yaml = `meta:\n`;
    yaml += `  name: "${meta.name.replace(/"/g, '\\"')}"\n`;
    yaml += `  updated_at: "${meta.updated_at}"\n`;
    
    yaml += `has_brands:\n`;
    
    if (brands.length === 0) {
        // Output empty object notation if no brands
        yaml += `  {}\n`;
    } else {
        brands.forEach(brand => {
            if (!brand.name) return;
            // Quote the brand name key for better compatibility with special characters/numbers
            yaml += `  "${brand.name.replace(/"/g, '\\"')}":\n`;
            // Sort colors inside the generator as a safety measure
            const sortedColors = [...brand.colors].sort((a, b) => compareCodes(a.code, b.code));
            sortedColors.forEach(color => {
                yaml += `    "${color.code}": "${color.hex}"\n`;
            });
        });
    }

    if (patch_brands && Object.keys(patch_brands).length > 0) {
        yaml += `\npatch_brands:\n`;
        for (const [brand, colors] of Object.entries(patch_brands)) {
             yaml += `  "${brand.replace(/"/g, '\\"')}":\n`;
             // Sort codes inside patch brands too
             const sortedCodes = Object.keys(colors).sort(compareCodes);
             for (const code of sortedCodes) {
                 yaml += `    "${code}": "${colors[code]}"\n`;
             }
        }
    }
    
    return yaml;
};

// --- Palette Management ---

export const hexToRgbArr = (hex: string): [number, number, number] => {
  let c = hex.substring(1);
  if (c.length === 3) c = c.split('').map(char => char + char).join('');
  return [parseInt(c.substring(0, 2), 16), parseInt(c.substring(2, 4), 16), parseInt(c.substring(4, 6), 16)];
};

const normalizeHex = (input: string): string | null => {
    let hex = String(input);
    if (hex.toLowerCase().startsWith('rgb')) {
      const match = hex.match(/\d+/g);
      if (match) {
        const [r, g, b] = match.map(Number);
        hex = '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase();
      }
    }
    hex = hex.toUpperCase();
    if (!hex.match(/^#([0-9A-F]{3}|[0-9A-F]{6})$/)) return null;
    if (!hex.startsWith('#')) hex = '#' + hex;
    if (hex.length === 4) {
      hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
    }
    return hex;
};

export const processPaletteToInternal = (parsed: YamlParsed | { brands: Record<string, Record<string, string>> }): Record<string, BeadPaletteItem> => {
  const internal: Record<string, BeadPaletteItem> = {};
  
  if (!parsed || !parsed.brands) return internal;

  for (const [brand, colors] of Object.entries(parsed.brands)) {
    if (!colors || typeof colors !== 'object') continue;

    for (const [code, value] of Object.entries(colors)) {
      if (!value) continue;
      
      const hex = normalizeHex(String(value));
      if (!hex) continue;

      if (!internal[hex]) {
        const rgb = hexToRgbArr(hex);
        internal[hex] = {
          hex,
          rgb,
          lab: rgbToLab(rgb[0], rgb[1], rgb[2]),
          refs: []
        };
      }
      internal[hex].refs.push({ brand, code });
    }
  }
  return internal;
};

export const applyBeadPatches = (
    basePalette: Record<string, BeadPaletteItem>, 
    patches: Record<string, Record<string, string>>
): Record<string, BeadPaletteItem> => {
    const patched = JSON.parse(JSON.stringify(basePalette));

    for (const [brand, codes] of Object.entries(patches)) {
        for (const [code, newHexRaw] of Object.entries(codes)) {
            const newHex = normalizeHex(newHexRaw);
            if (!newHex) continue;

            let oldHexFound = null;
            for (const [hex, item] of Object.entries(patched) as [string, any][]) {
                const refIndex = item.refs.findIndex((r: any) => r.brand === brand && r.code === code);
                if (refIndex !== -1) {
                    item.refs.splice(refIndex, 1);
                    if (item.refs.length === 0) {
                        delete patched[hex];
                    }
                    oldHexFound = hex;
                    break; 
                }
            }

            if (!patched[newHex]) {
                const rgb = hexToRgbArr(newHex);
                patched[newHex] = {
                    hex: newHex,
                    rgb,
                    lab: rgbToLab(rgb[0], rgb[1], rgb[2]),
                    refs: []
                };
            }
            if (!patched[newHex].refs.some((r: any) => r.brand === brand && r.code === code)) {
                patched[newHex].refs.push({ brand, code });
            }
        }
    }
    return patched;
};

export const getBrandsFromPalette = (palette: Record<string, BeadPaletteItem>): string[] => {
    const brands = new Set<string>();
    Object.values(palette).forEach(item => {
        item.refs.forEach(ref => brands.add(ref.brand));
    });
    return Array.from(brands).sort();
};

export const groupSystemBeadsByBrand = (systemPalette: Record<string, BeadPaletteItem>): Record<string, Array<{code: string, hex: string}>> => {
    const grouped: Record<string, Array<{code: string, hex: string}>> = {};
    
    Object.values(systemPalette).forEach(item => {
        item.refs.forEach(ref => {
            if (!grouped[ref.brand]) grouped[ref.brand] = [];
            grouped[ref.brand].push({ code: ref.code, hex: item.hex });
        });
    });

    // Sort codes within each brand
    Object.keys(grouped).forEach(brand => {
        grouped[brand].sort((a, b) => compareCodes(a.code, b.code));
    });

    return grouped;
};

// --- Sorting Helpers ---

export const compareCodes = (a: string, b: string): number => {
    const parse = (code: string) => {
        // Match prefix (letters) and suffix (rest)
        const match = code.match(/^([a-zA-Z\-_]*)(.*)$/);
        if (!match) return { prefix: code, num: NaN, suffix: '' };
        const prefix = match[1];
        const remainder = match[2];
        // Try to find a leading number in the suffix
        const numMatch = remainder.match(/^(\d+)(.*)$/);
        if (numMatch) {
            return { prefix, num: parseInt(numMatch[1], 10), suffix: numMatch[2] };
        }
        return { prefix, num: NaN, suffix: remainder };
    };

    const pA = parse(a);
    const pB = parse(b);

    // 1. Compare Prefixes
    const prefixCmp = pA.prefix.localeCompare(pB.prefix);
    if (prefixCmp !== 0) return prefixCmp;

    // 2. Compare Numbers (if both have numbers)
    if (!isNaN(pA.num) && !isNaN(pB.num)) {
        const numCmp = pA.num - pB.num;
        if (numCmp !== 0) return numCmp;
    }

    // 3. Fallback to full string compare (covers suffix differences or NaN)
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
};

export const formatBeadCode = (code: string): string => {
  if (!code) return "";
  const s = String(code);
  if (s.length <= 3) return s;

  // 4-character codes: specific splitting rules
  if (s.length === 4) {
    // Rule: 0ABC -> 0\nABC
    if (s.startsWith('0')) {
        return `${s[0]}\n${s.slice(1)}`;
    }
    
    // Rule: A123 -> A\n123 (Letter followed by 3 Digits)
    if (/^[A-Za-z]\d{3}$/.test(s)) {
         return `${s[0]}\n${s.slice(1)}`;
    }
    
    // Rule: 123A -> 123\nA (3 Digits followed by Letter)
    if (/^\d{3}[A-Za-z]$/.test(s)) {
         return `${s.slice(0, 3)}\n${s.slice(3)}`;
    }

    // Rule: ABC1 -> ABC\n1 (3 Letters followed by 1 Digit)
    if (/^[A-Za-z]{3}\d$/.test(s)) {
         return `${s.slice(0, 3)}\n${s.slice(3)}`;
    }
    
    // Rule: ABCD -> AB\nCD (Default 4 char split)
    return `${s.slice(0, 2)}\n${s.slice(2)}`;
  }
  
  // Longer codes: split in middle
  const mid = Math.ceil(s.length / 2);
  return `${s.slice(0, mid)}\n${s.slice(mid)}`;
}
