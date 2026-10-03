// Reviewed image vocabulary: model names and original source records remain intact.
const words = {
  'Two Gravel Fork Versions Optional': ['两种砾石车前叉版本可选', 'Zwei Gravel-Gabelversionen zur Auswahl'],
  'Two Fork Versions Optional': ['两种前叉版本可选', 'Zwei Gabelversionen zur Auswahl'],
  'SP02 and SP03 seat post on gravel frame': ['砾石车架上的 SP02 与 SP03 座管', 'SP02- und SP03-Sattelstütze am Gravelrahmen'],
  'SP02 and SP03 seat post optional': ['SP02 与 SP03 座管可选', 'SP02- und SP03-Sattelstütze zur Auswahl'],
  '0 Offset and 15mm Offset Seat Post Optional': ['零后飘与 15 mm 后飘座管可选', 'Sattelstütze mit 0 oder 15 mm Versatz zur Auswahl'],
  'No Rivet Hole and 3-Rivet Hole optional': ['无铆钉孔与三铆钉孔版本可选', 'Version ohne Nietloch oder mit drei Nietlöchern zur Auswahl'],
  'Optional T47 BB Installation Tool (for CEMA T47 BB)': ['可选 T47 中轴安装工具（适用于 CEMA T47 中轴）', 'Optionales T47-Innenlagerwerkzeug für CEMA T47'],
  'Saddle Rail Round 7x7mm Or Ovel 7x9mm': ['圆形 7×7 mm 或椭圆形 7×9 mm 座弓', 'Runde 7×7-mm- oder ovale 7×9-mm-Sattelstreben'],
  'Exact configuration shown': ['展示准确配置', 'Genaue Ausstattung abgebildet'],
  'Exact frame platform': ['准确车架平台', 'Genaue Rahmenplattform'],
  'Same frame platform; components may differ': ['相同车架平台；部件可能不同', 'Gleiche Rahmenplattform; Komponenten können abweichen'],
  'Exact model; color may differ': ['准确车型；颜色可能不同', 'Genaues Modell; Farbe kann abweichen'],
  'Same model name; regional build differs': ['相同车型名称；地区配置不同', 'Gleicher Modellname; regionale Ausstattung abweichend'],
  'Illustrative image; not a product photo': ['示意图；并非产品照片', 'Illustration; kein Produktfoto'],
  'Frameset view': ['车架组视图', 'Rahmenset-Ansicht'],
  'Geometry diagram': ['几何尺寸图', 'Geometriediagramm'],
  'Manufacturer component option': ['厂商部件选项', 'Hersteller-Komponentenoption'],
  'Manufacturer model detail': ['厂商车型细节图', 'Hersteller-Modellansicht'],
  'Cable routing diagram': ['走线示意图', 'Zugführungsdiagramm'],
  'Cable Routing Instruction': ['走线说明', 'Anleitung zur Zugführung'],
  'Product image views': ['产品图片视图', 'Produktansichten'],
  'View': ['视图', 'Ansicht'],
  'product image': ['产品图片', 'Produktbild'],
  'Official frameset reference view': ['厂商车架组参考图', 'Offizielle Rahmenset-Referenzansicht'],
  'The pictured finish and parts do not establish the selected mainland package': ['图中的涂装与部件不能证明所选中国大陆套餐的内容', 'Die gezeigte Lackierung und Teile belegen nicht den gewählten Lieferumfang für Festlandchina'],
  'Manufacturer component or option reference linked by this model page': ['该车型页面链接的厂商部件或选项参考图', 'Auf dieser Modellseite verlinkte Herstellerreferenz für Komponenten oder Optionen'],
  'Inclusion, dimensions and compatibility must be confirmed for the quoted package': ['须为所报价的套餐确认是否包含该部件、尺寸及兼容性', 'Lieferumfang, Maße und Kompatibilität müssen für das angebotene Paket bestätigt werden'],
  'Manufacturer model feature illustration': ['厂商车型特征示意图', 'Darstellung von Modellmerkmalen durch den Hersteller'],
  'Source annotations remain attributed claims and do not establish an independent measurement': ['图中来源标注仍为厂商声明，不能作为独立测量结果', 'Quellenbeschriftungen bleiben zugeschriebene Aussagen und belegen keine unabhängige Messung'],
  'Manufacturer assembly illustration for the named frame': ['所标注车架的厂商装配示意图', 'Montagedarstellung des Herstellers für den genannten Rahmen'],
  'Confirm the exact component version and current instructions before assembly': ['装配前请确认准确的部件版本与现行说明', 'Vor der Montage die genaue Komponentenversion und aktuelle Anleitung prüfen'],
  'Manufacturer colour design illustration': ['厂商配色设计示意图', 'Farbdarstellung des Herstellers'],
  'The rendered finish does not confirm current availability or included components': ['效果图中的涂装不能证明当前有货或包含哪些部件', 'Die dargestellte Lackierung bestätigt weder aktuelle Verfügbarkeit noch enthaltene Komponenten'],
  'Manufacturer sample complete build': ['厂商整车装配示例', 'Beispiel-Komplettrad des Herstellers'],
  'The pictured drivetrain, size, weight and sale package are unverified; it does not establish the retained mainland configuration': ['图中的传动、尺码、重量与销售套餐未经核实，不能证明记录中的中国大陆配置', 'Antrieb, Größe, Gewicht und Verkaufspaket des gezeigten Aufbaus sind unbestätigt; das Bild belegt nicht die erfasste Ausstattung für Festlandchina'],
  'Preserve its source version and compare with the dated geometry table before choosing a size': ['请保留其来源版本，并在选尺码前与有日期的几何表对照', 'Die Quellenversion beachten und vor der Größenwahl mit der datierten Geometrietabelle vergleichen'],
  'Speed7 is the documented LCR017-D alias': ['Speed7 是有来源记录的 LCR017-D 别名', 'Speed7 ist der dokumentierte Alternativname für LCR017-D'],
  'The retained mechanical-105 build or quoted Speed7 package is not established by this reference': ['该参考图不能证明记录中的机械 105 装配或所报价的 Speed7 套餐', 'Diese Referenz belegt weder den erfassten mechanischen 105-Aufbau noch das angebotene Speed7-Paket'],
  'LCR017-D colour or sample-build example linked by the S-D manufacturer page': ['S-D 厂商页面链接的 LCR017-D 配色或装配示例', 'Auf der S-D-Herstellerseite verlinktes Farb- oder Aufbaubeispiel des LCR017-D'],
  'This image does not show an exact S-D cockpit package': ['该图未展示准确的 S-D 车把套餐', 'Dieses Bild zeigt nicht den genauen S-D-Cockpit-Lieferumfang'],
  'LCG074-family manufacturer sample complete build': ['LCG074 系列厂商整车装配示例', 'Beispiel-Komplettrad der LCG074-Familie vom Hersteller'],
  'The exact S-D cockpit and selected component package are unverified': ['准确的 S-D 车把与所选部件套餐未经核实', 'Das genaue S-D-Cockpit und das gewählte Komponentenpaket sind unbestätigt'],
  'Source image alt text calls this disc, while the exact page and visible caliper layout identify the rim-brake reference; that caption discrepancy remains explicit': ['来源图片的替代文字称其为碟刹，但准确车型页面与图中夹器布局表明这是圈刹参考图；该标题冲突仍明确保留', 'Der Alternativtext der Quelle nennt eine Scheibenbremse, während die genaue Seite und die sichtbare Bremsanordnung auf die Felgenbremsreferenz verweisen; dieser Beschriftungswiderspruch bleibt ausdrücklich bestehen'],
  'The linked chart is captioned LCR015-D on the S-D page; consult the separately retained current S-D table for its differing dimensions': ['S-D 页面所链接图表的标题为 LCR015-D；尺寸差异请查阅另外保留的现行 S-D 几何表', 'Das auf der S-D-Seite verlinkte Diagramm ist mit LCR015-D beschriftet; für abweichende Maße die separat erfasste aktuelle S-D-Tabelle prüfen'],
};

