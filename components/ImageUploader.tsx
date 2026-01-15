
import React, { useCallback } from 'react';
import { UploadIcon, UploadFillIcon } from './Icons';
import { Language } from '../types';
import { t } from '../utils/translations';

interface Props {
  onImageSelect: (file: File) => void;
  lang: Language;
}

const ImageUploader: React.FC<Props> = ({ onImageSelect, lang }) => {
  const handleFile = (file: File) => {
    if (file.type === 'image/gif') {
      alert("Note: Animated GIFs are not supported. Only the first frame might be processed.");
    }
    // Basic format check
    const validTypes = ['image/png', 'image/jpeg', 'image/bmp', 'image/webp'];
    if (!validTypes.includes(file.type) && file.type !== 'image/gif') {
       // We try anyway, but warn
       console.warn("Unknown file type:", file.type);
    }
    onImageSelect(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, [onImageSelect]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  return (
    <div className="h-full w-full p-4 md:p-8">
      <div 
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="h-full w-full flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-none p-4 bg-white dark:bg-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer group"
      >
        <input 
          type="file" 
          accept="image/png, image/jpeg, image/bmp, image/webp" 
          onChange={handleChange} 
          className="hidden" 
          id="file-upload"
        />
        <label htmlFor="file-upload" className="flex flex-col items-center cursor-pointer w-full h-full justify-center">
          <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-6 group-hover:bg-primary-100 dark:group-hover:bg-primary-900/30 transition-colors shadow-sm relative">
            <UploadIcon width={40} height={40} className="text-gray-400 dark:text-gray-300 absolute transition-all duration-200 opacity-100 scale-100 group-hover:opacity-0 group-hover:scale-90" />
            <UploadFillIcon width={40} height={40} className="text-primary-600 dark:text-primary-400 absolute transition-all duration-200 opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100" />
          </div>
          <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-200 mb-2 text-center">{t('uploadTitle', lang)}</h2>
          <p className="text-gray-500 dark:text-gray-400 text-center max-w-xs">
            {t('uploadDesc', lang)}
            <br/><span className="text-xs mt-2 block opacity-70">{t('uploadSub', lang)}</span>
          </p>
        </label>
      </div>
    </div>
  );
};

export default ImageUploader;
