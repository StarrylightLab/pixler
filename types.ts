
export type LegendPosition = 'top' | 'bottom' | 'left' | 'right';
export type LegendSort = 'by_index' | 'by_count' | 'by_brightness' | 'by_hue';
export type AutoCropMode = 'none' | 'auto-transparent' | 'auto-white' | 'auto-black' | 'auto-custom';
export type MergeMode = 'euclidean' | 'none';
export type Theme = 'auto' | 'light' | 'dark';
export type Language = 'en' | 'zh' | 'ja';
export type ColorFormat = 'hex' | 'hsb';
export type BeadSourceMode = 'system' | 'user' | 'none';
export type BeadDistanceAlgorithm = 'rgb' | 'deltaE76' | 'deltaE2000';

export interface BeadRef {
  brand: string;
  code: string;
}

export interface BeadPaletteItem {
  hex: string;
  lab: [number, number, number];
  rgb: [number, number, number];
  refs: BeadRef[];
}

export interface AppConfig {
  // Rendering
  scale: number; 
  margin: number; 
  show_coordinates: boolean;
  show_grid: boolean;
  major_grid_interval: number; 
  grid_color: string;
  grid_opacity: number;
  auto_contrast_text: boolean;
  
  // Processing
  custom_block_size: number; 
  auto_crop: AutoCropMode;
  custom_crop_color: string; 
  background_tolerance: number; 
  color_tolerance: number; 
  merge_mode: MergeMode;
  ignore_transparent: boolean; 
  
  // Bead Matching
  bead_matching_enabled: boolean;
  bead_source_mode: BeadSourceMode;
  bead_accuracy_threshold: number; // 0-100, maps to DeltaE (0: strict, 100: loose)
  bead_distance_algorithm: BeadDistanceAlgorithm;
  bead_priority_brands: string[];
  user_yaml_content: string | null;
  user_yaml_meta: { name: string; updated_at: string } | null;
  show_original_color: boolean; // New field for showing original colors on canvas

  // Legend
  legend_position: LegendPosition;
  legend_sort: LegendSort;
  show_color_value: boolean; 
  color_format: ColorFormat; 
  
  // Meta
  title: string;
  
  // UI
  theme: Theme;
  language: Language;
}

export interface ColorRGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface PaletteItem {
  id: string; 
  color: ColorRGBA;
  hex: string;
  count: number;
  brightness: number; 
  hue: number;
  // Bead specific
  matchedBead?: BeadPaletteItem;
  beadDeltaE?: number;
  isBeadMissing?: boolean;
}

export interface ProcessedPixel {
  x: number; 
  y: number; 
  paletteId: string;
  originalColor: ColorRGBA;
}

export interface ProcessedImage {
  width: number; 
  height: number; 
  pixels: ProcessedPixel[][]; 
  palette: PaletteItem[];
  originalWidth: number;
  originalHeight: number;
  blockSize: number; 
  beadAnalysis?: {
    accuracy: number;
    missingCount: number;
    missingRefs: string[];
    totalBeadsInScope: number;
  };
}