# タスク計画書: MAIML型定義・変換ユーティリティ同期

## メタデータ
- **作成日時**: 2026-04-08 11:53
- **タスクID**: maiml-sync
- **優先度**: 高
- **推定工数**: 4〜6時間

## タスク概要

`backend` と `frontend` で同期すべき以下の6ファイルにおいて、
バックエンドが古い実装のままになっている差分を解消する。

| ペア | backend | frontend |
|------|---------|---------|
| 型定義 | `backend/src/types/maiml-unified.ts` | `frontend/src/types/maiml-unified.ts` |
| 変換ユーティリティ | `backend/src/utils/maimlTypeConverter.ts` (v1.0.0) | `frontend/src/utils/maimlTypeConverter.ts` (v2.0.0) |
| パーサークラス | `backend/src/utils/maimlParserTyped.ts` | `frontend/src/utils/maimlParserTyped.ts` |

詳細差分は [REPORT.md](./REPORT.md) を参照。

---

## 目的と期待される成果

- [ ] backend と frontend の3ファイルペアを完全に同期させる
- [ ] バックエンド側で名前空間プレフィックス・タグ大文字小文字を正規化できるようにする
- [ ] バックエンド側でエラー収集機能（ConversionResult / ErrorContext）を使えるようにする
- [ ] フロントエンド側のバグ（`getInstructionIdByTransitionId`）を修正する
- [ ] フロントエンド側の `convertInsertion` に子テキスト要素形式の対応を追加する
- [ ] 既存のバックエンド利用箇所のコンパイルエラーを解消する

---

## 実装ステップ

### Phase 1: `maiml-unified.ts` の同期（型定義）

#### 1-1. backend に不足フィールドを追加
**変更ファイル**: `backend/src/types/maiml-unified.ts`

- [ ] `Place` インターフェースに `position?: { x: number; y: number }` を追加
- [ ] `Transition` インターフェースに `position?: { x: number; y: number }` を追加
- [ ] `Method` インターフェースに `unknownElements?: Record<string, any>` を追加
- [ ] `Protocol` インターフェースに `unknownElements?: Record<string, any>` を追加
- [ ] `MaimlRoot` インターフェースに `unknownElements?: Record<string, any>` を追加

---

### Phase 2: `maimlTypeConverter.ts` の同期（最大差分）

#### 2-1. frontend v2.0.0 の機能をバックエンドに移植
**変更ファイル**: `backend/src/utils/maimlTypeConverter.ts`

- [ ] `ConversionError` インターフェースを追加
- [ ] `ConversionResult` インターフェースを追加
- [ ] `ErrorContext` クラスを追加（pushPath / popPath / addError / getErrors）
- [ ] `stripNamespacePrefixes(obj)` 関数を追加（export）
- [ ] `normalizeTagCase(obj)` 関数を追加（export）
- [ ] `warnUnknownKeys()` ヘルパー関数を追加
- [ ] `createErrorResult()` ヘルパー関数を追加
- [ ] `createEmptyMaimlRoot()` / `createEmptyDocument()` / `createEmptyProtocol()` を追加
- [ ] `convertArraySafe()` ヘルパー関数を追加
- [ ] `convertXmlJsToMaimlRoot` の戻り値型を `MaimlRoot` → `ConversionResult` に変更
  - 変換前に `stripNamespacePrefixes` → `normalizeTagCase` を適用
  - Document/Protocol がなくてもフォールバックできるよう変更
- [ ] `convertPlace` に `position` フィールドの変換を追加
- [ ] `convertTransition` に `position` フィールドの変換を追加
- [ ] `convertMethod` に `unknownElements` 収集を追加（`warnUnknownKeys` 使用）
- [ ] `convertProtocol` に `unknownElements` 収集を追加（`warnUnknownKeys` 使用）
- [ ] `convertXmlJsToMaimlRoot` に `unknownElements` 収集を追加
- [ ] 各 `convertXxx` 関数のキー参照を小文字化後のキーに合わせて更新
  - `materialTemplate` → `materialtemplate`
  - `conditionTemplate` → `conditiontemplate`
  - `transitionRef` → `transitionref`
  - `vendorRef` → `vendorref`
  - `placeRef` → `placeref`
  - `creatorRef` → `creatorref`
  - `instanceRef` → `instanceref`
  - `eventLog` → `eventlog`

