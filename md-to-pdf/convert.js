const mdToPdf = require('md-to-pdf').mdToPdf;
const fs = require('fs/promises');
const path = require('path');

// PDF生成設定
const config = {
  pdf_options: {
    format: 'A4',
    margin: { 
      top: '20mm', 
      bottom: '20mm', 
      left: '15mm', 
      right: '15mm' 
    },
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: '<div style="font-size: 10px; text-align: center; width: 100%; padding-top: 10px;">mmdpf 設計ドキュメント</div>',
    footerTemplate: '<div style="font-size: 10px; text-align: center; width: 100%; padding-bottom: 10px;"><span class="pageNumber"></span> / <span class="totalPages"></span></div>'
  },
  css: `
    /* Highlight.js GitHub Theme */
    pre code.hljs {
      display: block;
      overflow-x: auto;
      padding: 1em;
    }
    code.hljs {
      padding: 3px 5px;
    }
    .hljs {
      color: #24292e;
      background: #f6f8fa;
    }
    .hljs-doctag,
    .hljs-keyword,
    .hljs-meta .hljs-keyword,
    .hljs-template-tag,
    .hljs-template-variable,
    .hljs-type,
    .hljs-variable.language_ {
      color: #d73a49;
    }
    .hljs-title,
    .hljs-title.class_,
    .hljs-title.class_.inherited__,
    .hljs-title.function_ {
      color: #6f42c1;
    }
    .hljs-attr,
    .hljs-attribute,
    .hljs-literal,
    .hljs-meta,
    .hljs-number,
    .hljs-operator,
    .hljs-selector-attr,
    .hljs-selector-class,
    .hljs-selector-id,
    .hljs-variable {
      color: #005cc5;
    }
    .hljs-meta .hljs-string,
    .hljs-regexp,
    .hljs-string {
      color: #032f62;
    }
    .hljs-built_in,
    .hljs-symbol {
      color: #e36209;
    }
    .hljs-code,
    .hljs-comment,
    .hljs-formula {
      color: #6a737d;
    }
    .hljs-name,
    .hljs-quote,
    .hljs-selector-pseudo,
    .hljs-selector-tag {
      color: #22863a;
    }
    .hljs-subst {
      color: #24292e;
    }
    .hljs-section {
      color: #005cc5;
      font-weight: bold;
    }
    .hljs-bullet {
      color: #735c0f;
    }
    .hljs-emphasis {
      color: #24292e;
      font-style: italic;
    }
    .hljs-strong {
      color: #24292e;
      font-weight: bold;
    }
    .hljs-addition {
      color: #22863a;
      background-color: #f0fff4;
    }
    .hljs-deletion {
      color: #b31d28;
      background-color: #ffeef0;
    }
    
    body {
      font-family: 'Segoe UI', 'Yu Gothic', 'Meiryo', sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #333;
    }
    h1 {
      font-size: 24pt;
      color: #1a1a1a;
      border-bottom: 2px solid #333;
      padding-bottom: 8px;
      margin-top: 24px;
      margin-bottom: 16px;
    }
    h2 {
      font-size: 20pt;
      color: #1a1a1a;
      border-bottom: 1px solid #666;
      padding-bottom: 6px;
      margin-top: 20px;
      margin-bottom: 12px;
    }
    h3 {
      font-size: 16pt;
      color: #333;
      margin-top: 16px;
      margin-bottom: 10px;
    }
    h4 {
      font-size: 14pt;
      color: #333;
      margin-top: 14px;
      margin-bottom: 8px;
    }
    code {
      background-color: #f0f1f2;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Consolas', 'Monaco', monospace !important;
      font-size: 10pt;
      color: #e83e8c !important;
    }
    pre {
      background-color: #f0f1f2;
      padding: 16px;
      border-radius: 6px;
      overflow-x: auto;
      border: 1px solid #e1e4e8;
    }
    pre code {
      background-color: transparent;
      padding: 0;
      color: #333 !important;
      font-size: 9pt;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 16px 0;
    }
    th {
      background-color: #f6f8fa;
      border: 1px solid #ddd;
      padding: 10px;
      text-align: left;
      font-weight: bold;
    }
    td {
      border: 1px solid #ddd;
      padding: 10px;
    }
    blockquote {
      border-left: 4px solid #ddd;
      padding-left: 16px;
      margin-left: 0;
      color: #666;
    }
    ul, ol {
      margin: 12px 0;
      padding-left: 30px;
    }
    li {
      margin: 6px 0;
    }
    img {
      border: 2px solid #dddddd;
      max-width: 100%;
      height: auto;
      display: block;
      margin: 16px 0;
    }
  `
};

