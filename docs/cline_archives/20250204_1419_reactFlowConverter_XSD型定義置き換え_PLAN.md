# タスク計画書: reactFlowConverter XSD型定義置き換え

## メタデータ
- **作成日時**: 2025-02-04 14:19
- **タスクID**: reactFlowConverter_XSD型定義置き換え
- **優先度**: 中
- **推定工数**: 3-4時間

## 1. タスク概要

`frontend/src/utils/reactFlowConverter.ts` および `petriNetExtractor.ts` で使用している手動定義の型定義を、XSDスキーマから自動生成された型定義に置き換える。

## 2. 目的と期待される成果

### 目的
- XSDスキーマと型定義の一致性を保証
- 手動メンテナンスによる型定義の不整合を防止
- MAIMLスキーマ変更時の型定義更新の自動化

### 期待される成果
- [x] 現在の型定義状況を調査完了
- [ ] reactFlowConverterの型定義をXSD型定義に置き換え
- [ ] petriNetExtractorの型定義をXSD型定義に置き換え
- [ ] 型定義の整合性確認
- [ ] 既存機能が正常動作することを確認

## 3. 実装ステップ

### Phase 1: 現状分析と型マッピング定義

#### 1.1 現在の型定義の整理
- [x] reactFlowConverter.tsで使用している型をリストアップ
- [x] petriNetExtractor.tsで使用している型をリストアップ
- [x] XSD型定義（backend/src/types/maiml.ts）の構造を確認

#### 1.2 型マッピングの作成
- [ ] 手動定義型 → XSD型定義のマッピング表を作成
- [ ] 置き換え不可能な型（フロントエンド独自型）を特定
- [ ] 型定義の互換性を検証

### Phase 2: reactFlowConverter.ts の型置き換え

#### 2.1 インポート追加
- [ ] `backend/src/types/maiml.ts`からの型インポートを追加
  - `PetriNetType`
  - `PlaceType`
  - `TransitionType`
  - `ArcType`
  - `InsertionType`
  - `MethodType`

#### 2.2 型定義の置き換え
- [ ] `PetriNetData` → XSD型定義ベースに修正
- [ ] `SubnetData` → XSD型定義ベースに修正
- [ ] `TemplateData` → XSD型定義ベースに修正
- [ ] ヘルパー関数の型定義を更新

#### 2.3 型変換ロジックの調整
- [ ] XSD型定義の構造に合わせて変換ロジックを修正
- [ ] オプショナルプロパティの扱いを調整
- [ ] 配列型の扱いを調整

### Phase 3: petriNetExtractor.ts の型置き換え

#### 3.1 インポート追加
- [ ] XSD型定義のインポートを追加
  - `DocumentType`
  - `MethodType`
  - `PetriNetType`
  - その他必要な型

#### 3.2 型定義の置き換え
- [ ] 関数の引数・戻り値の型をXSD型定義に変更
- [ ] 内部変数の型をXSD型定義に変更
- [ ] 型ガード関数の更新

#### 3.3 型変換ロジックの調整
- [ ] DOM要素からXSD型への変換ロジックを修正
- [ ] 型の互換性を保証する変換処理を追加

### Phase 4: フロントエンド独自型の分離

#### 4.1 UI用の型定義ファイル作成
- [ ] `frontend/src/types/petriNetUI.ts` を作成
- [ ] ReactFlow用の型定義を配置
- [ ] XSD型定義との変換用の型を定義

#### 4.2 型変換ユーティリティの作成
- [ ] XSD型 → UI型の変換関数
- [ ] UI型 → XSD型の変換関数

### Phase 5: テストと検証

#### 5.1 型チェック
- [ ] TypeScriptコンパイルエラーがないことを確認
- [ ] 型の整合性を確認

#### 5.2 機能テスト
- [ ] PetriNet表示が正常に動作することを確認
- [ ] ノード・エッジの変換が正しいことを確認
- [ ] サブネット機能が正常に動作することを確認
- [ ] テンプレート機能が正常に動作することを確認

#### 5.3 エッジケースの確認
- [ ] 空のPetriNetの扱い
- [ ] オプショナルプロパティの扱い
- [ ] 不正なデータの扱い

## 4. 影響範囲

### 変更するファイル
1. `frontend/src/utils/reactFlowConverter.ts` - 型定義の置き換え
2. `frontend/src/utils/petriNetExtractor.ts` - 型定義の置き換え
3. `frontend/src/types/petriNetUI.ts` - 新規作成（UI用型定義）

### 新規作成するファイル
1. `frontend/src/types/petriNetUI.ts` - ReactFlow用のUI型定義
2. `frontend/src/types/index.ts` - 型定義のエクスポート集約（必要に応じて）

### 影響を受ける機能
- PetriNetエディタの表示・編集機能
- サブネットビューア機能
- テンプレート選択・挿入機能
- 実験記録タブのPetriNet表示

## 5. 技術的詳細

### 使用する技術・ライブラリ
- TypeScript: 型定義の置き換え
- XSD生成型定義: `backend/src/types/maiml.ts`

### 型マッピング詳細

#### 現在の手動定義型 → XSD型定義

