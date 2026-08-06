/**
 * プロジェクト管理画面 ボタン権限・ステータス活性マトリクス Excel生成スクリプト
 * 
 * 出力先: scripts/result/プロジェクト管理画面_ボタン権限一覧.xlsx
 * 
 * 情報源:
 *   - frontend/src/components/project/ProjectManagement.tsx（ボタンのdisabled条件）
 *   - docs/design/spec/organization_group_project_access.md（閲覧・編集権限仕様）
 *   - backend/sql/README_organization_group_test_data.md（テストシナリオ）
 */

const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

// ============================================================
// 定数定義
// ============================================================

const STATUS_LIST = [
  { code: 0, name: 'PLANNING\n（プロジェクト計画中）',      color: 'FFD9D9D9' },
  { code: 1, name: 'TASK_PENDING\n（タスク登録済・未着手）', color: 'FFD6E4FF' },
  { code: 2, name: 'TASK_IN_PROGRESS\n（タスク実行中）',    color: 'FFD1F0FF' },
  { code: 3, name: 'REVIEW_WAITING\n（レビュー待ち）',      color: 'FFE9D6FF' },
  { code: 4, name: 'COMPLETED\n（完了）',                   color: 'FFD6FFD9' },
  { code: 5, name: 'ERROR\n（エラー）',                     color: 'FFFFCCCC' },
];

/** ○ / △ / ✕ の色 */
const COL_O = 'FF52C41A';   // 緑
const COL_D = 'FFFAAD14';   // 黄（条件付き）
const COL_X = 'FFFF4D4F';   // 赤
const WHITE  = 'FFFFFFFF';

/**
 * ボタン定義（コードから平易な日本語に翻訳）
 * 
 * activeRule: ステータスコード → 活性状態（'○'|'△'|'✕'）
 *   ○: 押せる
 *   △: 条件付き（ツールチップで補足）
 *   ✕: 押せない
 * 
 * editableRequire: 編集権限が必要か（true=必要, false=不要）
 * note: 補足事項
 */