#### 2-2. frontend の `convertInsertion` をXSD準拠に修正
**変更ファイル**: `frontend/src/utils/maimlTypeConverter.ts`

> ⚠️ **XSD違反**: `insertionType` の `uri` / `format` / `uuid` はXSDで `xs:element`（子要素）と定義されている。
> フロントエンド v2.0.0 は `_attributes` として読んでおりXSD準拠の MAIML では常に `undefined` になる。
> バックエンド v1.0.0 の実装（`._text` 優先・属性フォールバック）が正しい。

- [ ] `convertInsertion` を子テキスト要素形式（`<uri>...</uri>` 形式）に対応するよう修正（XSD違反の修正）
  ```typescript
  // Before（frontend現状・XSD違反）
  uri: xmlInsertion._attributes?.uri || '',
  format: xmlInsertion._attributes?.format,
  // After（XSD準拠）
  uri: xmlInsertion.uri?._text || xmlInsertion._attributes?.uri || '',
  format: xmlInsertion.format?._text || xmlInsertion._attributes?.format,
  uuid: xmlInsertion.uuid?._text || xmlInsertion._attributes?.uuid,
  ```

#### 2-3. `convertHash` の実装確認（XSD属性/要素区分け）
**変更ファイル**: `backend/src/utils/maimlTypeConverter.ts`, `frontend/src/utils/maimlTypeConverter.ts`

> `hashType` は `xs:base64Binary` の `simpleContent` ＋ `method` 属性の複合型。
> ハッシュ値は `_text` で、メソッドは `_attributes.method` で読む必要がある。

- [ ] backend / frontend 両方の `convertHash`（またはそれに相当する処理）を確認し、`_text` と `_attributes.method` を正しく参照しているか検証
  ```typescript
  // XSD準拠の正しい実装
  hash: {
    method: xmlInsertion.hash._attributes?.method,  // 属性
    value:  xmlInsertion.hash._text,                 // simpleContent
  }
  ```

---

### Phase 3: `maimlParserTyped.ts` の同期（パーサークラス）

#### 3-1. backend に不足している機能を追加
**変更ファイル**: `backend/src/utils/maimlParserTyped.ts`

- [ ] `import type { ConversionError } from './maimlTypeConverter'` を追加
- [ ] クラスフィールドに `private maimlString: string | null = null` を追加
- [ ] クラスフィールドに `private conversionErrors: ConversionError[] = []` を追加
- [ ] コンストラクタで `maimlString` の保存処理を追加
- [ ] コンストラクタを `ConversionResult` API に対応
  - `this.typedMaiml = convertXmlJsToMaimlRoot(xmlData)` 
  - → `const result = convertXmlJsToMaimlRoot(xmlData); this.typedMaiml = result.data;`
  - エラー・警告のログ出力処理を追加（フロントと同様）
- [ ] `getConversionErrors(): ConversionError[]` メソッドを追加
- [ ] `hasConversionErrors(): boolean` メソッドを追加
- [ ] `hasConversionWarnings(): boolean` メソッドを追加
- [ ] `collectTemplates()` に `methodId` 引数を追加
- [ ] `getTemplates()` の `collectTemplates()` 呼び出し箇所に `methodId` を渡すよう修正

#### 3-2. frontend のバグを修正
**変更ファイル**: `frontend/src/utils/maimlParserTyped.ts`

- [ ] `getInstructionIdByTransitionId` の `find` コールバックに `return` を追加
  ```typescript
  // Before（バグあり）
  const instruction = instructions.find(i => {
    i.transitionRef.ref === transitionId;  // returnなし
  });
  // After
  const instruction = instructions.find(i =>
    i.transitionRef.ref === transitionId
  );
  ```

#### 3-3. frontend の不要importを削除
**変更ファイル**: `frontend/src/types/maiml-unified.ts`

