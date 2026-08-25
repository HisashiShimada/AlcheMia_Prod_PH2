# タスク計画書: テンプレート新規プロパティ追加ダイアログ 用語連携・表示名変換

## メタデータ
- **作成日時**: 2026-08-06 08:17
- **タスクID**: テンプレート新規プロパティデフォルト値_用語連携
- **優先度**: 中
- **推定工数**: 5〜7時間

---

## 1. タスク概要

実験管理者メニューのテンプレート機能において、新規プロパティを追加する際に以下の2機能を追加する。

### 機能A：用語追加時の自動補完（DBから取得）
`TemplateEditorDialog` のプロパティ追加モーダルにおいて、キー（`prefix:localName`）を
`namespace_term` テーブルから取得した用語を **候補一覧（Select with showSearch）** として表示し、ユーザーが選択する形式に変更する。  
選択した用語の関連フィールド（型・単位・説明）は選択時に自動で補完される。  
表示形式は以下の通り：
- 1行目（太字）：`displayName`（用語の表示名）
- 2行目（グレー小文字）：`prefix:localName`（qname）

### 機能B：キー→表示名変換表示
`NestedPropertyEditor` に表示されているキー（例: `chem:SampleTemperature`）の横に
DB登録済み用語の `displayName`（表示名）を合わせて表示する。

---

## 2. 現状の調査結果

### 2-1. 関連コンポーネント

| ファイル | 役割 |
|---------|------|
| `frontend/src/components/editorv2/TemplateEditorDialog.tsx` | プロパティ/コンテンツ追加ダイアログ（追加ボタン押下で `NestedPropertyEditor` に渡す） |
| `frontend/src/components/editorv2/NestedPropertyEditor.tsx` | 属性追加ダイアログ（AddAttributeDialog）・要素追加ダイアログ（AddElementDialog）を含む。個々のプロパティ表示・編集コンポーネント |
| `frontend/src/hooks/useAttributeMasters.ts` | Attributeマスタ取得フック（既存）。属性名/値の選択肢を提供 |
| `frontend/src/services/namespaceApiService.ts` | 用語CRUD API関数を提供（`getTerms` 等） |
| `frontend/src/types/editor.ts` | `NestedPropertyEditorProps` 型定義 |
| `backend/src/routes/namespaceRoutes.ts` | `GET /api/v1/namespaces/terms` ほか用語系ルート定義 |
| `backend/src/sql/queries/namespace_terms/findTermByKey.sql` | prefix + localname で1件取得するSQL（既存） |

### 2-2. DBスキーマ（namespace_term）

```
namespace_term
  organization_id   UUID          PK
  namespace_id      VARCHAR(20)
  prefix            VARCHAR(255)  PK
  localname         VARCHAR(255)  PK
  units             VARCHAR(20)   ← 単位
  xsi_type          VARCHAR(20)   ← 型
  is_active         BOOLEAN
  display_name      VARCHAR(255)  ← 表示名
  description       TEXT          ← 説明
```

### 2-3. 既存の用語取得API

- **エンドポイント**: `GET /api/v1/namespaces/terms`
- **既存関数**: `getTerms(options?)` → `NamespaceTermRow[]`
- **NamespaceTermRow 型**:
  ```ts
  { qname, prefix, localName, displayName, description, type, unitHint, isActive }
  ```
- **既存 SQL**: `findTermByKey.sql` — `(organization_id, prefix, localname)` で1件取得済み
  - バックエンドには `getTermByKey` 的なAPIエンドポイントが**まだ存在しない**

### 2-4. 機能A（用語連携）の対応状況

- フロントエンドには「キー入力時にDBを検索して他フィールドを補完する」ロジックは未実装
- `TemplateEditorDialog` で用語マップを持ち、追加ボタン押下時に補完する仕組みも未実装

### 2-5. 機能B（表示名表示）の対応状況

- `NestedPropertyEditor` のヘッダーにキーの表示名を横表示する仕組みは未実装

### 2-7. キー追加の流れ（現状）

1. `TemplateEditorDialog` の「プロパティ追加」モーダルでキー文字列を入力
2. 「追加」ボタン押下 → `handleAddProperty()` が実行され、空の `PropertyData` が生成される
3. `NestedPropertyEditor` に表示されるが、description / xsi:type / units は空

---

## 3. 実装方針

### 方針まとめ

```
機能A（用語連携）
  メインアプローチ: 全件取得+Mapキャッシュ方式
  → TemplateEditorDialog open 時に getAllTermsAsMap() を呼び出して termMap を保持
  → handleAddProperty() 押下時に termMap から一致用語を取得し
     description / xsi:type / units を自動補完して PropertyData を生成
  → NestedPropertyEditor へ termDisplayMap (qname→displayName) を Props で渡す

  補助アプローチ（キー入力リアルタイム補完）:
  → useTermLookup フックを NestedPropertyEditor に組み込み
  → キーフィールド変更時 (onBlur/onChange デバウンス) に type / units を補完

機能B（表示名表示）
  → NestedPropertyEditor のヘッダーに displayName を横表示
```

