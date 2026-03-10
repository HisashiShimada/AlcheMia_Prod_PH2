# WorkProgressDetailDialog UI仕様書

## 1. 概要

### 1.1. コンポーネントの目的

プロジェクトの詳細な進捗状況を表示するモーダルダイアログ。プロジェクト情報、タスク詳細、トランジション進捗、実験フロー図（Petri Net）を統合表示し、実験管理者が各タスクの状況を把握できます。

### 1.2. 使用場面

- ProgressMonitoringの「詳細」ボタンクリック時
- プロジェクトの詳細な進捗状況を確認する場合
- 各タスクのトランジション進捗を確認する場合
- 実験フロー図で視覚的に進捗を把握する場合

### 1.3. アクセス権限

- **対象ロール**: Experiment Admin（実験管理者）
- **必須認証**: JWT認証必須
- **テナント分離**: organization_id によるマルチテナント分離

---

## 2. 画面構成

### 2.1. レイアウト構造

```
┌─────────────────────────────────────────────────────┐
│ Modal: プロジェクト進捗詳細            [更新] [閉] │
├─────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────┐ │
│ │ プロジェクト情報                                 │ │
│ │ 名前: 材料実験A  [進行中]   ID: proj_001        │ │
│ │ 説明: 材料の耐久性を評価する実験                │ │
│ │ オーナー: 佐藤太郎  部門: 研究部  更新: 1/21    │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ ┌─────────────────────────────────────────────────┐ │
│ │ メソッド: [すべてのメソッド ▼]               │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ ┌─────────────────────────────────────────────────┐ │
│ │ [Task1] [Task2] [Task3] ← タブ                  │ │
│ ├─────────────────────────────────────────────────┤ │
│ │ タスク詳細                                       │ │
│ │ タスクNo: 1  [実行中]                           │ │
│ │ メソッド: Method1                               │ │
│ ├─────────────────────────────────────────────────┤ │
│ │ トランジションサマリー                           │ │
│ │ [全体: 10] [完了: 5] [作業中: 2] [未着手: 3]   │ │
│ │                        [完了率: 50%]            │ │
│ ├─────────────────────────────────────────────────┤ │
│ │ 実験フロー図                                     │ │
│ │ ┌───────────────────────────────────────────┐   │ │
│ │ │ PetriNetVisualization                    │   │ │
│ │ │ （Petri Net実験フロー図を表示）           │   │ │
│ │ └───────────────────────────────────────────┘   │ │
│ ├─────────────────────────────────────────────────┤ │
│ │ トランジション詳細 (10件)                        │ │
│ │ ┌───────────────────────────────────────────┐   │ │
│ │ │ ✓ Transition1 [完了]                     │   │ │
│ │ │   作業者: 田中  開始: 1/15  終了: 1/16    │   │ │
│ │ └───────────────────────────────────────────┘   │ │
│ │ ┌───────────────────────────────────────────┐   │ │
│ │ │ ▶ Transition2 [作業中]                   │   │ │
│ │ │   作業者: 鈴木  開始: 1/17  終了: -       │   │ │
│ │ └───────────────────────────────────────────┘   │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### 2.2. 主要UI要素

#### 2.2.1. モーダル設定

| 項目 | 値 | 説明 |
|------|-----|------|
| 幅 | lg: 1200px / md: 900px / xs: 90% | レスポンシブ対応 |
| 位置 | top: 20px | 上部に余白 |
| ボディ最大高さ | calc(90vh - 110px) | スクロール可能 |
| タイトル | Title level={4} | 「プロジェクト進捗詳細」 |

#### 2.2.2. フッターボタン

| ボタン | 位置 | タイプ | アイコン | 動作 |
|--------|------|--------|---------|------|
| 再読み込み | 左 | default | ReloadOutlined | API再取得 |
| 閉じる | 右 | primary | - | モーダルを閉じる |

#### 2.2.3. プロジェクト情報カード

**表示項目:**

| 項目 | 表示形式 | 説明 |
|------|---------|------|
| プロジェクト名 | Text strong + Tag | 名前 + ステータスTag |
| プロジェクトID | Text（小さめ） | ID表示 |
| 説明 | Text | プロジェクト説明 |
| オーナー | Text | 所有者名 |
| 部門 | Text | 部門名 |
| 更新日時 | Text（小さめ） | 最終更新日時 |

**プロジェクトステータスの色:**

| ステータス | 色 | 表示名 |
|-----------|-----|--------|
| completed | success（緑） | 完了 |
| in_progress | processing（青） | 進行中 |
| pending | warning（黄） | 保留中 |
| planning | default（灰） | 計画中 |

#### 2.2.4. メソッドフィルタ（条件付き表示）

**表示条件:** プロジェクトに複数のメソッドがある場合のみ表示

| 要素 | コンポーネント | 説明 |
|------|--------------|------|
| ラベル | Text（secondary, strong） | 「メソッド:」 |
| 選択 | Select | allowClear, 最大幅300px |
| オプション | projectInfo.methods | 動的生成 |

#### 2.2.5. タスクタブ

| 項目 | 値 |
|------|-----|
| タイプ | card |
| ラベル | taskName または「作業N」 |
| フォントサイズ | fontSizeSM |
| 太字 | strong |

#### 2.2.6. タスク詳細カード

**表示項目（グリッドレイアウト）:**

| 項目 | 幅（xs/sm/md） | 表示形式 |
|------|---------------|---------|
| タスクNo | 24/12/6 | Text strong |
| タスクステータス | 24/12/6 | Tag（色分け） |
| メソッド名 | 24/12/6 | Text（小さめ） |

**タスクステータスの色:**

| ステータス | 色 | 表示名 |
|-----------|-----|--------|
| pending | default | 実行待ち |
| in_progress | processing（青） | 実行中 |
| error | error（赤） | 異常終了 |
| review_waiting | warning（黄） | レビュー待ち |
| completed | success（緑） | 完了 |

#### 2.2.7. トランジションサマリーカード

**統計カード（5枚のカード）:**

| カード | 背景色 | 文字色 | 表示値 |
|--------|-------|--------|--------|
| 全体 | colorBgLayout | デフォルト | totalTransitions |
| 完了 | colorSuccessBg | colorSuccess | completed |
| 作業中 | colorPrimaryBg | colorPrimary | working |
| 未着手 | colorBgLayout | デフォルト | notStarted |
| 完了率 | colorInfoBg | colorInfo | completionRate% |

**レイアウト:**
- Row gutter: [8, 8]
- Col flex: "1"（均等配置）
- 最小幅: 100px
- テキスト配置: center

#### 2.2.8. 実験フロー図エリア

| 要素 | 説明 |
|------|------|
| ラベル | 「実験フロー図」（secondary, strong） |
| コンポーネント | PetriNetVisualization |
| カード背景 | colorBgLayout |
| サイズ | small |

#### 2.2.9. トランジション詳細リスト

**List表示:**

| 項目 | 表示形式 |
|------|---------|
| アイコン | 進捗状況に応じたアイコン（30px幅） |
| トランジション名 | Text strong |
| トランジションID | Text（secondary, 小さめ） |
| 進捗状況Tag | Tag（色分け + アイコン） |
| 作業者 | Text（小さめ） |
| 開始日 | Text（小さめ、日時フォーマット） |
| 終了日 | Text（小さめ、完了時のみ表示） |

**進捗状況の色とアイコン:**

| 状態 | 色 | アイコン |
|------|-----|---------|
| 完了 | success（緑） | CheckOutlined |
| 作業中 | processing（青） | PlayCircleOutlined |
| 準備中 | default（灰） | ClockCircleOutlined |
| 休止中 | warning（黄） | PauseCircleOutlined |
| 異常中 | error（赤） | ExclamationCircleOutlined |
| 未開始 | default（灰） | MinusCircleOutlined |

### 2.3. 画面遷移

- なし（モーダルダイアログ）
- PetriNetVisualizationは内部で別のモーダルを開く可能性あり

---

## 3. 機能仕様

### 3.1. 主要機能の詳細

#### 3.1.1. モーダルオープン時の初期化

**処理フロー:**
1. Props（open, fileData, managerId）を受け取る
2. useEffect()でopenがtrueになったらfetchFileDetails()を呼び出し
3. モックデータ（mockProjects.json）から該当プロジェクトを取得
4. APIレスポンス形式に変換してfileDetailsにセット
5. selectedWorkIndexを0にリセット

**依存関係:**
```typescript
useEffect(() => {
  if (open && fileData && managerId) {
    fetchFileDetails();
  } else if (!open) {
    setFileDetails(null);
    setSelectedWorkIndex(0);
    setError(null);
  }
}, [open, fileData, managerId, fetchFileDetails]);
```

#### 3.1.2. ファイル詳細取得（モックデータ使用）

**処理フロー:**
1. fileData.maimlFileKeyからプロジェクトIDを抽出
   ```typescript
   const projectIdMatch = fileData.maimlFileKey.match(/projects?\/(proj_\d+)/);
   ```
2. mockProjects.jsonから該当プロジェクトを検索
3. 800ms遅延してローディング表示をシミュレート
4. APIレスポンス形式に変換:
   - projectInfo: プロジェクト基本情報
   - fileInfo: ファイル情報とチェックアウト状態
   - workDetails: タスク一覧とトランジション進捗

**エラーハンドリング:**
- プロジェクトが見つからない場合
- その他のエラー

#### 3.1.3. メソッドフィルタリング

**処理フロー:**
1. projectInfo.methodsから複数メソッドがあるか判定
2. needsMethodFilter = projectMethods.length > 1
3. trueの場合のみメソッドフィルタを表示
4. selectedMethodに基づいてworkDetailsをフィルタ
5. filteredWorkDetailsを生成
6. フィルタ変更時はselectedWorkIndexを0にリセット

**フィルタロジック:**
```typescript
const filteredWorkDetails = useMemo(() => {
  if (!fileDetails?.workDetails) return [];
  if (!selectedMethod) return fileDetails.workDetails;
  
  return fileDetails.workDetails.filter(work => {
    return work.methodName === selectedMethod;
  });
}, [fileDetails?.workDetails, selectedMethod]);
```

#### 3.1.4. タスクタブ切り替え

**処理フロー:**
1. TabsコンポーネントのactiveKeyで制御
2. onChange={handleTabChange}でインデックス更新
3. selectedWork = filteredWorkDetails[selectedWorkIndex]
4. 選択されたタスクの詳細を表示

#### 3.1.5. PetriNetVisualization統合

**表示条件:**
```typescript
{fileDetails?.fileInfo && selectedWork.assignedWorkerId && (
  <PetriNetVisualization
    fileKey={fileDetails.fileInfo.maimlFileKey}
    workerId={selectedWork.assignedWorkerId}
    workId={selectedWork.workId}
    progressData={selectedWork.transitionProgress}
  />
)}
```

**Props:**
- fileKey: MAIMLファイルのS3キー
- workerId: 割り当てられた作業者ID
- workId: タスクID
- progressData: トランジション進捗データ配列

#### 3.1.6. トランジション進捗の表示

**List renderItem:**
1. transitionProgressをマップ
2. 各TransitionProgressをCardで表示
3. Row gutterで項目を配置
4. アイコン、名前、ステータスTag、作業者、開始/終了日を表示

**日時フォーマット:**
```typescript
new Date(dateString).toLocaleString('ja-JP', {
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})
```

#### 3.1.7. 再読み込み機能

**処理フロー:**
1. フッターの「再読み込み」ボタンクリック
2. fetchFileDetails()を再実行
3. loading状態でボタンを無効化
4. データ更新後、ボタンを有効化

#### 3.1.8. モーダルを閉じる

**処理フロー:**
1. フッターの「閉じる」ボタンまたはCloseIconクリック
2. onClose()コールバックを実行
3. useEffect()でopen===falseを検知
4. 状態をリセット:
   - fileDetails: null
   - selectedWorkIndex: 0
   - error: null

### 3.2. ボタン・操作の動作

| 操作 | 動作 | 状態変更 |
|------|------|---------|
| モーダルオープン | データ取得 | loading: true → false |
| 再読み込みボタン | API再取得 | loading: true → false |
| 閉じるボタン | モーダルを閉じる | open: false |
| CloseIcon | モーダルを閉じる | open: false |
| メソッドフィルター変更 | フィルタリング | selectedMethod更新, selectedWorkIndex: 0 |
| タブ切り替え | タスク切り替え | selectedWorkIndex更新 |
| エラーアラートの再試行 | データ再取得 | loading: true → false |

### 3.3. バリデーションルール

- なし（表示専用）

---

## 4. データ仕様

### 4.1. Props型定義

```typescript
interface WorkProgressDetailDialogProps {
  open: boolean;                 // モーダル表示状態
  onClose: () => void;           // モーダルを閉じるコールバック
  fileData: FileData | null;     // ファイルデータ
  managerId: string;             // 管理者ID
}
```

### 4.2. FileDetails型定義

```typescript
interface FileDetails {
  projectInfo?: {
    projectId: string;
    projectName: string;
    projectDescription?: string;
    owner: string;
    department?: string;
    status: 'planning' | 'in_progress' | 'pending' | 'completed';
    methods: string[];
    createdAt: string;
    updatedAt: string;
  };
  fileInfo: {
    fileName: string;
    maimlFileKey: string;
    organizationId: string;
    checkoutStatus?: {
      isCheckedOut: boolean;
      checkoutBy?: string;
    };
  };
  workDetails: WorkDetail[];
}
```

### 4.3. WorkDetail型定義

```typescript
interface WorkDetail {
  workId: string;
  taskNo: number;            // タスク連番（タスクNo）
  methodName?: string;
  assignedWorkerId?: string;
  workStatus: string;
  progressPercentage?: number;
  stats: {
    totalTransitions: number;
    completed: number;
    working: number;
    notStarted: number;
    completionRate: number;
  };
  transitionProgress?: TransitionProgress[];
}
```

### 4.4. TransitionProgress型定義

```typescript
interface TransitionProgress {
  transitionId: string;
  transitionName?: string;
  progressStatus: string;  // '完了', '作業中', '準備中', '休止中', '異常中', '未開始'
  assignedWorker?: string;
  startDate?: string;
  endDate?: string;
}
```

---

## 5. API連携

### 5.1. 現在の実装状況

このコンポーネントで必要なAPIは、現時点ではAPI仕様書に定義されていません。

**必要な機能:**
1. プロジェクトの詳細な進捗情報を取得
2. メソッド別タスク一覧を取得
3. トランジション進捗状態を取得

**現在の実装:**
- 全てモックデータ（`mockProjects.json`）で動作
- fileKeyからプロジェクトIDを抽出してモックデータを検索
- 800ms遅延でローディングをシミュレート

### 5.2. 将来のAPI実装（参考）

将来的に以下のAPIが実装される可能性があります：

**Option 1: プロジェクト管理APIを拡張**
- [プロジェクト管理API仕様書](../../api/api_project_management.md)に新しいエンドポイントを追加
- プロジェクト詳細と合わせて進捗情報を返す

**Option 2: 進捗確認APIを活用**
- [進捗確認API仕様書](../../api/api_progress_monitoring.md)の以下のAPIを組み合わせる：
  - `GET /api/v1/projects/:projectId/methods/:methodId/tasks` - メソッド別タスク一覧取得 🔴（未実装）
  - `GET /api/v1/tasks/:taskId` - タスク詳細取得 🔴（未実装）
- これらのAPIを組み合わせてプロジェクトの詳細な進捗情報を取得

**Option 3: 専用APIの新規作成**
- このコンポーネント専用のエンドポイントを新規作成
- プロジェクト情報、タスク一覧、トランジション進捗を一括取得

### 5.3. 現在の代替実装

**モックデータ取得フロー:**
```typescript
// 1. fileKeyからプロジェクトIDを抽出
const projectIdMatch = fileData.maimlFileKey.match(/projects?\/(proj_\d+)/);
const projectId = projectIdMatch ? projectIdMatch[1] : null;

