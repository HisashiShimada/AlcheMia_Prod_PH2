# タスク計画書: 実験計画ダイアログモック作成

## メタデータ
- **作成日時**: 2026-06-08 15:00
- **タスクID**: experiment-plan-dialog-mock
- **優先度**: 中
- **推定工数**: 3時間

## 1. タスク概要

新規機能開発のためのUIモック作成。以下2つの変更を実施する：

1. **TaskRegistrationTabの実験条件プルダウン削除**: テーブルから実験条件列をUIのみ削除（DB・API変更は本実装時に実施）
2. **ExperimentPlanDialogの新規作成**: 作業単位（メソッド）ごとの詳細な実験計画指示を入力できるダイアログ

---

## 2. 目的と期待される成果

### 目的
- 既存の `InstructionEditDialog` では対応できない、各実験の詳細な指示を入力できるUIを提供する
- 実験計画の構造化されたデータ（CreatorRef、InstrumentRef、OwnerRef、注意事項、テンプレート値）を入力できる

### 期待される成果
- [ ] TaskRegistrationTabから実験条件列が削除されている
- [ ] 指示追加ボタンから `ExperimentPlanDialog` が開く
- [ ] トランジション一覧の表示・選択が機能する
- [ ] CreatorRef/InstrumentRef/OwnerRefの複数選択が機能する
- [ ] 注意事項の動的追加・削除が機能する
- [ ] 保存処理がモックAPIで動作する

---

## 3. 実装ステップ

### Phase 1: 準備
- [ ] タスク計画書の作成（本ファイル）

### Phase 2: TaskRegistrationTabの修正
- [ ] `frontend/src/components/project/TaskRegistrationTab.tsx` から実験条件列を削除
- [ ] 関連するstate・useMemo・importをコメントアウト（後で完全削除）

### Phase 3: 型定義の作成
- [ ] `frontend/src/types/experimentPlan.ts` を新規作成
  - `NoteType` enum
  - `NOTE_TYPE_LABELS` 定数
  - `NoteItem` interface
  - `PropertyValue` interface
  - `ExperimentPlanData` interface

### Phase 4: APIサービスの仮実装
- [ ] `frontend/src/services/experimentPlanApiService.ts` を新規作成
  - `saveExperimentPlan()` - モック実装
  - `getCreatorRefs()` - モック実装
  - `getInstrumentRefs()` - モック実装
  - `getOwnerRefs()` - モック実装

### Phase 5: ExperimentPlanDialogの作成
- [ ] `frontend/src/components/project/ExperimentPlanDialog.tsx` を新規作成
  - タブ切り替え（全体 + タスク番号別）
  - 左側パネル: トランジション一覧（チェックボックス選択）
  - 右側パネル:
    - CreatorRef（複数選択）
    - InstrumentRef（複数選択）
    - OwnerRef（複数選択）
    - 注意事項（動的追加・削除、5種類のタイプ選択）
    - テンプレート入力エリア（プレースホルダー表示）
  - 保存・キャンセルボタン

### Phase 6: TaskRegistrationTabへの統合
- [ ] `ExperimentPlanDialog` のimport追加
- [ ] 指示追加ボタンのクリックハンドラーを修正（または専用ボタンを追加）
- [ ] ダイアログの表示制御stateを追加

---

## 4. 影響範囲

### 変更するファイル
1. `frontend/src/components/project/TaskRegistrationTab.tsx` - 実験条件列削除 + ダイアログ統合

### 新規作成するファイル
1. `docs/20260608_1500_実験計画ダイアログモック作成/PLAN.md` - 本ファイル
2. `frontend/src/types/experimentPlan.ts` - 型定義
3. `frontend/src/services/experimentPlanApiService.ts` - APIサービス仮実装
4. `frontend/src/components/project/ExperimentPlanDialog.tsx` - 新規ダイアログ

### 削除するファイル
- なし

### 影響を受ける機能
- **TaskRegistrationTab**: 実験条件列が非表示になる（データは既存APIに0を送信）
- **作業単位の指示追加ボタン**: 新ダイアログを開くように変更

---

