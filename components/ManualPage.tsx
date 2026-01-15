
import React, { useState, useEffect } from 'react';
import { Language } from '../types';
import { getManualContent, ManualSection } from '../utils/manualContent';
import { List, ChevronRight, BookOpen } from 'lucide-react';

interface Props {
  lang: Language;
}

const ManualPage: React.FC<Props> = ({ lang }) => {
  const [sections, setSections] = useState<ManualSection[]>([]);
  const [isMobileTocOpen, setIsMobileTocOpen] = useState(false);
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    const content = getManualContent(lang);
    setSections(content);
    if (content.length > 0) {
        setActiveId(content[0].id);
    }
  }, [lang]);

  // ScrollSpy logic (Optional simplification: update activeId on click, 
  // but let's try a simple IntersectionObserver for better UX)
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: '-20% 0px -60% 0px' } 
    );

    sections.forEach((section) => {
      const el = document.getElementById(section.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [sections]);

  return (
    <div className="flex w-full h-full overflow-hidden bg-gray-50 dark:bg-gray-950 relative">
      
      {/* 1. Sidebar TOC */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transform transition-transform duration-200 ease-in-out
        md:relative md:translate-x-0 
        ${isMobileTocOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
        flex flex-col shrink-0
      `}>
          <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between shrink-0 h-14 bg-white dark:bg-gray-900">
              <div className="flex items-center gap-2 text-gray-900 dark:text-gray-100 font-bold uppercase tracking-wider text-xs">
                  <BookOpen size={16} />
                  <span>{lang === 'zh' ? '使用手册' : 'User Manual'}</span>
              </div>
              <button onClick={() => setIsMobileTocOpen(false)} className="md:hidden text-gray-500 hover:text-gray-800 dark:hover:text-gray-200">
                <ChevronRight size={20} className="rotate-180" />
              </button>
          </div>
          <nav className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1">
              {sections.map((section) => (
                  <a 
                      key={section.id}
                      href={`#${section.id}`}
                      className={`
                          flex items-center gap-2 text-sm py-2 px-3 rounded-md transition-all
                          ${activeId === section.id 
                            ? 'bg-primary-50 text-primary-700 font-bold dark:bg-primary-900/30 dark:text-primary-300' 
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}
                      `}
                      onClick={(e) => {
                          e.preventDefault();
                          const el = document.getElementById(section.id);
                          if (el) {
                              el.scrollIntoView({ behavior: 'smooth' });
                              setActiveId(section.id);
                              setIsMobileTocOpen(false);
                          }
                      }}
                  >
                      {section.icon && <section.icon size={16} className={activeId === section.id ? 'opacity-100' : 'opacity-70'} />}
                      <span>{section.title}</span>
                  </a>
              ))}
          </nav>
      </aside>

      {/* 2. Main Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col relative w-full">
          
          {/* Mobile Toggle */}
          <div className="md:hidden p-2 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center gap-2 sticky top-0 z-30 shadow-sm shrink-0">
               <button 
                 onClick={() => setIsMobileTocOpen(true)}
                 className="flex items-center gap-2 text-xs font-bold text-primary-600 dark:text-primary-400 px-3 py-1.5 bg-primary-50 dark:bg-primary-900/20 rounded-md"
               >
                 <List size={14} />
                 <span>{lang === 'zh' ? '目录' : 'Menu'}</span>
               </button>
               <span className="text-xs text-gray-400 truncate flex-1 text-right pr-2">
                 Pixler Manual
               </span>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10 scroll-smooth bg-gray-50 dark:bg-gray-950">
              <div className="max-w-3xl mx-auto pb-20 space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {sections.map((section) => (
                    <section key={section.id} id={section.id} className="scroll-mt-20 border-b border-gray-200 dark:border-gray-800 last:border-0 pb-12 last:pb-0">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm text-primary-600 dark:text-primary-400">
                                {section.icon ? <section.icon size={24} /> : <BookOpen size={24} />}
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                {section.title}
                            </h2>
                        </div>
                        <div className="text-gray-600 dark:text-gray-300 leading-7 text-base">
                            {section.content}
                        </div>
                    </section>
                ))}
                
                {sections.length === 0 && (
                    <div className="text-center text-gray-500 mt-20">
                        No manual content available for this language.
                    </div>
                )}
              </div>
          </div>

          {/* Mobile Overlay */}
          {isMobileTocOpen && (
            <div 
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 md:hidden"
              onClick={() => setIsMobileTocOpen(false)}
            />
          )}
      </div>
    </div>
  );
};

export default ManualPage;
