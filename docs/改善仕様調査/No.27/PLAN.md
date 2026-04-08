# タスク計画書: 実験記録カスタムプロパティ追加

## メタデータ
- **作成日時**: 2026-04-01 16:23
- **更新日時**: 2026-04-02 13:57
- **タスクID**: experiment-record-custom-property
- **優先度**: 高
- **推定工数**: 4〜6時間

## タスク概要

実験作業者画面の実験記録ダイアログ（DataRecordDialog）に、カスタムプロパティの登録機能を追加する。
reference版（`frontend/src/reference/components/ExperimentRecorder/`）に同様の機能があるため、それを参考に現行のNext.js版へ移植する。

---

## 調査結果サマリー

### reference版の機能概要

`MobileDataInput.js` + `useCustomProperties.js` に実装済み。

#### カスタムプロパティ追加ダイアログ（`showAddPropertyDialog`）

入力フィールド:
1. **プロパティキー** (`newPropertyKey`) — テキスト入力
2. **データコンテナ種** (`newPropertyContainerType`) — セレクト
   - `property`（単一値）
   - `content`（複数値・配列）
   - `insertion`（ファイル添付）
3. **データ型** (`newPropertyType`) — コンテナ種に応じて動的変化
   - property: `stringType` / `doubleType` / `intType` / `booleanType` / `dateTimeType`
   - content: `contentType`（1次元） / `contentData`（2次元）
   - insertion: 非表示（自動設定）
4. **値** (`newPropertyValue`) — テキストエリア（insertion時は非表示）

#### 保存時のデータ構造（`useCustomProperties.js: handleConfirmAddProperty`）

- **通常プロパティ**: `{ value, customType, containerType, isCustomProperty: true, timestamp }`
- **insertion**: `{ value: null, customType: 'insertion', containerType, isCustomProperty: true, timestamp }`
- **contentData**: `{ type: 'propertyList', xsiType: 'propertyListType', properties: { [key+'Data']: {...isDataGrid:true...} }, isCustomProperty: true }`

#### 追加後の表示（`renderPropertyInputs`）

- `isCustomProperty === true` のプロパティをformDataから抽出し、テンプレートプロパティの後ろに追加表示
- 「カスタムプロパティ」バッジを付与

---

### UIモックの調査結果

`docs/改善仕様調査/No.27/ui-mock-input.html` と `ui-mock-combined.html` の2ファイルを確認済み。

**採用: コンテナ種別ボタン方式**

カスタムプロパティ追加エリアの末尾に、コンテナ種ごとの追加ボタンを3つ並べる。
ボタンを押すと、そのコンテナ種に応じた入力フォームが行として追加される。

```
追加済みカスタムプロパティ一覧:
[ キー名 ] [ property / stringType ] [ 値 ] [ 単位 ] [✕]
[ キー名 ] [ content  / floatType  ] [ 値の配列 ] [ 単位 ] [✕]
[ キー名 ] [ insertion             ] [ ファイル名 ] [ - ] [✕]

＋ property追加   ＋ content追加   ＋ insertion追加
```

**コンテナ種ごとの入力UI:**

### property（単一値）
| 型 | 値の入力UI | 単位 |
|----|-----------|------|
| stringType（文字列） | TextArea（1行） | 入力可 |
| intType（整数） | InputNumber（precision=0） | 入力可 |
| floatType（小数） | InputNumber（precision=3） | 入力可 |
| booleanType（真偽値） | Select（true/false） | なし（disabled） |
| dateType（日付） | DatePicker（YYYY-MM-DD） | なし（disabled） |
| dateTimeType（日時） | DatePicker+showTime | なし（disabled） |

### content（1次元配列）
- キー名入力
- 型選択: stringType / floatType / intType（全型対応）
- 値入力: TextArea（スペース区切りまたはカンマ区切りで複数値入力）
- 単位入力可

### insertion（ファイル添付）
- キー名入力
- ファイル選択ボタン（Upload コンポーネント）
- 選択したファイル名を表示
- 保存時に S3 アップロード → S3 パスを value に保存

