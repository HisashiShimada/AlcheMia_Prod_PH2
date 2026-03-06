/**
 * MD → Feature 変換スクリプト
 *
 * 使い方:
 *   npx ts-node e2e/scripts/md-to-feature.ts [MDファイルパス...]
 *
 * 例:
 *   npx ts-node e2e/scripts/md-to-feature.ts               # e2e/test-scenarios/*.md を全変換
 *   npx ts-node e2e/scripts/md-to-feature.ts e2e/test-scenarios/1-1.md  # 特定ファイルのみ
 *
 * 変換ルール:
 *   - # 見出し                     → 機能: 見出し
 *   - > 説明文                     → 機能説明（インデント2スペース）
 *   - ## 背景                      → 背景:
 *   - 背景箇条書き                 → 前提 ... ステップ
 *   - ### N-N-N: タイトル          → シナリオ: [N-N-N] タイトル
 *   - **前提条件（Given）**        → Given ステップ
 *   - **操作手順（When）**         → When ステップ（番号付きリスト）
 *   - テーブル                     → Gherkin DataTable
 *   - **期待結果（Then）**         → Then ステップ（箇条書き）
 *   - ## 変換指示 以降は無視
 */

import * as fs from 'fs';
import * as path from 'path';

// ---------------------------------------------------------------------------
// 型定義
// ---------------------------------------------------------------------------

/** MDファイルから抽出したシナリオデータ */
interface ScenarioData {
  /** 項番 (例: "1-1-1") */
  number: string;
  /** シナリオタイトル */
  title: string;
  /** Given ステップ（生テキスト） */
  givenLines: string[];
  /** When ステップ（生テキスト + DataTable） */
  whenSteps: WhenStep[];
  /** Then ステップ（生テキスト） */
  thenLines: string[];
}

/** When ステップの1エントリー */
interface WhenStep {
  text: string;
  dataTable?: string[][];
}

/** MDファイルから抽出した機能データ */
interface FeatureData {
  /** 機能名 */
  featureTitle: string;
  /** 機能説明文 */
  featureDescription: string;
  /** 背景ステップ */
  backgroundLines: string[];
  /** シナリオ一覧 */
  scenarios: ScenarioData[];
  /** 出力先 featureファイルパス */
  outputFeaturePath: string;
}

// ---------------------------------------------------------------------------
// パーサー
// ---------------------------------------------------------------------------

/**
 * MD のメタデータテーブルから指定キーの値を取得する
 */
function extractMetaValue(lines: string[], key: string): string {
  for (const line of lines) {
    // | **キー** | 値 | の形式
    const match = line.match(new RegExp(`\\|\\s*\\*\\*${key}\\*\\*\\s*\\|\\s*(.+?)\\s*\\|`));
    if (match) return match[1].trim();
    // | キー | 値 | の形式（太字なし）
    const match2 = line.match(new RegExp(`\\|\\s*${key}\\s*\\|\\s*(.+?)\\s*\\|`));
    if (match2) return match2[1].trim();
  }
  return '';
}

/**
 * MD テーブル行をパースして 2次元配列に変換する
 * | col1 | col2 | → [["col1", "col2"]]
 */
function parseMdTable(lines: string[]): string[][] {
  const rows: string[][] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|')) continue;
    // ヘッダー区切り行（|---|---|）はスキップ
    if (/^\|[\s\-|:]+\|$/.test(trimmed)) continue;
    const cells = trimmed
      .split('|')
      .slice(1, -1) // 先頭・末尾の空要素を除去
      .map(c => c.trim());
    if (cells.length > 0) rows.push(cells);
  }
  return rows;
}

/**
 * バッククォートで囲まれたパスを取り出す
 * `e2e/features/foo.feature` → e2e/features/foo.feature
 */