const BUTTONS = [
  // ── ヘッダー操作ボタン（常にプロジェクト未選択でも表示） ──
  {
    no: 1,
    category: 'ヘッダー',
    name: '新規プロジェクト作成',
    icon: '＋',
    editableRequire: false,
    alwaysEnabled: true,   // プロジェクト選択不要
    note: '直接所属グループがある場合のみグループ選択可能',
    activeRule: { 0:'○', 1:'○', 2:'○', 3:'○', 4:'○', 5:'○' },
  },
  {
    no: 2,
    category: 'ヘッダー',
    name: 'リロード',
    icon: '↻',
    editableRequire: false,
    alwaysEnabled: true,
    note: 'リロード処理中は一時的に非活性',
    activeRule: { 0:'○', 1:'○', 2:'○', 3:'○', 4:'○', 5:'○' },
  },
  {
    no: 3,
    category: 'ヘッダー',
    name: 'トランジション検索',
    icon: '🔍',
    editableRequire: false,
    alwaysEnabled: true,
    note: 'MAIMLのトランジションをセマンティック検索するダイアログを開く',
    activeRule: { 0:'○', 1:'○', 2:'○', 3:'○', 4:'○', 5:'○' },
  },
  // ── ファイル操作ツールバー（プロジェクト選択後に有効） ──
  {
    no: 4,
    category: 'ファイル操作',
    name: 'ダウンロード\n（プロジェクトファイル一括）',
    icon: '↓',
    editableRequire: false,
    note: 'プロジェクトにファイルが存在しない場合は非活性。権限は不要。',
    activeRule: { 0:'△', 1:'△', 2:'△', 3:'△', 4:'△', 5:'△' },
    activeRuleNote: '△=ファイルが存在する場合のみ押せる',
  },
  {
    no: 5,
    category: 'ファイル操作',
    name: 'アップロード',
    icon: '↑',
    editableRequire: true,
    note: 'status=COMPLETED(4) または 編集権限なし → 非活性',
    activeRule: { 0:'○', 1:'○', 2:'○', 3:'○', 4:'✕', 5:'○' },
  },
  {
    no: 6,
    category: 'ファイル操作',
    name: 'MAIMLエディタ で編集',
    icon: '✎',
    editableRequire: true,
    note: 'status=COMPLETED(4)・チェックアウト中・編集権限なし → 非活性',
    activeRule: { 0:'○', 1:'△', 2:'✕', 3:'○', 4:'✕', 5:'○' },
    activeRuleNote: '△=チェックアウト中は非活性（status=1はCO状態）, status=2はCO状態のため✕',
  },
  {
    no: 7,
    category: 'ファイル操作',
    name: 'プロジェクト削除',
    icon: '🗑',
    editableRequire: true,
    note: 'status=COMPLETED(4) または 編集権限なし → 非活性',
    activeRule: { 0:'○', 1:'○', 2:'○', 3:'○', 4:'✕', 5:'○' },
  },
  {
    no: 8,
    category: 'ファイル操作',
    name: 'チェックアウト / チェックイン\n（ボタンラベルが切り替わる）',
    icon: '📋',
    editableRequire: true,
    note: 'status=COMPLETED(4) または 編集権限なし → 非活性。status=1はCHECKED_OUTのため「チェックイン」表示。',
    activeRule: { 0:'○', 1:'○', 2:'○', 3:'○', 4:'✕', 5:'○' },
  },
  {
    no: 9,
    category: 'ファイル操作',
    name: '問題確認\n（Issueモーダルを開く）',
    icon: '⚠',
    editableRequire: false,
    note: '権限・ステータスに関係なく常に有効（プロジェクト選択時）',
    activeRule: { 0:'○', 1:'○', 2:'○', 3:'○', 4:'○', 5:'○' },
  },
  {
    no: 10,
    category: '公開管理',
    name: '公開\n（MAIMLを公開する）',
    icon: '📤',
    editableRequire: true,
    note: 'status が REVIEW_WAITING(3) か COMPLETED(4) の場合のみ有効。編集権限なし → 非活性。',
    activeRule: { 0:'✕', 1:'✕', 2:'✕', 3:'○', 4:'○', 5:'✕' },
  },
  {
    no: 11,
    category: '公開管理',
    name: '非公開\n（公開済みの場合に表示）',
    icon: '📥',
    editableRequire: true,
    note: '公開済み状態のときのみ表示される。編集権限なし → 非活性。ポーリング中は非活性。',
    activeRule: { 0:'✕', 1:'✕', 2:'✕', 3:'△', 4:'△', 5:'✕' },
    activeRuleNote: '△=公開済み状態の場合のみ「非公開」ボタンが表示・有効',
  },
  {
    no: 12,
    category: '完了処理',
    name: '完了処理\n（全タスク完了時のみ有効）',
    icon: '✅',
    editableRequire: true,
    note: '全タスクが完了（COMPLETED/REVIEW_WAITING完了）かつ編集権限あり の場合のみ有効。',
    activeRule: { 0:'✕', 1:'✕', 2:'✕', 3:'△', 4:'✕', 5:'✕' },
    activeRuleNote: '△=全タスク完了時のみ有効（実験指示タブの状態に依存）。編集権限なし → 非活性',
  },
  {
    no: 13,
    category: 'プロジェクト管理',
    name: 'プロジェクト名変更',
    icon: '✎',
    editableRequire: true,
    note: '編集権限なし → 非活性',
    activeRule: { 0:'○', 1:'○', 2:'○', 3:'○', 4:'○', 5:'○' },
  },
  {
    no: 14,
    category: 'プロジェクト管理',
    name: 'バリデーション確認\n（MAIMLバリデーション結果モーダル）',
    icon: '🛡',
    editableRequire: false,
    note: '権限・ステータスに関係なく常に有効（プロジェクト選択時）',
    activeRule: { 0:'○', 1:'○', 2:'○', 3:'○', 4:'○', 5:'○' },
  },
  {
    no: 15,
    category: 'セキュリティ',
    name: '暗号化管理',
    icon: '🔒',
    editableRequire: true,
    note: '編集権限なし → 非活性',
    activeRule: { 0:'○', 1:'○', 2:'○', 3:'○', 4:'○', 5:'○' },
  },
  {
    no: 16,
    category: 'セキュリティ',
    name: '電子署名管理',
    icon: '🔏',
    editableRequire: true,
    note: '編集権限なし → 非活性',
    activeRule: { 0:'○', 1:'○', 2:'○', 3:'○', 4:'○', 5:'○' },
  },

  // ══════════════════════════════════════════════
  // ファイル管理タブ（①ファイル管理タブ内のボタン）
  // ══════════════════════════════════════════════
  {
    no: 17,
    category: 'ファイル管理タブ',
    name: 'ファイルダウンロード\n（行ごと）',
    icon: '↓',
    editableRequire: false,
    note: '他ファイルのダウンロード中は非活性。権限・ステータス問わず押せる。',
    activeRule: { 0:'○', 1:'○', 2:'○', 3:'○', 4:'○', 5:'○' },
  },
  {
    no: 18,
    category: 'ファイル管理タブ',
    name: 'ファイル削除\n（行ごと）',
    icon: '🗑',
    editableRequire: true,
    note: '編集権限なし または プロジェクト完了（status=4）→ 非活性',
    activeRule: { 0:'○', 1:'○', 2:'○', 3:'○', 4:'✕', 5:'○' },
  },
  {
    no: 19,
    category: 'ファイル管理タブ',
    name: 'ビューアーで表示\n（行ごと）',
    icon: '👁',
    editableRequire: false,
    note: '権限・ステータス問わず常に有効',
    activeRule: { 0:'○', 1:'○', 2:'○', 3:'○', 4:'○', 5:'○' },
  },

  // ══════════════════════════════════════════════
  // タスク登録タブ（②タスク登録タブ内のボタン）
  // ══════════════════════════════════════════════
  {
    no: 20,
    category: 'タスク登録タブ',
    name: '指示追加\n（タスク行ごと）',
    icon: '＋',
    editableRequire: true,
    note: 'チェックアウト中・MAIMLエラーあり・プロジェクト完了・ワーカー連携済み行・編集権限なし → 非活性',
    activeRule: { 0:'○', 1:'✕', 2:'✕', 3:'○', 4:'✕', 5:'○' },
    activeRuleNote: 'status=1,2はCHECKED_OUT状態のため非活性。編集権限なし → 非活性',
  },
  {
    no: 21,
    category: 'タスク登録タブ',
    name: 'プロジェクト指示\n（タスク一覧上部）',
    icon: '📋',
    editableRequire: true,
    note: 'チェックアウト中・MAIMLエラーあり・プロジェクト完了・編集権限なし → 非活性',
    activeRule: { 0:'○', 1:'✕', 2:'✕', 3:'○', 4:'✕', 5:'○' },
  },
  {
    no: 22,
    category: 'タスク登録タブ',
    name: 'タスク保存\n（タスク一覧下部）',
    icon: '💾',
    editableRequire: false,
    note: 'チェックアウト中・MAIMLエラーあり・プロジェクト完了（status=4）→ 非活性\n※ isEditable制御なし',
    activeRule: { 0:'○', 1:'✕', 2:'✕', 3:'○', 4:'✕', 5:'○' },
  },

  // ══════════════════════════════════════════════
  // 指示登録タブ（③指示登録タブ内のボタン）
  // ══════════════════════════════════════════════
  {
    no: 23,
    category: '指示登録タブ',
    name: '指示送信\n（一括送信ボタン）',
    icon: '📤',
    editableRequire: true,
    note: 'チェックアウト中・指示が0件・送信処理中・編集権限なし・プロジェクト完了 → 非活性',
    activeRule: { 0:'○', 1:'✕', 2:'✕', 3:'○', 4:'✕', 5:'○' },
  },
  {
    no: 24,
    category: '指示登録タブ',
    name: '指示編集\n（行ごと・未送信のみ表示）',
    icon: '✎',
    editableRequire: true,
    note: '編集権限なし・プロジェクト完了 → 非活性。未送信指示の行に表示。送信済みは「詳細」ボタンに切り替わる。',
    activeRule: { 0:'○', 1:'○', 2:'○', 3:'○', 4:'✕', 5:'○' },
  },
  {
    no: 25,
    category: '指示登録タブ',
    name: '指示削除\n（行ごと・未送信のみ表示）',
    icon: '🗑',
    editableRequire: true,
    note: '編集権限なし・プロジェクト完了 → 非活性。未送信指示の行に表示される。',
    activeRule: { 0:'○', 1:'○', 2:'○', 3:'○', 4:'✕', 5:'○' },
  },
  {
    no: 26,
    category: '指示登録タブ',
    name: '指示詳細\n（行ごと・送信済みのみ表示）',
    icon: '🔍',
    editableRequire: false,
    note: '常に有効。送信済みの指示行に表示される（編集・削除の代わり）。',
    activeRule: { 0:'○', 1:'○', 2:'○', 3:'○', 4:'○', 5:'○' },
  },

  // ══════════════════════════════════════════════
  // タスク結果タブ（④タスク結果タブ内のボタン）
  // ══════════════════════════════════════════════
  {
    no: 27,
    category: 'タスク結果タブ',
    name: '実験指示を編集\n（行ごと）',
    icon: '✎',
    editableRequire: true,
    note: '編集権限なし または プロジェクト完了（status=4）→ 非活性',
    activeRule: { 0:'○', 1:'○', 2:'○', 3:'○', 4:'✕', 5:'○' },
  },
  {
    no: 28,
    category: 'タスク結果タブ',
    name: 'ペトリネット表示',
    icon: '🕸',
    editableRequire: false,
    note: 'プロジェクト名が取得できている場合のみ有効（常時有効に近い）。閲覧系のため権限不問。',
    activeRule: { 0:'○', 1:'○', 2:'○', 3:'○', 4:'○', 5:'○' },
  },
  {
    no: 29,
    category: 'タスク結果タブ',
    name: '一括承認\n（REVIEW_WAITING行をまとめて承認）',
    icon: '✅',
    editableRequire: true,
    note: '編集権限なし → 非活性。レビュー待ちタスクが0件の場合も非活性。',
    activeRule: { 0:'✕', 1:'✕', 2:'✕', 3:'△', 4:'✕', 5:'✕' },
    activeRuleNote: '△=REVIEW_WAITING状態のタスクが存在する場合のみ有効。編集権限なし → 非活性',
  },

  // ══════════════════════════════════════════════
  // 評価登録タブ（⑤評価登録タブ内のボタン）
  // ══════════════════════════════════════════════
  {
    no: 30,
    category: '評価登録タブ',
    name: '評価入力\n（評価登録ボタン）',
    icon: '📝',
    editableRequire: true,
    note: '編集権限なし または プロジェクト完了（status=4）→ 非活性',
    activeRule: { 0:'○', 1:'○', 2:'○', 3:'○', 4:'✕', 5:'○' },
  },
];