### 機能A の詳細設計

#### 追加ボタン押下時の自動補完フロー（メイン）

```
TemplateEditorDialog open
  → getAllTermsAsMap() を呼び出し termMap を state に保持

ユーザーがキー（prefix:localName）を入力
  → モーダル内に用語プレビュー（description / xsi:type / units）を表示

「追加」ボタン押下
  → termMap.get(newPropertyKey) で一致用語を取得
  → PropertyData の description / xsi:type / units を初期値としてセット
  → NestedPropertyEditor に termDisplayMap として qname→displayName のマップを渡す
```

#### キー入力時リアルタイム補完フロー（補助）

```
ユーザーが NestedPropertyEditor のキー（localname）を入力
  → onBlur または onChange（デバウンス 300ms）
  → useTermLookup フックが termMap または API から用語を検索
  → 一致した場合（フィールドが空の場合のみ）:
      属性追加 → type, units を自動補完
      要素追加 → description を自動補完
  → 不一致の場合: 何もしない（空のまま）
```

### 機能B の詳細設計

- `NestedPropertyEditor` Props に `termDisplayMap?: Map<string, string>` を追加
- ヘッダー部のキー表示ラベルを以下のように変更:
  - 表示名が取得できる場合: `{propertyKey}（{displayName}）`
  - 取得できない場合: `{propertyKey}`（従来通り）

---

## 4. 実装ステップ

### Phase 1: フロントエンド — API サービス追加

- [x] `frontend/src/services/namespaceApiService.ts`
  - `getAllTermsAsMap(): Promise<Map<string, NamespaceTermRow>>` 関数追加
    - 既存の `getTerms()` を流用し、`Map<qname, NamespaceTermRow>` を返す
    - qname は `${term.prefix}:${term.localName}` の形式

### Phase 2: フロントエンド — TemplateEditorDialog の用語マップ取得・自動補完

- [x] `frontend/src/components/editorv2/TemplateEditorDialog.tsx`
  - ダイアログ `open` 時に `getAllTermsAsMap()` を呼び出し、`termMap` state に保持
  - `newPropertyKey` 入力欄で `prefix:localName` 形式が入力されたとき、
    `termMap` に一致する用語があれば説明・型・単位のプレビューをモーダル内に表示
  - 「追加」ボタン（`handleAddProperty()`）押下時、一致用語があれば `PropertyData` の以下フィールドを自動セット:
    - `elements.description` ← `term.description`
    - `attributes['xsi:type']` ← `term.type`（= `xsi_type`）
    - `attributes['units']` ← `term.unitHint`（= `units`）
  - `NestedPropertyEditor` に `termDisplayMap` Props として渡す（型: `Map<string, string>`）

### Phase 4: フロントエンド — NestedPropertyEditor 修正

- [x] `frontend/src/components/editorv2/NestedPropertyEditor.tsx`
  - Props に `termDisplayMap?: Map<string, string>` を受け取り、キー横に `displayName` を表示
  - 表示形式: `{propertyKey}（{displayName}）` or `{propertyKey}`（取得できない場合）

### Phase 5: 型定義の更新

- [x] 型定義（`NestedPropertyEditor.tsx` 内に `TermDisplayInfo` 等を定義済み）
  - `editor.ts` への `termDisplayMap` 追加は不要と判断（コンポーネント内に定義済みで機能的に問題なし）

### Phase 6: 多言語化

- [ ] `frontend/src/locales/ja.json` — 用語プレビューラベルなど追加キーを追記
- [ ] `frontend/src/locales/en.json` — 同上

## 5. 影響範囲

### 変更するファイル
1. `frontend/src/services/namespaceApiService.ts` — `getAllTermsAsMap`, `getTermByKey` 関数追加
2. `frontend/src/types/editor.ts` — `NestedPropertyEditorProps` に `termDisplayMap` 追加
3. `frontend/src/components/editorv2/TemplateEditorDialog.tsx` — 用語マップ取得・自動補完・Props渡し
4. `frontend/src/components/editorv2/NestedPropertyEditor.tsx` — 表示名表示、リアルタイム補完
5. `frontend/src/locales/ja.json` — 多言語キー追加
6. `frontend/src/locales/en.json` — 多言語キー追加

### 新規作成するファイル
1. `frontend/src/hooks/useTermLookup.ts` — 用語検索フック

### 影響を受ける機能
- テンプレート機能の「属性追加」「要素追加」ダイアログ（追加のみ、既存動作に破壊的変更なし）
- `NestedPropertyEditor` を使用するすべての箇所（`termDisplayMap` は optional Props のため後方互換性あり）

---

## 6. 技術的詳細

### getAllTermsAsMap() の実装方針
```typescript
// namespaceApiService.ts に追加
export async function getAllTermsAsMap(): Promise<Map<string, NamespaceTermRow>> {
  const terms = await getTerms(); // 既存関数を流用
  const map = new Map<string, NamespaceTermRow>();
  for (const term of terms) {
    const qname = `${term.prefix}:${term.localName}`;
    map.set(qname, term);
  }
  return map;
}
```

