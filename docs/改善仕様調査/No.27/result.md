# 実装結果: 実験記録カスタムプロパティ追加（No.27）

## 作業期間
- 2026-04-01 〜 2026-04-03

---

## 実装概要

実験作業者画面の実験記録ダイアログ（`DataRecordDialog`）に、テンプレート定義外のカスタムプロパティを任意追加できる機能を実装した。

---

## 変更ファイル一覧

| ファイル | 変更種別 | 変更内容 |
|---------|---------|---------|
| `frontend/src/types/experimentWorker.ts` | 修正 | `CustomPropertyType` / `ContainerType` / `CustomPropertyValue` 型追加 |
| `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx` | 修正 | カスタムプロパティUI・保存・復元ロジック追加 |
| `backend/src/repositories/templateDataRepository.ts` | 修正 | `PropertySet` に `contents?: Content[]` フィールド追加 |
| `backend/src/utils/maimlDataWriter.ts` | 修正 | `ps.insertions` / `ps.contents` を XML 出力する処理追加 |

---

## 実装内容詳細

### 1. 型定義（`experimentWorker.ts`）

```typescript
// コンテナ種別
type ContainerType = 'property' | 'content' | 'insertion';

// カスタムプロパティ型
type CustomPropertyType =
  | 'stringType' | 'floatType' | 'intType' | 'booleanType'
  | 'dateType' | 'dateTimeType'
  | 'stringListType' | 'doubleListType' | 'intListType'
  | 'insertion';

// カスタムプロパティ値（State管理用）
interface CustomPropertyValue {
  id: string;
  key: string;
  containerType: ContainerType;
  customType: CustomPropertyType;
  value: string | null;
  uri?: string;       // insertion: S3アップロード後のURIを保持
  hash?: string;
  format?: string;
  units?: string;
  file?: File;        // insertion: アップロード前のFileオブジェクト
  isCustomProperty: true;
}
```

### 2. フロントエンド（`DataRecordDialog.tsx`）

#### 追加した State
- `customProperties: Record<string, CustomPropertyValue[]>` — templateId をキーに各テンプレートのカスタムプロパティ一覧を管理

#### カスタムプロパティUI
テンプレートプロパティフォームの下に「カスタムプロパティ」セクションを追加。  
3種のボタン（`property 追加` / `content 追加` / `insertion 追加`）でそれぞれのコンテナ種の入力行を追加できる。

| コンテナ種 | 入力UI |
|-----------|--------|
| property | キー名・型セレクト（6種）・値（型に応じた入力）・単位 |
| content | キー名・型セレクト（3種）・値TextArea（スペース/カンマ区切り）・単位 |
| insertion | ファイル選択ボタン（SHA256ハッシュ自動計算・MIMEタイプ検出） |

#### 保存処理
`handleSaveTemplate` 内で `customProperties` を `containerType` ごとに仕分けして `baseData` に追記：
- `property` → `baseData.properties` 配列末尾に追加（`isCustomProperty: true` フラグ付与）
- `content` → `baseData.contents` 配列に追加（`isCustomProperty: true` フラグ付与）
- `insertion` → `baseData.insertions` 配列に追加（`isCustomProperty: true` フラグ付与）
  - 保存前に `baseData.insertions = []` でリセット後に再構築（増殖防止・削除反映）
  - ファイル未アップロードの場合は自動で S3 アップロードしてから URI をセット

#### 復元処理（ダイアログ再オープン時）
`getTemplateData` レスポンスから `isCustomProperty: true` なエントリを抽出し `customProperties` state に復元：
- `rawData.properties` → `containerType: 'property'` として復元
- `rawData.insertions` → `containerType: 'insertion'` として復元、`uri.split('/').pop()` でファイル名のみ表示用に格納
- `rawData.contents` → `containerType: 'content'` として復元、配列値はスペース区切り文字列に変換

### 3. バックエンド（`maimlDataWriter.ts`）

`buildDataXML()` に以下の出力処理を追加：

