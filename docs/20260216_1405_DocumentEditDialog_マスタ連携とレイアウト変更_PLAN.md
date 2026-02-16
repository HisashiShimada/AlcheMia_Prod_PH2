# タスク計画書: DocumentEditDialog マスタ連携とレイアウト変更

## メタデータ
- **作成日時**: 2026-02-16 14:05
- **タスクID**: DocumentEditDialog_マスタ連携とレイアウト変更
- **優先度**: 中
- **推定工数**: 2時間

## 1. タスク概要

`frontend/src/components/editorv2/components/DocumentEditDialog.tsx`のレイアウトを変更し、バックアップファイル（`DocumentEditDialog.tsx.bak`）で実装されていたマスタテーブル連携機能を移植する。

creator、vendor、instrumentに関してはマスタテーブルから取得し、id、uuid、description、annotationを自動的に設定できるようにする。

## 2. 目的と期待される成果

### 目的
- マスタテーブルからのデータ取得機能を復活させる
- MultiObjectEditorにマスタデータを渡して選択可能にする
- レイアウトをCollapse items配列形式に統一する

### 期待される成果
- [x] 現状ファイルの確認
- [x] バックアップファイルの確認
- [x] タスク計画書の作成
- [x] 計画書の修正（MultiObjectEditor側のマスタ活用機能を含む）
- [ ] ユーザー承認取得
- [ ] DocumentEditDialog側のマスタテーブル連携機能の実装
- [ ] MultiObjectEditor側のマスタ活用機能の実装
- [ ] レイアウトの統一
- [ ] テスト・動作確認
- [ ] 完了報告

## 3. 実装ステップ

### Phase 1: インポート文の修正
- [ ] 既存の`fetchMasters`をそのまま使用（変更不要）
- [ ] `CreatorRecord`, `VendorRecord`, `InstrumentRecord`型のインポート追加

### Phase 2: マスタデータ変換関数の実装
- [ ] `CreatorRecord` → `DocumentTagData`変換関数の実装
- [ ] `VendorRecord` → `DocumentTagData`変換関数の実装
- [ ] `InstrumentRecord` → `DocumentTagData`変換関数の実装
- [ ] 変換ロジック: `creatorId` → `id`, `creatorName` → `name`, `creatorDescription` → `description`, `creatorAnnotation` → `annotation`

### Phase 3: マスタデータ取得処理の実装
- [ ] `useEffect`内のマスタデータ取得処理のコメントアウトを解除
- [ ] `fetchMasters('creator')`でCreatorマスタ取得
- [ ] `fetchMasters('vendor')`でVendorマスタ取得
- [ ] `fetchMasters('instrument')`でInstrumentマスタ取得
- [ ] 取得したデータをDocumentTagData形式に変換
- [ ] エラーハンドリングの実装

### Phase 4: MultiObjectEditorへのマスタデータ渡し
- [ ] `masterData`プロップスに変換済みマスタデータを渡す
- [ ] `isLoadingMasterData`プロップスを追加
- [ ] creators, vendors, owners, instrumentsそれぞれに適用

### Phase 5: レイアウトの統一
- [ ] Collapse + Panel形式からCollapse items配列形式に変更
- [ ] 基本プロパティセクションの変換
- [ ] MaiML ID属性セクションの変換
- [ ] XML署名セクションの変換

### Phase 6: 型定義の調整
- [ ] `MasterDataItem`型が必要な箇所を確認
- [ ] 型エラーがないか確認

### Phase 7: MultiObjectEditor側のマスタ活用機能の実装
- [ ] マスタデータ選択UI（Select + 追加ボタン）の追加
- [ ] `handleAddFromMaster`関数の実装
- [ ] `fromMaster`フラグのサポート追加
- [ ] マスタから追加された項目の編集制御（disabled）
- [ ] マスタから追加された項目のAlert表示
- [ ] 「空の{title}を追加」ボタンの追加
- [ ] DocumentTagData型に`fromMaster?: boolean`フィールド追加

## 4. 影響範囲

### 変更するファイル
1. `frontend/src/components/editorv2/components/DocumentEditDialog.tsx` - マスタ連携とレイアウト変更
2. `frontend/src/components/editorv2/components/MultiObjectEditor.tsx` - マスタ活用機能の追加

