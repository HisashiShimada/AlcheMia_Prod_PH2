# Reference踏襲 - レイアウト構造取込計画書

**作成日時**: 2026-01-27 14:00  
**タスクID**: MAIML_EDITOR_REFERENCE_LAYOUT  
**優先度**: 高  
**推定工数**: 8時間

---

## 1. タスク概要

Reference (PetriNetEditorV2) のレイアウト構造を現行 (PetriNetEditor) に取り込み、Ant Design v6のUIポリシーに沿った形で実装する。

### 背景
- 現行のMaiml編集画面はReferenceを基に開発されたが、レイアウト構造が異なる部分が存在
- Referenceの優れたレイアウト・UXを現行に取り込みたい
- ただし、UIはAnt Design v6のポリシーに統一する必要がある

---

## 2. 目的と期待される成果

### 目的
Reference のレイアウト構造・UX設計を踏襲し、Ant Design v6で再実装する

### 期待される成果
- [x] Referenceと現行の対応関係分析完了
- [x] 詳細比較レポート作成完了
- [ ] レイアウト構造の取り込み実装
- [ ] UIポリシー準拠の確認
- [ ] 動作確認・テスト

---

## 3. 実装ステップ

### Phase 1: 主要なレイアウト差異の特定（完了）

**完了項目:**
- ✅ ファイル対応関係分析
- ✅ SaveDialog.jsx と SaveConfirmDialog.tsx の比較
- ✅ TemplateEditMode.tsx の役割確認
- ✅ UI/UX の違いの明確化

**成果物:**
- `docs/20260127_1354_Reference_現行_対応関係_分析.md`
- `docs/20260127_1400_Reference_現行_詳細比較レポート.md`

### Phase 2: Reference の主要コンポーネント詳細分析

**目的:** Referenceの実装を正確に理解する

#### 2-1. PetriNetEditorInner.jsx の構造分析
- [ ] 全体レイアウト構造を確認
- [ ] 状態管理の方法を確認
- [ ] エディタモードの切り替え実装を確認
- [ ] ReactFlowの配置とプロパティを確認

#### 2-2. EditorToolbar.jsx の詳細確認
- [ ] ツールバーのボタン配置
- [ ] アイコンとラベル
- [ ] 機能とコールバック
- [ ] レスポンシブ対応

#### 2-3. PropertyPanel.jsx の詳細確認
- [ ] パネルのレイアウト構造
- [ ] フォーム項目の配置
- [ ] 検証ロジック
- [ ] 動的項目の扱い

#### 2-4. MethodTabPanel.jsx の詳細確認
- [ ] タブの構造とスタイル
- [ ] タブ切り替えの実装
- [ ] 各タブのコンテンツ配置
- [ ] データ連携

### Phase 3: Ant Design v6 への変換設計

**目的:** MUIコンポーネントをAnt Designに変換する設計を作成

#### 3-1. コンポーネントマッピング表作成
- [ ] MUI → Ant Design の対応表
- [ ] スタイルプロパティの変換ルール
- [ ] レイアウトコンポーネントの対応
- [ ] アイコンの対応

**変換例:**
```typescript
// MUI
<Dialog open={open} maxWidth="sm" fullWidth>
  <DialogTitle>タイトル</DialogTitle>
  <DialogContent>コンテンツ</DialogContent>
  <DialogActions>
    <Button onClick={onClose}>キャンセル</Button>
    <Button variant="contained">保存</Button>
  </DialogActions>
</Dialog>

// Ant Design
<Modal open={open} title="タイトル" width={600} onCancel={onClose}>
  コンテンツ
  <Space style={{ marginTop: 16 }}>
    <Button onClick={onClose}>キャンセル</Button>
    <Button type="primary">保存</Button>
  </Space>
</Modal>
```

#### 3-2. デザイントークンの活用計画
- [ ] theme.useToken() の使用箇所
- [ ] colorPrimary, colorBgContainer等の適用
- [ ] スペーシング（margin, padding）のトークン化
- [ ] フォントサイズのトークン化

### Phase 4: 主要コンポーネントの実装

#### 4-1. EditorToolbar の改善
**現状:** 基本的なボタン配置のみ  
**Reference:** より詳細な機能ボタン、グループ化

**実装内容:**
- [ ] Reference のボタン配置を踏襲
- [ ] Space コンポーネントでグループ化
- [ ] アイコンを Ant Design Icons に変更
- [ ] ツールチップの追加（必要に応じて）

**変更ファイル:**
- `frontend/src/components/editor/EditorToolbar.tsx`

#### 4-2. PropertyPanel のレイアウト改善
**現状:** 基本的なフォーム配置  
**Reference:** より構造化されたレイアウト

**実装内容:**
- [ ] Collapse または Tabs でセクション分け
- [ ] Form.Item のラベル配置を統一
- [ ] 動的フィールドの表示改善
- [ ] バリデーション表示の改善

**変更ファイル:**
- `frontend/src/components/editor/PropertyPanel.tsx`

