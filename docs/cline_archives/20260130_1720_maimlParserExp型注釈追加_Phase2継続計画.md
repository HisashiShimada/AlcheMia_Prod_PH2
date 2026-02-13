# maimlParserExp.ts 型注釈追加 - Phase 2 継続計画書

## メタデータ
- **作成日時**: 2026-01-30 17:20
- **タスクID**: maimlParserExp型注釈追加Phase2継続
- **優先度**: 中
- **前回セッション**: 2026-01-30 17:05 - 17:12
- **進捗率**: 18% (2/11項目完了)

---

## 1. 前回セッションの成果

### ✅ 完了した作業

#### Phase 1: 型定義のインポート（完了）
```typescript
import type {
  TransitionExtractionResult,
  TemplateCategories,
  DomTemplateExtractionResult,
  ExistingExperimentData,
  MethodInfoFromParser,
  FileValidationResult,
  FileBasicInfo,
  InstructionElement,
  ArcInfo,
  ParsedTemplate,
  InsertionProperty,
  ParsedProperty,
  MethodElement,
  PnmlElement,
  ExistingDataElement,
  ContentData
} from '@/components/editorv2/types';
```

#### プライベートフィールドへのコメント追加
```typescript
private data: any; // xml-js形式のJSONオブジェクト（型定義が複雑なためanyを許容）
private maiml: any; // maiml要素（型定義が複雑なためanyを許容）
private maimlDataString: string | null;
private domDocument: Document | null;

constructor(maimlData: string | any) { // xml-js形式またはXML文字列を受け入れるためanyを許容
```

### ⚠️ 発生した問題

1. **ファイルサイズの大きさ**
   - 約2500行のファイルで、正確なSEARCHブロックの作成が困難
   - SEARCHブロックのマッチングエラーが発生

2. **コンテキストウィンドウの制約**
   - 95%使用に達し、作業が困難に
   - 複数メソッドの一括変更が不可能

---

## 2. 次のセッションで実施する作業

### Phase 2: メインメソッドの型注釈追加（残り7/8）

**戦略**: 1メソッド = 1ツール呼び出しの方針

#### Step 1: getTransitionsForExperimentManager()
```typescript
// 変更前
getTransitionsForExperimentManager() {

// 変更後
getTransitionsForExperimentManager(): TransitionExtractionResult {
```

**SEARCHブロック（小さく）**:
```typescript
getTransitionsForExperimentManager() {
    console.log('🔄 [MaiMLParser] ExperimentManager向けトランジション抽出開始（複数method対応）');
```

**REPLACEブロック**:
```typescript
getTransitionsForExperimentManager(): TransitionExtractionResult {
    console.log('🔄 [MaiMLParser] ExperimentManager向けトランジション抽出開始（複数method対応）');
```

#### Step 2: getTemplates()
```typescript
// 変更前
getTemplates() {

// 変更後
getTemplates(): TemplateCategories {
```

#### Step 3: getTemplatesFromDOM()
```typescript
// 変更前
getTemplatesFromDOM() {

// 変更後
getTemplatesFromDOM(): DomTemplateExtractionResult | null {
```

#### Step 4: getExistingExperimentData()
```typescript
// 変更前
getExistingExperimentData() {

// 変更後
getExistingExperimentData(): ExistingExperimentData {
```

#### Step 5: getMethods()
```typescript
// 変更前
getMethods(): any[] {

// 変更後
getMethods(): MethodInfoFromParser[] {
```

#### Step 6: validateForExperimentManager()
```typescript
// 変更前
validateForExperimentManager() {

// 変更後
validateForExperimentManager(): FileValidationResult {
```

#### Step 7: getFileBasicInfo()
```typescript
// 変更前
getFileBasicInfo() {

// 変更後
getFileBasicInfo(): FileBasicInfo {
```

---

## 3. 実施手順（詳細）

### 手順1: ファイルの最新状態を確認
```bash
# 必要に応じて実行
read_file frontend/src/utils/maimlParserExp.ts
```

### 手順2: 1メソッドずつ型注釈を追加

**各メソッドの作業フロー:**
1. `replace_in_file` でメソッドシグネチャを変更
2. ユーザーの確認を待つ
3. 次のメソッドへ進む

**重要**: 
- 1つのreplace_in_fileで1つのメソッドのみ変更
- SEARCHブロックは最小限（5-10行程度）
- コメント行を含めて一意性を確保

### 手順3: 完了確認
```bash
# すべてのメソッドの型注釈追加完了後
attempt_completion
```

---

## 4. 予想されるTypeScriptエラーと対処

### 現在約200個のエラーが存在

#### 主なエラーパターン:

