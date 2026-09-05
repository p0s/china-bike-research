import test from 'node:test';
import assert from 'node:assert/strict';
import { csvCell, booleanCell } from '../src/lib/csv.mjs';
for (const text of ['=1+1','+SUM(A1)','-cmd','@x',' \t=HYPERLINK("x")','\ttext','\rtext','\ntext','＝1','＋1','－1','＠x','\uFEFF=1']) test(`neutralize text formula/control prefix ${JSON.stringify(text)}`,()=>{
  assert.match(csvCell(text),/^"?'/);
});
test('CSV quotes comma, CR, LF and embedded quotes',()=>{
  assert.equal(csvCell('a,b'),'"a,b"'); assert.equal(csvCell('a\rb'),'"a\rb"');assert.equal(csvCell('a\nb'),'"a\nb"');assert.equal(csvCell('a"b'),'"a""b"');
});
test('ordinary values and typed negative numbers are not changed',()=>{
  assert.equal(csvCell(-2),'-2');assert.equal(csvCell(0),'0');assert.equal(csvCell('禧玛诺'),'禧玛诺');assert.equal(csvCell(null),'');assert.equal(csvCell(undefined),'');
});
test('unknown is neither yes nor no',()=>{
  assert.equal(booleanCell(true),'yes');assert.equal(booleanCell(false),'no');for(const value of [undefined,null,0,'no',{},[]])assert.equal(booleanCell(value),'');
});
