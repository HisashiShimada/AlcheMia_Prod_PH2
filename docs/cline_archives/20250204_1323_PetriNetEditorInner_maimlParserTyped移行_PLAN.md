# PetriNetEditorInner.tsx - maimlParserTyped.ts移行タスク計画書

## メタデータ
- **作成日時**: 2026-02-04 13:23
- **タスクID**: PetriNetEditorInner_maimlParserTyped移行
- **優先度**: 中
- **推定工数**: 3時間

## 1. タスク概要

PetriNetEditorInner.tsx内でDOM APIやxml-jsを直接使用してMAIMLファイルをパースしている箇所を、`frontend/src/utils/maimlParserTyped.ts`の型安全なパース処理に置き換え、XSD準拠の型定義（`frontend/src/types/maiml-unified.ts`）を使用するように変更する。

## 2. 目的と期待される成果

### 目的
- DOM API依存を削除し、型安全なパーサーに統一
- XSD準拠の型定義を使用して型安全性を向上
- コードの保守性と可読性を改善
- パース処理を一元化してバグを減少

### 期待される成果
- [x] DOM APIを使用したXMLパース処理の削除
- [x] maimlParserTyped.tsのMaimlParserTypedクラスを使用
- [x] XSD準拠型（maiml-unified.ts）のみを使用
- [x] 既存機能の動作を維持
- [x] 型エラーの解消

## 3. 実装ステップ

### Phase 1: 現状分析と問題箇所の特定
- [x] PetriNetEditorInner.tsx内のDOM API使用箇所を特定
- [x] 直接XMLパースしている箇所を特定
- [x] 依存する型定義を確認
- [x] 影響範囲を分析

### Phase 2: maimlParserTyped導入準備
- [ ] MaimlParserTypedのインポート追加
- [ ] XSD準拠型定義（maiml-unified.ts）のインポート追加
- [ ] 既存の不要なimportを削除準備

### Phase 3: DOM APIパース処理の置き換え
- [ ] 共通テンプレート検出ロジックの書き換え（519行目付近）
  - DOMParser → MaimlParserTypedに変更
  - querySelector → maimlParserTyped.getTemplates()に変更
- [ ] Document情報抽出の書き換え（622行目）
  - extractDocumentFromMaiML → maimlParserTyped.getProtocol().documentに変更

### Phase 4: 型定義の修正
- [ ] any型の使用を削除
- [ ] XSD準拠型（Template, PlaceRef等）に統一
- [ ] 型エラーの修正

### Phase 5: テストと動作確認
- [ ] 共通テンプレート検出が正しく動作するか確認
- [ ] Document情報が正しく表示されるか確認
- [ ] 複数methodモードでの動作確認
- [ ] エラーハンドリングの確認

### Phase 6: リファクタリングとクリーンアップ
- [ ] 不要なコードの削除
- [ ] コメントの更新
- [ ] 型定義の最適化

## 4. 影響範囲

### 変更するファイル
1. `frontend/src/components/editorv2/PetriNetEditorInner.tsx`
   - DOM APIパース処理の削除（519行目付近）
   - Document抽出処理の変更（622行目付近）
   - 型定義の変更（any型削除、XSD準拠型使用）
   - importの追加/削除

### 新規作成するファイル
なし

### 削除するファイル
なし

### 影響を受ける機能
- 共通テンプレート検出機能（複数methodでの共通テンプレート判定）
- Document情報表示機能（ファイル名、UUID、作成者等）
- MAIMLファイル読み込み処理全般

## 5. 実装方針

### 基本方針

#### 1. 段階的な置き換えを実施
- 一度にすべてを変更せず、**1箇所ずつ置き換えて動作確認**を行う
- 各置き換え箇所で**ユーザーに確認を求める**
- 動作に問題があれば、その箇所を修正してから次に進む

#### 2. 型安全性を最優先
- `any`型を一切使用しない
- XSD準拠型（`maiml-unified.ts`）のみを使用
- 型エラーは完全に解消する

#### 3. 既存機能を維持
- DOM APIからの移行後も、同じ結果が得られることを確認
- 共通テンプレート検出ロジックの動作を保証
- Document情報の欠損がないことを確認

#### 4. パフォーマンスを考慮
- `MaimlParserTyped`インスタンスの生成は最小限に
- 必要に応じてインスタンスを再利用
- 不要なパース処理を削減

#### 5. エラーハンドリングを強化
- `MaimlParserTyped`のコンストラクタがthrowする可能性を考慮
- try-catchで適切にエラーをキャッチ
- エラーメッセージをユーザーフレンドリーに

### 置き換え方針の詳細

#### 置き換え箇所1: 共通テンプレート検出（519行目付近）

**現状の問題点:**
- DOMParserを使用したXMLパース（ブラウザ依存）
- querySelector系API（セキュリティリスク）
- 型安全性なし（Element型）