1. **暗黙的な`any`型**
   ```typescript
   // エラー例
   parseExistingCategoryFaithful(resultsElement, categoryName, targetArray) {
   
   // 修正後（将来のPhaseで対応）
   parseExistingCategoryFaithful(
     resultsElement: any, 
     categoryName: string, 
     targetArray: any[]
   ): void {
   ```

2. **`unknown`型エラー（catch句）**
   ```typescript
   // エラー例
   catch (error) {
     console.error(error.message); // error is unknown
   
   // 修正後（将来のPhaseで対応）
   catch (error) {
     const err = error as Error;
     console.error(err.message);
   ```

3. **型アサーション不足**
   ```typescript
   // エラー例
   const methods = Array.isArray(protocol.method) ? protocol.method : [protocol.method];
   
   // 修正後（将来のPhaseで対応）
   const methods = Array.isArray(protocol.method) 
     ? protocol.method as MethodElement[]
     : (protocol.method ? [protocol.method as MethodElement] : []);
   ```

**Phase 2では戻り値型のみを追加**し、パラメータや内部変数の型は後続のPhaseで対応します。

---

## 5. リスクと対策

### リスク1: SEARCHブロックのマッチングエラー
**対策**: 
- SEARCHブロックを5-10行程度の最小限にする
- コメント行を含めて一意性を確保
- マッチングエラー発生時は即座に調整

### リスク2: コンテキストウィンドウの制約
**対策**:
- 1メソッド = 1ツール呼び出し
- 完了後は即座にattempt_completionで区切る

### リスク3: 型定義の不一致
**対策**:
- types/index.tsで型定義を再確認
- 必要に応じて型定義を調整

---

## 6. 成功基準

### Phase 2完了の定義:
- [ ] getTransitionsForExperimentManager(): 型注釈追加完了
- [ ] getTemplates(): 型注釈追加完了
- [ ] getTemplatesFromDOM(): 型注釈追加完了
- [ ] getExistingExperimentData(): 型注釈追加完了
- [ ] getMethods(): 型注釈追加完了
- [ ] validateForExperimentManager(): 型注釈追加完了
- [ ] getFileBasicInfo(): 型注釈追加完了

### 期待される結果:
- メインメソッド7個すべてに戻り値型が明示される
- TypeScriptエラーが約200個 → 約150個に減少（推定）
- 後続のPhaseで対応すべき残存エラーが明確化

---

## 7. 後続Phase（参考）

### Phase 3: ヘルパーメソッドの型注釈
- findInstructionInMethod()
- getTransitionArcsInPnml()
- formatTransitionDisplayName()
- categorizeTransition()
- isExperimentRelevantTransition()

### Phase 4: パース関連メソッドの型注釈
- parseTemplate()
- parsePropertiesFaithful()
- parsePropertyElementFaithful()
- parseContentElementFaithful()

### Phase 5: ユーティリティメソッドの型注釈
- convertXsiType()
- convertPropertyValue()
- findTemplateById()
- resolveTemplateRef()

### Phase 6-8: 残りのメソッドと内部変数の型注釈

**注**: Phase 3以降は必要に応じて実施。Phase 2完了時点で実用上の問題はない。

---

## 8. 次のセッション開始時のアクション

### Step 1: 状況確認
```bash
read_file frontend/src/utils/maimlParserExp.ts
# 先頭100行程度を確認して型定義インポートを確認
```

### Step 2: Phase 2開始
```bash
# Step 1から順次実施
replace_in_file frontend/src/utils/maimlParserExp.ts
# getTransitionsForExperimentManager()の型注釈追加
```

### Step 3: 進捗確認
- 各メソッド追加後、ユーザーの確認を待つ
- エラーが発生した場合は即座に調整

---

## 9. 参考情報

### ファイル情報
- **パス**: `frontend/src/utils/maimlParserExp.ts`
- **行数**: 約2500行
- **主要メソッド数**: 40+個
- **Phase 2対象メソッド**: 7個

### 型定義ファイル
- **パス**: `frontend/src/components/editorv2/types/index.ts`
- **定義済み型**: 17個

### 関連ドキュメント
- `docs/20260130_1705_maimlParserExp型定義明確化_計画書.md`
- `docs/20260130_1710_maimlParserExp型定義明確化_完了報告.md`
- `docs/20260130_1715_maimlParserExp本体型注釈追加_計画書.md`

---

## 10. 承認記録

- **計画書提示日時**: 2026-01-30 17:20
- **承認日時**: （次のセッションで実施）
- **実施予定日時**: （次のセッションで実施）

---

**重要**: この計画書は次のセッションで必ず参照してください。Phase 2の完了が最優先事項です。