/**
 * MaiML 評価単位別 イベントログ記述仕様 → Excel変換スクリプト
 * 出力: MaiML_評価単位別イベントログ記述仕様.xlsx
 * 実行: node generate_eval_units_excel.js
 */
const ExcelJS = require('./node_modules/exceljs');
const path = require('path');

const OUTPUT_PATH = path.join(__dirname, 'MaiML_評価単位別イベントログ記述仕様.xlsx');

// ===== スタイル定義 =====
const HEADER_FILL   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } };
const HEADER_FONT   = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
const SUB_FILL      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E75B6' } };
const SUB_FONT      = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
const ALT_FILL      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCE6F1' } };
const WHITE_FILL    = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
const OK_FILL       = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EFDA' } };
const NG_FILL       = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE4D6' } };
const WARN_FILL     = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } };
const PROJECT_FILL  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7030A0' } };
const METHOD_FILL   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } };
const TASK_FILL     = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E75B6' } };
const TRANS_FILL    = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0070C0' } };
const TRANS_C_FILL  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00B0F0' } };
const BORDER = {
  top: { style: 'thin' }, left: { style: 'thin' },
  bottom: { style: 'thin' }, right: { style: 'thin' }
};

function b(cell) { cell.border = BORDER; }

function hdr(row, vals, fills) {
  vals.forEach((v, i) => {
    const c = row.getCell(i + 1);
    c.value = v;
    c.font = HEADER_FONT;
    c.fill = (fills && fills[i]) ? fills[i] : HEADER_FILL;
    c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    b(c);
  });
  row.height = 30;
}

function row(ws, vals, isAlt, customFills) {
  const r = ws.addRow(vals);
  vals.forEach((_, i) => {
    const c = r.getCell(i + 1);
    c.fill = (customFills && customFills[i]) ? customFills[i] : (isAlt ? ALT_FILL : WHITE_FILL);
    c.alignment = { vertical: 'middle', wrapText: true };
    b(c);
  });
  r.height = 40;
  return r;
}

function title(ws, text) {
  const r = ws.addRow([text]);
  r.getCell(1).font = { bold: true, size: 14, color: { argb: 'FF1F4E79' } };
  r.height = 32;
  ws.addRow([]);
}

