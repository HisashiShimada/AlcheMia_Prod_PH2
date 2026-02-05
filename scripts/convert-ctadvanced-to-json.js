const fs = require('fs');
const path = require('path');
// フロントエンドのnode_modulesからxml-jsを読み込む
const convert = require('../frontend/node_modules/xml-js');

// 入力・出力ファイルのパス
const inputPath = path.join(__dirname, '../reference/specification/CTAdvanced.xml');
const outputPath = path.join(__dirname, '../reference/specification/CTAdvanced_parsed.txt');

console.log('XMLファイルを読み込んでいます...');
const xmlData = fs.readFileSync(inputPath, 'utf8');

console.log('XMLをJavaScriptオブジェクトに変換しています...');
// xml2js を使用して XML を JavaScript オブジェクトに変換（compact: true形式）
const result = convert.xml2js(xmlData, {
  compact: true,  // compact: true でシンプルな構造
  spaces: 2       // インデント用のスペース数
});

console.log('JSON形式でテキストファイルに書き込んでいます...');
const jsonString = JSON.stringify(result, null, 2);
fs.writeFileSync(outputPath, jsonString, 'utf8');

console.log('\n✓ 変換完了!');
console.log(`入力:  ${inputPath}`);
console.log(`出力:  ${outputPath}`);
console.log(`サイズ: ${(fs.statSync(outputPath).size / 1024).toFixed(2)} KB`);
console.log(`文字数: ${jsonString.length} bytes`);

// プレビュー表示（最初の1000文字）
console.log('\n=== プレビュー（最初の1000文字） ===');
console.log(jsonString.substring(0, 1000));
if (jsonString.length > 1000) {
  console.log('...');
}
