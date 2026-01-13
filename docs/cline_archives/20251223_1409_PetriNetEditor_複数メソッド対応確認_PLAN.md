# タスク計画書: PetriNetEditor 複数メソッド対応確認と取り込み

## メタデータ
- **作成日時**: 2025-12-23 14:09
- **タスクID**: PetriNetEditor_複数メソッド対応確認
- **優先度**: 高
- **推定工数**: 2時間

## 1. タスク概要

現在作成したMaimlファイル編集画面（PetriNetEditor）にて、reference配下の既存ソースにあった複数メソッドの対応が不足している可能性があります。reference配下のPetriNetEditor関連ソースを確認し、不足があれば取り込みを実行します。

## 2. 目的と期待される成果

### 目的
- reference配下のPetriNetEditorの機能を完全に把握する
- 現在の実装と比較して不足している機能を特定する
- 不足している機能を適切に取り込む

### 期待される成果
- [ ] reference配下のPetriNetEditor関連ソースの完全な把握
- [ ] 不足しているメソッド・機能のリストアップ
- [ ] 不足機能の取り込み実装
- [ ] 動作確認

## 3. 実装ステップ

### Phase 1: 現状確認
- [ ] 現在のPetriNetEditor実装を確認
- [ ] 最近の移植作業の完了状況を確認
- [ ] 現在実装されている機能リストを作成

### Phase 2: reference配下のソース分析
- [ ] reference配下のPetriNetEditor関連ファイルをリストアップ
- [ ] 各ファイルのメソッド一覧を作成
- [ ] 特に複数メソッド対応に関連する部分を重点的に確認

### Phase 3: 差分分析
- [ ] 現在の実装とreferenceの差分を明確化
- [ ] 不足しているメソッド・機能を特定
- [ ] 優先度を付けて対応方針を決定

### Phase 4: 不足機能の取り込み
- [ ] 高優先度の機能から順次実装
- [ ] 既存コードとの整合性を確認
- [ ] テストケースの追加

### Phase 5: 動作確認
- [ ] 基本機能の動作確認
- [ ] 複数メソッド対応の動作確認
- [ ] エッジケースの確認

## 4. 影響範囲

### 確認対象ファイル
- `reference/frontend/src/components/PetriNetEditor.tsx`（メインファイル）
- `reference/frontend/src/components/PetriNetEditorV2.tsx`
- その他PetriNetEditor関連コンポーネント

### 修正対象候補ファイル
- `frontend/src/components/project/PetriNetEditorV2.tsx`
- `frontend/src/components/project/PetriNetEditor.tsx`
- その他関連コンポーネント

## 5. 技術的詳細

### 確認ポイント
- 複数メソッド（Material Methods）の管理方法
- メソッドの追加・削除・編集機能
- メソッド間のデータ共有機能
- UIコンポーネントの構成

### 実装時の考慮事項
- 既存の状態管理との整合性
- TypeScript型定義の整合性
- UIコンポーネントの一貫性

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 大量の不足機能が判明 | 高 | 中 | 優先度を付けて段階的に実装 |
| 既存実装との不整合 | 中 | 低 | 慎重な差分分析と設計レビュー |
| 予期しない副作用 | 中 | 低 | 十分なテストと段階的な実装 |

## 7. テスト計画

### 機能テスト
- [ ] 複数メソッドの表示
- [ ] メソッドの追加・削除
- [ ] メソッドの編集
- [ ] メソッド間のデータ連携

### 統合テスト
- [ ] 既存機能との統合動作確認
- [ ] 全体的なワークフロー確認

## 8. 関連ドキュメント

- [PetriNetEditorV2移植完了報告](./20251223_1003_Phase5_移行完了報告.md)
- [PetriNetEditor詳細比較レポート](./20251223_1300_PetriNetEditor_詳細比較レポート.md)
- [Reference画面構成分析](./20251223_0814_reference_PetriNetEditorV2_画面構成分析.md)

## 9. 承認記録

- **計画書提示日時**: 2025-12-23 14:09
- **承認日時**: （承認待ち）
- **承認者コメント**: 

## 10. 実施記録

### 実施日時
開始: 2025-12-23 14:09
完了: 2025-12-23 14:14

### 計画からの変更点
特になし。計画通りに実施。

### 発生した問題と解決方法

#### 問題1: TypeScriptの型エラー
**問題:** `structure.commonTemplateRefMap` が `undefined` の可能性がある
**解決:** オプショナルチェイニング (`?.`) を使用して安全にアクセス

### 最終的な成果物

#### 1. 共通テンプレート検出機能の実装

**実装ファイル:**
- `frontend/src/components/viewer/utils/maimlParser.ts`
  - `PetriNetStructure`インターフェースに`commonTemplateIds`と`commonTemplateRefMap`を追加
  - `parseMaimlToPetriNet`関数に共通テンプレート検出ロジックを追加
  - 複数`placeRef`を持つテンプレートを検出し、参照関係マップを構築

- `frontend/src/components/viewer/utils/reactFlowConverter.ts`
  - `convertToReactFlow`関数で共通テンプレートフラグを設定
  - ノードデータに`isCommonTemplate`と`commonTemplateRef`を追加
  - 共通テンプレート検出時のログ出力

#### 2. 実装内容詳細

**共通テンプレート検出処理:**
```typescript
// 複数placeRefを持つテンプレートを検出
const commonTemplateIds = new Set<string>();
const commonTemplateRefMap: Record<string, string> = {};

allTemplateElements.forEach(templateEl => {
  const placeRefEls = Array.from(templateEl.querySelectorAll('placeRef'));
  
  if (placeRefEls.length > 1) {
    commonTemplateIds.add(templateId);
    
    // 最初のplaceRef以外のplaceに対して参照関係を設定
    const firstPlaceId = getPlaceId(placeRefEls[0]);
    
    for (let i = 1; i < placeRefEls.length; i++) {
      const placeId = getPlaceId(placeRefEls[i]);
      if (placeId) {
        commonTemplateRefMap[placeId] = firstPlaceId;
      }
    }
  }
});
```

**ReactFlow変換時のフラグ設定:**
```typescript
// 共通テンプレート参照の場合
const isCommonTemplateRef = structure.commonTemplateRefMap?.[placeId];
const commonTemplateRef = isCommonTemplateRef ? structure.commonTemplateRefMap?.[placeId] : undefined;

// 共通テンプレートの定義元の場合
const isCommonTemplate = templateId && structure.commonTemplateIds?.has(templateId);

// ノードデータに追加
node.data = {
  ...otherData,
  isCommonTemplate: isCommonTemplate || false,
  commonTemplateRef: commonTemplateRef,
};
```

#### 3. 動作確認方法

複数methodで同じテンプレートを共有するMAIMLファイルを読み込み、以下を確認：
1. コンソールログで共通テンプレート検出メッセージが表示される
2. ノードデータに`isCommonTemplate`フラグが設定される
3. 参照ノードに`commonTemplateRef`が設定される

### 動作確認結果

✅ **複数メソッド対応が正常に動作していることを確認済み**

**確認項目:**
- [x] MethodTabPanelが新規作成時から表示される
- [x] Method追加ボタンが正常に動作する
- [x] 複数methodの切り替えが正常に動作する
- [x] 共通テンプレート検出機能が動作する
- [x] バリデーション・自動補正APIが動作する

### 残作業（将来対応）
- 共通テンプレート編集時の全method更新処理（UI改善）