#### `ps.insertions` → `<insertion>` タグ
```xml
<insertion>
  <uri>s3://...</uri>
  <hash>abc123...</hash>
  <format>image/png</format>
</insertion>
```

#### `ps.contents` → `<content>` タグ
```xml
<content key="myData" xsi:type="doubleListType" units="m">
  <value>1.0</value>
  <value>2.5</value>
  <value>3.0</value>
</content>
```
スペース/カンマ区切り文字列または配列を `<value>` タグに展開。

---

## 動作確認中に発見・修正した不具合

| No. | 不具合内容 | 修正内容 |
|----|-----------|---------|
| 1 | insertion削除後も保存するとPropertySetに残る | 保存前に `baseData.insertions = []` でリセットしてから再構築するよう変更 |
| 2 | insertion保存後に再オープンするとボタンにURIが表示される | 復元時に `uri.split('/').pop()` でファイル名部分のみを `value` にセット |
| 3 | insertionが保存のたびに増殖する | 不具合1と同根。insertionsのリセット処理で解消 |
| 4 | contentのTypeプルダウンが見切れる | Selectのwidthを200pxに拡大、`popupMatchSelectWidth={false}` を設定、ラベルを型名のみに変更 |
| 5 | property / content のカスタムエントリ削除後も保存すると残り続ける | 保存前に `isCustomProperty: true` エントリを除去してリセットし、画面に残っているもののみ push するよう変更（insertion と同じ方式に統一） |

---

## 追加実装（2026-04-03）

### カスタムプロパティ Key 重複チェック（`DataRecordDialog.tsx`）

#### 概要
テンプレート内のカスタムプロパティに**同一 Key が重複して入力された場合**、または**テンプレート固定プロパティの Key と衝突した場合**に保存をブロックし、ユーザーへエラーを表示する機能を追加。

#### 実装内容

**`duplicateCustomKeys` useMemo の追加**
- 選択中テンプレートのカスタムプロパティ一覧（`property` / `content`）から Key を収集
- カスタム同士で同一 Key が 2 件以上存在する場合を重複と判定
- テンプレート固定プロパティ（`selectedTemplate.properties`）の Key と一致するカスタム Key も重複と判定
- `insertion` コンテナ（Key 属性なし）と空文字 Key はチェック対象外

**UI 表示（`renderCustomPropertyRows`）**
- 重複 Key の Input フィールドを赤ボーダー＋赤 shadow でハイライト（`status="error"`）
- 入力欄の直下に「**Keyが重複しています**」の赤テキストを表示
- 入力変更のたびにリアルタイム反映

**保存ブロック（`handleSaveTemplate` 冒頭）**
- `duplicateCustomKeys.size > 0` の場合は `message.error` を表示して即 return
- 重複が解消されれば通常保存可能

#### property / content 削除反映（不具合 No.5 対応）

`handleSaveTemplate` 内のフォールバック形式処理（`baseData.properties` が配列の場合）において、`property` / `content` も `insertion` と同様にリセット→再構築方式へ変更：

```
変更前:
  existingIdx >= 0 なら上書き、なければ push
  → 削除したカスタムエントリが次回保存後も残り続ける

変更後:
  1. baseData.properties から isCustomProperty: true を filter で除去
  2. baseData.contents = [] にリセット
  3. baseData.insertions = [] にリセット
  4. 画面に残っている customProperties リストのみ push
  → 削除・追加・編集がすべて正確に反映される
```

---

## 残課題（別タスクで対応予定）

| No. | 内容 |
|----|------|
| （解消済み） | ~~カスタムプロパティのKeyがテンプレート既存プロパティのKeyと重複できてしまう~~ → 2026-04-03 Key重複チェックを実装 |

---

## 備考

- `useCustomProperties.ts` フック切り出しは実施しない（現行コードの実装スタイルに合わせ `DataRecordDialog.tsx` 内に直接実装）
- contentData（2次元配列）および propertyListType（ネスト構造）はスコープ外
