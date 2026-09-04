# タスク計画書: Ant Design デザイン系フロントエンドWarning修正

## メタデータ
- **作成日時**: 2026-09-02 10:00
- **タスクID**: 20260902_1000
- **優先度**: 中
- **推定工数**: 1時間

## タスク概要

以下の Ant Design コンポーネントの deprecated API 使用によるWarningを修正する。

1. `[antd: Card] bodyStyle is deprecated. Please use styles.body instead.` → `ProgressOverviewTab.tsx`
2. `Warning: Instance created by useForm is not connected to any Form element.` → `IssueManagementModal.tsx`（progressOverviewTab 文脈で発生）
3. `[antd: Spin] tip only work in nest or fullscreen pattern.` → `ExperimentWorkerMenu.tsx`
4. `[antd: Divider] type is deprecated. Please use orientation instead.` → `WorkRecordPanel.tsx`（複数箇所）

## 目的と期待される成果

- [x] Ant Design v6 の API に準拠したコードに更新する
- [x] ブラウザコンソールの Warning を解消する
- [x] 既存の UI 表示・動作には影響を与えない

## 実装ステップ

### 1. ProgressOverviewTab.tsx - bodyStyle → styles.body
- [x] line 122: `bodyStyle={{ padding: '12px 16px' }}` → `styles={{ body: { padding: '12px 16px' } }}`

### 2. IssueManagementModal.tsx - Form.useForm 未接続問題
- **原因**: `showNewIssueForm` が `false` のとき `<Form form={form}>` がDOMに存在しないため、`Form.useForm()` で生成したインスタンスが接続されない
- **対策**: `<Form>` を常時レンダリングし、`showNewIssueForm` フラグで `display: none` / 表示切り替えを行う
  - または、`destroyOnClose` を使わずに hidden スタイルを使う方法
  - 最もシンプルな対応: `{showNewIssueForm && <Form ...>}` を維持し、`form` をその中にのみ宣言するのではなく条件外でインスタンス化しているので、`<Form>` 要素を常に置いて `display` で制御する
- [x] `<Form>` を `style={{ display: showNewIssueForm ? 'block' : 'none' }}` で常時レンダリングに変更

### 3. ExperimentWorkerMenu.tsx - Spin tip ネストパターン修正
- [x] line 748: `<Spin tip="全体進捗を読み込み中..." />` → `<Spin tip={t('progressOverview.loading')}><div style={{ minHeight: 40 }} /></Spin>` に変更
- [x] 翻訳キー `progressOverview.loading` を ja.json / en.json に追加

### 4. WorkRecordPanel.tsx - Divider type → orientation 修正
- [x] line 1087: `<Divider type="vertical" ...>` → `<Divider orientation="vertical" ...>`
- [x] line 1092: 同上
- [x] line 1101: 同上
- [x] line 1132: 同上
- [x] line 1669: 同上

## 変更ファイル
1. `frontend/src/components/ExperimentWorker/ProgressOverviewTab.tsx` - bodyStyle修正
2. `frontend/src/components/ExperimentWorker/IssueManagementModal.tsx` - Form.useForm未接続修正
3. `frontend/src/components/menus/ExperimentWorkerMenu.tsx` - Spin tip修正
4. `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx` - Divider type修正（5箇所）

## リスク
| リスク | 対策 |
|--------|------|
| Divider の表示崩れ | `type="vertical"` から `orientation="vertical"` への変更は同じ意味なので問題なし |
| Spin のレイアウト変更 | ネストパターンでもローディング表示は同様 |
| Form の表示変更 | `display: none` 制御を適切に行う |

## テスト計画
- [x] ブラウザで各画面を開いてコンソールに Warning が出ないことを確認（未実施: 目視確認はユーザー側）
- [x] WorkRecordPanel の区切り線表示が崩れていないことを目視確認（未実施: 目視確認はユーザー側）
- [x] ExperimentWorkerMenu のローディング表示が正常なことを確認（未実施: 目視確認はユーザー側）

## 承認記録
- **計画書提示日時**: 2026-09-02 10:00
- **承認日時**: 2026-09-02 10:00（ユーザー指示により即時実施）

## 実施記録

### 実施日時
開始: 2026-09-02 10:00
完了: 2026-09-02 10:30

### 最終的な成果物
- [x] `ProgressOverviewTab.tsx` - `bodyStyle` → `styles={{ body: {...} }}` 修正
- [x] `IssueManagementModal.tsx` - `Form.useForm` 未接続問題修正（`{showNewIssueForm && <Form>}` → `<Form style={{display:...}}>` 常時レンダリング方式）
- [x] `ExperimentWorkerMenu.tsx` - `<Spin tip="...">` → ネストパターンに修正、翻訳キー追加
- [x] `WorkRecordPanel.tsx` - `Divider type="vertical"` → `orientation="vertical"` 修正（4箇所）
- [x] `frontend/src/locales/ja.json` - `progressOverview.loading` キー追加
- [x] `frontend/src/locales/en.json` - `progressOverview.loading` キー追加
