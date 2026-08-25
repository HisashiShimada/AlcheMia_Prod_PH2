# Insertion機能 調査結果

**調査日**: 2026-07-24  
**対象**: フロントエンド Insertion 機能全体

---

## 1. Insertionとは

MAIML（Materials Informatics Markup Language）仕様上の `<insertion>` タグに相当する機能。  
テンプレートに紐づくファイル（画像・CSV など）の参照情報を定義する。

### MAIML上の構造

```xml
<insertion>
  <uri>s3://bucket/path/to/file</uri>          <!-- ファイルのS3キー（必須） -->
  <hash>sha256_hash_value</hash>               <!-- ファイルハッシュ（必須） -->
  <format>image/tiff</format>                  <!-- MIMEタイプ（任意） -->
</insertion>
```

- `insertion` タグは **key 属性を持たない**（MAIML仕様）
- `MaterialTemplate` / `ResultTemplate` のトップレベルに配置される
- `ConditionTemplate` では非対応

### 型定義

```typescript
// frontend/src/types/maiml-unified.ts
interface Insertion {
  uri: string;
  hash?: Hash | string;   // { method?: string; value?: string } or string
  format?: string;
}
```

---

## 2. TemplateEditorDialog での処理

**ファイル**: `frontend/src/components/editorv2/TemplateEditorDialog.tsx`

### 2-1. 概要

テンプレート設計時（実験ワークフロー編集時）に、Materialノード・Resultノードのテンプレートに対して  
`insertion` 情報（URI・Hash・Format）を設定する機能。

### 2-2. State管理

```typescript
// Insertion State（MaterialTemplate・ResultTemplateのみ）
const [insertion, setInsertion] = useState<Insertion>({
  uri: '',
  hash: { method: '', value: '' },
  format: ''
});
```

### 2-3. 表示条件

```typescript
// placeType が 'material' または 'result' の場合のみ Insertion セクションを表示
(node.data.placeType === 'material' || node.data.placeType === 'result')
```

### 2-4. UIの入力フィールド

| フィールド | 入力形式 | プレースホルダー例 |
|-----------|---------|----------------|
| URI | Input（テキスト） | `s3://bucket/path/to/file` |
| Hash Method | Input（テキスト） | `sha256` |
| Hash Value | Input（テキスト） | `abc123...` |
| Format | Input（テキスト） | `application/xml` |

### 2-5. ダイアログ開時の初期化フロー

1. `node.data` からテンプレート情報を取得
2. `template.insertion` または `templateRef.insertion` が存在する場合はそれをステートに設定
3. 存在しない場合は空の Insertion オブジェクトで初期化

```typescript
setInsertion(
  mergedTemplate.insertion || { uri: '', hash: { method: '', value: '' }, format: '' }
);
```

### 2-6. 保存処理フロー

保存ボタン押下時（`handleSave`）:

1. `insertion.uri` または `insertion.hash` または `insertion.format` のいずれかが非空の場合に  
   `templateRef.insertion = insertion` として格納する
2. `onSave(nodeId, templateRef, ...)` を通じて親コンポーネントへ渡す
3. 親コンポーネントが `reactFlowToMaiml.ts` / `multiMethodConverter.ts` を通じてMAIML XMLに変換する

```typescript
// 条件付きで insertion をセット
if ((node.data.placeType === 'material' || node.data.placeType === 'result') &&
    (insertion.uri || insertion.hash || insertion.format)) {
  templateRef.insertion = insertion;
}
```

### 2-7. XML出力処理

**ファイル**: `frontend/src/utils/reactFlowToMaiml.ts` / `frontend/src/utils/multiMethodConverter.ts`

```typescript
// XSD準拠: insertionType の uri/hash は必須（minOccurs=1）
if (template.insertion) {
  xml += `      <insertion>\n`;
  xml += `        <uri>${escapeXml(template.insertion.uri ?? '')}</uri>\n`;
  xml += `        <hash>${escapeXml(template.insertion.hash?.value ?? '')}</hash>\n`;
  if (template.insertion.format) {
    xml += `        <format>${escapeXml(template.insertion.format)}</format>\n`;
  }
  xml += `      </insertion>\n`;
}
```

- `uri` と `hash` はXSD上必須のため、未入力でも空文字で出力される
- `format` は任意のため、値がある場合のみ出力される

---

## 3. DataRecordDialog での処理

**ファイル**: `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx`

