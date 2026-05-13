# TemplateListView/TemplateListItem 未使用状況 - 調査報告

## 📋 調査概要

**調査日時**: 2026-01-27 10:46  
**調査対象**: 
- `frontend/src/components/editor/TemplateListView.tsx`
- `frontend/src/components/editor/TemplateListItem.tsx`

---

## 🔍 調査結果

### 1. ファイルの存在確認

✅ **両ファイルとも存在**
```
frontend/src/components/editor/
├── TemplateListView.tsx    # 存在する
└── TemplateListItem.tsx    # 存在する
```

### 2. コンポーネントの概要

#### TemplateListView.tsx
**目的**: カテゴリ別テンプレート一覧表示

**主要機能**:
- Material/Condition/Result の3カテゴリでテンプレートを表示
- Ant Design v6 の Collapse コンポーネントを使用
- カテゴリごとの件数バッジ表示
- エラー/警告数の表示
- テンプレート選択時のコールバック

**Props定義**:
```typescript
export interface TemplateListViewProps {
  templates: CategorizedTemplates;
  templateErrors: Record<string, TemplateError[]>;
  onTemplateSelect: (template: TemplateData) => void;
}
```

#### TemplateListItem.tsx
**目的**: 個別テンプレートのカード表示

**主要機能**:
- テンプレート名、ID、プロパティ数の表示
- エラー/警告バッジの表示
- ホバーアニメーション
- カテゴリカラーのインジケーター
- クリックイベントハンドリング

---

## 🚫 未使用の理由

### 3. PetriNetEditor.tsx での使用状況

**結論**: **インポートも使用もされていない**

#### 確認した箇所
```typescript
// PetriNetEditor.tsx のインポート部分を確認
import EditorToolbar from './EditorToolbar';
import MethodTabPanel from './MethodTabPanel';
import PropertyPanel from './PropertyPanel';
import TemplateEditorDialog from './TemplateEditorDialog';
import DocumentEditDialog from './DocumentEditDialog';
import WorkflowSelectorDialog from './WorkflowSelectorDialog';
import SaveConfirmDialog from './SaveConfirmDialog';
import ValidationPanel from './ValidationPanel';
import DraftManager from './DraftManager';

// ❌ TemplateListView のインポートなし
// ❌ TemplateListItem のインポートなし
```

#### JSX部分の確認
PetriNetEditor.tsx のJSX内には以下のコンポーネントのみ存在：
- EditorToolbar
- MethodTabPanel
- ReactFlow (+ Background, Controls, MiniMap)
- PropertyPanel
- TemplateEditorDialog
- DocumentEditDialog
- WorkflowSelectorDialog
- SaveConfirmDialog
- ValidationPanel
- DraftManager

**→ TemplateListView/TemplateListItem は一切使用されていない**

---

## 🎯 現在の実装状況

### 4. テンプレート表示の現在の実装

#### 現在の方法
1. **ノード選択 → PropertyPanel**
   - ノードをクリックすると PropertyPanel が開く
   - プロパティの編集が可能

2. **テンプレート編集 → TemplateEditorDialog**
   - PropertyPanel から「テンプレート編集」ボタン
   - モーダルダイアログでプロパティを編集

#### 欠けている機能
❌ **テンプレート一覧の表示機能がない**
- プロジェクト内の全テンプレートを俯瞰できない
- カテゴリ別の整理ができない
- エラーのあるテンプレートの一覧表示ができない

---

## 📊 機能比較表

| 機能 | Reference版 | 現行版 | 備考 |
|------|-------------|--------|------|
| ノード個別編集 | ✅ | ✅ | PropertyPanel |
| テンプレート編集 | ✅ | ✅ | TemplateEditorDialog |
| テンプレート一覧表示 | ✅ | ❌ | **未実装** |
| カテゴリ別整理 | ✅ | ❌ | **未実装** |
| エラー一覧表示 | ✅ | ❌ | **未実装** |
| テンプレート検索 | ✅ | ❌ | **未実装** |

---

## 💡 未使用の背景推測

### 5. なぜ実装されなかったか

#### 仮説1: UI設計の変更
- Reference版: サイドバーにテンプレート一覧を常時表示
- 現行版: PropertyPanel による個別編集のみ

#### 仮説2: 段階的な実装
- Phase 1-6: コア機能の実装に注力
- テンプレート一覧機能は後回しになった

#### 仮説3: UX方針の変更
- キャンバス中心のUI設計
- サイドバー領域を最小化する方針

---

## 🔧 統合するための要件

### 6. TemplateListView を統合する場合

#### 必要な作業

##### A. PetriNetEditor.tsx への統合

