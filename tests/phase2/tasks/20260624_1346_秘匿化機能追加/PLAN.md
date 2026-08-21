# タスク計画書: 秘匿化機能追加（暗号化済み要素一覧・復号化プレビュー・復号化実行）

## メタデータ
- **作成日時**: 2026-06-24 13:46
- **タスクID**: encryption-decryption-features
- **優先度**: 高
- **推定工数**: 7時間

---

## タスク概要

暗号化管理UI（`EncryptionManagement.tsx`）に不足している以下の3機能を追加する。

1. **暗号化済み要素一覧タブ**: ツリーで選択した要素の配下にある暗号化済み要素を一覧表示
2. **復号化プレビュー**: 暗号化済み要素を選択した時に復号化後のXMLをプレビュー表示
3. **復号化実行ボタン**: 暗号化済み要素を選択した時に復号化を実行するボタン

---

## 目的と期待される成果

- [ ] 右ペインに「暗号化済み要素」タブが追加され、選択ノード配下の暗号化済み要素一覧が表示される
- [ ] 一覧の表示項目は「親要素ID・種別・秘匿レベル・アルゴリズム」である
- [ ] 一覧の行をクリックすると、ツリーでその要素が選択される
- [ ] 暗号化済み要素を選択した時、暗号化設定パネルが復号化設定パネルに切り替わる
- [ ] 復号化設定パネルで鍵を選択し、プレビュー・実行ができる
- [ ] プレビューパネルが復号化モードに対応し、復号化前/後のXMLを表示できる

---

## 確定仕様

### 暗号化済み要素一覧タブ

**タブ名**: 「暗号化済み要素」（現在のタブ構成に追加）

**タブ構成変更前後**:
```
【変更前】
- 暗号化設定タブ
- プレビュータブ

【変更後】
- 暗号化設定タブ  （既存）
- 暗号化済み要素タブ  ← 追加
- プレビュータブ  （既存）
```

**表示内容**:
- ツリーで要素を選択した時に、その配下の暗号化済み要素を一覧表示
- テーブル形式
- 未選択 or 配下に暗号化済み要素がない場合は空メッセージを表示

**表示列**:

| 列名 | 内容 | 幅 |
|------|------|----|
| 親要素ID | 選択要素の `id` 属性 | 150px |
| 種別 | タグ名（`material`, `condition`, `property` など） | 130px |
| 秘匿レベル | `L1` または `L2` | 80px |
| アルゴリズム | `AES-256-CBC`, `AES-128-CBC` など | 130px |

**動作**:
- 行をクリック → ツリーでその要素を選択状態にする（`onSelectFromList` コールバック）

---

### 復号化設定パネル（暗号化設定パネルのモード切り替え）

**表示条件**: `selectedNode.isEncrypted === true` の場合

**UI構成**:
```
┌──────────────────────────────────────┐
│ 🔓 復号化設定                         │
│                                      │
│ 使用する鍵                            │
│ [プルダウン: 鍵一覧から選択]            │
│                                      │
│ パスワード（PBKDF2の場合のみ表示）      │
│ [パスワード入力フィールド]             │
│                                      │
│ [🔍 復号化プレビュー]  [🔓 復号化実行] │
└──────────────────────────────────────┘
```

**ボタンの動作**:
- 「復号化プレビュー」→ バックエンドAPIを呼び出し、プレビュータブに結果表示
- 「復号化実行」→ 確認ダイアログ → バックエンドAPIを呼び出し → 成功メッセージ → ツリーを再取得

---

### プレビューパネルの拡張

**mode プロパティを追加**:
- `mode='encrypt'`（既存）: 暗号化前/暗号化後
- `mode='decrypt'`（新規）: 復号化前/復号化後

**ラベル変更**:
```
encrypt: 「暗号化前」「暗号化後」
decrypt: 「復号化前」「復号化後」
```

---

## 実装ステップ

### Phase 1: 型定義・バックエンドスタブ
- [ ] `frontend/src/types/encryption.ts` に以下を追加
  - `EncryptedChildElement` インターフェース
  - `DecryptRequest`（既存）の確認・拡張
  - `DecryptPreviewRequest / DecryptPreviewResponse` インターフェース
- [ ] `backend/src/controllers/encryptionController.ts` に以下のスタブを追加
  - `getEncryptedChildren`: 選択要素配下の暗号化済み要素一覧を返す
  - `decryptPreview`: 復号化プレビューを返す
  - `executeDecrypt`: 復号化を実行する
