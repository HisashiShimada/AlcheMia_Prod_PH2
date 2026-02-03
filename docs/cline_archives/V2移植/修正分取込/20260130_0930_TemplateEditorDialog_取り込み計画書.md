# TemplateEditorDialog.tsx Reference版機能取り込み計画書

**作成日時**: 2026-01-30 09:30  
**タスクID**: TemplateEditorDialog_Reference版機能取り込み  
**優先度**: 高  
**推定工数**: 4-6時間

---

## 📋 タスク概要

reference版の`TemplateEditorDialog.jsx`（約2500行）から、editorv2版の`TemplateEditorDialog.tsx`（約460行）に未実装機能を取り込み、100点満点の完全版を作成します。

**現状評価**: 70点（基本機能のみ、Phase 7-7段階的実装）  
**目標評価**: 100点（完全版）

---

## 🎯 目的と期待される成果

### 目的
Material-UI → Ant Design変換を維持しながら、reference版の高度な機能をeditorv2版に統合する。

### 期待される成果
- [x] 検証票の確認（70点、基本機能完璧）
- [x] reference版の確認（2500行、完全版）
- [x] editorv2版の確認（460行、基本機能のみ）
- [ ] Phase 1: NestedPropertyEditor実装（約800行）
- [ ] Phase 2: 名前空間テンプレート取り込み実装（約500行）
- [ ] Phase 3: 継承元テンプレート表示実装（約300行）
- [ ] Phase 4: Place References編集機能実装
- [ ] Phase 5: 統合テストと最終調整
- [ ] 完了報告書の作成

---

## 📊 機能差分分析

### 実装済み機能（editorv2版 - 70点）

| 機能 | reference | editorv2 | 評価 |
|------|----------|----------|------|
| 基本情報編集（ID, UUID, Name, Description） | ✅ | ✅ | 100% |
| UUID生成 | ✅ | ✅ | 100% |
| Insertion編集（URI, Hash, Format） | ✅ | ✅ | 100% |
| Place References表示 | ✅ | ✅ | 100% |
| Properties概要表示 | ✅ | ✅ | 100% |
| Contents概要表示（ResultTemplate） | ✅ | ✅ | 100% |
| 保存処理・テンプレートID重複チェック | ✅ | ✅ | 100% |
| バリデーションエラー表示 | ✅ | ✅ | 100% |
| Material-UI → Ant Design変換 | ✅ | ✅ | 100% |
| TypeScript型定義 | N/A | ✅ | 100% |

### 未実装機能（次Phase予定 - 30点）

| 機能 | reference | editorv2 | 行数 | 優先度 |
|------|----------|----------|------|--------|
| **NestedPropertyEditor** | ✅ 完全版 | ❌ 未実装 | 約800行 | 🔴 最高 |
| **名前空間テンプレート取り込み** | ✅ 完全版 | ❌ 未実装 | 約500行 | 🟡 高 |
| **継承元テンプレート表示** | ✅ 完全版 | ❌ 未実装 | 約300行 | 🟢 中 |
| **Place References編集** | ✅ 完全版 | ⚠️ 表示のみ | 約100行 | 🟢 中 |

---

## 🔧 実装ステップ詳細

### Phase 1: NestedPropertyEditor実装（約800行）🔴

**目的**: 階層的プロパティ編集機能の完全実装

#### Step 1-1: NestedPropertyEditorコンポーネント基本構造
- [ ] NestedPropertyEditor型定義
- [ ] コンポーネント基本構造（Material-UI → Ant Design変換）
- [ ] level別のインデント表示
- [ ] 展開/縮小UI（Collapse）

#### Step 1-2: 属性（attributes）管理
- [ ] 属性一覧表示
- [ ] 属性追加モーダル（MaiMLスキーマ準拠）
- [ ] 属性編集（inline編集）
- [ ] 属性削除
- [ ] xsi:type選択（MAIML_PROPERTY_TYPES）

#### Step 1-3: 要素（elements）管理
- [ ] 要素一覧表示
- [ ] 要素追加モーダル
- [ ] 要素編集（inline編集）
- [ ] 要素削除

#### Step 1-4: 子要素（children）管理
- [ ] 子要素一覧表示（再帰的）
- [ ] 子要素追加モーダル
- [ ] 子要素削除
- [ ] propertyListType対応

#### Step 1-5: 高度な機能
- [ ] 同階層コピー機能
- [ ] 深い再帰検索（findAndUpdate系関数）
- [ ] forceRenderKey強制再レンダリング
- [ ] 重複キーチェック

#### Step 1-6: Contents用NestedPropertyEditor
- [ ] Contents専用State
- [ ] Contents専用ハンドラー
- [ ] forceContentRenderKey

**成果物**:
- `NestedPropertyEditor`コンポーネント（約800行）
- Material-UI → Ant Design完全変換
- TypeScript型定義完備

---