// 2. mockProjects.jsonから検索
const mockProject = mockProjects.find(p => p.id === projectId);

// 3. APIレスポンス形式に変換
const response = {
  projectInfo: { 
    projectId: mockProject.id,
    projectName: mockProject.name,
    projectDescription: mockProject.description,
    // ...
  },
  fileInfo: {
    fileName: fileData.fileName,
    maimlFileKey: fileData.maimlFileKey,
    // ...
  },
  workDetails: mockProject.workDetails || []
};
```

**代替実装の使用方法:**
```typescript
// コンポーネント内でモックデータを使用
useEffect(() => {
  if (open && fileData && managerId) {
    fetchFileDetails(); // モックデータ取得関数
  }
}, [open, fileData, managerId]);

const fetchFileDetails = async () => {
  setLoading(true);
  try {
    // 800ms遅延でローディングをシミュレート
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const mockData = getMockProjectData(fileData.maimlFileKey);
    setFileDetails(mockData);
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};
```

**注意:** API実装時は、モックデータ取得を適切なAPI呼び出しに置き換える必要があります。

---

## 6. エラーハンドリング

### 6.1. エラーケース

| エラーケース | 処理 | 表示 |
|------------|------|------|
| プロジェクトが見つからない | setError() | Alert（error） |
| API取得失敗 | setError() | Alert（error） |
| fileData不足 | console.warn | - |
| workDetailsが空 | Alert表示 | info |
| transitionProgressが空 | Alert表示 | info |

### 6.2. エラーメッセージ

**Alert表示:**
- type="error"
- 再試行ボタン付き
- closable

---

## 7. UI/UXポリシー準拠

### 7.1. Ant Designコンポーネント使用

| コンポーネント | 使用箇所 | props |
|--------------|---------|-------|
| Modal | ダイアログ本体 | open, onCancel, width, style, styles, title, footer |
| Button | フッター、再試行 | icon, onClick, loading, type |
| Card | セクション | size, bordered, title, style |
| Tag | ステータス表示 | color, icon |
| Tabs | タスク切り替え | activeKey, onChange, items, type |
| List | トランジション一覧 | dataSource, renderItem |
| Space | 要素の配置 | direction, size, align, wrap |
| Row, Col | グリッドレイアウト | gutter, flex, xs, sm, md |
| Select | メソッドフィルター | placeholder, value, onChange, allowClear, options |
| Spin | ローディング | size, tip |
| Alert | エラー・情報表示 | message, description, type, showIcon, action |
| Typography | テキスト表示 | Text, Title |
| Flex | フレックスレイアウト | justify, align, gap, wrap |
| Divider | 区切り線 | - |

### 7.2. デザイントークン使用

```typescript
import { theme } from 'antd';
const { token } = theme.useToken();

// 使用箇所
padding: token.padding
paddingLG: token.paddingLG
paddingXS: token.paddingXS
paddingXXS: token.paddingXXS
margin: token.margin
marginXS: token.marginXS
fontSize: token.fontSize
fontSizeSM: token.fontSizeSM
colorBorder: token.colorBorder
colorBgLayout: token.colorBgLayout
colorBgContainer: token.colorBgContainer
colorSuccess: token.colorSuccess
colorSuccessBg: token.colorSuccessBg
colorPrimary: token.colorPrimary
colorPrimaryBg: token.colorPrimaryBg
colorInfo: token.colorInfo
colorInfoBg: token.colorInfoBg
```

### 7.3. レスポンシブ対応

**Grid.useBreakpoint()使用:**
```typescript
const screens = useBreakpoint();

// モーダル幅
width: screens.lg ? 1200 : screens.md ? 900 : '90%'

// グリッドレイアウト
<Col xs={24} sm={12} md={6}>
```

**ブレークポイント:**
- xs: モバイル（< 576px）
- sm: タブレット（≥ 576px）
- md: タブレット（≥ 768px）
- lg: デスクトップ（≥ 992px）

---

## 8. 実装ファイル

### 8.1. ソースファイルパス

```
frontend/src/components/progress/WorkProgressDetailDialog.tsx
```

### 8.2. 関連コンポーネント

| コンポーネント | パス | 役割 |
|--------------|------|------|
| PetriNetVisualization | ./PetriNetVisualization.tsx | Petri Net実験フロー図 |

### 8.3. モックデータ

| ファイル | パス | 内容 |
|---------|------|------|
| mockProjects.json | @/data/mock/ | プロジェクトモックデータ |

### 8.4. 型定義

| 型 | パス | 役割 |
|----|------|------|
| FileData | @/types/progress | ファイルデータ型 |
| FileDetails | @/types/progress | ファイル詳細型 |
| WorkDetail | @/types/progress | 作業詳細型 |
| TransitionProgress | @/types/progress | トランジション進捗型 |

---

## 9. 既知の課題・TODO

### 実装待ち

- [ ] API実装（現在はモックデータ使用）
- [ ] 本番環境でのAPI切り替え
- [ ] エラーハンドリングの強化
- [ ] ローディング状態の細分化

### 改善提案

- [ ] トランジションのフィルタリング（ステータス別）
- [ ] トランジションの検索機能
- [ ] エクスポート機能（CSV、PDF）
- [ ] 進捗グラフの追加
- [ ] リアルタイム更新（WebSocket）
- [ ] トランジション詳細モーダル
- [ ] 作業者別フィルター
- [ ] 日付範囲フィルター
- [ ] 統計情報の拡張
- [ ] 通知機能（進捗変更時）

---

## 10. 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 1.0.0 | 2026-01-21 | 初版作成 | Cline |