- [ ] `backend/src/routes/encryptionRoutes.ts` に以下のルートを追加
  - `GET /keys/encrypted-children/:projectName` （クエリパラメータで nodePath 指定）
  - `POST /decrypt-preview`
  - `POST /decrypt`
- [ ] `frontend/src/services/encryptionService.ts` に以下の関数を追加
  - `getEncryptedChildren(projectName, nodePath)`
  - `getDecryptPreview(request)`
  - `executeDecrypt(request)`

### Phase 2: 暗号化済み要素一覧コンポーネント
- [ ] `frontend/src/components/encryption/EncryptedElementsListTab.tsx` 新規作成
  - Props: `selectedNode`, `encryptedChildren`, `loading`, `onSelectElement`
  - テーブルで一覧表示
  - 行クリックで onSelectElement コールバック呼び出し

### Phase 3: 復号化設定パネル
- [ ] `frontend/src/components/encryption/DecryptionPanel.tsx` 新規作成
  - Props: `selectedNode`, `keys`, `onDecryptPreview`, `onDecryptExecute`
  - 鍵選択プルダウン
  - パスワード入力（PBKDF2の場合）
  - プレビュー・実行ボタン
  - 復号化実行確認ダイアログ

### Phase 4: 既存コンポーネントの修正

#### `EncryptionConfigPanel.tsx` の修正
- [ ] `selectedNode.isEncrypted` で表示を切り替え
  - `isEncrypted === false` → 既存の暗号化設定UI
  - `isEncrypted === true` → `DecryptionPanel` を表示

#### `EncryptionPreviewPanel.tsx` の修正
- [ ] `mode: 'encrypt' | 'decrypt'` Propsを追加
- [ ] モードに応じてラベル（「暗号化前/後」「復号化前/後」）を切り替え

#### `EncryptionManagement.tsx` の修正
- [ ] 右ペインのタブ定義に「暗号化済み要素」タブを追加（`encryptedList`）
- [ ] `encryptedChildren` ステートを追加
- [ ] `encryptedChildren` の取得ロジック追加（selectedNode 変更時）
- [ ] `EncryptedElementsListTab` を配置
- [ ] 復号化関連ハンドラを追加
  - `handleDecryptPreview`: 復号化プレビューAPIを呼び出し
  - `handleDecryptExecute`: 復号化実行APIを呼び出し
- [ ] `EncryptionConfigPanel` に DecryptionPanel 関連 Props を追加
- [ ] `EncryptionPreviewPanel` に mode Props を追加

---

## 変更・新規ファイル一覧

### 新規作成

| ファイル | 目的 |
|---------|------|
| `frontend/src/components/encryption/EncryptedElementsListTab.tsx` | 暗号化済み要素一覧タブ |
| `frontend/src/components/encryption/DecryptionPanel.tsx` | 復号化設定パネル |

### 修正

| ファイル | 変更内容 |
|---------|---------|
| `frontend/src/types/encryption.ts` | `EncryptedChildElement`, `DecryptPreviewRequest/Response` 型追加 |
| `backend/src/controllers/encryptionController.ts` | `getEncryptedChildren`, `decryptPreview`, `executeDecrypt` スタブ追加 |
| `backend/src/routes/encryptionRoutes.ts` | 3エンドポイント追加 |
| `frontend/src/services/encryptionService.ts` | `getEncryptedChildren`, `getDecryptPreview`, `executeDecrypt` 追加 |
| `frontend/src/components/encryption/EncryptionConfigPanel.tsx` | 復号化モード切り替え対応 |
| `frontend/src/components/encryption/EncryptionPreviewPanel.tsx` | `mode` Props 追加・ラベル切り替え |
| `frontend/src/components/encryption/EncryptionManagement.tsx` | タブ追加・復号化ハンドラ追加 |

---

## バックエンドAPIスタブ仕様

### `GET /api/v1/encryption/encrypted-children/:projectName?nodePath=xxx`

**レスポンス例**:
```json
{
  "success": true,
  "data": {
    "elements": [
      {
        "path": "/document/method[1]/material[1]",
        "parentId": "method-001",
        "elementType": "material",
        "encryptionLevel": "L1",
        "algorithm": "aes256-cbc",
        "encryptedAt": "2026-06-24T09:00:00Z"
      }
    ]
  }
}
```

### `POST /api/v1/encryption/decrypt-preview`

**リクエスト**:
```json
{
  "projectName": "sample",
  "targetPath": "/document/method[1]/material[1]",
  "keyId": "key-uuid",
  "password": null
}
```

**レスポンス例**:
```json
{
  "success": true,
  "data": {
    "beforeXml": "<EncryptedData ...>...</EncryptedData>",
    "afterXml": "<material id='material-001'>...</material>"
  }
}
```