// ============================================================
// ユーティリティ
// ============================================================

function setHeaderStyle(cell, opts = {}) {
  cell.font = { bold: true, color: { argb: opts.fontColor || 'FFFFFFFF' }, size: opts.size || 10 };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: opts.bgColor || 'FF1890FF' } };
  cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  cell.border = {
    top: { style: 'thin' }, bottom: { style: 'thin' },
    left: { style: 'thin' }, right: { style: 'thin' },
  };
}

function setBodyStyle(cell, opts = {}) {
  cell.font = { size: opts.size || 10, color: { argb: opts.fontColor || 'FF000000' } };
  if (opts.bgColor) {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: opts.bgColor } };
  }
  cell.alignment = { vertical: 'middle', horizontal: opts.align || 'left', wrapText: true };
  cell.border = {
    top: { style: 'thin' }, bottom: { style: 'thin' },
    left: { style: 'thin' }, right: { style: 'thin' },
  };
}

function activeColor(val) {
  if (val === '○') return COL_O;
  if (val === '△') return COL_D;
  if (val === '✕') return COL_X;
  return WHITE;
}

// ============================================================
// Sheet 1: ボタン一覧
// ============================================================

function buildSheet1(wb) {
  const ws = wb.addWorksheet('①ボタン一覧');
  ws.views = [{ showGridLines: false }];

  // タイトル
  ws.mergeCells('A1:H1');
  const title = ws.getCell('A1');
  title.value = 'プロジェクト管理画面 ボタン一覧';
  title.font = { bold: true, size: 14 };
  title.alignment = { vertical: 'middle', horizontal: 'center' };
  title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF096DD9' } };
  title.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
  ws.getRow(1).height = 30;

  // ヘッダー行
  const headers = ['No', 'カテゴリ', 'ボタン名', 'アイコン', '編集権限\n必要', 'disabled 条件（コード翻訳）', '補足・注意事項', '関連コード'];
  const colWidths = [5, 14, 26, 8, 10, 52, 40, 50];
  headers.forEach((h, i) => {
    const cell = ws.getCell(2, i + 1);
    cell.value = h;
    setHeaderStyle(cell, { bgColor: 'FF1890FF' });
    ws.getColumn(i + 1).width = colWidths[i];
  });
  ws.getRow(2).height = 36;

  // カテゴリ別背景色
  const catColors = {
    'ヘッダー':         'FFF0F9FF',
    'ファイル操作':     'FFF6FFED',
    '公開管理':         'FFFFF7E6',
    '完了処理':         'FFFE8C00',
    'プロジェクト管理': 'FFFFF0F6',
    'セキュリティ':     'FFF9F0FF',
  };

  BUTTONS.forEach((btn, idx) => {
    const row = ws.getRow(idx + 3);
    row.height = 40;
    const bgColor = catColors[btn.category] || WHITE;

    // disabled条件を平易な文に変換
    let disabledCond = '';
    if (btn.alwaysEnabled) {
      disabledCond = '常に有効（プロジェクト選択不要）';
    } else if (btn.no === 4) {
      disabledCond = '① プロジェクトを選択していない\n② プロジェクトにファイルが1件もない\n（上記いずれかで非活性）';
    } else if (btn.no === 5) {
      disabledCond = '① プロジェクトを選択していない\n② 編集権限がない（isEditable=false）\n③ ステータスが「完了（4）」\n（上記いずれかで非活性）';
    } else if (btn.no === 6) {
      disabledCond = '① プロジェクトを選択していない\n② 編集権限がない（isEditable=false）\n③ ステータスが「完了（4）」\n④ プロジェクトがチェックアウト中\n（上記いずれかで非活性）';
    } else if (btn.no === 7) {
      disabledCond = '① プロジェクトを選択していない\n② 編集権限がない（isEditable=false）\n③ ステータスが「完了（4）」\n（上記いずれかで非活性）';
    } else if (btn.no === 8) {
      disabledCond = '① 編集権限がない（isEditable=false）\n② ステータスが「完了（4）」\n（上記いずれかで非活性）\n※ ラベルはCO中→「チェックイン」、CI中→「チェックアウト」';
    } else if (btn.no === 9) {
      disabledCond = '常に有効（プロジェクト選択後）\n（権限・ステータス問わず押せる）';
    } else if (btn.no === 10) {
      disabledCond = '① プロジェクトを選択していない\n② 編集権限がない（isEditable=false）\n③ ステータスが「レビュー待ち（3）」「完了（4）」以外\n④ 公開処理中（ポーリング中）\n（上記いずれかで非活性）';
    } else if (btn.no === 11) {
      disabledCond = '① 公開済みでない（「公開」ボタンが代わりに表示される）\n② 編集権限がない（isEditable=false）\n③ プロジェクトを選択していない\n④ 非公開処理中（ポーリング中）\n（上記いずれかで非活性または非表示）';
    } else if (btn.no === 12) {
      disabledCond = '全タスクが完了状態になるまで非活性\n（権限・ステータスに依存しない独立したロジック）';
    } else if (btn.editableRequire) {
      disabledCond = '① プロジェクトを選択していない\n② 編集権限がない（isEditable=false）\n（上記いずれかで非活性）';
    } else {
      disabledCond = 'プロジェクトを選択していない場合に非活性';
    }

    const values = [
      btn.no,
      btn.category,
      btn.name,
      btn.icon,
      btn.editableRequire ? '必要' : '不要',
      disabledCond,
      btn.note,
      btn.no === 4  ? 'disabled={!selectedProject || isDownloading || !hasProjectFiles}' :
      btn.no === 5  ? 'disabled={!selectedProject || selectedProject.status === 4 || selectedProject.isEditable === false}' :
      btn.no === 6  ? 'disabled={!selectedProject || isProjectCheckedOut || selectedProject.status === 4 || selectedProject.isEditable === false}' :
      btn.no === 7  ? 'disabled={!selectedProject || selectedProject.status === 4 || selectedProject.isEditable === false}' :
      btn.no === 8  ? 'disabled={status === COMPLETED || isEditable === false}' :
      btn.no === 9  ? '（disabled なし）' :
      btn.no === 10 ? 'disabled={!selectedProject || !(status===3||status===4) || isPolling || isEditable===false}' :
      btn.no === 11 ? 'disabled={!selectedProject || isPolling || isEditable===false}' :
      btn.no === 12 ? 'disabled={!allTasksCompleted}' :
      btn.editableRequire ? 'disabled={!selectedProject || selectedProject.isEditable === false}' :
      'disabled={!selectedProject}',
    ];

    values.forEach((v, ci) => {
      const cell = row.getCell(ci + 1);
      cell.value = v;
      const opts = { bgColor };
      if (ci === 0) opts.align = 'center';
      if (ci === 4) {
        opts.align = 'center';
        if (btn.editableRequire) {
          opts.bgColor = 'FFFFD6D6';
          opts.fontColor = 'FFCF1322';
        } else {
          opts.bgColor = 'FFD6FFD9';
          opts.fontColor = 'FF389E0D';
        }
      }
      setBodyStyle(cell, opts);
    });
  });

  // 凡例
  const legendRow = BUTTONS.length + 4;
  ws.getRow(legendRow).height = 18;
  ws.mergeCells(legendRow, 1, legendRow, 8);
  const legendCell = ws.getCell(legendRow, 1);
  legendCell.value = '【凡例】 編集権限の「必要」=isEditable フラグが false のとき非活性になるボタン。 フラグは organization_group への所属とプロジェクトのグループ一致で決まる（詳細は④シート参照）';
  legendCell.font = { italic: true, size: 9, color: { argb: 'FF595959' } };
  legendCell.alignment = { horizontal: 'left', vertical: 'middle' };
}