DataRecordDialog における Insertion 処理は以下の **2パターン** に分かれる。

---

### パターン A: テンプレート定義の `<insertion>` 指示がある場合（非カスタム）

#### A-1. 概要

MAIMLテンプレートの `resultTemplate` / `conditionTemplate` トップレベルに `<insertion>` タグが定義されている場合、  
実験作業者がファイルをアップロードする入力欄として表示される。

#### A-2. データ構造（型定義）

```typescript
// frontend/src/types/experimentWorker.ts

/** テンプレートレベルの <insertion> タグの型（非カスタム） */
interface InsertionField {
  uri?: string;           // 既存ファイルのS3キー（復元時）
  description?: string;  // 説明文
  format?: string;        // MIMEタイプ（accept属性に使用）
}

interface Template {
  // ...
  insertions?: InsertionField[];  // テンプレートトップレベルの <insertion>（非カスタム）
}
```

#### A-3. State管理

```typescript
// 非カスタム insertion のファイル管理（templateId → (insertionIndex → File|null)）
const [insertionFiles, setInsertionFiles] = useState<
  Record<string, Record<number, File | null>>
>({});

// 非カスタム insertion の既存URI（templateId → (insertionIndex → uri)）- 復元時にセット
const [insertionUris, setInsertionUris] = useState<
  Record<string, Record<number, string>>
>({});
```

#### A-4. UIレンダリング

```tsx
{/* トップレベル非カスタム Insertions セクション */}
{selectedTemplate.insertions && selectedTemplate.insertions.length > 0 && (
  <div style={{ marginTop: 16 }}>
    <Text type="secondary" style={{ fontSize: 12 }}>添付ファイル（insertion）</Text>
    {selectedTemplate.insertions.map((ins, insIdx) => {
      const fileForIns = insertionFiles[tplId]?.[insIdx] ?? null;
      const uriForIns = insertionUris[tplId]?.[insIdx] ?? ins.uri ?? '';
      const acceptStr = getAcceptString(ins.format);
      // ...
      <Tag color="purple">insertion</Tag>
      // Upload コンポーネント
    })}
  </div>
)}
```

- ファイルを選択すると `insertionFiles[templateId][insIdx]` に `File` オブジェクトが格納される
- 既存ファイルがある場合は `uriForIns`（S3キー）を表示

#### A-5. 保存処理フロー

```
1. insertionFiles[template.templateId] を走査
2. File が存在するインデックスを S3 にアップロード
   → uploadFiles() を呼び出し → S3キーを取得
3. nonCustomInsertionUriMap[insIdx] = s3Key に格納
4. baseData.insertions の非カスタムエントリに uri を反映
   （isCustomProperty: false のエントリのみ対象）
```

```typescript
// 非カスタム insertion の URI を baseData.insertions に反映
if (Array.isArray(baseData.insertions)) {
  const nonCustomInsertions = (baseData.insertions as Array<Record<string, unknown>>)
    .filter((ins) => !ins.isCustomProperty);
  nonCustomInsertions.forEach((ins, insIdx) => {
    const uploadedUri = nonCustomInsertionUriMap[insIdx];
    if (uploadedUri) {
      ins.uri = uploadedUri;
    } else {
      const currentUri = insertionUris[template.templateId]?.[insIdx];
      if (currentUri !== undefined) {
        ins.uri = currentUri || ''; // クリア操作の場合は空文字
      }
    }
  });
}
```

#### A-6. 復元処理フロー

既存の実験データを読み込む（`convertTemplateDataItemsToTemplates`）際:

```typescript
// InsertionField[] の構築 - rawData.insertions から非カスタムを復元
const rawInsertionsTop = rawData.insertions as Array<Record<string, unknown>> | undefined;
const insertions: InsertionField[] = Array.isArray(rawInsertionsTop)
  ? rawInsertionsTop
      .filter((ins) => !ins.isCustomProperty)
      .map((ins) => ({ ... }))
  : [];

// insertionUris state への復元
tpl.insertions.forEach((ins, insIdx) => {
  if (ins.uri) {
    restoredInsertionUrisMap[tpl.templateId][insIdx] = ins.uri;
  }
});
```

---

### パターン B: カスタムプロパティで Insertion を追加する場合

#### B-1. 概要

実験作業者が任意でファイル添付フィールドを追加できる機能。  
`+ insertion 追加` ボタンから追加する。

#### B-2. データ構造（型定義）