### `POST /api/v1/encryption/decrypt`

**リクエスト**:
```json
{
  "projectName": "sample",
  "targetPath": "/document/method[1]/material[1]",
  "keyId": "key-uuid",
  "password": null
}
```

**レスポンス例**:
```json
{
  "success": true,
  "data": {
    "updatedFilePath": "projects/sample/sample.maiml"
  }
}
```

---

## リスク

| リスク | 影響度 | 対策 |
|--------|--------|------|
| `isEncrypted` が MaimlTreeNode に設定されているか確認が必要 | 中 | 既存ツリー取得APIのレスポンスを確認する |
| 暗号化済み子要素の取得ロジック（バックエンド）が複雑になる可能性 | 中 | 本タスクはスタブ実装に留め、本実装は別タスク |
| `EncryptionConfigPanel` の Props が増えることで既存の暗号化フローに影響する可能性 | 低 | 新規Props は optional にして後方互換を維持 |

---

## 承認記録
- **計画書提示日時**: 2026-06-24 13:46
- **承認日時**: 2026-06-24 13:51

---

## 実施記録

### 実施日時
開始: 2026-06-24 13:51
完了: 2026-06-24 14:07

### 計画からの変更点

#### EncryptionConfigPanel.tsx の修正を見送り
- 計画では `selectedNode.isEncrypted` に応じて `EncryptionConfigPanel` 内部で `DecryptionPanel` に切り替える実装を予定
- 実装時に `DecryptionPanel` を独立タブとして配置する方が責務分離として自然と判断
- `EncryptionManagement.tsx` の右ペインに「復号化」タブを追加し、`DecryptionPanel` を直接配置する方針に変更

#### タブ構成の変更
- 計画: 暗号化設定 / 暗号化済み要素 / プレビュー（3タブ）
- 実装: 暗号化設定 / 秘匿済み一覧 / 復号化 / XMLプレビュー（4タブ）
- 復号化プレビューは「復号化」タブの「復号化プレビュー」ボタン押下後、自動的に「XMLプレビュー」タブへ切り替えて表示

#### DecryptPreviewResponse → EncryptionPreviewResponse の変換
- `DecryptPreviewResponse` は `algorithmUri` を持たないため、`EncryptionPreviewPanel` に渡す際に `algorithmUri: ''` を補完して変換

### 最終的な成果物

- [x] `frontend/src/components/encryption/EncryptedElementsListTab.tsx` 新規作成
- [x] `frontend/src/components/encryption/DecryptionPanel.tsx` 新規作成
- [x] `frontend/src/types/encryption.ts` 型追加（EncryptedChildElement / DecryptPreviewRequest/Response / DecryptExecuteRequest/Response）
- [x] `backend/src/controllers/encryptionController.ts` スタブ3件追加
- [x] `backend/src/routes/encryptionRoutes.ts` エンドポイント3件追加
- [x] `frontend/src/services/encryptionService.ts` API関数3件追加
- [x] `frontend/src/components/encryption/EncryptionPreviewPanel.tsx` mode Props 追加
- [x] `frontend/src/components/encryption/EncryptionManagement.tsx` タブ2件追加・ハンドラ追加

---

## ⚠️ 懸念事項（スタブ実装のため本実装が必要な箇所）

### 1. バックエンド：暗号化済み子要素一覧の取得ロジック

**ファイル**: `backend/src/controllers/encryptionController.ts`  
**関数**: `getEncryptedChildren`

**現状（スタブ）**:
```typescript
// スタブ: 固定のモックデータを返す
return res.json({ success: true, data: { elements: [] } });
```

**本実装で必要なこと**:
- MAIMLファイルを読み込み、指定 `nodePath` の配下にある `<EncryptedData>` 要素を列挙する
- 各 `<EncryptedData>` から以下の情報を抽出する：
  - `parentId`：親要素の `id` 属性
  - `elementType`：親要素のタグ名（`material`, `condition` など）
  - `encryptionLevel`：`EncryptionMethod/@Algorithm` の URI から判定
  - `algorithm`：`EncryptionMethod/@Algorithm` の表示ラベル
  - `encryptedAt`：`KeyInfo` または独自属性から取得（未定義の場合は省略可）

---

### 2. バックエンド：復号化プレビュー

**ファイル**: `backend/src/controllers/encryptionController.ts`  
**関数**: `decryptPreview`

**現状（スタブ）**:
```typescript
// スタブ: 固定のモックXMLを返す
return res.json({ success: true, data: { beforeXml: '...', afterXml: '...' } });
```

