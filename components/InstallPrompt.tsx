
import React, { useEffect, useState } from 'react';
import { t } from '../utils/translations';
import { Language } from '../types';
import { LogoIcon, DownloadInstallIcon } from './Icons';

interface Props {
    lang: Language;
    deferredPrompt: any;
    onInstall: () => void;
}

export const InstallPrompt: React.FC<Props> = ({ lang, deferredPrompt, onInstall }) => {
    const [isDismissed, setIsDismissed] = useState(true);

    useEffect(() => {
        // Only show if prompt exists AND user hasn't dismissed it
        const hasDismissed = localStorage.getItem('pixler_pwa_dismissed');
        if (deferredPrompt && !hasDismissed) {
            setIsDismissed(false);
        }
    }, [deferredPrompt]);

    const handleDismiss = () => {
        setIsDismissed(true);
        localStorage.setItem('pixler_pwa_dismissed', 'true');
    };

    // If prompt is null OR user dismissed it, don't show the sticky banner.
    // Note: The manual install button in ControlPanel will STILL work if deferredPrompt exists.
    if (!deferredPrompt || isDismissed) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-[100] p-4 md:p-6 flex justify-center animate-in slide-in-from-bottom duration-500 pointer-events-none">
            <div className="bg-white dark:bg-gray-800 rounded-none shadow-2xl border border-gray-200 dark:border-gray-700 p-4 w-full max-w-lg flex items-center justify-between gap-4 pointer-events-auto ring-1 ring-black/5">
                <div className="flex items-center gap-3">
                    <div className="bg-primary-500 p-2 text-white shadow-sm">
                        <LogoIcon width={24} height={24} />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 dark:text-white text-sm">{t('pwaTitle', lang)}</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t('pwaDesc', lang)}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={handleDismiss}
                        className="px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                    >
                        {t('pwaLater', lang)}
                    </button>
                    <button
                        onClick={onInstall}
                        className="bg-primary-600 hover:bg-primary-700 text-white px-3 py-1.5 text-xs font-bold shadow-sm flex items-center gap-1.5"
                    >
                        <DownloadInstallIcon width={14} height={14} />
                        {t('pwaInstall', lang)}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InstallPrompt;
