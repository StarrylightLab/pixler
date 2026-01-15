
import React, { useState, useEffect, useRef } from 'react';
import { AppConfig, AutoCropMode, LegendPosition, LegendSort, Theme, Language, ColorFormat, BeadSourceMode, BeadDistanceAlgorithm } from '../types';
import {
    ImageProcessingIcon, BeadMatchIcon, BlueprintIcon,
    ScaleIcon, MarginIcon, DrawGridIcon, DrawCoordinatesIcon, DrawColorValueIcon, MajorGridIntervalIcon,
    PixelDensityIcon, AutoCropIcon, AutoCutNoneIcon, AutoCutTransparentIcon, AutoCutWhiteIcon,
    AutoCutBlackIcon, AutoCutCustomIcon, HiddenIcon, ColorReductionIcon,
    PositionTopIcon, PositionBottomIcon, PositionLeftIcon, PositionRightIcon,
    SortCountIcon, SortIndexIcon, SortBrightnessIcon, SortHueIcon,
    ExportSaveIcon, DrawColorValueIcon as VisibleIcon, DrawingContentIcon,
    ColorFormatHexIcon, ColorFormatHsbIcon, LegendPositionIcon, SortIcon,
    MatchScopeIcon, ScopeSystemIcon, ScopeUserIcon, ScopeNoneIcon,
    OriginalColorIcon, ColorDifferenceIcon, BrandsIcon,
    ToastInfoIcon, FileCreateIcon, FileCreateFillIcon,
    DownloadInstallIcon, PixelSpinnerIcon
} from './Icons';
import { t } from '../utils/translations';
import { parseBeadYaml, processPaletteToInternal, getBrandsFromPalette, getDeltaELabel } from '../utils/beadUtils';
import { toast } from 'react-toastify';

interface Props {
    config: AppConfig;
    onChange: (newConfig: AppConfig) => void;
    onUpdateUserYaml?: (content: string, meta: { name: string; updated_at: string }) => void;
    onExport: () => void;
    isProcessing: boolean;
    imageMeta?: {
        blockSize: number;
        originalWidth: number;
        originalHeight: number;
        totalColors?: number;
    } | null;
    beadAnalysis?: any;
    beadState?: { isSystemLoaded: boolean; systemCount: number; userCount?: number };
    installPrompt?: any;
    onInstall?: () => void;
}

type TabType = 'processing' | 'bead' | 'appearance';

const Section = ({ title, icon: Icon, children, className = '' }: { title: string, icon?: any, children?: React.ReactNode, className?: string }) => (
    <div className={`mb-6 border-b-2 border-gray-200 dark:border-gray-700 pb-2 last:border-0 last:mb-0 last:pb-0 ${className}`}>
        <div className="flex items-center gap-2 mb-3 text-primary-600 dark:text-primary-400 text-m font-bold uppercase tracking-wider">
            {Icon && <Icon width={20} height={20} className="text-primary-600 dark:text-primary-400" />}
            <h3>{title}</h3>
        </div>
        <div className="space-y-3">
            {children}
        </div>
    </div>
);

const InputGroup = ({ label, icon: Icon, children }: { label: string, icon?: React.ElementType, children?: React.ReactNode }) => (
    <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5 text-sm font-bold text-gray-600 dark:text-gray-300">
            {Icon && <Icon width={20} height={20} className="text-gray-500 dark:text-gray-400" />}
            <label>{label}</label>
        </div>
        {children}
    </div>
);

