# DocumentEditDialog - Document編集ダイアログ

## 1. 概要

### 1.1 コンポーネントの目的

DocumentEditDialogは、MAIMLファイルのDocument要素（Creator、Vendor、Owner、Instrument）を編集するモーダルダイアログです。Document情報の基本プロパティ、MaiML ID属性、および複数のDocument関連要素（Creator/Vendor/Owner/Instrument）を一元管理します。

**主要機能:**
- Document基本情報の編集（id、uuid、name、description、date）
- MaiML ID属性の編集（protocolId、methodId、pnmlId、programId）
- Creator/Vendor/Owner/Instrument要素の編集（MultiObjectEditor使用）
- マスタデータからの選択機能
- UUID自動生成

### 1.2 使用場面

- **表示タイミング**: PetriNetEditorInner の「Document編集」ボタンクリック時
- **表示条件**: MAIML編集画面（PetriNetEditorScreen）からアクセス
- **編集モード**: 新規作成、既存Document編集

### 1.3 アクセス権限

- **必須ロール**: Experiment Admin (Level 2)
- **認証**: JWT + Session Hybrid認証
- **組織制限**: 自組織のMAIMLファイルのみ編集可能

---

## 2. 目次

1. [概要](#1-概要)
2. [目次](#2-目次)
3. [画面構成](#3-画面構成)
4. [機能仕様](#4-機能仕様)
5. [データ仕様](#5-データ仕様)
6. [API連携](#6-api連携)
7. [エラーハンドリング](#7-エラーハンドリング)
8. [実装ファイル](#8-実装ファイル)
9. [変更履歴](#9-変更履歴)

---

## 3. 画面構成

### 3.1 レイアウト構造

```
┌─────────────────────────────────────────────────────────────┐
│ Modal Header                                                 │
│ 📄 Document編集                                      [×]     │
├─────────────────────────────────────────────────────────────┤
│ Modal Body (スクロール可能)                                 │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ [UUID一括生成] ボタン                                  │   │
│ ├───────────────────────────────────────────────────────┤   │
│ │ Collapse: 基本プロパティ（展開状態）                   │   │
│ │ - Document ID（必須）                                  │   │
│ │ - UUID（生成ボタン付き）                               │   │
│ │ - Name（必須）                                         │   │
│ │ - Description                                          │   │
│ │ - Date（DatePicker + 現在時刻ボタン）                  │   │
│ ├───────────────────────────────────────────────────────┤   │
│ │ MultiObjectEditor: Creator（折りたたみ状態）           │   │
│ │ - 追加/削除/編集機能                                   │   │
│ │ - マスタデータから選択                                 │   │
│ ├───────────────────────────────────────────────────────┤   │
│ │ MultiObjectEditor: Vendor（折りたたみ状態）            │   │
│ ├───────────────────────────────────────────────────────┤   │
│ │ MultiObjectEditor: Owner（折りたたみ状態）             │   │
│ ├───────────────────────────────────────────────────────┤   │
│ │ MultiObjectEditor: Instrument（折りたたみ状態）        │   │
│ ├───────────────────────────────────────────────────────┤   │
│ │ ヒント（Info Alert）                                   │   │
│ └───────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│ Modal Footer                                                 │
│ [⚠️ 未保存の変更があります]  [キャンセル] [💾 Document保存] │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 主要UI要素

#### 3.2.1 UUID一括生成ボタン
- Documentのuuidを一括生成

#### 3.2.2 基本プロパティ（Collapseパネル）
- Document ID: 任意入力
- UUID: UUID生成ボタン付き
- Name: 任意入力
- Description: テキストエリア
- Date: DatePicker（現在時刻設定ボタン付き）

#### 3.2.3 Creator/Vendor/Owner/Instrument編集
- MultiObjectEditorコンポーネントを使用
- 追加/削除/編集/並び替え機能
- マスタデータから選択可能
- Creator: Reference設定可能
- Instrument: 任意（0件可）

### 3.3 画面遷移

```mermaid
graph TD
    A[PetriNetEditorInner] -->|Document編集ボタン| B[DocumentEditDialog]
    B -->|保存| C[Document情報更新]
    B -->|キャンセル| D[変更破棄確認]
    C --> A
    D --> A
```

---

## 4. 機能仕様

### 4.1 ダイアログ初期化

#### 4.1.1 処理フロー

```typescript
useEffect(() => {
  if (open && documentData) {
    // stateリセット
    setHasChanges(false);

    // フォーム初期化
    form.setFieldsValue({
      ...documentData,
      date: documentData.date ? dayjs(documentData.date) : dayjs(),
      signatureEnabled: documentData.signatureEnabled || false,
    });
  }
}, [open, documentData, form]);
```

**注意**: PetriNetEditorInnerから初期化済みのdocumentDataが渡されるため、DocumentEditDialog側での追加の初期化は不要です。

#### 4.1.2 マスタデータ取得

```typescript
useEffect(() => {
  const loadMasterData = async () => {
    if (!open) return;

    try {
      const [creatorsData, vendorsData, instrumentsData] = await Promise.all([
        fetchMasters('creator'),
        fetchMasters('vendor'),
        fetchMasters('instrument'),
      ]);

      setCreators(creatorsData.map(convertCreatorToDocumentTag));
      setVendors(vendorsData.map(convertVendorToDocumentTag));
      setInstruments(instrumentsData.map(convertInstrumentToDocumentTag));
    } catch (error) {
      console.error('❌ [DocumentEditDialog] マスタデータ取得エラー:', error);
      message.error(t('document.masterDataLoadFailed'));
    }
  };

  loadMasterData();
}, [open, convertCreatorToDocumentTag, convertVendorToDocumentTag, convertInstrumentToDocumentTag]);
```

### 4.2 UUID生成機能

#### 4.2.1 UUID一括生成

```typescript
const handleAutoGenerateUUIDs = useCallback(() => {
  const values = form.getFieldsValue(true);
  form.setFieldsValue({
    ...values,
    uuid: generateUUID(),
  });
  setHasChanges(true);
  message.success(t('document.uuidGenerated'));
}, [form, generateUUID]);
```

#### 4.2.2 個別UUID生成

```typescript
<Button
  icon={<ThunderboltOutlined />}
  onClick={() => {
    const uuid = generateUUID();
    form.setFieldValue('uuid', uuid);
    setHasChanges(true);
  }}
>
  生成
</Button>
```

**UUID形式**: `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx` (RFC 4122 Version 4)

### 4.3 現在時刻設定

```typescript
const handleSetCurrentDateTime = useCallback(() => {
  form.setFieldValue('date', dayjs());
  setHasChanges(true);
  message.success(t('document.currentTimeSet'));
}, [form]);
```

### 4.4 フォーム変更検知

```typescript
const handleFormChange = useCallback(() => {
  setHasChanges(true);
}, []);
```

> ⚠️ **注意**: バリデーション処理は削除済みです。フォームの入力内容に関わらず保存ボタンは常に有効です。

### 4.5 セクション展開管理

```typescript
const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
  basic: true,
  creators: false,
  vendors: false,
  owners: false,
  instruments: false,
});

const handleToggleSection = useCallback((sectionKey: string) => {
  setExpandedSections(prev => ({
    ...prev,
    [sectionKey]: !prev[sectionKey]
  }));
}, []);
```

### 4.6 MultiObjectEditor連携

#### 4.6.1 データ変更ハンドラー

```typescript
const handleMultiObjectDataChange = useCallback((
  objectKey: 'creators' | 'vendors' | 'owners' | 'instruments',
  objectsArray: DocumentTagData[]
) => {
  form.setFieldsValue({ [objectKey]: objectsArray });

  if (objectKey === 'vendors') setCurrentVendors(objectsArray);
  if (objectKey === 'instruments') setCurrentInstruments(objectsArray);

  setHasChanges(true);
}, [form]);
```

#### 4.6.2 VendorとInstrumentのIDリスト算出

```typescript
const vendorIds = useMemo(() => {
  return currentVendors.map((v) => v.id).filter(Boolean) as string[];
}, [currentVendors]);

const instrumentIds = useMemo(() => {
  return currentInstruments.map((i) => i.id).filter(Boolean) as string[];
}, [currentInstruments]);
```

**用途**: CreatorのReference設定時に、VendorとInstrumentのIDリストを渡す

### 4.7 保存処理

```typescript
const handleSave = useCallback(async () => {
  const values = form.getFieldsValue(true);

  const documentToSave: DocumentData = {
    ...values,
    date: values.date ? values.date : new Date(),
    signatureEnabled: values.signatureEnabled,
  };

  onSave(documentToSave);
  onClose();
  message.success(t('document.saved'));
}, [form, onSave, onClose]);
```

> ⚠️ **注意**: バリデーションチェックは行いません。入力内容に関わらず即時保存されます。

### 4.8 キャンセル処理

```typescript
const handleCancel = useCallback(() => {
  if (hasChanges) {
    Modal.confirm({
      title: t('document.unsavedChangesTitle'),
      content: t('document.unsavedChangesContent'),
      okText: t('document.discardButton'),
      cancelText: t('document.cancelButton'),
      onOk: onClose,
    });
  } else {
    onClose();
  }
}, [hasChanges, onClose]);
```

---

## 5. データ仕様

### 5.1 Props定義

```typescript
export interface DocumentEditDialogProps {
  open: boolean;
  documentData?: DocumentData | null;
  onClose: () => void;
  onSave: (document: DocumentData) => void;
  readOnly?: boolean;
}
```

| Prop名 | 型 | 必須 | 説明 |
|--------|---|------|------|
| open | boolean | ✅ | ダイアログ表示フラグ |
| documentData | DocumentData \| null | - | 編集対象のDocument情報（新規作成時はnull） |
| onClose | () => void | ✅ | ダイアログ閉じるコールバック |
| onSave | (document: DocumentData) => void | ✅ | Document保存コールバック |
| readOnly | boolean | - | 読み取り専用モード（未使用） |

### 5.2 State定義

```typescript
const [form] = Form.useForm();
const [hasChanges, setHasChanges] = useState<boolean>(false);
const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({ /* ... */ });
const [creators, setCreators] = useState<DocumentTagData[]>([]);
const [vendors, setVendors] = useState<DocumentTagData[]>([]);
const [owners, setOwners] = useState<DocumentTagData[]>([]);
const [instruments, setInstruments] = useState<DocumentTagData[]>([]);
const [currentVendors, setCurrentVendors] = useState<DocumentTagData[]>([]);
const [currentInstruments, setCurrentInstruments] = useState<DocumentTagData[]>([]);
```

| State名 | 型 | 初期値 | 説明 |
|---------|---|--------|------|
| form | FormInstance | - | Ant Design Formインスタンス |
| hasChanges | boolean | false | 未保存の変更があるかフラグ |
| expandedSections | Record<string, boolean> | {...} | セクション展開状態 |
| creators | DocumentTagData[] | [] | Creatorマスタデータ |
| vendors | DocumentTagData[] | [] | Vendorマスタデータ |
| owners | DocumentTagData[] | [] | Ownerマスタデータ（保留） |
| instruments | DocumentTagData[] | [] | Instrumentマスタデータ |
| currentVendors | DocumentTagData[] | [] | 現在設定中のVendor（vendorIds算出用） |
| currentInstruments | DocumentTagData[] | [] | 現在設定中のInstrument（instrumentIds算出用） |

### 5.3 主要な型定義

#### 5.3.1 DocumentData型

```typescript
interface DocumentData {
  id: string;
  uuid?: string;
  name: string;
  description?: string;
  date?: string | Date;
  protocolId?: string;
  methodId?: string;
  pnmlId?: string;
  programId?: string;
  signatureEnabled?: boolean;
  creators?: DocumentTagData[];
  vendors?: DocumentTagData[];
  owners?: DocumentTagData[];
  instruments?: DocumentTagData[];
  [key: string]: unknown;
}
```

#### 5.3.2 DocumentTagData型

```typescript
interface DocumentTagData {
  tagName: 'Creator' | 'Vendor' | 'Owner' | 'Instrument';
  id: string;
  uuid?: string;
  name: string;
  description?: string;
  annotation?: string;
  vendorRefs?: string[];    // Creator用
  instrumentRefs?: string[]; // Creator用
}
```

#### 5.3.3 マスタデータ型

```typescript
// CreatorRecord
interface CreatorRecord {
  creatorId: string;
  creatorUuid: string;
  creatorName: string;
  creatorDescription: string;
  creatorAnnotation: string;
}

// VendorRecord
interface VendorRecord {
  vendorId: string;
  vendorUuid: string;
  vendorName: string;
  vendorDescription: string;
  vendorAnnotation: string;
}

// InstrumentRecord
interface InstrumentRecord {
  instrumentId: string;
  instrumentUuid: string;
  instrumentName: string;
  instrumentDescription: string;
  instrumentAnnotation: string;
}
```

### 5.4 フォームフィールド

| フィールド名 | 型 | 必須 | 初期値 | 説明 |
|-------------|---|------|--------|------|
| id | string | - | - | Document ID |
| uuid | string | - | - | UUID（生成可能） |
| name | string | - | - | Document名 |
| description | string | - | - | 説明 |
| date | Dayjs | - | dayjs() | 日付 |
| creators | DocumentTagData[] | - | [] | Creator配列 |
| vendors | DocumentTagData[] | - | [] | Vendor配列 |
| owners | DocumentTagData[] | - | [] | Owner配列 |
| instruments | DocumentTagData[] | - | [] | Instrument配列（任意） |

---

## 6. API連携

### 6.1 使用するAPI一覧

| # | API名 | メソッド | エンドポイント | 説明 | 使用箇所 |
|---|------|---------|---------------|------|----------|
| 1 | マスタ取得（Creator） | GET | `/api/v1/masters/creator` | Creatorマスタデータ取得 | ダイアログ開閉時 |
| 2 | マスタ取得（Vendor） | GET | `/api/v1/masters/vendor` | Vendorマスタデータ取得 | ダイアログ開閉時 |
| 3 | マスタ取得（Instrument） | GET | `/api/v1/masters/instrument` | Instrumentマスタデータ取得 | ダイアログ開閉時 |

### 6.2 API呼び出しコード

#### 6.2.1 マスタデータ取得API

```typescript
// masterApiService.fetchMasters
const creatorsData = await fetchMasters('creator') as Promise<CreatorRecord[]>;
const vendorsData = await fetchMasters('vendor') as Promise<VendorRecord[]>;
const instrumentsData = await fetchMasters('instrument') as Promise<InstrumentRecord[]>;

// リクエスト
GET /api/v1/masters/creator
GET /api/v1/masters/vendor
GET /api/v1/masters/instrument

Headers:
  Authorization: Bearer ${sessionToken}
  X-Organization-Id: ${organizationId}

// レスポンス (200 OK) - Creator
{
  "success": true,
  "data": [
    {
      "creatorId": "creator_001",
      "creatorUuid": "550e8400-e29b-41d4-a716-446655440000",
      "creatorName": "Creator Name",
      "creatorDescription": "Description",
      "creatorAnnotation": "Annotation"
    }
  ]
}

// レスポンス (200 OK) - Vendor
{
  "success": true,
  "data": [
    {
      "vendorId": "vendor_001",
      "vendorUuid": "550e8400-e29b-41d4-a716-446655440001",
      "vendorName": "Vendor Name",
      "vendorDescription": "Description",
      "vendorAnnotation": "Annotation"
    }
  ]
}

// レスポンス (200 OK) - Instrument
{
  "success": true,
  "data": [
    {
      "instrumentId": "instrument_001",
      "instrumentUuid": "550e8400-e29b-41d4-a716-446655440002",
      "instrumentName": "Instrument Name",
      "instrumentDescription": "Description",
      "instrumentAnnotation": "Annotation"
    }
  ]
}
```

#### 6.2.2 マスタデータ変換

```typescript
const convertCreatorToDocumentTag = (creator: CreatorRecord): DocumentTagData => ({
  tagName: 'Creator',
  id: creator.creatorId,
  uuid: creator.creatorUuid,
  name: creator.creatorName,
  description: creator.creatorDescription,
  annotation: creator.creatorAnnotation,
});

const convertVendorToDocumentTag = (vendor: VendorRecord): DocumentTagData => ({
  tagName: 'Vendor',
  id: vendor.vendorId,
  uuid: vendor.vendorUuid,
  name: vendor.vendorName,
  description: vendor.vendorDescription,
  annotation: vendor.vendorAnnotation,
});

const convertInstrumentToDocumentTag = (instrument: InstrumentRecord): DocumentTagData => ({
  tagName: 'Instrument',
  id: instrument.instrumentId,
  uuid: instrument.instrumentUuid,
  name: instrument.instrumentName,
  description: instrument.instrumentDescription,
  annotation: instrument.instrumentAnnotation,
});
```

### 6.3 エラーレスポンス

すべてのAPIで共通のエラーレスポンス形式：

```json
{
  "success": false,
  "error": {
    "message": "エラーメッセージ",
    "code": "ERROR_CODE",
    "details": {}
  }
}
```

---

## 7. エラーハンドリング

### 7.1 エラーケース一覧

| エラーケース | HTTPステータス | エラーコード | 対処方法 |
|-------------|---------------|-------------|----------|
| マスタデータ取得失敗 | 400/500 | - | エラーメッセージ表示、ダイアログ表示継続 |
| 未保存変更の破棄確認 | - | - | 確認ダイアログ表示 |

### 7.2 エラー処理コード

#### 7.2.1 マスタデータ取得エラー

```typescript
try {
  const [creatorsData, vendorsData, instrumentsData] = await Promise.all([
    fetchMasters('creator') as Promise<CreatorRecord[]>,
    fetchMasters('vendor') as Promise<VendorRecord[]>,
    fetchMasters('instrument') as Promise<InstrumentRecord[]>,
  ]);

  setCreators(creatorsData.map(convertCreatorToDocumentTag));
  setVendors(vendorsData.map(convertVendorToDocumentTag));
  setInstruments(instrumentsData.map(convertInstrumentToDocumentTag));
} catch (error) {
  console.error('❌ [DocumentEditDialog] マスタデータ取得エラー:', error);
  message.error(t('document.masterDataLoadFailed'));
}
```

**エラー時の動作**:
- エラーメッセージをToastで表示
- マスタデータなしでもダイアログ表示は継続
- 手入力での編集は可能

#### 7.2.2 未保存変更の確認

```typescript
const handleCancel = useCallback(() => {
  if (hasChanges) {
    Modal.confirm({
      title: '未保存の変更があります',
      content: '変更を破棄しますか？',
      okText: '破棄',
      cancelText: 'キャンセル',
      onOk: onClose,
    });
  } else {
    onClose();
  }
}, [hasChanges, onClose]);
```

### 7.3 エラー回復方法

#### 7.3.1 マスタデータ取得失敗時

1. エラーメッセージを確認
2. ネットワーク接続を確認
3. ダイアログを閉じて再度開く
4. マスタデータなしでも手入力で編集可能

---

## 8. 実装ファイル

### 8.1 ファイルパス

- **メインファイル**: `frontend/src/components/editorv2/DocumentEditDialog.tsx`

### 8.2 関連ファイル

- **型定義**: `frontend/src/types/editor.ts`, `frontend/src/types/maiml-unified.ts`
- **サービス**: `frontend/src/services/masterApiService.ts`
- **子コンポーネント**: `frontend/src/components/editorv2/MultiObjectEditor.tsx`

### 8.3 依存ライブラリ

- **Ant Design**: Modal, Button, Input, Form, Collapse, Alert, Space, Typography, DatePicker, Tag
- **dayjs**: 日付操作
- **Ant Design Icons**: ThunderboltOutlined, ClockCircleOutlined, SaveOutlined

---

## 9. 変更履歴

| 日付 | 変更内容 | 担当者 |
|------|----------|--------|
| 2026-03-11 | 実装ベースでUI仕様書を新規作成（DocumentEditDialog.tsx 約600行を分析） | Cline |
| 2026-04-14 | バリデーション処理削除に伴いUI仕様書を更新（4.4節変更・7章簡略化・State定義更新・フォームフィールド必須定義削除） | Cline |
