'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// Supported languages
export type Language = 'en' | 'ne';

// All namespaces (matching the JSON files in /locales)
export type Namespace = 'common' | 'dashboard' | 'sales' | 'product' | 'customer' | 'inventory' | 'settings' | 'brands' | 'suppliers' | 'expenses' | 'incomes' | 'pos' | 'purchases' | 'reports' | 'users' | 'auth' | 'fiscal_years' | 'companies' | 'accounting' | 'ai_insights';

// Translation cache: { language: { namespace: { key: value } } }
type TranslationCache = Partial<Record<Language, Partial<Record<Namespace, Record<string, string>>>>>;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (namespace: Namespace, key: string, vars?: Record<string, string | number>) => string;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// In-memory cache for loaded translation JSONs
const cache: TranslationCache = {};

// Dynamically import locale JSON — Next.js supports this pattern
async function loadTranslations(lang: Language, ns: Namespace): Promise<Record<string, string>> {
  if (cache[lang]?.[ns]) {
    return cache[lang][ns]!;
  }
  try {
    // Dynamic import — Next.js bundles these at build time
    const module = await import(`@/locales/${lang}/${ns}.json`);
    const data = module.default as Record<string, string>;
    if (!cache[lang]) cache[lang] = {};
    cache[lang]![ns] = data;
    return data;
  } catch {
    console.warn(`[i18n] Missing translation: ${lang}/${ns}.json`);
    return {};
  }
}

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLanguageState] = useState<Language>('en');
  // Holds all loaded translations for current language
  const [translations, setTranslations] = useState<Partial<Record<Namespace, Record<string, string>>>>({});

  const allNamespaces: Namespace[] = ['common', 'dashboard', 'sales', 'product', 'customer', 'inventory', 'settings', 'brands', 'suppliers', 'expenses', 'incomes', 'pos', 'purchases', 'reports', 'users', 'auth', 'fiscal_years', 'companies', 'accounting', 'ai_insights'];

  // Load all namespaces for a given language
  const loadAllTranslations = useCallback(async (lang: Language) => {
    const results = await Promise.all(
      allNamespaces.map(async (ns) => ({ ns, data: await loadTranslations(lang, ns) }))
    );
    const loaded: Partial<Record<Namespace, Record<string, string>>> = {};
    results.forEach(({ ns, data }) => {
      loaded[ns] = data;
    });
    setTranslations(loaded);
  }, []);

  // On mount: restore saved language preference
  useEffect(() => {
    const saved = localStorage.getItem('smartpos_language') as Language | null;
    const lang: Language = saved === 'ne' ? 'ne' : 'en';
    setLanguageState(lang);
    loadAllTranslations(lang);
  }, [loadAllTranslations]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('smartpos_language', lang);
    loadAllTranslations(lang);
    // Update html lang attribute for accessibility
    document.documentElement.setAttribute('lang', lang === 'ne' ? 'ne' : 'en');
  };

  /**
   * Translate a key in a given namespace.
   * Supports variable interpolation: t('common', 'min_length', { min: 8 })
   * → "कम्तीमा 8 वर्ण हुनुपर्छ"
   */
  const t = (namespace: Namespace, key: string, vars?: Record<string, string | number>): string => {
    const nsData = translations[namespace];
    let value = nsData?.[key];

    if (!value) {
      // Graceful fallback: return the key itself so UI doesn't break
      return key;
    }

    // Interpolate variables like {{name}}, {{min}}, {{max}}
    if (vars) {
      Object.entries(vars).forEach(([varKey, varVal]) => {
        value = value!.replace(new RegExp(`\\{\\{${varKey}\\}\\}`, 'g'), String(varVal));
      });
    }

    return value;
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        isRTL: false, // Nepali is LTR
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