const RadioGroup = <T extends string>({ options, value, onChange, iconSize = 20 }: any) => {
    return (
        <div className="flex w-full shadow-sm rounded-none isolate">
            {options.map((opt: any, index: number) => (
                <button
                    key={opt.value}
                    onClick={() => onChange(opt.value)}
                    className={`relative flex-1 flex flex-col items-center justify-center py-2 px-1 text-xs font-medium transition-all gap-1.5 border-2 overflow-hidden ${index === 0 ? '' : '-ml-[2px]'} 
                    ${value === opt.value 
                        ? 'bg-primary-50 dark:bg-primary-900/40 border-primary-500 dark:border-primary-500 text-primary-700 dark:text-primary-200 z-10 font-bold' 
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200 z-0'}`}
                >
                    {opt.icon && <opt.icon width={iconSize} height={iconSize} className={value === opt.value ? 'stroke-[2.5px]' : 'stroke-2'} />}
                    <span className="text-center leading-tight truncate px-1 w-full">{opt.label}</span>
                </button>
            ))}
        </div>
    );
};

const IconCheckbox = ({ label, icon: Icon, checked, onChange, disabled }: any) => (
    <button 
        disabled={disabled}
        onClick={() => onChange(!checked)} 
        className={`flex flex-col items-center justify-center gap-1.5 px-2 py-3.5 text-xs rounded-none border-2  transition-all duration-200 w-full shadow-sm h-full 
        ${disabled 
            ? 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-600 cursor-not-allowed opacity-70' 
            : checked 
                ? 'bg-primary-50 dark:bg-primary-900/40 border-primary-500 dark:border-primary-500 text-primary-700 dark:text-primary-200 font-bold' 
                : 'bg-white  dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200'
        }`}
    >
        <Icon width={20} height={20} className={checked && !disabled ? 'stroke-[2.5px]' : 'stroke-2'} />
        <span className="font-medium text-center leading-tight whitespace-nowrap overflow-hidden text-ellipsis">{label}</span>
    </button>
);

