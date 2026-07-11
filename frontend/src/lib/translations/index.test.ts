import assert from 'node:assert/strict';
import { en } from './en';
import { getMissingTranslationKeys, languageOptions, translations, translate } from './index';

assert.deepEqual(
  languageOptions.map(({ code }) => code).sort(),
  Object.keys(translations).sort(),
);

assert.equal(translate({}, 'language'), en.language);
assert.deepEqual(getMissingTranslationKeys('en'), []);
