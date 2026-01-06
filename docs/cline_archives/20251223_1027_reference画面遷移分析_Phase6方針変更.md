# Reference画面遷移分析 & Phase 6方針変更

## メタデータ
- **作成日時**: 2025-12-23 10:27
- **分析対象**: reference/frontend/src/App.js
- **Phase**: Phase 6 方針変更
- **重要度**: 🔥 高（実装方針の大幅変更）

---

## 🔍 重要な発見

### referenceの画面遷移パターン

**React Routerは使用されていません！**

reference実装では、**ステート管理による条件分岐レンダリング**で画面を切り替えています。

```javascript
// reference/frontend/src/App.js の構造

function App() {
  // ステートで画面モードを管理
  const [appMode, setAppMode] = useState('manager' or 'worker');
  const [adminMode, setAdminMode] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showOrgSelector, setShowOrgSelector] = useState(false);

  // 条件分岐レンダリング
  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  if (adminMode) {
    return <SystemAdminScreen />;
  }

  if (appMode === 'worker') {
    return <WorkerDashboard />;
  }

  if (showDashboard) {
    return <UsageDashboard />;
  }

  if (showOrgSelector || !isOrgSelected) {
    return <OrganizationSelector />;
  }

  // デフォルト: Manager Mode
  return <ManagerModeContent />;
}
```

---

## ❌ 当初の計画（不要と判明）

### 不要な実装
```
frontend/src/app/
└── editor/
    └── [projectId]/
        └── page.tsx  ❌ 不要！
```

**理由:**
- Next.js App Routerは既存パターンと異なる
- referenceではステート管理で画面切り替えを実現
- ページ遷移ではなく、コンポーネントの条件分岐レンダリングが正解

---

## ✅ 修正後の実装方針

### Phase 6の新しい方針

#### 1. 画面表示方式の変更

**変更前（誤り）:**
```
プロジェクト管理画面
  ↓
編集ボタンクリック
  ↓
/editor/[projectId] にページ遷移  ❌
```

**変更後（正解）:**
```
ExperimentAdminMenu（プロジェクト管理画面）
  ↓
編集ボタンクリック
  ↓
showEditor = true にセット
  ↓
条件分岐でPetriNetEditorを表示  ✅
```

#### 2. 実装箇所

**修正箇所:** `frontend/src/components/menus/ExperimentAdminMenu.tsx`

```typescript
// ExperimentAdminMenu.tsx に追加

const [showEditor, setShowEditor] = useState(false);
const [editorProjectId, setEditorProjectId] = useState<string | null>(null);

// 編集ボタンクリック時
const handleEdit = (projectId: string) => {
  setEditorProjectId(projectId);
  setShowEditor(true);
};

// レンダリング
if (showEditor && editorProjectId) {
  return (
    <PetriNetEditorScreen
      projectId={editorProjectId}
      onClose={() => setShowEditor(false)}
    />
  );
}

// 通常の管理画面
return (
  <div>
    {/* プロジェクト管理画面 */}
    <ProjectManagement onEdit={handleEdit} />
  </div>
);
```

---

## 🎯 新しい実装タスク

### Phase 6実装タスク（修正版）

#### タスク1: PetriNetEditorScreen作成
**ファイル:** `frontend/src/components/viewer/PetriNetEditorScreen.tsx`

```typescript
interface PetriNetEditorScreenProps {
  projectId: string;
  onClose: () => void;
}

const PetriNetEditorScreen: React.FC<PetriNetEditorScreenProps> = ({
  projectId,
  onClose
}) => {
  const [maimlContent, setMaimlContent] = useState<string>();
  const [projectData, setProjectData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // プロジェクト情報とファイルを読み込む
  useEffect(() => {
    loadProjectData();
  }, [projectId]);

  // 戻るハンドラー
  const handleBack = () => {
    if (hasUnsavedChanges) {
      if (confirm('保存されていない変更があります。破棄して戻りますか？')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      {/* ヘッダー */}
      <div style={{ padding: '16px', borderBottom: '1px solid #f0f0f0' }}>
        <Button icon={<ArrowLeftOutlined />} onClick={handleBack}>
          戻る
        </Button>
        <h1>実験フロー編集 - {projectData?.name}</h1>
      </div>

      {/* エディタ本体 */}
      <div style={{ flex: 1 }}>
        <PetriNetEditor
          initialContent={maimlContent}
          projectId={projectId}
          onSave={handleSave}
          onContentChange={() => setHasUnsavedChanges(true)}
        />
      </div>
    </div>
  );
};
```

**推定工数:** 2時間

---

#### タスク2: ExperimentAdminMenu統合
**ファイル:** `frontend/src/components/menus/ExperimentAdminMenu.tsx`

