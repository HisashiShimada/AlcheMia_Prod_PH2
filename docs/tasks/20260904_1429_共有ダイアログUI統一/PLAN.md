# タスク計画書: 共有ダイアログUI統一（仕様変更）

## メタデータ
- **作成日時**: 2026-09-04 14:29
- **更新日時**: 2026-09-04 15:00（仕様変更により全面改訂）
- **タスクID**: 共有ダイアログUI統一
- **優先度**: 中
- **推定工数**: 2時間

## タスク概要
Prefix管理と用語管理の「共有」機能を以下の仕様に統一する。

### 新仕様
1. ノードを選択すると、選択ノードとその下位層の Prefix/用語が一覧に表示される
2. 共有したいアイテムにチェックを入れ「共有」ボタン押下
3. 確認ダイアログ（ShareScopeModal 共通部品）が開く
   - 移動先スコープ名（現在選択中ノード名）を表示
   - チェックしたアイテム一覧を表示
4. 「移動して共有」ボタンで現在選択中ノードの scopeKey に **移動（元スコープから切り離し）**

## 目的と期待される成果
- [ ] ShareScopeModal をツリー選択型 → 確認ダイアログ型に刷新
- [ ] Prefix管理・用語管理で同じ ShareScopeModal を使用（共通部品化）
- [ ] PrefixManagement.tsx の onShareSelected を NamespaceMain.tsx に接続
- [ ] 移動（scopeKey 更新）API 呼び出しを実装

## 実装ステップ

### Phase 1: 型定義更新（namespace.ts）
- [ ] ShareScopeModalProps を新仕様に刷新
  - targetScopeLabel: string（移動先スコープ名）
  - items: ShareItem[]（チェックされたアイテム一覧）
  - onClose / onConfirm

### Phase 2: ShareScopeModal.tsx 刷新
- [ ] ツリー選択 UI を廃止
- [ ] 確認ダイアログ UI に変更
  - 「以下を {targetScopeLabel} に移動します：」
  - アイテム一覧リスト表示（Prefix/用語を区別するバッジ付き）
  - [キャンセル] [移動して共有] ボタン

### Phase 3: NamespaceMain.tsx 修正
- [ ] 用語共有ハンドラ修正（shareScopeNodes ベース廃止 → items/targetScopeLabel 渡しに変更）
- [ ] Prefix共有ハンドラを PrefixManagement.onShareSelected に接続
- [ ] Prefix移動API（namespace の scopeKey 更新）呼び出し実装

### Phase 4: PrefixManagement.tsx 整備
- [ ] onShareSelected コールバックに選択Prefixの情報（表示名付き）を渡す

### Phase 5: 翻訳ファイル更新
- [ ] ja.json / en.json の shareScopeModal.* キーを新仕様に合わせて更新

## 変更ファイル
1. `frontend/src/types/namespace.ts` - ShareScopeModalProps 型刷新
2. `frontend/src/components/namespace/ShareScopeModal.tsx` - ダイアログUI刷新
3. `frontend/src/components/namespace/NamespaceMain.tsx` - 共有ハンドラ修正
4. `frontend/src/components/namespace/PrefixManagement.tsx` - コールバック整備
5. `frontend/src/locales/ja.json` - 翻訳キー更新
6. `frontend/src/locales/en.json` - 翻訳キー更新

## 承認記録
- **計画書初版**: 2026-09-04 14:29
- **仕様変更承認**: 2026-09-04 15:00（ユーザーがActモードに切り替えで承認）
