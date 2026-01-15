
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { flushSync } from 'react-dom';
import { Language, BeadPaletteItem } from '../types';
import { t } from '../utils/translations';
import { 
  DownloadIcon, 
  TrashIcon, AddIcon, InsertIcon, SearchIcon, 
  CodeModeIcon, GuiModeIcon, CheckedIcon, BrandsIcon, EditIcon,
  CheckboxCheckedIcon, CheckboxUncheckedIcon, CreateNewFileIcon, FileCreateIcon, FileCreateFillIcon,
  ToastWarningIcon, ScopeUserIcon
} from './Icons';
import { parseBeadYamlDetailed, generateBeadYaml, groupSystemBeadsByBrand, compareCodes } from '../utils/beadUtils';
import { toast } from 'react-toastify';

interface Props {
  lang: Language;
  systemBeads: Record<string, BeadPaletteItem> | null;
}

interface UserColor {
    id: string; 
    code: string;
    hex: string;
}

interface UserBrand {
    id: string;
    name: string;
    colors: UserColor[];
}

const DEFAULT_BRAND_NAME = "My Brand";
const EDITOR_CACHE_KEY = 'pixler_bead_editor_draft';

// Styles
const INPUT_BASE = "bg-transparent outline-none transition-all placeholder-gray-300 dark:placeholder-gray-600 rounded-none";
const INPUT_STANDARD = `${INPUT_BASE} border-b border-dashed border-gray-300 dark:border-gray-700 hover:border-solid hover:border-gray-600 dark:hover:border-white/70 focus:border-solid focus:border-primary-500 focus:border-b-1`;

const normalizeColorInput = (input: string): string => {
    const clean = input.trim();
    if (/^#?[0-9A-Fa-f]{3,6}$/.test(clean)) {
        let val = clean.startsWith('#') ? clean : '#' + clean;
        if (val.length === 4) val = '#' + val[1] + val[1] + val[2] + val[2] + val[3] + val[3];
        return val.toUpperCase();
    }
    const rgbMatch = clean.match(/(?:rgb\s*\()?\s*(\d+)\s*[, ]\s*(\d+)\s*[, ]\s*(\d+)\s*\)?/i);
    if (rgbMatch) {
        const r = Math.min(255, parseInt(rgbMatch[1])).toString(16).padStart(2, '0');
        const g = Math.min(255, parseInt(rgbMatch[2])).toString(16).padStart(2, '0');
        const b = Math.min(255, parseInt(rgbMatch[3])).toString(16).padStart(2, '0');
        return `#${r}${g}${b}`.toUpperCase();
    }
    return clean;
};

// Helper: Formatted Timestamp (YYYY-MM-DD HH:mm:ss)
const getCurrentFormattedDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

// Helper to safely convert parsed YAML object to GUI UserBrand[]
// This prevents crashes when 'colors' is null/undefined in the YAML
const convertParsedToGui = (parsed: any): UserBrand[] => {
    const newBrands: UserBrand[] = [];
    const srcBrands = parsed.brands || {}; 
    Object.keys(srcBrands).forEach((bName, idx) => {
        const colorsObj = srcBrands[bName];
        const colorsList: UserColor[] = [];
        
        if (colorsObj && typeof colorsObj === 'object') {
            Object.keys(colorsObj).forEach((code, cIdx) => {
                colorsList.push({
                    id: `color_${Date.now()}_${idx}_${cIdx}_${Math.random().toString(36).substr(2, 4)}`,
                    code,
                    hex: colorsObj[code]
                });
            });
        }
        
        colorsList.sort((a,b) => compareCodes(a.code, b.code));
        newBrands.push({ id: `brand_${Date.now()}_${idx}`, name: bName, colors: colorsList });
    });
    return newBrands;
};

