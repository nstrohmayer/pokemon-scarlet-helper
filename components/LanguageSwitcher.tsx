import React from 'react';
import { useI18n } from '../hooks/useI18n';

export const LanguageSwitcher: React.FC = () => {
    const { language, setLanguage, t } = useI18n();

    return (
        <div className="py-3 border-b border-t border-slate-700 space-y-2">
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider text-center">{t('languageSwitcher.label')}</p>
            <div className="flex items-center justify-center gap-2">
                <button 
                    onClick={() => setLanguage('en')}
                    disabled={language === 'en'}
                    className="px-4 py-1.5 text-sm rounded-md disabled:bg-sky-600 disabled:text-white bg-slate-700 text-slate-300 hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    aria-label="Switch to English"
                >
                    EN
                </button>
                <button 
                    onClick={() => setLanguage('de')}
                    disabled={language === 'de'}
                    className="px-4 py-1.5 text-sm rounded-md disabled:bg-sky-600 disabled:text-white bg-slate-700 text-slate-300 hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    aria-label="Switch to German"
                >
                    DE
                </button>
            </div>
        </div>
    );
};
