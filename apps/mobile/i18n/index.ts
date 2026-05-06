import { I18n } from 'i18n-js';
import { getLocales } from 'expo-localization';
import pt from './pt';
import en from './en';

const i18n = new I18n({ pt, en });
i18n.locale = getLocales()[0]?.languageCode ?? 'en';
i18n.enableFallback = true;
i18n.defaultLocale = 'en';

export default i18n;
export const t = (key: string, options?: Record<string, unknown>) => i18n.t(key, options);
