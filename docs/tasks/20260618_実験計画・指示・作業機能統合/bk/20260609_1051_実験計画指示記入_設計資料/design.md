# 実験計画指示記入 設計資料

> 作成日: 2026-06-09  
> ステータス: **作成中（一部情報連携待ち）**  
> 目的: 実験計画指示記入機能の要件・設計を整理し、本実装のベースとする

---

## ドキュメント管理

### 情報ステータス凡例

| マーク | 意味 |
|-------|------|
| ✅ 確定 | 仕様が確定している（実装済みコード・決定済み設計から確認） |
| ⚠️ 仮置き | 既存コード・ドキュメントから推定した仮の内容。要確認 |
| ❓ 未確認 | 仕様が未決定。情報連携待ち |
| 🚫 対象外 | スコープ外 |

### 参照ドキュメント

| ドキュメント | 内容 |
|------------|------|
| `docs/20260608_1500_実験計画ダイアログモック作成/PLAN.md` | モック作成計画書 |
| `docs/20260608_1500_実験計画ダイアログモック作成/db_design_draft.md` | DB仮設計（詳細SQL・CRUD設計） |
| `docs/20260608_1500_実験計画ダイアログモック作成/IMPLEMENTATION_PLAN.md` | 本実装移行計画・決定事項一覧 |

---

## 目次

