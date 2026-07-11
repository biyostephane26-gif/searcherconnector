
import fs from 'fs';
import path from 'path';

// Liste complète des langues ISO 639-1 (100+ langues)
const languages = [
  'af', 'sq', 'am', 'ar', 'hy', 'az', 'eu', 'be', 'bn', 'bs',
  'bg', 'ca', 'ceb', 'ny', 'zh-CN', 'zh-TW', 'co', 'hr', 'cs', 'da',
  'nl', 'eo', 'et', 'tl', 'fi', 'fr', 'fy', 'gl', 'ka', 'de',
  'el', 'gu', 'ht', 'ha', 'haw', 'iw', 'hi', 'hmn', 'hu', 'is',
  'ig', 'id', 'ga', 'it', 'ja', 'jw', 'kn', 'kk', 'km', 'rw',
  'ko', 'ku', 'ky', 'lo', 'la', 'lv', 'lt', 'lb', 'mk', 'mg',
  'ms', 'ml', 'mt', 'mi', 'mr', 'mn', 'my', 'ne', 'no', 'or',
  'ps', 'fa', 'pl', 'pt', 'pa', 'ro', 'ru', 'sm', 'gd', 'sr',
  'st', 'sn', 'sd', 'si', 'sk', 'sl', 'so', 'es', 'su', 'sw',
  'sv', 'tg', 'ta', 'te', 'th', 'tr', 'uk', 'ur', 'ug', 'uz',
  'vi', 'cy', 'xh', 'yi', 'yo', 'zu', 'he'
];

const localesDir = path.join(process.cwd(), 'public', 'locales');
const enTranslations = fs.readFileSync(path.join(localesDir, 'en', 'translation.json'), 'utf8');
const enJson = JSON.parse(enTranslations);

languages.forEach(lang => {
  const langDir = path.join(localesDir, lang);
  if (!fs.existsSync(langDir)) {
    fs.mkdirSync(langDir, { recursive: true });
  }
  const filePath = path.join(langDir, 'translation.json');
  // On copie les traductions anglaises comme base (l'utilisateur pourra traduire plus tard)
  fs.writeFileSync(filePath, JSON.stringify(enJson, null, 2));
  console.log(`✅ Créé: ${lang}/translation.json`);
});

console.log('\n🎉 Toutes les langues ont été générées !');