// ============================================================
// Sheet 2: ステータス遷移図
// ============================================================

function buildSheet2(wb) {
  const ws = wb.addWorksheet('②ステータス遷移図');
  ws.views = [{ showGridLines: false }];

  ws.getColumn(1).width = 4;
  ws.getColumn(2).width = 28;
  ws.getColumn(3).width = 12;
  ws.getColumn(4).width = 28;
  ws.getColumn(5).width = 12;
  ws.getColumn(6).width = 40;
  ws.getColumn(7).width = 38;

  // タイトル
  ws.mergeCells('A1:G1');
  const t = ws.getCell('A1');
  t.value = 'プロジェクト管理画面 ステータス遷移図';
  t.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
  t.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF096DD9' } };
  t.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 30;

  // ヘッダー
  const hdrs = ['', 'ステータス', 'コード', '意味・状態', 'checkout状態', '遷移トリガー（→次ステータス）', 'ボタン操作上の特徴'];
  hdrs.forEach((h, i) => {
    const cell = ws.getCell(2, i + 1);
    cell.value = h;
    setHeaderStyle(cell, { bgColor: 'FF1890FF' });
  });
  ws.getRow(2).height = 30;

  const transitions = [
    {
      name: 'PLANNING\n（プロジェクト計画中）',
      code: '0',
      meaning: 'MAIMLファイルをアップロードし、ペトリネット構造を設計する段階',
      checkout: 'CHECKED_IN',
      trigger: '① チェックアウトボタン押下\n  → PLANNING + CHECKED_OUT\n② MAIML登録＋タスク登録完了でチェックアウト\n  → TASK_PENDING（自動）',
      btnNote: 'アップロード・編集・削除・チェックアウト・名前変更すべて有効\n公開ボタンは非活性（ステータス不一致）',
    },
    {
      name: 'TASK_PENDING\n（タスク登録済・未着手）',
      code: '1',
      meaning: 'タスクが登録されチェックアウト済み。ワーカーへの指示送信待ち。',
      checkout: 'CHECKED_OUT',
      trigger: '指示登録・送信後にワーカーが作業開始\n  → TASK_IN_PROGRESS（自動）\nチェックインすると PLANNING に戻る',
      btnNote: '「チェックイン」ボタンが表示される\nMAIMLエディタ（編集）はチェックアウト中のため非活性',
    },
    {
      name: 'TASK_IN_PROGRESS\n（タスク実行中）',
      code: '2',
      meaning: 'ワーカーがタスクを実行している段階。タスクの進捗が更新される。',
      checkout: 'CHECKED_OUT',
      trigger: '全タスクがREVIEW_WAITING（レビュー待ち）になる\n  → REVIEW_WAITING（自動）',
      btnNote: '「チェックイン」ボタンが表示される\nMAIMLエディタは非活性（チェックアウト中）\n完了処理ボタンは全タスク完了まで非活性',
    },
    {
      name: 'REVIEW_WAITING\n（レビュー待ち）',
      code: '3',
      meaning: '全タスクがレビュー待ち状態。管理者がタスク結果をレビューする段階。',
      checkout: 'CHECKED_IN',
      trigger: 'レビュー完了（completeReviewTasks）\n  → COMPLETED（自動）\n公開操作が可能になる',
      btnNote: '「公開」ボタンが活性化\n「完了処理」ボタンは全タスク完了で活性化',
    },
    {
      name: 'COMPLETED\n（完了）',
      code: '4',
      meaning: '全タスクのレビューが完了した終端ステータス。',
      checkout: 'CHECKED_IN',
      trigger: '（終端ステータス・以降の遷移なし）\n公開・非公開操作のみ可能',
      btnNote: 'アップロード・削除・チェックイン/チェックアウトが非活性\n「公開」ボタンは活性化\n名前変更・暗号化・署名は有効',
    },
    {
      name: 'ERROR\n（エラー）',
      code: '5',
      meaning: '公開/非公開処理でエラーが発生した状態。',
      checkout: 'CHECKED_IN',
      trigger: '公開ジョブがエラーで完了した場合に遷移\n再試行により COMPLETED 等へ戻る可能性あり',
      btnNote: 'COMPLETEDと同様の制御（ステータス=5はCOMPLETED条件に含まれない）\n実際の制御はCOMPLETED(4)チェックのみのため\nERROR時はアップロード等は有効になる場合あり',
    },
  ];

  const rowColors = ['FFE6F7FF','FFD6E4FF','FFD1F0FF','FFE9D6FF','FFD6FFD9','FFFFCCCC'];

  transitions.forEach((t, i) => {
    const r = ws.getRow(i + 3);
    r.height = 70;
    const arrow = i < transitions.length - 1 ? '↓' : '（終端）';
    const arrowColor = i < transitions.length - 1 ? 'FF1890FF' : 'FF999999';

    // 矢印セル（A列）
    const arrowCell = r.getCell(1);
    arrowCell.value = i < transitions.length - 1 ? '↓' : '●';
    arrowCell.font = { size: 18, bold: true, color: { argb: arrowColor } };
    arrowCell.alignment = { horizontal: 'center', vertical: 'middle' };

    const vals = [t.name, t.code, t.meaning, t.checkout, t.trigger, t.btnNote];
    vals.forEach((v, ci) => {
      const cell = r.getCell(ci + 2);
      cell.value = v;
      setBodyStyle(cell, { bgColor: rowColors[i], align: ci === 1 ? 'center' : 'left' });
      if (ci === 0) cell.font = { bold: true, size: 10 };
    });
  });

  // フロー説明
  const lastRow = transitions.length + 4;
  ws.mergeCells(lastRow, 1, lastRow, 7);
  const note = ws.getCell(lastRow, 1);
  note.value = '【補足】 チェックアウト操作はステータスの遷移トリガーではなく、排他制御（同時編集防止）の仕組み。CHECKED_OUT 状態では他ユーザーがチェックアウト不可。';
  note.font = { italic: true, size: 9, color: { argb: 'FF595959' } };
  note.alignment = { horizontal: 'left', vertical: 'middle' };
  ws.getRow(lastRow).height = 20;
}

