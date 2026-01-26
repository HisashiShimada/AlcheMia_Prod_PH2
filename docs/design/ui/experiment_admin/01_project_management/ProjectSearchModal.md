# ProjectSearchModal - プロジェクト詳細検索モーダル

## 1. 概要

### 1.1 コンポーネントの目的
MAIMLファイルの属性を条件にプロジェクトを検索するモーダルダイアログ。Document情報、測定データ、MaiML属性など複数の条件を組み合わせて高度な検索が可能です。

### 1.2 使用場面
- プロジェクト管理画面のツールバーで「詳細検索」ボタンをクリックした際に表示
- MAIML属性を条件に複雑な検索を行う場合

### 1.3 アクセス権限
- **必須ロール**: experiment_admin
- **認証**: JWT + Session Hybrid認証

---

## 2. 画面構成

### 2.1 レイアウト構造

```
┌──────────────────────────────────────────────────┐
│ 🔍 プロジェクト詳細検索                    [×]   │ ← ヘッダー
├──────────────────────────────────────────────────┤
│                                                  │
│ ℹ️ MAIML統合テーブル高速検索                     │
│ （説明文）                                       │
│                                                  │
│ ┌─ 検索条件 ────────────────────── [+] [↻] ────┐│
│ │                                              ││
│ │ [1] [属性選択▼] [検索値入力................] ││
│ │                                              ││
│ │ ──────────────── AND ────────────────────   ││
│ │                                              ││
│ │ [2] [属性選択▼] [検索値入力................] ││
│ │                                              ││
│ │                          [検索ボタン]       ││
│ └──────────────────────────────────────────────┘│
│                                                  │
│ ✅ 検索統計表示（検索後）                        │
│ プロジェクト数: 2件 | マッチ数: 3箇所 | 検索時間: 45ms │
│                                                  │
│ ┌─ 検索結果 (2件) ─────────────────────────────┐│
│ │ ┌────────────────────────────────────────┐  ││
│ │ │ 📄 [プロジェクト名]  [ステータス] [2マッチ] ││
│ │ │ 📋 ID: project_001                     │  ││
│ │ │ 概要テキスト...                        │  ││
│ │ │ 👤所有者 🏢部署 📅作成日               │  ││
│ │ │ 🎯 ヒット属性: [Document名: xxx]       │  ││
│ │ └────────────────────────────────────────┘  ││
│ │ （以下、結果カード繰り返し）                 ││
│ └──────────────────────────────────────────────┘│
└──────────────────────────────────────────────────┘
```

**モーダルサイズ:**
- 幅: 900px
- 高さ: 最大100vh - 200px（スクロール可能）

### 2.2 主要UI要素

#### 2.2.1 検索説明エリア
- Alert（type: info）
- タイトル: "MAIML統合テーブル高速検索"
- 説明文: 検索機能の概要と使用方法

#### 2.2.2 検索条件カード

**ヘッダー:**
- タイトル: "検索条件"
- 追加ボタン: 条件追加（最大5件まで）
- リセットボタン: 全条件クリア

**検索条件行（最大5行）:**
| 要素 | 説明 |
|------|------|
| 番号バッジ | 1～5（赤背景、白文字） |
| 属性選択 | Select（カテゴリグループ化） |
| 検索値入力 | Input（Enterキーで検索実行） |
| 削除ボタン | CloseOutlined（2行目以降のみ） |

**区切り:**
- 条件間に"AND"の区切り線

**フッター:**
- 検索ボタン（プライマリ、大サイズ）

#### 2.2.3 エラー表示（条件付き）
- Alert（type: error、閉じるボタン付き）

#### 2.2.4 検索統計カード（検索後のみ）
- 緑背景（#E8F5E9）
- 表示項目:
  - プロジェクト数
  - マッチ数
  - 検索時間（ms）
  - 検索条件数

#### 2.2.5 検索結果カード

**ヘッダー:**
- タイトル: "検索結果"
- 件数タグ（成功カラー）

**結果表示:**
- 結果なし: Empty コンポーネント
- 結果あり: プロジェクトカード一覧

**プロジェクトカード構成:**
```
┌────────────────────────────────────────┐
│ 📄 プロジェクト名  [ステータス] [2マッチ] │
│ 📋 ID: project_001                     │
│ 概要テキスト...                        │
│ 👤所有者 🏢部署 📅作成日               │
│ [タグ1] [タグ2]                        │
│ 🎯 ヒット属性: [属性名: 値]            │
└────────────────────────────────────────┘
```

---

## 3. 機能仕様

### 3.1 検索属性の定義

#### 3.1.1 属性カテゴリ

