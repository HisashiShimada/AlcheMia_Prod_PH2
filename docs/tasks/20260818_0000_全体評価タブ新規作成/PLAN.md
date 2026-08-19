# タスク計画書: 全体評価タブ新規作成

## メタデータ

- **作成日時**: 2026-08-18 00:00
- **タスクID**: 20260818_0000_全体評価タブ新規作成
- **優先度**: 高
- **推定工数**: 3時間

---

## タスク概要

`ProjectManagement.tsx` の既存タブ列の末尾に「全体評価」タブを新設する。
画面レイアウトは `test_data/画像.png` の通り。

**追加するタブ構成（画像に基づく）:**

| タブ | 現状 |
|------|------|
| ファイル管理 | 既存 |
| タスク登録 | 既存 |
| プロジェクト指示 | 既存 |
| 実験指示 | 既存 |
| 評価登録確認 | 既存 |
| **全体評価** | **新規作成** |

**「全体評価」タブの画面構成（画像に基づく）:**

1. **ヘッダー部**
   - タイトル: `{プロジェクト名}プロジェクト全体評価`
   - 右上バッジ: 現在の全体評価ステータス（`全体評価 未決定` / `良好` / `要確認` / `不良`）
   - サブテキスト: `{バッチ名} · 登録済み評価 {N}件 / うち要対応 {M}件`

2. **階層別サマリーカード**（`EvaluationSummaryBar` 再利用）
   - タイトル: 「階層別サマリー（下位評価の集計）」
   - メソッド別・タスク別・トランジション別の度数分布バー

3. **要注意項目カード**（`AttentionItemList` 再利用）
   - タイトル: 「要注意項目（判断材料）」
   - サブタイトル: 「良好以外の評価を、コメント付きで抽出」
   - 評価単位 / 対象 / 評価値 / コメントのテーブル形式

4. **プロジェクト全体評価の決定カード**（フォーム）
   - タイトル: 「プロジェクト全体評価の決定」
   - サブタイトル: 「上記の階層別サマリーと要注意項目を踏まえて、MaiML全体の評価を決定する」
   - デジタル評価ボタングループ: 良好 / 要確認 / 不良（選択式）
   - 数値スコアスライダー: 0〜100（任意）
   - アナログ評価テキストエリア: 自由文章（任意）
   - 「全体評価を登録」ボタン

---

## 目的と期待される成果

- [ ] 「全体評価」タブが正しい位置（評価登録確認の右隣）に表示される
- [ ] 画像と同等のレイアウト・機能が実装されている
- [ ] `EvaluationRegistrationTab` 内の全体評価関連UI（階層別サマリー・要注意項目セクション）がコメントアウトされる
- [ ] 既存機能（他タブ）に影響なし

---

## 実装ステップ

### Step 1: `OverallEvaluationTab.tsx` 新規作成
- [ ] `/home/mi_ito/mmdpf/frontend/src/components/project/OverallEvaluationTab.tsx` を作成
  - Props: `projectId`, `projectName`, `isEditable`, `isProjectCompleted`, `isCheckoutLocked`
  - `useOverallEvaluation` フックで階層別サマリー・要注意項目を取得
  - `getByProject` で最新の全体評価（`overall_digital`）を取得してヘッダーバッジに表示
  - `getSubEvaluationsByProject` で下位評価件数・要対応件数をサブテキストに表示
  - `EvaluationSummaryBar` で階層別サマリー表示
  - `AttentionItemList` で要注意項目をテーブル形式で表示
  - デジタル評価 / スコア / アナログ評価フォーム
  - `createOverallEvaluation` で全体評価を登録

### Step 2: `EvaluationRegistrationTab.tsx` の全体評価UI をコメントアウト
- [ ] 階層別サマリーカード (`<Card>` with `EvaluationSummaryBar`) をコメントアウト
- [ ] 要注意項目カード (`<Card>` with `AttentionItemList`) をコメントアウト
- [ ] `useOverallEvaluation` フック呼び出しをコメントアウト
- [ ] 関連インポート（`EvaluationSummaryBar`, `AttentionItemList`, `useOverallEvaluation`）をコメントアウト
- [ ] `refetchSummary` 使用箇所をコメントアウト

### Step 3: `ProjectManagement.tsx` に「全体評価」タブ追加
- [ ] `OverallEvaluationTab` をインポート
- [ ] `evaluation_registration` タブの直後に `overall_evaluation` タブを追加
  ```tsx
  {
    key: 'overall_evaluation',
    label: t('projectManagement.tabOverallEvaluation'),
    children: (
      <OverallEvaluationTab
        projectId={selectedProject.id}
        projectName={selectedProject.name}
        isEditable={selectedProject?.isEditable !== false}
        isProjectCompleted={selectedProject?.status === 4 || selectedProject?.status === 5}
        isCheckoutLocked={isProjectCheckedOut}
      />
    ),
  }
  ```

