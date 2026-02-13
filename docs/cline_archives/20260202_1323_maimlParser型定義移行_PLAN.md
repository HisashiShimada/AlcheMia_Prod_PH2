# タスク計画書: maimlParser 型定義移行

## メタデータ
- **作成日時**: 2026-02-02 13:23
- **タスクID**: maiml-parser-typed-migration
- **優先度**: 中
- **推定工数**: 7-10時間

## 1. タスク概要

xml-jsベースの`maimlParserExp.ts`（約1,700行）を、XSDから生成した型定義ベースの新パーサー`maimlParserTyped.ts`に移行します。調査の結果、使用箇所が2ファイル（petriNetExtractor系）のみで、必須実装メソッドは3つに絞られたため、移行は比較的容易です。

## 2. 目的と期待される成果

### 目的
- **型安全性の確保**: TypeScriptの型チェックを最大限活用
- **保守性の向上**: 明確な型定義ベースのコード構造
- **バグの削減**: コンパイル時のエラー検出
- **開発効率の向上**: IDE補完の活用

### 期待される成果
- [x] 型定義生成完了（`maiml-schema.ts`）
- [x] 型変換ユーティリティ完成（`maimlTypeConverter.ts`）
- [x] 使用箇所調査完了（2ファイル、3メソッドのみ）
- [ ] 新パーサークラス`maimlParserTyped.ts`の実装
- [ ] petriNetExtractor系での切り替え
- [ ] 動作確認とテスト完了
- [ ] 旧パーサー削除（オプション）

## 3. 実装ステップ

### Phase 1: 準備（完了済み✅）
- [x] XSDから型定義生成（`maiml-schema.ts`、約3,000行）
- [x] 型変換ユーティリティ作成（`maimlTypeConverter.ts`）
- [x] 型変換テスト作成・実行（8/8テストパス）
- [x] 使用箇所調査実施

### Phase 2: 新パーサークラス作成
- [ ] `frontend/src/utils/maimlParserTyped.ts`作成
- [ ] コンストラクタと基本構造実装
- [ ] 必須メソッド1: `getTransitionsForExperimentManager()`実装
- [ ] 必須メソッド2: `getTemplates()`実装
- [ ] 必須メソッド3: `getTemplatesForPetriNetViewer()`実装
- [ ] 内部ヘルパーメソッド実装
  - `findInstructionInMethod()`
  - `getTransitionArcsInPnml()`
  - `parseTemplate()`
  - `parsePropertiesFaithful()`（テンプレート解析用）
- [ ] ユニットテスト作成（`maimlParserTyped.test.ts`）
- [ ] 型安全性の検証

### Phase 3: petriNetExtractor の更新
- [ ] `petriNetExtractor.ts`のimport切り替え
- [ ] `petriNetExtractorExp.ts`のimport切り替え
- [ ] インターフェース互換性の確認
- [ ] 動作確認（サンプルMAIMLファイル）

### Phase 4: 統合テストと動作確認
- [ ] PetriNetEditorInner.tsxでの動作確認
- [ ] 複数のMAIMLファイルでのテスト
  - method1個のファイル
  - 複数methodのファイル
  - テンプレート有りのファイル
- [ ] リグレッションテスト実施
- [ ] パフォーマンステスト（必要に応じて）

### Phase 5: クリーンアップ（オプション）
- [ ] `maimlParserExp.ts`削除
- [ ] 未使用import削除
- [ ] 最終動作確認
- [ ] ドキュメント更新

## 4. 影響範囲

### 変更するファイル

#### 新規作成
1. `frontend/src/utils/maimlParserTyped.ts` - 新パーサークラス
2. `frontend/src/utils/maimlParserTyped.test.ts` - ユニットテスト

#### 修正
1. `frontend/src/utils/petriNetExtractor.ts` - import文のみ変更
2. `frontend/src/utils/petriNetExtractorExp.ts` - import文のみ変更

#### 削除（Phase 5）
1. `frontend/src/utils/maimlParserExp.ts` - 旧パーサー削除

### 影響を受ける機能
- **PetriNetEditor**: Petri Net可視化（間接的に影響）
- **影響範囲**: 非常に限定的✅