function extractBacktickValue(text: string): string {
  const m = text.match(/`([^`]+)`/);
  return m ? m[1].trim() : text.trim();
}

/**
 * 背景セクションの箇条書きから Given ステップを生成する
 *
 * 例:
 *   - プロバイダーのユーザID "system.admin@example.com" がDBに存在する
 *   → 前提 プロバイダーのユーザID "system.admin@example.com" がDBに存在する
 *
 * スキップする行:
 *   - `_（...）_` のようなイタリック注記行
 *   - 空行
 */
function parseBackgroundLines(lines: string[]): string[] {
  const steps: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('- ')) continue;
    const text = trimmed.replace(/^- /, '').trim();
    // イタリック注記行（_..._ または *...*）はスキップ
    if (/^[_*].*[_*]$/.test(text)) continue;
    steps.push(text);
  }
  return steps;
}

/**
 * 操作手順（When）の番号付きリストを解析して WhenStep[] を返す
 *
 * 番号付きリスト: `1. テキスト`
 * DataTable: 続く `| col | col |` 行（備考 `>` 行は読み飛ばす）
 */
function parseWhenSteps(lines: string[]): WhenStep[] {
  const steps: WhenStep[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // 番号付きリスト
    const listMatch = trimmed.match(/^\d+\.\s+(.+)/);
    if (listMatch) {
      const stepText = listMatch[1].trim();
      const step: WhenStep = { text: stepText };

      // 続く行に DataTable があれば取り込む
      i++;
      const tableLines: string[] = [];
      while (i < lines.length) {
        const next = lines[i].trim();
        if (next.startsWith('|')) {
          tableLines.push(lines[i]);
          i++;
        } else if (next.startsWith('>')) {
          // 備考行はスキップ
          i++;
        } else if (next === '') {
          i++;
          // 空行の後も table が続く可能性があるので続けてチェック
          if (i < lines.length && lines[i].trim().startsWith('|')) {
            continue;
          } else {
            break;
          }
        } else {
          break;
        }
      }
      if (tableLines.length > 0) {
        step.dataTable = parseMdTable(tableLines);
      }
      steps.push(step);
    } else {
      i++;
    }
  }
  return steps;
}

/**
 * 期待結果（Then）の箇条書きからステップを生成する
 *
 * 例:
 *   - 画面: 組織一覧テーブルに "e2e_test_org_001" が表示されること
 *   - DB: `organization` テーブルに...
 */
function parseThenLines(lines: string[]): string[] {
  const steps: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('- ')) continue;
    let text = trimmed.replace(/^- /, '').trim();
    // "画面: " or "DB: " プレフィックスを除去
    text = text.replace(/^(?:画面|DB)\s*:\s*/, '');
    steps.push(text);
  }
  return steps;
}

/**
 * MD ファイルをパースして FeatureData を返す
 */
function parseMd(content: string, mdFilePath: string): FeatureData {
  const lines = content.split('\n');

  let featureTitle = '';
  let featureDescription = '';
  let outputFeaturePath = '';
  const backgroundLines: string[] = [];
  const scenarios: ScenarioData[] = [];

  // ---- パース状態 ----
  type Section =
    | 'none'
    | 'meta'
    | 'background'
    | 'scenario_given'
    | 'scenario_when'
    | 'scenario_then'
    | 'skip';

  let section: Section = 'none';
  let currentScenario: ScenarioData | null = null;
  // 各セクションのバッファ
  const givenBuf: string[] = [];
  const whenBuf: string[] = [];
  const thenBuf: string[] = [];

  const flushScenario = () => {
    if (!currentScenario) return;
    currentScenario.givenLines = parseBackgroundLines(givenBuf);
    currentScenario.whenSteps = parseWhenSteps(whenBuf);
    currentScenario.thenLines = parseThenLines(thenBuf);
    scenarios.push(currentScenario);
    currentScenario = null;
    givenBuf.length = 0;
    whenBuf.length = 0;
    thenBuf.length = 0;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // 変換指示セクションに到達したら以降をスキップ
    if (/^##\s+変換指示/.test(trimmed)) {
      flushScenario();
      section = 'skip';
      continue;
    }
    if (section === 'skip') continue;

    // --- h1: 機能名 ---
    const h1 = trimmed.match(/^#\s+(.+)/);
    if (h1 && !trimmed.startsWith('##')) {
      featureTitle = h1[1].trim();
      section = 'none';
      continue;
    }

    // --- 引用: 機能説明 ---
    if (trimmed.startsWith('> ') && featureTitle && !currentScenario) {
      featureDescription = trimmed.replace(/^>\s*/, '').trim();
      continue;
    }

    // --- h2: メタデータ ---
    if (/^##\s+メタデータ/.test(trimmed)) {
      section = 'meta';
      continue;
    }

    // --- h2: 背景 ---
    if (/^##\s+背景/.test(trimmed)) {
      flushScenario();
      section = 'background';
      continue;
    }

    // --- h3: シナリオ（N-N-N: タイトル） ---
    const h3Scenario = trimmed.match(/^###\s+(\d+-\d+-\d+)\s*[：:]\s*(.+)/);
    if (h3Scenario) {
      flushScenario();
      currentScenario = {
        number: h3Scenario[1],
        title: h3Scenario[2].trim(),
        givenLines: [],
        whenSteps: [],
        thenLines: [],
      };
      section = 'none';
      continue;
    }

    // --- h2: N-N: 処理名（シナリオグループ見出し、シナリオではない） ---
    if (/^##\s+\d+-\d+\s*[：:]/.test(trimmed)) {
      flushScenario();
      section = 'none';
      continue;
    }

    // --- **前提条件（Given）** ---
    if (/^\*\*前提条件[（(]Given[）)]\*\*/.test(trimmed)) {
      section = 'scenario_given';
      continue;
    }

    // --- **操作手順（When）** ---
    if (/^\*\*操作手順[（(]When[）)]\*\*/.test(trimmed)) {
      section = 'scenario_when';
      continue;
    }

    // --- **期待結果（Then）** ---
    if (/^\*\*期待結果[（(]Then[）)]\*\*/.test(trimmed)) {
      section = 'scenario_then';
      continue;
    }

    // --- **DB操作メモ** 以降はシナリオ本体ではない ---
    if (/^\*\*DB操作メモ\*\*/.test(trimmed) || /^\*\*UI要素情報\*\*/.test(trimmed) || /^\*\*備考\*\*/.test(trimmed)) {
      section = 'none';
      continue;
    }

    // --- h3 が来たらセクションリセット（上記でキャッチできない見出し） ---
    if (trimmed.startsWith('###')) {
      section = 'none';
      continue;
    }

    // --- セクション別の行処理 ---
    switch (section) {
      case 'meta':
        // メタデータテーブルから対応featureファイルパスを取得
        if (trimmed.includes('対応featureファイル')) {
          const raw = extractMetaValue([line], '対応featureファイル');
          outputFeaturePath = extractBacktickValue(raw);
        }
        break;

      case 'background':
        backgroundLines.push(line);
        break;

      case 'scenario_given':
        if (currentScenario) givenBuf.push(line);
        break;

      case 'scenario_when':
        if (currentScenario) whenBuf.push(line);
        break;

      case 'scenario_then':
        if (currentScenario) thenBuf.push(line);
        break;
    }
  }

  // 最後のシナリオをフラッシュ
  flushScenario();

  // 出力パスが取得できなかった場合はMDファイル名から推定
  if (!outputFeaturePath) {
    const baseName = path.basename(mdFilePath, '.md');
    outputFeaturePath = `e2e/features/${baseName}.feature`;
  }

  return {
    featureTitle,
    featureDescription,
    backgroundLines: parseBackgroundLines(backgroundLines),
    scenarios,
    outputFeaturePath,
  };
}

// ---------------------------------------------------------------------------
// ジェネレーター
// ---------------------------------------------------------------------------

/**
 * Gherkin DataTable 文字列を生成する（列幅を揃える）
 *
 * @param rows    2次元配列
 * @param indent  各行の先頭インデント
 */
function buildDataTable(rows: string[][], indent: string): string {
  if (rows.length === 0) return '';

  // 各列の最大幅を計算
  const colCount = Math.max(...rows.map(r => r.length));
  const widths: number[] = Array(colCount).fill(0);
  for (const row of rows) {
    for (let c = 0; c < row.length; c++) {
      widths[c] = Math.max(widths[c], [...row[c]].length); // Unicode 対応
    }
  }

  const tableLines = rows.map(row => {
    const cells = row.map((cell, c) => {
      // 右パディング（半角換算）
      const padLen = widths[c] - [...cell].length;
      return cell + ' '.repeat(padLen);
    });
    return `${indent}| ${cells.join(' | ')} |`;
  });

  return tableLines.join('\n');
}

/**
 * When ステップのテキストから Gherkin キーワード付き文言を生成する
 *
 * ルール:
 *   - 最初の When ステップ → `もし`
 *   - 以降の When ステップ → `かつ`
 */
function buildWhenGherkin(step: WhenStep, isFirst: boolean, indent: string): string {
  const keyword = isFirst ? 'もし' : 'かつ';
  let text = step.text;

  // "〜を開いて以下の情報を入力して保存する" → 短縮形に正規化
  text = text.replace(/組織追加(?:ダイアログ|モーダル)を開いて以下の情報を入力して保存する/, '組織追加モーダルで以下の情報を入力して保存する');

  // ユーザーID引用符の正規化
  // 例: ユーザーID "system.admin@example.com" でログインする → そのまま
  let line = `${indent}${keyword} ${text}`;

  if (step.dataTable && step.dataTable.length > 0) {
    const tableStr = buildDataTable(step.dataTable, indent + '  ');
    line += '\n' + tableStr;
  }

  return line;
}

/**
 * Then ステップのテキストから Gherkin キーワード付き文言を生成する
 *
 * ルール:
 *   - 最初の Then ステップ → `ならば`
 *   - 以降の Then ステップ → `かつ`
 */
function buildThenGherkin(text: string, isFirst: boolean, indent: string): string {
  const keyword = isFirst ? 'ならば' : 'かつ';
  return `${indent}${keyword} ${text}`;
}

/**
 * FeatureData から .feature ファイルの文字列を生成する
 */
function generateFeature(data: FeatureData): string {
  const lines: string[] = [];

  // ヘッダー
  lines.push('# language: ja');
  lines.push(`機能: ${data.featureTitle}`);

  if (data.featureDescription) {
    lines.push(`  ${data.featureDescription}`);
  }
  lines.push('');

  // 背景
  if (data.backgroundLines.length > 0) {
    lines.push('  背景:');
    data.backgroundLines.forEach((step, idx) => {
      const keyword = idx === 0 ? '前提' : 'かつ';
      lines.push(`    ${keyword} ${step}`);
    });
    lines.push('');
  }

  // シナリオ
  for (const scenario of data.scenarios) {
    lines.push(`  シナリオ: [${scenario.number}] ${scenario.title}`);

    // Given（シナリオ固有の前提条件がある場合）
    scenario.givenLines.forEach((step, idx) => {
      const keyword = idx === 0 ? '前提' : 'かつ';
      lines.push(`    ${keyword} ${step}`);
    });

    // When
    scenario.whenSteps.forEach((step, idx) => {
      const gherkin = buildWhenGherkin(step, idx === 0, '    ');
      lines.push(gherkin);
    });

    // Then
    scenario.thenLines.forEach((step, idx) => {
      lines.push(buildThenGherkin(step, idx === 0, '    '));
    });

    lines.push('');
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// メイン
// ---------------------------------------------------------------------------

function main(): void {
  const args = process.argv.slice(2);

  // 対象 MD ファイルを決定
  let mdFiles: string[];
  if (args.length > 0) {
    mdFiles = args.map(a => path.resolve(a));
  } else {
    // デフォルト: e2e/test-scenarios/*.md（TEMPLATE.md を除く）
    const scenariosDir = path.resolve('e2e/test-scenarios');
    mdFiles = fs
      .readdirSync(scenariosDir)
      .filter(f => f.endsWith('.md') && f !== 'TEMPLATE.md')
      .map(f => path.join(scenariosDir, f));
  }

  if (mdFiles.length === 0) {
    console.log('変換対象の MD ファイルが見つかりません。');
    console.log('使い方: npx ts-node e2e/scripts/md-to-feature.ts [MDファイルパス...]');
    process.exit(1);
  }

  console.log(`\n📄 MD → Feature 変換スクリプト`);
  console.log(`${'─'.repeat(50)}`);

  for (const mdFile of mdFiles) {
    console.log(`\n📂 入力: ${mdFile}`);

    if (!fs.existsSync(mdFile)) {
      console.error(`  ❌ ファイルが存在しません: ${mdFile}`);
      continue;
    }

    const content = fs.readFileSync(mdFile, 'utf-8');
    let featureData: FeatureData;

    try {
      featureData = parseMd(content, mdFile);
    } catch (err) {
      console.error(`  ❌ パースエラー: ${err}`);
      continue;
    }

    if (!featureData.featureTitle) {
      console.error(`  ❌ 機能名（# 見出し）が見つかりません`);
      continue;
    }

    if (featureData.scenarios.length === 0) {
      console.warn(`  ⚠️  シナリオが見つかりません（### N-N-N: タイトル 形式を確認してください）`);
    }

    const featureContent = generateFeature(featureData);

    // 出力先ディレクトリを作成
    const outputPath = path.resolve(featureData.outputFeaturePath);
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, featureContent, 'utf-8');

    console.log(`  ✅ 出力: ${outputPath}`);
    console.log(`     機能名: ${featureData.featureTitle}`);
    console.log(`     シナリオ数: ${featureData.scenarios.length}`);
    featureData.scenarios.forEach(s => {
      console.log(`       - [${s.number}] ${s.title}`);
    });
  }

  console.log(`\n${'─'.repeat(50)}`);
  console.log(`✨ 変換完了\n`);
}

main();