### 依存関係の確認
- `@/services/masterApiService` - マスタデータ取得API（`fetchMasters`関数）
- `MultiObjectEditor` - マスタデータを受け取るコンポーネント
- `@/types/maiml-unified` - DocumentTagData型の定義元

### 影響を受ける機能
- Document編集ダイアログでのCreator/Vendor/Owner/Instrument選択機能
- マスタデータからの自動入力機能

## 5. 技術的詳細

### bakファイルとの主な違い

#### インポート文
**修正方針:**
- `fetchMasters`はそのまま使用
- `CreatorRecord`, `VendorRecord`, `InstrumentRecord`型をインポート
- `@/utils/apiClient`は使用しない（Mock段階の仮ファイル）

```typescript
import { fetchMasters, type CreatorRecord, type VendorRecord, type InstrumentRecord } from '@/services/masterApiService';
```

#### マスタデータ取得と変換
**実装方針:**
1. `fetchMasters`で各マスタタイプを取得
2. 取得したデータをDocumentTagData形式に変換
3. MultiObjectEditorに渡す

**変換ロジック:**
```typescript
// Creator変換
const convertCreatorToDocumentTag = (creator: CreatorRecord): DocumentTagData => ({
  tagName: 'Creator',
  id: creator.creatorId,
  uuid: '', // マスタにはUUIDがないため空文字
  name: creator.creatorName,
  description: creator.creatorDescription,
  annotation: creator.creatorAnnotation,
});

// Vendor変換
const convertVendorToDocumentTag = (vendor: VendorRecord): DocumentTagData => ({
  tagName: 'Vendor',
  id: vendor.vendorId,
  uuid: '',
  name: vendor.vendorName,
  description: vendor.vendorDescription,
  annotation: vendor.vendorAnnotation,
});

// Instrument変換
const convertInstrumentToDocumentTag = (instrument: InstrumentRecord): DocumentTagData => ({
  tagName: 'Instrument',
  id: instrument.instrumentId,
  uuid: '',
  name: instrument.instrumentName,
  description: instrument.instrumentDescription,
  annotation: instrument.instrumentAnnotation,
});

// データ取得と変換
const [creatorsData, vendorsData, instrumentsData] = await Promise.all([
  fetchMasters('creator'),
  fetchMasters('vendor'),
  fetchMasters('instrument'),
]);

setCreators(creatorsData.map(convertCreatorToDocumentTag));
setVendors(vendorsData.map(convertVendorToDocumentTag));
setInstruments(instrumentsData.map(convertInstrumentToDocumentTag));
```

#### MultiObjectEditorへのプロップス渡し
**修正後:**
```typescript
<MultiObjectEditor
  objectKey="creators"
  masterData={creators}  // 変換済みDocumentTagData[]
  // isLoadingMasterDataプロップスは不要（MultiObjectEditorのPropsに存在しない）
  // ... その他のプロップス
/>
```

**注意:** MultiObjectEditorの型定義を確認したところ、`isLoadingMasterData`プロップスは存在しないため、追加不要です。

#### レイアウト形式
**bakファイル:** Collapse items配列形式
```typescript
<Collapse
  activeKey={expandedSections}
  onChange={handleToggleSection}
  items={[
    {
      key: 'basic',
      label: <Text strong>📄 基本プロパティ</Text>,
      children: (/* コンテンツ */)
    }
  ]}
/>
```

**現在のファイル:** Collapse + Panel形式
```typescript
<Collapse activeKey={...} onChange={...}>
  <Panel header={...} key="basic">
    {/* コンテンツ */}
  </Panel>
</Collapse>
```

## 6. リスク と対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| マスタデータの変換ロジックが正しくない | 中 | 低 | CreatorRecord等の型定義を確認済み |
| ownerマスタが存在しない可能性 | 中 | 中 | owner用の取得処理は保留し、空配列で対応 |
| マスタデータAPIのレスポンス形式が異なる | 中 | 低 | APIレスポンスの構造は確認済み |
| レイアウト変更による表示崩れ | 低 | 低 | 変更後に動作確認 |

## 7. テスト計画