async function generate() {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'mmdpf';
  wb.created = new Date();

  // =========================================================
  // シート1: 評価単位対応表（概要）
  // =========================================================
  const s1 = wb.addWorksheet('1_評価単位対応表');
  s1.columns = [
    { key: 'a', width: 24 },
    { key: 'b', width: 22 },
    { key: 'c', width: 18 },
    { key: 'd', width: 18 },
    { key: 'e', width: 14 },
    { key: 'f', width: 45 },
  ];
  title(s1, 'MaiML 評価単位別 イベントログ記述仕様 — 概要対応表');

  // 階層図コメント
  const diag = s1.addRow(['【MaiML階層と評価単位の対応】']);
  diag.getCell(1).font = { bold: true, color: { argb: 'FF1F4E79' } };

  const diagLines = [
    ['document', '', '', '', '', '← owner定義（記入者マスタ）を一元管理'],
    ['  ├── protocol層', '', '', '', '', '← method / program / instruction 定義'],
    ['  └── eventLog層', '', '', '', '', '← 以下の評価単位すべてを格納'],
    ['       └── <eventLog>', '← プロジェクト単位', '', '', '', 'MaiML上は複数logの集合。直接対応要素なし'],
    ['            └── <log>', '← メソッド単位', '', '', '', 'ref="method_xxx" で対応メソッドを参照'],
    ['                 └── <trace>', '← タスク単位', '', '', '', 'ref="program_xxx" で対応タスクを参照'],
    ['                      └── <event>', '← トランジション単位', '', '', '', 'ref="instruction_xxx" で対応transitionを参照'],
  ];
  diagLines.forEach((line, i) => {
    const r = s1.addRow(line);
    r.getCell(1).font = { name: 'Courier New', size: 9 };
    r.getCell(2).font = { bold: true, color: { argb: 'FF1F4E79' }, size: 9 };
    r.getCell(6).font = { italic: true, color: { argb: 'FF595959' }, size: 9 };
    r.getCell(6).alignment = { wrapText: true };
    r.height = 20;
  });
  s1.addRow([]);

  // 対応表ヘッダ
  const s1hdr = s1.addRow(['評価単位', '対応するMaiML要素', 'ownerRef付与先', '適用ルール', '根拠条文', '備考']);
  s1hdr.getCell(1).value = '評価単位';
  [1,2,3,4,5,6].forEach(ci => {
    const c = s1hdr.getCell(ci);
    c.font = HEADER_FONT;
    c.fill = HEADER_FILL;
    c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    b(c);
  });
  s1hdr.height = 30;

  const units = [
    { name: 'プロジェクト', fill: PROJECT_FILL,
      elem: '<eventLog>内の集約<log>',
      owner: '<log>（直接）',
      rule: 'ルール3の集約',
      basis: 'K0200 6.5.2, 6.5.7',
      note: 'MaiML規格上「プロジェクト」要素なし。集約専用log（アプローチA）を推奨。' },
    { name: 'メソッド', fill: METHOD_FILL,
      elem: '<log>',
      owner: '<log>（直接）',
      rule: 'ルール3',
      basis: 'K0200 6.5.2, 6.5.7',
      note: '複数バッチ（複数traceの集約）もこの<log>に評価を記録する。' },
    { name: 'タスク', fill: TASK_FILL,
      elem: '<trace>',
      owner: '<trace>（直接）',
      rule: 'ルール2',
      basis: 'K0200 6.5.3, 6.5.7',
      note: 'タスク全体の評価者と個別instruction評価者が異なる場合は別ownerRefを使用。' },
    { name: 'トランジション\n（メソッド共通）', fill: TRANS_FILL,
      elem: '<log>直下property\n+ ns:TargetInstructions',
      owner: '<log>（直接）',
      rule: 'ケース⑤相当',
      basis: 'K0200 6.5.7',
      note: '複数taskに共通するtransitionへの評価。instructionのidをns:TargetInstructionsで列挙して対象を特定。' },
    { name: 'トランジション\n（タスクごと）', fill: TRANS_C_FILL,
      elem: '<event>',
      owner: '<event>（直接）',
      rule: 'ルール1',
      basis: 'K0200 6.5.4, 6.5.7',
      note: 'data層resultへの参照はconcept:instance + resultsRefで行う（ルール4）。OK/NG/complete+NG/多重評価の4パターン。' },
  ];

  units.forEach((u, i) => {
    const r = s1.addRow([u.name, u.elem, u.owner, u.rule, u.basis, u.note]);
    r.getCell(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    r.getCell(1).fill = u.fill;
    r.getCell(1).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    [2,3,4,5,6].forEach(ci => {
      r.getCell(ci).fill = i % 2 === 0 ? ALT_FILL : WHITE_FILL;
      r.getCell(ci).alignment = { wrapText: true, vertical: 'middle' };
    });
    r.getCell(4).fill = OK_FILL;
    r.getCell(4).font = { bold: true };
    r.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
    [1,2,3,4,5,6].forEach(ci => b(r.getCell(ci)));
    r.height = 50;
  });

  // =========================================================
  // シート2: プロジェクト単位の評価
  // =========================================================
  const s2 = wb.addWorksheet('2_プロジェクト単位');
  s2.columns = [
    { key: 'a', width: 35 },
    { key: 'b', width: 55 },
    { key: 'c', width: 20 },
  ];
  title(s2, 'プロジェクト単位の評価');

  // アプローチ比較
  const s2a = s2.addRow(['【アプローチ比較】']);
  s2a.getCell(1).font = { bold: true, color: { argb: 'FF7030A0' } };

  hdr(s2.addRow(['アプローチ', '内容', '適用場面']),
    ['アプローチ', '内容', '適用場面'],
    [PROJECT_FILL, PROJECT_FILL, PROJECT_FILL]);

  const approaches = [
    ['A. 専用logによる集約（推奨）',
      '<log ref="method_xxxProjectSummary"> という集約専用のlogを設け、プロジェクト全体の評価を記録する。ownerRefは<log>に直接付与。',
      'プロジェクト完了時の総合評価'],
    ['B. 各logの評価をシステム側で集約',
      '各<log>に記録された評価をアプリケーション側でまとめてプロジェクト評価とする。MaiML自体には集約評価の記録なし。',
      'リアルタイム集計・ダッシュボード'],
    ['C. <eventLog>要素直下への記録（独自拡張）',
      '<eventLog>要素に直接評価propertyを付与する。規格上の定義は要確認。',
      '軽量な実装'],
  ];
  approaches.forEach((a, i) => {
    const r = row(s2, a, i % 2 === 0);
    if (i === 0) { r.getCell(1).fill = OK_FILL; r.getCell(1).font = { bold: true, color: { argb: 'FF375623' } }; }
    r.height = 50;
  });

  s2.addRow([]);
  const s2note = s2.addRow(['📌 推奨: アプローチA（専用logによる集約）が最も規格準拠の度合いが高く、ownerRefの付与・トレーサビリティの観点からも明確。']);
  s2note.getCell(1).fill = WARN_FILL;
  s2note.getCell(1).font = { bold: true };
  s2note.getCell(1).alignment = { wrapText: true };
  b(s2note.getCell(1));
  s2note.height = 40;
  s2.mergeCells(`A${s2note.number}:C${s2note.number}`);

  s2.addRow([]);

  // propertyキー
  const s2pk = s2.addRow(['【プロジェクト評価で使用するpropertyキー】']);
  s2pk.getCell(1).font = { bold: true, color: { argb: 'FF7030A0' } };

  hdr(s2.addRow(['propertyキー', '型', '説明']),
    ['propertyキー', '型', '説明'],
    [PROJECT_FILL, PROJECT_FILL, PROJECT_FILL]);

  const projKeys = [
    ['ns:ProjectOverallPassFail', 'booleanType', 'プロジェクト全体のOK/NG（true=OK, false=NG）'],
    ['ns:ProjectOverallJudgement', 'stringType', 'プロジェクト全体の判定文字列（"OK" / "NG"）'],
    ['ns:ProjectSummaryComment', 'stringType', 'プロジェクト全体のコメント'],
    ['time:timestamp', 'dateType', '評価実施日時'],
  ];
  projKeys.forEach((k, i) => {
    const r = row(s2, k, i % 2 === 0);
    r.getCell(1).font = { bold: true, color: { argb: 'FF7030A0' } };
    r.height = 30;
  });

  // =========================================================
  // シート3: メソッド（log）単位の評価
  // =========================================================
  const s3 = wb.addWorksheet('3_メソッド単位');
  s3.columns = [
    { key: 'a', width: 35 },
    { key: 'b', width: 14 },
    { key: 'c', width: 55 },
  ];
  title(s3, 'メソッド（log）単位の評価 — ルール3');

  const s3note = s3.addRow(['ルール3: <log>の子要素として<ownerRef>を必須付与。架空のtrace/programを新設する必要はない。（根拠: K0200 6.5.2, 6.5.7）']);
  s3note.getCell(1).fill = OK_FILL; s3note.getCell(1).font = { bold: true };
  s3note.getCell(1).alignment = { wrapText: true }; b(s3note.getCell(1));
  s3.mergeCells(`A${s3note.number}:C${s3note.number}`);
  s3note.height = 36;
  s3.addRow([]);

  hdr(s3.addRow(['propertyキー / 要素', '型', '説明・記載内容']),
    ['propertyキー / 要素', '型', '説明・記載内容'],
    [METHOD_FILL, METHOD_FILL, METHOD_FILL]);

  const methodKeys = [
    ['ns:MethodOverallPassFail', 'booleanType', 'メソッド全体のOK/NG（true=OK, false=NG）'],
    ['ns:MethodOverallJudgement', 'stringType', 'メソッド全体の判定文字列（"OK" / "NG"）'],
    ['ns:MethodSummaryComment', 'stringType', 'メソッド全体のコメント（タスク数・結果サマリー等）'],
    ['ns:BatchOverallJudgement', 'stringType', '複数バッチ全体の集約判定（複数回実行の場合）'],
    ['ns:BatchSummary', 'stringType', '複数バッチのサマリー（例: "5バッチ中3バッチが規格内"）'],
    ['ns:BatchTotalCount', 'integerType', 'バッチ総数'],
    ['ns:BatchPassCount', 'integerType', 'OK（合格）バッチ数'],
    ['ns:BatchFailCount', 'integerType', 'NG（不合格）バッチ数'],
    ['time:timestamp', 'dateType', '評価実施日時'],
    ['<ownerRef> ★必須', '—', 'メソッド全体を評価した者を明示。id添字は親logの識別添字と揃える。\n例: id="ownerRef_xxxMethod_i01" ref="owner_xxxSupervisor"'],
  ];
  methodKeys.forEach((k, i) => {
    const r = row(s3, k, i % 2 === 0);
    r.getCell(1).font = k[0].startsWith('<') ?
      { bold: true, color: { argb: 'FFFF0000' } } :
      { bold: true, color: { argb: 'FF1F4E79' } };
    if (k[0].startsWith('<')) r.getCell(1).fill = WARN_FILL;
    r.height = 44;
  });

  // =========================================================
  // シート4: タスク（trace）単位の評価
  // =========================================================
  const s4 = wb.addWorksheet('4_タスク単位');
  s4.columns = [
    { key: 'a', width: 35 },
    { key: 'b', width: 14 },
    { key: 'c', width: 55 },
  ];
  title(s4, 'タスク（trace）単位の評価 — ルール2');

  const s4note = s4.addRow(['ルール2: <trace>の子要素として<ownerRef>を必須付与。（根拠: K0200 6.5.3, 6.5.7）']);
  s4note.getCell(1).fill = OK_FILL; s4note.getCell(1).font = { bold: true };
  s4note.getCell(1).alignment = { wrapText: true }; b(s4note.getCell(1));
  s4.mergeCells(`A${s4note.number}:C${s4note.number}`);
  s4note.height = 36;
  s4.addRow([]);

  hdr(s4.addRow(['propertyキー / 要素', '型', '説明・記載内容']),
    ['propertyキー / 要素', '型', '説明・記載内容'],
    [TASK_FILL, TASK_FILL, TASK_FILL]);

  const taskKeys = [
    ['ns:OverallPassFail', 'booleanType', 'タスク（工程）全体のOK/NG（true=OK, false=NG）'],
    ['ns:OverallJudgement', 'stringType', 'タスク全体の判定文字列（"OK" / "NG"）'],
    ['ns:OverallComment', 'stringType', 'タスク全体のコメント（異常有無・総合所見等）'],
    ['ns:RetestRequired', 'stringType', '再実施要否（"true" / "false"）。NGの場合に使用。'],
    ['time:timestamp', 'dateType', '評価実施日時'],
    ['<ownerRef> ★必須', '—', 'タスク全体を評価した者を明示。id添字は親traceの識別添字と揃える。\n例: id="ownerRef_xxxMeasurement_i01" ref="owner_xxxSupervisor"\n※タスク評価者と個別instruction評価者が異なる場合は別ownerRefを使用する。'],
  ];
  taskKeys.forEach((k, i) => {
    const r = row(s4, k, i % 2 === 0);
    r.getCell(1).font = k[0].startsWith('<') ?
      { bold: true, color: { argb: 'FFFF0000' } } :
      { bold: true, color: { argb: 'FF1F4E79' } };
    if (k[0].startsWith('<')) r.getCell(1).fill = WARN_FILL;
    r.height = 50;
  });

  s4.addRow([]);
  const s4add = s4.addRow(['📌 注記', 'タスク全体を評価した者（管理者）と、個々のinstruction（トランジション）を評価した者（実験者）が異なる場合は、それぞれ別の<owner>を参照するownerRefとなる（K0200 6.5.7）。', '']);
  s4add.getCell(1).font = { bold: true }; s4add.getCell(1).fill = WARN_FILL;
  s4add.getCell(2).fill = WARN_FILL; s4add.getCell(2).alignment = { wrapText: true };
  [1,2].forEach(ci => b(s4add.getCell(ci)));
  s4.mergeCells(`B${s4add.number}:C${s4add.number}`);
  s4add.height = 50;

  // =========================================================
  // シート5: トランジション（メソッド共通）の評価
  // =========================================================
  const s5 = wb.addWorksheet('5_トランジション_メソッド共通');
  s5.columns = [
    { key: 'a', width: 35 },
    { key: 'b', width: 14 },
    { key: 'c', width: 55 },
  ];
  title(s5, 'トランジション（メソッド共通）の評価 — ケース⑤相当');

  const s5note = s5.addRow(['複数taskに共通するtransitionへの評価。<log>直下propertyにns:TargetInstructionsで対象instruction idを列挙し、<ownerRef>を<log>に付与する。']);
  s5note.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDAE3F3' } };
  s5note.getCell(1).font = { bold: true };
  s5note.getCell(1).alignment = { wrapText: true }; b(s5note.getCell(1));
  s5.mergeCells(`A${s5note.number}:C${s5note.number}`);
  s5note.height = 48;
  s5.addRow([]);

  hdr(s5.addRow(['propertyキー / 要素', '型', '説明・記載内容']),
    ['propertyキー / 要素', '型', '説明・記載内容'],
    [TRANS_FILL, TRANS_FILL, TRANS_FILL]);

  const transCommonKeys = [
    ['ns:EvaluationTimestamp', 'dateType', '評価実施日時'],
    ['ns:EvaluationScope', 'stringType', '評価の適用範囲（例: "CommonTransitionEvaluation"）'],
    ['ns:TargetInstructions（複数並列可）', 'stringType', '評価対象のinstruction id。同じキーのpropertyを複数並べて複数transitionを列挙する。\n例: instruction_xxxWeighing_inPreparation / instruction_xxxWeighing_inAnalysis'],
    ['ns:CommonTransitionPassFail', 'booleanType', '共通transitionのOK/NG（true=OK, false=NG）'],
    ['ns:CommonTransitionJudgement', 'stringType', '共通transitionの判定文字列（"OK" / "NG"）'],
    ['ns:CommonTransitionComment', 'stringType', '共通transitionへの評価コメント'],
    ['<ownerRef> ★必須', '—', '評価者を明示。id添字は親logの識別添字と揃える。\n例: id="ownerRef_xxxMethod_i01" ref="owner_xxxSupervisor"'],
  ];
  transCommonKeys.forEach((k, i) => {
    const r = row(s5, k, i % 2 === 0);
    r.getCell(1).font = k[0].startsWith('<') ?
      { bold: true, color: { argb: 'FFFF0000' } } :
      { bold: true, color: { argb: 'FF1F4E79' } };
    if (k[0].startsWith('<')) r.getCell(1).fill = WARN_FILL;
    r.height = 50;
  });

  s5.addRow([]);
  const s5warn = s5.addRow(['⚠️ 注意', 'ns:TargetInstructionsに複数<value>を列挙する記述は、xsi:type="stringType"では1つのpropertyに1つのvalueが基本。複数対象を列挙する場合は同じキーのpropertyを複数並べるか、カンマ区切り文字列とするかを運用ルールとして明文化すること。', '']);
  s5warn.getCell(1).font = { bold: true }; s5warn.getCell(1).fill = NG_FILL;
  s5warn.getCell(2).fill = NG_FILL; s5warn.getCell(2).alignment = { wrapText: true };
  [1,2].forEach(ci => b(s5warn.getCell(ci)));
  s5.mergeCells(`B${s5warn.number}:C${s5warn.number}`);
  s5warn.height = 60;

  // =========================================================
  // シート6: トランジション（タスクごと）の評価
  // =========================================================
  const s6 = wb.addWorksheet('6_トランジション_タスクごと');
  s6.columns = [
    { key: 'a', width: 30 },
    { key: 'b', width: 22 },
    { key: 'c', width: 14 },
    { key: 'd', width: 14 },
    { key: 'e', width: 40 },
  ];
  title(s6, 'トランジション（タスクごと）の評価 — ルール1');

  const s6note = s6.addRow(['ルール1: 評価用propertyを含む<event>要素には<ownerRef>を必ず1つ以上付与する。（根拠: K0200 6.5.4, 6.5.7）']);
  s6note.getCell(1).fill = OK_FILL; s6note.getCell(1).font = { bold: true };
  s6note.getCell(1).alignment = { wrapText: true }; b(s6note.getCell(1));
  s6.mergeCells(`A${s6note.number}:E${s6note.number}`);
  s6note.height = 36;
  s6.addRow([]);

  // 4パターン比較
  const s6ph = s6.addRow(['【4パターン比較】']);
  s6ph.getCell(1).font = { bold: true, color: { argb: 'FF0070C0' } };

  hdr(s6.addRow(['パターン', 'lifecycle:transition', 'ns:PassFail', 'ns:JudgementResult', '主なpropertyと注意点']),
    ['パターン', 'lifecycle:transition', 'ns:PassFail', 'ns:JudgementResult', '主なpropertyと注意点'],
    [TRANS_C_FILL, TRANS_C_FILL, TRANS_C_FILL, TRANS_C_FILL, TRANS_C_FILL]);

  const patterns = [
    ['①正常終了（OK）', 'complete', 'true', 'OK',
      'concept:instance（result UUID） + resultsRef + ownerRef（Operator）が必須。'],
    ['②異常終了（NG）', 'ate_abort または pi_abort', 'false', 'NG',
      'ns:ErrorDescription（エラー内容）・ns:RiskLevel（High/Medium/Low）を付加。ownerRef（Operator）必須。'],
    ['③complete＋NG\n（正常完了・判定NG）', 'complete', 'false', 'NG',
      'ns:OutOfSpecReason（規格外理由・実測値と上限値）を付加。resultsRef + ownerRef（Operator）必須。'],
    ['④多重評価\n（実験者＋管理者）', 'complete', '—（個別キーで分離）', '—（個別キーで分離）',
      'ns:OperatorPassFail + ns:OperatorEvaluationTimestamp（実験者分）\nns:SupervisorPassFail + ns:SupervisorComment + ns:SupervisorEvaluationTimestamp（管理者分）\nownerRefを2つ（Operator + Supervisor）並べて記載。'],
  ];
  patterns.forEach((p, i) => {
    const r = s6.addRow(p);
    const fills = [
      i % 2 === 0 ? ALT_FILL : WHITE_FILL,
      i === 1 ? NG_FILL : (i === 2 ? { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE4D6' } } : (i % 2 === 0 ? ALT_FILL : WHITE_FILL)),
      p[2] === 'true' ? OK_FILL : (p[2] === 'false' ? NG_FILL : WARN_FILL),
      p[3] === 'OK' ? OK_FILL : (p[3] === 'NG' ? NG_FILL : WARN_FILL),
      i % 2 === 0 ? ALT_FILL : WHITE_FILL,
    ];
    fills.forEach((f, ci) => { r.getCell(ci + 1).fill = f; b(r.getCell(ci + 1)); });
    r.getCell(1).font = { bold: true };
    [1,2,3,4,5].forEach(ci => { r.getCell(ci).alignment = { wrapText: true, vertical: 'middle' }; });
    r.height = 60;
  });

  s6.addRow([]);

  // 共通propertyキー表
  const s6cpk = s6.addRow(['【共通propertyキー一覧（全パターン共通）】']);
  s6cpk.getCell(1).font = { bold: true, color: { argb: 'FF0070C0' } };
  s6.mergeCells(`A${s6cpk.number}:E${s6cpk.number}`);

  hdr(s6.addRow(['propertyキー', '型', '必須/任意', '', '説明']),
    ['propertyキー', '型', '必須/任意', '', '説明'],
    [TRANS_C_FILL, TRANS_C_FILL, TRANS_C_FILL, TRANS_C_FILL, TRANS_C_FILL]);

  const eventKeys = [
    ['lifecycle:transition', 'stringType', '必須', '', 'complete / ate_abort / pi_abort 等'],
    ['concept:instance', 'uuidType', '必須*', '', '対応する<result>要素のUUID（*resultがある場合）'],
    ['time:timestamp', 'dateType', '必須', '', 'イベント発生日時'],
    ['ns:PassFail', 'booleanType', '推奨', '', 'OK/NG評価（true=OK, false=NG）。多重評価時はOperatorPassFail/SupervisorPassFailに分離'],
    ['ns:JudgementResult', 'stringType', '推奨', '', '判定結果文字列。多重評価時はOperatorJudgement/SupervisorJudgementに分離'],
    ['ns:ErrorDescription', 'stringType', '任意', '', '異常終了（NG）の場合のエラー内容'],
    ['ns:RiskLevel', 'stringType', '任意', '', 'リスクレベル（"High" / "Medium" / "Low"）'],
    ['ns:OutOfSpecReason', 'stringType', '任意', '', 'complete+NGの場合の規格外理由（実測値・上限値等）'],
    ['ns:OperatorPassFail', 'booleanType', '任意', '', '多重評価時の実験者評価'],
    ['ns:SupervisorPassFail', 'booleanType', '任意', '', '多重評価時の管理者評価'],
    ['ns:SupervisorComment', 'stringType', '任意', '', '管理者のコメント'],
    ['ns:OperatorEvaluationTimestamp', 'dateType', '任意', '', '実験者の評価実施日時'],
    ['ns:SupervisorEvaluationTimestamp', 'dateType', '任意', '', '管理者の評価実施日時'],
    ['<resultsRef> ★', '—', '推奨', '', 'resultsコンテナへの参照。id・ref属性のみの自己完結タグで記載（ルール6）'],
    ['<ownerRef> ★必須', '—', '必須', '', '評価者への参照。id添字は親eventの識別添字と揃える（ルール6）'],
  ];
  eventKeys.forEach((k, i) => {
    const r = s6.addRow(k);
    const isRequired = k[2] === '必須';
    r.getCell(1).font = k[0].startsWith('<') ?
      { bold: true, color: { argb: 'FFFF0000' } } :
      { bold: true, color: { argb: 'FF1F4E79' } };
    r.getCell(2).fill = i % 2 === 0 ? ALT_FILL : WHITE_FILL;
    r.getCell(3).fill = isRequired ? WARN_FILL : (i % 2 === 0 ? ALT_FILL : WHITE_FILL);
    r.getCell(3).font = isRequired ? { bold: true } : {};
    r.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };
    r.getCell(4).fill = i % 2 === 0 ? ALT_FILL : WHITE_FILL;
    r.getCell(5).fill = i % 2 === 0 ? ALT_FILL : WHITE_FILL;
    r.getCell(5).alignment = { wrapText: true, vertical: 'middle' };
    r.getCell(1).fill = k[0].startsWith('<') ? WARN_FILL : (i % 2 === 0 ? ALT_FILL : WHITE_FILL);
    [1,2,3,4,5].forEach(ci => b(r.getCell(ci)));
    r.height = 32;
  });

  // =========================================================
  // シート7: 全単位まとめ比較表
  // =========================================================
  const s7 = wb.addWorksheet('7_全単位まとめ比較表');
  s7.columns = [
    { key: 'a', width: 26 },
    { key: 'b', width: 22 },
    { key: 'c', width: 18 },
    { key: 'd', width: 16 },
    { key: 'e', width: 22 },
    { key: 'f', width: 18 },
    { key: 'g', width: 40 },
  ];
  title(s7, '評価単位別 まとめ比較表');

  hdr(s7.addRow([]), ['評価単位', 'MaiML要素', '評価property\n記載先', 'ownerRef\n付与先', '付与方法', '根拠条文', '備考・注意点']);

  const summary = [
    { unit: 'プロジェクト', fill: PROJECT_FILL,
      elem: '<eventLog>内の集約<log>', propDest: '集約<log>直下', ownerDest: '<log>（直接）',
      method: '集約専用logに\nまとめて記載', basis: 'K0200 6.5.2\n6.5.7',
      note: 'MaiML規格上「プロジェクト」要素なし。集約専用log（アプローチA）を推奨。' },
    { unit: 'メソッド', fill: METHOD_FILL,
      elem: '<log>', propDest: '<log>直下', ownerDest: '<log>（直接）',
      method: '<log>の子要素\nとして付与', basis: 'K0200 6.5.2\n6.5.7\n（ルール3）',
      note: '複数バッチ集約もこの<log>に記録。Rev.2の架空trace新設回避策は不要（K0200 6.5.7で直接付与が正式許可）。' },
    { unit: 'タスク', fill: TASK_FILL,
      elem: '<trace>', propDest: '<trace>直下', ownerDest: '<trace>（直接）',
      method: '<trace>の子要素\nとして付与', basis: 'K0200 6.5.3\n6.5.7\n（ルール2）',
      note: 'タスク評価者と個別instruction評価者が異なる場合は別ownerRefを使用。ownerRef idの添字は親traceの識別添字と揃える。' },
    { unit: 'トランジション\n（メソッド共通）', fill: TRANS_FILL,
      elem: '<log>直下property\n+ ns:TargetInstructions', propDest: '<log>直下', ownerDest: '<log>（直接）',
      method: 'ns:TargetInstructionsで\ninstruction id列挙', basis: 'K0200 6.5.7\n（ケース⑤）',
      note: '複数instructionへの共通評価。ns:TargetInstructionsの複数値扱いは運用ルールを明文化すること。' },
    { unit: 'トランジション\n（タスクごと）', fill: TRANS_C_FILL,
      elem: '<event>', propDest: '<event>直下', ownerDest: '<event>（直接）',
      method: '<event>の子要素\nとして付与', basis: 'K0200 6.5.4\n6.5.7\n（ルール1）',
      note: 'data層resultへの参照はconcept:instance + resultsRefで行う（ルール4）。OK/NG/complete+NG/多重評価の4パターン。' },
  ];

  summary.forEach((s, i) => {
    const r = s7.addRow([s.unit, s.elem, s.propDest, s.ownerDest, s.method, s.basis, s.note]);
    r.getCell(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    r.getCell(1).fill = s.fill;
    r.getCell(1).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    [2,3,4,5,6,7].forEach(ci => {
      r.getCell(ci).fill = i % 2 === 0 ? ALT_FILL : WHITE_FILL;
      r.getCell(ci).alignment = { wrapText: true, vertical: 'middle' };
    });
    r.getCell(4).fill = OK_FILL;
    r.getCell(4).font = { bold: true };
    r.getCell(4).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    [1,2,3,4,5,6,7].forEach(ci => b(r.getCell(ci)));
    r.height = 60;
  });

  s7.addRow([]);

  // ownerRef付与パターン図
  const s7tree = s7.addRow(['【ownerRef付与パターンの整理（階層図）】']);
  s7tree.getCell(1).font = { bold: true, color: { argb: 'FF1F4E79' } };
  s7.mergeCells(`A${s7tree.number}:G${s7tree.number}`);

  const treeLines = [
    'プロジェクト評価',
    '  └── <log>（集約専用）        ← ownerRef付与（ルール3）',
    '       └── <trace>             ← ownerRef付与（ルール2）',
    '             └── <event>       ← ownerRef付与（ルール1）',
    '                   └── data層 <result>  ← ownerRef付与しない（ルール4）',
    '                         ↑ concept:instance + resultsRefで<event>から間接追跡',
  ];
  treeLines.forEach(line => {
    const r = s7.addRow([line]);
    r.getCell(1).font = { name: 'Courier New', size: 10 };
    r.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
    r.getCell(1).alignment = { wrapText: false };
    b(r.getCell(1));
    s7.mergeCells(`A${r.number}:G${r.number}`);
    r.height = 22;
  });

  // =========================================================
  // 保存
  // =========================================================
  await wb.xlsx.writeFile(OUTPUT_PATH);
  console.log('✓ Excel file created: ' + OUTPUT_PATH);
}

generate().catch(e => { console.error(e); process.exit(1); });