1. [機能概要](#1-機能概要)
2. [業務フロー](#2-業務フロー)
3. [画面仕様](#3-画面仕様)
4. [入力項目仕様](#4-入力項目仕様)
5. [データ設計](#5-データ設計)
6. [API設計](#6-api設計)
7. [フロントエンド実装設計](#7-フロントエンド実装設計)
8. [バックエンド実装設計](#8-バックエンド実装設計)
9. [確認事項一覧](#9-確認事項一覧)

---

## 1. 機能概要

### 1-1. 機能の本質的な目的 ✅ 確定（2026-06-09 仕様連携）

**MAIMLの各Data層（Material / Condition / Result）に、実験計画段階での「想定値（目標値）」を書き込む機能。**

- 実験を実際に行って記録する「実績値」とは別に、**実験計画段階で期待する値（想定値）を事前に記述**する
- 想定値は `mgr-instruction:` 接頭句をつけたプロパティ/タグとしてMAIMLのData層に記録する
- Workerは実験時に想定値を参照しながら実験を実施できる

#### `mgr-instruction:` 接頭句の意味

| 種別 | Key例 | 意味 |
|------|-------|------|
| 実績値（通常のデータ） | `temperature` | Workerが実験して記録した実測値 |
| 想定値（実験計画） | `mgr-instruction:temperature` | Managerが事前に設定した目標値・想定値 |

### 1-2. 実験計画の想定値を記述する2パターン ✅ 確定（2026-06-09 仕様連携）

想定値の記述方式は以下の2パターンがある。

---

#### パターン A: テンプレート編集画面で直接記述

**方法**: テンプレート編集画面でテンプレートのプロパティ等の `Key` に `mgr-instruction:` 接頭句を付与して、テンプレート自体に想定値を記述する。

```
テンプレート編集画面
  → プロパティ/コンテンツの Key を "mgr-instruction:temperature" のように設定
  → Valueに想定値を記入
  → テンプレートに直接埋め込まれる
```

**特徴**:
- テンプレート側で静的に想定値を管理する
- テンプレートを使い回す場合は毎回同じ想定値が適用される
- タスク回ごとの個別設定は難しい

---

#### パターン B: 実験計画指示記入ダイアログで記述（今回の新機能）

**方法**: 実験計画指示記入ダイアログ（`ExperimentPlanDialog`）でテンプレートの情報をもとに想定値を記入し、`mgr-instruction:` 接頭句をつけて**各Data層**に想定値ベースのタグを書き込む。

```
ExperimentPlanDialog
  → テンプレート一覧からテンプレートを選択
  → テンプレートのフィールド（Property/Content）に想定値を入力
  → 保存時に "mgr-instruction:{fieldKey}" = "{想定値}" として
    MAIMLの対象Data層（Material / Condition / Result）に書き込む
```

**特徴**:
- タスク回（task_number）ごとに異なる想定値を設定できる（全体継承 + 個別上書き）
- 実験ごと・メソッドごとに動的に想定値を管理できる
- CreatorRef / InstrumentRef / OwnerRef / 注意事項 も合わせて管理できる

---

### 1-3. 機能の位置づけ（全体像）

```
【Manager の作業】

 ① テンプレート編集画面でMAIMLテンプレートを編集
 │   └─ パターンA: Key を "mgr-instruction:xxx" に設定して想定値を埋め込む
 │
 ② 実験計画指示記入ダイアログ（ExperimentPlanDialog）で指示を作成
     └─ パターンB: テンプレートの各フィールドに想定値を入力
          → DBに保存（experiment_planテーブル）
          → MAIMLのData層に "mgr-instruction:xxx" タグとして書き込む

【Worker の作業】

 ③ 実験時にMAIMLを参照
     └─ "mgr-instruction:xxx" タグの値（想定値）を参照しながら実験を実施
     └─ 実測値を通常のフィールドに記録
```

### 1-4. 機能スコープ

| 項目 | 内容 | ステータス |
|------|------|----------|
| 対象コンポーネント名 | `ExperimentPlanDialog`（実験計画詳細指示ダイアログ） | ✅ 確定 |
| 対象ファイル | `frontend/src/components/project/ExperimentPlanDialog.tsx` | ✅ 確定（モック実装済み） |
| 呼び出し元画面 | `TaskRegistrationTab`（タスク登録タブ） | ✅ 確定（実装済み） |
| 操作できるロール | Manager以上 | ❓ 未確認 |
| 参照できるロール | Worker も参照可能か？ | ❓ 未確認 |

### 1-5. 既存機能との関係 ✅ 確定

| 機能 | 概要 | 関係 |
|------|------|------|
| `InstructionEditDialog` | 既存の自由テキスト作業指示 | 独立維持（役割が異なる） |
| `ExperimentPlanDialog` | 新機能の構造化実験計画指示 | 今回新規追加 |

### 1-6. 用語定義 ✅ 確定（実装済みコードより）

| 用語 | 説明 |
|------|------|
| メソッド | MAIMLにおける作業単位（`protocol.methods[i]`）。1プロジェクトに複数存在 |
| タスク番号 | メソッド内のタスク回数。全体=0、タスク1〜N |
| トランジション | MAIMLペトリネットのトランジション（`pnml.transitions[]`の1要素） |
| CreatorRef | 実験担当者。MAIMLの `document.creators[].name` から選択 |
| InstrumentRef | 使用装置。MAIMLの `document.instruments[].name` から選択 |
| OwnerRef | 実験室オーナー。MAIMLの `document.owners[].name` から選択 |
| NoteItem | 分類された注意事項の1件（type / content / properties を持つ） |
| TemplateDef | materialTemplate / conditionTemplate / resultTemplate の1件 |
| TemplateField | テンプレート内の入力項目1件（key / label / type / units / options 等） |
| 全体タブ（`all`） | `task_number=0`。全タスクNのデフォルト値として継承 |
| タスクNタブ（`task-N`） | `task_number=N`。全体を継承しつつ個別上書き可能 |

---

## 2. 業務フロー

### 2-1. Manager による実験計画指示の作成フロー ✅ 確定（実装済み）

```
Manager → タスク登録タブを開く
  → 対象メソッドの「指示追加」ボタンをクリック
    → ExperimentPlanDialog が開く（methodId / taskNumbers が渡される）
      → 左パネルのトランジション一覧からトランジションを選択
        → 右パネルが活性化（入力フォームが表示される）
          → 全体タブで共通指示を入力
            ・CreatorRef / InstrumentRef / OwnerRef を選択・追加
            ・注意事項を種類を選んで追加
            ・テンプレート入力で条件値を入力
          → 必要に応じてタスクNタブで個別上書き
          → 保存ボタン → DBに保存（現在はモック）
```

### 2-2. Worker による参照フロー ❓ 未確認

```
【連携待ち】
Worker がどの画面から実験計画指示を参照するか、
参照するタイミング（チェックアウト時？作業中？）も確認が必要。
```

### 2-3. 全体タブとタスクNタブの継承動作 ✅ 確定（IMPLEMENTATION_PLAN 2-4 より）

**採用方針: 案C（継承）**

```
全体タブで「試薬A: 10ml」と設定
  → タスク1タブ: 「試薬A: 10ml」として反映（継承）
  → タスク2タブ: 「試薬A: 10ml」として反映（継承）
  → タスク2タブで「試薬A: 12ml」に変更 → タスク2だけ上書き
  → タスク1タブは「試薬A: 10ml」のまま
```

> ⚠️ **現在のモックでは継承ロジックが未実装**。本実装時に `overrideFlags` 構造を用いて実装予定。

---

## 3. 画面仕様

### 3-1. 呼び出し元 ✅ 確定（実装済み）

- **ファイル**: `frontend/src/components/project/TaskRegistrationTab.tsx`
- **操作**: 作業単位（メソッド）行の「指示追加」ボタンをクリック
- **渡されるProps**:

```typescript
<ExperimentPlanDialog
  open={isExperimentPlanDialogOpen}
  projectId={projectId}
  methodId={selectedMethodIdForPlan}
  taskNumbers={
    // 対象メソッドのタスク一覧（task_number）
    maimlRoot.protocol.methods
      .find(m => m.id === selectedMethodIdForPlan)
      ?.tasks.map(t => t.id)
  }
  creatorRefOptions={creatorRefOptions}      // maimlRoot.document.creators[].name
  instrumentRefOptions={instrumentRefOptions} // maimlRoot.document.instruments[].name
  ownerRefOptions={ownerRefOptions}           // maimlRoot.document.owners[].name
  methodTemplates={methodTemplatesForPlan}    // materialTemplates / conditionTemplates / resultTemplates
  onClose={...}
/>
```

### 3-2. ダイアログ全体レイアウト ✅ 確定（案3 タブ切替を採用方針）

```
┌─────────────────────────────────────────────────────────────┐
│  📄 実験計画詳細指示 — {methodId}                      [✕] │
├────────────────────────┬────────────────────────────────────┤
│ トランジション         │ [全体][タスク1][タスク2]...        │
│ ┌──────────────────┐   │ ─────────────────────────────────  │
│ │ Transition_A     │   │ （内部タブ: 案3選択時）            │
│ │ Transition_B  ◉  │   │ [基本情報][テンプレート入力]       │
│ │ Transition_C     │   │                                    │
│ └──────────────────┘   │ ▼ 基本情報タブ                     │
│ ※ 単体選択              │   【CreatorRef】 プルダウン+タグ   │
│                        │   【InstrumentRef】 プルダウン+タグ │
│                        │   【OwnerRef】 プルダウン+タグ     │
│                        │   【注意事項】 タイプ選択+カード   │
│                        │                                    │
│                        │ ▼ テンプレート入力タブ             │
│                        │   左:テンプレート一覧（行選択）    │
│                        │   右:選択テンプレートの入力フィールド│
└────────────────────────┴────────────────────────────────────┤
│                                  [キャンセル] [保存]         │
└─────────────────────────────────────────────────────────────┘
```

**現在モックで3レイアウト案を比較中** (RadioGroupで切替可能):

| 案 | 説明 | ステータス |
|----|------|----------|
| 案1（折りたたみ） | 基本情報をCollapseで格納、下にテンプレート入力 | 実装済み（比較用） |
| 案2（横並び4列） | Ref情報・注意事項を4列グリッドで表示、下にテンプレート入力 | 実装済み（比較用） |
| **案3（内部タブ切替）** | 「基本情報」「テンプレート入力」を内部タブで切替 | **採用方針**（要最終確認） |

> ❓ **確認**: 案3（内部タブ切替）で確定してよいか？確定後にRadioGroupを削除して案3に固定。

### 3-3. タブ構造 ✅ 確定（実装済み）

| タブキー | 表示名 | 説明 |
|---------|--------|------|
| `all` | 全体 | 全タスク共通のデフォルト値を設定（`task_number=0`として保存） |
| `task-1` | タスク1 | タスク1専用の上書き設定（`task_number=1`として保存） |
| `task-N` | タスクN | `taskNumbers` propsに応じて動的生成 |

### 3-4. 右パネルの活性条件 ✅ 確定（実装より）

トランジションが選択済みの場合のみ右パネル（入力フォーム）が活性化。  
未選択時は「左のトランジション一覧からトランジションを選択してください」とガイドメッセージを表示。

### 3-5. 保存ボタンの活性条件 ⚠️ 仮置き

現在の実装: `!isRightPanelActive`（トランジション未選択 = 非活性）のみチェック。

```
【確認】保存ボタンの活性条件
- トランジション未選択でも保存可能にするか？
- その他の必須バリデーション条件（CreatorRef必須？注意事項必須？）はあるか？
```

### 3-6. ダイアログサイズ ✅ 確定（実装より）

- `width="90vw"`, `maxWidth: 1600px`, `top: 24`
- 左パネル `span={5}`（約20%）、右パネル `span={19}`（約80%）
- 全体の `minHeight: 680`

---

## 4. 入力項目仕様

### 4-1. トランジション選択 ✅ 確定（実装済み）

| 項目 | 内容 |
|------|------|
| 取得元 | `maimlRoot.protocol.methods.find(m => m.id === methodId)?.pnml?.transitions` |
| 選択方式 | テーブル行クリック（単体選択） |
| 選択解除 | 選択中の行を再クリックで解除 |
| 複数選択 | ❓ 未確認（現状は単体選択。リクエストは `string[]` 配列型） |
| 選択後の動作 | 右パネルが活性化し入力フォームが表示される |
| トランジション名表示 | `t.name || t.id`（nameがなければidをフォールバック） |

> ❓ **確認**: トランジションは1件のみ選択か、複数選択に変更するか？

### 4-2. CreatorRef ✅ 確定（実装済み）

| 項目 | 内容 |
|------|------|
| 取得元（選択肢） | `maimlRoot.document.creators[].name`（TaskRegistrationTabで解析してprops経由） |
| 入力方式 | プルダウン選択 → 「追加」ボタン → Tagとして表示 |
| 複数選択 | 可（Tagを複数追加可能） |
| 重複防止 | 既に追加済みの項目はプルダウンから除外される |
| タグ削除 | Tagの×ボタンで削除 |
| 必須 | ❓ 未確認 |

### 4-3. InstrumentRef ✅ 確定（実装済み）

| 項目 | 内容 |
|------|------|
| 取得元（選択肢） | `maimlRoot.document.instruments[].name`（TaskRegistrationTabで解析してprops経由） |
| 入力方式 | プルダウン選択 → 「追加」ボタン → Tagとして表示 |
| 複数選択 | 可（Tagを複数追加可能） |
| 重複防止 | 既に追加済みの項目はプルダウンから除外される |
| タグ削除 | Tagの×ボタンで削除 |
| 必須 | ❓ 未確認 |

### 4-4. OwnerRef ✅ 確定（実装済み）

| 項目 | 内容 |
|------|------|
| 取得元（選択肢） | `maimlRoot.document.owners[].name`（TaskRegistrationTabで解析してprops経由） |
| 入力方式 | プルダウン選択 → 「追加」ボタン → Tagとして表示 |
| 複数選択 | 可（Tagを複数追加可能） |
| 重複防止 | 既に追加済みの項目はプルダウンから除外される |
| タグ削除 | Tagの×ボタンで削除 |
| 必須 | ❓ 未確認 |

### 4-5. 注意事項（NoteItem） ✅ 確定（実装済み）

#### 注意事項タイプ一覧（`NoteType` 定数、`experimentPlan.ts` で定義）

| 定数キー | typeValue | 表示ラベル |
|---------|-----------|-----------|
| `NoteType.CAUTION` | `mgr-instruction:caution` | 安全上の注意事項 |
| `NoteType.OPERATION_NOTE` | `mgr-instruction:operationNote` | 操作手順上の注記 |
| `NoteType.CHECK_ITEM` | `mgr-instruction:checkItem` | 実施前後の確認事項 |
| `NoteType.PROHIBITED_ACTION` | `mgr-instruction:prohibitedAction` | 禁止事項 |
| `NoteType.OTHER_NOTES` | `mgr-instruction:OtherNotes` | その他注意事項 |

#### NoteItem 型定義（`experimentPlan.ts`）

```typescript
interface NoteItem {
  id: string;           // "note_${Date.now()}" で生成
  type: NoteTypeValue;  // 上記5種類のいずれか
  content: string;      // テキストエリア入力（最大500文字）
  properties: PropertyValue[];  // 将来拡張用（現在は常に空配列）
}

interface PropertyValue {
  key: string;
  label: string;
  value: string | number;
}
```

#### 操作フロー

1. タイプ選択プルダウンから種類を選ぶ
2. 「追加」ボタンをクリック → カードが追加される
3. カード内のテキストエリアに内容を入力（最大500文字、`showCount` あり）
4. カード右上の削除ボタン（×）で削除

| 項目 | 内容 |
|------|------|
| 件数上限 | ❓ 未確認 |
| 必須 | ❓ 未確認 |

### 4-6. テンプレート入力 ✅ 型定義確定 / ⚠️ 接続未実装

#### テンプレートの取得元と型定義

```typescript
// TemplateDef（experimentPlan.ts で定義済み）
interface TemplateDef {
  id: string;                           // MAIML の template id
  label: string;                        // name または id のフォールバック
  category: 'material' | 'condition' | 'result';
  fields: TemplateField[];
}

interface TemplateField {
  key: string;          // Property/Content の key 属性
  label: string;        // key のフォールバック
  type: 'text' | 'number' | 'select';  // xsi:type から判別
  units?: string;       // units 属性
  description?: string;
  required?: boolean;
  options?: string[];   // select の選択肢（contentStringEnumType）
}
```

#### MAIMLパスとカテゴリの対応

| カテゴリ | MAIMLパス | ステータス |
|---------|----------|----------|
| `material` | `protocol.methods[methodId].materialTemplates` | ✅ 型定義確定 |
| `condition` | `protocol.methods[methodId].conditionTemplates` | ✅ 型定義確定 |
| `result` | `protocol.methods[methodId].resultTemplates` | ✅ 型定義確定 |

> ⚠️ **現在の実装状態**: `TaskRegistrationTab` で `methodTemplatesForPlan`（`TemplateDef[]`）を生成してpropsで渡す口は存在するが、`ExperimentPlanDialog` 内部ではまだ `SAMPLE_TEMPLATES`（ハードコードされたサンプルデータ）を使用中。本実装時に `methodTemplates` propsへの切り替えが必要。

#### テンプレート入力のUI（現状モック）

- 左側: テンプレート一覧（テーブル行選択）
- 右側: 選択したテンプレートの入力フィールド一覧
- フィールド種別に応じて `Input` / `InputNumber` / `Select` を使い分け

#### テンプレート値の保存形式 ✅ 確定（db_design_draft.md 6-2 より）

```json
{
  "condition-template-1": {
    "温度": "25",
    "圧力": "1.0"
  },
  "material-template-1": {
    "試薬A量": "10",
    "試薬B量": "5"
  }
}
```

> ⚠️ **注意**: 現在のモック実装では `templateId_fieldKey` のフラットなキー形式を使用。  
> 本実装でDBに保存する際はネスト形式（上記）に変換する必要がある。

#### MAIMLへの書き込み仕様（パターンB） ✅ 確定（2026-06-09 仕様連携）

Manager がダイアログで入力した想定値は、DBへの保存と同時に（または保存後に）MAIMLのData層へ書き込まれる。

**書き込みルール**:

```
TemplateField の key = "temperature"
 → MAIMLに書き込む時のKey = "mgr-instruction:temperature"
 → Value = Manager が入力した想定値
```

**対象Data層とテンプレートカテゴリの対応**:

| テンプレートカテゴリ | 書き込み先MAIMLパス |
|---------------------|-------------------|
| `material` | `protocol.methods[methodId].tasks[taskId].data[].material.properties` |
| `condition` | `protocol.methods[methodId].tasks[taskId].data[].condition.properties` |
| `result` | `protocol.methods[methodId].tasks[taskId].data[].result.properties` |

> ❓ **確認**: 正確なMAIMLパス（data[]の特定方法、既存Propertyへの追加 vs 上書きルール）  
> ❓ **確認**: テンプレートとData層の紐づき方（テンプレートIDとdata要素の対応）

**MAIMLに書き込まれた後の構造イメージ（XML）**:

```xml
<condition>
  <!-- 通常の実績値（Workerが記録） -->
  <property key="temperature">
    <content xsi:type="floatType" units="°C">実測値</content>
  </property>

  <!-- 想定値（Managerが事前設定） → mgr-instruction: 接頭句 -->
  <property key="mgr-instruction:temperature">
    <content xsi:type="floatType" units="°C">25</content>
  </property>
</condition>
```

> ❓ **確認**: XML構造の正確な仕様（property/content の形式、xsi:type は保持するか？）

**書き込みタイミング** ❓ 未確認:

| タイミング候補 | 説明 |
|--------------|------|
| 保存時に同期書き込み | DBへのUPSERTと同時にMAIMLを更新 |
| 別途「MAIML反映」ボタン | 保存後に明示的な操作でMAIMLに反映 |
| タスク登録時に一括書き込み | タスク登録（task-registration）フローで一括反映 |

> ❓ **確認S-06**: MAIMLへの書き込みタイミングはどれか？

---

## 5. データ設計

### 5-1. 保存粒度 ✅ 確定（IMPLEMENTATION_PLAN 2-3/2-4 より）

```
1レコード = organization_id + project_id + method_id + task_number
```

| task_number | 意味 |
|-------------|------|
| 0 | 全体タブのデータ（各タスクNのデフォルト値） |
| 1〜N | タスクNの個別上書きデータ（上書きがないタスクはレコード不要） |

**継承ロジック（フロントエンド側）**:

```typescript
// task_number=0 が「全体」のデータ
const globalData = rows.find(r => r.task_number === 0);

// 各タスクNのデータ（なければ全体を継承）
const getTaskData = (taskNumber: number) =>
  rows.find(r => r.task_number === taskNumber) ?? globalData;
```

### 5-2. `experiment_plan` テーブル（新規） ✅ 確定（db_design_draft.md より）

```sql
CREATE TABLE experiment_plan (
  organization_id      uuid NOT NULL,
  project_id           character varying(20) NOT NULL,
  method_id            character varying NOT NULL,
  task_number          integer NOT NULL DEFAULT 0,
  -- 0: 全体タブ, 1〜N: タスクNタブ

  -- Ref情報（PostgreSQL配列型）
  selected_transitions text[],
  creator_refs         text[],
  instrument_refs      text[],
  owner_refs           text[],

  -- 構造化データ（JSONB型）
  notes                jsonb,           -- NoteItem[]
  template_values      jsonb,           -- {templateId: {fieldKey: value}}

  -- 管理カラム
  create_user_id       character varying(50),
  create_at            timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_user_id       character varying(50),
  update_at            timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT experiment_plan_PKC
    PRIMARY KEY (organization_id, project_id, method_id, task_number)
);

COMMENT ON TABLE experiment_plan IS '実験計画（作業単位指示の詳細情報）';
COMMENT ON COLUMN experiment_plan.task_number IS 'タスク番号（全体=0、タスクN=N）';
COMMENT ON COLUMN experiment_plan.notes IS '注意事項一覧（JSONB形式: NoteItem[]）';
COMMENT ON COLUMN experiment_plan.template_values IS 'テンプレート入力値（JSONB形式: {templateId: {fieldKey: value}}）';

-- 検索用インデックス
CREATE INDEX idx_experiment_plan_project
  ON experiment_plan (organization_id, project_id);

CREATE INDEX idx_experiment_plan_method
  ON experiment_plan (organization_id, project_id, method_id);
```

### 5-3. JSONB カラムの構造 ✅ 確定

#### `notes`（`NoteItem[]`）

```json
[
  {
    "id": "note_1718000000000",
    "type": "mgr-instruction:caution",
    "content": "高温注意：装置表面が100℃以上になる場合があります",
    "properties": []
  },
  {
    "id": "note_1718000000001",
    "type": "mgr-instruction:checkItem",
    "content": "実験前に安全確認シートに署名すること",
    "properties": []
  }
]
```

#### `template_values`（ネスト形式）

```json
{
  "condition-template-1": {
    "温度": "25",
    "圧力": "1.0"
  },
  "material-template-1": {
    "試薬A量": "10"
  }
}
```

### 5-4. 既存テーブルとの関係 ✅ 確定（IMPLEMENTATION_PLAN 2-3 より）

```
project
  └── project_task
        └── project_task_detail（タスク詳細）

project_instruction（既存: 作業指示・コメント）
  ※ 実験計画とは完全に独立維持

experiment_plan（新規: 実験計画の詳細設定）★今回追加
  ├── task_number=0: 全体タブのデータ
  ├── task_number=1: タスク1タブのデータ（個別上書き分）
  └── task_number=N: タスクNタブのデータ（個別上書き分）
```

| 確認事項 | ステータス |
|---------|----------|
| `project_instruction` との使い分け・役割の整理 | ✅ 確定（完全分離） |
| `project_task` との紐づき方（直接FK？） | ❓ 未確認 |
| プロジェクト削除時の `experiment_plan` データの扱い（CASCADE？） | ❓ 未確認 |

---

## 6. API設計

### 6-1. エンドポイント一覧 ✅ 確定（IMPLEMENTATION_PLAN 2-3 より）

| メソッド | URL | 説明 | ステータス |
|---------|-----|------|----------|
| `GET` | `/api/v1/projects/:projectId/experiment-plans?methodId=xxx` | 指定メソッドの全タブデータ一括取得 | ✅ 確定 |
| `PUT` | `/api/v1/projects/:projectId/experiment-plans/:methodId/:taskNumber` | 1タブ分のデータ保存（UPSERT） | ✅ 確定 |
| `DELETE` | `/api/v1/projects/:projectId/experiment-plans/:methodId` | 指定メソッドの全削除 | ✅ 確定 |

> ⚠️ 現在の `experimentPlanApiService.ts` の `saveExperimentPlan` は `POST` でモック実装中。本実装時に上記 `PUT` に合わせる。

### 6-2. GET レスポンス ✅ 確定

```json
{
  "success": true,
  "data": [
    {
      "methodId": "method-001",
      "taskNumber": 0,
      "selectedTransitions": ["t1"],
      "creatorRefs": ["田中太郎"],
      "instrumentRefs": ["HPLC-001"],
      "ownerRefs": ["実験室A"],
      "notes": [
        {
          "id": "note_1718000000000",
          "type": "mgr-instruction:caution",
          "content": "高温注意",
          "properties": []
        }
      ],
      "templateValues": {
        "condition-template-1": { "温度": "25" }
      }
    },
    {
      "methodId": "method-001",
      "taskNumber": 2,
      "selectedTransitions": ["t1"],
      "creatorRefs": ["田中太郎"],
      "instrumentRefs": ["HPLC-001"],
      "ownerRefs": ["実験室A"],
      "notes": [],
      "templateValues": {
        "condition-template-1": { "温度": "30" }
      }
    }
  ]
}
```

> タスク2のデータがある → 全体を上書き。タスク1のデータがない → 全体を継承。

### 6-3. PUT リクエスト ✅ 確定

URL例: `PUT /api/v1/projects/proj-001/experiment-plans/method-001/0`

```json
{
  "selectedTransitions": ["t1"],
  "creatorRefs": ["田中太郎"],
  "instrumentRefs": ["HPLC-001"],
  "ownerRefs": ["実験室A"],
  "notes": [
    {
      "id": "note_1718000000000",
      "type": "mgr-instruction:caution",
      "content": "高温注意",
      "properties": []
    }
  ],
  "templateValues": {
    "condition-template-1": { "温度": "25" }
  }
}
```

### 6-4. UPSERT SQL ✅ 確定（db_design_draft.md より）

```sql
INSERT INTO experiment_plan (
  organization_id, project_id, method_id, task_number,
  selected_transitions, creator_refs, instrument_refs, owner_refs,
  notes, template_values,
  create_user_id, create_at, update_user_id, update_at
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), $12, NOW())
ON CONFLICT (organization_id, project_id, method_id, task_number)
DO UPDATE SET
  selected_transitions = EXCLUDED.selected_transitions,
  creator_refs         = EXCLUDED.creator_refs,
  instrument_refs      = EXCLUDED.instrument_refs,
  owner_refs           = EXCLUDED.owner_refs,
  notes                = EXCLUDED.notes,
  template_values      = EXCLUDED.template_values,
  update_user_id       = EXCLUDED.update_user_id,
  update_at            = NOW();
```

### 6-5. 認可制御 ❓ 未確認

| 操作 | 必要ロール | ステータス |
|------|-----------|----------|
| `GET`（取得） | ❓ | ❓ 未確認 |
| `PUT`（保存） | ❓ Manager以上？ | ❓ 未確認 |
| `DELETE`（削除） | ❓ Manager以上？ | ❓ 未確認 |

---

## 7. フロントエンド実装設計

### 7-1. 関連ファイル

| ファイル | 役割 | 実装状態 |
|---------|------|---------|
| `frontend/src/types/experimentPlan.ts` | 型定義 | ✅ 実装済み（主要型は確定） |
| `frontend/src/services/experimentPlanApiService.ts` | APIサービス | ⚠️ モック実装中（save のみ・mock返却） |
| `frontend/src/components/project/ExperimentPlanDialog.tsx` | メインダイアログ | ⚠️ モック実装中（3案比較UI残存） |
| `frontend/src/components/project/TaskRegistrationTab.tsx` | 呼び出し元 | ✅ Props生成・ダイアログ呼び出し実装済み |
| `frontend/src/contexts/ProjectMaimlContext.tsx` | MAIMLデータ取得 | ✅ 既存流用 |

### 7-2. 確定済みProps設計（`ExperimentPlanDialogProps`）

```typescript
// frontend/src/types/experimentPlan.ts（実装済み）
interface ExperimentPlanDialogProps {
  open: boolean;
  projectId: string;
  methodId: string;
  taskNumbers: number[];           // 対象メソッドのタスク番号一覧
  creatorRefOptions?: string[];    // maimlRoot.document.creators[].name
  instrumentRefOptions?: string[]; // maimlRoot.document.instruments[].name
  ownerRefOptions?: string[];      // maimlRoot.document.owners[].name
  methodTemplates?: TemplateDef[]; // materialTemplates / conditionTemplates / resultTemplates
  onClose: () => void;
  onSave?: () => void;
  disabled?: boolean;
}
```

### 7-3. 現在のモック状態と本実装で必要な変更

| 項目 | 現在のモック状態 | 本実装で必要な変更 |
|------|---------------|----------------|
| テンプレート取得 | `SAMPLE_TEMPLATES`（ハードコード）を使用中 | `methodTemplates` propsから動的レンダリングに切替 |
| Ref選択肢 | `maimlRoot.document` から取得済み ✅ | そのまま使用可 |
| レイアウト | 案1/2/3の比較UIが残存 | 案3に固定・RadioGroupと案1/2 JSXを削除 |
| 継承ロジック | 未実装（全体→タスクNへの反映なし） | `overrideFlags` 構造でフィールド単位管理 |
| 保存処理 | アクティブタブのみ保存（バグあり） | 全タブ一括保存に変更 |
| データ復元 | 未実装（開くたびに初期化） | ダイアログOpen時にGET APIで復元 |
| APIエンドポイント | モック（500ms後にsuccess返却） | 実APIに接続 |

### 7-4. State設計（本実装案） ⚠️ 仮置き

```typescript
// 本実装時に TabState を拡張する
interface TaskTabState {
  taskNumber: number;  // 0 = 全体, N = タスクN
  data: ExperimentPlanTabData;
  /** 各フィールドが個別上書き済みかを管理するフラグ */
  overrideFlags: {
    selectedTransitions?: boolean;
    creatorRefs?: boolean;
    instrumentRefs?: boolean;
    ownerRefs?: boolean;
    notes?: boolean;
    templateValues?: Record<string, boolean>; // テンプレートフィールドごと
  };
}

// 全体タブ変更時の反映ロジック（概要）
const applyGlobalToTasks = (
  globalData: ExperimentPlanTabData,
  taskStates: TaskTabState[]
): TaskTabState[] => {
  return taskStates.map(task => ({
    ...task,
    data: {
      // overrideFlagsがtrueの項目はタスク独自の値を維持
      // falseまたは未設定の項目は全体の値を反映
      selectedTransitions: task.overrideFlags.selectedTransitions
        ? task.data.selectedTransitions
        : globalData.selectedTransitions,
      // ... 他フィールドも同様
    }
  }));
};
```

### 7-5. 本実装フェーズ計画（IMPLEMENTATION_PLAN より）

#### Phase 1: フロントのみで完結する修正

| # | 作業内容 | 優先度 | 状態 |
|---|---------|--------|------|
| 1 | `SAMPLE_TEMPLATES` → `methodTemplates` propsへ切替 | 🟡 中 | ⬜ 未着手 |
| 2 | 比較用UI（案1/2/3 RadioGroup）を削除し案3固定 | 🟡 中 | ⬜ 未着手（案3確認後） |
| 3 | 継承ロジック（`overrideFlags`）実装 | 🔴 高 | ⬜ 未着手 |
| 4 | 保存処理を全タブ一括保存に変更 | 🔴 高 | ⬜ 未着手 |

#### Phase 2: バックエンドAPI実装

| # | 作業内容 |
|---|---------|
| 1 | マイグレーション（`experiment_plan`テーブル作成） |
| 2 | Repository (`experimentPlanRepository.ts`) — upsert / findByMethod / deleteByMethod |
| 3 | Service (`experimentPlanService.ts`) — 認可チェック含む |
| 4 | Controller + Route (`GET` / `PUT` / `DELETE`) |
| 5 | フロント接続（`experimentPlanApiService.ts`を実APIに切替） |

#### Phase 3: データ復元・UX改善

| # | 作業内容 |
|---|---------|
| 1 | ダイアログオープン時に GET API でデータ取得→各タブに復元 |
| 2 | `overrideFlags` の初期化（DB保存済み = 全体と差分あり → override扱い） |
| 3 | バリデーション実装（必須項目チェック等） |
| 4 | 保存成功/失敗のフィードバック改善 |
| 5 | 読み込みスケルトン表示 |

### 7-6. 参照すべき既存実装

| ファイル | 参照目的 |
|---------|---------|
| `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx` | テンプレート入力の `renderProperty` / `renderContentField` 実装パターン |
| `frontend/src/components/project/InstructionEditDialog.tsx` | 同様の指示入力ダイアログのUXパターン |
| `frontend/src/contexts/ProjectMaimlContext.tsx` | MAIMLデータ取得方法 |

---

## 8. バックエンド実装設計

### 8-1. 新規作成ファイル一覧

| ファイル | 内容 | ステータス |
|---------|------|----------|
| `backend/migrations/YYYYMMDD_add_experiment_plan.sql` | テーブル追加マイグレーション | ❓ 未着手 |
| `backend/src/repositories/experimentPlanRepository.ts` | DB操作（upsert / findByMethod / deleteByMethod） | ❓ 未着手 |
| `backend/src/services/experimentPlanService.ts` | ビジネスロジック・認可チェック | ❓ 未着手 |
| `backend/src/controllers/experimentPlanController.ts` | リクエスト処理 | ❓ 未着手 |
| `backend/src/routes/experimentPlanRoutes.ts` | ルーティング | ❓ 未着手 |
| `backend/src/sql/queries/experimentPlan/findByMethod.sql` | メソッド別取得SQL | ❓ 未着手 |
| `backend/src/sql/queries/experimentPlan/upsert.sql` | UPSERT SQL | ❓ 未着手 |
| `backend/src/sql/queries/experimentPlan/deleteByMethod.sql` | 削除SQL | ❓ 未着手 |

### 8-2. 型定義追加（`backend/src/types/database.ts`）

```typescript
// ExperimentPlanRow を追加予定
export interface ExperimentPlanRow {
  organization_id: string;
  project_id: string;
  method_id: string;
  task_number: number;
  selected_transitions: string[] | null;
  creator_refs: string[] | null;
  instrument_refs: string[] | null;
  owner_refs: string[] | null;
  notes: NoteItemJson[] | null;
  template_values: Record<string, Record<string, string | number | boolean>> | null;
  create_user_id: string | null;
  create_at: Date;
  update_user_id: string | null;
  update_at: Date;
}

// NoteItemJson は frontend の NoteItem と同構造
interface NoteItemJson {
  id: string;
  type: string;            // 'mgr-instruction:caution' 等
  content: string;
  properties: Array<{ key: string; label: string; value: string | number }>;
}
```

### 8-3. 取得SQL（findByMethod）

```sql
-- 1メソッドの全タブ（全体 + 全タスク）を一括取得
SELECT *
FROM experiment_plan
WHERE organization_id = $1
  AND project_id      = $2
  AND method_id       = $3
ORDER BY task_number ASC;
```

---

## 9. 確認事項一覧

> ❗ このセクションは情報連携の受け口です。連携いただいた内容を反映します。

### 9-1. 業務・仕様系

| # | 確認事項 | 優先度 | 状態 |
|---|---------|--------|------|
| S-01 | Worker が実験計画指示を参照する業務フロー（どの画面から？いつ？） | 🔴 高 | ❓ 連携待ち |
| S-02 | 操作可能ロール（作成・編集・参照）の確定 | 🔴 高 | ❓ 連携待ち |
| S-03 | 実験計画指示の作成タイミング（プロジェクト状態との関係） | 🟡 中 | ❓ 連携待ち |
| S-04 | プロジェクト削除時の `experiment_plan` データの扱い（CASCADE削除？） | 🟡 中 | ❓ 連携待ち |
| S-05 | `project_task` との直接FK関係が必要か | 🟡 中 | ❓ 連携待ち |

### 9-2. UI・入力仕様系

| # | 確認事項 | 優先度 | 状態 |
|---|---------|--------|------|
| U-01 | ダイアログのレイアウト案（案1/2/3）を確認して採用案を決定 | 🔴 高 | ❓ 確認待ち |
| U-02 | トランジション選択：単体選択のままか、複数選択に変更するか | 🟡 中 | ❓ 確認待ち |
| U-03 | 保存ボタンの活性条件（必須項目の定義） | 🟡 中 | ❓ 連携待ち |
| U-04 | 全体タブ変更時に各タスクNへ自動反映するか（継承動作の確認） | 🟡 中 | ✅ 確定（継承あり） |
| U-05 | タスクNタブで個別上書きした際に全体から切り離すか | 🟡 中 | ✅ 確定（overrideFlagsで管理） |
| U-06 | ダイアログデフォルト表示（「基本情報」タブか「テンプレート入力」タブか） | 🟢 低 | ❓ 確認待ち |
| U-07 | CreatorRef / InstrumentRef / OwnerRef は必須項目か | 🟡 中 | ❓ 連携待ち |
| U-08 | 注意事項の件数上限はあるか | 🟢 低 | ❓ 連携待ち |

### 9-3. テンプレート入力仕様系

| # | 確認事項 | 優先度 | 状態 |
|---|---------|--------|------|
| T-01 | テンプレートはトランジション選択に紐づくか、全件表示か | 🔴 高 | ❓ 連携待ち |
| T-02 | Manager が入力した値のWorker側での扱い（目標値として表示？上書き制限？） | 🔴 高 | ❓ 連携待ち |
| T-03 | トランジション1件に対してテンプレートは1件か複数か | 🟡 中 | ❓ 連携待ち |

### 9-5. MAIMLへの書き込み仕様（最重要）

| # | 確認事項 | 優先度 | 状態 |
|---|---------|--------|------|
| S-06 | MAIMLへの書き込みタイミング（保存時同期 / 別途反映ボタン / タスク登録時） | 🔴 高 | ❓ 連携待ち |
| M-01 | 書き込み先の正確なMAIMLパス（`data[]`の特定方法） | 🔴 高 | ❓ 連携待ち |
| M-02 | テンプレートIDとMAIMLのdata要素の紐づき方 | 🔴 高 | ❓ 連携待ち |
| M-03 | 既存Propertyへの追加か上書きか（同一keyが既に存在する場合） | 🔴 高 | ❓ 連携待ち |
| M-04 | 書き込み時のXML構造（property/content の形式、xsi:type は保持するか）| 🟡 中 | ❓ 連携待ち |
| M-05 | 注意事項（NoteItem）はMAIMLのどこに書き込むか（または書き込まないか） | 🟡 中 | ❓ 連携待ち |
| M-06 | CreatorRef / InstrumentRef / OwnerRef はMAIMLにも反映するか | 🟡 中 | ❓ 連携待ち |
| M-07 | パターンA（テンプレート直接記述）との共存ルール（重複時の優先度） | 🟡 中 | ❓ 連携待ち |

### 9-4. データ・API系

| # | 確認事項 | 優先度 | 状態 |
|---|---------|--------|------|
| D-01 | テーブル設計（カラム・型・制約）の最終確認 | 🔴 高 | ✅ 仮設計確定（詳細は db_design_draft.md） |
| D-02 | APIの認可制御（GET / PUT / DELETE に必要なロール） | 🔴 高 | ❓ 連携待ち |
| D-03 | `project_task` との FK 関係 | 🟡 中 | ❓ 連携待ち |
| D-04 | プロジェクト削除時の連動削除要否 | 🟡 中 | ❓ 連携待ち |

---

## 更新履歴

| 日付 | 更新内容 |
|------|---------|
| 2026-06-09 | 初版作成（既存断片資料から統合・整理、確認事項を整理） |
| 2026-06-09 | 実装済みコード（ExperimentPlanDialog.tsx / experimentPlan.ts / TaskRegistrationTab.tsx / db_design_draft.md / IMPLEMENTATION_PLAN.md）から情報を取得し、確定済み仕様を大幅反映。未確認項目を整理。 |
| 2026-06-09 | **仕様連携反映**: 機能の本質（MAIMLへの想定値書き込み）・`mgr-instruction:` 接頭句の意味・2パターン（テンプレート直接記述 vs ダイアログ記述）を追記。MAIMLへの書き込み仕様セクション・確認事項9-5（MAIML書き込み関連M-01〜M-07）を追加。 |
