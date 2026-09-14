import { langs } from '../i18n/ui';

export const langPaths = () => langs.map((lang) => ({ params: { lang } }));
