# タスク計画書: ExperimentPlanDialog MAIML解析実装

## メタデータ
- **作成日時**: 2026-06-29 09:00
- **タスクID**: experiment-plan-dialog-maiml
- **優先度**: 高
- **推定工数**: 5-7時間

## タスク概要

ExperimentPlanDialogをプロジェクト管理画面から開いた際に、MAIMLファイルから実際のトランジション一覧・テンプレート定義・Ref選択肢を取得して表示するよう実装する。

現状は `getPlanDialogData` APIが暫定モックデータを返しており、実際のMAIMLファイルをパースしていない。
また、初回登録時はMAIMLから初期データを生成し、2回目以降は `experiment_plan` テーブルのDBデータを取得・表示する2段階のデータ取得ロジックも整備する。

---

## 問題の現状

### 現状の動作
1. `GET /api/v1/projects/:projectId/methods/:methodId/plan-dialog-data` を呼ぶと、コントローラーのハードコードされた `MOCK_DIALOG_DATA` を返す
2. モックのメソッドIDが実際のプロジェクトのメソッドIDと一致しないため、`DEFAULT_DIALOG_DATA`（トランジション空、テンプレート空）が返される
3. 結果として、ダイアログでトランジション選択・テンプレートフィールド入力ができない

### 期待する動作
- **初回**: MAIMLファイルをパースして、そのメソッドのトランジション一覧・テンプレート定義・Ref選択肢を返す
- **2回目以降**: `experiment_plan` テーブルにデータが存在する場合はDBから取得（この部分は既存実装済み）

---

## 目的と期待される成果

### 目的
ExperimentPlanDialogで実際のMAIMLデータに基づいた実験計画の入力を可能にする。

### 期待される成果
- [ ] MAIMLファイルから指定メソッドのトランジション一覧が取得できる
- [ ] MAIMLファイルから指定メソッドのテンプレート定義（フィールド情報含む）が取得できる
- [ ] MAIMLのDocument情報からCreator/Instrument/Owner Ref選択肢が取得できる
- [ ] モックデータを本番実装に差し替え、暫定コードを削除できる

---

## 実装ステップ

### Phase 1: MAIMLファイル取得の共通化確認

既存の `resolveMaimlFilePath` と `getStorageService` を使い、`projectId` から MAIML コンテンツを取得する処理を `experimentInstructionService.ts` に追加する。

- [ ] `backend/src/utils/maimlPathResolver.ts` の `resolveMaimlFilePath(organizationId, projectId, projectName)` の引数を確認
- [ ] `project_name` を取得するために `projectRepository.findById` が必要か確認
- [ ] MAIMLコンテンツ取得のヘルパー関数 `fetchMaimlContent` をサービス内に実装

```typescript
// experimentInstructionService.ts に追加するイメージ
async function fetchMaimlContent(
  organizationId: string,
  projectId: string
): Promise<string> {
  const project = await projectRepository.findById(organizationId, projectId);
  if (!project) throw new Error(`Project not found: ${projectId}`);
  const filePath = await resolveMaimlFilePath(organizationId, projectId, project.project_name);
  const storageService = getStorageService();
  const buffer = await storageService.downloadFile(organizationId, filePath);
  return buffer.toString('utf-8');
}
```

### Phase 2: MAIMLパース＆データ抽出ロジックの実装

`MaimlParserTyped` を使い、メソッドのトランジション・テンプレート・Refを抽出する。

- [ ] `getPlanDialogDataFromMaiml(organizationId, projectId, methodId)` 関数を `experimentInstructionService.ts` に実装
- [ ] トランジション抽出: `method.pnml.transitions` から `{id, name}` の配列を生成
- [ ] テンプレート抽出: `method.program` 配下の `materialTemplates`, `conditionTemplates`, `resultTemplates` から `TemplateDef` 形式に変換（フィールド情報含む）
- [ ] Ref抽出: `document.creators`, `document.instruments`, `document.owners` から `id` の配列を生成

#### テンプレートフィールドの型変換ルール

`Property.xsiType` → `TemplateField.type` の変換ルール:

| xsiType | type |
|---------|------|
| `stringType`, `tokenType`, `stringListType` 等 | `'text'` |
| `intType`, `floatType`, `doubleType`, `decimalType` 等 | `'number'` |
| `stringEnumType` | `'select'` (valueを配列化) |

### Phase 3: API型定義の整備

