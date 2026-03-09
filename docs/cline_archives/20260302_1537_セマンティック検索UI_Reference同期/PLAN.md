# タスク計画書: セマンティック検索UI Reference同期

## メタデータ
- **作成日時**: 2026-03-02 15:37
- **タスクID**: semantic-search-ui-sync
- **優先度**: 高
- **推定工数**: 1時間

## タスク概要

現在実装されているセマンティック検索UI（`TransitionSetSearchModal.tsx`）がReferenceのトランジション検索（`reference/components/TransitionSetSearch/TransitionSetSearchModal.js`）と異なっている箇所を修正し、Referenceに合わせる。

## 現状と差分の分析

### 差分1: クイック検索ボタンの不足
- **Reference**: 「⚡ クイック検索（ワンクリックで重み調整済み検索）」セクションがあり、`ButtonGroup`で「構造重視」「手順重視」「入力重視」「出力重視」「バランス」の5つのプリセットボタンを表示
- **現状**: クイック検索ボタンが全くない

### 差分2: フィルター機能の追加
- **Reference**: 検索クエリは1つの `TextField`（自由記述）で、フィルター機能はなし
- **現状**: プロジェクト名フィルター・手法コードフィルター・上位件数という独自フィルターが追加されている

  ※ただし現状のフィルターは機能的に有用なため、Referenceに合わせる＝フィルターを完全削除ではなく、Referenceが持つ「1つの統合クエリ入力」を追加しつつ、既存の4軸クエリ入力も残す形が適切か要確認。

  **解釈**: Referenceは入力が1つのテキストフィールドで統合クエリ入力となっており、4軸クエリ入力はない。現状は4軸クエリ入力がある。ユーザー要求は「クイック検索の追加」「フィルター機能の追加（Referenceに合わせて）」「プリセットをボタンにする」なので：
  - クイック検索ボタン（プリセットボタン群）を追加する
  - プリセット選択をドロップダウンからボタンに変更する（WeightSliders内）
  - フィルターについては「Referenceに合わせる」→Referenceにはフィルターがあることは確認できない。ただしユーザーは「フィルター機能の追加」と言っているため、Referenceにはないが追加すべき機能として扱う可能性もある。
  
  **再解釈**: ユーザーは「クイック検索の不足、フィルター機能の追加、プリセットがボタンではなくドロップダウンになっている」と言っており、これが現状の問題点。Referenceに合わせる＝Referenceにあるクイック検索を追加、Referenceにないフィルターを削除（または変更）、プリセットをボタン形式に変更。

### 差分3: WeightSliders内のプリセット表示
- **Reference**: `WeightSliders.js` 内でプリセットをボタン（`Button`群）で表示。各プリセット名をグリッドに並べたボタン
- **現状**: `WeightSliders.tsx` 内でプリセットを `Select`（ドロップダウン）で選択

## 目的と期待される成果

- [ ] `TransitionSetSearchModal.tsx` にクイック検索ボタン群（プリセットワンクリック検索）を追加
- [ ] `WeightSliders.tsx` のプリセット選択をドロップダウンからボタン群に変更
- [ ] 検索クエリを統合クエリ（1テキストエリア）に変更（Referenceのスタイル）し、既存の4軸クエリ入力をCollapse等に移動または削除

## 実装ステップ

- [ ] Phase 1: `useSemanticSearch.ts` に `WEIGHT_PRESETS` をオブジェクト形式（key→preset）に対応させる（または並列対応させる）
- [ ] Phase 2: `WeightSliders.tsx` のプリセット選択をボタン群に変更
- [ ] Phase 3: `TransitionSetSearchModal.tsx` に以下を追加
  - 統合クエリ入力（1つのTextArea）を追加
  - クイック検索ボタン群（プリセット直接検索）を追加
  - 既存の4軸クエリ入力はCollapse内に収納（詳細入力として残す）

## 変更ファイル

1. `frontend/src/hooks/useSemanticSearch.ts` - WEIGHT_PRESETS をオブジェクト形式追加
2. `frontend/src/components/TransitionSetSearch/WeightSliders.tsx` - プリセット選択をボタン群に変更
3. `frontend/src/components/TransitionSetSearch/TransitionSetSearchModal.tsx` - クイック検索追加・レイアウト修正

## リスク

| リスク | 対策 |
|--------|------|
| 既存の4軸クエリ入力との整合性 | 統合クエリ入力と4軸クエリ入力を並存させ、どちらかが入力されれば検索可能にする |
| 検索APIの互換性 | Referenceの統合クエリは `query` パラメータだが現状は `input_query/transition_query` 等の4軸。バックエンドとの整合性を確認 |

## テスト計画

- [ ] クイック検索ボタンをクリックして検索が実行されることを確認
- [ ] WeightSliders内のプリセットボタンをクリックして重みが変更されることを確認
- [ ] 既存の4軸検索が引き続き動作することを確認

## 承認記録

- **計画書提示日時**: 2026-03-02 15:38
- **承認日時**: 2026-03-02 15:40
- **承認者コメント**: フィルターはReferenceに合わせて削除する

## 実施記録

### 実施日時
開始: 2026-03-02 15:40
完了: 2026-03-02 15:45

### 変更ファイル
1. `frontend/src/hooks/useSemanticSearch.ts` - WEIGHT_PRESETS を配列からオブジェクト形式に変更（key→{name, description, weights}）
2. `frontend/src/components/TransitionSetSearch/WeightSliders.tsx` - プリセット選択をSelectドロップダウンからボタン群（Row/Col）に変更、リセットボタン・ヒント追加
3. `frontend/src/components/TransitionSetSearch/TransitionSetSearchModal.tsx` - 統合クエリ入力追加、クイック検索ボタン群追加、フィルター削除、AI分解結果表示追加、未検索時ヒント表示追加

### 最終的な成果物
- [x] クイック検索ボタン群（構造重視・手順重視・入力重視・出力重視・バランス）を追加
- [x] WeightSliders のプリセット選択をドロップダウンからボタン群に変更
- [x] 統合クエリ入力（1テキストエリア）をメイン入力として追加
- [x] フィルター（プロジェクト名・手法コード・上位件数）を削除
- [x] 既存の4軸クエリ入力を「詳細設定」Collapse内に収納
- [x] TypeScriptエラーなし（今回変更ファイルに限り）