```typescript
// frontend/src/types/experimentWorker.ts

type ContainerType = 'property' | 'content' | 'insertion';
type CustomPropertyType = ... | 'insertion';

interface CustomPropertyValue {
  id: string;                 // UI管理用ユニークID
  key: string;                // insertion の場合は空文字（key属性なし）
  containerType: ContainerType; // 'insertion'
  customType: CustomPropertyType; // 'insertion' 固定
  value: string | null;       // ファイル名（表示用）
  units: string;              // insertion では未使用
  isCustomProperty: true;

  // insertion 専用フィールド
  file?: File;                // 選択済みファイルオブジェクト
  uri?: string;               // S3アップロード後のキー or 復元時の既存URI
  hash?: string;              // SHA256ハッシュ（ファイル選択時に生成）
  format?: string;            // MIMEタイプ（ファイル選択時に自動検出）
}
```

#### B-3. カスタムプロパティ追加処理

```typescript
const handleAddCustomProperty = (containerType: ContainerType) => {
  const defaultType: CustomPropertyType =
    containerType === 'insertion' ? 'insertion' : ...;
  const newItem: CustomPropertyValue = {
    id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    key: '',                    // insertion は key なし
    containerType,              // 'insertion'
    customType: defaultType,    // 'insertion'
    value: null,
    units: '',
    isCustomProperty: true,
  };
  setCustomProperties((prev) => ({
    ...prev,
    [selectedTemplateId]: [...(prev[selectedTemplateId] ?? []), newItem],
  }));
};
```

#### B-4. ファイル選択処理（`handleInsertionFileSelect`）

ファイルが選択された際に以下を実行:

1. `file.type` から MIMEタイプを取得（`format`）
2. `crypto.subtle.digest('SHA-256', arrayBuffer)` で SHA256ハッシュを計算（`hash`）
3. `handleUpdateCustomProperty` を呼び出して `file`・`hash`・`format`・`value`（ファイル名）を更新

```typescript
const handleInsertionFileSelect = async (templateId: string, id: string, file: File) => {
  const format = file.type || 'application/octet-stream';
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  handleUpdateCustomProperty(templateId, id, { file, hash, format, value: file.name });
};
```

#### B-5. UIレンダリング

```tsx
if (cp.containerType === 'insertion') {
  return (
    <div key={cp.id} style={rowStyle}>
      <Tag color="purple">insertion</Tag>
      <Upload
        maxCount={1}
        showUploadList={false}
        beforeUpload={(file) => {
          handleInsertionFileSelect(selectedTemplateId, cp.id, file);
          return false; // 自動アップロードを止める
        }}
      >
        <Button icon={<UploadOutlined />} size="small">
          {cp.value ? cp.value : 'Select File'}
        </Button>
      </Upload>
      {cp.value && <Text type="secondary">{cp.value}</Text>}
      {deleteBtn}
    </div>
  );
}
```

- Key入力欄・型セレクト・単位入力欄はなし（insertion 専用UI）
- Key重複チェックの対象外
- ファイル名は `cp.value` として表示される

#### B-6. 保存処理フロー

```
1. cp.containerType === 'insertion' && cp.file が存在する行のみ S3 アップロード
   → uploadFiles() を呼び出し → S3キーを取得して cp.uri に格納
2. baseData.insertions の既存カスタムエントリをいったんクリア
   （isCustomProperty: true のエントリを除去）
3. 各カスタム insertion エントリを再構築して baseData.insertions に追記
   - uri: 今回アップロード済みS3キー → cp.uri（既存URI） → cp.value（フォールバック）
   - hash, format: cp.hash, cp.format から設定
   - isCustomProperty: true を付与
```

```typescript
const insertionEntry: Record<string, unknown> = {
  uri,
  ...(cp.hash  ? { hash:   { value: cp.hash, method: 'sha256' } } : {}),
  ...(cp.format ? { format: cp.format } : {}),
  isCustomProperty: true,
};
existingInsertions.push(insertionEntry);
```

#### B-7. 復元処理フロー

既存データ読み込み時 (`handleRestoreExistingData`):

```typescript
// rawData.insertions から isCustomProperty: true のエントリを抽出して復元
if (Array.isArray(rawInsertions)) {
  rawInsertions
    .filter((ins) => ins.isCustomProperty)
    .forEach((ins) => {
      const restoredItem: CustomPropertyValue = {
        id: `restored_ins_${Date.now()}_${...}`,
        key: '',                      // insertion に key 属性はない
        containerType: 'insertion',
        customType: 'insertion',
        value: displayName,           // ファイル名（URIから取得）
        // ...
        uri: ins.uri as string,       // 既存URIを保持
      };
    });
}
```