```typescript
// 現在の型定義（手動）
interface PetriNetData {
  places: PlaceData[];
  transitions: TransitionData[];
  arcs: ArcData[];
  // ...
}

// XSD型定義
type PetriNetType = {
  Place?: PlaceType | PlaceType[];
  Transition?: TransitionType | TransitionType[];
  Arc?: ArcType | ArcType[];
  // ...
}
```

#### 主な違い
1. **プロパティ名**: キャメルケース vs パスカルケース
2. **配列の扱い**: 常に配列 vs 単一要素も許容
3. **オプショナル**: 一部必須 vs ほぼすべてオプショナル

### アーキテクチャ上の考慮事項

#### 型変換レイヤーの導入
- **XSD型（バックエンド仕様）** ↔ **UI型（フロントエンド仕様）**
- 変換ロジックを `reactFlowConverter.ts` に集約
- 型安全性を保ちながら、UI側の使いやすさも維持

#### 型定義の共有方法
- バックエンドの型定義をフロントエンドで参照
- パッケージ構成: モノレポ構造を活用
- 型定義の同期: XSDスキーマ変更時の自動更新

### セキュリティ考慮事項
- [ ] 型定義の変更によるセキュリティリスクなし
- [ ] バリデーションロジックは維持される

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| XSD型定義とUI要件の不一致 | 高 | 中 | 型変換レイヤーで吸収、UI独自型を別途定義 |
| 既存機能の動作不良 | 高 | 低 | 段階的な移行、各Phase後の動作確認 |
| 型チェックエラーの大量発生 | 中 | 中 | 型変換ユーティリティの実装、any型の一時使用 |
| パフォーマンスへの影響 | 低 | 低 | 型変換は軽量な処理、問題発生時は最適化 |

## 7. テスト計画

### ユニットテスト
- [ ] 型変換関数のテスト
- [ ] XSD型 → UI型の変換
- [ ] UI型 → XSD型の変換

### 統合テスト
- [ ] PetriNetエディタでのMAIML読み込み
- [ ] PetriNetエディタでのMAIML保存
- [ ] サブネット表示機能

### 手動テスト
- [ ] 複雑なPetriNetの表示確認
- [ ] ノード・エッジの追加・削除
- [ ] テンプレート挿入機能
- [ ] 実験記録タブでの動作確認

## 8. ロールバック計画

### ロールバック手順
1. Gitで以前のコミットに戻す
2. 型定義の変更を元に戻す
3. 動作確認

### ロールバックのトリガー
- 型チェックエラーが解消できない
- 既存機能が大幅に動作不良
- パフォーマンスが大幅に低下

## 9. 関連ドキュメント

- [XSD型定義生成README](../backend/scripts/README_generate-types.md)
- [petriNetExtractor型定義分析](./20250204_0830_petriNetExtractor_メソッド分析/00_INDEX.md)
- [PetriNetEditorInner移行資料](./20250204_1400_PetriNetEditorInner_Phase4_引継ぎ資料.md)

## 10. 承認記録

- **計画書提示日時**: 2025-02-04 14:19
- **承認日時**: (承認待ち)
- **承認者コメント**: 

## 11. 実施記録

### 実施日時
開始: (実施開始時に記入)
完了: (実施完了時に記入)

### 計画からの変更点
(実施中に発生した計画からの変更や追加作業)

### 発生した問題と解決方法
(実施中に発生した問題とその解決方法)

### 最終的な成果物
- [ ] reactFlowConverter.tsの型置き換え完了
- [ ] petriNetExtractor.tsの型置き換え完了
- [ ] UI独自型の分離完了
- [ ] 動作確認完了

## 12. 振り返り

### うまくいった点
(作業完了後に記入)

### 改善が必要な点
(作業完了後に記入)

### 学んだこと
(作業完了後に記入)

---

## 補足資料

### 現在の型定義状況

#### reactFlowConverter.ts で使用している型
- `PetriNetData`: PetriNet全体のデータ構造
- `SubnetData`: サブネット用のデータ構造
- `TemplateData`: テンプレート用のデータ構造
- ReactFlow関連型: `Node`, `Edge` など

#### petriNetExtractor.ts で使用している型
- `ExtractedPlace`: Place要素の抽出結果
- `ExtractedTransition`: Transition要素の抽出結果
- `ExtractedArc`: Arc要素の抽出結果
- DOM関連型: `Element`, `ChildNode` など

#### XSD型定義（maiml.ts）の主要型
- `DocumentType`: MAIMLドキュメント全体
- `MethodType`: Methodノード
- `PetriNetType`: PetriNetノード
- `PlaceType`: Placeノード
- `TransitionType`: Transitionノード
- `ArcType`: Arcノード
- `InsertionType`: Insertionノード

### 型変換の方針

#### 1. XSD型を直接使用できる箇所
- バックエンドとのデータ受け渡し
- MAIML XMLの解析結果の保持

#### 2. UI独自型が必要な箇所
- ReactFlowのノード・エッジ定義
- エディタ内部の一時的な状態管理
- UI表示用の派生データ

#### 3. 型変換が必要な箇所
- MAIML XMLパース結果 → ReactFlowデータ
- ReactFlowデータ → MAIML XML保存形式