#### 4-3. MethodTabPanel のレイアウト改善
**現状:** Tabs + 基本コンテンツ  
**Reference:** より詳細なタブ内レイアウト

**実装内容:**
- [ ] タブコンテンツのレイアウト構造を改善
- [ ] Card コンポーネントで情報をグループ化
- [ ] 統計情報の表示改善
- [ ] 各タブのヘッダー情報追加

**変更ファイル:**
- `frontend/src/components/editor/MethodTabPanel.tsx`

#### 4-4. DocumentEditDialog のレイアウト改善
**現状:** 基本的なフォーム  
**Reference:** より構造化されたダイアログ

**実装内容:**
- [ ] Tabs でセクション分け（基本情報/高度な設定）
- [ ] Form layout を vertical に統一
- [ ] ヘルパーテキストの追加
- [ ] フィールドのグループ化

**変更ファイル:**
- `frontend/src/components/editor/DocumentEditDialog.tsx`

#### 4-5. TemplateEditorDialog のレイアウト改善
**現状:** 基本的なフォーム  
**Reference:** より詳細なレイアウト

**実装内容:**
- [ ] Collapse でセクション分け
- [ ] プロパティリストの表示改善
- [ ] ドラッグ&ドロップでの並び替え（検討）
- [ ] プレビュー機能の追加（検討）

**変更ファイル:**
- `frontend/src/components/editor/TemplateEditorDialog.tsx`

### Phase 5: 細部の調整

#### 5-1. スペーシングの統一
- [ ] margin, padding をデザイントークンで統一
- [ ] Space コンポーネントの size を統一
- [ ] Card の padding を統一

#### 5-2. カラーの統一
- [ ] colorPrimary, colorError, colorSuccess を使用
- [ ] 背景色を colorBgContainer, colorBgLayout で統一
- [ ] テキスト色を colorText, colorTextSecondary で統一

#### 5-3. フォントの統一
- [ ] Typography コンポーネントを使用
- [ ] フォントサイズをトークンで指定
- [ ] fontWeight を統一

### Phase 6: テストと検証

#### 6-1. 動作確認
- [ ] エディタの基本操作（開く、編集、保存）
- [ ] ツールバーの各ボタン動作
- [ ] PropertyPanel の編集・検証
- [ ] MethodTabPanel のタブ切り替え
- [ ] 各ダイアログの表示・入力・保存

#### 6-2. UIポリシー準拠確認
- [ ] デザイントークンの使用確認
- [ ] インラインスタイルの削除確認
- [ ] Ant Design コンポーネントの props 使用確認
- [ ] カラー・スペーシング・フォントの統一確認

#### 6-3. レスポンシブ対応確認
- [ ] デスクトップ表示
- [ ] タブレット表示
- [ ] モバイル表示（必要に応じて）

---

## 4. 影響範囲

### 変更するファイル

#### 主要ファイル（Phase 4）
1. `frontend/src/components/editor/EditorToolbar.tsx` - ツールバーレイアウト改善
2. `frontend/src/components/editor/PropertyPanel.tsx` - プロパティパネル改善
3. `frontend/src/components/editor/MethodTabPanel.tsx` - メソッドタブ改善
4. `frontend/src/components/editor/DocumentEditDialog.tsx` - ドキュメント編集改善
5. `frontend/src/components/editor/TemplateEditorDialog.tsx` - テンプレート編集改善

#### 補助ファイル（必要に応じて）
6. `frontend/src/components/editor/MultiObjectEditor.tsx` - 複数オブジェクト編集
7. `frontend/src/components/editor/ValidationPanel.tsx` - バリデーション表示
8. `frontend/src/components/editor/TemplateListView.tsx` - テンプレート一覧
9. `frontend/src/components/editor/WorkflowSelectorDialog.tsx` - ワークフロー選択

### 影響を受ける機能
- Maiml編集画面全体のレイアウト
- 各ダイアログの表示・入力
- ツールバーの操作
- プロパティパネルの編集

---

## 5. 技術的詳細

### MUI → Ant Design v6 変換ルール

#### レイアウトコンポーネント

| MUI | Ant Design v6 | 備考 |
|-----|---------------|------|
| `Box` | `div` + `style` または `Space` / `Flex` | 用途に応じて使い分け |
| `Stack` | `Space` (direction="vertical") | 縦方向の配置 |
| `Grid` | `Row` / `Col` | グリッドレイアウト |
| `Container` | `div` + `style={{ maxWidth }}` | コンテナ幅の制限 |

#### ダイアログ・モーダル

| MUI | Ant Design v6 | 備考 |
|-----|---------------|------|
| `Dialog` | `Modal` | モーダルダイアログ |
| `DialogTitle` | `title` prop | タイトル |
| `DialogContent` | children | コンテンツ |
| `DialogActions` | `footer` prop または children 内に配置 | アクション |

#### フォーム

| MUI | Ant Design v6 | 備考 |
|-----|---------------|------|
| `TextField` | `Input` / `Input.TextArea` | テキスト入力 |
| `Select` | `Select` | 選択入力 |
| `Checkbox` | `Checkbox` | チェックボックス |
| `Radio` | `Radio` / `Radio.Group` | ラジオボタン |
| `FormControl` | `Form.Item` | フォーム項目 |