**置き換え方針:**
1. `MaimlParserTyped`インスタンスを生成
2. `getTemplates()`で全テンプレートを取得
3. 各テンプレートの`placeRef`配列を直接チェック
4. XSD準拠型（`Template`, `PlaceRef`）を使用

**確認ポイント:**
- 複数placeRefを持つテンプレートが正しく検出されるか
- commonTemplateIdsとcommonTemplateRefMapが正しく構築されるか
- 既存の動作と完全に一致するか

#### 置き換え箇所2: Document情報抽出（622行目）

**現状の問題点:**
- `extractDocumentFromMaiML()`関数（内部実装不明）
- Document構造の型安全性なし

**置き換え方針:**
1. `MaimlParserTyped`インスタンスを生成（または再利用）
2. `getTypedMaiml().document`で直接取得
3. XSD準拠型（`Document`）を使用
4. フォールバック処理を実装（documentがない場合）

**確認ポイント:**
- Document情報が正しく抽出されるか
- ファイル名の優先順位（originalFileName > document.name）が維持されるか
- creators, vendors, owners, instrumentsが正しく取得されるか

### インスタンス管理方針

#### パターンA: 各箇所で個別に生成（推奨）
```typescript
// 箇所1: 共通テンプレート検出
const parser1 = new MaimlParserTyped(maimlData);
const templates = parser1.getTemplates();
// ...

// 箇所2: Document抽出
const parser2 = new MaimlParserTyped(maimlData);
const document = parser2.getTypedMaiml().document;
// ...
```

**メリット:**
- コードが独立しており、読みやすい
- 各箇所での責任が明確

**デメリット:**
- パース処理が2回実行される（パフォーマンス面）

#### パターンB: 1つのインスタンスを再利用（パフォーマンス重視）
```typescript
// 1度だけパース
const parser = new MaimlParserTyped(maimlData);

// 箇所1: 共通テンプレート検出
const templates = parser.getTemplates();
// ...

// 箇所2: Document抽出
const document = parser.getTypedMaiml().document;
// ...
```

**メリット:**
- パース処理が1回のみ（パフォーマンス向上）

**デメリット:**
- コードの結合度が上がる

**採用方針: パターンAを採用**
- 理由: 可読性と保守性を優先
- 将来的にパフォーマンスが問題になった場合のみパターンBを検討

### エラーハンドリング方針

#### パース失敗時の対応
```typescript
try {
  const parser = new MaimlParserTyped(maimlData);
  // ...
} catch (err) {
  console.error('❌ MAIMLパースエラー:', err);
  // 既存のエラーハンドリングにフォールバック
  // または、ユーザーにわかりやすいエラーメッセージを表示
}
```

#### 段階的なフォールバック
1. `MaimlParserTyped`での型安全なパース
2. パース失敗時は既存のDOM API処理にフォールバック（暫定）
3. 最終的にDOM APIは完全に削除

### 確認プロセス

#### 各置き換え後の確認事項
1. **コンパイルエラー**がないことを確認
2. **型エラー**がないことを確認
3. **動作確認**: 
   - ブラウザで実際にMAIMLファイルを読み込む
   - 共通テンプレートが正しく表示されるか
   - Document情報が正しく表示されるか
4. **ログ確認**: コンソールログでパース処理が成功しているか確認
5. **ユーザーに確認を求める**: 問題がなければ次の箇所へ進む

## 6. 技術的詳細

### 使用する技術・ライブラリ
- **maimlParserTyped.ts**: 型安全なMAIMLパーサー（MaimlParserTypedクラス）
- **maiml-unified.ts**: XSD準拠の型定義
- **既存**: xml-jsライブラリ（maimlParserTyped内部で使用）

### 現在のコード（変更前）

#### 1. 共通テンプレート検出（519行目付近）
```typescript
// 🎯 共通テンプレート検出: 複数placeRefを持つテンプレートを特定
const domParser = new DOMParser();
const xmlDoc = domParser.parseFromString(maimlData, "text/xml");

const commonTemplateIds = new Set<string>();
const commonTemplateRefMap: Record<string, string> = {};

const allTemplates = [
  ...xmlDoc.querySelectorAll('materialTemplate'),
  ...xmlDoc.querySelectorAll('conditionTemplate'),
  ...xmlDoc.querySelectorAll('resultTemplate')
];

allTemplates.forEach((templateEl: Element) => {
  const templateId = templateEl.getAttribute('id');
  const placeRefs = Array.from(templateEl.querySelectorAll('placeRef'));
  // ...
});
```

#### 2. Document情報抽出（622行目）
```typescript
const extractedDocument = extractDocumentFromMaiML(maimlData);
if (extractedDocument) {
  const documentWithCorrectName = {
    ...extractedDocument,
    name: props.originalFileName 
      ? props.originalFileName.replace('.maiml', '') 
      : (extractedDocument.name ?? 'document')
  };
  setDocumentData(documentWithCorrectName);
}
```

### 変更後のコード（設計）

