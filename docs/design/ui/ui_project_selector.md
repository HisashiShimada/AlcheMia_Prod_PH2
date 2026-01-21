# プロジェクトセレクタ UI設計書

## メタデータ

| 項目 | 内容 |
|------|------|
| コンポーネントID | ProjectSelector |
| 物理ファイル名 | ProjectSelector.tsx |
| ファイルパス | frontend/src/components/ExperimentWorker/ProjectSelector.tsx |
| カテゴリ | 実験作業者（Experiment Worker） |
| 権限 | experiment_worker |
| 作成日 | 2026-01-19 |
| 最終更新日 | 2026-01-19 |

---

## 1. 概要

### 1.1 目的
選択中のプロジェクト情報をカード形式で表示する表示専用コンポーネントです。モーダル内で現在の選択状態を視覚的に示すために使用されます。

### 1.2 主要機能
- 選択中のプロジェクト名とファイル名を表示
- メソッド数を表示
- 未選択状態のメッセージ表示
- 選択状態に応じた背景色・ボーダー色の変更

### 1.3 使用場所
- ExperimentRecordTab（実験記録タブ）内
- ProgressCheckTab（進捗確認タブ）内
- InstructionConfirmationTab（指示確認タブ）内
- ProjectSelectionModal内での選択状態表示

---

## 2. コンポーネント構成

### 2.1 レイアウト構造

```
Card (小サイズ, 選択状態で背景色変更)
└── Space (vertical)
    ├── Space (horizontal) - ヘッダー
    │   ├── FolderOutlined (アイコン)
    │   └── Text "プロジェクト" (太字)
    │
    └── (条件分岐)
        ├── Space (vertical, 左パディング24px) - 選択中
        │   ├── Text (太字, 14px) - プロジェクト名
        │   └── Text (secondary, 12px) - "ファイル名 • N メソッド"
        │
        └── Text (secondary, 12px, 左パディング24px) - 未選択
            └── "プロジェクトが選択されていません"
```

### 2.2 使用コンポーネント

**Ant Design:**
- Card - カード表示
- Space - 要素の間隔管理
- Typography.Text - テキスト表示
- theme.useToken() - デザイントークン取得

**Ant Design Icons:**
- FolderOutlined - フォルダアイコン

**カスタムコンポーネント:**
- なし

**データソース:**
- projectsData（@/data/projectsData） - プロジェクトデータ

---

## 3. Props定義

### 3.1 Props一覧

```typescript
interface ProjectSelectorProps {
  selectedProject: string;           // 選択中のプロジェクトID
  onProjectChange?: (value: string) => void;  // ※現在は未使用
}
```

### 3.2 Props詳細

| Prop名 | 型 | 必須 | デフォルト | 説明 |
|--------|-----|------|-----------|------|
| selectedProject | string | ○ | - | 選択中のプロジェクトID（projectsDataのキー） |
| onProjectChange | function | × | - | プロジェクト変更時のコールバック（現在は未使用） |

### 3.3 内部State

内部状態なし（純粋な表示コンポーネント）

---

## 4. 表示内容

### 4.1 ヘッダー部分

| 要素 | 内容 | スタイル |
|------|------|---------|
| アイコン | FolderOutlined | fontSize: 16px, color: colorPrimary |
| ラベル | "プロジェクト" | 太字 |

### 4.2 選択中の情報

| 項目 | データソース | 表示形式 | スタイル |
|------|-------------|---------|---------|
| プロジェクト名 | selectedProjectData.projectName | そのまま表示 | 太字, 14px |
| ファイル情報 | selectedProjectData.fileName | "ファイル名 • N メソッド" | secondary, 12px |

**メソッド数の計算:**
```typescript
selectedProjectData.methods?.length || 0
```

### 4.3 未選択時のメッセージ

| 条件 | メッセージ | スタイル |
|------|-----------|---------|
| selectedProject が空 | "プロジェクトが選択されていません" | secondary, 12px, paddingLeft: 24px |

---

## 5. スタイリング

### 5.1 カード全体のスタイル

```typescript
{
  backgroundColor: selectedProject 
    ? token.colorPrimaryBg      // 選択時: プライマリ背景色
    : token.colorBgContainer,   // 未選択: 通常背景色
  borderColor: selectedProject 
    ? token.colorPrimary        // 選択時: プライマリ色
    : token.colorBorder,        // 未選択: 通常ボーダー色
}
```

### 5.2 デザイントークンの使用

| トークン | 使用箇所 | 値の例 |
|---------|---------|--------|
| token.colorPrimaryBg | 選択時の背景色 | 薄いプライマリ色 |
| token.colorBgContainer | 未選択時の背景色 | 白または薄いグレー |
| token.colorPrimary | アイコン色、選択時ボーダー | #1890ff |
| token.colorBorder | 未選択時のボーダー | グレー |

### 5.3 レスポンシブ対応

- カードは親要素の幅に自動適応
- Space コンポーネントが自動的に幅100%に拡張

---

## 6. データフロー

### 6.1 データ取得