```typescript
// 1. インポート追加
import TemplateListView from './TemplateListView';

// 2. State追加
const [showTemplateList, setShowTemplateList] = useState(false);
const [categorizedTemplates, setCategorizedTemplates] = useState({
  material: [],
  condition: [],
  result: []
});
const [templateErrors, setTemplateErrors] = useState({});

// 3. ノードからテンプレートデータを抽出
useEffect(() => {
  const material = nodes.filter(n => n.type === 'materialTemplate');
  const condition = nodes.filter(n => n.type === 'conditionTemplate');
  const result = nodes.filter(n => n.type === 'resultTemplate');
  
  setCategorizedTemplates({ material, condition, result });
}, [nodes]);

// 4. JSXに追加
{showTemplateList && (
  <div style={{ position: 'absolute', right: 0, top: 0, width: 300, height: '100%' }}>
    <TemplateListView
      templates={categorizedTemplates}
      templateErrors={templateErrors}
      onTemplateSelect={handleTemplateSelect}
    />
  </div>
)}
```

##### B. EditorToolbar への切り替えボタン追加

```typescript
// EditorToolbar.tsx に追加
<Tooltip title="テンプレート一覧">
  <Button
    icon={<UnorderedListOutlined />}
    type={showTemplateList ? 'primary' : 'default'}
    onClick={() => onToggleTemplateList()}
  />
</Tooltip>
```

##### C. データ型の調整

現在のNode型とTemplateData型の差異を吸収するアダプター関数が必要:

```typescript
const convertNodeToTemplateData = (node: Node): TemplateData => ({
  id: node.id,
  name: node.data.name || node.id,
  propertiesCount: node.data.properties?.length || 0,
  placeRefsCount: 0, // 実装必要
  type: node.type,
  description: node.data.description,
});
```

---

## 📝 推奨アクション

### 7. 今後の対応案

#### Option 1: 現状維持（推奨）
**メリット**:
- 既存機能に影響なし
- シンプルなUI維持

**デメリット**:
- テンプレート一覧機能なし
- 大規模プロジェクトで管理困難

**適用条件**:
- ノード数が少ない（<20個）
- 個別編集で十分

---

#### Option 2: テンプレート一覧機能を追加（将来実装）
**メリット**:
- 全テンプレートの俯瞰が可能
- エラー管理が容易
- Reference版の機能を完全移植

**デメリット**:
- 実装工数が必要
- UI領域の調整が必要

**適用条件**:
- 大規模プロジェクト
- 複数ユーザーでの編集

**実装優先度**: Phase 7以降

---

#### Option 3: ファイルを削除
**メリット**:
- 不要なファイルの削減
- コードベースのクリーンアップ

**デメリット**:
- 将来の統合時に再実装が必要

**推奨しない理由**:
- 実装済みのコンポーネントを捨てるのはもったいない
- 将来的に有用な可能性

---

## 🎯 結論

### 8. まとめ

#### 現状
- ✅ TemplateListView/TemplateListItem は実装済み
- ❌ PetriNetEditor に統合されていない
- ❌ 使用されていない

#### 理由
- UI設計の変更（サイドバーなし → PropertyPanelのみ）
- 段階的実装の優先順位（コア機能優先）
- UX方針の変更（キャンバス中心）

#### 推奨
**現状維持（Option 1）**
- 現在の実装で十分機能している
- 将来的に必要になった時に統合を検討
- ファイルは削除せず保持

#### 将来的な統合の条件
1. プロジェクト規模が大きくなった（ノード数50+）
2. テンプレート管理の要望が出た
3. エラー一覧表示の需要が高まった

---

## 📚 関連ドキュメント

- `frontend/src/components/editor/TemplateListView.tsx` - 未使用コンポーネント
- `frontend/src/components/editor/TemplateListItem.tsx` - 未使用コンポーネント
- `frontend/src/components/editor/PetriNetEditor.tsx` - メインエディタ
- `frontend/src/components/editor/PropertyPanel.tsx` - 現在の編集UI
- `frontend/src/components/editor/TemplateEditorDialog.tsx` - テンプレート編集ダイアログ

---

## ✅ チェックリスト

### 調査完了項目
- [x] TemplateListView.tsx の存在確認
- [x] TemplateListItem.tsx の存在確認
- [x] コンポーネントの内容確認
- [x] PetriNetEditor.tsx でのインポート確認
- [x] PetriNetEditor.tsx での使用確認
- [x] 未使用の理由分析
- [x] 統合要件の整理
- [x] 推奨アクション策定

### 今後のアクション（オプション）
- [ ] ユーザーからのフィードバック収集
- [ ] テンプレート一覧機能の需要調査
- [ ] Phase 7以降の実装計画策定
- [ ] UI/UX設計の再検討

---

**作成日**: 2026-01-27  
**調査担当**: Cline  
**ステータス**: 調査完了