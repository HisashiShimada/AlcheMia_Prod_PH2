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

### フォーム処理規約

#### 制御されたコンポーネント
- valueとonChangeを使用
- フォーム状態を一元管理
- バリデーションを実装

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