// ============================================================
// Sheet 3: ボタン × ステータス 活性マトリクス（編集権限あり前提）
// ============================================================

function buildSheet3(wb) {
  const ws = wb.addWorksheet('③ボタン×ステータス マトリクス');
  ws.views = [{ showGridLines: false }];

  // タイトル
  ws.mergeCells(1, 1, 1, 3 + STATUS_LIST.length);
  const t = ws.getCell('A1');
  t.value = 'ボタン × ステータス 活性マトリクス（編集権限「あり」の場合）';
  t.font = { bold: true, size: 13, color: { argb: 'FFFFFFFF' } };
  t.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF096DD9' } };
  t.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 28;

  // 列幅
  ws.getColumn(1).width = 5;
  ws.getColumn(2).width = 14;
  ws.getColumn(3).width = 26;
  STATUS_LIST.forEach((_, i) => { ws.getColumn(i + 4).width = 16; });

  // ヘッダー行
  ws.getCell(2, 1).value = 'No';
  setHeaderStyle(ws.getCell(2, 1));
  ws.getCell(2, 2).value = 'カテゴリ';
  setHeaderStyle(ws.getCell(2, 2));
  ws.getCell(2, 3).value = 'ボタン名';
  setHeaderStyle(ws.getCell(2, 3));
  STATUS_LIST.forEach((s, i) => {
    const cell = ws.getCell(2, i + 4);
    cell.value = s.name;
    setHeaderStyle(cell, { bgColor: s.color.replace('FF', ''), fontColor: 'FF000000' });
  });
  ws.getRow(2).height = 48;

  // データ行
  BUTTONS.forEach((btn, idx) => {
    const row = ws.getRow(idx + 3);
    row.height = 38;

    ws.getCell(idx + 3, 1).value = btn.no;
    setBodyStyle(ws.getCell(idx + 3, 1), { align: 'center' });
    ws.getCell(idx + 3, 2).value = btn.category;
    setBodyStyle(ws.getCell(idx + 3, 2));
    ws.getCell(idx + 3, 3).value = btn.name;
    setBodyStyle(ws.getCell(idx + 3, 3));

    STATUS_LIST.forEach((s, si) => {
      const cell = ws.getCell(idx + 3, si + 4);
      const val = btn.activeRule[s.code];
      cell.value = val;
      const fgColor = val === '○' ? 'FFD9F7BE' : val === '△' ? 'FFFFF7CC' : 'FFFFD6D6';
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fgColor } };
      cell.font = { bold: true, size: 12, color: { argb: activeColor(val) } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = { top:{style:'thin'}, bottom:{style:'thin'}, left:{style:'thin'}, right:{style:'thin'} };
    });
  });

  // 凡例
  const lr = BUTTONS.length + 4;
  ws.getRow(lr).height = 18;
  ws.mergeCells(lr, 1, lr, 3 + STATUS_LIST.length);
  const lc = ws.getCell(lr, 1);
  lc.value = '【凡例】 ○=押せる（有効）  △=条件付きで押せる（ボタン一覧シートの補足参照）  ✕=押せない（非活性）　※本シートは「編集権限あり」の場合の挙動。閲覧のみの場合は④シート参照。';
  lc.font = { italic: true, size: 9, color: { argb: 'FF595959' } };
  lc.alignment = { horizontal: 'left', vertical: 'middle' };

  // checkout状態の補足
  const lr2 = lr + 1;
  ws.getRow(lr2).height = 18;
  ws.mergeCells(lr2, 1, lr2, 3 + STATUS_LIST.length);
  const lc2 = ws.getCell(lr2, 1);
  lc2.value = '【チェックアウト補足】 TASK_PENDING(1)・TASK_IN_PROGRESS(2) はCHECKED_OUT状態のため、MAIMLエディタ編集ボタンが非活性。チェックインボタンは有効。';
  lc2.font = { italic: true, size: 9, color: { argb: 'FF595959' } };
  lc2.alignment = { horizontal: 'left', vertical: 'middle' };
}

