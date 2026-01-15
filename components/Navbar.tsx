
import React, { useState } from 'react';
import { LogoIcon, LightModeIcon, DarkModeIcon, SystemModeIcon, LanguageIcon, MenuIcon, CloseIcon } from './Icons';
import { t } from '../utils/translations';
import { AppConfig, Theme } from '../types';

interface Props {
  config: AppConfig;
  onChange: (newConfig: AppConfig) => void;
  activeTab: 'editor' | 'about' | 'bead_editor' | 'manual';
  onTabChange: (tab: 'editor' | 'about' | 'bead_editor' | 'manual') => void;
}

const Navbar: React.FC<Props> = ({ config, onChange, activeTab, onTabChange }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const update = (key: keyof AppConfig, value: any) => onChange({ ...config, [key]: value });

  const navItems: { id: 'editor' | 'about' | 'bead_editor' | 'manual'; label: string }[] = [
    { id: 'editor', label: t('editor', config.language) },
    { id: 'bead_editor', label: t('beadEditor', config.language) },
    { id: 'manual', label: t('manual', config.language) },
    { id: 'about', label: t('about', config.language) },
  ];

  const handleTabClick = (id: 'editor' | 'about' | 'bead_editor' | 'manual') => {
    onTabChange(id);
    setIsMenuOpen(false);
  };

  // Shared button styles
  const getTabClass = (isActive: boolean) => `
    px-4 py-2 text-sm font-bold rounded-none transition-colors duration-200
    ${isActive 
      ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20' 
      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'}
  `;

  const ThemeToggle = () => (
    <div className="flex bg-gray-100 dark:bg-gray-800 p-0.5 rounded-none h-8 items-center border-2 border-gray-200 dark:border-gray-700">
        {(['light', 'auto', 'dark'] as Theme[]).map(mode => (
            <button 
                key={mode} 
                onClick={() => update('theme', mode)} 
                className={`w-8 h-full flex justify-center items-center rounded-none text-xs transition-all ${
                    config.theme === mode 
                    ? 'bg-white dark:bg-gray-600 text-primary-600 dark:text-primary-300 shadow-sm' 
                    : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                }`}
                title={mode}
            >
                {mode === 'light' && <LightModeIcon width={14} height={14} />}
                {mode === 'dark' && <DarkModeIcon width={14} height={14} />}
                {mode === 'auto' && <SystemModeIcon width={14} height={14} />}
            </button>
        ))}
    </div>
  );

  const LangSelector = () => (
    <div className="relative h-8 w-24 bg-gray-100 dark:bg-gray-800 rounded-none border-2 border-gray-200 dark:border-gray-700">
        <select 
            value={config.language} 
            onChange={(e) => update('language', e.target.value as any)} 
            className="appearance-none bg-transparent text-gray-700 dark:text-gray-200 text-xs font-medium py-1 pl-2 pr-7 outline-none w-full h-full rounded-none cursor-pointer"
        >
            <option value="en">English</option>
            <option value="zh">中文</option>
            <option value="ja">日本語</option>
        </select>
        <LanguageIcon width={12} height={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
    </div>
  );

  return (
    <nav className="h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-3 md:px-4 z-[60] shadow-sm relative shrink-0">
      
      {/* 1. Logo Section */}
      <div 
        className="flex items-center gap-2 cursor-pointer select-none shrink-0" 
        onClick={() => handleTabClick('editor')}
      >
        <div className="bg-primary-500 rounded-none p-1.5 text-[#FFEEE5] shadow-sm">
          <LogoIcon width={20} height={20} />
        </div>
        <span className="font-bold text-lg text-gray-800 dark:text-gray-100">Pixler</span>
      </div>

      {/* 2. Desktop Navigation (Hidden on Mobile) */}
      <div className="hidden md:flex items-center gap-1">
         {navItems.map(item => (
             <button 
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={getTabClass(activeTab === item.id)}
             >
                {item.label}
             </button>
         ))}
      </div>

      {/* 3. Desktop Settings (Hidden on Mobile) */}
      <div className="hidden md:flex items-center gap-3 shrink-0">
        <LangSelector />
        <ThemeToggle />
      </div>

      {/* 4. Mobile Menu Toggle */}
      <button 
        className="md:hidden p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        onClick={() => setIsMenuOpen(!isMenuOpen)}
      >
        {isMenuOpen ? <CloseIcon width={24} height={24} /> : <MenuIcon width={24} height={24} />}
      </button>

      {/* 5. Mobile Dropdown Menu */}
      {isMenuOpen && (
        <div className="absolute top-14 left-0 w-full bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-xl flex flex-col p-4 gap-4 md:hidden animate-in slide-in-from-top-2 duration-200 z-[100]">
            {/* Nav Items */}
            <div className="flex flex-col gap-1">
                {navItems.map(item => (
                    <button 
                        key={item.id}
                        onClick={() => handleTabClick(item.id)}
                        className={`text-left ${getTabClass(activeTab === item.id)}`}
                    >
                        {item.label}
                    </button>
                ))}
            </div>
            
            <div className="h-px bg-gray-100 dark:bg-gray-800 w-full" />

            {/* Mobile Settings Row */}
            <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase text-xs">Settings</span>
                <div className="flex items-center gap-3">
                    <LangSelector />
                    <ThemeToggle />
                </div>
            </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
