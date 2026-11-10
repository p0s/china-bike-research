import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { localizedCredit } from '../src/lib/i18n.mjs';

const guidePhotos = JSON.parse(fs.readFileSync(new URL('../content/blog-images.json', import.meta.url), 'utf8')).model_photos;
const credits = [...new Set(['images', 'tire-images'].flatMap((folder) => fs.readdirSync(new URL(`../data/${folder}/`, import.meta.url))
  .filter((name) => name.endsWith('.json'))
  .map((name) => JSON.parse(fs.readFileSync(new URL(`../data/${folder}/${name}`, import.meta.url), 'utf8')).credit))
  .concat(guidePhotos.map((photo) => photo.external?.image?.credit))
  .filter((credit) => typeof credit === 'string'))];

test('Chinese credits translate the label words and keep the holder as recorded', () => {
  assert.equal(localizedCredit('Product image © TAVELO Xiamen Sports Co., Ltd.', 'zh-Hans'), '产品图片 © TAVELO Xiamen Sports Co., Ltd.');
  assert.equal(localizedCredit('Manufacturer image © LightCarbon — Official frameset reference view.', 'zh-Hans'), '制造商图片 © LightCarbon — Official frameset reference view.');
  assert.equal(localizedCredit('LightCarbon; see source', 'zh-Hans'), 'LightCarbon；见来源');
  assert.equal(localizedCredit('XHS dealer post; see source', 'zh-Hans'), '小红书经销商帖子；见来源');
  assert.equal(localizedCredit('KUNG on XHS; see source', 'zh-Hans'), 'KUNG（小红书）；见来源');
  assert.equal(localizedCredit('Product image via public marketplace listing mirror', 'zh-Hans'), '产品图片，来自公开商城页镜像');
  assert.equal(localizedCredit('XHS · 随意点单车零售', 'zh-Hans'), '小红书 · 随意点单车零售');
  assert.equal(localizedCredit('ELVESBIKE — official product photo', 'zh-Hans'), 'ELVESBIKE — 官方产品照片');
});

test('every recorded credit keeps English and German unchanged and loses its English label words in Chinese', () => {
  const english = /\b(image|detail|see source|via|XHS|post|listing|store|account|chart|graphic|index|creator|mirror|photo)\b/;
  for (const credit of credits) {
    assert.equal(localizedCredit(credit, 'en'), credit);
    assert.equal(localizedCredit(credit, 'de'), credit);
    if (credit === 'China Bikes project placeholder') continue;
    assert.doesNotMatch(localizedCredit(credit, 'zh-Hans').replace(/ — .*$/, ''), english, credit);
  }
});