```typescript
// 1. プロジェクトIDを受け取る
const selectedProject = props.selectedProject;

// 2. プロジェクトデータから情報を取得
const selectedProjectData = selectedProject 
  ? projectsData[selectedProject] 
  : null;

// 3. 表示に必要な情報を抽出
const projectName = selectedProjectData?.projectName;
const fileName = selectedProjectData?.fileName;
const methodCount = selectedProjectData?.methods?.length || 0;
```

### 6.2 データ構造（projectsData）

```typescript
type ProjectsData = {
  [projectId: string]: {
    projectName: string;     // プロジェクト名
    fileName: string;        // MAIMLファイル名
    methods: Method[];       // メソッド一覧
    // ... その他のプロパティ
  };
};
```

---

## 7. パフォーマンス考慮事項

### 7.1 最適化

- **計算コストが低い**: 単純なオブジェクト参照とプロパティアクセスのみ
- **再レンダリング**: selectedProject が変更された時のみ
- **メモ化不要**: 計算量が少ないため useMemo は不要

### 7.2 レンダリング条件

| 条件 | 再レンダリング | 理由 |
|------|--------------|------|
| selectedProject変更 | ○ | 表示内容が変わる |
| 親コンポーネントの再レンダリング | ○ | React のデフォルト動作 |

---

## 8. アクセシビリティ

### 8.1 対応項目

- ✅ 適切な視覚的階層（アイコン + ラベル + 詳細情報）
- ✅ テキストコントラスト（secondary テキストでも十分なコントラスト）
- ✅ 色だけに依存しない情報伝達（ラベルとアイコンを併用）

### 8.2 改善検討事項

- ⚠️ aria-label 属性の追加（スクリーンリーダー対応）
- ⚠️ role属性の明示（role="status" など）

---

## 9. バリデーション

### 9.1 入力検証

**該当なし**（表示専用コンポーネント）

### 9.2 エラーハンドリング

```typescript
// 存在しないプロジェクトIDの場合
if (!selectedProject || !projectsData[selectedProject]) {
  // 未選択メッセージを表示
}

// メソッド数の安全な取得
const methodCount = selectedProjectData?.methods?.length || 0;
```

---

## 10. テスト要件

### 10.1 単体テスト

```typescript
describe('ProjectSelector', () => {
  test('選択中のプロジェクト情報を表示', () => {
    const { getByText } = render(
      <ProjectSelector selectedProject="project1" />
    );
    expect(getByText('サンプルプロジェクト')).toBeInTheDocument();
  });

  test('未選択時のメッセージを表示', () => {
    const { getByText } = render(
      <ProjectSelector selectedProject="" />
    );
    expect(getByText('プロジェクトが選択されていません')).toBeInTheDocument();
  });

  test('選択時に背景色が変わる', () => {
    const { container } = render(
      <ProjectSelector selectedProject="project1" />
    );
    const card = container.querySelector('.ant-card');
    expect(card).toHaveStyle({ backgroundColor: expect.any(String) });
  });
});
```

---

## 11. セキュリティ

### 11.1 セキュリティ考慮事項

- **XSS対策**: Ant Design の Text コンポーネントが自動的にエスケープ処理
- **データ検証**: projectsData からの安全な参照（Optional chaining使用）

---

## 12. 関連ドキュメント

### 12.1 関連コンポーネント

- [MethodSelector](ui_method_selector.md) - メソッド選択コンポーネント（同様の構造）
- [TaskSelector](ui_task_selector.md) - タスク選択コンポーネント（同様の構造）
- [ProjectSelectionModal](ui_project_selection_modal.md) - このコンポーネントを使用するモーダル
- [ExperimentRecordTab](ui_experiment_record_tab.md) - 使用元のタブ

### 12.2 関連仕様

- [.clinerules/references/ui_policy.md](../../.clinerules/references/ui_policy.md) - UI設計ポリシー
- [.clinerules/development/frontend.md](../../.clinerules/development/frontend.md) - フロントエンド規約

---

## 13. 備考

### 13.1 設計パターン

このコンポーネントは「**セレクタ表示パターン**」を実装しています：

```
共通パターン:
- Card (小サイズ)
- アイコン + ラベル（ヘッダー）
- 選択中の詳細情報（左パディング24px）
- 未選択メッセージ
- 選択状態での色変更
```

同じパターンを使用しているコンポーネント：
- MethodSelector（ToolOutlined）
- TaskSelector（AimOutlined）

### 13.2 将来の拡張

- ✅ **onProjectChange の実装**: 現在は未使用だが、クリック選択機能を追加可能
- ⚠️ **ローディング状態**: データ取得中の表示
- ⚠️ **エラー状態**: プロジェクトが見つからない場合の表示

### 13.3 技術的な注意点

1. **データ依存性**: projectsData への直接依存があるため、API統合時に変更が必要
2. **Props の未使用**: onProjectChange が定義されているが使用されていない
3. **表示専用**: 現在はインタラクティブな操作はできない（表示のみ）

---

## 14. 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 1.0.0 | 2026-01-19 | 初版作成 | Cline |