---

### Phase 1 調査結果（完了）

#### 対象ファイル
- `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx`（1435行）

#### フォームデータ管理
- `Form`（Ant Design）: `form.setFieldsValue()` / `form.validateFields()` によるフィールド管理
- `useState<Record<string, ExperimentDataValue>>({})`: `formData` — 現在はほとんど未使用（setFormDataは初期化のみ）
- `useState<Record<string, number[][]>>({})`: `dataGrids` — contentDoubleListType の2次元配列データ

#### 保存処理（handleSaveTemplate）の構造
1. `form.validateFields()` でフォーム値取得
2. `fetchedTemplateItems` から `originalItem` を取得（placeId・data構造の保持）
3. `baseData = JSON.parse(JSON.stringify(originalItem.data))` でベースデータコピー
4. `baseData.properties` が配列なら各 `p.value` をフォーム値で上書き
5. フラット形式なら `baseData[prop.key]` をフォーム値で上書き
6. `saveBatchExperimentData(projectName, methodId, taskNo, { records: [record] })` 送信

#### カスタムプロパティの保存先
- `baseData.properties` 形式の場合: 配列末尾にカスタムプロパティオブジェクトを追記
- フラット形式の場合: `baseData[customPropKey]` に値を追加

#### 型定義の場所
- `frontend/src/types/experimentWorker.ts`: `Property`, `Template`, `ExperimentDataValue`, `PropertyType` 等

#### 現行の `PropertyType` に不足している型
- `doubleType`（reference版では使用）→ `floatType` に相当するため既存の `floatType` を使用
- カスタムプロパティ専用の型は追加不要（既存型を流用）

#### フックの切り出しについて
- 現行コードはすべてコンポーネント内に実装（フック切り出しなし）
- 今回の実装も **DataRecordDialog.tsx 内に直接実装**（シンプルさ・一貫性を優先）
- `useCustomProperties.ts` は **作成しない**

---

## 変更ファイル（確定）

### 新規作成
なし（フック切り出しは行わない）

### 修正
1. `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx`
   - カスタムプロパティ用 state 追加（`customProperties: CustomPropertyValue[]`）
   - フォーム末尾にカスタムプロパティ表示セクション追加（コンテナ種別ボタン＋インライン行入力）
   - `handleSaveTemplate` にカスタムプロパティのマージ処理追加
   - ダイアログ open 時に `customProperties` をリセット
   - 読み込み時のカスタムプロパティ復元処理追加
2. `frontend/src/types/experimentWorker.ts`
   - `CustomPropertyValue` インターフェース追加
   - `CustomPropertyType` 型追加
   - `ContainerType` 型追加

---

## 実装ステップ（更新版）

### Phase 1: 対象ファイル特定・構造確認 ✅ 完了

- [x] `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx` を特定
- [x] 現行のフォームデータ管理を確認（Form + useState）
- [x] 現行の保存処理（handleSaveTemplate）の引数形式を確認
- [x] 型定義ファイル（experimentWorker.ts）を確認

### Phase 2: 型定義追加

- [x] `frontend/src/types/experimentWorker.ts` に以下を追加
  - `CustomPropertyType` = `'stringType' | 'floatType' | 'intType' | 'booleanType' | 'dateTimeType' | 'dateType' | 'insertion'`
  - `ContainerType` = `'property' | 'content' | 'insertion'`
  - `CustomPropertyValue` インターフェース

### Phase 3: カスタムプロパティ state 追加

DataRecordDialog.tsx に以下の state を追加:
- [x] `customProperties: CustomPropertyValue[]` — 追加済みカスタムプロパティ一覧（インライン行管理）
- [x] ダイアログ open 時に `customProperties` を空配列でリセット

### Phase 4: カスタムプロパティ表示セクション追加