```typescript
const ATTRIBUTE_CATEGORIES = {
  document: { label: 'Document情報', icon: '📄', color: '#CF0027' },
  data: { label: '測定データ', icon: '📊', color: '#0093CF' },
  structure: { label: 'ファイル構造', icon: '🏗️', color: '#ed6c02' },
  attributes: { label: 'MaiML属性', icon: '🏷️', color: '#2e7d32' },
};
```

#### 3.1.2 検索可能属性一覧

**Document情報:**
- `document.uuid` - Document UUID
- `document.name` - Document名
- `document.description` - Document説明

**測定データ:**
- `measurement_value` - 測定値
- `units` - 単位

**ファイル構造:**
- `section_type` - セクション種別

**MaiML属性（NEW）:**
- `id` - ID属性
- `ref` - Ref属性
- `key` - Key属性
- `element` - Element名
- `value` - 汎用Value

### 3.2 検索条件の管理

#### 3.2.1 検索条件の追加
```typescript
const addSearchCriteria = () => {
  if (searchCriteria.length < 5) {  // 最大5件まで
    setSearchCriteria([...searchCriteria, { attribute: '', value: '' }]);
  }
};
```

**制限:**
- 最大5つまで追加可能
- 5件に達すると追加ボタンが非表示

#### 3.2.2 検索条件の更新
```typescript
const updateSearchCriteria = (
  index: number,
  field: 'attribute' | 'value',
  value: string
) => {
  const newCriteria = [...searchCriteria];
  newCriteria[index][field] = value;
  setSearchCriteria(newCriteria);
};
```

#### 3.2.3 検索条件の削除
```typescript
const removeSearchCriteria = (index: number) => {
  if (searchCriteria.length > 1) {  // 最低1件は残す
    const newCriteria = searchCriteria.filter((_, i) => i !== index);
    setSearchCriteria(newCriteria);
  }
};
```

**制限:**
- 最低1件は残す
- 1件のみの場合、削除ボタン非表示

#### 3.2.4 リセット
```typescript
const handleReset = () => {
  setSearchCriteria([{ attribute: '', value: '' }]);
  setSearchResults([]);
  setError(null);
  setSearchStats(null);
};
```

### 3.3 検索実行

#### 3.3.1 検索フロー
```typescript
const handleSearch = async () => {
  setError(null);
  setSearchStats(null);

  // 1. 有効な検索条件のフィルタリング
  const validCriteria = searchCriteria.filter(
    (criteria) => criteria.attribute && criteria.value.trim()
  );

  // 2. バリデーション
  if (validCriteria.length === 0) {
    setError('検索条件を1つ以上設定してください');
    return;
  }

  // 3. 検索実行
  const searchStartTime = Date.now();
  setIsSearching(true);
  
  try {
    // TODO: 実際のAPI呼び出し
    // const results = await searchProjectsEnhanced(validCriteria);
    
    // 4. 結果の設定
    setSearchResults(mockResults);
    setSearchStats({
      totalFiles: mockResults.length,
      totalMatches: mockResults.reduce((sum, file) => sum + file.matchCount, 0),
      searchDuration: Date.now() - searchStartTime,
      totalCriteria: validCriteria.length,
    });
    
    // 5. 結果なしの場合
    if (mockResults.length === 0) {
      setError('検索条件に一致するプロジェクトが見つかりませんでした');
    }
  } catch (err) {
    setError(`検索エラー: ${err.message}`);
    setSearchResults([]);
  } finally {
    setIsSearching(false);
  }
};
```

#### 3.3.2 検索実行トリガー
- 検索ボタンクリック
- 検索値入力フィールドでEnterキー押下

#### 3.3.3 検索ボタンの有効化条件
```typescript
const hasValidCriteria = useMemo(() => {
  return searchCriteria.some(c => c.attribute && c.value.trim());
}, [searchCriteria]);

// 無効化条件:
// - isSearching === true
// - hasValidCriteria === false
```

### 3.4 プロジェクト選択

#### 3.4.1 選択フロー
```typescript
const handleProjectSelect = (project: SearchResult) => {
  console.log('📋 プロジェクト選択:', project.name);
  onProjectSelect(project.id);  // 親コンポーネントへ通知
  handleClose();                 // モーダルを閉じる
};
```

**動作:**
- プロジェクトカードをクリック
- 親コンポーネントの`onProjectSelect`ハンドラ呼び出し
- モーダルを閉じる

### 3.5 モーダルを閉じる

#### 3.5.1 クリーンアップ処理
```typescript
const handleClose = () => {
  setSearchCriteria([{ attribute: '', value: '' }]);
  setSearchResults([]);
  setError(null);
  setSearchStats(null);
  onClose();
};
```