### Step 4: i18n キー追加
- [ ] `frontend/src/locales/ja.json` に `"tabOverallEvaluation": "全体評価"` を追加
- [ ] `frontend/src/locales/en.json` に `"tabOverallEvaluation": "Overall Evaluation"` を追加

---

## 影響範囲の分析

### 変更ファイル

| ファイル | 変更種別 | 変更内容 |
|----------|----------|----------|
| `frontend/src/components/project/OverallEvaluationTab.tsx` | **新規作成** | 全体評価タブコンポーネント |
| `frontend/src/components/project/EvaluationRegistrationTab.tsx` | 変更 | 全体評価UI部分をコメントアウト |
| `frontend/src/components/project/ProjectManagement.tsx` | 変更 | タブ追加・インポート追加 |
| `frontend/src/locales/ja.json` | 変更 | `tabOverallEvaluation` キー追加 |
| `frontend/src/locales/en.json` | 変更 | `tabOverallEvaluation` キー追加 |

### 再利用する既存リソース

| リソース | 用途 |
|----------|------|
| `useOverallEvaluation` フック | サマリー・要注意項目の取得 |
| `EvaluationSummaryBar` | 階層別サマリーバー描画 |
| `AttentionItemList` | 要注意項目リスト描画 |
| `getByProject` | 最新全体評価取得（ヘッダーバッジ） |
| `getSubEvaluationsByProject` | 下位評価件数取得（サブテキスト） |
| `createOverallEvaluation` | 全体評価登録 |

### 影響なし（変更なし）

- バックエンドコード（全て既存API呼び出しのみ）
- 他タブのコンポーネント
- 型定義ファイル（既存型を流用）

---

## リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `EvaluationRegistrationTab` のコメントアウトで未使用インポートが残りビルドエラー | 中 | 中 | コメントアウト後に `npx tsc --noEmit` で型チェック |
| `getByProject` が空配列を返す場合の表示崩れ | 低 | 高 | `records[0]` の null チェックを必ず実施 |
| i18n キーの追加漏れ | 低 | 低 | ja.json / en.json 両方に同時追加 |

---

## テスト計画

### 手動テスト

- [ ] 「全体評価」タブが「評価登録確認」の右隣に表示されること
- [ ] ヘッダーに「{プロジェクト名}プロジェクト全体評価」が表示されること
- [ ] 全体評価未登録時はバッジが「全体評価 未決定」と表示されること
- [ ] 階層別サマリーカードが表示されること（評価データなしの場合は「評価データがありません」）
- [ ] 要注意項目カードが表示されること
- [ ] 良好/要確認/不良ボタンで評価値を選択できること
- [ ] スコアスライダーで0〜100の数値を入力できること
- [ ] アナログ評価テキストエリアに文章を入力できること
- [ ] 「全体評価を登録」ボタンで `createOverallEvaluation` が呼ばれること
- [ ] 「評価登録確認」タブから階層別サマリー・要注意項目セクションが消えていること
- [ ] 「評価登録確認」タブの評価一覧テーブル・評価入力ボタンは引き続き動作すること
- [ ] 他タブ（ファイル管理・タスク登録・プロジェクト指示・実験指示）に影響がないこと

---

## 承認記録

- **計画書提示日時**: 2026-08-18 00:00
- **承認日時**: 2026-08-18 承認済み
- **承認者コメント**: 承認します

---

## 実施記録

### 実施日時
開始: 2026-08-18
完了: 2026-08-18

### 計画からの変更点
- `ja.json` への `overallEvaluation` キー追加時、既存 `evaluation` キーの `{` を誤って削除してしまい修正。

### 発生した問題と解決方法
- `ja.json` に `overallEvaluation` を追加した際、`evaluation` オブジェクトの開始 `{` が欠落してJSON構文エラーが発生。
  → 直後の行に `"evaluation": {` を挿入して修正。
- TypeScript 型チェックで既存の無関係なエラー（`EncryptionManagement.tsx`, `DetailModal.tsx` 等）が検出されたが、今回の変更とは無関係であることを確認。

### 最終的な成果物
- [x] `OverallEvaluationTab.tsx` 新規作成
- [x] `EvaluationRegistrationTab.tsx` 階層別サマリー・要注意項目セクションをコメントアウト完了
- [x] `ProjectManagement.tsx` 「全体評価」タブ追加完了
- [x] `ja.json` / `en.json` i18n キー追加完了