### 影響を受けないコンポーネント
- DocumentEditDialog
- TemplateEditorDialog  
- ExperimentRecordTab
- その他のコンポーネント

**理由**: petriNetExtractorが中間レイヤーとして機能しているため

## 5. 技術的詳細

### 使用する技術・ライブラリ
- **xml-js**: 3.0.2 - XMLパース（既存）
- **TypeScript**: 型定義ベースの実装
- **Jest**: ユニットテスト
- **型定義**: `maiml-schema.ts`（XSDから生成）
- **型変換**: `maimlTypeConverter.ts`（テスト済み✅）

### アーキテクチャ上の考慮事項

**中間レイヤー方式の採用**:
```
PetriNetEditorInner.tsx
  ↓ buildTemplateMap()
petriNetExtractor.ts (アダプター層)
  ↓ new MaiMLParserTyped()
maimlParserTyped.ts (新パーサー)
  ↓ convertToMaimlType()
maiml-schema.ts (型定義)
```

**利点**:
- コンポーネントの変更不要
- 影響範囲が限定的
- ロールバックが容易
- 段階的移行が可能

### 型安全性の実装例

```typescript
import type {
  MaimlRootType,
  ProtocolType,
  MethodType,
  PnmlType,
  TransitionType,
  MaterialTemplateType,
  ConditionTemplateType,
  ResultTemplateType,
} from '@/types/maiml-schema';

import { convertToMaimlType, normalizeArray } from '@/utils/maimlTypeConverter';
import * as xmljs from 'xml-js';

export class MaiMLParserTyped {
  private maimlRoot: MaimlRootType;
  
  constructor(maimlData: string) {
    const parsed = xmljs.xml2js(maimlData, { compact: true });
    this.maimlRoot = convertToMaimlType<MaimlRootType>(parsed.maiml);
  }
  
  /**
   * トランジション情報を抽出（型安全）
   */
  getTransitionsForExperimentManager(): TransitionExtractionResult {
    const protocol = this.maimlRoot.protocol;
    if (!protocol) {
      return { success: false, message: 'Protocol not found' };
    }
    
    const methods = normalizeArray(protocol.method);
    // 型安全な実装...
  }
}
```

### セキュリティ考慮事項
- [x] XMLインジェクション対策（xml-jsが対応）
- [x] 型チェックによる不正データの検出
- [x] エラーハンドリングの強化

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 型変換の不完全性 | 中 | 低 | 包括的なテストケース作成、実際のMAIMLファイルでの検証 |
| パフォーマンス低下 | 低 | 低 | 型変換処理は軽量（_text抽出のみ）、必要に応じてメモ化 |
| 既存機能の破壊 | 中 | 低 | 段階的移行、各ステップで動作確認、ロールバック計画 |
| 複雑な再帰処理の移行 | 中 | 中 | 型定義活用、小さな単位でテスト、既存ロジックを参照 |
| 未発見の依存関係 | 低 | 低 | 使用箇所調査完了、影響範囲が限定的 |

### リスク軽減策

**段階的移行**:
1. 新パーサー実装（既存と並行稼働）
2. petriNetExtractorのみ切り替え
3. 動作確認後に旧パーサー削除

**ロールバック計画**:
- Gitコミットを細かく分ける
- 各Phaseでコミット
- 問題発生時は直前のコミットに戻す

## 7. テスト計画

### ユニットテスト
- [ ] MaiMLParserTypedクラスのテスト
- [ ] getTransitionsForExperimentManager()のテスト
- [ ] getTemplates()のテスト
- [ ] getTemplatesForPetriNetViewer()のテスト
- [ ] エラーケースのテスト
- [ ] 空データのテスト

### 統合テスト
- [ ] petriNetExtractorとの統合テスト
- [ ] 実際のMAIMLファイルでのテスト
  - method1個のファイル
  - 複数methodのファイル
  - テンプレート有りのファイル
  - 大規模なファイル（パフォーマンス確認）

### 手動テスト
- [ ] PetriNetEditorでの動作確認
- [ ] トランジション表示の確認
- [ ] テンプレート表示の確認
- [ ] エラー表示の確認