const ToggleButton = ({ label, icon: Icon, checked, onChange, helpText, disabled = false }: any) => (
    <div className="flex flex-col gap-1">
        <button 
            onClick={() => !disabled && onChange(!checked)} 
            className={`w-full flex items-center justify-between px-3 py-3 text-sm rounded-none border-2 transition-all duration-200 group ${disabled ? 'opacity-50 cursor-not-allowed' : ''} 
            ${checked 
                ? 'bg-primary-50 dark:bg-primary-900/30 border-primary-500 dark:border-primary-500 text-primary-700 dark:text-primary-300 font-bold' 
                : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
        >
            <div className="flex items-center gap-2">{Icon && <Icon width={20} height={20} className={checked ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600'} />}<span className="font-bold text-sm">{label}</span></div>
            <div className={`w-8 h-4 rounded-full relative transition-colors ${checked ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'}`}><div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform shadow-sm ${checked ? 'translate-x-4' : ''}`} /></div>
        </button>
        {helpText && <p className="text-[10px] text-gray-400 px-1">{helpText}</p>}
    </div>
);

// Stepper Components (Using new Icons)
import { PlusIcon, MinusIcon } from './Icons';

const ControlPanel: React.FC<Props> = ({ config, onChange, onUpdateUserYaml, onExport, isProcessing, imageMeta, beadAnalysis, beadState, installPrompt, onInstall }) => {
    const [activeTab, setActiveTab] = useState<TabType>('processing');
    const [availableBrands, setAvailableBrands] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const update = (key: keyof AppConfig, value: any) => onChange({ ...config, [key]: value });
    const lang = config.language;

    useEffect(() => {
        const fetchBrands = async () => {
            let systemPal = {};
            try {
                const resp = await fetch('assets/bead_colors.default.yaml');
                let text = await resp.text();
                // Strip BOM
                text = text.replace(/^\uFEFF/, '');
                const parsed = parseBeadYaml(text);
                if (parsed) systemPal = processPaletteToInternal(parsed);
            } catch (e) { }

            let userPal = {};
            if (config.user_yaml_content) {
                const parsed = parseBeadYaml(config.user_yaml_content);
                if (parsed) userPal = processPaletteToInternal(parsed);
            }

            let final = systemPal;
            if (config.bead_source_mode === 'user') final = userPal;
            
            const brands = getBrandsFromPalette(final as any);
            setAvailableBrands(brands);

            if (config.bead_priority_brands.length === 0 && brands.length > 0) {
                update('bead_priority_brands', [brands[0]]);
            }
        };
        fetchBrands();
    }, [config.bead_source_mode, config.user_yaml_content]);

    const handleFileLoad = (e: any) => {
        const file = e.target.files?.[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            // Strip BOM just in case FileReader didn't handle it
            const cleanContent = content.replace(/^\uFEFF/, '');
            
            const parsed = parseBeadYaml(cleanContent);
            if (parsed) {
                const meta = { name: parsed.meta?.name || 'User Palette', updated_at: parsed.meta?.updated_at || '' };
                
                if (onUpdateUserYaml) {
                    // Update Cache immediately which triggers re-render of App and this component with new counts
                    onUpdateUserYaml(cleanContent, meta);
                } else {
                    onChange({
                        ...config,
                        user_yaml_content: cleanContent,
                        user_yaml_meta: meta,
                        bead_source_mode: 'user'
                    });
                }
                toast.success(`${t('userYamlLoaded', lang)} ${meta.name}`);
            } else {
                toast.error(t('invalidYaml', lang));
            }
        };
        reader.readAsText(file);
        // Reset input so same file can be selected again
        if (e.target) e.target.value = '';
    };

    const toggleBrand = (brand: string) => {
        const current = [...config.bead_priority_brands];
        const idx = current.indexOf(brand);
        if (idx > -1) current.splice(idx, 1);
        else current.push(brand);
        update('bead_priority_brands', current);
    };

    const renderProcessing = () => (
        <Section title={t('processing', lang)} icon={ImageProcessingIcon}>
            {imageMeta && (
                <div className="mb-6 bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800 rounded-none p-3">
                    <div className="flex items-center gap-2 text-primary-600 dark:text-primary-300 mb-1">
                        <ToastInfoIcon width={16} height={16} />
                        <h4 className="text-xs font-bold uppercase">{t('detectedInfo', lang)}</h4>
                    </div>
                    <div className="text-base text-gray-600 dark:text-gray-300">
                        <div className="flex justify-between border-b border-primary-100 dark:border-primary-800 pb-1 mb-1">
                            <span>{t('sourceSize', lang)}:</span>
                            <span>{Math.round(imageMeta.originalWidth / imageMeta.blockSize)} x {Math.round(imageMeta.originalHeight / imageMeta.blockSize)} px</span>
                        </div>
                        <div className="flex justify-between items-center mt-1">
                            <span>{t('detectedScale', lang)}:</span>
                            <span className="bg-primary-200 dark:bg-primary-800 text-primary-800 dark:text-primary-100 px-2 py-0.5 rounded-none text-sm font-bold shadow-sm">{imageMeta.blockSize}x</span>
                        </div>
                    </div>
                </div>
            )}
            <LabeledStepper label={t('sourceBlockSize', lang)} icon={PixelDensityIcon} value={config.custom_block_size || imageMeta?.blockSize || 1} min={1} max={100} step={1} unit="px" onChange={(v: any) => update('custom_block_size', v)}>
                {config.custom_block_size !== 0 ? (
                    <button onClick={() => update('custom_block_size', 0)} className="px-3 h-full text-xs font-bold text-primary-600 bg-primary-50 hover:bg-primary-100 dark:text-primary-300 dark:bg-primary-900/30 rounded-none border-2 border-primary-200 dark:border-primary-800 transition-colors uppercase tracking-wider" title={t('resetToAuto', lang)}>
                        {t('auto', lang)}
                    </button>
                ) : (
                    <div className="px-3 h-full flex items-center justify-center text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-none">
                        {t('auto', lang)}
                    </div>
                )}
            </LabeledStepper>
            <InputGroup label={t('autoCrop', lang)} icon={AutoCropIcon}>
                <RadioGroup options={[{ value: 'none', label: t('none', lang), icon: AutoCutNoneIcon }, { value: 'auto-transparent', label: t('transparent', lang), icon: AutoCutTransparentIcon }, { value: 'auto-white', label: t('whiteBg', lang), icon: AutoCutWhiteIcon }, { value: 'auto-black', label: t('blackBg', lang), icon: AutoCutBlackIcon }, { value: 'auto-custom', label: t('customBg', lang), icon: AutoCutCustomIcon }]} value={config.auto_crop} onChange={(v: any) => update('auto_crop', v)} />
                {config.auto_crop === 'auto-custom' && (
                    <div className="mt-2 flex items-center gap-2 border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-1">
                        <div className="relative w-8 h-8 shrink-0 overflow-hidden border border-gray-200 dark:border-gray-600">
                           <input 
                                type="color" 
                                value={config.custom_crop_color} 
                                onChange={(e) => update('custom_crop_color', e.target.value)}
                                className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] p-0 m-0 cursor-pointer z-10"
                           />
                        </div>
                        <input 
                            type="text" 
                            value={config.custom_crop_color} 
                            onChange={(e) => update('custom_crop_color', e.target.value)}
                            className="flex-1 bg-transparent text-xs font-mono font-bold text-gray-700 dark:text-gray-200 outline-none uppercase" 
                        />
                        <AutoCutCustomIcon width={20} height={20} className="text-gray-400 mr-2" />
                    </div>
                )}
            </InputGroup>
            <div className="pt-2"><ToggleButton label={t('ignoreTransparent', lang)} icon={HiddenIcon} checked={config.ignore_transparent} onChange={(v: any) => update('ignore_transparent', v)} /></div>
            <LabeledStepper 
                label={t('colorTolerance', lang)} 
                icon={ColorReductionIcon} 
                value={config.color_tolerance} 
                min={0} 
                max={100} 
                step={1} 
                onChange={(v: any) => update('color_tolerance', v)}
                badge={imageMeta?.totalColors !== undefined && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300 rounded-sm border border-primary-200 dark:border-primary-800">
                        {t('mergedColors', lang)}{imageMeta.totalColors}
                    </span>
                )}
            />
        </Section>
    );

    const renderBeadMatching = () => {
        const hasUserFile = !!config.user_yaml_content && !!config.user_yaml_meta;
        return (
        <Section title={t('beadMatching', lang)} icon={BeadMatchIcon}>
            {/* System Status Indicator */}
            {beadState && (
                <div className={`text-xs px-2 py-1 mb-4 flex justify-between items-center rounded border-2 ${beadState.systemCount > 0 ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400' : 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-green-400'}`}>
                    <span>{t('sysBeadsColor', lang)}:</span>
                    <span className="font-bold">{beadState.systemCount > 0 ? `Loaded (${beadState.systemCount})` : 'Not Loaded'}</span>
                </div>
            )}
            {beadAnalysis && (
                <div className="mb-6 bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800 rounded-none p-3">
                    <div className="flex items-center gap-2 text-primary-600 dark:text-primary-300 mb-1">
                        <ToastInfoIcon width={16} height={16} />
                        <h4 className="text-xs font-bold uppercase">{t('beadAnalysis', lang)}</h4>
                    </div>
                    <div className="text-base text-gray-600 dark:text-gray-300">
                        <div className="flex justify-between border-b border-primary-100 dark:border-primary-800 pb-1 mb-1">
                            <span>{t('matchDegree', lang)}:</span>
                            <span className="bg-primary-200 dark:bg-primary-800 text-primary-800 dark:text-primary-100 px-2 py-0.5 rounded-none text-sm font-bold shadow-sm">{beadAnalysis.accuracy || 0}%</span>
                        </div>
                        <div className="flex justify-between items-center mt-1">
                            <span>{t('missingBeads', lang)}:</span>
                            <span className={`${(beadAnalysis.missingCount || 0) > 0 ? 'text-red-500' : 'text-green-500'}`}>{beadAnalysis.missingCount || 0}</span>
                        </div>
                        {beadAnalysis.missingRefs?.length > 0 && (
                            <div className="mt-2 text-[10px] text-red-600 dark:text-red-400 font-mono leading-tight max-h-20 overflow-y-auto">
                                {beadAnalysis.missingRefs.join(', ')}
                            </div>
                        )}
                    </div>
                </div>
            )}
            <InputGroup label={t('beadSourceRange', lang)} icon={MatchScopeIcon}>
                <RadioGroup
                    value={config.bead_source_mode}
                    onChange={(v: any) => {
                        if (v === 'none') {
                            onChange({ ...config, bead_matching_enabled: false, bead_source_mode: 'none' });
                        } else {
                            onChange({ ...config, bead_matching_enabled: true, bead_source_mode: v });
                        }
                    }}
                    options={[
                        { value: 'none', label: t('noMatch', lang), icon: ScopeNoneIcon },
                        { value: 'system', label: t('sysOnly', lang), icon: ScopeSystemIcon },
                        { value: 'user', label: t('userOnly', lang), icon: ScopeUserIcon }
                    ]}
                />
                
                {/* Always show upload area if mode is user, OR if user has uploaded a file (so they can replace it even in system mode to apply patches) */}
                {(config.bead_source_mode === 'user' || hasUserFile) && (
                    <div className={`mt-3 transition-all ${hasUserFile ? 'flex gap-2 h-20' : ''}`}>
                         {/* Upload/Replace Area */}
                        <div 
                            className={`border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-none bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer group flex flex-col items-center justify-center relative
                            ${hasUserFile ? 'w-[30%] p-0' : 'w-full p-6 h-20'}`}
                            onClick={() => fileInputRef.current?.click()}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                                e.preventDefault();
                                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                    const file = e.dataTransfer.files[0];
                                    if (file.name.endsWith('.yaml') || file.name.endsWith('.yml')) {
                                        const reader = new FileReader();
                                        reader.onload = (event) => {
                                            const content = event.target?.result as string;
                                            // Strip BOM
                                            const cleanContent = content.replace(/^\uFEFF/, '');
                                            const parsed = parseBeadYaml(cleanContent);
                                            if (parsed) {
                                                const meta = { name: parsed.meta?.name || 'User Palette', updated_at: parsed.meta?.updated_at || '' };
                                                
                                                if (onUpdateUserYaml) {
                                                    onUpdateUserYaml(cleanContent, meta);
                                                } else {
                                                    onChange({
                                                        ...config,
                                                        user_yaml_content: cleanContent,
                                                        user_yaml_meta: meta,
                                                        // Automatically switch to user mode if uploaded
                                                        bead_source_mode: 'user'
                                                    });
                                                }
                                                toast.success(`${t('userYamlLoaded', lang)} ${meta.name}`);
                                            } else {
                                                toast.error(t('invalidYaml', lang));
                                            }
                                        };
                                        reader.readAsText(file);
                                    } else {
                                        toast.error(t('invalidYaml', lang));
                                    }
                                }
                            }}
                            title={hasUserFile ? "Replace file" : "Upload YAML"}
                        >
                             <FileCreateIcon className={`text-gray-400 dark:text-gray-500 transition-colors group-hover:text-primary-500 ${hasUserFile ? 'w-6 h-6' : 'w-8 h-8 mb-2'}`} />
                             {!hasUserFile && <div className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">YAML</div>}
                             {hasUserFile && <div className="absolute inset-0 bg-black/5 dark:bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"></div>}
                        </div>

                         {/* Info Display Area (70%) */}
                         {hasUserFile && (
                            <div className="w-[70%] bg-primary-50 dark:bg-primary-900/20 border-2 border-primary-100 dark:border-primary-800 p-2.5 flex flex-col justify-center gap-1.5 relative overflow-hidden">
                                <FileCreateFillIcon className="absolute -right-2 -bottom-2 w-12 h-12 text-primary-200 dark:text-primary-800 opacity-20 rotate-12 pointer-events-none" />
                                
                                <div className="relative z-10">
                                    <div className="text-[10px] uppercase text-primary-400 font-bold leading-none mb-0.5">Name</div>
                                    <div className="font-bold text-sm text-primary-800 dark:text-primary-100 truncate pr-2" title={config.user_yaml_meta!.name}>
                                        {config.user_yaml_meta!.name}
                                    </div>
                                </div>
                                <div className="relative z-10 flex items-center gap-2">
                                    <div className="text-[10px] uppercase text-primary-400 font-bold leading-none">{t('inventoryCount', lang)}</div>
                                    <div className="font-mono text-xs font-bold bg-white dark:bg-gray-800 px-1.5 py-0.5 rounded border-2 border-primary-100 dark:border-primary-800 text-gray-600 dark:text-gray-300 shadow-sm">
                                        {beadState?.userCount || 0}
                                    </div>
                                </div>
                            </div>
                         )}
                    </div>
                )}
            <input type="file" accept=".yaml,.yml" className="hidden" ref={fileInputRef} onChange={handleFileLoad} />
            </InputGroup>
            
            <div className="space-y-2">
                <ToggleButton
                    label={t('originalColor', lang)}
                    icon={config.show_original_color ? OriginalColorIcon : OriginalColorIcon}
                    checked={config.show_original_color}
                    onChange={(v: any) => update('show_original_color', v)}
                    disabled={config.bead_source_mode === 'none'}
                />
            </div>
            
            <div className="pt-2">
                <InputGroup label={t('algorithm', lang)} icon={ColorDifferenceIcon}>
                    <RadioGroup<BeadDistanceAlgorithm>
                        value={config.bead_distance_algorithm || 'deltaE2000'}
                        onChange={(v: BeadDistanceAlgorithm) => update('bead_distance_algorithm', v)}
                        options={[
                            { value: 'deltaE2000', label: t('algo2000', lang) },
                            { value: 'deltaE76', label: t('algo76', lang) },
                            { value: 'rgb', label: t('algoRGB', lang) }
                        ]}
                    />
                </InputGroup>
            </div>

            <div className="space-y-2 mt-4">
                <div className="flex justify-between text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-tighter">
                    <span>{t('precision', lang)}</span>
                    <span className="font-mono text-primary-500">{getDeltaELabel(config.bead_accuracy_threshold)}</span>
                    <span>{t('completeness', lang)}</span>
                </div>
                <div className="relative flex items-center h-8">
                    <input
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        value={config.bead_accuracy_threshold}
                        onChange={(e) => update('bead_accuracy_threshold', parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-none appearance-none cursor-pointer dark:bg-gray-700 accent-primary-600"
                    />
                    <div className="absolute left-0 top-6 text-[10px] text-gray-400 font-mono">{t('strict', lang)}</div>
                    <div className="absolute right-0 top-6 text-[10px] text-gray-400 font-mono">{t('loose', lang)}</div>
                </div>
            </div>
            <InputGroup label={t('priorityBrands', lang)} icon={BrandsIcon}>
                <div className="flex flex-wrap gap-2">
                    {availableBrands.map(brand => (
                        <button
                            key={brand}
                            onClick={() => toggleBrand(brand)}
                            className={`px-2 py-1 text-[10px] font-bold border-2 transition-colors ${config.bead_priority_brands.includes(brand) ? 'bg-primary-600 border-primary-700 text-white shadow-sm' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 hover:border-primary-400'}`}
                        >
                            {brand}
                        </button>
                    ))}
                </div>
                <div className="bg-white dark:bg-gray-950 p-2 border-2 border-gray-100 dark:border-gray-800 text-[10px] text-gray-500 flex items-start gap-1.5 leading-tight">
                    <ToastInfoIcon width={14} height={14} className="shrink-0 text-primary-500 mt-0.5" />
                    <span>{t('multipleBrandsHint', lang)}</span>
                </div>
            </InputGroup>
        </Section>
    );
    };

    const renderBlueprintSettings = () => (
        <Section title={t('appearance', lang)} icon={BlueprintIcon}>
            <LabeledStepper label={t('scale', lang)} icon={ScaleIcon} value={config.scale} min={10} max={200} step={5} unit="px" onChange={(v: any) => update('scale', v)} />
            <LabeledStepper label={t('margin', lang)} icon={MarginIcon} value={config.margin} min={0} max={200} step={10} unit="px" onChange={(v: any) => update('margin', v)} />
            <InputGroup label={t('position', lang)} icon={LegendPositionIcon}><RadioGroup value={config.legend_position} onChange={(v: any) => update('legend_position', v)} options={[{ value: 'top', label: t('top', lang), icon: PositionTopIcon }, { value: 'bottom', label: t('bottom', lang), icon: PositionBottomIcon }, { value: 'left', label: t('left', lang), icon: PositionLeftIcon }, { value: 'right', label: t('right', lang), icon: PositionRightIcon }]} /></InputGroup>
            <div className="mt-4 pt-4 border-t-2 border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2 mb-2 text-sm font-bold text-gray-600 dark:text-gray-300"><DrawingContentIcon width={20} height={20} className="text-gray-500 dark:text-gray-400" /><span>{t('displaySettings', lang)}</span></div>
                <div className="grid grid-cols-3 gap-2 py-1">
                    <IconCheckbox label={t('grid', lang)} icon={DrawGridIcon} checked={config.show_grid} onChange={(v: any) => update('show_grid', v)} />
                    <IconCheckbox label={t('coords', lang)} icon={DrawCoordinatesIcon} checked={config.show_coordinates} onChange={(v: any) => update('show_coordinates', v)} />
                    <IconCheckbox label={t('showHex', lang)} icon={DrawColorValueIcon} checked={config.show_color_value} onChange={(v: any) => update('show_color_value', v)} disabled={config.bead_source_mode !== 'none'} />
                </div>
                {config.show_color_value && config.bead_source_mode === 'none' && (
                    <div className="mb-2 mt-2">
                        <RadioGroup<ColorFormat>
                            iconSize={24}
                            value={config.color_format}
                            onChange={(v: any) => update('color_format', v)}
                            options={[
                                { value: 'hex', label: 'HEX', icon: ColorFormatHexIcon },
                                { value: 'hsb', label: 'HSB', icon: ColorFormatHsbIcon },
                            ]}
                        />
                    </div>
                )}
            </div>
            <LabeledStepper label={t('majorGrid', lang)} icon={MajorGridIntervalIcon} value={config.major_grid_interval || 5} min={3} max={50} step={1} onChange={(v: any) => update('major_grid_interval', v)} />
            <div className="mt-4"><InputGroup label={t('sortOrder', lang)} icon={SortIcon}><RadioGroup value={config.legend_sort} onChange={(v: any) => update('legend_sort', v)} options={[{ value: 'by_count', label: t('count', lang), icon: SortCountIcon }, { value: 'by_index', label: t('index', lang), icon: SortIndexIcon }, { value: 'by_brightness', label: t('brightness', lang), icon: SortBrightnessIcon }, { value: 'by_hue', label: t('hue', lang), icon: SortHueIcon }]} /></InputGroup></div>
        </Section>
    );

    return (
        <div className="w-full md:w-80 bg-white dark:bg-gray-900 border-t-2 md:border-t-0 md:border-l-2 border-gray-200 dark:border-gray-800 h-full overflow-hidden flex flex-col shadow-lg z-30">
            <div className="flex md:hidden border-b-2 border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0">{[{ id: 'processing', icon: ImageProcessingIcon, label: t('tabProcess', lang) }, { id: 'bead', icon: BeadMatchIcon, label: t('tabBeadColor', lang) }, { id: 'appearance', icon: BlueprintIcon, label: t('tabAppearance', lang) }].map((tab) => (<button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex-1 py-2 text-xs font-medium flex flex-row items-center justify-center gap-1 border-b-2 ${activeTab === tab.id ? 'text-primary-600 dark:text-primary-400 border-primary-600 dark:border-primary-400 bg-primary-50 dark:bg-primary-900/10' : 'text-gray-500 dark:text-gray-400 border-transparent'}`}><tab.icon width={16} height={16} /><span>{tab.label}</span></button>))}</div>
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar"><div className="md:block hidden">{renderProcessing()}{renderBeadMatching()}{renderBlueprintSettings()}</div><div className="md:hidden">{activeTab === 'processing' && renderProcessing()}{activeTab === 'bead' && renderBeadMatching()}{activeTab === 'appearance' && renderBlueprintSettings()}</div></div>
            <div style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }} className="p-4 border-t-2 border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0 z-10 space-y-2">{installPrompt && <button onClick={onInstall} className="w-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-white font-bold py-2 px-4 rounded-none shadow-sm transition-all flex items-center justify-center gap-2 border-2 border-gray-300 dark:border-gray-600"><DownloadInstallIcon width={16} height={16} /><span>{t('pwaInstallShort', lang)}</span></button>}<button onClick={onExport} disabled={isProcessing} className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-none shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2">{isProcessing ? <PixelSpinnerIcon width={20} height={20} className="animate-pixel-spin" /> : <ExportSaveIcon width={20} height={20} />}{isProcessing ? t('processingBtn', lang) : t('download', lang)}</button></div>
        </div>
    );
};

const LabeledStepper = ({ label, icon: Icon, value, min, max, step, unit = '', onChange, children, badge }: any) => {
    const [inputValue, setInputValue] = useState(value.toString());
    useEffect(() => { setInputValue(value.toString()); }, [value]);
    const commitChange = (val: string) => {
        let num = parseFloat(val); if (isNaN(num)) num = min; num = Math.max(min, Math.min(max, num));
        onChange(num); setInputValue(num.toString());
    };
    return (
        <div className="flex flex-col gap-2 py-2">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-bold text-gray-600 dark:text-gray-300">
                    <Icon width={20} height={20} className="text-gray-500 dark:text-gray-400" />
                    <span>{label}</span>
                </div>
                {badge}
            </div>
            <div className="flex items-center gap-2 h-10 w-full">{children}<div className="flex flex-1 items-center border-2 border-gray-300 dark:border-gray-600 rounded-none bg-white dark:bg-gray-800 h-full overflow-hidden shadow-sm"><button onClick={() => onChange(Math.max(min, value - step))} disabled={value <= min} className="w-10 h-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 disabled:opacity-30 border-r-2 border-gray-200 dark:border-gray-700"><MinusIcon width={20} height={20} /></button><div className="flex-1 flex items-center justify-center relative h-full bg-gray-50/50 dark:bg-gray-900/20"><input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} onBlur={() => commitChange(inputValue)} onKeyDown={(e) => e.key === 'Enter' && commitChange(inputValue)} className="w-full h-full bg-transparent text-center text-lg font-medium text-gray-800 dark:text-gray-100 outline-none px-10" /><span className="absolute right-3 text-xs text-gray-400 pointer-events-none">{unit}</span></div><button onClick={() => onChange(Math.min(max, value + step))} disabled={value >= max} className="w-10 h-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 disabled:opacity-30 border-l-2 border-gray-200 dark:border-gray-700"><PlusIcon width={20} height={20} /></button></div></div>
        </div>
    );
};

export default ControlPanel;
