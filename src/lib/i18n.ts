import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// 默认中文打进首屏。英/日/韩按需加载，避免四份文案一起解析。
import zh from '../locales/zh.json';

export const supportedLanguages = ['zh', 'en', 'ja', 'ko'] as const;
export type SupportedLanguage = typeof supportedLanguages[number];

export const languageNames: Record<SupportedLanguage, string> = {
  zh: '中文',
  en: 'English',
  ja: '日本語',
  ko: '한국어',
};

const localeLoaders: Record<Exclude<SupportedLanguage, 'zh'>, () => Promise<{ default: object }>> = {
  en: () => import('../locales/en.json'),
  ja: () => import('../locales/ja.json'),
  ko: () => import('../locales/ko.json'),
};

export function normalizeLanguage(current: string | undefined): SupportedLanguage {
  const base = (current || 'zh').toLowerCase().split('-')[0];
  if (base === 'en' || base === 'ja' || base === 'ko') return base;
  return 'zh';
}

export function getNextLanguage(current: string): SupportedLanguage {
  const idx = supportedLanguages.indexOf(normalizeLanguage(current));
  return supportedLanguages[(idx + 1) % supportedLanguages.length];
}

async function ensureLanguage(lng: string | undefined) {
  const code = normalizeLanguage(lng);
  if (code === 'zh' || i18n.hasResourceBundle(code, 'translation')) return;
  const mod = await localeLoaders[code]();
  i18n.addResourceBundle(code, 'translation', mod.default, true, true);
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      zh: { translation: zh },
    },
    fallbackLng: 'zh',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

const changeLanguage = i18n.changeLanguage.bind(i18n);
i18n.changeLanguage = (async (lng?: string, callback?: Parameters<typeof changeLanguage>[1]) => {
  if (lng) await ensureLanguage(lng);
  return changeLanguage(lng, callback);
}) as typeof i18n.changeLanguage;

void ensureLanguage(i18n.resolvedLanguage || i18n.language).then(() => {
  const code = normalizeLanguage(i18n.resolvedLanguage || i18n.language);
  if (code !== 'zh' && !i18n.language?.toLowerCase().startsWith(code)) {
    return changeLanguage(code);
  }
  if (code !== 'zh') {
    return changeLanguage(i18n.language);
  }
});

export default i18n;
