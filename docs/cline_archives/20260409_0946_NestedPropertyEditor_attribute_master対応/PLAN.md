# タスク計画書: NestedPropertyEditor 属性追加ダイアログ Attributeマスタ連携

## メタデータ
- **作成日時**: 2026-04-09 09:46
- **タスクID**: NestedPropertyEditor_attribute_master対応
- **優先度**: 中
- **推定工数**: 3〜4時間

## 1. タスク概要

`frontend/src/components/editorv2/components/NestedPropertyEditor.tsx` の「属性追加ダイアログ（➕ 属性）」にて、現在ハードコードされている属性名の選択肢（`formatString`, `units`, `scaleFactor` 等）を、バックエンドの **Attributeマスタ**（`/api/v1/master/attribute`）から動的に取得したデータに置き換える。

また、現在存在する「🔧 カスタム属性名を入力...」選択肢は廃止し、カスタム属性はAttributeマスタへ登録することで対応する方針とする。

---

## 2. 現状と課題

### 現在の属性追加ダイアログの構成（NestedPropertyEditor.tsx L406〜L488）

| 選択肢 | 対象タグ | 備考 |
|-------|---------|------|
| `xsi:type` | property / content 共通 | MaiML型定義（固定） |
| `key` | property / content 共通 | 必須属性（固定） |
| `formatString` | property / content 共通 | ← Attributeマスタの `attribute_name='formatString'` に対応 |
| `units` | property / content 共通 | ← Attributeマスタの `attribute_name='units'` に対応 |
| `scaleFactor` | property / content 共通 | ← Attributeマスタの `attribute_name='scaleFactor'` に対応 |
| `axis` | content 固有 | ← 固定（XSD仕様） |
| `size` | content 固有 | ← 固定（XSD仕様） |
| `id` | content 固有 | ← 固定（XSD仕様） |
| `ref` | content 固有 | ← 固定（XSD仕様） |
| `__custom__` | 共通 | **廃止予定** |

### 課題
1. `formatString` / `units` / `scaleFactor` の値（属性値）がハードコードされておらず、テキスト入力のみ
2. ユーザーが属性値を手入力するため、誤入力・揺れが発生しやすい
3. カスタム属性（`__custom__`）はマスタ未登録のまま自由入力されており、一貫性がない

---

## 3. 目的と期待される成果

### 目的
- 属性追加ダイアログの属性名選択肢をAttributeマスタから動的取得することで、データの一貫性を確保する
- 属性名が選択されたとき、その属性名に対応する属性値の選択肢もマスタから表示し、ユーザーの入力を支援する
- カスタム属性の自由入力を廃止し、マスタ登録を促す設計とする

### 期待される成果
- [ ] 属性追加ダイアログの属性名プルダウンに `key`, `xsi:type`, `id`, `ref`（固定）以外はAttributeマスタの `attribute_name` 一覧が表示される
- [ ] 属性名（`units`, `formatString`, `scaleFactor` 等）を選択すると、対応する `attribute_value` 一覧がプルダウンで表示される
- [ ] `__custom__` 選択肢（カスタム属性）の廃止
- [ ] Attributeマスタ取得用APIサービス関数を追加
- [ ] マスタ未取得時（ローディング中 / エラー時）のフォールバック表示

---

## 4. 実装ステップ

### Phase 1: APIサービス関数の追加

**対象ファイル**: `frontend/src/services/masterApiService.ts`

- [ ] Attributeマスタ一覧を取得する専用関数 `fetchAttributeMasters()` を追加
  - エンドポイント: `GET /api/v1/master/attribute`
  - 戻り値: `AttributeRecord[]`
  - 用途: NestedPropertyEditorから呼び出し

> 補足: 既存の `fetchMasters('attribute')` を利用することも可能だが、NestedPropertyEditorは汎用コンポーネントのため、専用の軽量関数を追加する

### Phase 2: Attributeマスタデータのキャッシュ用カスタムフック作成（任意）

**対象ファイル**: `frontend/src/hooks/useAttributeMasters.ts`（新規）