/**
 * メタデータセクションを表形式に変換
 */
function transformMetadataSection(markdown) {
  // ## メタデータ の後の --- で囲まれたYAMLブロックを検出（より柔軟なパターン）
  const metadataRegex = /##\s*メタデータ\s*\n---\s*\n([\s\S]*?)\n---/g;
  
  return markdown.replace(metadataRegex, (match, yamlContent) => {
    // YAML の各行をパースしてHTMLテーブルに変換（1列目をthに）
    const lines = yamlContent.trim().split('\n');
    let tableRows = '';
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      tableRows += `${trimmedLine}<br>\n`;
    }
    
    if (tableRows) {
      return `## メタデータ\n\n<h3>\n${tableRows}\n</h3>`;
    }
    
    return match; // 変換できない場合は元のまま
  });
}

/**
 * 単一ファイルをPDFに変換
 */
async function convertFile(inputPath, outputPath) {
  try {
    console.log(`📄 変換中: ${inputPath}`);
    
    // Markdownファイルを読み込んで前処理
    const fsSync = require('fs');
    let markdown = fsSync.readFileSync(inputPath, 'utf-8');
    
    // メタデータセクションを変換
    markdown = transformMetadataSection(markdown);
    
    // 一時ファイルに書き込み
    const tempPath = inputPath + '.tmp';
    fsSync.writeFileSync(tempPath, markdown, 'utf-8');
    
    // Markdownファイルのディレクトリを基準パスとして設定
    const basedir = path.dirname(inputPath);
    const configWithBasedir = {
      ...config,
      basedir: basedir,
      // 画像読み込みを許可
      launch_options: {
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--allow-file-access-from-files']
      }
    };
    
    const pdf = await mdToPdf({ path: tempPath }, configWithBasedir);
    
    // 一時ファイルを削除
    fsSync.unlinkSync(tempPath);
    
    if (pdf && pdf.content) {
      await fs.writeFile(outputPath, pdf.content);
      console.log(`✓ 変換完了: ${outputPath}`);
      return true;
    } else {
      console.error(`✗ 変換失敗: PDFコンテンツが生成されませんでした: ${inputPath}`);
      return false;
    }
  } catch (error) {
    console.error(`✗ 変換失敗: ${inputPath}`);
    console.error(`  エラー: ${error.message}`);
    return false;
  }
}

/**
 * ディレクトリ内の全Markdownファイルを再帰的に変換
 */
async function convertDirectory(inputDir, outputDir) {
  try {
    // 出力ディレクトリを作成
    await fs.mkdir(outputDir, { recursive: true });
    
    const entries = await fs.readdir(inputDir, { withFileTypes: true });
    
    let successCount = 0;
    let failCount = 0;
    
    for (const entry of entries) {
      const inputPath = path.join(inputDir, entry.name);
      
      if (entry.isDirectory()) {
        // サブディレクトリを再帰的に処理
        const subOutputDir = path.join(outputDir, entry.name);
        console.log(`\n📁 ディレクトリ処理: ${entry.name}/`);
        const result = await convertDirectory(inputPath, subOutputDir);
        successCount += result.successCount;
        failCount += result.failCount;
      } else if (entry.name.endsWith('.md')) {
        // Markdownファイルを変換
        const outputPath = path.join(outputDir, entry.name.replace('.md', '.pdf'));
        const success = await convertFile(inputPath, outputPath);
        if (success) {
          successCount++;
        } else {
          failCount++;
        }
      }
    }
    
    return { successCount, failCount };
  } catch (error) {
    console.error(`✗ ディレクトリ処理エラー: ${inputDir}`);
    console.error(`  エラー: ${error.message}`);
    return { successCount: 0, failCount: 1 };
  }
}