- [x] 右コンテンツのフォーム末尾（`selectedTemplate.properties.map` の後）に以下を追加:
  - 「カスタムプロパティ（任意追加）」ラベル
  - 追加済みカスタムプロパティの一覧行
    - property: キー・型セレクト・値入力（型に応じた入力UI）・単位・削除ボタン
    - content: キー・型セレクト（float/int）・値TextArea（スペース/カンマ区切り）・単位・削除ボタン
    - insertion: キー・Uploadコンポーネント（ファイル選択+ファイル名表示）・削除ボタン
  - 末尾に3つのボタンを横並び:
    - `＋ property追加` ボタン → property行を1行追加
    - `＋ content追加` ボタン → content行を1行追加
    - `＋ insertion追加` ボタン → insertion行を1行追加

### Phase 5: 各コンテナ種の行入力UI実装

- [x] `customProperties` 配列を `map` でレンダリング（各要素の `containerType` で分岐）
- [x] **property行**: キー・型セレクト・値入力（型切替）・単位・削除
- [x] **content行**: キー・型セレクト・値TextArea・単位・削除
- [x] **insertion行**: キー・Upload（SHA256ハッシュ生成・MIMEタイプ検出）・削除

### Phase 6: 保存処理への統合

- [x] `handleSaveTemplate` 内で `customProperties` を `baseData.properties` に追記
  - `baseData.properties` が配列形式: 末尾にカスタムプロパティを追記
  - フラット形式: `baseData[p.key]` に値を追加
- [x] `isCustomProperty: true` フラグを付与
- [x] insertion は `{ uri, hash, format }` オブジェクト形式で保存（MAIML仕様準拠）

### Phase 7: 読み込み時の表示復元

- [x] `getTemplateData` レスポンスから `isCustomProperty: true` なプロパティを抽出
- [x] `customProperties` state に復元（templateId ごとに分類）
- [x] フォームには反映しない（カスタムプロパティは専用セクションで管理）

---

## 技術的詳細

### カスタムプロパティのデータ構造

```typescript
// フォームデータ内のカスタムプロパティ（state管理用）
interface CustomPropertyValue {
  key: string;
  customType: CustomPropertyType;
  containerType: ContainerType;
  value: string | null;          // insertion 時は null
  isCustomProperty: true;
  timestamp: string;             // ISO 8601形式（追加順の識別子として使用）
}
```

### 保存時の baseData への追記形式

```typescript
// baseData.properties 配列形式の場合に追記する要素
{
  key: 'myCustomProp',
  xsiType: 'stringType',
  value: '入力値',
  units: null,
  isCustomProperty: true,       // ← カスタムプロパティを識別するフラグ
}
```

### scope

**スコープ内（今回実装）:**
- `property` コンテナ: stringType / floatType / intType / booleanType / dateType / dateTimeType
- `content` コンテナ: 1次元配列（stringType / floatType / intType）、スペース/カンマ区切りテキスト入力
- `insertion` コンテナ: ファイル選択 → 保存時に S3 アップロード → S3 パスを `value` に保存

**スコープ外:**
- contentData（2次元配列）— 除外
- propertyListType（ネスト構造）— 除外

---

## リスク

| リスク | 影響度 | 対策 |
|--------|--------|------|
| フラット形式のbaseDataへのカスタムプロパティ追記で構造崩れ | 中 | フラット形式時は `baseData[p.key] = p.value` の形式で追加し、isCustomPropertyはトップレベルに置かない |
| 既存データ読み込み時の`isCustomProperty`フラグ欠損 | 低 | フォールバック処理を追加（フラグなしの場合は通常プロパティとして扱う） |
| プロパティキーの重複 | 低 | 追加時に既存キーとの重複チェックを実施 |

---

## 承認記録

- **計画書初版提示日時**: 2026-04-01 16:23
- **計画書更新日時**: 2026-04-02 17:00
- **承認日時**: （承認後記入）

---

## 実装進捗（2026-04-02 作業分）

### 完了済み ✅

#### 型定義の修正（`frontend/src/types/experimentWorker.ts`）
- `CustomPropertyType` の content 関連を MAIML 仕様に合わせ変更
  - 旧: `'contentDoubleListType' | 'contentListType'`
  - 新: `'contentStringListType' | 'contentDoubleListType' | 'contentIntListType'`

