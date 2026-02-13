# PetriNetEditorInner.tsx - Phase 4 引継ぎ資料

## メタデータ
- **作成日時**: 2026-02-04 14:00
- **前セッション終了時刻**: 2026-02-04 13:57
- **タスクID**: PetriNetEditorInner_maimlParserTyped移行
- **現在のフェーズ**: Phase 4（型エラー修正）
- **Context Window使用率**: 91%（新セッション推奨）

---

## 📋 完了した作業（Phase 1-3）

### Phase 1: 現状分析と問題箇所の特定 ✅
- PetriNetEditorInner.tsx内のDOM API使用箇所を確認
- 既に`MaimlParserTyped`を使用していることを確認
- 型定義の不統一を発見

### Phase 2: maimlParserTyped導入準備 ✅
- `MaimlParserTyped`と`maiml-unified.ts`のimportを確認
- 既に導入済みであることを確認

### Phase 3: 型定義のXSD準拠化 ✅

#### 3-1. XSD準拠型のimport追加
**ファイル**: `frontend/src/components/editorv2/types/index.ts`

追加したimport:
```typescript
import type {
  Creator,
  Vendor,
  Owner,
  Instrument,
  Place,
  Arc,
} from '@/types/maiml-unified';
```

#### 3-2. 重複型定義の削除
以下の独自型定義を削除（XSD準拠版を使用）:
- `Creator`型
- `Vendor`型
- `Owner`型
- `Instrument`型

**保持した型定義**:
- `RefObject`: エディター固有の参照形式
- `SignatureData`: DocumentEditDialog用の独自型

#### 3-3. DocumentData型のXSD準拠化

**新しいDocumentData型の構造**:

```typescript
export interface DocumentData {
  // XSD準拠プロパティ（必須）
  id: string;
  uuid: string;
  name?: string;
  description?: string;
  annotation?: string;
  creator: Creator[];        // XSD準拠: 配列、必須
  vendor: Vendor[];          // XSD準拠: 配列、必須
  owner: Owner[];            // XSD準拠: 配列、必須
  instrument?: Instrument[]; // XSD準拠: 配列、オプショナル
  date?: string;
  Signature?: any;
  chain?: any[];
  parent?: any[];
  
  // エディター用拡張プロパティ
  protocolId?: string;
  methodId?: string;
  pnmlId?: string;
  programId?: string;
  signature?: SignatureData;
  
  // 後方互換性プロパティ（@deprecated）
  /** @deprecated creator配列を使用してください */
  creators?: Creator[];
  /** @deprecated vendor配列を使用してください */
  vendors?: Vendor[];
  /** @deprecated owner配列を使用してください */
  owners?: Owner[];
  /** @deprecated instrument配列を使用してください */
  instruments?: Instrument[];
}
```

#### 3-4. PetriNetEditorInner.tsxの修正

**修正箇所1**: 新規作成時のdocumentData初期化（Line 590付近）

```typescript
// ✅ Phase 4: XSD準拠のDocumentData型に修正
const initialDocumentData: DocumentData = {
  id: `document_${Date.now()}`,
  uuid: uuidFull,
  name: baseFileName || 'document',
  description: '',
  date: formattedDate,
  // XSD準拠プロパティ（配列、必須）
  creator: [{ id: 'Creator', name: '', uuid: crypto.randomUUID(), description: '', annotation: '' }],
  vendor: [{ id: 'Vendor', name: '', uuid: crypto.randomUUID(), description: '', annotation: '' }],
  owner: [{ id: 'Owner', name: '', uuid: crypto.randomUUID(), description: '', annotation: '' }],
  instrument: [{ id: 'Instrument', name: '', uuid: crypto.randomUUID(), description: '', annotation: '' }],
  // エディター用拡張プロパティ
  protocolId: `protocol_${Date.now()}`,
  methodId: `method_${Date.now()}`,
  pnmlId: `pnml_${Date.now()}`,
  programId: `program_${Date.now()}`,
};
```

**修正箇所2**: Document情報抽出処理の変数スコープ修正（Line 1278付近）

```typescript
// Phase 3.2: maimlParserTyped.getDocument()を使用してDocument情報を抽出
try {
  const docParser = new MaimlParserTyped(maimlData);
  const extractedDoc = docParser.getDocument();
  
  if (extractedDoc) {
    const documentWithCorrectName: DocumentData = {
      ...extractedDoc,
      name: props.originalFileName 
        ? props.originalFileName.replace('.maiml', '') 
        : (extractedDoc.name || 'document')
    };
    setDocumentData(documentWithCorrectName);
  }
} catch (docError) {
  console.warn('⚠️ [PetriNetEditorInner] Document情報の取得に失敗:', docError);
}
```