## 5. 技術的詳細

### ExperimentPlanDialogのUI設計

```
┌─────────────────────────────────────────────────────┐
│  実験計画詳細指示ダイアログ                    [✕] │
├─────────────────────────────────────────────────────┤
│  ┌──────┬──────┬──────┬──────┐                     │
│  │全体  │タスク1│タスク2│タスク3│ ←タブ            │
│  └──────┴──────┴──────┴──────┘                     │
├────────────────────┬────────────────────────────────┤
│ トランジション一覧  │  入力フォームエリア            │
│                    │                                │
│ □ Transition1      │  【CreatorRef】               │
│ □ Transition2      │  [プルダウン（複数選択）]     │
│ ☑ Transition3      │                                │
│ □ Transition4      │  【InstrumentRef】            │
│                    │  [プルダウン（複数選択）]     │
│ （スクロール可能）  │                                │
│                    │  【OwnerRef】                 │
│                    │  [プルダウン（複数選択）]     │
│                    │                                │
│                    │  【注意事項】                 │
│                    │  ┌───────────────────────┐    │
│                    │  │注意事項1               │    │
│                    │  │タイプ: [安全上の注意事項]│   │
│                    │  │内容: [入力欄]          │    │
│                    │  │      [削除]            │    │
│                    │  └───────────────────────┘    │
│                    │  [+ 注意事項を追加]           │
│                    │                                │
│                    │  【テンプレート入力】          │
│                    │  （選択したトランジション      │
│                    │   に紐づくテンプレート表示）   │
└────────────────────┴────────────────────────────────┤
│              [キャンセル] [保存]                     │
└─────────────────────────────────────────────────────┘
```

### 注意事項のタイプ定義

| Key | ラベル |
|-----|--------|
| `mgr-instruction:caution` | 安全上の注意事項 |
| `mgr-instruction:operationNote` | 操作手順上の注記 |
| `mgr-instruction:checkItem` | 実施前後の確認事項 |
| `mgr-instruction:prohibitedAction` | 禁止事項 |
| `mgr-instruction:OtherNotes` | その他注意事項 |

### CreatorRef/InstrumentRef/OwnerRefのデータ取得
- `useProjectMaiml()` から `maimlRoot` を取得
- MAIMLファイルの対象メソッド内のタグ情報からプルダウン選択肢を生成
- モック段階では仮のデータを使用

### APIエンドポイント（仮）
```
POST /api/v1/projects/:projectId/experiment-plans
```

---

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 実験条件削除によるAPIエラー | 中 | 低 | APIリクエスト時にデフォルト値(0)を使用 |
| MAIMLからのRef取得が未実装 | 低 | 高 | モック段階ではAPIサービスに仮データを返す |
| テンプレート入力の複雑さ | 低 | 高 | モック段階ではプレースホルダーのみ表示 |

---

## 7. テスト計画

### 手動テスト
- [ ] TaskRegistrationTabで実験条件列が表示されないことを確認
- [ ] 作業単位の指示追加ボタンクリックでExperimentPlanDialogが開くことを確認
- [ ] タブ切り替えが機能することを確認
- [ ] トランジション一覧のチェックボックス選択が機能することを確認
- [ ] CreatorRef/InstrumentRef/OwnerRefの複数選択が機能することを確認
- [ ] 注意事項の追加・削除・タイプ変更が機能することを確認
- [ ] 保存ボタンクリックでモックAPIが呼ばれることを確認（コンソールログ確認）

---

## 8. 承認記録
- **計画書提示日時**: 2026-06-08 15:00
- **承認日時**: 2026-06-08 15:02
- **承認者コメント**: Actモードで実装開始を承認

---

## 9. 実施記録

### 実施日時
- 開始: 2026-06-08 15:02
- 完了: （作業完了時に記入）

### 計画からの変更点
（実施中に記入）

### 最終的な成果物
- [ ] TaskRegistrationTab修正完了
- [ ] 型定義ファイル作成完了
- [ ] APIサービス仮実装完了
- [ ] ExperimentPlanDialogコンポーネント作成完了
- [ ] 統合・テスト確認完了