- [ ] `backend/src/types/api.ts` に `PlanDialogData` 型を定義（現在モックが返している形式と統一）
- [ ] `TemplateDef`, `TemplateField` 型が `api.ts` に定義されているか確認・追加

### Phase 4: コントローラーの差し替え

- [ ] `experimentInstructionController.ts` の `getPlanDialogData` 関数を修正
- [ ] `MOCK_DIALOG_DATA` と `DEFAULT_DIALOG_DATA` 定数を削除
- [ ] サービスの `getPlanDialogDataFromMaiml` を呼び出すよう差し替え
- [ ] コントローラーファイル冒頭のコメント（`Phase 4 のチェックアウト処理拡張完了後...`）を削除

---

## 影響範囲

### 変更するファイル
1. `backend/src/services/experimentInstructionService.ts` - MAIMLパース処理を追加
2. `backend/src/controllers/experimentInstructionController.ts` - モックを削除しサービスを呼び出し
3. `backend/src/types/api.ts` - `PlanDialogData`/`TemplateDef`/`TemplateField` 型を追加（未定義の場合）

### 新規作成するファイル
- なし（既存ファイルの拡張で対応）

### 影響を受ける機能
- **ExperimentPlanDialog**: トランジション選択・テンプレート入力が正常に機能するようになる
- **experiment_plan テーブルへの保存/読み込み**: フロントエンド側の既存実装はそのまま機能する

---

## 技術的詳細

### データ構造の対応関係

#### トランジション（`method.pnml.transitions`）

```typescript
// MAIMLの型 (maiml-unified.ts)
interface Transition {
  id: string;       // 必須
  name?: string;    // 人間可読な名前
}

// APIレスポンス型（PlanDialogData.transitions）
interface TransitionItem {
  id: string;
  name: string;  // name ?? id でフォールバック
}
```

#### テンプレート（`method.program[].materialTemplates` 等 または `method.materialTemplates`）

```typescript
// MAIMLの型 (maiml-unified.ts)
interface Template {
  id: string;
  name?: string;
  category: string;
  properties: Property[];  // ← フィールド情報はここ
}

// Property
interface Property {
  key: string;       // フィールドのキー
  xsiType: string;   // 型情報 ('doubleType', 'stringType', 'stringEnumType'等)
  description?: string;
  units?: string;
  value?: string | number | boolean;  // stringEnumType のとき選択肢として使用
}

// APIレスポンス型（PlanDialogData.templates）
interface TemplateDef {
  id: string;
  label: string;
  category: 'material' | 'condition' | 'result';
  fields: TemplateField[];
}

interface TemplateField {
  key: string;
  label: string;     // description ?? key
  type: 'text' | 'number' | 'select';
  units?: string;
  required?: boolean;
  options?: string[];  // selectの場合のみ
}
```

#### Ref選択肢（`document.creators` 等）

```typescript
// MAIMLの型 (maiml-unified.ts)
interface DocumentTagData {
  id: string;
  name?: string;
}

// APIレスポンス型（PlanDialogData.creatorRefs）
type RefIds = string[];  // id の配列
```

### テンプレートの取得場所

MAIMLの構造によりテンプレートは複数の階層に存在する:

```
protocol
  └── method
        ├── materialTemplates[]   ← メソッドレベル
        ├── conditionTemplates[]
        ├── resultTemplates[]
        └── program[]
              ├── materialTemplates[]  ← プログラムレベル
              ├── conditionTemplates[]
              └── resultTemplates[]
```

両方を走査して重複なくマージする（idが一致するものは1つに）。

---

## リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| MAIMLファイルが存在しないプロジェクト | 中 | 低 | E6002エラーを返す |
| 指定メソッドIDがMAIMLに存在しない | 中 | 低 | E6001エラーを返す、または空データ返却 |
| テンプレートにpropertiesが空のケース | 低 | 中 | fields=[]で正常返却 |
| `program` 配列が空でメソッドレベルにのみテンプレートがある場合 | 中 | 中 | 両階層を確実にチェックする |

---

## テスト計画

### 手動テスト
- [ ] MAIMLファイルが登録されているプロジェクトでダイアログを開き、トランジション一覧が表示される
- [ ] テンプレートを選択すると対応するフィールド入力欄が表示される
- [ ] Creator/Instrument/Owner の選択肢にMAIML記載の値が表示される
- [ ] 一度保存後にダイアログを再度開くと保存済みの値が表示される（既存実装）
- [ ] MAIMLが未登録のプロジェクトでダイアログを開いてもエラーにならない

---

## 関連ドキュメント