### テストデータ
- [ ] 既存のサンプルMAIMLファイルを使用
- [ ] 複雑なケースのテストデータ追加
- [ ] エッジケースのテストデータ作成

## 8. ロールバック計画

### 問題発生時の手順

1. **Phase 2で問題が発生**:
   - 新ファイル削除のみ（影響なし）
   
2. **Phase 3で問題が発生**:
   ```bash
   # import文を元に戻す
   git checkout HEAD -- frontend/src/utils/petriNetExtractor.ts
   git checkout HEAD -- frontend/src/utils/petriNetExtractorExp.ts
   ```

3. **Phase 4で問題が発生**:
   - Phase 3のコミットに戻す
   - 問題を分析して再実装

### ロールバックの判断基準
- 型変換エラーが頻発する
- パフォーマンスが著しく低下する
- 既存機能が動作しなくなる
- テストが大量に失敗する

## 9. 関連ドキュメント

### 作成済みドキュメント
- [背景資料](./20260202_1303_maimlParser型定義移行_計画資料.md)
- [使用箇所調査](./20260202_1306_使用箇所調査_完了報告.md)
- [型定義生成](./20260202_1107_XSDから正確な型定義生成_改善計画書.md)
- [Phase3完了報告](./20260202_1133_Phase3完了_型定義生成改善_報告書.md)
- [バリデーションテスト](./20260202_1137_Phase4完了_バリデーションテスト_報告書.md)

### 参照ファイル
- 型定義: `frontend/src/types/maiml-schema.ts`
- 型変換: `backend/src/utils/maimlTypeConverter.ts`
- 現行パーサー: `frontend/src/utils/maimlParserExp.ts`
- 中間レイヤー: `frontend/src/utils/petriNetExtractor.ts`

## 10. 承認記録

- **計画書提示日時**: 2026-02-02 13:23
- **承認日時**: （承認時に記入）
- **承認者コメント**: （フィードバックを記入）

## 11. 実施記録

### 実施日時
- 開始: （作業開始時に記入）
- 完了: （作業完了時に記入）

### 計画からの変更点
（実施中に発生した変更を記録）

### 発生した問題と解決方法
（実施中の問題と解決方法を記録）

### 最終的な成果物
（完了時に更新）
- [ ] maimlParserTyped.ts（新パーサー）
- [ ] maimlParserTyped.test.ts（ユニットテスト）
- [ ] petriNetExtractor.ts（更新）
- [ ] petriNetExtractorExp.ts（更新）
- [ ] 動作確認レポート

## 12. 振り返り

### うまくいった点
（完了後に記入）

### 改善が必要な点
（完了後に記入）

### 学んだこと
（完了後に記入）

---

## 📊 推定工数の内訳

| Phase | タスク | 推定時間 |
|-------|--------|---------|
| Phase 2 | 新パーサークラス作成 | 3-4時間 |
| Phase 3 | petriNetExtractor更新 | 1-2時間 |
| Phase 4 | 統合テストと動作確認 | 2-3時間 |
| Phase 5 | クリーンアップ（オプション） | 1時間 |
| **合計** | | **7-10時間** |

## 🎯 成功の鍵

1. ✅ **段階的に移行**（一度に全て変更しない）
2. ✅ **各ステップでテスト・検証**
3. ✅ **実際のMAIMLファイルで動作確認**
4. ✅ **型安全性を最優先**
5. ✅ **問題があればすぐにロールバック**

## 📝 次のアクション

### Phase 2実装開始時のチェックリスト
- [ ] この計画書を確認
- [ ] 型定義（maiml-schema.ts）を確認
- [ ] 型変換ユーティリティ（maimlTypeConverter.ts）を確認
- [ ] 既存パーサー（maimlParserExp.ts）を確認
- [ ] 必須メソッド3つの実装内容を理解
- [ ] テストファイル作成準備

### 実装の順序
1. コンストラクタと基本構造
2. getTransitionsForExperimentManager()
3. getTemplates()
4. getTemplatesForPetriNetViewer()
5. 各メソッドのテスト
6. petriNetExtractor更新
7. 動作確認

---

**計画書作成日**: 2026-02-02 13:23  
**次のステップ**: ユーザー承認後、Phase 2実装開始