- [ ] `useAttributeMasters()` フックを作成
  - マウント時に1回だけAPIを呼び出す
  - `attributeRecords: AttributeRecord[]`, `loading: boolean`, `error: string | null` を返す
  - 取得した `attributeRecords` から以下を生成するユーティリティも提供：
    - `getAttributeNames()` → `attribute_name` の一意リスト（`key`, `xsi:type`, `id`, `ref` を除く）
    - `getAttributeValues(attributeName: string)` → 指定 `attribute_name` に対応する `attribute_value` リスト

> 補足: NestedPropertyEditorは再帰的にレンダリングされるため、親コンポーネント（TemplateEditorDialog 等）でデータを1回取得してPropsとして渡す設計も検討する（→ Phase 2-B 参照）

### Phase 2-B: 親コンポーネントへのProps追加（設計判断）

**2つの設計案を比較し選択する:**

#### 案A: NestedPropertyEditor内部でAPIコール（自己完結型）
- **メリット**: コンポーネント単独で動作する、Propsを変更しない
- **デメリット**: 再帰レンダリングでネストが深い場合、多重APIコール発生のリスク → `useMemo` + コンポーネントの外部でキャッシュすることで緩和可能

#### 案B: 親からPropsで渡す（推奨）
- **メリット**: API呼び出しが1回だけ、パフォーマンス良好
- **デメリット**: `NestedPropertyEditorProps` にフィールド追加が必要、呼び出し元コンポーネントの修正が必要

**→ 案B（親からPropsで渡す）を採用する**

理由: NestedPropertyEditorは再帰的に自身をレンダリングするため、内部でAPIコールすると深いネストで多重リクエストが発生するリスクがある。

### Phase 3: NestedPropertyEditorProps の拡張

**対象ファイル**: `frontend/src/components/editorv2/components/NestedPropertyEditor.tsx`

- [ ] `NestedPropertyEditorProps` に以下を追加:
  ```typescript
  attributeRecords?: AttributeRecord[];  // Attributeマスタデータ（親から渡す）
  ```
  - Optional にすることで、既存の呼び出し元を壊さない
  - `attributeRecords` が未指定の場合は従来の固定選択肢にフォールバック

### Phase 4: 属性追加ダイアログの改修

**対象ファイル**: `frontend/src/components/editorv2/components/NestedPropertyEditor.tsx`

- [ ] `newAttributeName` の選択肢を動的生成に変更:
  ```
  固定選択肢（常に先頭に表示）:
    - xsi:type（MaiML型定義）
    - key（キー・必須）
    - id（content固有）
    - ref（content固有）
  
  動的選択肢（Attributeマスタから生成）:
    - attributeRecords から attribute_name の一意リスト（上記固定以外）
    - 例: units, formatString, scaleFactor, ...（マスタに登録されたもの）
  ```

- [ ] `__custom__` 選択肢を削除（カスタム属性はマスタ登録で対応）

- [ ] `newAttributeName` が `xsi:type`・`key`・`id`・`ref` 以外（= マスタ由来の属性名）を選択した場合:
  - 属性値入力欄をテキスト入力から **Select（プルダウン）** に変更
  - 選択肢: `attributeRecords.filter(r => r.attributeName === newAttributeName).map(r => r.attributeValue)`
  - ラベルに `attributeRemark` を表示（例: `m（メートル）`）

- [ ] `customAttributeName` State と関連JSXを削除

- [ ] 再帰レンダリング時に `attributeRecords` Props を子の `NestedPropertyEditor` に pass through

### Phase 5: 呼び出し元コンポーネントの修正

Attributeマスタデータを取得して `NestedPropertyEditor` に渡している親コンポーネントを修正する。

- [ ] 呼び出し元を特定する

  ```
  調査対象: frontend/src/components/editorv2/ 配下
  ```

- [ ] 特定した親コンポーネントで:
  - `useState<AttributeRecord[]>` を追加
  - `useEffect` でマウント時に `fetchAttributeMasters()` を呼び出す
  - 取得した `attributeRecords` を `NestedPropertyEditor` に渡す

---

## 5. 影響範囲

### 変更するファイル
1. `frontend/src/components/editorv2/components/NestedPropertyEditor.tsx` - 主要改修
2. 呼び出し元コンポーネント（要調査・特定） - `attributeRecords` のfetch・Props渡し

### 新規作成するファイル
1. `frontend/src/hooks/useAttributeMasters.ts` - Attributeマスタ取得フック（案Bではオプション）