- [ ] `import { Dayjs } from "dayjs"` を削除（未使用）

---

### Phase 4: コンパイルエラー確認と修正

- [ ] `backend` のコンパイルエラーを確認・修正
  - `maimlParserTyped.ts` を利用しているサービス・コントローラーがあれば `ConversionResult` API 変更の影響を確認
- [ ] `frontend` のコンパイルエラーを確認・修正
- [ ] backend のテストが通ることを確認

---

## 変更ファイル一覧

| ファイル | 変更種別 | 主な変更内容 |
|---------|---------|------------|
| `backend/src/types/maiml-unified.ts` | 修正 | Place/Transition の `position`、3インターフェースの `unknownElements` 追加 |
| `backend/src/utils/maimlTypeConverter.ts` | 修正（大）| v2.0.0相当に更新（型・クラス追加、関数追加、戻り値型変更） |
| `backend/src/utils/maimlParserTyped.ts` | 修正 | `ConversionResult` API対応、エラー収集メソッド追加 |
| `frontend/src/utils/maimlTypeConverter.ts` | 修正（小）| `convertInsertion` の子テキスト要素対応を追加 |
| `frontend/src/utils/maimlParserTyped.ts` | バグ修正 | `getInstructionIdByTransitionId` の `return` 欠落を修正 |
| `frontend/src/types/maiml-unified.ts` | 修正（小）| 未使用 `import { Dayjs }` を削除 |

---

## XSD属性/要素区分け調査結果サマリー

（詳細は [REPORT.md セクション8](./REPORT.md) を参照）

| 調査項目 | 結果 | 対応フェーズ |
|---------|------|------------|
| 型定義ファイル（`maiml-unified.ts`）の属性/要素区分け | ✅ 問題なし | — |
| `insertionType` の `uri`/`format`（フロントエンド v2.0.0） | ❌ **XSD違反**：要素を属性として誤読 | Phase 2-2 |
| `hashType` の `_text` / `_attributes.method` 区分け | ⚠️ 確認要 | Phase 2-3 |
| `extensionType` / `classifierType` の全属性フィールド | ⚠️ 確認要（属性として正しく参照されているか） | Phase 4 確認 |
| `chainType` / `parentType` の `key` 属性フィールド | ⚠️ 確認要 | Phase 4 確認 |
| `id`, `ref`, `key`, `units` 等の属性フィールド | ✅ 概ね正しい | — |

---

## 影響範囲分析

### `convertXmlJsToMaimlRoot` 戻り値型変更の影響

バックエンドで `convertXmlJsToMaimlRoot` を呼び出している箇所をすべて修正する必要がある。

主な影響箇所：
- `backend/src/utils/maimlParserTyped.ts` のコンストラクタ（Phase 3-1 で対応済み）
- 他に直接呼び出している箇所がないかコンパイルエラーで確認

---

## リスクと対策

| リスク | 影響度 | 対策 |
|--------|--------|------|
| `convertXmlJsToMaimlRoot` の戻り値型変更による既存コードのコンパイルエラー | 中 | Phase 4 でコンパイルエラーを確認・修正 |
| `normalizeTagCase` 導入後に既存コードのキー参照がずれる | 高 | Phase 2-1 のキー参照更新を漏れなく実施。コンパイルエラー確認で検証 |
| `convertInsertion` 修正後に frontend 側の挙動が変わる | 低 | オプショナルな追加（既存の属性形式は維持）のため影響最小 |
| バックエンドのテストが壊れる | 中 | Phase 4 でテスト実行確認 |

---

## テスト計画

- [ ] `backend` の TypeScript コンパイルが通ること
- [ ] `frontend` の TypeScript コンパイルが通ること
- [ ] `backend` の既存テストが全て pass すること
- [ ] 実際の MAIML ファイルをパースして結果が正常なこと（手動確認）

---

## 承認記録

- **計画書提示日時**: 2026-04-08 11:53
- **承認日時**: （承認後に記入）
- **承認者コメント**: （ユーザーからのフィードバック）
