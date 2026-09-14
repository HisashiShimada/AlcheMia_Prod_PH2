# フロントエンド規約

## 言語とフレームワーク

### 基本技術スタック
- **言語**: TypeScript
- **フレームワーク**: Next.js 15+
- **UIライブラリ**: Ant Design v6
- **パッケージマネージャー**: npm

### 主要ライブラリ
- **ReactFlow 11.11.4**: Petri Net可視化・編集
- **Axios 1.9.0**: HTTP通信
- **xml-js 1.6.11**: XMLパース
- **@emotion/react & @emotion/styled**: CSS-in-JS
- **lucide-react**: アイコン
- **html-to-image**: 画像エクスポート
- **papaparse**: CSVパース
- **react-draggable**: ドラッグ&ドロップ

## アーキテクチャ

### コンポーネント設計

#### ディレクトリ構造
```
frontend/src/
├── components/          # 再利用可能なコンポーネント（必要に応じて画面用コンポーネントフォルダを配下に作成）
│   └── common/         # 共通コンポーネント
├── pages/              # ページレベルのコンポーネント
├── hooks/              # カスタムフック
├── api/           # API通信サービス
├── utils/              # ユーティリティ関数
├── constants/          # 定数定義
└── css/                # グローバルスタイル
```

## コーディング規約

### コンポーネント記述規則

#### 関数コンポーネント
- 関数コンポーネントを標準とする
- クラスコンポーネントは使用しない

#### Propsの型定義
- PropTypesまたはJSDocで型を明示
- デフォルト値は分割代入で設定

#### Hooks の使用順序
1. useState
2. useReducer
3. useContext
4. useRef
5. useEffect
6. カスタムフック

### ファイル構成規則

#### コンポーネントファイルの順序
1. インポート（React、サードパーティ、内部モジュール）
2. 定数定義
3. ヘルパー関数
4. メインコンポーネント
5. エクスポート

### スタイリング規約

#### Ant Designの使用
- コンポーネントスタイリングにはAnt Designを優先
- `sx`プロップでインラインスタイルを適用
- テーマカスタマイズは最小限に

#### CSS-in-JS（Emotion）
- styled-componentsパターンを使用
- テーマ変数を活用
- 動的スタイリングに使用

#### グローバルスタイル
- css/ディレクトリで管理

### API通信規約

#### サービス層の使用（必須）

**画面コンポーネント（pages/・components/ 配下）から `fetch()` や `axios` を直接呼び出すことを禁止する。**
必ず `services/` 配下の APIサービスクラス・関数を経由すること。

```typescript
// ❌ 禁止: コンポーネント内で fetch / axios を直接呼び出す
const ProjectList: React.FC = () => {
  useEffect(() => {
    fetch('/api/projects')
      .then(res => res.json())
      .then(data => setProjects(data));
  }, []);
};

// ❌ 禁止: コンポーネント内に API URL をハードコーディング
const response = await axios.get('/api/v1/projects?status=1');

// ✅ 正しい: services/ 配下の APIサービスを経由する
import { getProjects } from '@/services/projectApiService';

const ProjectList: React.FC = () => {
  useEffect(() => {
    getProjects().then(data => setProjects(data));
  }, []);
};
```

**サービスファイルの配置:** `frontend/src/services/{機能名}ApiService.ts`

#### エラーハンドリング
- try-catchで適切に処理
- ユーザーフレンドリーなエラーメッセージ
- ローディング状態の管理

### 多言語対応規約（i18n）

本プロジェクトでは `LanguageContext` による独自の多言語対応システムを使用する。

#### ファイル構成

```
frontend/src/
├── locales/
│   ├── ja.json              # 日本語翻訳ファイル
│   ├── en.json              # 英語翻訳ファイル
│   └── organizations/       # テナント別カスタム翻訳
└── contexts/
    └── LanguageContext.tsx  # 翻訳コンテキスト（useLanguage / getTranslation）
```

#### 必須ルール

**① ユーザーに表示するすべての文字列は翻訳キーを使用すること**