---

## 4. ExperimentPlanDialog での処理（補足）

**ファイル**: `frontend/src/components/project/ExperimentPlanDialog/FieldValueInput.tsx`

実験計画作成画面では `insertion` 型プロパティを **表示のみ** で扱う。  
実際のファイルアップロードは実験実施時（DataRecordDialog）で行う。

```tsx
// ── insertion（表示のみ：ファイル挿入が必要なことを示す情報表示） ──
if (xsi === 'insertion') {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Tag color="purple" icon={<FileTextOutlined />}>Insertion</Tag>
      <span style={{ fontStyle: 'italic', color: '#888', fontSize: 12 }}>
        ※ファイル挿入が必要です（実験実施時に対応）
      </span>
    </div>
  );
}
```

`TemplateInputPanel.tsx` のカスタムプロパティ追加ボタンは **一時非表示**（コメントアウト）。

---

## 5. 関連ファイル一覧

| ファイル | 役割 |
|---------|------|
| `frontend/src/components/editorv2/TemplateEditorDialog.tsx` | テンプレート設計時の insertion 入力UI・保存処理 |
| `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx` | 実験記録時の非カスタム・カスタム insertion 処理 |
| `frontend/src/components/project/ExperimentPlanDialog/FieldValueInput.tsx` | 実験計画時の insertion 表示のみ対応 |
| `frontend/src/components/project/ExperimentPlanDialog/TemplateInputPanel.tsx` | カスタムプロパティ追加UI（insertion ボタンは一時非表示） |
| `frontend/src/types/maiml-unified.ts` | `Insertion` 型定義 |
| `frontend/src/types/experimentWorker.ts` | `InsertionField`, `ContainerType`, `CustomPropertyValue` 型定義 |
| `frontend/src/types/experimentPlanDialog.ts` | `CustomPropContainerType` 型定義 |
| `frontend/src/utils/reactFlowToMaiml.ts` | Template → MAIML XML変換（insertion出力） |
| `frontend/src/utils/multiMethodConverter.ts` | Template → MAIML XML変換（insertion出力） |
| `frontend/src/utils/templateToXML.ts` | テンプレート XML 変換ユーティリティ（insertion出力・パース） |
| `frontend/src/utils/maimlTypeConverter.ts` | XML → 型変換（insertionの変換処理） |
| `frontend/src/components/encryption/EncryptionConfigPanel.tsx` | insertion 含むノード暗号化時の警告表示 |
| `frontend/src/components/viewer/PetriNetViewer.tsx` | insertion 情報の basicInfo への格納（viewer用） |
| `frontend/src/components/viewer/dialogs/SubNetViewer.tsx` | insertion 情報の basicInfo への格納（viewer用） |
| `frontend/src/components/viewer/dialogs/PropertyViewer.tsx` | insertion フィールドのラベル表示 |
| `frontend/src/services/encryptionService.ts` | ノードの insertion 存在確認API（暗号化用） |

---

## 6. 現状の制約・注意事項

| 項目 | 内容 |
|-----|------|
| **対応テンプレート種別** | Material・Result のみ（Condition は非対応） |
| **key 属性** | MAIML仕様上 `insertion` タグは key 属性を持たない。カスタムプロパティの key 重複チェック対象外 |
| **TemplateEditorDialogのURI/Hash** | テンプレート設計時に手動入力する形式。実際のファイルアップロードはしない |
| **DataRecordDialogの非カスタム** | `InsertionField` の `description` / `format` はAPI取得値。ファイル選択時は `getAcceptString(ins.format)` でaccept属性を制御 |
| **DataRecordDialogのカスタム** | ファイル選択時にSHA256ハッシュを `crypto.subtle.digest` でブラウザ側計算。S3アップロードは保存時に実行 |
| **ExperimentPlanDialog** | insertion は表示のみ（カスタム追加ボタンは将来対応予定でコメントアウト中） |
| **isCustomProperty フラグ** | 非カスタム・カスタムの区別に使用。MAIML保存時に `isCustomProperty: true` のエントリのみカスタムとして扱う |
| **XML出力時のuri/hash** | XSD上 uri・hash は必須（minOccurs=1）のため、未入力時も空文字で出力される |