#### ボタン

| MUI | Ant Design v6 | 備考 |
|-----|---------------|------|
| `Button variant="contained"` | `Button type="primary"` | 主要ボタン |
| `Button variant="outlined"` | `Button` (デフォルト) | 標準ボタン |
| `Button variant="text"` | `Button type="text"` | テキストボタン |
| `IconButton` | `Button icon={...} shape="circle"` | アイコンボタン |

#### タブ

| MUI | Ant Design v6 | 備考 |
|-----|---------------|------|
| `Tabs` + `Tab` | `Tabs` + `items` prop | タブコンポーネント |
| `TabPanel` | `items[].children` | タブコンテンツ |

#### その他

| MUI | Ant Design v6 | 備考 |
|-----|---------------|------|
| `Alert` | `Alert` | アラート表示 |
| `CircularProgress` | `Spin` | ローディング |
| `Tooltip` | `Tooltip` | ツールチップ |
| `Divider` | `Divider` | 区切り線 |
| `Card` | `Card` | カード |

### デザイントークンの使用

```typescript
import { theme } from 'antd';

const MyComponent = () => {
  const { token } = theme.useToken();
  
  return (
    <div style={{
      padding: token.padding,           // スペーシング
      backgroundColor: token.colorBgContainer,  // 背景色
      color: token.colorText,           // テキスト色
      borderRadius: token.borderRadius, // 角丸
    }}>
      コンテンツ
    </div>
  );
};
```

---

## 6. リスク<br 対策

### リスク1: レイアウト崩れ
**影響度:** 中  
**発生確率:** 中

**対策:**
- 段階的に実装し、各ステップで動作確認
- Phase 4 の各コンポーネント実装後に個別テスト
- スクリーンショットで比較

### リスク2: 既存機能の動作不良
**影響度:** 高  
**発生確率:** 低

**対策:**
- イベントハンドラーの動作を慎重に確認
- コールバック関数の引数・戻り値を確認
- 状態管理のロジックは極力変更しない

### リスク3: Ant Design v6 の制約
**影響度:** 中  
**発生確率:** 低

**対策:**
- MUI で可能だった表現が Ant Design で不可能な場合、代替案を検討
- カスタムコンポーネントの作成も視野に入れる
- UIポリシーに沿った代替実装を提案

### リスク4: 工数超過
**影響度:** 中  
**発生確率:** 中

**対策:**
- Phase 4 を優先度順に実装
- 最低限の改善で Phase 5-6 を省略する選択肢を残す
- 各 Phase の完了時点で中間報告

---

## 7. テスト計画

### 動作確認項目

#### EditorToolbar
- [ ] 各ボタンのクリック動作
- [ ] ツールチップの表示
- [ ] アイコンの表示
- [ ] レスポンシブ対応

#### PropertyPanel
- [ ] フォーム入力・検証
- [ ] 動的フィールドの追加・削除
- [ ] 保存ボタンの動作
- [ ] エラー表示

#### MethodTabPanel
- [ ] タブ切り替え
- [ ] 各タブのコンテンツ表示
- [ ] データ連携

#### DocumentEditDialog
- [ ] モーダルの開閉
- [ ] フォーム入力・検証
- [ ] 保存・キャンセル

#### TemplateEditorDialog
- [ ] モーダルの開閉
- [ ] プロパティの追加・編集・削除
- [ ] 保存・キャンセル

### UIポリシー確認項目
- [ ] インラインスタイルを使用していない
- [ ] デザイントークンを使用している
- [ ] Ant Design コンポーネントの props を適切に使用
- [ ] カラー・スペーシング・フォントが統一されている

---

## 8. ロールバック計画

### 問題発生時の対応

**Phase 4 の各ステップで問題が発生した場合:**
1. Git で該当ファイルを直前のコミットに戻す
2. 問題箇所を特定し、修正方針を再検討
3. 必要に応じて部分的なロールバック

**全体的なロールバックが必要な場合:**
1. Git ブランチを作成してから作業開始
2. main ブランチはそのまま維持
3. 問題が解決するまでブランチで作業継続

---

## 9. 関連ドキュメント

- [対応関係分析](./20260127_1354_Reference_現行_対応関係_分析.md)
- [詳細比較レポート](./20260127_1400_Reference_現行_詳細比較レポート.md)
- [UIポリシー](../.clinerules/references/ui_policy.md)
- [フロントエンド規約](../.clinerules/development/frontend.md)

---

## 10. 承認記録

- **計画書提示日時**: 2026-01-27 14:00
- **承認日時**: （承認待ち）
- **承認者コメント**: （未記入）

---

## 11. 実施記録

### 実施日時
開始: （未開始）  
完了: （未完了）

### 計画からの変更点
（実施後に記録）

### 発生した問題と解決方法
（実施後に記録）

### 最終的な成果物
（実施後に記録）

---

**作成者**: Cline  
**バージョン**: 1.0.0