```typescript
// ❌ 禁止: 日本語・英語をハードコーディング
<Button>保存</Button>
message.error('プロジェクトの取得に失敗しました');

// ✅ 正しい: 翻訳キーを使用
const { t } = useLanguage();
<Button>{t('common.save')}</Button>
message.error(t('project.fetchError'));
```

**② React コンポーネント内では `useLanguage()` フックを使用する**

```typescript
import { useLanguage } from '@/contexts/LanguageContext';

const MyComponent: React.FC = () => {
  const { t } = useLanguage();

  return <p>{t('some.translation.key')}</p>;
};
```

**③ 非コンポーネント（`.ts` ファイル、サービス層など）では `getTranslation()` を使用する**

```typescript
import { getTranslation } from '@/contexts/LanguageContext';

// ✅ React コンテキスト外（サービス、ユーティリティ等）での使用
export function formatErrorMessage(code: string): string {
  return getTranslation(`errors.${code}`);
}
```

**④ 新規文字列は `ja.json` と `en.json` の両方に必ず追加する**

```json
// locales/ja.json
{
  "project": {
    "fetchError": "プロジェクトの取得に失敗しました"
  }
}

// locales/en.json
{
  "project": {
    "fetchError": "Failed to fetch projects"
  }
}
```

**⑤ 翻訳キーの命名規則**

- ドット区切り階層構造: `{画面/機能名}.{要素}.{状態}`
- 例: `project.list.title`, `common.button.save`, `errors.network`
- キー名はすべて英語（camelCase）で記述



### カスタムフック規約

#### 命名規則
- `use`プレフィックスを使用
- 機能を明確に表す名前

#### 責任範囲
- 1つのフックは1つの責任
- 再利用可能な設計
- 副作用の適切な管理

### イベントハンドラ規約

#### 命名規則
- `handle`プレフィックスを使用
- `handle[Action]`の形式（例: `handleClick`, `handleSubmit`）

#### 非同期処理
- async/awaitを使用
- エラーハンドリングを必ず実装
- ローディング状態の管理
- **DB操作（登録・更新・削除）後は必ず `refetch()` を呼び出して画面を更新する**（詳細は「DB操作後の画面リフレッシュ規約」参照）

### フォーム処理規約

#### 制御されたコンポーネント
- valueとonChangeを使用
- フォーム状態を一元管理
- バリデーションを実装

---

### DB操作後の画面リフレッシュ規約（必須）

**DB登録・更新・削除が成功した後は、必ず対応するデータ取得関数（`refetch`）を呼び出して画面を最新状態に更新すること。**

#### ✅ 正しい実装パターン

```typescript
// useApi の refetch を使用（データ取得フック）
const { data, refetch } = useApi(fetchItems, []);

// 登録後のリフレッシュ
const handleCreate = async (formData: ItemFormData) => {
  const requestData: CreateItemRequest = {
    name: formData.name,
    description: formData.description,
  };
  await createItem(requestData);     // DB 書き込み（services/ 経由必須）
  await refetch();                   // ← 必須: 画面をリフレッシュ
  message.success(t('item.createSuccess'));
  setModalOpen(false);
};

// 更新後のリフレッシュ
const handleUpdate = async (id: string, formData: UpdateItemRequest) => {
  const requestData: UpdateItemRequest = {
    name: formData.name,
  };
  await updateItem(id, requestData); // DB 更新（services/ 経由必須）
  await refetch();                   // ← 必須: 画面をリフレッシュ
  message.success(t('item.updateSuccess'));
};

// 削除後のリフレッシュ
const handleDelete = async (id: string) => {
  await deleteItem(id);              // DB 削除（services/ 経由必須）
  await refetch();                   // ← 必須: 画面をリフレッシュ
  message.success(t('item.deleteSuccess'));
};
```

#### ❌ 禁止パターン

