const fs = require('fs');
const path = require('path');
// フロントエンドのnode_modulesからxml-jsを読み込む
const convert = require('../frontend/node_modules/xml-js');

// 入力・出力ファイルのパス
const inputPath = path.join(__dirname, '../reference/specification/XRF2.maiml');
const outputPath = path.join(__dirname, '../reference/specification/XRF2.json');

console.log('Reading XML file...');
const xmlData = fs.readFileSync(inputPath, 'utf8');

console.log('Converting XML to JS object...');
// xml2js を使用して XML を JavaScript オブジェクトに変換
const result = convert.xml2js(xmlData, {
  compact: false,  // compact: false で詳細な構造を保持
  spaces: 2        // インデント用のスペース数
});

console.log('Writing JSON file...');
fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf8');

console.log('✓ Conversion completed!');
console.log(`Input:  ${inputPath}`);
console.log(`Output: ${outputPath}`);
console.log(`Size:   ${(fs.statSync(outputPath).size / 1024).toFixed(2)} KB`);