#### フロントエンド修正（`frontend/src/components/ExperimentWorker/DataRecordDialog.tsx`）
1. **content 型選択肢を3択に変更**（旧: contentDoubleListType / contentListType）
   - `contentStringListType（文字列）`
   - `contentDoubleListType（小数）`
   - `contentIntListType（整数）`
2. **保存ロジック（properties配列形式）の content 型判定を修正**
   - `floatType` → `contentDoubleListType`
   - `intType` → `contentIntListType`
3. **保存ロジック（フラット形式）の content 型判定を修正**（同上）
4. **復元ロジックの contentType 判定を修正**
   - `contentListType` → 3種の contentXxxListType から有効なもを選択

#### バックエンド修正（`backend/src/repositories/templateDataRepository.ts`）
- `PropertySet` インターフェースに `contents?: Content[]` フィールドを追加
  - `Content` 型は `maiml-unified.ts` の既存インターフェースを使用

---

### 未着手・残作業 🔲（明日の継続分）

#### A. `maimlDataWriter.ts` の修正
`buildDataXML()` 内の property 出力ループで、`ps.contents` 配列を `<content>` タグとして出力する処理を追加する。

**追加場所**: `ps.properties` ループの直後（`dataXml += \`      </${category}>\n\`;` の前）

```typescript
// ps.contents を <content> タグとして出力
if (ps.contents && Array.isArray(ps.contents)) {
  for (const c of ps.contents) {
    if (!c || !c.key) continue;
    const contentType = c.xsiType || 'contentDoubleListType';
    dataXml += `        <content key="${escapeXml(c.key)}"`;
    if (c.units) dataXml += ` units="${escapeXml(c.units)}"`;
    dataXml += ` xsi:type="${escapeXml(contentType)}">\n`;
    if (c.description) {
      dataXml += `          <description>${escapeXml(c.description)}</description>\n`;
    }
    // value はスペース区切り文字列または配列
    const rawVal = c.value;
    const items: string[] = Array.isArray(rawVal)
      ? (rawVal as unknown[]).map((v) => String(v))
      : typeof rawVal === 'string' && rawVal.trim().length > 0
      ? rawVal.trim().split(/[\s,]+/).filter((s) => s.length > 0)
      : [];
    for (const item of items) {
      dataXml += `          <value>${escapeXml(item)}</value>\n`;
    }
    dataXml += `        </content>\n`;
  }
}
```

**また、`maimlDataWriter.ts` に現在残っている誤った実装を除去する**:
- `maimlDataWriter.ts` の 164行目付近に `prop.containerType` 参照が残っており TSビルドエラーになっているため、この行を削除して `ps.contents` 方式に一本化する。

#### B. フロントエンド保存処理の修正（`DataRecordDialog.tsx`）
`handleSaveTemplate` 内で `customProperties` を `containerType` に応じて仕分け：
- `containerType === 'content'` → `baseData.properties` の代わりに `baseData.contents` 配列に追記
  - `Content` オブジェクト形式: `{ key, xsiType: customType, value: rawString, units, isCustomProperty: true }`
- `containerType === 'property'` / `'insertion'` → 既存通り `baseData.properties` に追記

#### C. フロントエンド復元処理の修正（`DataRecordDialog.tsx`）
`getTemplateData` レスポンス復元時に `rawData.contents` 配列からカスタムプロパティを復元する処理を追加：
- `isCustomProperty: true` なエントリを `customProperties` state に復元
- `containerType: 'content'` として復元
- `value` は配列なのでスペース区切り文字列に変換

---

### 現在のビルドエラー ⚠️

`backend/src/utils/maimlDataWriter.ts` の 164行目付近に以下のエラーが残っている：
```
プロパティ 'containerType' は型 'Property' に存在しません。
```
**原因**: 途中まで実装した `containerType` 判定コードが残っており、`Property` 型には `containerType` フィールドがないため。
**対処**: 上記 A の修正で `ps.contents` ループ方式に変更し、`containerType` 参照を削除する。
