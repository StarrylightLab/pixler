
import React from 'react';
import { HeartIcon, LogoIcon, PixelDensityIcon, ColorReductionIcon, ScaleIcon, AutoCropIcon, MajorGridIntervalIcon, BeadMatchIcon, CheckedIcon } from './Icons';
import { t } from '../utils/translations';
import { Language } from '../types';

// Images are in the public folder, so we reference them from root URL
const alipayQrImg = 'pixler/alipay-qrcode.png';
const wechatQrImg = 'pixler/wechat-dashang.png';

interface Props {
  lang: Language;
}

const AboutPage: React.FC<Props> = ({ lang }) => {
  const featureList = t('feature1Desc', lang).split('\n');

  // Mapping features to icons based on index/order in translation file
  const icons = [
    { type: 'text', content: 'PWA' }, // PWA Support
    { type: 'icon', component: PixelDensityIcon }, // Auto-detect scale
    { type: 'icon', component: ColorReductionIcon }, // Color tolerance
    { type: 'icon', component: ScaleIcon }, // Free scaling
    { type: 'icon', component: AutoCropIcon }, // Auto-crop
    { type: 'icon', component: MajorGridIntervalIcon }, // Grid size
    { type: 'icon', component: BeadMatchIcon }, // Perler Match (Palette icon)
  ];

  const handleDownloadWechat = async () => {
    try {
      const response = await fetch(wechatQrImg);
      const blob = await response.blob();
      // Force application/octet-stream to prevent iOS from opening the image directly
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/octet-stream' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'wechat-dashang.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => window.URL.revokeObjectURL(url), 100);
    } catch (e) {
      console.error('Download failed, falling back to direct link', e);
      const link = document.createElement('a');
      link.href = wechatQrImg;
      link.download = 'wechat-dashang.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleDownloadWechatLegacy = () => {
    const link = document.createElement('a');
    link.href = wechatQrImg;
    link.download = 'wechat-dashang.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 w-full h-full overflow-y-auto bg-gray-50 dark:bg-gray-950 p-4 md:p-8 custom-scrollbar">
      <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
        
        {/* Hero Section */}
        <div className="bg-white dark:bg-gray-900 rounded-none p-8 shadow-sm border border-gray-200 dark:border-gray-800 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-primary-600 dark:bg-primary text-[#FFEEE5] dark:text-[#FFEEE5] rounded-none mb-6 shadow-inner">
                <LogoIcon width={56} height={56} />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Pixler
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-xl mx-auto leading-relaxed">
                {t('aboutDesc', lang)}
            </p>
        </div>

        {/* Feature Section */}
        <div className="bg-white dark:bg-gray-900 rounded-none p-6 shadow-sm border border-gray-200 dark:border-gray-800 flex flex-col w-full">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 border-b border-gray-100 dark:border-gray-800 pb-4 text-center md:text-left">
               {t('feature1Title', lang)}
            </h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {featureList.map((feature, idx) => {
                 const iconData = icons[idx] || { type: 'icon', component: CheckedIcon };
                 return (
                   <div key={idx} className="flex flex-col items-center text-center p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 transition-hover hover:bg-white dark:hover:bg-gray-800 hover:shadow-md group">
                      <div className="w-14 h-14 mb-3 flex items-center justify-center text-primary-600 dark:text-primary-400 bg-white dark:bg-gray-900 rounded-full shadow-sm group-hover:scale-110 transition-transform duration-200 border border-gray-100 dark:border-gray-700">
                         {iconData.type === 'text' ? (
                            <span className="font-black text-xl tracking-tighter select-none">{iconData.content}</span>
                         ) : (
                            // @ts-ignore
                            <iconData.component width={32} height={32} strokeWidth={1.5} />
                         )}
                      </div>
                      <span className="text-sm font-bold text-gray-700 dark:text-gray-300 leading-tight">{feature}</span>
                   </div>
                 );
              })}
            </div>
        </div>

        {/* Donation Section */}
        <div className="bg-primary-50 dark:bg-primary-900/10 rounded-none p-8 border border-primary-100 dark:border-primary-900/30 text-center">
             
             <HeartIcon width={32} height={32} className="mx-auto text-red-500 fill-red-500 mb-4" />
             <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                 {t('donateTitle', lang)}
             </h2>
             <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                 {t('donateDesc', lang)}
             </p>
             
             <div className="flex flex-col sm:flex-row items-center justify-center gap-8">
                {/* Alipay */}
                <a 
                   href="https://qr.alipay.com/fkx134307aou47iqfdysy0c"
                   target="_blank"
                   rel="noopener noreferrer" 
                   className="flex flex-col items-center gap-2 group cursor-pointer"
                >
                   <div className="p-1 bg-white rounded-lg shadow-sm border-[5px] border-blue-500 overflow-hidden transition-transform group-hover:scale-105">
                      <img 
                        src={alipayQrImg} 
                        alt="Alipay QR Code" 
                        className="w-48 h-48 object-contain" 
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          // Improve error state visibility
                          const parent = e.currentTarget.parentElement;
                          if (parent) {
                              parent.classList.add('w-48', 'h-48', 'flex', 'items-center', 'justify-center', 'bg-gray-100', 'text-gray-400');
                              parent.innerHTML = `
                                <div class="text-center p-2">
                                  <div class="text-xs font-bold mb-1">Image Not Found</div>
                                  <div class="text-[10px] break-all">/alipay-qrcode.png</div>
                                </div>`;
                          }
                        }}
                      />
                   </div>
                   <span className="text-sm font-bold text-blue-600 dark:text-blue-400 group-hover:underline decoration-2 underline-offset-4">{t('alipayAction', lang)}</span>
                </a>

                {/* WeChat */}
                <button 
                   onClick={handleDownloadWechat}
                   className="flex flex-col items-center gap-2 group cursor-pointer"
                >
                   <div className="p-1 bg-white rounded-lg shadow-sm border-[5px] border-green-500 overflow-hidden transition-transform group-hover:scale-105">
                      <img 
                        src={wechatQrImg} 
                        alt="WeChat QR Code" 
                        className="w-48 h-48 object-contain bg-white" 
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const parent = e.currentTarget.parentElement;
                          if (parent) {
                              parent.classList.add('w-48', 'h-48', 'flex', 'items-center', 'justify-center', 'bg-gray-100', 'text-gray-400');
                              parent.innerHTML = `
                                <div class="text-center p-2">
                                  <div class="text-xs font-bold mb-1">Image Not Found</div>
                                  <div class="text-[10px] break-all">/wechat-dashang.png</div>
                                </div>`;
                          }
                        }}
                      />
                   </div>
                   <span className="text-sm font-bold text-green-600 dark:text-green-400 group-hover:underline decoration-2 underline-offset-4">{t('wechatAction', lang)}</span>
                </button>
             </div>
        </div>
        
        {/* Footer info */}
        

      </div>
    </div>
  );
};

export default AboutPage;