---

## 🚧 残っている作業（Phase 4-6）

### Phase 4: 型エラー修正（11件）

#### エラー1-2: TemplateMap型の互換性エラー
**場所**: Line 1008, 1245

**エラー内容**:
```
型 'Record<string, TemplateMapEntry>' の引数を型 'TemplateMap' のパラメーターに割り当てることはできません。
'string' インデックス シグネチャに互換性がありません。
  型 'TemplateMapEntry' を型 'Template' に割り当てることはできません。
    プロパティ 'uuid' の型に互換性がありません。
      型 'string | undefined' を型 'string' に割り当てることはできません。
```

**修正方針**:
1. `TemplateMapEntry`の`uuid`を必須（`string`）に変更
2. または`buildTemplateMap`内で`uuid`が必ず存在することを保証

**修正対象ファイル**:
- `frontend/src/utils/petriNetExtractor.ts`（TemplateMapEntry型定義）
- または`frontend/src/components/editorv2/types/index.ts`（TemplateMap型定義）

#### エラー3-5: TemplateRef型の未解決エラー
**場所**: Line 1905, 2175, 3341

**エラー内容**:
```
'TemplateRef' という名前は見つかりません。'Template' ですか?
```

**修正方針**:
1. `TemplateRef`を`Template`に置換
2. またはTemplateRef型をimport/定義

**確認が必要**:
- `TemplateRef`は廃止された型名かどうか
- `Template`（XSD準拠）で置き換え可能か

#### エラー6-7: properties型の互換性エラー
**場所**: Line 2216, 2275

**エラー内容**:
```
型 'Property[]' を型 'Record<string, unknown>' に割り当てることはできません。
型 'never[]' を型 'Record<string, unknown>' に割り当てることはできません。
```

**修正方針**:
1. `convertNestedPropertiesToArray`の戻り値型を確認
2. 配列を期待している箇所でRecord型を受け取っている可能性
3. 型アサーションまたは型変換を追加

#### エラー8: lastAutoSaveTime型の不一致
**場所**: Line 3228

**エラー内容**:
```
型 'Date | null' を型 'number | null' に割り当てることはできません。
  型 'Date' を型 'number' に割り当てることはできません。
```

**修正方針**:
1. `lastAutoSaveTime`が`number | null`を期待
2. `Date`オブジェクトを渡している箇所で`.getTime()`を使用
3. または`lastAutoSaveTime`の型定義を`Date | null`に変更

#### エラー9: category型の互換性エラー
**場所**: Line 3503

**エラー内容**:
```
型 'string' を型 '"material" | "condition" | "result"' に割り当てることはできません。
```

**修正方針**:
1. category変数を`'material' | 'condition' | 'result'`型にキャスト
2. または型定義を修正してstring型を許容

#### エラー10: methodId型のnull/undefined不一致
**場所**: Line 3702

**エラー内容**:
```
型 'string | null' を型 'string | undefined' に割り当てることはできません。
  型 'null' を型 'string | undefined' に割り当てることはできません。
```

**修正方針**:
1. `null`を`undefined`に変換: `value ?? undefined`
2. または型定義で`null`を許容

---

## 📝 次のセッションでの作業手順

### Step 1: 計画書の確認
```bash
# 計画書を開く
code docs/20250204_1323_PetriNetEditorInner_maimlParserTyped移行_PLAN.md
```

### Step 2: 型エラーの確認
```bash
# TypeScriptコンパイラでエラーを確認
cd frontend
npx tsc --noEmit
```

### Step 3: エラー修正（優先順位順）

#### 優先度1: TemplateRef型の未解決エラー（3箇所）
**理由**: 他のエラーに影響する可能性が高い

1. Line 1905, 2175, 3341の`TemplateRef`を確認
2. `Template`型に置換できるか検討
3. 必要に応じて型定義を追加

#### 優先度2: TemplateMap型の互換性エラー（2箇所）
**理由**: buildTemplateMapの戻り値型に関わる

1. `frontend/src/utils/petriNetExtractor.ts`を開く
2. `TemplateMapEntry`の`uuid`を必須に変更
3. または`buildTemplateMap`内でuuid生成を保証

#### 優先度3: その他の型エラー（6箇所）
**理由**: 個別の修正で対応可能