### TemplateEditorDialog の自動補完（handleAddProperty 修正イメージ）
```typescript
// 追加時に用語マップを参照して初期値をセット
const matchedTerm = termMap.get(newPropertyKey.trim());
const initialPropertyData: PropertyData = {
  key: newPropertyKey.trim(),
  tagName: newPropertyTagName,
  attributes: {
    ...(matchedTerm?.type ? { 'xsi:type': matchedTerm.type } : {}),
    ...(matchedTerm?.unitHint ? { units: matchedTerm.unitHint } : {}),
  },
  elements: {
    ...(matchedTerm?.description ? { description: matchedTerm.description } : {}),
  },
  children: [],
};
```

### NestedPropertyEditor の表示名表示（ヘッダー修正イメージ）
```tsx
// 既存: {propertyData.tagName}: {propertyKey}
// 変更後:
<Text strong>
  {propertyData.tagName}: {propertyKey}
  {termDisplayMap?.get(propertyKey) && (
    <Text type="secondary" style={{ marginLeft: 8, fontWeight: 'normal' }}>
      （{termDisplayMap.get(propertyKey)}）
    </Text>
  )}
</Text>
```

### prefix の取得方法（リアルタイム補完）
`NestedPropertyEditor` の `AddAttributeDialog` では、`key` フィールドは `prefix:localname` 形式（qname）か localname 単体で入力される。
- ユーザーが `prefix:localname` 形式で入力した場合 → `:` で分割して prefix / localname を特定
- localname のみ入力の場合 → 組織の全用語から localname で検索（前方一致や完全一致）

### 自動補完の上書きルール
- 既にユーザーが手動入力している場合は上書きしない
- ダイアログ開いた直後 or フィールドが空の場合のみ自動補完

### エラーハンドリング
- API 404（用語未登録）→ 補完しない、エラー表示しない（サイレント）
- API 500 → `console.warn` のみ（エラートーストは出さない）

---

## 7. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| prefix が特定できない | 低 | 低 | `namespace_term` は必ず `prefix:localname` 形式で登録されるため、`:` なし入力では `termMap.get()` が自然に `undefined` を返し補完スキップとなる。リスクとして成立しない（対応不要） |
| getTerms() のレスポンスが大量になりパフォーマンス低下 | 低 | 低 | 組織内用語は通常数百件程度のため許容範囲 |
| qname の形式不一致（prefix:localName vs prefix_localName） | 中 | 中 | `NamespaceTermRow` の `qname` フィールドまたは `${prefix}:${localName}` で統一 |
| APIコール過多（文字入力ごと） | 低 | 高 | デバウンス 300ms を実装 |
| 自動補完がユーザー入力を上書き | 中 | 中 | フィールドが空の場合のみ補完する |
| NestedPropertyEditor が深いネストで呼ばれる際の Props 伝搬 | 低 | 低 | トップレベルの NestedPropertyEditor のみに渡す（子要素は今回スコープ外） |
| 既存テスト破壊 | 低 | 低 | NestedPropertyEditor の既存テストを確認・修正 |

---

## 8. テスト計画

### 手動テスト

#### 機能A（用語自動補完）
- [ ] 名前空間管理タブで用語（`prefix:localName`、description、xsi_type、units）を登録
- [ ] テンプレートエディタを開き、プロパティ追加モーダルで同じ qname を入力
  - → モーダル内に用語プレビュー（説明・型・単位）が表示されること
- [ ] 「追加」ボタン押下後、description / xsi:type / units が自動補完されていることを確認
- [ ] キーに未登録の localname を入力後 → 補完されない（そのまま）
- [ ] 属性追加ダイアログのキーに `ex:SampleTemperature`（登録済み用語）を入力後 → 型・単位が自動補完される
- [ ] 要素追加ダイアログで localname に登録済み用語を入力後 → 説明が自動補完される

#### 機能B（表示名表示）
- [ ] NestedPropertyEditor のキー横に表示名が表示されることを確認
- [ ] 未登録のキーでは表示名が表示されないことを確認

---

## 9. 関連ファイル

| ファイル | 概要 |
|---------|------|
| `frontend/src/components/editorv2/TemplateEditorDialog.tsx` | 追加ダイアログ（自動補完・Props渡し） |
| `frontend/src/components/editorv2/NestedPropertyEditor.tsx` | 主要修正対象（表示名・リアルタイム補完） |
| `frontend/src/hooks/useAttributeMasters.ts` | 参考：既存マスタ取得フックのパターン |
| `backend/src/sql/queries/namespace_terms/findTermByKey.sql` | 既存SQL（再利用） |
| `frontend/src/services/namespaceApiService.ts` | API関数追加先 |
| `frontend/src/types/editor.ts` | NestedPropertyEditorProps 型定義 |
| `docs/design/db/ddl/namespace_term.sql` | DBスキーマ定義 |

---

## 10. 承認記録

- **計画書提示日時**: 2026-08-06 08:17
- **承認日時**: （承認後に記入）
- **承認者コメント**: （承認後に記入）
