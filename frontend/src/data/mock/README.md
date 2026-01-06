# モックデータ使用ガイド

## 概要

Backend API完成までの暫定対応として、モックデータとモックAPIユーティリティを実装しました。

## ファイル構成

```
frontend/src/data/mock/
├── README.md                      # このファイル
├── mockPetriNetStructure.json     # ペトリネット構造のモックデータ
├── mockTransitionStatus.json      # トランジション進捗のモックデータ
└── mockExperimentRecords.json     # 実験記録のモックデータ

frontend/src/utils/
└── mockApiUtils.ts                # モックAPIユーティリティ関数
```

## モックAPIの有効化

### 方法1: 環境変数で制御（推奨）

`frontend/.env.development` ファイルを作成して以下を記述：

```bash
# モックAPIを使用
REACT_APP_USE_MOCK_API=true
```

実APIを使用する場合は：

```bash
# 実APIを使用
REACT_APP_USE_MOCK_API=false
```

### 方法2: 開発環境では自動的にモックを使用

環境変数が設定されていない場合、`NODE_ENV=development` のときは自動的にモックAPIを使用します。

```javascript
// frontend/src/utils/mockApiUtils.ts の判定ロジック
export function shouldUseMockAPI(): boolean {
  return process.env.REACT_APP_USE_MOCK_API === 'true' || 
         process.env.NODE_ENV === 'development';
}
```

## モックデータの構造

### 実際のMAIMLファイルベース

モックデータは`frontend/src/data/mock/test_omori11.maiml`の実際の構造に基づいています。

**test_omori11.maimlの構造:**
- **Method 1**: 2個のトランジション（混ぜ合わせる、New transition）、7個のPlace
  - Material: 4個（material01, material02, material03, material 04）
  - Condition: 1個（condition 01）
  - Result: 2個（途中結果、最終結果）
- **Method 2**: 1個のトランジション（New transition）、3個のPlace
  - Material: 1個（material2-1）
  - Condition: 1個（condition2-1）
  - Result: 1個（最終結果）

### 1. mockPetriNetStructure.json

ペトリネット構造（Place、Transition、Arc）のモックデータ。test_omori11.maimlの構造を完全に再現しています。

```json
{
  "proj_001": {
    "success": true,
    "data": {
      "fileKey": "organizations/org_001/projects/proj_001/test_omori11.maiml",
      "isMultiMethod": true,
      "methods": ["method_1764899170484", "method_1764899692529"],
      "places": [
        {
          "id": "transition-1764899405147",
          "name": "混ぜ合わせる",
          ...
        }
      ],
      "transitions": [...],
      "arcs": [...]
    }
  }
}
```

### 2. mockTransitionStatus.json

トランジション進捗状態のモックデータ。

```json
{
  "worker_001_proj_001": {
    "success": true,
    "data": {
      "workerId": "worker_001",
      "transitionStatus": [
        {
          "transitionId": "transition_001",
          "latestStatus": "completed",
          "progressStatus": "完了",
          ...
        }
      ]
    }
  }
}
```

### 3. mockExperimentRecords.json

実験記録（材料、測定条件、結果）のモックデータ。

```json
{
  "work_001": {
    "success": true,
    "data": {
      "materials": [...],
      "conditions": [...],
      "results": [...]
    }
  }
}
```

## モックAPIの使用例

### PetriNetVisualization.tsx での使用

```typescript
import {
  shouldUseMockAPI,
  fetchPetriNetStructureMock,
  fetchTransitionStatusMock,
  fetchExperimentRecordsMock,
} from '@/utils/mockApiUtils';

const useMock = shouldUseMockAPI();

if (useMock) {
  // モックAPIを使用
  const structureResult = await fetchPetriNetStructureMock(fileKey);
  const progressResult = await fetchTransitionStatusMock(workerId, fileKey);
  const recordsResult = await fetchExperimentRecordsMock(workId);
} else {
  // 実APIを使用
  const response = await fetch(`/api/worker/petri-net-structure/${fileKey}`);
}
```

## モックデータの追加方法

### 新しいプロジェクトのモックデータを追加

`mockPetriNetStructure.json` に新しいキーを追加：

```json
{
  "proj_001": { ... },
  "proj_002": {
    "success": true,
    "data": {
      "fileKey": "organizations/org_001/projects/proj_002/experiment.maiml",
      "places": [...],
      "transitions": [...],
      "arcs": [...]
    }
  }
}
```

### 新しいワーカーの進捗データを追加

`mockTransitionStatus.json` に新しいキーを追加：

```json
{
  "worker_001_proj_001": { ... },
  "worker_002_proj_001": {
    "success": true,
    "data": {
      "workerId": "worker_002",
      "transitionStatus": [...]
    }
  }
}
```

## トラブルシューティング

### モックAPIが動作しない

1. 環境変数が正しく設定されているか確認
2. ブラウザのコンソールログを確認（`🔧 [PetriNetVisualization] API モード: モック` と表示されるはず）
3. Next.jsサーバーを再起動（環境変数変更後）

### データが表示されない

1. `mockPetriNetStructure.json` にプロジェクトIDのデータが存在するか確認
2. ファイルキーのフォーマットが正しいか確認（`organizations/org_XXX/projects/proj_XXX/experiment.maiml`）
3. コンソールログでデータ取得状況を確認

## Backend API完成後の移行

モックAPIから実APIへの移行は簡単です：

1. `.env.development` で `REACT_APP_USE_MOCK_API=false` に設定
2. または本番環境では自動的に実APIが使用される
3. コードの変更は不要（モックAPIユーティリティが自動で切り替え）

## 関連ファイル

- `frontend/src/components/progress/PetriNetVisualization.tsx` - モックAPIを使用するコンポーネント
- `frontend/src/utils/mockApiUtils.ts` - モックAPI実装
- `frontend/src/types/progress.ts` - 型定義