```typescript
// ❌ 禁止: DB 操作後にリフレッシュなし（古いデータが表示され続ける）
const handleCreate = async (formData: ItemFormData) => {
  const requestData: CreateItemRequest = { name: formData.name };
  await createItem(requestData);
  message.success(t('item.createSuccess')); // refetch なし → 画面が古いまま
};

// ❌ 禁止: window.location.reload() でページ全体をリロード（UX 悪化）
const handleDelete = async (id: string) => {
  await deleteItem(id);
  window.location.reload(); // ← 全体リロードは禁止（ページ状態がリセットされる）
};

// ❌ 禁止: router.refresh() を使う（Next.js のキャッシュ問題で不確実）
const handleCreate = async (formData: ItemFormData) => {
  await createItem(requestData);
  router.refresh(); // ← 禁止（refetch() を使うこと）
};
```

#### リフレッシュのタイミングと順序

DB 操作成功後は以下の順序で処理すること：

```
1. API 呼び出し（services/ 経由）
   ↓ 成功
2. await refetch()          ← データを最新化
   ↓
3. message.success(t(...))  ← 成功メッセージ表示
   ↓
4. モーダル/ダイアログを閉じる（該当する場合）
```

| 操作 | refetch タイミング |
|------|-----------------|
| 作成（Create） | API 成功後、モーダルを閉じる前 |
| 更新（Update） | API 成功後 |
| 削除（Delete） | API 成功後 |
| 一括操作 | 全操作完了後 |

#### useApi / useLazyApi の使い分け

```typescript
// データ取得（Read）: useApi を使用し refetch を保持する
const { data: items, isLoading, refetch } = useApi(fetchItems, []);

// データ書き込み（Create / Update / Delete）:
// services/ 配下の関数を直接 await するか、
// useLazyApi の execute で実行し、完了後に refetch を呼ぶ
const { execute: executeCreate } = useLazyApi(createItem, {
  onSuccess: async () => {
    await refetch(); // 書き込み成功後にリフレッシュ
  },
});
```

#### 複数データソースがある場合

複数の `useApi` を使っている場合は、変更されたデータソースの `refetch` を呼ぶこと：

```typescript
const { data: projects, refetch: refetchProjects } = useApi(fetchProjects, []);
const { data: tasks,    refetch: refetchTasks    } = useApi(fetchTasks, [projectId], [projectId]);

// プロジェクト削除 → プロジェクト一覧をリフレッシュ
const handleDeleteProject = async (id: string) => {
  await deleteProject(id);
  await refetchProjects(); // ← 影響するデータのみをリフレッシュ
  message.success(t('project.deleteSuccess'));
};
```

---

### 他ユーザーのDB変更への対応（推奨）

自分が操作していない場合でも、**他のユーザーがDBを書き換えた最新情報を画面に表示する**ため、
`useApi` の以下のオプションを用途に応じて使用すること。

#### ① refetchOnWindowFocus（推奨・低負荷）

ブラウザのタブに戻った時（`visibilitychange: visible`）に自動でデータを再取得する。  
他のタブで別の作業をしてから画面に戻った時に最新状態が表示される。  
**一覧画面など複数ユーザーが参照するデータには原則として設定することを推奨。**

```typescript
// ✅ タブ復帰時に自動リフレッシュ（他ユーザーの変更を即時反映）
const { data: projects, refetch: refetchProjects } = useApi(
  fetchProjects,
  [],
  { refetchOnWindowFocus: true }
);
```

#### ② refetchInterval（リアルタイム性が必要な場面）

指定間隔（ミリ秒）ごとに自動でデータを再取得する。  
ステータス監視・バッチ処理確認など、**常に最新状態が求められる画面**に使用する。  
⚠️ **サーバー負荷を考慮して最小 `30_000`（30秒）以上を推奨。**  
ジョブ完了待ちなど短周期が必要な場合は `3_000〜5_000` を使用し、完了後は停止すること。

```typescript
// ✅ 30秒ごとに自動リフレッシュ（ステータス監視など）
const { data: jobList } = useApi(
  fetchJobs,
  [],
  { refetchInterval: 30_000 }
);

// ✅ 組み合わせ：タブ復帰 + 定期ポーリング
const { data: tasks } = useApi(
  fetchTasks,
  [projectId],
  {
    refetchOnWindowFocus: true,
    refetchInterval: 30_000,
  }
);
```