### 確認項目
- [ ] マスタデータが正常に取得できること
- [ ] MultiObjectEditorにマスタデータが表示されること
- [ ] マスタデータをSelectで選択できること
- [ ] 「追加」ボタンでマスタデータがオブジェクトリストに追加されること
- [ ] マスタから追加された項目にfromMasterフラグが設定されること
- [ ] マスタから追加された項目は編集不可（disabled）になること
- [ ] マスタから追加された項目にAlert（情報表示）が表示されること
- [ ] 「空の{title}を追加」ボタンで手動入力用の空オブジェクトが追加されること
- [ ] 手動追加された項目は編集可能であること
- [ ] レイアウトが正常に表示されること
- [ ] セクションの展開/折りたたみが正常に動作すること

### テストシナリオ

#### シナリオ1: マスタデータから追加
1. DocumentEditDialogを開く
2. マスタデータの取得を確認（コンソールログ）
3. Creatorセクションを開く
4. 「マスタデータからCreatorを追加」のSelectでマスタを選択
5. 「追加」ボタンをクリック
6. 選択したマスタのid、name、description、annotationが自動設定されることを確認
7. Alert「📌 マスタデータから追加された項目」が表示されることを確認
8. 入力フィールドが全てdisabled（編集不可）になることを確認

#### シナリオ2: 手動で空オブジェクトを追加
1. Creatorセクションで「空のCreatorを追加」ボタンをクリック
2. 空のCreatorオブジェクトが追加されることを確認
3. 入力フィールドが編集可能であることを確認
4. id、name、description、annotationを手動入力
5. UUID生成ボタンでUUIDを生成できることを確認

#### シナリオ3: Vendor/Instrumentでも同様の動作確認
1. Vendor、Instrumentセクションで同様にマスタから追加を確認
2. Ownerセクションは空配列（マスタデータなし）で正常動作することを確認

#### シナリオ4: Document保存
1. マスタから追加された項目と手動追加された項目を混在させる
2. Document保存ボタンをクリック
3. 正しいデータ構造で保存されることを確認（fromMasterフラグも含めて）

## 8. ロールバック計画

現在のファイルをバックアップとして保持。問題が発生した場合は、現在の実装に戻す。

```bash
cp frontend/src/components/editorv2/components/DocumentEditDialog.tsx \
   frontend/src/components/editorv2/components/DocumentEditDialog.tsx.before-master-integration
```

## 9. 関連ドキュメント

- `frontend/src/services/masterApiService.ts` - マスタAPI関数の実装（fetchMasters）
- `frontend/src/types/masterDataTypes.ts` - MasterDataType型定義
- `frontend/src/components/editorv2/components/MultiObjectEditor.tsx` - マスタデータを受け取るコンポーネント
- `frontend/src/components/editor/MultiObjectEditor.tsx.bak` - マスタ活用機能の参考実装
- `frontend/src/components/editor/DocumentEditDialog.tsx.bak` - マスタ連携の参考実装
- `frontend/src/types/maiml-unified.ts` - DocumentTagData型定義
- `.clinerules/development/frontend.md` - フロントエンド開発規約

## 10. 実装の詳細

### マスタデータの型定義（masterApiService.ts）
```typescript
// CreatorRecord
export interface CreatorRecord extends BaseMasterRecord {
  creatorId: string;
  creatorName: string;
  creatorDescription: string;
  creatorAnnotation: string;
  // ... その他フィールド
}

// VendorRecord
export interface VendorRecord extends BaseMasterRecord {
  vendorId: string;
  vendorName: string;
  vendorDescription: string;
  vendorAnnotation: string;
}

// InstrumentRecord
export interface InstrumentRecord extends BaseMasterRecord {
  instrumentId: string;
  instrumentName: string;
  instrumentDescription: string;
  instrumentAnnotation: string;
}
```

### DocumentTagData型（変換先の型）
```typescript
export interface DocumentTagData {
  tagName: string;
  id: string;
  uuid?: string;
  name?: string;
  description?: string;
  annotation?: string;
  // ... その他オプショナルフィールド
}
```

### API関数のシグネチャ
```typescript
// masterApiService.ts
export async function fetchMasters(type: MasterDataType): Promise<MasterRecord[]>;
// MasterRecord = CreatorRecord | InstrumentRecord | VendorRecord
```