export function translateImageText(value, locale) {
  if (!['zh-Hans', 'de'].includes(locale) || typeof value !== 'string') return value;
  const col = locale === 'de' ? 1 : 0;
  const t = (text) => translateImageText(text, locale);
  const text = value.trim();
  let translated = text;
  if (words[text]) translated = words[text][col];
  else if (/^Frameset view \d+$/.test(text)) translated = `${words['Frameset view'][col]} ${text.match(/\d+$/)[0]}`;
  else if (/^(View|product image) \d+$/.test(text)) translated = `${words[text.startsWith('View') ? 'View' : 'product image'][col]} ${text.match(/\d+$/)[0]}`;
  else if (/^Show (.+) — (.+)$/.test(text)) translated = text.replace(/^Show (.+) — (.+)$/, (_, label, accuracy) => `${col ? 'Anzeigen' : '显示'} ${t(label)} — ${t(accuracy)}`);
  else if (/^(.+) \((\d+) of (\d+)\)$/.test(text)) translated = text.replace(/^(.+) \((\d+) of (\d+)\)$/, (_, label, n, total) => `${t(label)} (${col ? `${n} von ${total}` : `${n}／${total}`})`);
  else if (/^Manufacturer geometry diagram linked by the (.+) page$/.test(text)) translated = text.replace(/^Manufacturer geometry diagram linked by the (.+) page$/, (_, model) => col ? `Auf der ${model}-Seite verlinktes Hersteller-Geometriediagramm` : `${model} 页面链接的厂商几何尺寸图`);
  else if (text.includes(' · ')) translated = text.split(' · ').map(t).join(' · ');
  else if (text.includes(' — ')) translated = text.split(' — ').map(t).join(' — ');
  else if (text.endsWith('.') || text.includes('. ')) translated = text.split('. ').map((part) => part.endsWith('.') ? `${t(part.slice(0, -1))}.` : t(part)).join('. ');
  return value.replace(text, translated);
}