#### ③ 手動リフレッシュボタン（共通）

すべての一覧画面には手動リフレッシュボタン（`<Button icon={<ReloadOutlined />}>`）を設置し、  
`refetch()` を呼ぶハンドラを割り当てること。自動リフレッシュとの併用を推奨。

```typescript
const { data, refetch } = useApi(fetchItems, [], { refetchOnWindowFocus: true });

const handleManualRefresh = useCallback(() => {
  refetch();
}, [refetch]);

// JSX
<Button icon={<ReloadOutlined />} onClick={handleManualRefresh}>
  {t('common.refresh')}
</Button>
```

#### 使い分けの基準

| 画面の特性 | 推奨設定 |
|-----------|---------|
| 一般的な一覧画面（複数ユーザーが参照） | `refetchOnWindowFocus: true` |
| ステータス・進捗を定期確認する画面 | `refetchOnWindowFocus: true` + `refetchInterval: 30_000` |
| バッチ・ジョブ実行中の監視（短期） | `refetchInterval: 3_000〜5_000`（完了後は停止） |
| 自分専用の入力フォームのみ（一覧なし） | 不要 |

#### ❌ 禁止パターン

```typescript
// ❌ 禁止: window.location.reload() による全体リロード
const handleRefresh = () => {
  window.location.reload(); // ← ページ状態がすべてリセットされる
};

// ❌ 禁止: refetchInterval に短すぎる間隔（サーバー負荷増大）
const { data } = useApi(fetchList, [], { refetchInterval: 1_000 }); // 1秒は禁止
```

---

### パフォーマンス最適化

#### React.memo の使用
- 不要な再レンダリングを防ぐ
- 重いコンポーネントに適用

#### useCallback の使用
- 関数の再生成を防ぐ
- 子コンポーネントへのpropsとして渡す関数

#### useMemo の使用
- 計算コストの高い処理
- 派生状態の計算

### エラーハンドリング

#### Error Boundary
- クラスコンポーネントとして実装
- アプリケーション全体をラップ

#### ユーザーフレンドリーなエラー表示
- 明確なエラーメッセージ
- 再試行オプションの提供
- ログへの記録

### アクセシビリティ

#### ARIA属性の使用
- ボタン、リンクに適切なラベル
- フォーム要素にlabel関連付け
- キーボード操作のサポート

#### セマンティックHTML
- 意味のあるHTML要素を使用
- `<button>`、`<nav>`、`<main>`など

### テスト可能な設計

#### 純粋関数の使用
- 副作用を最小限に
- テストしやすいコード構造

#### Propsの明示
- コンポーネントの依存関係を明確に
- モック化しやすい設計

## ベストプラクティス

### DO（推奨）
✅ 関数コンポーネントとHooksを使用する
✅ コンポーネントを小さく保つ（200行以内）
✅ propsは分割代入で受け取る
✅ 早期リターンでネストを減らす
✅ Ant Designコンポーネントを活用する
✅ カスタムフックで共通ロジックを抽出する
✅ useEffectの依存配列を正しく設定する
✅ エラーハンドリングを適切に実装する
✅ **DB登録・更新・削除の成功後は必ず `refetch()` を呼び出して画面をリフレッシュする**

### DON'T（非推奨）
❌ クラスコンポーネントを新規作成しない
❌ インラインで大きな関数を定義しない
❌ useEffectの依存配列を省略しない
❌ 不必要なuseEffectを使用しない
❌ グローバル変数を使用しない
❌ コンポーネント内でAPI URLをハードコーディングしない
❌ console.logを本番コードに残さない
❌ **コンポーネント内で fetch() / axios を直接呼び出さない（services/ 経由必須）**
❌ **ユーザー表示文字列を日本語・英語でハードコーディングしない（翻訳キー必須）**
❌ **DB操作後に `refetch()` を呼ばないまま画面を更新しない（古いデータが残る）**
❌ **DB操作後に `window.location.reload()` や `router.refresh()` を使わない（`refetch()` を使うこと）**