### 修正不要なファイル
- `frontend/src/services/masterApiService.ts` - `fetchMasters('attribute')` が既存のため流用可能（またはラッパー追加）
- バックエンド側 - 既存の `/api/v1/master/attribute` APIをそのまま利用

---

## 6. 技術的詳細

### Attributeマスタ APIのエンドポイント
```
GET /api/v1/master/attribute
```
レスポンス: `AttributeRecord[]`
```typescript
interface AttributeRecord {
  attributeName: string;   // 属性名（例: units, formatString, scaleFactor）
  attributeValue: string;  // 属性値（例: m, kg, %d）
  attributeRemark?: string; // 備考（例: メートル, キログラム）
  departmentCd: string;
  departmentName: string;
  isActive: boolean;
  ...
}
```

### 属性値プルダウンの表示形式
```
value: attributeValue
label: attributeValue（attributeRemark がある場合は「value（remark）」形式）
```
例:
- `m（メートル）`
- `%d（整数）`
- `1（×1 スケールなし）`

### 固定属性名（Attributeマスタとは別に常時表示）

| 属性名 | 対象 | 値の入力形式 |
|--------|------|------------|
| `key` | property / content 共通 | テキスト入力（固定） |
| `xsi:type` | property / content 共通 | MaiML型Selectプルダウン（固定） |
| `axis` | content 固有 | テキスト入力（固定） |
| `size` | content 固有 | テキスト入力（固定） |
| `id` | content 固有 | テキスト入力（固定） |
| `ref` | content 固有 | テキスト入力（固定） |

---

## 7. UI変更イメージ

### 変更前（現在）
```
属性名プルダウン:
  ・xsi:type（MaiML型定義）
  ・key（キー・必須）
  ・formatString（書式文字列）   ← ハードコード
  ・units（単位）                ← ハードコード
  ・scaleFactor（スケール係数）  ← ハードコード
  ・axis（content固有）
  ・size（content固有）
  ・id（content固有）
  ・ref（content固有）
  ・🔧 カスタム属性名を入力...   ← 廃止

属性値入力: テキスト入力（常時）
```

### 変更後（実装後）
```
属性名プルダウン:
  [固定グループ]
  ・xsi:type（MaiML型定義）
  ・key（キー・必須）
  ・axis（content固有）
  ・size（content固有）
  ・id（content固有）
  ・ref（content固有）
  [マスタグループ]
  ・units               ← マスタから動的生成
  ・formatString        ← マスタから動的生成
  ・scaleFactor         ← マスタから動的生成
  ・（マスタに追加された属性名が自動的に増える）

属性値入力:
  - xsi:type選択時 → MaiML型Selectプルダウン（変更なし）
  - key/axis/size/id/ref選択時 → テキスト入力（変更なし）
  - マスタ由来の属性名選択時 → 属性値Selectプルダウン（NEW）
    例: units選択 → m（メートル）/ cm（センチメートル）/ kg（キログラム）...
```

---

## 8. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| Attributeマスタが空・未登録の場合 | 中 | 低 | フォールバックで固定選択肢を表示する |
| API取得エラー | 中 | 低 | エラー時はダイアログを開いたまま固定選択肢を使用 |
| `attributeRecords` Props未指定時の後方互換性 | 高 | 中 | Optional Props にして既存呼び出し元を壊さない |
| 呼び出し元が複数箇所あった場合の修正漏れ | 中 | 中 | grep で全呼び出し元を特定してから修正 |

---

## 9. テスト計画

- [ ] 属性追加ダイアログを開いたとき、マスタ由来の属性名が表示される
- [ ] `units` を選択すると属性値プルダウンに `m（メートル）`, `cm（センチメートル）` 等が表示される
- [ ] `xsi:type` を選択すると MaiML型Selectが表示される（従来動作の維持）
- [ ] `key` を選択するとテキスト入力が表示される（従来動作の維持）
- [ ] content要素では `axis`, `size`, `id`, `ref` が追加で表示される
- [ ] `__custom__` 選択肢が存在しないことを確認
- [ ] マスタが空の場合（APIレスポンスが`[]`）でも固定選択肢のみで正常動作する

---

## 10. 承認記録

- **計画書提示日時**: 2026-04-09 09:46
- **承認日時**: 
- **承認者コメント**: 