#### 1. 共通テンプレート検出（maimlParserTyped使用）
```typescript
// MaimlParserTypedインスタンス作成
const parser = new MaimlParserTyped(maimlData);

// テンプレート取得
const templates = parser.getTemplates();
const allTemplates = [
  ...templates.materials,
  ...templates.conditions,
  ...templates.results
];

const commonTemplateIds = new Set<string>();
const commonTemplateRefMap: Record<string, string> = {};

// 各テンプレートのplaceRef配列をチェック
allTemplates.forEach((template: Template) => {
  const placeRefs = template.placeRef || [];
  
  if (placeRefs.length > 1) {
    commonTemplateIds.add(template.id);
    
    // 最初のplaceRef以外を参照マップに追加
    const firstPlaceRef = placeRefs[0].ref;
    for (let i = 1; i < placeRefs.length; i++) {
      const placeRef = placeRefs[i].ref;
      if (placeRef) {
        commonTemplateRefMap[placeRef] = firstPlaceRef;
      }
    }
  }
});
```

#### 2. Document情報抽出（maimlParserTyped使用）
```typescript
// MaimlParserTypedからDocument取得
const parser = new MaimlParserTyped(maimlData);
const maimlRoot = parser.getTypedMaiml();
const document = maimlRoot.document;

if (document) {
  const documentWithCorrectName = {
    id: document.id,
    uuid: document.uuid,
    name: props.originalFileName 
      ? props.originalFileName.replace('.maiml', '') 
      : (document.name || 'document'),
    description: document.description || '',
    date: document.date || new Date().toISOString(),
    creators: document.creator || [],
    vendors: document.vendor || [],
    owners: document.owner || [],
    instruments: document.instrument || [],
  };
  setDocumentData(documentWithCorrectName);
}
```

### アーキテクチャ上の考慮事項

#### 型安全性の確保
- any型を一切使用しない
- XSD準拠型（Template, PlaceRef, Document等）のみを使用
- 型エラーを完全に解消

#### パフォーマンス
- MaimlParserTypedインスタンスの生成回数を最小化
- 必要に応じてインスタンスを再利用

#### エラーハンドリング
- MaimlParserTypedのコンストラクタがthrowする可能性を考慮
- try-catchで適切にエラーをキャッチ
- エラーメッセージをユーザーに分かりやすく表示

### セキュリティ考慮事項
- DOM APIを使用しないため、XSS脆弱性のリスクを削減
- maimlParserTyped内部でxml-jsを使用（安全なパーサー）

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 共通テンプレート検出ロジックの動作不一致 | 高 | 中 | 段階的に実装し、各ステップで動作確認 |
| Document情報の欠損 | 中 | 低 | フォールバック処理を実装 |
| 型エラーの多発 | 中 | 中 | Phase 4で集中的に対応 |
| パフォーマンス劣化 | 低 | 低 | 必要に応じてインスタンスを再利用 |

## 7. テスト計画

### ユニットテスト
- [ ] MaimlParserTypedが正しくインスタンス化されるか
- [ ] getTemplates()が正しく動作するか
- [ ] 共通テンプレート検出ロジックが正しく動作するか

### 統合テスト
- [ ] 複数methodファイル読み込み
- [ ] 単一methodファイル読み込み
- [ ] 共通テンプレートを含むファイル読み込み
- [ ] Document情報の正しい表示

### 手動テスト
- [ ] 実際のMAIMLファイルで動作確認
- [ ] 共通テンプレートフラグの表示確認
- [ ] Document編集ダイアログの動作確認

## 8. ロールバック計画

Phase単位でコミットを分けることで、問題があれば該当Phaseまでロールバック可能。

### ロールバック手順
1. 該当コミットを特定
2. `git revert <commit-hash>` でロールバック
3. 動作確認

## 9. 関連ドキュメント

- [maimlParserTyped.ts](../../frontend/src/utils/maimlParserTyped.ts)
- [maiml-unified.ts型定義](../../frontend/src/types/maiml-unified.ts)
- [petriNetExtractor.ts](../../frontend/src/utils/petriNetExtractor.ts)
- [PetriNetEditorInner.tsx](../../frontend/src/components/editorv2/PetriNetEditorInner.tsx)

## 10. 承認記録

- **計画書提示日時**: 2026-02-04 13:23
- **承認日時**: （ユーザー承認待ち）
- **承認者コメント**: （ユーザーからのフィードバック）

## 11. 実施記録

### 実施日時
開始: （作業開始時の日時を記入）
完了: （作業完了時の日時を記入）

### 計画からの変更点
（実施中に発生した計画からの変更や追加作業）

### 発生した問題と解決方法
（実施中に発生した問題とその解決方法）

### 最終的な成果物
- [ ] PetriNetEditorInner.tsx - DOM API削除、maimlParserTyped使用
- [ ] 型エラー解消
- [ ] 既存機能の動作維持

## 12. 振り返り

### うまくいった点
（成功要因）

### 改善が必要な点
（今後の改善点）

### 学んだこと
（このタスクから得られた知見）