// ============================================================
// Sheet 4: ボタン × 権限（閲覧のみ vs 編集権限あり）マトリクス
// ============================================================

function buildSheet4(wb) {
  const ws = wb.addWorksheet('④権限別ボタン活性マトリクス');
  ws.views = [{ showGridLines: false }];

  // タイトル
  ws.mergeCells(1, 1, 1, 5);
  const t = ws.getCell('A1');
  t.value = '権限別 ボタン活性マトリクス（閲覧のみ vs 編集権限あり）';
  t.font = { bold: true, size: 13, color: { argb: 'FFFFFFFF' } };
  t.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF096DD9' } };
  t.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 28;

  // 列幅
  ws.getColumn(1).width = 5;
  ws.getColumn(2).width = 14;
  ws.getColumn(3).width = 26;
  ws.getColumn(4).width = 18;
  ws.getColumn(5).width = 18;

  // ヘッダー行
  const hdrs = ['No', 'カテゴリ', 'ボタン名', '閲覧のみ\n（isEditable=false）', '編集権限あり\n（isEditable=true）'];
  hdrs.forEach((h, i) => {
    const cell = ws.getCell(2, i + 1);
    cell.value = h;
    setHeaderStyle(cell, {
      bgColor: i === 3 ? 'FF096DD9' : i === 4 ? 'FF52C41A' : 'FF1890FF',
    });
  });
  ws.getRow(2).height = 38;

  BUTTONS.forEach((btn, idx) => {
    const row = ws.getRow(idx + 3);
    row.height = 38;

    ws.getCell(idx + 3, 1).value = btn.no;
    setBodyStyle(ws.getCell(idx + 3, 1), { align: 'center' });
    ws.getCell(idx + 3, 2).value = btn.category;
    setBodyStyle(ws.getCell(idx + 3, 2));
    ws.getCell(idx + 3, 3).value = btn.name;
    setBodyStyle(ws.getCell(idx + 3, 3));

    // 閲覧のみ（isEditable=false）
    const viewOnly = btn.editableRequire ? '✕' : '○';
    const vc = ws.getCell(idx + 3, 4);
    vc.value = viewOnly + (btn.editableRequire ? '\n（編集権限が必要）' : '\n（権限不問）');
    const vBg = viewOnly === '○' ? 'FFD9F7BE' : 'FFFFD6D6';
    vc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: vBg } };
    vc.font = { bold: true, size: 11, color: { argb: viewOnly === '○' ? COL_O : COL_X } };
    vc.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    vc.border = { top:{style:'thin'}, bottom:{style:'thin'}, left:{style:'thin'}, right:{style:'thin'} };

    // 編集権限あり
    const editVal = '○';
    const ec = ws.getCell(idx + 3, 5);
    ec.value = editVal + '\n（ステータス条件は③シート参照）';
    ec.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9F7BE' } };
    ec.font = { bold: true, size: 11, color: { argb: COL_O } };
    ec.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    ec.border = { top:{style:'thin'}, bottom:{style:'thin'}, left:{style:'thin'}, right:{style:'thin'} };
  });

  // テストシナリオ例
  const exRow = BUTTONS.length + 4;
  ws.getRow(exRow - 1).height = 14;
  ws.mergeCells(exRow, 1, exRow, 5);
  const ex = ws.getCell(exRow, 1);
  ex.value = '【テストシナリオ対応表（README_organization_group_test_data.md より）】';
  ex.font = { bold: true, size: 10 };
  ex.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F7FF' } };
  ex.alignment = { horizontal: 'left', vertical: 'middle' };
  ws.getRow(exRow).height = 20;

  const scenarios = [
    ['ユーザー', '所属グループ', '対象プロジェクト', 'アクセス権', 'ボタン可否'],
    ['hq_user', 'HQ（親）', 'P_HQ', '閲覧・編集', '全ボタン有効（ステータス条件除く）'],
    ['hq_user', 'HQ（親）', 'P_HQ_DEV', '閲覧のみ', '✕ 編集系ボタンすべて非活性'],
    ['hq_user', 'HQ（有効祖先chief）', 'P_HQ_DEV_A（非アクティブグループ）', '閲覧・編集', '全ボタン有効（有効祖先chiefのため編集可）'],
    ['dev_user', 'HQ-DEV（直接所属）', 'P_HQ_DEV', '閲覧・編集', '全ボタン有効'],
    ['dev_user', 'HQ-DEV（直接所属）', 'P_HQ', '閲覧のみ', '✕ 編集系ボタンすべて非活性'],
    ['dev_a_user', 'HQ-DEV-A（非アクティブ）', 'P_HQ_DEV_A', 'アクセス不可', 'プロジェクト一覧に表示されない'],
    ['sales_user', 'HQ-SALES', 'P_HQ_SALES', '閲覧・編集', '全ボタン有効'],
    ['multi_user', 'HQ + HQ-DEV（複数）', 'P_HQ_DEV_A', '閲覧のみ', '✕ 編集系ボタンすべて非活性（有効祖先のchiefではないため）'],
    ['no_group_user', 'なし（未所属）', '全プロジェクト', 'アクセス不可', 'プロジェクト一覧に0件表示'],
    ['system.admin', '—（SystemAdmin）', '全プロジェクト', '閲覧・編集（全件）', '全ボタン有効（isEditable=true）'],
  ];

  scenarios.forEach((row, ri) => {
    const r = ws.getRow(exRow + 1 + ri);
    r.height = ri === 0 ? 28 : 22;
    row.forEach((v, ci) => {
      const cell = r.getCell(ci + 1);
      cell.value = v;
      if (ri === 0) {
        setHeaderStyle(cell, { bgColor: 'FF1890FF' });
      } else {
        const bgColor = ri % 2 === 0 ? 'FFF5F5F5' : WHITE;
        setBodyStyle(cell, { bgColor });
      }
    });
  });
}

// ============================================================
// メイン処理
// ============================================================

async function main() {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'mmdpf';
  wb.created = new Date();

  buildSheet1(wb);
  buildSheet2(wb);
  buildSheet3(wb);
  buildSheet4(wb);

  const outDir = path.resolve(__dirname, 'result');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const outPath = path.join(outDir, 'プロジェクト管理画面_ボタン権限一覧.xlsx');
  await wb.xlsx.writeFile(outPath);
  console.log('✅ Excel生成完了:', outPath);
}

main().catch((err) => {
  console.error('❌ エラー:', err);
  process.exit(1);
});