**本実装で必要なこと**:
- MAIMLファイルを読み込み、`targetPath` の `<EncryptedData>` 要素を特定する
- `keyId` で鍵管理テーブルから鍵を取得する
- 鍵を使って `<CipherValue>` を復号し、平文XMLを取得する（ファイルには書き込まない）
- `beforeXml`（暗号化状態のXML）と `afterXml`（復号化後の平文XML）を返す
- 鍵が不正な場合は E5015 等のエラーを返す

---

### 3. バックエンド：復号化実行

**ファイル**: `backend/src/controllers/encryptionController.ts`  
**関数**: `executeDecrypt`

**現状（スタブ）**:
```typescript
// スタブ: 常に成功を返す（MAIMLファイルは変更しない）
return res.json({ success: true, data: { updatedFilePath: '' } });
```

**本実装で必要なこと**:
- 復号化プレビューと同様に平文XMLを取得する
- MAIMLファイルをバックアップ（`archive/` フォルダへコピー）する
- `<EncryptedData>` 要素を平文XML要素で置き換え、ファイルを保存する
- `updatedFilePath` に更新後のファイルパスを返す

---

### 4. フロントエンド：MaimlTreeNode.isEncrypted の設定

**ファイル**: `frontend/src/utils/parseMaimlToEncryptionTree.ts`（または対応するAPI）  
**懸念**: `isEncrypted` フィールドが現在のツリー取得APIレスポンスで正しく設定されているか未確認

**確認事項**:
- バックエンドの `getMaimlStructure` が返す各ノードに `isEncrypted: true/false` が含まれているか
- `<EncryptedData>` 要素を子に持つノードが `isEncrypted: true` になっているか
- `DecryptionPanel` は `selectedNode.isEncrypted === false` の場合に「選択した要素は暗号化されていません」と表示するため、この値が正確でないと復号化UIが表示されない

---

### 5. フロントエンド：復号化プレビューのプレビュー表示切り替えロジック

**ファイル**: `frontend/src/components/encryption/EncryptionManagement.tsx`  
**箇所**: `EncryptionPreviewPanel` の `preview` Props

**現状**:
```typescript
preview={rightTab === 'decrypt' || decryptPreview !== null ? decryptPreview : preview}
```

**懸念**:
- 復号化プレビュー実行後に暗号化設定タブに切り替えた場合、`decryptPreview !== null` のままなので「XMLプレビュー」タブが復号化プレビューを表示し続ける
- 暗号化設定タブに切り替えた時に `decryptPreview` をクリアするか、表示優先ルールを整理する必要がある

**暫定対応**:
- 現状は `decryptPreview` が存在する場合は常に復号化プレビューを優先表示
- 暗号化操作後のツリー再取得時に `decryptPreview` をクリアすることで問題を回避

---

### 6. フロントエンド：「秘匿済み一覧」の自動更新タイミング

**ファイル**: `frontend/src/components/encryption/EncryptionManagement.tsx`  
**箇所**: `handleTabChange` 内の `loadEncryptedChildren` 呼び出し

**現状**:
```typescript
if (tabKey === 'encrypted-list' && selectedNode) {
  loadEncryptedChildren(selectedNode);
}
```

**懸念**:
- 現在はタブを「秘匿済み一覧」に切り替えた時のみ一覧を取得する
- 暗号化実行後にタブがすでに「秘匿済み一覧」に表示されていた場合、一覧が自動更新されない
- 暗号化・復号化実行後の `loadTree()` と同じタイミングで `loadEncryptedChildren` も呼ぶ対応が必要

---

### 7. encryptionInfo フィールドの型定義

**ファイル**: `frontend/src/types/encryption.ts`  
**懸念**: `MaimlTreeNode.encryptionInfo` の `algorithmUri`, `keyName` フィールドが型定義に存在するか未確認

**影響箇所**: `DecryptionPanel.tsx`
```typescript
const encryptionInfo = selectedNode?.encryptionInfo;
const needsPassword = isPbkdf2Algorithm(encryptionInfo?.algorithmUri);
```

`MaimlTreeNode` に `encryptionInfo` フィールドが存在しない場合、TypeScript エラーが発生する可能性がある（現状は `?.` で安全にアクセスしているため実行時エラーにはならない）。

---

## 参照
- 実装されたコンポーネント: `frontend/src/components/encryption/`
- バックエンドスタブ: `backend/src/controllers/encryptionController.ts`
- バックエンドルート: `backend/src/routes/encryptionRoutes.ts`