const BeadEditor: React.FC<Props> = ({ lang, systemBeads }) => {
  const [viewMode, setViewMode] = useState<'gui' | 'yaml'>('gui');
  // Mobile Tab State: 'system' is the default picker on mobile (requested)
  const [mobileTab, setMobileTab] = useState<'system' | 'user'>('system');

  const [activeBrandId, setActiveBrandId] = useState<string | null>(null);
  const [isSetup, setIsSetup] = useState(false);
  
  const [pendingFocusId, setPendingFocusId] = useState<string | null>(null);
  const brandNameRefs = useRef<Map<string, HTMLInputElement>>(new Map());
  
  const [pendingColorFocusId, setPendingColorFocusId] = useState<string | null>(null);
  const colorCodeRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  const sortTimeoutRef = useRef<number | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [brandToDelete, setBrandToDelete] = useState<string | null>(null); // New state for delete modal
  const [newPaletteName, setNewPaletteName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [meta, setMeta] = useState({ name: "User Palette", updated_at: getCurrentFormattedDate() });
  const [brands, setBrands] = useState<UserBrand[]>([]);
  // State to persist patch_brands even when using GUI
  const [patchBrands, setPatchBrands] = useState<Record<string, Record<string, string>>>({});

  const [duplicateIds, setDuplicateIds] = useState<Set<string>>(new Set()); 
  
  // Ref to track latest brands state for async operations (debounce)
  const brandsRef = useRef(brands);
  useEffect(() => {
      brandsRef.current = brands;
  }, [brands]);
  
  const [yamlText, setYamlText] = useState('');
  const lastLoadedRef = useRef<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrandFilter, setSelectedBrandFilter] = useState<string>('ALL');
  const [selectedSystemKeys, setSelectedSystemKeys] = useState<Set<string>>(new Set()); 

  // Initialize from LocalStorage
  useEffect(() => {
    const draft = localStorage.getItem(EDITOR_CACHE_KEY);
    if (draft && draft.trim()) {
        const { parsed } = parseBeadYamlDetailed(draft);
        if (parsed) {
            setYamlText(draft);
            lastLoadedRef.current = draft;
            setMeta({
                name: parsed.meta?.name || "User Palette",
                updated_at: parsed.meta?.updated_at || getCurrentFormattedDate()
            });
            const newBrands = convertParsedToGui(parsed);
            setBrands(newBrands);
            if (parsed.patch_brands) setPatchBrands(parsed.patch_brands);
            
            if (newBrands.length > 0 && !activeBrandId) setActiveBrandId(newBrands[0].id);
            setIsSetup(true);
            validateAndSortAll(newBrands, false); 
        }
    }
  }, []);

  // Save to LocalStorage whenever yamlText updates and is valid setup
  useEffect(() => {
    if (isSetup && yamlText) {
        localStorage.setItem(EDITOR_CACHE_KEY, yamlText);
    }
  }, [yamlText, isSetup]);

  useEffect(() => {
    if (pendingFocusId) {
        const el = brandNameRefs.current.get(pendingFocusId);
        if (el) { el.focus(); setPendingFocusId(null); }
    }
  }, [pendingFocusId]);

  useEffect(() => {
    if (pendingColorFocusId) {
        const el = colorCodeRefs.current.get(pendingColorFocusId);
        if (el) { 
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.focus(); 
            el.select();
            setPendingColorFocusId(null); 
        }
    }
  }, [pendingColorFocusId]);

  const systemGroups = useMemo(() => systemBeads ? groupSystemBeadsByBrand(systemBeads) : {}, [systemBeads]);

  const { groupedItems, sortedPrefixes, flatFilteredList } = useMemo(() => {
      const rawQ = searchQuery.trim();
      const q = rawQ.toLowerCase();
      const isHexSearch = rawQ.startsWith('#');
      const tempGrouped: Record<string, { brand: string, code: string, hex: string, key: string }[]> = {};
      const flatList: { brand: string, code: string, hex: string, key: string }[] = [];
      Object.keys(systemGroups).forEach(brand => {
          if (selectedBrandFilter !== 'ALL' && brand !== selectedBrandFilter) return;
          systemGroups[brand].forEach(c => {
              let isMatch = !rawQ || (isHexSearch ? c.hex.toLowerCase().includes(q) : c.code.toLowerCase().includes(q));
              if (isMatch) {
                  const item = { ...c, brand, key: `${brand}:${c.code}` };
                  flatList.push(item);
                  let prefix = '#';
                  const firstChar = c.code.charAt(0).toUpperCase();
                  if (/[A-Z]/.test(firstChar)) prefix = firstChar;
                  if (!tempGrouped[prefix]) tempGrouped[prefix] = [];
                  tempGrouped[prefix].push(item);
              }
          });
      });
      const prefixes = Object.keys(tempGrouped).sort((a, b) => a === '#' ? 1 : b === '#' ? -1 : a.localeCompare(b));
      return { groupedItems: tempGrouped, sortedPrefixes: prefixes, flatFilteredList: flatList };
  }, [systemGroups, searchQuery, selectedBrandFilter]);

  const validateAndSortAll = (currentBrands: UserBrand[], shouldSort: boolean = true) => {
      const newDuplicates = new Set<string>();
      const processedBrands = currentBrands.map(brand => {
          const codeMap = new Map<string, string[]>();
          brand.colors.forEach(c => {
              const code = c.code.trim();
              if (!codeMap.has(code)) codeMap.set(code, []);
              codeMap.get(code)!.push(c.id);
          });
          codeMap.forEach((ids) => {
              if (ids.length > 1) ids.forEach(id => newDuplicates.add(id));
          });

          if (shouldSort) {
              return { 
                  ...brand, 
                  colors: [...brand.colors].sort((a, b) => {
                      // Custom sort: empty codes go to the bottom
                      const codeA = a.code.trim();
                      const codeB = b.code.trim();
                      if (!codeA && !codeB) return 0;
                      if (!codeA) return 1;
                      if (!codeB) return -1;
                      return compareCodes(codeA, codeB);
                  }) 
              };
          }
          return brand;
      });

      setDuplicateIds(newDuplicates);
      
      if (shouldSort) {
          // Use View Transitions if available for smooth reordering
          if ((document as any).startViewTransition) {
             (document as any).startViewTransition(() => {
                 flushSync(() => {
                     setBrands(processedBrands);
                     updateYamlTextFromGui(meta, processedBrands);
                 });
             });
          } else {
             setBrands(processedBrands);
             updateYamlTextFromGui(meta, processedBrands);
          }
      }
  };

  const scheduleSort = () => {
    if (sortTimeoutRef.current) window.clearTimeout(sortTimeoutRef.current);
    // Increased timeout to 700ms (was 1000) to prevent cards from jumping too fast while editing
    // Uses brandsRef.current to avoid stale closures if state updates in between (e.g. adding new card)
    sortTimeoutRef.current = window.setTimeout(() => {
        validateAndSortAll(brandsRef.current, true);
        sortTimeoutRef.current = null;
    }, 700);
  };

  const handleBrandNameBlur = (brandId: string) => {
      const currentBrands = brandsRef.current;
      const targetBrand = currentBrands.find(b => b.id === brandId);
      if (!targetBrand) return;

      const targetName = targetBrand.name.trim();
      const sameNameBrands = currentBrands.filter(b => b.name.trim() === targetName);

      if (sameNameBrands.length > 1) {
          // Merge needed
          const survivor = sameNameBrands[0];
          const victimsIds = new Set<string>();
          
          // Deduplication Map: Code -> Color
          // Requirement: "If two color codes are exactly the same, merge into one."
          const uniqueColorsMap = new Map<string, UserColor>();
          
          // Add survivor colors first (Priority to keep existing structure)
          survivor.colors.forEach(c => {
             const code = c.code.trim();
             // Key by code if present, otherwise allow duplicates for empty codes to be safe (or drop them)
             // Generally empty codes should be handled by validation, but here we preserve them if unique IDs
             if (code) {
                 uniqueColorsMap.set(code, c);
             } else {
                 // For empty codes, we can't key them, so we just append them to a separate list or handle uniquely
                 // But for simplicity in this logic, let's just key by code.
             }
          });
          
          // Collect survivor's empty-code colors to keep
          let mergedColors = survivor.colors.filter(c => !c.code.trim());
          
          // Add keyed colors back
          // We'll reconstruct the list after processing victims

          for (let i = 1; i < sameNameBrands.length; i++) {
              const victim = sameNameBrands[i];
              victimsIds.add(victim.id);
              
              victim.colors.forEach(c => {
                  const code = c.code.trim();
                  if (code) {
                      if (!uniqueColorsMap.has(code)) {
                          uniqueColorsMap.set(code, c);
                      }
                      // If code exists, we skip (Merge/Deduplicate)
                  } else {
                      // Keep empty codes from victims too?
                      mergedColors.push(c);
                  }
              });
          }
          
          // Combine unique named colors and all empty-named colors
          mergedColors = [...Array.from(uniqueColorsMap.values()), ...mergedColors];

          const newBrands = currentBrands.filter(b => !victimsIds.has(b.id)).map(b => {
              if (b.id === survivor.id) {
                  return { ...b, colors: mergedColors };
              }
              return b;
          });

          setBrands(newBrands);
          updateYamlTextFromGui(meta, newBrands);
          
          if (activeBrandId && victimsIds.has(activeBrandId)) {
              setActiveBrandId(survivor.id);
          }
          
          toast.info(lang === 'zh' 
             ? `已自动合并 ${sameNameBrands.length} 个 "${targetName}" 品牌 (已去重)` 
             : `Merged ${sameNameBrands.length} brands named "${targetName}" (Deduplicated)`
          );

          // Validate immediately
          validateAndSortAll(newBrands, false);
      }
  };

  const handleCreateNew = () => {
    if (!newPaletteName.trim()) return;
    const initialBrand = { id: `brand_${Date.now()}`, name: DEFAULT_BRAND_NAME, colors: [] };
    const newMeta = { name: newPaletteName, updated_at: getCurrentFormattedDate() };
    setMeta(newMeta); setBrands([initialBrand]); setActiveBrandId(initialBrand.id); setPendingFocusId(initialBrand.id); updateYamlTextFromGui(newMeta, [initialBrand]); setIsSetup(true);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
          const content = (event.target?.result as string).replace(/^\uFEFF/, '');
          const { parsed } = parseBeadYamlDetailed(content);
          if (parsed) {
              const importedMeta = { name: parsed.meta?.name || 'Imported Palette', updated_at: parsed.meta?.updated_at || getCurrentFormattedDate() };
              
              // Load into Editor State only
              setYamlText(content);
              setMeta(importedMeta);
              const newBrands = convertParsedToGui(parsed);
              setBrands(newBrands);
              // Important: Persist patches
              setPatchBrands(parsed.patch_brands || {});
              
              setIsSetup(true);
              validateAndSortAll(newBrands, false);
              
              toast.success(t('toastImported', lang));
          } else toast.error(t('invalidYaml', lang));
      };
      reader.readAsText(file);
      if (e.target) e.target.value = '';
  };

  const handleReset = () => { 
      setIsSetup(false); 
      setBrands([]); 
      setMeta({ name: '', updated_at: '' }); 
      setPatchBrands({});
      setYamlText(''); 
      setActiveBrandId(null); 
      setNewPaletteName(''); 
      setShowResetConfirm(false); 
      setDuplicateIds(new Set()); 
      localStorage.removeItem(EDITOR_CACHE_KEY);
  };

  // Pass patchBrands state to generator
  const updateYamlTextFromGui = (m = meta, b = brands, p = patchBrands) => { 
      setYamlText(generateBeadYaml({ meta: m, brands: b, patch_brands: p })); 
  };

  // New Combined Action: Validate -> Update Meta -> Save -> Download -> Cache
  const handleValidateAndDownload = () => {
      let currentBrands = brands;
      let currentMeta = meta;
      let currentPatchBrands = patchBrands;

      // 1. If in YAML mode, parse first to ensure we have latest data including manual edits to patches
      if (viewMode === 'yaml') {
          const { parsed, error } = parseBeadYamlDetailed(yamlText);
          if (!parsed) {
              toast.error((t('yamlError', lang) || "YAML Error: ") + (error || "Invalid format"));
              return;
          }
          currentMeta = { 
              name: parsed.meta?.name || currentMeta.name, 
              updated_at: currentMeta.updated_at 
          };
          
          // Reconstruct brands from parsed YAML to ensure integrity
          currentBrands = convertParsedToGui(parsed);
          
          // Capture patches from YAML text
          if (parsed.patch_brands) currentPatchBrands = parsed.patch_brands;
      }

      // 2. Validate Brands
      if (currentBrands.length === 0) { 
          toast.error(t('toastNoBrand', lang)); return; 
      }
      if (currentBrands.some(b => !b.name.trim())) { 
          toast.error(t('toastNoBrandName', lang)); return; 
      }
      
      // RULE: Every brand must have at least one color (Warn/Block on Download)
      if (currentBrands.some(b => b.colors.length === 0)) {
          toast.warn(lang === 'zh' ? "存在没有颜色的品牌，请检查。" : "Some brands are empty. Please check.");
          return;
      }

      // Check for empty codes
      for (const brand of currentBrands) {
          for (const color of brand.colors) {
              if (!color.code.trim()) {
                  toast.warn(lang === 'zh' ? "检测到未填写色号的颜色，请补充。" : "Color with empty code detected. Please fill it in.");
                  setPendingColorFocusId(color.id); // Triggers useEffect to scroll/focus
                  return;
              }
          }
      }

      if (duplicateIds.size > 0 && viewMode !== 'yaml') { 
          toast.error(t('toastResolveDupes', lang)); return; 
      }

      // 3. Final Merge (Defensive) - If brands have same name, merge their colors
      const brandMap = new Map<string, UserBrand>();
      currentBrands.forEach(b => {
          const name = b.name.trim();
          if (!brandMap.has(name)) {
              brandMap.set(name, { ...b, colors: [...b.colors] });
          } else {
              // Merge colors
              const existing = brandMap.get(name)!;
              existing.colors = [...existing.colors, ...b.colors];
          }
      });
      const mergedBrands = Array.from(brandMap.values());

      // 4. Update Meta Date (Format: YYYY-MM-DD HH:mm:ss)
      const newMeta = { ...currentMeta, updated_at: getCurrentFormattedDate() };
      setMeta(newMeta);
      setBrands(mergedBrands); // Update state
      setPatchBrands(currentPatchBrands); // Update patches state if changed via YAML mode

      // 5. Generate Content
      const content = generateBeadYaml({ meta: newMeta, brands: mergedBrands, patch_brands: currentPatchBrands });
      setYamlText(content);
      lastLoadedRef.current = content;

      // 6. Trigger Download
      // Use application/octet-stream to force download on iOS/Mobile and append to body
      const blob = new Blob([content], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); 
      a.href = url; 
      // Update: Remove 'pixler_' prefix, replace spaces with underscores
      const safeFilename = newMeta.name.trim().replace(/\s+/g, '_');
      a.download = `${safeFilename}.yaml`; 
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      URL.revokeObjectURL(url);

      toast.success(t('yamlValid', lang));
  };

  const handleAddBrand = () => {
      const newBrand = { id: `brand_${Date.now()}`, name: t('newBrand', lang), colors: [] };
      const newBrands = [...brands, newBrand];
      setBrands(newBrands); setActiveBrandId(newBrand.id); setPendingFocusId(newBrand.id); updateYamlTextFromGui(meta, newBrands);
  };

  // UPDATED: Simply set state to trigger modal
  const handleDeleteBrand = (id: string) => {
      setBrandToDelete(id);
  };

  // NEW: Actual delete logic called by modal
  const confirmDeleteBrand = () => {
      if (!brandToDelete) return;
      
      const currentBrands = brandsRef.current;
      const newBrands = currentBrands.filter(b => b.id !== brandToDelete);
      
      setBrands(newBrands);
      
      // If we deleted the active brand, select the first available one or null
      if (activeBrandId === brandToDelete) {
          setActiveBrandId(newBrands[0]?.id || null);
      }
      
      updateYamlTextFromGui(meta, newBrands);
      // No need to validate duplicates if we just removed a brand, but sorting keeps things clean
      validateAndSortAll(newBrands, false);
      
      setBrandToDelete(null);
  };

  const handleUpdateBrandName = (id: string, name: string) => {
      const newBrands = brands.map(b => b.id === id ? { ...b, name } : b);
      setBrands(newBrands); updateYamlTextFromGui(meta, newBrands);
  };

  const handleBrandBlur = () => { scheduleSort(); };

  const handleAddColor = (brandId: string) => {
      const newColor: UserColor = { id: `color_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, code: '', hex: '#000000' };
      const newBrands = brands.map(b => b.id === brandId ? { ...b, colors: [...b.colors, newColor] } : b);
      setBrands(newBrands); 
      updateYamlTextFromGui(meta, newBrands);
      setPendingColorFocusId(newColor.id);
  };

  const handleUpdateColor = (brandId: string, colorId: string, fields: Partial<UserColor>) => {
      const newBrands = brands.map(b => {
          if (b.id !== brandId) return b;
          return { ...b, colors: b.colors.map(c => c.id === colorId ? { ...c, ...fields } : c) };
      });
      setBrands(newBrands); 
      updateYamlTextFromGui(meta, newBrands);
  };

  const handleColorBlur = (brandId: string, colorId: string, field: 'code' | 'hex', value: string) => {
      if (field === 'hex') {
          const normalized = normalizeColorInput(value);
          handleUpdateColor(brandId, colorId, { hex: normalized.startsWith('#') ? normalized : '#000000' });
      }
      scheduleSort();
  };

  const handleDeleteColor = (brandId: string, colorId: string) => {
      const newBrands = brands.map(b => b.id === brandId ? { ...b, colors: b.colors.filter(c => c.id !== colorId) } : b);
      setBrands(newBrands); updateYamlTextFromGui(meta, newBrands);
      validateAndSortAll(newBrands, false);
  };

  const handleYamlKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Tab') {
          e.preventDefault();
          const target = e.currentTarget;
          const start = target.selectionStart;
          const end = target.selectionEnd;
          const value = target.value;
          
          // Insert 2 spaces
          const newValue = value.substring(0, start) + "  " + value.substring(end);
          
          setYamlText(newValue);
          
          // Restore cursor position after state update
          setTimeout(() => {
              target.selectionStart = target.selectionEnd = start + 2;
          }, 0);
      }
  };

  const toggleViewMode = () => {
      if (viewMode === 'gui') {
          // Switch to YAML: Ensure text is up to date
          updateYamlTextFromGui();
          setViewMode('yaml');
      } else {
          // Switch to GUI: Parse text with detailed error reporting
          const { parsed, error } = parseBeadYamlDetailed(yamlText);
          if (parsed) {
              setMeta({
                  name: parsed.meta?.name || meta.name,
                  updated_at: parsed.meta?.updated_at || meta.updated_at
              });
              const newBrands = convertParsedToGui(parsed);
              setBrands(newBrands);
              // Important: preserve patches from text when going to GUI
              setPatchBrands(parsed.patch_brands || {});
              
              validateAndSortAll(newBrands, false);
              setViewMode('gui');
          } else {
              // Show explicit error to the user
              toast.error((t('yamlError', lang) || "YAML Error: ") + (error || "Invalid format"));
              // Don't switch if invalid
          }
      }
  };

  const renderLeftPanel = () => (
      <aside className={`
        w-full md:w-80 flex-1 md:flex-none min-h-0
        bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800
        flex flex-col shrink-0 z-10
        ${mobileTab === 'system' ? 'flex' : 'hidden md:flex'}
      `}>
          <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                  <BrandsIcon width={18} height={18} className="text-primary-600 dark:text-primary-400" />
                  <h3 className="font-bold text-gray-900 dark:text-white text-sm uppercase tracking-wider">{t('systemPalette', lang)}</h3>
              </div>
              
              {/* Search */}
              <div className="relative group w-full">
                  <SearchIcon width={14} height={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors pointer-events-none" />
                  <input 
                      type="text" 
                      placeholder={t('searchPlaceholder', lang)}
                      value={searchQuery} 
                      onChange={(e) => setSearchQuery(e.target.value)} 
                      className={`w-full pl-8 pr-2 py-1.5 text-xs font-bold text-gray-700 dark:text-gray-200 ${INPUT_STANDARD}`} 
                  />
              </div>

              {/* Brand Filter (Tags) */}
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto custom-scrollbar">
                   <button 
                        onClick={() => setSelectedBrandFilter('ALL')}
                        className={`px-2.5 py-1 text-[10px] font-bold rounded-full border transition-colors ${selectedBrandFilter === 'ALL' ? 'bg-gray-800 text-white dark:bg-white dark:text-gray-900 border-transparent' : 'bg-white dark:bg-gray-800 text-gray-500 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}
                    >
                        ALL
                    </button>
                  {Object.keys(systemGroups).sort().map(b => (
                      <button 
                          key={b}
                          onClick={() => setSelectedBrandFilter(b)}
                          className={`px-2.5 py-1 text-[10px] font-bold rounded-full border transition-colors ${selectedBrandFilter === b ? 'bg-primary-100 text-primary-700 border-primary-200 dark:bg-primary-900/40 dark:text-primary-300 dark:border-primary-800' : 'bg-white dark:bg-gray-800 text-gray-500 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}
                      >
                          {b}
                      </button>
                  ))}
              </div>
          </div>

          {/* List Header (Select All) */}
          <div className="px-4 py-2 bg-gray-50/50 dark:bg-gray-800/30 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center shrink-0">
               <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{flatFilteredList.length} {t('colorsFound', lang)}</span>
               <button 
                  disabled={flatFilteredList.length === 0}
                  onClick={() => { 
                      const allKeys = flatFilteredList.map(i => i.key); 
                      // Check if all displayed are selected
                      const allSelected = allKeys.length > 0 && allKeys.every(k => selectedSystemKeys.has(k)); 
                      
                      const newSet = new Set(selectedSystemKeys); 
                      if (allSelected) {
                          allKeys.forEach(k => newSet.delete(k));
                      } else {
                          allKeys.forEach(k => newSet.add(k));
                      }
                      setSelectedSystemKeys(newSet); 
                  }} 
                  className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400 transition-colors disabled:opacity-50"
               >
                   {flatFilteredList.length > 0 && flatFilteredList.every(k => selectedSystemKeys.has(k.key)) ? <CheckboxCheckedIcon width={14} height={14} /> : <CheckboxUncheckedIcon width={14} height={14} />}
                   <span>{flatFilteredList.length > 0 && flatFilteredList.every(k => selectedSystemKeys.has(k.key)) ? t('deselectAll', lang) : t('selectAll', lang)}</span>
               </button>
          </div>

          {/* List Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar bg-gray-50 dark:bg-gray-950 relative">
              {sortedPrefixes.length === 0 ? <div className="p-10 text-center flex flex-col items-center gap-2 opacity-30"><SearchIcon width={32} height={32} /><span className="text-xs">{t('noResults', lang)}</span></div> : sortedPrefixes.map(prefix => (
                  <div key={prefix} className="mb-0">
                      <div className="sticky top-0 z-10 px-3 py-1.5 text-[10px] font-bold text-gray-500 dark:text-gray-400 flex items-center gap-2 bg-gray-50/95 dark:bg-gray-950/95 backdrop-blur-sm border-b border-gray-100 dark:border-gray-800 shadow-sm">
                        <span className="bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-1.5 rounded min-w-[1.2rem] text-center">{prefix}</span>
                        <div className="h-px bg-gray-200 dark:bg-gray-800 flex-1 opacity-50"></div>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5 p-2">
                          {groupedItems[prefix].map(item => {
                              const isSelected = selectedSystemKeys.has(item.key);
                              return (
                                  <button 
                                      key={item.key} 
                                      onClick={() => { const ns = new Set(selectedSystemKeys); isSelected ? ns.delete(item.key) : ns.add(item.key); setSelectedSystemKeys(ns); }} 
                                      className={`group relative flex flex-col items-stretch text-left bg-white dark:bg-gray-900 border transition-all duration-200  overflow-hidden rounded-[1px] p-2
                                      ${isSelected ? 'border-primary-500 ring-1 ring-primary-500 z-10' : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-600'}
                                      `}
                                      title={`${item.brand}: ${item.code}`}
                                  >
                                      {/* Swatch Area - Square */}
                                      <div className="w-full aspect-square relative bg-gray-100 dark:bg-gray-800 ">
                                            <div className="absolute inset-0" style={{backgroundColor: item.hex}} />
                                            {/* Selection Overlay */}
                                            {isSelected && (
                                                <div className="absolute inset-0  flex items-center justify-center text-primary-600">
                                                     <div className=" rounded-full p-0.5 ">
                                                        <CheckedIcon width={20} height={20} className="drop-shadow-[0_2px_0_rgba(0,0,0,0.4)]" />
                                                     </div>
                                                </div>
                                            )}
                                      </div>
                                      
                                      {/* Content */}
                                      <div className="pt-2 flex flex-col items-center gap-0.5 justify-center">
                                          <span className={`font-mono font-bold text-xs leading-none w-full text-center truncate ${isSelected ? 'text-primary-700 dark:text-primary-300' : 'text-gray-700 dark:text-gray-200'}`}>
                                              {item.code}
                                          </span>
                                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider w-full text-center truncate">{item.brand}</span>
                                      </div>
                                  </button>
                              );
                          })}
                      </div>
                  </div>
              ))}
          </div>

          {/* Bottom Import Button */}
          <div className="p-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 shrink-0 flex items-center justify-between">
               <div className="text-m font-bold text-gray-700 dark:text-gray-200 pl-1">
                   {t('selectedCount', lang)}: {selectedSystemKeys.size}
               </div>
               <button disabled={selectedSystemKeys.size === 0} onClick={() => {
                   let total = 0; let nb = [...brands];
                   selectedSystemKeys.forEach(key => {
                       const [sb, sc] = key.split(':');
                       const si = systemBeads ? (Object.values(systemBeads) as BeadPaletteItem[]).find(v => v.refs.some(r => r.brand === sb && r.code === sc)) : null;
                       if (si) {
                           let bi = nb.findIndex(b => b.name === sb);
                           if (bi === -1) { nb.push({ id: `b_${Date.now()}_${total}`, name: sb, colors: [] }); bi = nb.length - 1; }
                           // Deduplicate: Check if code already exists in this brand
                           if (!nb[bi].colors.some(c => c.code === sc)) {
                               nb[bi].colors.push({ id: `c_${Date.now()}_${total++}`, code: sc, hex: si.hex });
                           }
                       }
                   });
                   validateAndSortAll(nb, true);
                   setSelectedSystemKeys(new Set()); toast.success(t('toastImported', lang));
               }} className="px-4 py-1.5 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 disabled:dark:bg-gray-800 disabled:text-gray-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 rounded-none transition-all uppercase tracking-wide shadow-sm">
                   <InsertIcon width={14} height={14} />
                   {t('insert', lang)}
               </button>
          </div>
      </aside>
  );

  const renderColorItem = (brandId: string, c: UserColor) => {
      const isDuplicate = duplicateIds.has(c.id);
      return (
        <div 
            key={c.id} 
            // View Transition Name ensures smooth sorting animation in supported browsers
            style={{ viewTransitionName: `bead-${c.id.replace(/[^a-zA-Z0-9]/g, '-')}` } as React.CSSProperties}
            className={`group relative flex flex-col p-4 bg-white dark:bg-[#1f2937] border transition-all duration-[400ms] ease-out animate-bead-appear 
            ${isDuplicate ? 'border-amber-500 z-10' : 'border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'} 
            focus-within:border-[1.5px] focus-within:!border-primary-500 focus-within:dark:!border-primary-500 focus-within:z-20
            
            `}
        >
            {/* Delete Button (Hover/Focus Only, Top Right, Trash Icon) */}
            <button 
                onClick={(e) => { e.stopPropagation(); handleDeleteColor(brandId, c.id); }} 
                className="absolute top-0 right-0 z-30 p-1 text-gray-400 hover:text-white hover:bg-red-500 rounded opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-all duration-200"
                tabIndex={-1}
                title="Delete"
            >
                <TrashIcon width={14} height={14} />
            </button>
            
            {/* Swatch Container - Fixed relative positioning so color picker is contained */}
            <div className="relative w-full aspect-square mb-2 flex items-center justify-center shadow-inner bg-gray-50 dark:bg-gray-800">
                    <input 
                        type="color" 
                        value={c.hex} 
                        onChange={(e) => handleUpdateColor(brandId, c.id, { hex: e.target.value.toUpperCase() })} 
                        onBlur={() => handleColorBlur(brandId, c.id, 'hex', c.hex)} 
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                    />
                    <div className="w-full h-full transition-colors duration-200 border border-gray-100 dark:border-gray-700" style={{backgroundColor: c.hex}} />
            </div>
            
            {/* Inputs Container */}
            <div className="flex flex-col gap-1.5 relative">
                {/* Code Input */}
                <div className="relative">
                    <input 
                        ref={(el) => { if (el) colorCodeRefs.current.set(c.id, el); else colorCodeRefs.current.delete(c.id); }}
                        type="text" 
                        value={c.code} 
                        onChange={(e) => handleUpdateColor(brandId, c.id, { code: e.target.value })} 
                        onBlur={(e) => handleColorBlur(brandId, c.id, 'code', e.target.value)} 
                        className="w-full bg-transparent text-base font-bold text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 outline-none pb-0.5 border-b-2 border-transparent focus:border-primary-500 transition-colors" 
                        placeholder="Code" 
                    />
                </div>

                {/* Hex Input */}
                <div className="flex items-center gap-0.5 border-b border-dashed border-gray-300 dark:border-gray-700 pb-0.5">
                    <span className="text-primary-600 dark:text-primary-500 font-mono text-xs font-bold">#</span>
                    <input 
                        type="text" 
                        value={c.hex.replace('#', '')} 
                        onChange={(e) => handleUpdateColor(brandId, c.id, { hex: e.target.value })} 
                        onBlur={(e) => handleColorBlur(brandId, c.id, 'hex', e.target.value)} 
                        className="w-full bg-transparent text-xs font-mono text-gray-500 dark:text-gray-400 outline-none uppercase tracking-wider font-bold" 
                        maxLength={6} 
                    />
                </div>
            </div>

            {/* Duplicate Badge */}
            {isDuplicate && (
                <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 uppercase tracking-wider shadow-md whitespace-nowrap z-30">
                    {t('duplicate', lang)}
                </div>
            )}
        </div>
      );
  };

  if (!isSetup) {
      const hasInput = newPaletteName.trim().length > 0;
      return (
      <div className="flex-1 w-full h-full flex items-center justify-center p-6 bg-gray-50 dark:bg-gray-950 font-mono">
          <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-none shadow-xl border border-gray-200 dark:border-gray-800 p-8 flex flex-col items-center text-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 transition-colors duration-300 ${hasInput ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'}`}>
                  {hasInput ? <FileCreateFillIcon width={32} height={32} /> : <FileCreateIcon width={32} height={32} />}
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t('beadEditorLandingTitle', lang)}</h2>
              <p className="text-gray-500 dark:text-gray-400 mb-8 text-sm leading-relaxed">{t('beadEditorLandingDesc', lang)}</p>
              <div className="w-full space-y-4">
                  <div className="space-y-2">
                      <input type="text" placeholder={t('beadEditorCreatePlaceholder', lang)} value={newPaletteName} onChange={(e) => setNewPaletteName(e.target.value)} className={`w-full px-4 py-3 text-gray-900 dark:text-white text-sm ${INPUT_STANDARD}`} />
                      <button onClick={handleCreateNew} disabled={!newPaletteName.trim()} className="w-full py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 disabled:dark:bg-gray-700 text-white font-bold rounded-none  flex items-center justify-center gap-2">{t('beadEditorCreateBtn', lang)}</button>
                  </div>
                  <div className="relative py-2"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200 dark:border-gray-700"></div></div><div className="relative flex justify-center text-xs uppercase"><span className="bg-white dark:bg-gray-900 px-2 text-gray-400">{t('or', lang)}</span></div></div>
                  <button onClick={() => fileInputRef.current?.click()} className="w-full py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold rounded-none transition-colors flex items-center justify-center gap-2">
                      <ScopeUserIcon width={18} height={18} />
                      {t('beadEditorImportBtn', lang)}
                  </button>
                  <input type="file" ref={fileInputRef} accept=".yaml,.yml" className="hidden" onChange={handleImportFile} />
              </div>
          </div>
      </div>
  );
  }

  return (
    <div className="flex-1 w-full h-full overflow-hidden flex flex-col md:flex-row bg-gray-50 dark:bg-gray-900 font-mono">
       <style>{`
          @keyframes bead-appear {
              from { opacity: 0; transform: translateY(20px); filter: blur(4px); }
              to { opacity: 1; transform: translateY(0); filter: blur(0); }
          }
          .animate-bead-appear {
              animation: bead-appear 0.4s ease-out forwards;
          }
       `}</style>
       
       {/* Mobile Tab Navigation (Visible only on small screens) */}
       <div className="md:hidden flex shrink-0 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <button 
                onClick={() => setMobileTab('system')}
                className={`flex-1 py-3 text-sm font-bold text-center border-b-2 transition-colors ${mobileTab === 'system' ? 'border-primary-500 text-primary-600 dark:text-primary-400' : 'border-transparent text-gray-500 dark:text-gray-400'}`}
            >
                {t('systemPalette', lang)}
            </button>
            <button 
                onClick={() => setMobileTab('user')}
                className={`flex-1 py-3 text-sm font-bold text-center border-b-2 transition-colors ${mobileTab === 'user' ? 'border-primary-500 text-primary-600 dark:text-primary-400' : 'border-transparent text-gray-500 dark:text-gray-400'}`}
            >
                {t('userPalette', lang)}
            </button>
       </div>

       {/* Left Panel (System Palette) - Toggled on mobile */}
       {renderLeftPanel()}

       {/* Right Panel (User Editor) - Toggled on mobile */}
       <div className={`
         flex-1 flex flex-col bg-gray-50/50 dark:bg-gray-950 overflow-hidden relative min-h-0
         ${mobileTab === 'user' ? 'flex' : 'hidden md:flex'}
       `} onBlur={handleBrandBlur}>
          <div className="h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 shrink-0">
               <div className="flex items-center gap-3 flex-1 min-w-0"> 
                   <button onClick={() => setShowResetConfirm(true)} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-all ml-1" title={t('createNew', lang)}><CreateNewFileIcon width={16} height={16} /></button>
                   <div className="flex items-center gap-2 group relative">
                        <EditIcon width={14} height={14} className="text-gray-400 absolute left-0 top-1/2 -translate-y-1/2 pointer-events-none group-hover:text-primary-500 transition-colors" />
                        <input type="text" value={meta.name} onChange={(e) => setMeta({...meta, name: e.target.value})} className={`pl-6 pr-2 py-1 font-bold text-gray-800 dark:text-gray-100 w-48 text-sm ${INPUT_STANDARD}`} placeholder={t('fileNamePlaceholder', lang)} />
                   </div>
                   <span className="text-xs text-gray-400 font-mono hidden sm:inline border-l border-gray-200 dark:border-gray-700 pl-3">{meta.updated_at}</span>
               </div>
               <div className="flex items-center gap-2">
                   <button onClick={toggleViewMode} className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-none text-xs flex items-center gap-1">
                       {viewMode === 'gui' ? <CodeModeIcon width={16} height={16} /> : <GuiModeIcon width={16} height={16} />}
                       <span className="hidden sm:inline">{viewMode === 'gui' ? 'YAML' : 'GUI'}</span>
                   </button>
                   <div className="h-4 w-px bg-gray-300 dark:bg-gray-700 mx-1" />
                   <button onClick={handleValidateAndDownload} className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-1.5 rounded-none text-xs font-bold  flex items-center gap-1.5"><DownloadIcon width={14} height={14} /> {t('validateSave', lang)}</button>
               </div>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 space-y-6">
              {viewMode === 'yaml' ? (
                  <textarea 
                    className="w-full h-full min-h-[500px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-none p-4 font-mono text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary-500" 
                    value={yamlText} 
                    onChange={(e) => setYamlText(e.target.value)}
                    onKeyDown={handleYamlKeyDown}
                    spellCheck={false}
                  />
              ) : (
                  <>
                      {brands.map((brand) => (
                          <div key={brand.id} className={`bg-white dark:bg-gray-900 rounded-none  border-2 transition-all duration-300 ${activeBrandId === brand.id ? 'border-primary-400 ring-[6px] ring-primary-100 dark:ring-primary-900/10' : 'border-gray-200 dark:border-gray-800 hover:border-gray-300'}`} onClick={() => setActiveBrandId(brand.id)}>
                              <div className="p-3 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/30">
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                      <div className={`w-1.5 h-4 shrink-0 ${activeBrandId === brand.id ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                                      <input 
                                        ref={(el) => { if (el) brandNameRefs.current.set(brand.id, el); else brandNameRefs.current.delete(brand.id); }} 
                                        type="text" 
                                        value={brand.name} 
                                        onChange={(e) => handleUpdateBrandName(brand.id, e.target.value)}
                                        onBlur={() => handleBrandNameBlur(brand.id)}
                                        className={`font-bold text-gray-800 dark:text-gray-200 text-sm px-2 py-1 max-w-[200px] ${INPUT_STANDARD}`} 
                                        placeholder={t('brandNamePlaceholder', lang)}
                                      />
                                  </div>
                                  <div className="flex items-center gap-4 shrink-0">
                                      <span className="text-xs font-bold bg-white dark:bg-gray-700 px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700 text-primary-600 dark:text-primary-400 ">{brand.colors.length}</span>
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); handleDeleteBrand(brand.id); }} 
                                        className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors text-gray-400 hover:text-red-500" 
                                        title={t('deleteBrand', lang)}
                                      >
                                        <TrashIcon width={16} height={16} />
                                      </button>
                                  </div>
                              </div>
                              <div className="p-4">
                                  <div className="grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-3 transition-all">
                                      {brand.colors.map(c => renderColorItem(brand.id, c))}
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); handleAddColor(brand.id); }} 
                                        className="w-full flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-sm hover:border-solid hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/10 text-gray-400 hover:text-primary-500 transition-all gap-2 box-border min-h-[120px]"
                                      >
                                          <AddIcon width={20} height={20} />
                                          <span className="text-[10px] font-bold uppercase tracking-wider">{t('addColor', lang)}</span>
                                      </button>
                                  </div>
                              </div>
                          </div>
                      ))}
                      <button onClick={handleAddBrand} className="w-full py-4 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-none text-gray-500 hover:border-solid hover:border-primary-400 hover:text-primary-600 hover:bg-white dark:hover:bg-gray-800 transition-all flex items-center justify-center gap-2 font-bold text-sm uppercase tracking-widest"><AddIcon width={18} height={18} /> {t('newBrand', lang)}</button>
                  </>
              )}
          </div>
          {/* Reset Confirm Modal */}
          {showResetConfirm && (
              <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
                  <div className="bg-white dark:bg-gray-900 rounded-none shadow-xl max-w-sm w-full border border-gray-200 dark:border-gray-800 p-6 flex flex-col items-center text-center">
                      <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/30 text-amber-500 rounded-full flex items-center justify-center mb-4"><ToastWarningIcon width={24} height={24} /></div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{t('resetWarningTitle', lang)}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">{t('resetWarningBody', lang)}</p>
                      <div className="flex flex-col gap-2 w-full">
                          <button onClick={handleValidateAndDownload} className="w-full py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 font-bold rounded-none flex items-center justify-center gap-2 transition-colors"><DownloadIcon width={16} height={16} />{t('downloadCurrent', lang)}</button>
                          <button onClick={handleReset} className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-none  transition-colors">{t('continueCreate', lang)}</button>
                          <button onClick={() => setShowResetConfirm(false)} className="w-full py-2 text-xs text-gray-400 hover:text-gray-600 mt-2">{t('cancel', lang)}</button>
                      </div>
                  </div>
              </div>
          )}
          {/* Delete Brand Modal */}
          {brandToDelete && (
              <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
                  <div className="bg-white dark:bg-gray-900 rounded-none shadow-xl max-w-sm w-full border border-gray-200 dark:border-gray-800 p-6 flex flex-col items-center text-center">
                      <div className="w-12 h-12 bg-red-50 dark:bg-red-900/30 text-red-500 rounded-full flex items-center justify-center mb-4"><TrashIcon width={24} height={24} /></div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{t('deleteBrandTitle', lang)}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
                          {brands.find(b => b.id === brandToDelete)?.name || 'Brand'} <br/>
                          {t('deleteBrandBody', lang)}
                      </p>
                      <div className="flex flex-col gap-2 w-full">
                          <button onClick={confirmDeleteBrand} className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-none  transition-colors">{t('confirmDelete', lang)}</button>
                          <button onClick={() => setBrandToDelete(null)} className="w-full py-2 text-xs text-gray-400 hover:text-gray-600 mt-2">{t('cancel', lang)}</button>
                      </div>
                  </div>
              </div>
          )}
       </div>
    </div>
  );
};

export default BeadEditor;
