/**
 * MaiML 評価記入・実験指示記述方法 仕様書 → Excel変換スクリプト
 */
const ExcelJS = require('./node_modules/exceljs');
const path = require('path');

const OUTPUT_PATH = path.join(__dirname, 'MaiML_評価記入・実験指示記述方法.xlsx');

// ===== スタイル定義 =====
const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } };
const HEADER_FONT = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
const SUB_HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E75B6' } };
const SUB_HEADER_FONT = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
const ALT_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCE6F1' } };
const BORDER = {
  top: { style: 'thin' }, left: { style: 'thin' },
  bottom: { style: 'thin' }, right: { style: 'thin' }
};
const WARN_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } };
const OK_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EFDA' } };
const NG_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE4D6' } };

function applyBorder(cell) { cell.border = BORDER; }

function setHeader(row, values, fills) {
  // valuesが省略または nullの場合はrowに既に設定済みの値を使う
  if (!values) {
    let ci = 1;
    while (true) {
      const cell = row.getCell(ci);
      if (!cell.value && ci > 1) break;
      if (ci > 20) break;
      cell.font = HEADER_FONT;
      cell.fill = fills ? fills[ci-1] || HEADER_FILL : HEADER_FILL;
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      applyBorder(cell);
      ci++;
    }
  } else {
    values.forEach((v, i) => {
      const cell = row.getCell(i + 1);
      cell.value = v;
      cell.font = HEADER_FONT;
      cell.fill = fills ? fills[i] || HEADER_FILL : HEADER_FILL;
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      applyBorder(cell);
    });
  }
  row.height = 28;
}

function setRow(row, values, isAlt, customFills) {
  values.forEach((v, i) => {
    const cell = row.getCell(i + 1);
    cell.value = v;
    cell.fill = customFills && customFills[i] ? customFills[i] : (isAlt ? ALT_FILL : { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } });
    cell.alignment = { vertical: 'middle', wrapText: true };
    applyBorder(cell);
  });
  row.height = 36;
}