**実行タイミング:**
- ×ボタンクリック
- モーダル外クリック
- Escキー押下
- プロジェクト選択後

---

## 4. データ仕様

### 4.1 Props定義

```typescript
interface ProjectSearchModalProps {
  open: boolean;                              // モーダル表示状態
  onClose: () => void;                        // 閉じるハンドラ
  onProjectSelect: (projectId: string) => void; // プロジェクト選択ハンドラ
}
```

### 4.2 SearchCriteria型定義

```typescript
interface SearchCriteria {
  attribute: string;  // 検索属性（例: "document.name"）
  value: string;      // 検索値
}
```

### 4.3 SearchResult型定義

```typescript
interface SearchResult {
  id: string;                // プロジェクトID
  name: string;              // プロジェクト名
  description: string;       // 概要
  owner: string;             // 所有者
  department: string;        // 部署
  status: string;            // ステータス
  tags: string[];            // タグ
  createdAt: string;         // 作成日
  updatedAt: string;         // 更新日
  isCheckedOut: boolean;     // チェックアウト状態
  matchCount: number;        // マッチ数
  matchedAttributes?: Array<{
    attribute: string;
    value: string;
  }>;
}
```

### 4.4 SearchStats型定義

```typescript
interface SearchStats {
  totalFiles: number;        // 検索結果のプロジェクト数
  totalMatches: number;      // 総マッチ数
  searchDuration: number;    // 検索時間（ms）
  totalCriteria: number;     // 検索条件数
}
```

### 4.5 State定義

```typescript
const [searchCriteria, setSearchCriteria] = useState<SearchCriteria[]>([
  { attribute: '', value: '' }
]);
const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
const [isSearching, setIsSearching] = useState(false);
const [error, setError] = useState<string | null>(null);
const [searchStats, setSearchStats] = useState<SearchStats | null>(null);
```

---

## 5. API連携

### 5.1 直接使用するAPI
このコンポーネント自体はAPIを直接呼び出しません（現在はモックデータで動作）。

### 5.2 将来的な実装（未実装） 🔴

**使用予定API:**
- POST `/api/v1/projects/search` - プロジェクト詳細検索（MAIML統合テーブル検索） 🔴

**優先度:** ⭐⭐ 中

**詳細:** 将来的に[プロジェクト管理API仕様書](../../api/api_project_management.md)に追加予定

**Request:**
```http
POST /api/v1/projects/search
Authorization: Bearer maiml_session-{sessionId}_{timestamp}
X-Organization-Id: {organization_id}
Content-Type: application/json

{
  "criteria": [
    {
      "attribute": "document.name",
      "value": "実験"
    },
    {
      "attribute": "measurement_value",
      "value": "100"
    }
  ],
  "page": 1,
  "limit": 20
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "projects": [
      {
        "project_id": "550e8400-e29b-41d4-a716-446655440000",
        "project_name": "実験プロジェクトA",
        "description": "...",
        "project_status": "in_progress",
        "is_checked_out": false,
        "owner_name": "田中太郎",
        "department_name": "材料開発部",
        "match_count": 2,
        "matched_attributes": [
          {
            "attribute": "document.name",
            "value": "実験データ"
          }
        ],
        "created_at": "2026-01-15T10:00:00Z",
        "updated_at": "2026-01-20T15:30:00Z"
      }
    ],
    "stats": {
      "total_projects": 2,
      "total_matches": 3,
      "search_duration_ms": 45,
      "criteria_count": 2
    }
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalItems": 2,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  },
  "meta": {
    "timestamp": "2026-01-23T08:00:00Z",
    "requestId": "req_abc123"
  }
}
```

### 5.3 現在の実装
- モックデータで動作
- 実際のAPI呼び出しは未実装
- 検索条件のバリデーションのみ実装済み

---

## 6. UI/UXポリシー準拠

### 6.1 Ant Designコンポーネント使用

| 用途 | コンポーネント | Props |
|------|---------------|-------|
| モーダル | Modal | width=900, destroyOnClose |
| 検索条件 | Card | bordered=false |
| 属性選択 | Select | showSearch, optionFilterProp |
| 検索値入力 | Input | onPressEnter |
| 統計表示 | Card | size="small" |
| 結果カード | Card | size="small", hoverable |
| 空状態 | Empty | - |
| 警告表示 | Alert | type="info", "error" |
| タグ | Tag | color（動的） |
| スペース | Space | direction, size |

### 6.2 カラーパレット