### MultiObjectEditor側のマスタ活用機能（Phase 7詳細）

#### 1. マスタデータ選択UI
MultiObjectEditorのメインコンポーネント内、オブジェクト一覧の前に配置：

```typescript
{masterData.length > 0 && (
  <Space direction="vertical" size="small" style={{ width: '100%' }}>
    <Typography.Text type="secondary">
      マスタデータから{title}を追加:
    </Typography.Text>
    <Space.Compact style={{ width: '100%' }}>
      <Select
        style={{ flex: 1 }}
        placeholder={`${title}を選択してください`}
        value={selectedMasterId}
        onChange={setSelectedMasterId}
        options={masterData.map(item => ({
          label: `${item.name}${item.description ? ` (${item.description})` : ''}`,
          value: item.id,
        }))}
        allowClear
      />
      <Button
        type="primary"
        icon={<PlusOutlined />}
        onClick={handleAddFromMaster}
        disabled={!selectedMasterId}
      >
        追加
      </Button>
    </Space.Compact>
  </Space>
)}
```

#### 2. マスタから追加する処理
```typescript
const [selectedMasterId, setSelectedMasterId] = useState<string | undefined>(undefined);

const handleAddFromMaster = useCallback(() => {
  if (!selectedMasterId) return;
  
  const masterItem = masterData.find(m => m.id === selectedMasterId);
  if (!masterItem) return;
  
  const newObject: DocumentTagData = {
    tagName: objectKey === 'creators' ? 'Creator' : objectKey === 'vendors' ? 'Vendor' : objectKey === 'instruments' ? 'Instrument' : 'Owner',
    id: masterItem.id,
    uuid: '', // マスタにはUUIDがないため空文字
    name: masterItem.name,
    description: masterItem.description || '',
    annotation: masterItem.annotation || '',
    fromMaster: true  // マスタから追加されたことをマーク
  };
  
  const newObjects = [...objects, newObject];
  setObjects(newObjects);
  onDataChange(objectKey, newObjects);
  
  // 新しいアイテムを展開
  setExpandedItems(prev => ({
    ...prev,
    [objects.length]: true
  }));
  
  // 選択をリセット
  setSelectedMasterId(undefined);
}, [selectedMasterId, masterData, objects, objectKey, onDataChange]);
```

#### 3. マスタから追加された項目の表示（SingleObjectEditor）
```typescript
{internalData.fromMaster && (
  <Alert
    message="📌 マスタデータから追加された項目"
    description="この項目はマスタデータから追加されたため、編集できません。"
    type="info"
    showIcon
    style={{ marginBottom: 8 }}
  />
)}

// すべての入力フィールドにdisabled属性を追加
<Input
  value={internalData.id || ''}
  onChange={(e) => handleInternalUpdate('id', e.target.value)}
  size="small"
  disabled={internalData.fromMaster}  // マスタから追加された項目は編集不可
/>
```

#### 4. 空のオブジェクト追加ボタン
既存の追加ボタンを変更：

```typescript
{/* 従来の「{title}を追加」ボタンを「空の{title}を追加」に変更 */}
<Button
  type="dashed"
  icon={<PlusOutlined />}
  onClick={handleAdd}
  block
  style={{ marginTop: 16 }}
>
  空の{title}を追加
</Button>
```

#### 5. DocumentTagData型の拡張
`@/types/maiml-unified.ts`に`fromMaster`フィールドを追加：

```typescript
export interface DocumentTagData {
  tagName: string;
  id: string;
  uuid?: string;
  name?: string;
  description?: string;
  annotation?: string;
  fromMaster?: boolean;  // マスタから追加されたことを示すフラグ
  // ... その他オプショナルフィールド
}
```

## 11. 承認記録

- **計画書提示日時**: 2026-02-16 14:05
- **承認日時**: （承認待ち）
- **承認者コメント**: （記入予定）

## 12. 実施記録

### 実施日時
開始: （実施待ち）
完了: （実施待ち）

### 計画からの変更点
（実施後に記入）

### 発生した問題と解決方法
（実施後に記入）

### 最終的な成果物
（実施後に記入）
