import React, { useState, useEffect } from 'react';
import { AppConfig, ProcessedImage, BeadPaletteItem } from './types';
import { DEFAULT_CONFIG } from './constants';
import { processImage } from './services/processor';
import ControlPanel from './components/ControlPanel';
import CanvasRenderer from './components/CanvasRenderer';
import ImageUploader from './components/ImageUploader';
import Navbar from './components/Navbar';
import AboutPage from './components/AboutPage';
import ManualPage from './components/ManualPage';
import BeadEditor from './components/BeadEditor';
import InstallPrompt from './components/InstallPrompt';
import { ReloadIcon, ToastInfoIcon, ToastCheckIcon, ToastWarningIcon, ToastErrorIcon } from './components/Icons';
import { t } from './utils/translations';
import { parseBeadYaml, processPaletteToInternal } from './utils/beadUtils';
import { ToastContainer, Slide } from 'react-toastify';

// 添加缓存键常量
const STORAGE_KEYS = {
  SYSTEM_BEADS: 'pixler_system_beads',
  USER_BEADS: 'pixler_user_beads'
};

const App: React.FC = () => {
    // Workaround for mobile viewport-height issues (address bar/toolbars)
    // Sets --vh = 1% of the window innerHeight so we can use it instead of 100vh.
    React.useEffect(() => {
        const setVh = () => {
            try {
                document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
            } catch (e) {
                // ignore in environments without document
            }
        };

        setVh();
        window.addEventListener('resize', setVh);
        window.addEventListener('orientationchange', setVh);
        return () => {
            window.removeEventListener('resize', setVh);
            window.removeEventListener('orientationchange', setVh);
        };
    }, []);
    
    // 添加豆色缓存状态. User cache now stores { data (inventory), patches (overrides), meta }
    const [beadCaches, setBeadCaches] = useState({
        system: null as { data: Record<string, BeadPaletteItem>; meta: { name: string; updated_at: string } } | null,
        user: null as { 
            data: Record<string, BeadPaletteItem>; 
            patches?: Record<string, Record<string, string>>;
            meta: { name: string; updated_at: string } 
        } | null,
        isSystemLoaded: false
    });
    
    // 预加载系统默认豆色 - 优先从服务器获取以保证数据最新
    useEffect(() => {
        const loadSystemBeads = async () => {
            console.log("[App] Initializing System Beads...");
            // 尝试多个可能的路径
            const paths = ['assets/bead_colors.default.yaml', 'bead_colors.default.yaml'];
            let fetched = false;

            for (const path of paths) {
                try {
                    const resp = await fetch(path);
                    //console.log(`[App] Trying fetch path: ${path}, Status: ${resp.status}`);
                    
                    if (resp.ok) {
                        let text = await resp.text();
                        // 关键修复：去除 BOM 头 (Byte Order Mark)
                        text = text.replace(/^\uFEFF/, '');
                        
                        const parsed = parseBeadYaml(text);
                        if (parsed) {
                            const processedData = processPaletteToInternal(parsed);
                            // Double check data is valid
                            if (Object.keys(processedData).length > 0) {
                                const beadData = {
                                    data: processedData,
                                    meta: parsed.meta as { name: string; updated_at: string }
                                };
                                
                                try {
                                    localStorage.setItem(STORAGE_KEYS.SYSTEM_BEADS, JSON.stringify(beadData));
                                } catch (e) {
                                    console.warn("[App] Storage quota exceeded, skipping cache save.");
                                }
                                
                                console.log(`[App] System beads parsed successfully. Count: ${Object.keys(processedData).length}`);
                                setBeadCaches(prev => ({
                                    ...prev,
                                    system: beadData,
                                    isSystemLoaded: true
                                }));
                                fetched = true;
                                break; 
                            } else {
                                console.error("[App] Parsed data is empty.");
                            }
                        } else {
                            console.error("[App] Failed to parse YAML structure.");
                        }
                    }
                } catch (e) {
                    console.warn(`[App] Failed to fetch from ${path}`, e);
                }
            }

            if (!fetched) {
                console.warn('[App] All network fetch/parse attempts failed. Checking cache...');
                // 如果所有网络请求失败，尝试从缓存加载
                const cached = localStorage.getItem(STORAGE_KEYS.SYSTEM_BEADS);
                if (cached) {
                    try {
                        const parsed = JSON.parse(cached);
                        // Validate cache structure
                        if (parsed && parsed.data && Object.keys(parsed.data).length > 0) {
                             console.log(`[App] System beads loaded from local storage. Count: ${Object.keys(parsed.data).length}`);
                             setBeadCaches(prev => ({
                                ...prev,
                                system: parsed,
                                isSystemLoaded: true
                             }));
                        } else {
                             console.warn("[App] Cache invalid, clearing.");
                             localStorage.removeItem(STORAGE_KEYS.SYSTEM_BEADS);
                             setBeadCaches(prev => ({ ...prev, isSystemLoaded: false, system: null }));
                        }
                    } catch (e) {
                        console.error("[App] Failed to parse cached beads", e);
                        localStorage.removeItem(STORAGE_KEYS.SYSTEM_BEADS);
                        setBeadCaches(prev => ({ ...prev, isSystemLoaded: false, system: null }));
                    }
                } else {
                    console.warn("[App] No system beads available (Network failed & Cache missing).");
                    setBeadCaches(prev => ({ ...prev, isSystemLoaded: false, system: null }));
                }
            }
        };
        
        loadSystemBeads();
    }, []);
    
    // 初始化配置：合并默认配置与本地存储的配置，确保新字段（如 bead_priority_brands）存在
    const [config, setConfig] = useState<AppConfig>(() => {
        const saved = localStorage.getItem('pixelAnnotatorConfig');
        return saved ? { ...DEFAULT_CONFIG, ...JSON.parse(saved) } : DEFAULT_CONFIG;
    });

    // 处理用户豆色缓存更新
    const updateUserBeadCache = (content: string, meta: { name: string; updated_at: string }) => {
        console.log("[App] Updating User Bead Cache...");
        const parsed = parseBeadYaml(content);
        if (parsed) {
            // Process the 'has_brands' inventory
            const processedData = processPaletteToInternal(parsed);
            
            if (Object.keys(processedData).length > 0) {
                const beadData = {
                    data: processedData, // Inventory
                    patches: parsed.patch_brands, // Patches
                    meta
                };
                
                // 保存到本地缓存
                try {
                    localStorage.setItem(STORAGE_KEYS.USER_BEADS, JSON.stringify(beadData));
                } catch (e) {
                    console.warn("[App] LocalStorage full, user beads only stored in memory.");
                }

                const totalBeads = Object.values(processedData).reduce((acc, item) => acc + item.refs.length, 0);
                console.log(`[App] User beads updated. Inventory Colors: ${Object.keys(processedData).length}, Patches: ${parsed.patch_brands ? Object.keys(parsed.patch_brands).length : 0} brands`);
                
                setBeadCaches(prev => ({
                    ...prev,
                    user: beadData
                }));

                // Update config as well so it persists across sessions within the config object
                setConfig(prev => ({
                    ...prev,
                    user_yaml_content: content,
                    user_yaml_meta: meta,
                    bead_source_mode: 'user' // Auto switch to user mode when updated
                }));

            } else {
                alert(t('invalidYaml', config.language));
            }
        }
    };
    
    // 清除用户豆色缓存
    const clearUserBeadCache = () => {
        localStorage.removeItem(STORAGE_KEYS.USER_BEADS);
        setBeadCaches(prev => ({ ...prev, user: null }));
    };

    const [currentFile, setCurrentFile] = useState<File | null>(null);
    const [processedData, setProcessedData] = useState<ProcessedImage | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [canvasRef, setCanvasRef] = useState<HTMLCanvasElement | null>(null);
    const [activeTab, setActiveTab] = useState<'editor' | 'about' | 'bead_editor' | 'manual'>('editor');

    // PWA Install Prompt State
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

    // Persistence (Auto-save)
    useEffect(() => {
        try {
            localStorage.setItem('pixelAnnotatorConfig', JSON.stringify(config));
        } catch (e) {
            console.warn("Failed to save config to localStorage (quota exceeded?)");
        }
    }, [config]);
    
    // 初始化时，如果Config里有用户豆色，加载它
    // Note: We duplicate logic slightly with updateUserBeadCache but this handles initial load synchronization
    useEffect(() => {
        if (config.user_yaml_content && config.user_yaml_meta && !beadCaches.user) {
             const parsed = parseBeadYaml(config.user_yaml_content);
             if (parsed) {
                 const processedData = processPaletteToInternal(parsed);
                 if (Object.keys(processedData).length > 0) {
                     setBeadCaches(prev => ({
                        ...prev,
                        user: {
                            data: processedData,
                            patches: parsed.patch_brands,
                            meta: config.user_yaml_meta!
                        }
                     }));
                 }
             }
        }
    }, []); // Only on mount/initial config load
    
    // 图片处理函数
    const handleFileSelect = async (file: File) => {
        console.log("[App] File selected:", file.name);
        setCurrentFile(file);
        setConfig(prev => ({
            ...prev,
            title: file.name.split('.')[0],
            custom_block_size: 0
        }));
        
        // Processing will be triggered by the useEffect below
    };

    // PWA Event Listener (Global)
    useEffect(() => {
        // Debug: Reset dismissed state in dev mode to allow testing
       
        const handler = (e: any) => {
            e.preventDefault();
            console.log('👋 [PWA] "beforeinstallprompt" event fired! The app is installable.');
            setDeferredPrompt(e);
        };

        window.addEventListener('beforeinstallprompt', handler);

        const installHandler = () => {
            console.log('✅ [PWA] App installed successfully');
            setDeferredPrompt(null);
        };
        window.addEventListener('appinstalled', installHandler);

        if (window.matchMedia('(display-mode: standalone)').matches) {
            console.log('✅ [PWA] Running in standalone mode (Installed)');
        } else {
            console.log('ℹ️ [PWA] Running in browser mode');
        }

        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
            window.removeEventListener('appinstalled', installHandler);
        };
    }, []);

    const handleInstallClick = async () => {
        console.log("🖱️ Install button clicked");

        if (!deferredPrompt) {
            alert("Installation dialog not available. Check if the app is already installed or if using localhost.");
            return;
        }

        try {
            console.log("🚀 Calling prompt()...");

            // Fire the prompt. We DO NOT await it here to prevent blocking if the browser hangs.
            deferredPrompt.prompt();

            // Fallback UI helper for Linux Chrome behavior
            const helpTimeout = setTimeout(() => {
                console.log("⚠️ Install dialog might be hidden or icon-only.");
                // Only alert if we haven't received a user choice yet (implied by execution flow)
                // Note: We can't easily know if the dialog is visible, but this helps stuck users.
            }, 2000);

            console.log("⏳ Waiting for user choice...");

            // Wait for the user to click "Install" or "Cancel"
            const { outcome } = await deferredPrompt.userChoice;

            clearTimeout(helpTimeout);
            console.log(`User response to install prompt: ${outcome}`);

            setDeferredPrompt(null);

        } catch (error) {
            console.error("❌ Error during installation flow:", error);
            alert("Installation failed. Please check console logs.");
        }
    };

    // Theme Handling
    useEffect(() => {
        const root = document.documentElement;
        const applyTheme = (theme: 'dark' | 'light') => {
            if (theme === 'dark') {
                root.classList.add('dark');
            } else {
                root.classList.remove('dark');
            }
        };

        if (config.theme === 'auto') {
            const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            applyTheme(systemDark ? 'dark' : 'light');

            const listener = (e: MediaQueryListEvent) => applyTheme(e.matches ? 'dark' : 'light');
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            mediaQuery.addEventListener('change', listener);
            return () => mediaQuery.removeEventListener('change', listener);
        } else {
            applyTheme(config.theme);
        }
    }, [config.theme]);

    // Font Handling based on Language
    useEffect(() => {
        const body = document.body;
        body.classList.remove('font-zh', 'font-ja', 'font-en');

        if (config.language === 'zh') {
            body.classList.add('font-zh');
        } else if (config.language === 'ja') {
            body.classList.add('font-ja');
        } else {
            body.classList.add('font-en');
        }
    }, [config.language]);

    // Re-process image
    useEffect(() => {
        if (!currentFile) return;

        const runProcessing = async () => {
            console.log("[App] Triggering image processing...", {
                beadMode: config.bead_source_mode,
                hasSystemBeads: !!beadCaches.system,
                hasUserBeads: !!beadCaches.user,
                systemBeadCount: beadCaches.system ? Object.keys(beadCaches.system.data).length : 0,
                beadMatchingEnabled: config.bead_matching_enabled
            });

            setIsProcessing(true);
            try {
                // 传递缓存的豆色数据
                // Pass raw patches and inventory to processor
                const cachedBeads = {
                    system: beadCaches.system?.data,
                    user: beadCaches.user?.data,
                    patches: beadCaches.user?.patches
                };
                
                const data = await processImage(currentFile, config, cachedBeads);

                const SAFE_LIMIT = 16000;
                const estimatedW = data.width * config.scale + (config.margin * 2);
                const estimatedH = data.height * config.scale + (config.margin * 2);

                if (estimatedW > SAFE_LIMIT || estimatedH > SAFE_LIMIT) {
                    const maxDim = Math.max(data.width, data.height);
                    const safeScale = Math.floor((SAFE_LIMIT - (config.margin * 2)) / maxDim);
                    const newScale = Math.max(1, safeScale);

                    if (newScale < config.scale) {
                        setConfig(prev => ({ ...prev, scale: newScale }));
                        alert(t('canvasSizeWarning', config.language));
                    }
                }

                setProcessedData(data);
                console.log("[App] Image processing complete.");
            } catch (err: any) {
                console.error("Processing failed", err);
                if (err.message && err.message.includes('too large')) {
                    alert(err.message);
                } else {
                    console.error('Image processing error:', err);
                    alert('Image processing error. Please try another image.');
                }
            } finally {
                setIsProcessing(false);
            }
        };

        runProcessing();
    }, [currentFile, config, beadCaches]); // 添加 beadCaches 依赖，确保加载完豆色后自动刷新

    const handleExport = () => {
        if (!canvasRef) return;
        localStorage.setItem('pixelAnnotatorConfig', JSON.stringify(config));

        const now = new Date();
        const timestamp =
            now.getFullYear().toString() +
            (now.getMonth() + 1).toString().padStart(2, '0') +
            now.getDate().toString().padStart(2, '0') +
            now.getHours().toString().padStart(2, '0') +
            now.getMinutes().toString().padStart(2, '0') +
            now.getSeconds().toString().padStart(2, '0');

        const link = document.createElement('a');
        link.download = `${config.title || 'pixel-art'}_Pixler_${timestamp}.png`;
        link.href = canvasRef.toDataURL('image/png');
        link.click();
    };

    return (
        <div className="flex flex-col w-screen bg-gray-100 dark:bg-gray-950 text-gray-900 dark:text-gray-100 overflow-hidden"
             style={{ height: 'calc(var(--vh, 1vh) * 100)' }}>

            <Navbar config={config} onChange={setConfig} activeTab={activeTab} onTabChange={setActiveTab} />
            
            {/* Editor Tab (Persisted) */}
            <div className={`flex-1 flex flex-col md:flex-row overflow-hidden relative ${activeTab === 'editor' ? 'flex animate-in fade-in duration-300' : 'hidden'}`}>
                <div className="h-[35vh] md:h-full md:flex-1 relative overflow-hidden order-1 md:order-1 flex flex-col">
                    {!processedData ? (
                        <ImageUploader onImageSelect={handleFileSelect} lang={config.language} />
                    ) : (
                        <CanvasRenderer
                            data={processedData}
                            config={config}
                            onCanvasReady={setCanvasRef}
                            onReset={() => { setProcessedData(null); setCurrentFile(null); }}
                        />
                    )}
                </div>
                <div className="flex-1 md:flex-none z-20 shadow-xl order-1 md:order-2 h-full overflow-hidden">
                    <ControlPanel
                        config={config}
                        onChange={setConfig}
                        onUpdateUserYaml={updateUserBeadCache}
                        onExport={handleExport}
                        isProcessing={isProcessing}
                        imageMeta={processedData ? {
                            blockSize: processedData.blockSize,
                            originalWidth: processedData.originalWidth,
                            originalHeight: processedData.originalHeight,
                            totalColors: processedData.palette.length
                        } : null}
                        beadAnalysis={processedData?.beadAnalysis}
                        beadState={{
                            isSystemLoaded: beadCaches.isSystemLoaded,
                            systemCount: beadCaches.system ? Object.keys(beadCaches.system.data).length : 0,
                            userCount: beadCaches.user ? Object.keys(beadCaches.user.data).length : 0
                        }}
                        installPrompt={deferredPrompt}
                        onInstall={handleInstallClick}
                    />
                </div>
            </div>

            {/* Bead Editor Tab (Persisted) */}
            <div className={`flex-1 flex flex-col overflow-hidden relative ${activeTab === 'bead_editor' ? 'flex animate-in fade-in duration-300' : 'hidden'}`}>
                <BeadEditor 
                    lang={config.language}
                    systemBeads={beadCaches.system?.data || null}
                />
            </div>

            {/* Manual Tab (Persisted to keep reading position) */}
            <div className={`flex-1 flex flex-col overflow-hidden relative ${activeTab === 'manual' ? 'flex animate-in fade-in duration-300' : 'hidden'}`}>
                <ManualPage lang={config.language} />
            </div>

            {/* About Tab (Not persisted as it is static and simple) */}
            {activeTab === 'about' && (
                <AboutPage lang={config.language} />
            )}

            <InstallPrompt
                lang={config.language}
                deferredPrompt={deferredPrompt}
                onInstall={handleInstallClick}
            />
            
            <ToastContainer 
                position="bottom-center"
                autoClose={3000} 
                hideProgressBar={true} 
                newestOnTop={false} 
                closeOnClick 
                rtl={false} 
                pauseOnFocusLoss 
                draggable 
                pauseOnHover 
                theme="dark"
                transition={Slide}
                icon={({ type }) => {
                    switch (type) {
                        case 'info': return <ToastInfoIcon width={24} height={24} className="text-blue-400" />;
                        case 'success': return <ToastCheckIcon width={24} height={24} className="text-green-400" />;
                        case 'warning': return <ToastWarningIcon width={24} height={24} className="text-amber-400" />;
                        case 'error': return <ToastErrorIcon width={24} height={24} className="text-red-400" />;
                        default: return null;
                    }
                }}
            />
        </div>
    );
};

export default App;