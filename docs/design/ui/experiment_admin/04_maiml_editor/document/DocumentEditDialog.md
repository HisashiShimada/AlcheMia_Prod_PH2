# DocumentEditDialog UI仕様書

## 1. 概要

### 1.1. コンポーネントの目的

MAIMLファイルのDocument要素（Creator、Vendor、Owner、Instrument）を編集するモーダルダイアログ。複数要素の登録、UUID自動生成、XML署名機能を提供します。

### 1.2. 使用場面

- EditorToolbarの「Document」ボタンをクリックした場合
- PetriNetEditorでDocument編集が必要な場合

### 1.3. アクセス権限

- **対象ロール**: Experiment Admin（実験管理者）
- **必須認証**: JWT認証必須

---

## 2. 画面構成

### 2.1. レイアウト構造

```
┌─────────────────────────────────────────────────────────┐
│ Document編集                                    [×]      │
├─────────────────────────────────────────────────────────┤
│ 📄 基本情報                                              │
│ ┌───────────────────────────────────────────────────┐   │
│ │ ドキュメント名: [入力フィールド]                   │   │
│ │ 説明: [テキストエリア]                             │   │
│ │ 日付: [日付選択]                                   │   │
│ └───────────────────────────────────────────────────┘   │
│                                                         │
│ 🔬 Creator（作成者）                                     │
│ [MultiObjectEditor]                                     │
│                                                         │
│ 🏭 Vendor（ベンダー）                                    │
│ [MultiObjectEditor]                                     │
│                                                         │
│ 👤 Owner（所有者）                                       │
│ [MultiObjectEditor]                                     │
│                                                         │
│ 🔧 Instrument（機器）                                    │
│ [MultiObjectEditor]                                     │
│                                                         │
│ 🔒 XML署名                                               │
│ ☐ XML署名を有効にする                                    │
│                                                         │
│ [キャンセル] [保存]                                      │
└─────────────────────────────────────────────────────────┘
```

### 2.2. 主要UI要素

#### 2.2.1. ヘッダー

| 要素 | 説明 |
|------|------|
| タイトル | 「Document編集」 |
| 閉じるボタン | Xアイコン、onClose()実行 |

#### 2.2.2. 基本情報セクション

| 項目 | コンポーネント | 必須 |
|------|--------------|------|
| ドキュメント名 | Input | ○ |
| 説明 | TextArea | - |
| 日付 | DatePicker | ○ |

#### 2.2.3. Creator（作成者）セクション

**MultiObjectEditor使用:**
- 複数のCreatorを登録可能
- マスタデータから選択
- 新規作成も可能

**フィールド:**
- ID（UUID自動生成）
- 名前
- 所属
- メールアドレス

#### 2.2.4. Vendor（ベンダー）セクション

**MultiObjectEditor使用:**
- 複数のVendorを登録可能
- マスタデータから選択

**フィールド:**
- ID（UUID自動生成）
- ベンダー名
- 連絡先
- URL

#### 2.2.5. Owner（所有者）セクション

**MultiObjectEditor使用:**
- 複数のOwnerを登録可能
- マスタデータから選択

**フィールド:**
- ID（UUID自動生成）
- 所有者名
- 組織
- 連絡先

#### 2.2.6. Instrument（機器）セクション

**MultiObjectEditor使用:**
- 複数のInstrumentを登録可能
- マスタデータから選択
- 参照プロパティ（instrumentRef）対応

**フィールド:**
- ID（UUID自動生成）
- 機器名
- モデル
- シリアル番号
- ベンダー参照（vendorRef）

#### 2.2.7. XML署名セクション

| 要素 | 説明 |
|------|------|
| Checkbox | XML署名を有効にする |

**機能:**
- W3C XMLDSigに準拠
- 署名有効時、保存時に自動署名

#### 2.2.8. フッターボタン

| ボタン | 機能 |
|-------|------|
| キャンセル | 変更を破棄してダイアログを閉じる |
| 保存 | DocumentDataを保存 |

**スタイル:**
- 保存ボタン: type="primary"
- キャンセルボタン: type="default"

---

## 3. 機能仕様

### 3.1. 主要機能の詳細

#### 3.1.1. Document初期化

**新規作成時:**
- documentData.name === 'document' または
- documentData.id === 'documentID' の場合

**デフォルト値:**
- name: 空文字列
- description: 空文字列
- date: 現在日時
- creators: []
- vendors: []
- owners: []
- instruments: []
- signature.enabled: false

**既存Document編集時:**
- documentDataの値をフォームに設定

#### 3.1.2. マスタデータ取得

**処理フロー:**
1. ダイアログオープン時にマスタデータをAPIから取得
2. fetchCreators() → creators
3. fetchVendors() → vendors
4. fetchOwners() → owners
5. fetchInstruments() → instruments
6. MultiObjectEditorに渡す

#### 3.1.3. Creator編集

**処理フロー:**
1. MultiObjectEditorでCreatorを追加/編集/削除
2. UUID自動生成
3. マスタデータから選択または新規作成
4. creators配列を更新

#### 3.1.4. Vendor編集

**処理フロー:**
1. MultiObjectEditorでVendorを追加/編集/削除
2. UUID自動生成
3. マスタデータから選択
4. vendors配列を更新

#### 3.1.5. Owner編集

**処理フロー:**
1. MultiObjectEditorでOwnerを追加/編集/削除
2. UUID自動生成
3. マスタデータから選択
4. owners配列を更新

#### 3.1.6. Instrument編集

**処理フロー:**
1. MultiObjectEditorでInstrumentを追加/編集/削除
2. UUID自動生成
3. vendorRef参照プロパティを設定
4. instruments配列を更新

#### 3.1.7. XML署名