| 要素 | 色 | 用途 |
|------|-----|------|
| 番号バッジ | #CF0027 | 検索条件番号 |
| Document | #CF0027 | Documentカテゴリ |
| Data | #0093CF | 測定データカテゴリ |
| Structure | #ed6c02 | ファイル構造カテゴリ |
| Attributes | #2e7d32 | MaiML属性カテゴリ |
| 統計カード背景 | #E8F5E9 | 検索統計表示 |

### 6.3 レスポンシブ対応

```typescript
styles={{
  body: {
    maxHeight: 'calc(100vh - 200px)',
    overflowY: 'auto'
  }
}}
```

---

## 7. ステータス表示

### 7.1 ステータスマッピング

```typescript
const getStatusLabel = (status: string) => {
  const statusMap: Record<string, { label: string; color: string }> = {
    planning: { label: '計画中', color: 'default' },
    pending: { label: '保留', color: 'blue' },
    in_progress: { label: '進行中', color: 'cyan' },
    review_waiting: { label: 'レビュー待ち', color: 'purple' },
    completed: { label: '完了', color: 'success' },
    error: { label: 'エラー', color: 'error' },
  };
  return statusMap[status] || { label: status, color: 'default' };
};
```

---

## 8. エラーハンドリング

### 8.1 エラーケース

| エラーケース | 原因 | 対処方法 |
|-------------|------|----------|
| 検索条件未設定 | 属性・値が未入力 | エラーメッセージ表示 |
| 検索結果なし | 条件に一致するプロジェクトなし | エラーメッセージ表示 |
| API呼び出し失敗 | ネットワークエラー等 | エラーメッセージ表示 |

### 8.2 エラーメッセージ

```typescript
// 条件未設定
'検索条件を1つ以上設定してください'

// 結果なし
'検索条件に一致するプロジェクトが見つかりませんでした'

// API エラー
`検索エラー: ${err.message}`
```

---

## 9. 実装ファイル

### 9.1 ファイルパス
```
frontend/src/components/project/ProjectSearchModal.tsx
```

### 9.2 依存コンポーネント
- なし（単独で動作）

### 9.3 依存ライブラリ
- antd: Modal, Input, Select, Button, Space, Tag, Typography, Divider, Alert, Card, Empty
- @ant-design/icons: 各種アイコン
- React: useState, useMemo

---

## 10. パフォーマンス最適化

### 10.1 useMemo使用

```typescript
// 属性セレクトオプションのメモ化
const attributeOptions = useMemo(() => {
  return Object.entries(ATTRIBUTE_CATEGORIES).map(([category, catInfo]) => ({
    label: catInfo.label,
    options: SEARCHABLE_ATTRIBUTES.filter(attr => attr.category === category)
  }));
}, []);

// 検索条件有効性チェックのメモ化
const hasValidCriteria = useMemo(() => {
  return searchCriteria.some(c => c.attribute && c.value.trim());
}, [searchCriteria]);
```

---

## 11. 既知の課題・TODO

### 11.1 既知の課題
- 実際のAPI呼び出しが未実装（モックデータで動作）
- 検索結果のページング機能なし
- 検索履歴機能なし

### 11.2 将来の改善案
- [ ] 実際のAPI呼び出し実装
- [ ] 検索結果のページング
- [ ] 検索履歴の保存・再利用
- [ ] 検索条件のプリセット機能
- [ ] エクスポート機能（CSV, Excel）
- [ ] 高度な検索演算子（OR, NOT等）
- [ ] 検索条件の保存・読み込み
- [ ] 検索結果のソート機能

---

## 12. テスト観点

### 12.1 単体テスト
- [ ] 検索条件の追加・削除が正しく動作する
- [ ] 検索条件の最大数制限（5件）が機能する
- [ ] 検索条件の最小数制限（1件）が機能する
- [ ] 有効な検索条件のバリデーション
- [ ] ステータスラベルの変換が正しい
- [ ] エラーメッセージが正しく表示される

### 12.2 統合テスト
- [ ] 親コンポーネントへのプロジェクトID通知
- [ ] モーダル開閉時のステートクリア
- [ ] 検索実行から結果表示までのフロー

### 12.3 E2Eテスト
- [ ] 検索条件の入力から結果表示
- [ ] プロジェクト選択から画面遷移
- [ ] エラーケースの動作確認

---

## 13. 変更履歴

| 日付 | バージョン | 変更内容 | 担当者 |
|------|-----------|---------|--------|
| 2026-01-21 | 1.0.0 | 初版作成 | Cline |

---

## 14. 関連ドキュメント

- [ProjectManagement仕様](./ProjectManagement.md) - 親コンポーネント
- [UIポリシー](.clinerules/references/ui_policy.md) - UI設計ルール
- [検索機能仕様](../../../cline_archives/検索機能_仕様.md) - 検索ロジック詳細（存在する場合）
