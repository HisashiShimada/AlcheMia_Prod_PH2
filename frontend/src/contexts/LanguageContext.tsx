'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import jaTranslations from '../locales/ja.json';
import enTranslations from '../locales/en.json';
import { deepMerge } from '../utils/deepMerge';

type Translations = typeof jaTranslations;
type Locale = 'ja' | 'en';

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
  translations: Translations;
}

const translations: Record<Locale, Translations> = {
  ja: jaTranslations,
  en: enTranslations,
};

// デフォルト値を設定（Providerなしでも動作するように）
const defaultContextValue: LanguageContextType = {
  locale: 'ja',
  setLocale: () => {
    console.warn('LanguageProvider is not wrapped. Using default locale.');
  },
  t: (key: string): string => {
    const keys = key.split('.');
    let value: string | Record<string, unknown> | unknown = translations.ja;

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = (value as Record<string, unknown>)[k];
      } else {
        console.warn(`Translation key not found: ${key}`);
        return key;
      }
    }

    return typeof value === 'string' ? value : key;
  },
  translations: translations.ja,
};

const LanguageContext = createContext<LanguageContextType>(defaultContextValue);

interface LanguageProviderProps {
  children: ReactNode;
  initialLocale?: Locale;
  organizationLocale?: Locale; // テナント（組織）ごとの言語設定
  organizationId?: string; // 組織ID（カスタム翻訳ファイルのロードに使用）
}

/**
 * 組織ごとのカスタム翻訳をロードする
 * @param organizationId - 組織ID（例: "tenant_a", "tenant_b"）
 * @returns カスタム翻訳オブジェクト（ロードに失敗した場合はnull）
 */
async function loadOrganizationTranslations(
  organizationId: string
): Promise<Partial<Translations> | null> {
  try {
    // 組織IDをファイル名形式に変換（例: "tenant_a" -> "org_tenant_a"）
    const fileName = organizationId.startsWith('org_') 
      ? organizationId 
      : `org_${organizationId}`;
    
    const customTranslations = await import(
      `../locales/organizations/${fileName}.json`
    );
    
    console.log(`Loaded custom translations for: ${fileName}`);
    return customTranslations.default || customTranslations;
  } catch (error) {
    console.warn(
      `No custom translations found for organization: ${organizationId}`,
      error
    );
    return null;
  }
}

/**
 * 言語プロバイダー
 * テナント毎に言語を切り替えられる機能を提供
 * 組織ごとのカスタム翻訳をサポート
 */
export function LanguageProvider({ 
  children, 
  initialLocale = 'ja',
  organizationLocale,
  organizationId
}: LanguageProviderProps) {
  // 組織設定が優先、なければlocalStorageまたはデフォルト
  const effectiveLocale = organizationLocale || initialLocale;
  
  const [userLocale, setUserLocale] = useState<Locale>(() => {
    if (typeof window !== 'undefined' && !organizationLocale) {
      const savedLocale = localStorage.getItem('user-locale') as Locale;
      if (savedLocale === 'ja' || savedLocale === 'en') {
        return savedLocale;
      }
    }
    return initialLocale;
  });

  // カスタム翻訳の状態
  const [customTranslations, setCustomTranslations] = useState<Partial<Translations> | null>(null);

  // 組織設定がある場合はそれを使用、なければユーザー設定
  const locale = organizationLocale || userLocale;

  // 組織IDが変更されたときにカスタム翻訳をロード
  useEffect(() => {
    let isMounted = true;

    if (organizationId) {
      loadOrganizationTranslations(organizationId)
        .then((customTrans) => {
          if (isMounted) {
            setCustomTranslations(customTrans);
          }
        })
        .catch((error) => {
          console.error('Failed to load custom translations:', error);
          if (isMounted) {
            setCustomTranslations(null);
          }
        });
    } else {
      // 組織IDがない場合はカスタム翻訳をクリア
      // この同期的なsetStateは意図的なもので、パフォーマンス問題は発生しない
      // eslint-disable-next-line react-hooks/exhaustive-deps
      setCustomTranslations(null);
    }

    return () => {
      isMounted = false;
    };
  }, [organizationId]);

  const handleSetLocale = (newLocale: Locale) => {
    // 組織設定がある場合は変更不可
    if (organizationLocale) {
      console.warn('Cannot change locale when organization locale is set');
      return;
    }
    setUserLocale(newLocale);
    if (typeof window !== 'undefined') {
      localStorage.setItem('user-locale', newLocale);
    }
  };

  // ベース翻訳とカスタム翻訳をマージ
  const mergedTranslations: Translations = React.useMemo(() => {
    const baseTranslations = translations[locale];
    if (customTranslations) {
      return deepMerge(baseTranslations, customTranslations);
    }
    return baseTranslations;
  }, [locale, customTranslations]);

  /**
   * 翻訳キーから文字列を取得
   * カスタム翻訳がある場合は優先的に使用し、なければベース翻訳にフォールバック
   * @param key - ドット区切りのキー（例: 'common.login', 'menu.provider.title'）
   * @returns 翻訳された文字列
   */
  const t = (key: string): string => {
    const keys = key.split('.');
    let value: string | Record<string, unknown> | unknown = mergedTranslations;

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = (value as Record<string, unknown>)[k];
      } else {
        console.warn(`Translation key not found: ${key}`);
        return key; // キーが見つからない場合はキー自体を返す
      }
    }

    return typeof value === 'string' ? value : key;
  };

  const value: LanguageContextType = {
    locale,
    setLocale: handleSetLocale,
    t,
    translations: mergedTranslations,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

/**
 * 言語コンテキストを使用するカスタムフック
 * @returns LanguageContextType
 */
export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  return context;
}