```typescript
// 追加するステート
const [showEditor, setShowEditor] = useState(false);
const [editorProjectId, setEditorProjectId] = useState<string | null>(null);

// 条件分岐レンダリング
if (showEditor && editorProjectId) {
  return (
    <PetriNetEditorScreen
      projectId={editorProjectId}
      onClose={() => {
        setShowEditor(false);
        setEditorProjectId(null);
      }}
    />
  );
}

// 通常の管理画面
return (
  <Layout style={{ height: '100vh' }}>
    {/* SubHeader */}
    <SubHeader activeKey="data" onMenuChange={onMenuChange} />
    
    {/* メインコンテンツ */}
    <Content>
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <Tabs.TabPane key="projects" tab="プロジェクト管理">
          <ProjectManagement
            onEdit={(projectId) => {
              setEditorProjectId(projectId);
              setShowEditor(true);
            }}
          />
        </Tabs.TabPane>
        {/* その他のタブ */}
      </Tabs>
    </Content>
  </Layout>
);
```

**推定工数:** 1時間

---

#### タスク3: ProjectManagement修正
**ファイル:** `frontend/src/components/project/ProjectManagement.tsx`

```typescript
interface ProjectManagementProps {
  onEdit?: (projectId: string) => void;  // 追加
}

// 編集ボタン（行737付近）
<Button
  icon={<EditOutlined />}
  onClick={() => {
    if (onEdit && selectedProject) {
      // Draft確認後、onEditコールバック実行
      handleEditClick(selectedProject.id);
    }
  }}
>
  編集
</Button>

const handleEditClick = (projectId: string) => {
  // Draft確認
  const draftKey = `petri-net-draft-${projectId}`;
  const draftData = localStorage.getItem(draftKey);
  
  if (draftData) {
    // Draft復元確認ダイアログ
    setDraftInfo({/* ... */});
    setDraftRestoreDialogOpen(true);
  } else {
    // 直接エディタへ
    onEdit?.(projectId);
  }
};
```

**推定工数:** 1時間

---

#### タスク4: DraftRestoreDialog作成
**ファイル:** `frontend/src/components/viewer/DraftRestoreDialog.tsx`

（既存計画と同じ）

**推定工数:** 1時間

---

## 📊 新旧実装方針の比較

### ❌ 旧方針（Next.js App Router）

| 項目 | 内容 |
|------|------|
| ルーティング | Next.js App Router（/editor/[projectId]） |
| 画面遷移 | ページ遷移（router.push） |
| ブラウザ戻る | 対応 |
| 実装複雑度 | 高（新しいページ作成） |
| 既存との整合性 | ❌ 低（referenceと異なる） |

### ✅ 新方針（ステート管理）

| 項目 | 内容 |
|------|------|
| ルーティング | ステート管理（showEditor） |
| 画面遷移 | コンポーネント切り替え |
| ブラウザ戻る | 非対応（不要） |
| 実装複雑度 | 低（既存コンポーネント活用） |
| 既存との整合性 | ✅ 高（referenceと同じパターン） |

---

## 🎯 実装手順（修正版）

### Phase 6-1: 基本実装（3時間）
1. ✅ PetriNetEditorScreen作成（2時間）
2. ✅ DraftRestoreDialog作成（1時間）

### Phase 6-2: 統合（2時間）
3. ✅ ExperimentAdminMenu統合（1時間）
4. ✅ ProjectManagement修正（1時間）

### Phase 6-3: テスト（2時間）
5. ✅ ブラウザ動作確認（1時間）
6. ✅ バグ修正とドキュメント更新（1時間）

---

## 📁 実装ファイル一覧（修正版）

### 新規作成
```
frontend/src/components/viewer/
├── PetriNetEditorScreen.tsx      (新規 - 300行)
└── DraftRestoreDialog.tsx         (新規 - 100行)
```

### 修正
```
frontend/src/components/menus/
└── ExperimentAdminMenu.tsx        (修正 - 50行追加)

frontend/src/components/project/
└── ProjectManagement.tsx          (修正 - 50行追加)

frontend/src/components/viewer/PetriNetEditor/
└── PetriNetEditor.tsx             (修正 - props追加)
```

### 削除（不要）
```
❌ frontend/src/app/editor/[projectId]/page.tsx  （作成不要）
```

---

## 🚀 まとめ

### 方針変更の理由
1. ✅ **既存パターンとの整合性**: referenceと同じステート管理方式
2. ✅ **実装の簡素化**: Next.js App Router不要
3. ✅ **保守性の向上**: 既存コードとの統一性

### 変更内容
- **削除**: Next.js App Router実装
- **追加**: PetriNetEditorScreen（フルスクリーンコンポーネント）
- **修正**: ExperimentAdminMenuで条件分岐レンダリング

### 推定工数
- **旧方針**: 5-7時間
- **新方針**: 5-7時間（同じ）

### リスク
- **低**: 既存パターン踏襲により実装リスク低減

---

**Analysis Completed**: 2025-12-23 10:27  
**Status**: Phase 6 Implementation Plan Updated 🎯  
**Next Step**: ユーザー承認後、実装開始