**処理フロー:**
1. Checkboxをトグル
2. signature.enabledを更新
3. 有効時、保存時にW3C XMLDSig署名を生成

#### 3.1.8. 保存処理

**処理フロー:**
1. 「保存」ボタンをクリック
2. バリデーション実行
   - ドキュメント名: 必須
   - 日付: 必須、有効な日付形式
3. DocumentDataを構築
4. onSave(documentData)を実行
5. ダイアログを閉じる

**バリデーションエラー時:**
- エラーメッセージを表示
- 保存処理を中断

### 3.2. ボタン・操作の動作

| 操作 | 動作 | 状態変更 |
|------|------|---------|
| ドキュメント名入力 | name更新 | フォーム状態更新 |
| 説明入力 | description更新 | フォーム状態更新 |
| 日付選択 | date更新 | フォーム状態更新 |
| Creator追加 | creators配列に追加 | MultiObjectEditor |
| Vendor追加 | vendors配列に追加 | MultiObjectEditor |
| Owner追加 | owners配列に追加 | MultiObjectEditor |
| Instrument追加 | instruments配列に追加 | MultiObjectEditor |
| XML署名チェック | signature.enabled切替 | フォーム状態更新 |
| キャンセルボタン | ダイアログを閉じる | onClose() |
| 保存ボタン | 保存処理 | onSave() |

---

## 4. データ仕様

### 4.1. Props型定義

```typescript
interface DocumentEditDialogProps {
  open: boolean;                        // モーダル表示フラグ
  documentData?: DocumentData;          // Documentデータ
  onClose: () => void;                  // 閉じる
  onSave: (data: DocumentData) => void; // 保存
}
```

### 4.2. DocumentData型定義

```typescript
interface DocumentData {
  id: string;                    // Document ID
  uuid?: string;                 // UUID
  name: string;                  // ドキュメント名
  description?: string;          // 説明
  date: string;                  // 日付（ISO 8601形式）
  creators: ObjectData[];        // Creator配列
  vendors: ObjectData[];         // Vendor配列
  owners: ObjectData[];          // Owner配列
  instruments: ObjectData[];     // Instrument配列
  signature?: {
    enabled: boolean;            // XML署名有効フラグ
  };
  protocolId?: string;           // プロトコルID
  methodId?: string;             // メソッドID
  pnmlId?: string;               // PNML ID
  programId?: string;            // プログラムID
}
```

### 4.3. ObjectData型定義

```typescript
interface ObjectData {
  id: string;           // ID
  name: string;         // 名前
  uuid?: string;        // UUID
  [key: string]: any;   // その他のプロパティ
}
```

---

## 5. UI/UXポリシー準拠

### 5.1. Ant Designコンポーネント使用

| コンポーネント | 使用箇所 | props |
|--------------|---------|-------|
| Modal | 外側のコンテナ | open, onCancel, title, width, footer |
| Input | ドキュメント名 | value, onChange |
| TextArea | 説明 | value, onChange, rows |
| DatePicker | 日付選択 | value, onChange |
| Collapse | セクション折りたたみ | defaultActiveKey |
| Panel | セクションパネル | header, key |
| Checkbox | XML署名 | checked, onChange |
| Button | 保存・キャンセル | type, onClick |
| Typography | テキスト表示 | Title, Text, Paragraph |
| Alert | 警告メッセージ | type, message, showIcon |

### 5.2. @ant-design/icons使用

- FileTextOutlined: 基本情報アイコン
- ExperimentOutlined: Creatorアイコン
- ClockCircleOutlined: 日付アイコン
- LockOutlined: XML署名アイコン

---

## 6. 実装ファイル

### 6.1. ソースファイルパス

```
frontend/src/components/editor/DocumentEditDialog.tsx
```

### 6.2. 関連コンポーネント

| コンポーネント | パス | 役割 |
|--------------|------|------|
| MultiObjectEditor | ./MultiObjectEditor | Creator等の編集 |
| PetriNetEditor | ./PetriNetEditor | 親コンポーネント |

### 6.3. 依存ライブラリ

| ライブラリ | バージョン | 用途 |
|-----------|----------|------|
| antd | 6.x | UIコンポーネント |
| @ant-design/icons | 5.x | アイコン |

---

## 7. 既知の課題・TODO

- [ ] XML署名の詳細仕様実装
- [ ] バリデーションルールの拡充
- [ ] マスタデータのキャッシュ機能
- [ ] 参照整合性チェック

---

## 8. 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 4.0.0 | 2025-12-23 | Ant Design v6対応 | Development Team |
| 1.0.0 | 2026-01-21 | 初版作成 | Cline |

---

## 9. 使用例

```typescript
<DocumentEditDialog
  open={documentDialogOpen}
  documentData={documentData}
  onClose={() => setDocumentDialogOpen(false)}
  onSave={handleSaveDocument}
/>
```

---

## 10. バリデーション

### 10.1. 必須項目チェック

```typescript
if (!documentData.name.trim()) {
  message.error('ドキュメント名は必須です');
  return;
}

if (!documentData.date) {
  message.error('日付は必須です');
  return;
}
```

### 10.2. 日付形式チェック

```typescript
if (!dayjs(documentData.date).isValid()) {
  message.error('有効な日付を入力してください');
  return;
}
```

---

## 11. API連携

### 11.1. マスタデータ取得

```typescript
// Creator一覧取得
const creators = await fetchCreators();

// Vendor一覧取得
const vendors = await fetchVendors();

// Owner一覧取得
const owners = await fetchOwners();

// Instrument一覧取得
const instruments = await fetchInstruments();
```

---

## 12. アクセシビリティ

### 12.1. キーボード操作

- Tab: フォーカス移動
- Enter: 保存（フォーカスが保存ボタンにある場合）
- Escape: キャンセル