/**
 * メイン処理
 */
async function main() {
  const args = process.argv.slice(2);
  
  console.log('🚀 Markdown to PDF 変換スクリプト');
  console.log('=====================================\n');
  
  if (args.length === 0) {
    // デフォルト: docs/design/ を一括変換
    const projectRoot = path.join(__dirname, '..');
    const inputDir = path.join(projectRoot, 'docs', 'design');
    const outputDir = path.join(__dirname, 'output');
    
    console.log(`📂 入力ディレクトリ: ${inputDir}`);
    console.log(`📂 出力ディレクトリ: ${outputDir}\n`);
    
    const startTime = Date.now();
    const { successCount, failCount } = await convertDirectory(inputDir, outputDir);
    const endTime = Date.now();
    
    console.log('\n=====================================');
    console.log('📊 変換結果:');
    console.log(`  ✓ 成功: ${successCount} ファイル`);
    console.log(`  ✗ 失敗: ${failCount} ファイル`);
    console.log(`  ⏱  所要時間: ${((endTime - startTime) / 1000).toFixed(2)}秒`);
    console.log('=====================================\n');
    
  } else if (args.length === 1) {
    // 単一ファイルを変換
    const inputPath = path.resolve(args[0]);
    const outputPath = inputPath.replace('.md', '.pdf');
    
    console.log(`📂 入力ファイル: ${inputPath}`);
    console.log(`📂 出力ファイル: ${outputPath}\n`);
    
    const success = await convertFile(inputPath, outputPath);
    
    if (success) {
      console.log('\n✓ 変換が完了しました！');
    } else {
      console.log('\n✗ 変換に失敗しました。');
      process.exit(1);
    }
    
  } else if (args.length >= 2) {
    // 入力・出力パスを指定
    const inputPath = path.resolve(args[0]);
    const outputPath = path.resolve(args[1]);
    
    const inputStat = await fs.stat(inputPath);
    
    if (inputStat.isDirectory()) {
      // ディレクトリ一括変換
      console.log(`📂 入力ディレクトリ: ${inputPath}`);
      console.log(`📂 出力ディレクトリ: ${outputPath}\n`);
      
      const startTime = Date.now();
      const { successCount, failCount } = await convertDirectory(inputPath, outputPath);
      const endTime = Date.now();
      
      console.log('\n=====================================');
      console.log('📊 変換結果:');
      console.log(`  ✓ 成功: ${successCount} ファイル`);
      console.log(`  ✗ 失敗: ${failCount} ファイル`);
      console.log(`  ⏱  所要時間: ${((endTime - startTime) / 1000).toFixed(2)}秒`);
      console.log('=====================================\n');
    } else {
      // 単一ファイル変換
      console.log(`📂 入力ファイル: ${inputPath}`);
      console.log(`📂 出力ファイル: ${outputPath}\n`);
      
      const success = await convertFile(inputPath, outputPath);
      
      if (success) {
        console.log('\n✓ 変換が完了しました！');
      } else {
        console.log('\n✗ 変換に失敗しました。');
        process.exit(1);
      }
    }
  }
}

// エラーハンドリング
process.on('unhandledRejection', (error) => {
  console.error('✗ 予期しないエラーが発生しました:');
  console.error(error);
  process.exit(1);
});

main();