### Phase 2: 名前空間テンプレート取り込み実装（約500行）🟡

**目的**: S3からXMLテンプレートを取り込む機能

#### Step 2-1: useNamespaceOperations統合
- [ ] useNamespaceOperationsフックの確認
- [ ] editorv2版での利用可否確認
- [ ] 必要に応じてhooks配置

#### Step 2-2: S3フォルダ構造表示
- [ ] S3フォルダツリー読み込み
- [ ] フォルダツリーUI（Tree + Folder Icons）
- [ ] フォルダ展開/縮小
- [ ] XMLファイル数バッジ表示

#### Step 2-3: XMLファイル選択・解析
- [ ] XMLファイル一覧表示
- [ ] ファイル選択UI
- [ ] XMLファイル解析（analyzeNamespaceFile）
- [ ] プレビュー表示

#### Step 2-4: インポート処理
- [ ] Properties全置換モード
- [ ] Contents全置換モード
- [ ] 個別要素追加モード（オプション）
- [ ] namespaceOriginメタデータ付与

#### Step 2-5: 名前空間ダイアログUI
- [ ] Modalダイアログ
- [ ] Step 1: フォルダ選択
- [ ] Step 2: ファイル選択
- [ ] Step 3: プレビュー
- [ ] インポートボタン

**成果物**:
- 名前空間テンプレート取り込みダイアログ（約500行）
- S3連携機能
- XML解析・インポート処理

---

### Phase 3: 継承元テンプレート表示実装（約300行）🟢

**目的**: templateRef.hrefから継承元テンプレートの情報を表示

#### Step 3-1: 継承元テンプレート検索
- [ ] templateRef.hrefからID抽出
- [ ] allNodesから継承元検索
- [ ] useMemoでの効率的な計算

#### Step 3-2: XMLから子要素抽出
- [ ] data.elementからXML要素取得
- [ ] querySelector/querySelectorAllでの検索
- [ ] extractChildrenFromXML再帰関数
- [ ] propertiesNested再構築

#### Step 3-3: 継承元プロパティ表示UI
- [ ] 読み取り専用セクション
- [ ] 継承元情報ヘッダー
- [ ] 属性・要素・子要素の表示
- [ ] Accordionでの折りたたみ

**成果物**:
- 継承元テンプレート参照表示（約300行）
- XML解析機能
- 読み取り専用UI

---

### Phase 4: Place References編集機能実装（約100行）🟢

**目的**: Place References追加・削除機能

#### Step 4-1: Place Reference追加
- [ ] 追加ダイアログ
- [ ] allNodesからPlace一覧取得
- [ ] 未登録Place一覧表示
- [ ] Place選択・追加

#### Step 4-2: Place Reference削除
- [ ] 削除ボタン
- [ ] 削除確認ダイアログ
- [ ] placeRefs配列更新

#### Step 4-3: Place Reference表示改善
- [ ] PlaceRef情報カード
- [ ] Place名・タイプ表示
- [ ] アクションボタン配置

**成果物**:
- Place References完全編集機能（約100行）
- 追加・削除ダイアログ

---

### Phase 5: 統合テストと最終調整

#### Step 5-1: 統合テスト
- [ ] 各Phase機能の動作確認
- [ ] Material-UI → Ant Design変換の品質確認
- [ ] TypeScript型エラーチェック
- [ ] console.logの削除

#### Step 5-2: 最終調整
- [ ] コメント整理
- [ ] 不要コードの削除
- [ ] 命名規則の統一
- [ ] JSDocコメント追加

#### Step 5-3: ドキュメント更新
- [ ] 検証票の更新（70点 → 100点）
- [ ] 完了報告書の作成
- [ ] CHANGELOG更新

---

## 🎨 Material-UI → Ant Design変換表

| Material-UI | Ant Design | 用途 |
|-------------|-----------|------|
| Dialog | Modal | ダイアログ |
| DialogTitle | Modal.title | タイトル |
| DialogContent | Modal内容 | コンテンツ |
| DialogActions | Modal.footer | アクション |
| TextField | Input / TextArea | 入力欄 |
| Select + MenuItem | Select + Option | 選択 |
| Button | Button | ボタン |
| IconButton | Button + icon | アイコンボタン |
| Chip | Tag | タグ |
| Alert | Alert | 通知 |
| Divider | Divider | 区切り線 |
| Typography | Typography.Text/Title | テキスト |
| Box + sx | Space / Flex | レイアウト |
| Accordion | Collapse | 折りたたみ |
| MUI Icons | Ant Design Icons | アイコン |

---

## 💡 技術的注意事項

### DO（推奨）

✅ **Material-UI → Ant Design完全変換**
```typescript
// ❌ Material-UI
<Dialog open={open} onClose={onClose}>
  <DialogTitle>タイトル</DialogTitle>
  <DialogContent>...</DialogContent>
  <DialogActions>...</DialogActions>
</Dialog>

// ✅ Ant Design
<Modal
  title="タイトル"
  open={open}
  onCancel={onClose}
  footer={[...]}
>
  ...
</Modal>
```