- [`backend/src/controllers/experimentInstructionController.ts`](../../../../backend/src/controllers/experimentInstructionController.ts) - 暫定実装（差し替え対象）
- [`backend/src/types/maiml-unified.ts`](../../../../backend/src/types/maiml-unified.ts) - MAIMLの型定義
- [`backend/src/utils/maimlParserTyped.ts`](../../../../backend/src/utils/maimlParserTyped.ts) - MAIMLパーサー
- [`backend/src/utils/maimlPathResolver.ts`](../../../../backend/src/utils/maimlPathResolver.ts) - MAIMLファイルパス解決

---

## 承認記録

- **計画書提示日時**: 2026-06-29 09:00
- **承認日時**: 2026-06-29 09:02
- **承認者コメント**: 承認します。実装を進めてください

---

## 実施記録

### 実施日時
開始: 2026-06-29 09:03  
完了: 2026-06-29 09:05

### 計画からの変更点
なし（計画通りに実施）

### 最終的な成果物
- [x] `backend/src/types/api.ts` に `TemplateField`, `TemplateDef`, `PlanDialogData` 型を追加
- [x] `backend/src/services/experimentInstructionService.ts` にMAIMLパース処理を追加
  - `getPlanDialogDataFromMaiml()` 関数を実装
  - ヘルパー関数 `detectFieldType()`, `convertTemplate()`, `mergeTemplates()` を実装
- [x] `backend/src/controllers/experimentInstructionController.ts` のモック削除・本実装に差し替え
  - `MOCK_DIALOG_DATA`, `DEFAULT_DIALOG_DATA` 定数を削除
  - `getPlanDialogData()` をサービス呼び出しに変更
  - E6001/E6002 エラーハンドリングを追加

### TypeScriptコンパイル
- バックエンド: Exit code 0（エラーなし）
- フロントエンド: Exit code 0（エラーなし）

### 追加対応（調査で判明した問題）
フロントエンドの `ExperimentPlanDialog.tsx` にて、APIレスポンスに `prerequisiteTransitionIds` がない場合にモックデータへフォールバックする処理が実装されており、常にモックが使われていた。

**対応内容（追加4ファイル）:**
- [x] `backend/src/types/api.ts` の `PlanDialogData.transitions` に `prerequisiteTransitionIds: string[]` を追加
- [x] `backend/src/services/experimentInstructionService.ts` の `getPlanDialogDataFromMaiml()` にて Petri Net の Arc（Place経由）から `prerequisiteTransitionIds` を計算するロジックを追加
- [x] `frontend/src/components/project/ExperimentPlanDialog.tsx` の open時useEffect にある `hasPrereqs` チェック＆モックフォールバックを削除
- [x] `frontend/src/components/project/ExperimentPlanDialog.tsx` の methodId変更時useEffect にある `hasPrereqs` チェック＆モックフォールバックを削除（エラー時も `setDialogData(MOCK_PLAN_DIALOG_DATA)` を削除し `message.error` に変更）

---

## 追加対応: デフォルト値設定（2026-06-29 09:45〜）

### 要件
1. **テンプレートフィールドのデフォルト値**: MAIMLの `Property.value` が設定されている場合、それをフィールドのデフォルト値として設定する
2. **基本情報の初期値**: Conditionテンプレートに以下のキーでプロパティが設定されている場合、そこから初期値を取得する
   - CreatorRef: `mgr-instruction:requiredCreatorUUID`
   - InstrumentRef: `mgr-instruction:requiredInstrumentUUID`
   - OwnerRef: `mgr-instruction:requiredOwnerUUID`

### 変更ファイル
1. `backend/src/types/api.ts` - `TemplateField` に `defaultValue` 追加、`PlanDialogData` に `defaultBasicInfo` 追加
2. `backend/src/services/experimentInstructionService.ts` - `convertTemplate()` でデフォルト値設定、Conditionテンプレートからの抽出ロジック追加
3. `frontend/src/components/project/ExperimentPlanDialog.tsx` - `defaultBasicInfo` を使った初期値設定

### 実施記録
- [ ] `backend/src/types/api.ts` に `TemplateField.defaultValue` と `PlanDialogData.defaultBasicInfo` を追加
- [ ] `backend/src/services/experimentInstructionService.ts` のデフォルト値・初期値抽出ロジック追加
- [ ] `frontend/src/components/project/ExperimentPlanDialog.tsx` の初期値設定ロジック追加
- [ ] コンパイルチェック（バック・フロント）