async function generate() {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'mmdpf';
  wb.created = new Date();

  // =========================================================
  // シート1: 用語定義
  // =========================================================
  const s1 = wb.addWorksheet('1_用語定義');
  s1.columns = [
    { key: 'a', width: 28 },
    { key: 'b', width: 60 },
  ];
  const s1Title = s1.addRow(['MaiML 用語・要素の定義（第2章）']);
  s1Title.getCell(1).font = { bold: true, size: 14, color: { argb: 'FF1F4E79' } };
  s1Title.height = 30;
  s1.addRow([]);
  setHeader(s1.addRow(['用語 / 要素', '説明']), null);

  const terms = [
    ['<owner>', '評価者・記入者本体の定義。<document>直下で一元管理する。'],
    ['<ownerRef>', '<owner>への参照。ref属性でownerのidを指定。event/trace/logに付与する。'],
    ['<resultsRef>', 'resultsコンテナへの参照。どのresultsグループに属するかを示す。'],
    ['concept:instance', '個々のresultのUUIDを指定するproperty。特定のresult要素を一意に追跡するために使用する。'],
    ['lifecycle:transition', 'eventのライフサイクル状態。schedule / assign / start / complete / ate_abort / pi_abort 等。'],
    ['<log>', '複数のtraceをまとめる最上位ログ単位。methodに対応。'],
    ['<trace>', '1回の一連の工程全体。programに対応。'],
    ['<event>', '特定instructionに対する行為記録。instructionにrefで対応。'],
    ['<result>', '実験結果・評価値を格納するdata層要素。'],
    ['<condition>', '実験条件・パラメータを格納するdata層要素。'],
    ['<uncertainty>', '測定値の不確かさを格納。<property>の子要素として記載する。'],
  ];
  terms.forEach((r, i) => {
    const row = s1.addRow(r);
    row.getCell(1).font = { bold: true, color: { argb: 'FF1F4E79' } };
    row.getCell(2).alignment = { wrapText: true, vertical: 'middle' };
    row.getCell(1).fill = i % 2 === 0 ? ALT_FILL : { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
    row.getCell(2).fill = row.getCell(1).fill;
    applyBorder(row.getCell(1));
    applyBorder(row.getCell(2));
    row.height = 40;
  });

  // =========================================================
  // シート2: 評価統一ルール
  // =========================================================
  const s2 = wb.addWorksheet('2_評価統一ルール');
  s2.columns = [
    { key: 'a', width: 8 },
    { key: 'b', width: 30 },
    { key: 'c', width: 55 },
    { key: 'd', width: 20 },
    { key: 'e', width: 18 },
  ];
  const s2Title = s2.addRow(['評価記入 統一ルール（Rev.3） 根拠：JIS K 0200:2024']);
  s2Title.getCell(1).font = { bold: true, size: 14, color: { argb: 'FF1F4E79' } };
  s2Title.height = 30;
  s2.addRow([]);
  setHeader(s2.addRow(['No.', 'ルール名', '内容', '根拠条文', 'Rev.3修正']), null);

  const rules = [
    ['1', 'event単位の評価には<ownerRef>を必須とする',
      '評価用の<property>（PassFail、JudgementResult等）を1つ以上含む<event>要素には、対応する評価者を示す<ownerRef>要素を必ず1つ以上、子要素として付与する。',
      'K0200 6.5.4, 6.5.7', '—'],
    ['2', 'trace単位（工程全体）の評価には<ownerRef>を必須とする',
      '<trace>要素自身に工程全体の評価用<property>（OverallPassFail等）を記載する場合、その<trace>要素にも対応する<ownerRef>要素を必ず付与する。',
      'K0200 6.5.3, 6.5.7', 'ownerRef id添字を親traceの識別添字に統一'],
    ['3', 'log単位（複数trace集約）の評価には<ownerRef>を必須とする',
      '複数の<trace>をまとめて評価する場合、評価用<property>を<log>要素に記載し、<ownerRef>を<log>要素の子要素として直接付与する。架空のtrace/programを新設する必要はない。',
      'K0200 6.5.2, 6.5.7', 'Rev.2の架空trace新設回避策を撤回。<log>への直接付与が正式許可されていることを確認'],
    ['4', 'data層の評価値にはownerRefを直接付与しない（event経由で追跡）',
      '<result>/<property>で記載される評価値には<ownerRef>を直接付与しない。代わりに、その評価値を参照する<event>要素が持つ①concept:instance（対象resultのUUID）②<resultsRef>（対象resultsコンテナのID）③<ownerRef>（誰が評価したか）の組み合わせで追跡する。',
      'K0200 7.7', '—'],
    ['5', '<owner>要素の一元管理',
      '<owner>要素は<document>要素直下で一度だけ定義する。以降のすべての参照は<ownerRef>要素（ref属性による参照）で行い、同一評価者の情報を複数箇所に重複して記載しない。',
      'K0200 6.2.5', '—'],
    ['6', '参照要素の記載形式・命名規則を統一する',
      '<ownerRef>・<resultsRef>は原則として自己完結タグ（id・ref属性のみ）として記載する（<uuid>・<name>・<description>子要素は任意）。<ownerRef>のid属性の接頭辞"ownerRef"に続く添字は、親要素（event/trace/log）の識別用添字と揃える。',
      'ガイドライン 9.13.1注記1', 'Rev.2のresultsRefにid属性が欠けていた点を修正'],
  ];
  rules.forEach((r, i) => {
    const row = s2.addRow(r);
    const fills = [
      { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } },
      i % 2 === 0 ? ALT_FILL : { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } },
      i % 2 === 0 ? ALT_FILL : { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } },
      i % 2 === 0 ? ALT_FILL : { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } },
      r[4] !== '—' ? WARN_FILL : (i % 2 === 0 ? ALT_FILL : { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } }),
    ];
    fills.forEach((f, ci) => { row.getCell(ci + 1).fill = f; applyBorder(row.getCell(ci + 1)); });
    row.getCell(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    [2,3,4,5].forEach(ci => { row.getCell(ci).alignment = { wrapText: true, vertical: 'middle' }; });
    row.height = 70;
  });

  // =========================================================
  // シート3: 評価記載対応表
  // =========================================================
  const s3 = wb.addWorksheet('3_評価記載対応表');
  s3.columns = [
    { key: 'a', width: 40 },
    { key: 'b', width: 45 },
    { key: 'c', width: 16 },
    { key: 'd', width: 20 },
  ];
  const s3Title = s3.addRow(['評価記載箇所と評価者明示方法の対応表（3.8）']);
  s3Title.getCell(1).font = { bold: true, size: 14, color: { argb: 'FF1F4E79' } };
  s3Title.height = 30;
  s3.addRow([]);
  setHeader(s3.addRow(['評価記載箇所', '評価者の明示方法', '根拠', 'ownerRef付与先']));

  const corr = [
    ['data層 <result>/<property>（定量・定性評価）',
      'concept:instance / resultsRef と ownerRef を持つ <event> 経由で追跡（ルール4）',
      'K0200 7.7', '<event>（間接）'],
    ['eventLog層 <trace>（工程全体評価）',
      '<trace>の子要素として<ownerRef>を必須付与（ルール2）',
      'K0200 6.5.7', '<trace>（直接）'],
    ['eventLog層 <log>（複数trace集約評価）',
      '<log>の子要素として<ownerRef>を必須付与（ルール3）',
      'K0200 6.5.7', '<log>（直接）'],
    ['eventLog層 <event>（instruction単位のOK/NG評価）',
      '<event>の子要素として<ownerRef>を必須付与（ルール1）',
      'K0200 6.5.7', '<event>（直接）'],
    ['eventLog層 <event>（実験者/管理者の多重評価）',
      '評価者ごとに独自propertyキー＋<ownerRef>で書き分け',
      'ガイドライン 9.13', '<event>（直接）'],
  ];
  corr.forEach((r, i) => {
    const row = s3.addRow(r);
    const isAlt = i % 2 === 0;
    const lastFill = r[3].includes('間接') ? WARN_FILL : OK_FILL;
    [1,2,3].forEach(ci => {
      row.getCell(ci).fill = isAlt ? ALT_FILL : { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
      row.getCell(ci).alignment = { wrapText: true, vertical: 'middle' };
      applyBorder(row.getCell(ci));
    });
    row.getCell(4).fill = lastFill;
    row.getCell(4).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    row.getCell(4).font = { bold: true };
    applyBorder(row.getCell(4));
    row.height = 44;
  });

  // 凡例
  s3.addRow([]);
  const legend = s3.addRow(['凡例：', '緑＝直接付与（ownerRefをその要素に直接記述）', '黄＝間接付与（event経由でdata層resultを追跡）', '']);
  legend.getCell(1).font = { bold: true };
  legend.getCell(2).fill = OK_FILL; legend.getCell(2).alignment = { wrapText: true };
  legend.getCell(3).fill = WARN_FILL; legend.getCell(3).alignment = { wrapText: true };
  [1,2,3].forEach(ci => applyBorder(legend.getCell(ci)));

  // =========================================================
  // シート4: 移行チェックリスト
  // =========================================================
  const s4 = wb.addWorksheet('4_移行チェックリスト');
  s4.columns = [
    { key: 'a', width: 8 },
    { key: 'b', width: 70 },
    { key: 'c', width: 12 },
    { key: 'd', width: 30 },
  ];
  const s4Title = s4.addRow(['既存データ・実装の移行チェックリスト（3.9）']);
  s4Title.getCell(1).font = { bold: true, size: 14, color: { argb: 'FF1F4E79' } };
  s4Title.height = 30;
  s4.addRow([]);
  setHeader(s4.addRow(['No.', '確認項目', 'ステータス', '備考']));

  const checks = [
    ['1', '評価用propertyを含むすべての<event>要素に<ownerRef>が付与されているか（ルール1）', '未確認', ''],
    ['2', '<trace>要素に工程全体評価のpropertyを記載している場合、同じ<trace>にownerRefが付与されているか（ルール2）', '未確認', ''],
    ['3', '<log>要素に複数バッチ集約評価のpropertyを記載している場合、同じ<log>にownerRefが直接付与されているか（ルール3。架空のtrace/eventを新設する必要はない）', '未確認', ''],
    ['4', '<result>を参照するeventに、concept:instance（対象resultのUUID）・resultsRef（対象resultsコンテナ）・ownerRef（評価者）が揃っているか（ルール4）', '未確認', ''],
    ['5', '<owner>要素が<document>直下で重複なく一元管理され、すべての参照がownerRefで行われているか（ルール5）', '未確認', ''],
    ['6', '<ownerRef>・<resultsRef>の記載形式（自己完結タグ）とid命名規則（親要素の識別添字と一致）が統一されているか（ルール6）', '未確認', ''],
    ['7', '複数の評価者が存在する場合、評価者ごとに独自propertyキーとownerRefのペアが明確に分離されているか', '未確認', ''],
  ];
  checks.forEach((r, i) => {
    const row = s4.addRow(r);
    const isAlt = i % 2 === 0;
    row.getCell(1).font = { bold: true, color: { argb: 'FF1F4E79' } };
    row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(2).alignment = { wrapText: true, vertical: 'middle' };
    row.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(4).alignment = { wrapText: true, vertical: 'middle' };
    [1,2,3,4].forEach(ci => {
      row.getCell(ci).fill = isAlt ? ALT_FILL : { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
      applyBorder(row.getCell(ci));
    });
    row.height = 50;
  });

  // =========================================================
  // シート5: event vs condition比較
  // =========================================================
  const s5 = wb.addWorksheet('5_event_vs_condition比較');
  s5.columns = [
    { key: 'a', width: 22 },
    { key: 'b', width: 50 },
    { key: 'c', width: 50 },
  ];
  const s5Title = s5.addRow(['event記載 vs condition記載 得失比較（4.1）']);
  s5Title.getCell(1).font = { bold: true, size: 14, color: { argb: 'FF1F4E79' } };
  s5Title.height = 30;
  s5.addRow([]);
  const s5h = s5.addRow(['観点', '<event>内に記載（推奨）', '<condition>内に記載']);
  s5h.getCell(1).font = HEADER_FONT; s5h.getCell(1).fill = HEADER_FILL; s5h.getCell(1).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  s5h.getCell(2).font = { bold: true, color: { argb: 'FFFFFFFF' } }; s5h.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF375623' } }; s5h.getCell(2).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  s5h.getCell(3).font = { bold: true, color: { argb: 'FFFFFFFF' } }; s5h.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF843C0C' } }; s5h.getCell(3).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  [1,2,3].forEach(ci => applyBorder(s5h.getCell(ci)));
  s5h.height = 28;

  const evCond = [
    ['意味的な位置づけ',
      '「いつ・誰が・何を指示・記録したか」という行為のログ。ペトリネットのtransition（操作）に対応。',
      '「実験条件・パラメータ」として記載。ペトリネットのplace（ノード）に対応。'],
    ['owner（誰が）の表現',
      '<ownerRef>で記載者を直接紐付け可能。複数のowner（実験者・管理者）を時系列の別eventで明確に区別できる。',
      '<condition>自体にはownerを直接結びつける標準要素がない。独自propertyで記載するしかない。'],
    ['時刻（いつ）の表現',
      'time:timestampが必須級の標準キーとして用意されており、行為発生時刻を厳密に記録できる。',
      '<condition>には標準の時刻キーがない。独自にns:SupervisorDirectiveTimestamp等を追加する必要がある。'],
    ['ライフサイクル状態の表現',
      'lifecycle:transition（schedule/assign/start/complete等）で「指示はどの段階のものか」を明示できる。',
      'ライフサイクルの概念がそもそも存在しない。conditionはあくまで静的な値の集合。'],
    ['再利用性（テンプレート機構）',
      'eventはprotocol層のinstructionに1対1で対応するログであり、テンプレート上書き機構の対象外。',
      'conditionTemplateの値を継承し、変更がない場合は省略できる（6.4.5の上書き規定）。「いつもの指示」を毎回書かずに済む。'],
    ['機械判読時の分離のしやすさ',
      '「指示ログ」「評価ログ」をeventのプロパティ・lifecycle種別で機械的に分離しやすい。',
      'conditionの中に指示・実条件・評価が混在すると、用途別の抽出が複雑になる。'],
    ['検索・トレーサビリティ',
      'event[ref=instruction][lifecycle:transition=assign]というXPathで一意に絞り込める。',
      'conditionはresults内に埋もれるため、「指示だけ」を取り出すには独自keyでの検索が必要。'],
    ['仕様上の正当性',
      '6.5節で「ログ」として正式に位置づけられた要素であり、追跡可能性の趣旨に合致。',
      '6.4.5では「操作のためのパラメータ」と定義されており、指示事項を条件として書くのは仕様の定義からは外れた拡張的な使い方。'],
  ];
  evCond.forEach((r, i) => {
    const row = s5.addRow(r);
    const isAlt = i % 2 === 0;
    row.getCell(1).font = { bold: true };
    row.getCell(1).fill = isAlt ? ALT_FILL : { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
    row.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isAlt ? 'FFE2EFDA' : 'FFFFFFFF' } };
    row.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isAlt ? 'FFFCE4D6' : 'FFFFFFFF' } };
    [1,2,3].forEach(ci => { row.getCell(ci).alignment = { wrapText: true, vertical: 'middle' }; applyBorder(row.getCell(ci)); });
    row.height = 60;
  });

  // 結論
  s5.addRow([]);
  const conc = s5.addRow(['【結論】', '実験指示の記述には原則として<event>を使用する。<condition>への記載は許容誤差等の「値」を格納する場合に限定し、指示の「文脈・理由・担当者・時刻」は常に<event>で記載する。', '']);
  conc.getCell(1).font = { bold: true, color: { argb: 'FF1F4E79' } };
  conc.getCell(2).fill = OK_FILL; conc.getCell(2).alignment = { wrapText: true }; conc.getCell(2).font = { bold: true };
  [1,2].forEach(ci => applyBorder(conc.getCell(ci)));
  conc.height = 40;

  // =========================================================
  // シート6: ライフサイクル
  // =========================================================
  const s6 = wb.addWorksheet('6_ライフサイクル');
  s6.columns = [
    { key: 'a', width: 22 },
    { key: 'b', width: 55 },
    { key: 'c', width: 20 },
  ];
  const s6Title = s6.addRow(['lifecycle:transition の種類と使い分け（4.2）']);
  s6Title.getCell(1).font = { bold: true, size: 14, color: { argb: 'FF1F4E79' } };
  s6Title.height = 30;
  s6.addRow([]);
  setHeader(s6.addRow(['lifecycle:transition値', '使用場面', '担当者（owner）']));

  const lc = [
    ['schedule', '実験の予定だけが通知された段階（具体的な実施指示はまだ確定していない）', 'Supervisor'],
    ['assign', '実験者に対して具体的な作業指示・注意事項が割り当てられた段階', 'Supervisor'],
    ['start', '実験者が実際に作業を開始した段階', 'Operator'],
    ['complete', '実験者が作業を完了し、その場での評価を記録する段階', 'Operator'],
    ['ate_abort', '例外による中断（異常終了）', 'Operator'],
    ['pi_abort', '処理中のシステム終了による中断', 'Operator'],
    ['review ※独自拡張', '管理者の後日評価（独自拡張として定義する場合）', 'Supervisor'],
  ];
  lc.forEach((r, i) => {
    const row = s6.addRow(r);
    const fills = [
      { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E75B6' } },
      i % 2 === 0 ? ALT_FILL : { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } },
      { type: 'pattern', pattern: 'solid', fgColor: { argb: r[2] === 'Supervisor' ? 'FFFFE699' : 'FFD9EAD3' } },
    ];
    fills.forEach((f, ci) => { row.getCell(ci + 1).fill = f; applyBorder(row.getCell(ci + 1)); });
    row.getCell(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(2).alignment = { wrapText: true, vertical: 'middle' };
    row.getCell(3).alignment = { horizontal: 'center', vertical: 'middle', bold: true };
    row.height = 36;
  });

  // 時系列
  s6.addRow([]);
  const tsTitle = s6.addRow(['【時系列フロー】', '', '']);
  tsTitle.getCell(1).font = { bold: true, color: { argb: 'FF1F4E79' } };
  const ts = [
    ['schedule', '予定通知', 'Supervisor'],
    ['↓', '', ''],
    ['assign', '指示事項の割当て', 'Supervisor'],
    ['↓', '', ''],
    ['start', '実験開始', 'Operator'],
    ['↓', '', ''],
    ['complete', '実験完了・実験者評価', 'Operator'],
    ['↓', '', ''],
    ['review（独自拡張）', '管理者の後日評価', 'Supervisor'],
  ];
  ts.forEach(r => {
    const row = s6.addRow(r);
    if (r[0] !== '↓') {
      row.getCell(1).font = { bold: true, color: { argb: 'FF1F4E79' } };
      row.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: r[2] === 'Supervisor' ? 'FFFFE699' : 'FFD9EAD3' } };
    } else {
      row.getCell(1).font = { size: 14, bold: true };
      row.height = 20;
    }
    row.getCell(2).alignment = { wrapText: true };
    row.height = row.height || 28;
  });

  // =========================================================
  // シート7: 指示分類マトリクス
  // =========================================================
  const s7 = wb.addWorksheet('7_指示分類マトリクス');
  s7.columns = [
    { key: 'a', width: 18 },
    { key: 'b', width: 30 },
    { key: 'c', width: 30 },
    { key: 'd', width: 35 },
  ];
  const s7Title = s7.addRow(['指示の分類マトリクス（範囲×対象）（4.3）']);
  s7Title.getCell(1).font = { bold: true, size: 14, color: { argb: 'FF1F4E79' } };
  s7Title.height = 30;
  s7.addRow([]);

  // マトリクスヘッダ
  const mx1 = s7.addRow(['', '対象＝手順全体／実験全体', '対象＝特定transition', '対象＝特定material/condition']);
  mx1.getCell(1).fill = HEADER_FILL;
  [2,3,4].forEach(ci => {
    mx1.getCell(ci).fill = SUB_HEADER_FILL;
    mx1.getCell(ci).font = SUB_HEADER_FONT;
    mx1.getCell(ci).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    applyBorder(mx1.getCell(ci));
  });
  applyBorder(mx1.getCell(1));
  mx1.height = 36;

  const mx2 = s7.addRow(['範囲＝全体共通', '①<log>直下property\n（instruction不要）', '⑤<log>直下property＋UUID参照で対象特定', '⑥<log>直下property＋conditionTemplate']);
  const mx3 = s7.addRow(['範囲＝特定task', '②<trace>直下property\n（instruction不要）', '③<event>（instructionをref）', '④<condition>/<material>+<event>（resultsRef経由）']);

  [mx2, mx3].forEach((row, ri) => {
    row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E75B6' } };
    row.getCell(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    [2,3,4].forEach(ci => {
      row.getCell(ci).fill = ri === 0 ? ALT_FILL : { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
      row.getCell(ci).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      row.getCell(ci).font = { bold: true, color: { argb: 'FF1F4E79' } };
      applyBorder(row.getCell(ci));
    });
    applyBorder(row.getCell(1));
    row.height = 50;
  });

  // 判別ルール
  s7.addRow([]);
  const judge = s7.addRow(['【判別ルール（最重要）】', '指示が1つの特定taskの特定instruction実行に直接紐づく場合（③④）のみ<event>を使い、それ以外（①②⑤⑥）は<log>/<trace>への直接property記載に統一する。', '', '']);
  judge.getCell(1).font = { bold: true, color: { argb: 'FFFF0000' } };
  judge.getCell(2).fill = WARN_FILL; judge.getCell(2).font = { bold: true }; judge.getCell(2).alignment = { wrapText: true };
  [1,2].forEach(ci => applyBorder(judge.getCell(ci)));
  s7.mergeCells(`B${judge.number}:D${judge.number}`);
  judge.height = 50;

  // ケース別一覧
  s7.addRow([]);
  const s7h2 = s7.addRow(['ケース', '記載場所', 'instruction参照の要否', '備考']);
  setHeader(s7h2, null);

  const cases = [
    ['① 全体共通・実験全体', '<log>直下に<property>', '不要', '<ownerRef>は<log>に付与'],
    ['② 特定task・手順全体', '<trace>直下に<property>', '不要', '<ownerRef>は<trace>に付与'],
    ['③ 特定task・特定transition', '該当instructionをrefする<event>（assign）', '必要（自然な対応）', '<ownerRef>は<event>に付与'],
    ['④ 特定task・特定material/condition', '<condition>/<material>+対応する<event>', '必要（resultsRef経由）', '<ownerRef>は<event>に付与'],
    ['⑤ 全体共通・特定transition', '関係する各traceの<event>に同一内容を複製', '必要（各taskごとに対応）', 'ns:TargetInstructionsでinstruction id列挙推奨'],
    ['⑥ 全体共通・特定material/condition', '<*Template>のデフォルト値+<log>直下の<property>', '不要（Template機構で十分）', '<ownerRef>は<log>に付与'],
  ];
  cases.forEach((r, i) => {
    const row = s7.addRow(r);
    const needFill = r[2].startsWith('必要') ? NG_FILL : OK_FILL;
    const isAlt = i % 2 === 0;
    row.getCell(1).font = { bold: true, color: { argb: 'FF1F4E79' } };
    row.getCell(1).fill = isAlt ? ALT_FILL : { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
    row.getCell(2).fill = isAlt ? ALT_FILL : { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
    row.getCell(3).fill = needFill;
    row.getCell(3).font = { bold: true };
    row.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(4).fill = isAlt ? ALT_FILL : { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
    [1,2,3,4].forEach(ci => { row.getCell(ci).alignment = row.getCell(ci).alignment || { wrapText: true, vertical: 'middle' }; applyBorder(row.getCell(ci)); });
    row.height = 40;
  });

  // =========================================================
  // シート8: ケース別記述方法まとめ
  // =========================================================
  const s8 = wb.addWorksheet('8_ケース別記述方法');
  s8.columns = [
    { key: 'a', width: 22 },
    { key: 'b', width: 30 },
    { key: 'c', width: 18 },
    { key: 'd', width: 20 },
    { key: 'e', width: 40 },
  ];
  const s8Title = s8.addRow(['ケース別記述方法まとめ（4.4 / 4.5）']);
  s8Title.getCell(1).font = { bold: true, size: 14, color: { argb: 'FF1F4E79' } };
  s8Title.height = 30;
  s8.addRow([]);
  setHeader(s8.addRow(['ケース', '記載場所', '必要なownerRef', 'instructionへの参照', 'ポイント・注意事項']));

  const caseDetail = [
    ['① 全体共通・実験全体', '<log>直下 property', '<log>に付与', '不要',
      '実験全体への管理者メッセージ。ns:SupervisorDirectiveContent等の独自keyで記載。'],
    ['② 特定task・手順全体', '<trace>直下 property', '<trace>に付与', '不要',
      '特定taskの手順全体への指示。そのtrace内のevent（各instruction）とは独立して記載。'],
    ['③ 特定task・特定transition', '<event>（lifecycle:transition=assign）', '<event>に付与', '必要（refで指定）',
      'assignイベントとしてinstruction_xxxのrefを持つeventに記載。ns:InstructionReason等で背景も記載可能。'],
    ['④ 特定task・特定condition', '<condition>に値+uncertainty\n<event>にns:InstructionedParameter等', '<event>に付与', '必要（resultsRef経由）',
      '2層構造。<condition>に許容値・不確かさを記載し、<event>に指示の文脈（理由・担当者）を記載。'],
    ['⑤ 全体共通・特定transition', '<log>直下 property\n+ns:TargetInstructions', '<log>に付与', '不要（ただしidを列挙推奨）',
      'ns:TargetInstructionsに対象instructionのidを列挙する。複数valueの扱いは要確認（規格上の制約）。'],
    ['⑥ 全体共通・特定condition', 'conditionTemplate+<log>直下 property\n+ns:TargetTemplate（UUID型）', '<log>に付与', '不要',
      'conditionTemplateのUUIDをns:TargetTemplateで指定。idやkey名の文字列一致に依存しない設計。data層で各taskがデフォルト値を上書き。'],
  ];
  caseDetail.forEach((r, i) => {
    const row = s8.addRow(r);
    const isAlt = i % 2 === 0;
    row.getCell(1).font = { bold: true, color: { argb: 'FF1F4E79' } };
    [1,2,3,4,5].forEach(ci => {
      row.getCell(ci).fill = isAlt ? ALT_FILL : { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
      row.getCell(ci).alignment = { wrapText: true, vertical: 'middle' };
      applyBorder(row.getCell(ci));
    });
    row.getCell(3).fill = OK_FILL;
    row.height = 60;
  });

  // =========================================================
  // シート9: propertyキー一覧
  // =========================================================
  const s9 = wb.addWorksheet('9_propertyキー一覧');
  s9.columns = [
    { key: 'a', width: 40 },
    { key: 'b', width: 18 },
    { key: 'c', width: 50 },
  ];
  const s9Title = s9.addRow(['独自propertyキー一覧（付録）']);
  s9Title.getCell(1).font = { bold: true, size: 14, color: { argb: 'FF1F4E79' } };
  s9Title.height = 30;
  s9.addRow([]);
  setHeader(s9.addRow(['キー', '型', '使用場面']));

  const props = [
    ['ns:PassFail', 'booleanType', 'OK/NG評価（true=OK, false=NG）'],
    ['ns:JudgementResult', 'stringType', '判定結果文字列（"OK" / "NG"）'],
    ['ns:OverallPassFail', 'booleanType', '工程全体のOK/NG（trace単位）'],
    ['ns:OverallJudgement', 'stringType', '工程全体の判定文字列（trace単位）'],
    ['ns:OverallComment', 'stringType', '工程全体のコメント（trace単位）'],
    ['ns:BatchOverallJudgement', 'stringType', '複数バッチ全体の判定（log単位）'],
    ['ns:BatchSummary', 'stringType', '複数バッチのサマリー（log単位）'],
    ['ns:ErrorDescription', 'stringType', '異常終了の説明'],
    ['ns:RiskLevel', 'stringType', 'リスクレベル（"High"/"Medium"/"Low"）'],
    ['ns:OutOfSpecReason', 'stringType', '規格外の理由'],
    ['ns:OperatorPassFail', 'booleanType', '実験者自身の評価（多重評価用）'],
    ['ns:SupervisorPassFail', 'booleanType', '管理者の評価（多重評価用）'],
    ['ns:SupervisorComment', 'stringType', '管理者のコメント'],
    ['ns:OperatorEvaluationTimestamp', 'dateType', '実験者の評価時刻'],
    ['ns:SupervisorEvaluationTimestamp', 'dateType', '管理者の評価時刻'],
    ['ns:SupervisorDirectiveTimestamp', 'dateType', '管理者からの指示時刻'],
    ['ns:SupervisorDirectiveScope', 'stringType', '指示の適用範囲（"AllTasks"等）'],
    ['ns:SupervisorDirectiveContent', 'stringType', '指示の内容'],
    ['ns:InstructionReason', 'stringType', '指示の理由'],
    ['ns:InstructionedParameter', 'stringType', '指示対象のパラメータキー名'],
    ['ns:TargetInstructions', 'stringType', '対象instructionのid一覧（複数列挙）'],
    ['ns:TargetTemplate', 'uuidType', '対象conditionTemplateのUUID'],
    ['ns:AllowedErrorUpperLimit', 'doubleType', '誤差許容上限値'],
    ['ns:StabilizationTime', 'doubleType', '安定化時間'],
  ];
  const typeColors = {
    'booleanType': 'FFE2EFDA',
    'stringType': 'FFDCE6F1',
    'dateType': 'FFFFE699',
    'doubleType': 'FFFCE4D6',
    'uuidType': 'FFE8D5F5',
  };
  props.forEach((r, i) => {
    const row = s9.addRow(r);
    const isAlt = i % 2 === 0;
    row.getCell(1).font = { bold: true, color: { argb: 'FF1F4E79' } };
    row.getCell(1).fill = isAlt ? ALT_FILL : { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
    row.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: typeColors[r[1]] || 'FFFFFFFF' } };
    row.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(3).fill = isAlt ? ALT_FILL : { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
    row.getCell(3).alignment = { wrapText: true, vertical: 'middle' };
    [1,2,3].forEach(ci => applyBorder(row.getCell(ci)));
    row.height = 28;
  });

  // 型カラー凡例
  s9.addRow([]);
  const legTitle = s9.addRow(['【型の色凡例】', '', '']);
  legTitle.getCell(1).font = { bold: true };
  Object.entries(typeColors).forEach(([type, color]) => {
    const row = s9.addRow([type, '', '']);
    row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
    row.getCell(1).alignment = { horizontal: 'center' };
    applyBorder(row.getCell(1));
    row.height = 22;
  });

  // =========================================================
  // 保存
  // =========================================================
  await wb.xlsx.writeFile(OUTPUT_PATH);
  console.log('✓ Excel file created: ' + OUTPUT_PATH);
}

generate().catch(e => { console.error(e); process.exit(1); });
