import { AppConfig } from './types';

export const DEFAULT_CONFIG: AppConfig = {
  scale: 40,
  margin: 80, 
  show_coordinates: true,
  show_grid: true,
  major_grid_interval: 5,
  grid_color: '#000000',
  grid_opacity: 0.3,
  auto_contrast_text: true,
  
  custom_block_size: 0, 
  auto_crop: 'auto-transparent',
  custom_crop_color: '#000000',
  background_tolerance: 10,
  color_tolerance: 10,
  merge_mode: 'euclidean',
  ignore_transparent: true,
  
  // Bead Defaults
  bead_matching_enabled: false,
  bead_source_mode: 'none', // Changed to 'none' to match disabled state
  bead_accuracy_threshold: 100, // 100 means max DeltaE allowed (100)
  bead_distance_algorithm: 'deltaE2000',
  bead_priority_brands: [],
  user_yaml_content: null,
  user_yaml_meta: null,
  show_original_color: false,

  legend_position: 'top',
  legend_sort: 'by_count',
  show_color_value: false, 
  color_format: 'hex',
  
  title: 'Pixel Art',
  
  theme: 'auto',
  language: 'zh',
};