---

## 7. MAIMLファイルを Insertion で添付した場合の問題点

### 7-1. 結論

**技術的には添付操作自体は可能だが、意図した動作にはならず、バックエンドで予期しない副作用が発生する可能性がある。**  
UI・バックエンドのどちらにも「`.maiml`ファイルを Insertion として拒否する」明示的なバリデーションは存在しない。

---

### 7-2. フロントエンド側（拒否ロジックなし）

| ケース | `accept` 属性 | `.maiml` の選択可否 |
|--------|-------------|-------------------|
| カスタムプロパティの Insertion | 指定なし | **可能** |
| テンプレート指示の Insertion（`ins.format` 未設定） | `undefined`（制限なし） | **可能** |
| テンプレート指示の Insertion（`ins.format` 設定済み） | `getAcceptString(ins.format)` の値次第（`application/xml` → `.xml` のみ） | `.maiml` 拡張子は対象外 |

`getAcceptString()`（`DataRecordDialog.tsx` L293）の `formatMap` に `.maiml` 向けエントリは登録されていないため、`format` が `application/xml` として設定されている場合でも `.xml` のみが `accept` 対象となる（`.maiml` は制限される）。`format` が未設定の場合は全ファイル選択可能。

---

### 7-3. バックエンド側で発生する問題（`backend/src/services/fileAccessService.ts`）

Insertion ファイルのアップロード先パスは以下に固定されている：

```
projects/{projectName}/attachments/
```

バックエンドの `uploadFiles()` はファイル判定を **拡張子のみ** で行うため、`attachments/` 配下の `.maiml` ファイルも「プロジェクト本体の MAIML」と同一のロジックで処理される。

#### 問題 1: E7013 エラーによるアップロード拒否

```typescript
// fileAccessService.ts L444
if (sanitizedFileName.endsWith('.maiml') && normalizedPath.startsWith('projects/')) {
```

`projects/{projectName}/attachments/` は `projects/` で始まるため **この条件が true** となり、  
本体 MAIML 登録済みプロジェクトへ Insertion 添付として `.maiml` をアップロードした場合、  
Parent UUID チェーン一致チェックが実行される。チェーン不一致の場合は `E7013`（「別のMAIMLファイルへの上書きは許可されていません」）で**アップロード自体が拒否される**。

| プロジェクト状態 | 結果 |
|---------------|------|
| 本体 MAIML 未登録 | E7013 は発生しないがアーカイブチェック（下記問題3）が実行される |
| 本体 MAIML 登録済み（Parent チェーン一致） | アップロード成功するが問題2・3が発生 |
| 本体 MAIML 登録済み（Parent チェーン不一致） | **E7013 でアップロード拒否** |

#### 問題 2: MAIML 構文解析・バリデーションの実行

```typescript
// fileAccessService.ts L560
const isMaiml = sanitizedFileName.toLowerCase().endsWith('.maiml');
if (isMaiml) {
  analyzeMaiMLFile(organizationId, content, fullFileKey, true, 'lenient');
}
```

Insertion 添付として意図した `.maiml` ファイルに対しても `analyzeMaiMLFile()` が実行される。  
MAIML として不正な構造の場合は致命的エラーとなりアップロードが中断される。

#### 問題 3: `project_maiml_flg` の意図しない書き換え

```typescript
// fileAccessService.ts L792
if (hasMaimlFile && targetPath.startsWith('projects/')) {
  // project_maiml_flg を true に更新する処理
}
```

プロジェクトの `project_maiml_flg` が `false`（本体 MAIML 未登録）の状態で、  
Insertion 添付として `.maiml` をアップロードすると、**フラグが誤って `true` に書き換わる**可能性がある。

---

### 7-4. まとめ

| 観点 | 内容 |
|------|------|
| **添付可否** | UIレベルでは選択可能（拒否ロジックなし）、バックエンドで問題が発生する場合がある |
| **主要なリスク** | E7013 拒否 / `project_maiml_flg` 誤更新 / MAIML バリデーションの誤実行 |
| **根本原因** | `projects/` 配下かつ `.maiml` 拡張子であれば問答無用で本体 MAIML として扱う実装になっているため |
| **対応策（未実施）** | `attachments/` フォルダを除外する条件を追加するか、フロントエンドで `.maiml` の Insertion 添付を明示的に拒否する |