1. properties型エラー（Line 2216, 2275）
2. lastAutoSaveTime型エラー（Line 3228）
3. category型エラー（Line 3503）
4. methodId型エラー（Line 3702）

### Step 4: コンパイル確認
```bash
# エラーがなくなるまで繰り返し
npx tsc --noEmit
```

### Step 5: 動作確認（Phase 5）
1. 開発サーバー起動
2. 新規作成モードで動作確認
3. 既存ファイル読み込みで動作確認
4. Document情報表示の確認

### Step 6: リファクタリング（Phase 6）
1. 不要なコードの削除
2. コメントの更新
3. 型定義の最適化

---

## 🔧 修正のためのコマンド集

### TypeScriptエラー確認
```bash
cd frontend
npx tsc --noEmit | grep "PetriNetEditorInner.tsx"
```

### 特定行のエラー確認
```bash
npx tsc --noEmit | grep "PetriNetEditorInner.tsx:1905"
```

### ESLintエラー確認
```bash
npx eslint src/components/editorv2/PetriNetEditorInner.tsx
```

---

## 📚 参考ファイル

### 型定義ファイル
- `frontend/src/components/editorv2/types/index.ts` - エディター型定義
- `frontend/src/types/maiml-unified.ts` - XSD準拠型定義
- `frontend/src/utils/petriNetExtractor.ts` - TemplateMapEntry型定義

### 実装ファイル
- `frontend/src/components/editorv2/PetriNetEditorInner.tsx` - メインファイル
- `frontend/src/utils/maimlParserTyped.ts` - パーサー実装

### ドキュメント
- `docs/20250204_1323_PetriNetEditorInner_maimlParserTyped移行_PLAN.md` - タスク計画書

---

## 🎯 期待される最終状態

### Phase 4完了時
- [ ] TypeScriptエラー: 0件
- [ ] ESLintエラー: 0件（any型は許容）
- [ ] コンパイル成功
- [ ] 型安全性の向上

### Phase 5完了時
- [ ] 新規作成モードで正常動作
- [ ] 既存ファイル読み込みで正常動作
- [ ] Document情報が正しく表示

### Phase 6完了時
- [ ] コードがクリーン
- [ ] コメントが最新
- [ ] 不要なコードが削除済み

---

## 💡 Tips

### 型エラー修正の基本方針
1. **まずエラーメッセージを正確に読む**
2. **期待される型と実際の型を比較**
3. **最小限の変更で修正**
4. **型アサーションは最後の手段**

### よくある修正パターン

#### パターン1: null/undefined の違い
```typescript
// ❌ 悪い例
const value: string | undefined = null; // エラー

// ✅ 良い例
const value: string | undefined = undefined;
// または
const value: string | null | undefined = null;
// または
const value: string | undefined = nullValue ?? undefined;
```

#### パターン2: Union型の絞り込み
```typescript
// ❌ 悪い例
const category: string = 'material';
const typed: 'material' | 'condition' | 'result' = category; // エラー

// ✅ 良い例
const category = 'material' as const;
const typed: 'material' | 'condition' | 'result' = category;
// または
const category: 'material' | 'condition' | 'result' = 'material';
```

#### パターン3: 配列 vs Record
```typescript
// ❌ 悪い例
const properties: Record<string, unknown> = []; // エラー

// ✅ 良い例
const properties: Property[] = [];
// または
const properties: Record<string, unknown> = {};
```

---

## 📞 問題が発生した場合

### Context Windowが不足した場合
1. 新しいセッションを開始
2. この引継ぎ資料を参照
3. 計画書（`docs/20250204_1323_PetriNetEditorInner_maimlParserTyped移行_PLAN.md`）を確認

### 修正方針が不明な場合
1. エラーメッセージの詳細を確認
2. 該当する型定義ファイルを確認
3. XSD準拠型（`maiml-unified.ts`）を参照

### テストが失敗する場合
1. TypeScriptエラーを先に解消
2. 開発サーバーで動作確認
3. Console Logでデバッグ

---

## ✅ チェックリスト

次のセッション開始時に確認:

- [ ] この引継ぎ資料を読んだ
- [ ] 計画書を確認した
- [ ] TypeScriptエラーを確認した
- [ ] 修正の優先順位を理解した
- [ ] 必要なファイルを開いた

作業完了時に確認:

- [ ] TypeScriptエラー: 0件
- [ ] ESLintエラー: 許容範囲内
- [ ] コンパイル成功
- [ ] 動作確認完了
- [ ] 計画書を更新した

---

**次のセッションでの成功を祈ります！**