✅ **TypeScript型定義を必ず追加**
```typescript
interface NestedPropertyEditorProps {
  propertyData: PropertyData;
  propertyKey: string;
  level: number;
  // ...
}
```

✅ **useMemoで効率化**
```typescript
const hasChildren = useMemo(() => {
  // 計算ロジック
}, [依存配列]);
```

✅ **forceRenderKey強制再レンダリング**
```typescript
const [forceRenderKey, setForceRenderKey] = useState(Date.now());

// 更新後
setForceRenderKey(Date.now());
```

✅ **深い再帰検索**
```typescript
const findAndUpdate = (obj, targetKey) => {
  // トップレベルチェック
  if (obj[targetKey]) { /* 処理 */ }
  
  // 再帰的探索
  for (const key in obj) {
    if (obj[key].children) {
      // 子要素を探索
      // さらに深く再帰
    }
  }
};
```

### DON'T（非推奨）

❌ Material-UI依存を残さない  
❌ 型定義なしのany使用禁止  
❌ インラインスタイルでハードコーディング禁止  
❌ console.logを本番コードに残さない  
❌ 段階的実装を無視しない

---

## 📐 行数見積もり

| Phase | 追加行数 | 備考 |
|-------|---------|------|
| Phase 1: NestedPropertyEditor | 約800行 | コンポーネント本体 |
| Phase 2: 名前空間取り込み | 約500行 | S3連携・XML解析 |
| Phase 3: 継承元表示 | 約300行 | XML解析・再帰処理 |
| Phase 4: Place References編集 | 約100行 | 追加・削除機能 |
| Phase 5: 統合調整 | 約100行 | コメント・調整 |
| **合計** | **約1800行** | editorv2版: 460行 → 約2260行 |

**reference版**: 約2500行  
**editorv2完全版（予想）**: 約2260行  
**差分**: -240行（Ant Design簡潔化効果）

---

## 🔍 影響範囲

### 変更するファイル
1. `frontend/src/components/editorv2/components/TemplateEditorDialog.tsx` - メインファイル（大幅更新）

### 新規作成するファイル
なし（既存ファイルの拡張）

### 依存関係
- `useNamespaceOperations` フック（既存を利用）
- `maiml-property.xsd` スキーマ定義（MAIML_PROPERTY_TYPES）
- `allNodes` プロパティ（既存を利用）

---

## ✅ 完了条件

### 機能完了条件
- [ ] NestedPropertyEditor完全動作（属性・要素・子要素の追加・編集・削除）
- [ ] 名前空間テンプレート取り込み完全動作（S3連携・XML解析・インポート）
- [ ] 継承元テンプレート表示完全動作（XML解析・propertiesNested再構築）
- [ ] Place References編集完全動作（追加・削除）
- [ ] TypeScript型エラーゼロ
- [ ] Lintエラーゼロ

### 品質完了条件
- [ ] Material-UI → Ant Design変換100%
- [ ] TypeScript型定義100%
- [ ] JSDocコメント完備
- [ ] console.logゼロ
- [ ] 検証票100点満点

### テスト完了条件
- [ ] NestedPropertyEditor階層的編集テスト
- [ ] 名前空間テンプレート取り込みテスト
- [ ] 継承元テンプレート表示テスト
- [ ] Place References追加・削除テスト
- [ ] テンプレートID重複チェックテスト

---

## 🎯 リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| NestedPropertyEditor実装複雑度 | 高 | 高 | Phase分割、段階的実装 |
| useNamespaceOperations依存 | 中 | 中 | 既存フック確認、必要に応じて調整 |
| XML解析処理の不具合 | 中 | 中 | reference版ロジック完全移植 |
| Material-UI → Ant Design変換漏れ | 中 | 低 | 変換表に基づく徹底チェック |
| TypeScript型エラー | 低 | 中 | 段階的型定義、tsc確認 |

---

## 📝 承認記録

- **計画書提示日時**: 2026-01-30 09:30
- **承認日時**: （承認後記入）
- **承認者コメント**: （承認後記入）

---

## 🎓 参考資料

- [検証票](../検証票/20260130_0910_TemplateEditorDialog.tsx_検証票.md) - 70点評価
- reference版: `reference/frontend/src/components/PetriNetEditorV2/components/TemplateEditorDialog.jsx`
- editorv2版: `frontend/src/components/editorv2/components/TemplateEditorDialog.tsx`
- [Ant Design Modal](https://ant.design/components/modal)
- [Ant Design Collapse](https://ant.design/components/collapse)
- [Ant Design Tree](https://ant.design/components/tree)
- [MaiML Schema](../../specification/MaiML-Schema-1_0/)

---

**次のステップ**: ユーザー承認後、Phase 1から順次実装開始