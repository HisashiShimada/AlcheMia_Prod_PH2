# タスク計画書: PrefixManagement.tsx API接続修正

## メタデータ
- **作成日時**: 2026-07-15 14:46
- **タスクID**: PrefixManagement_API接続修正
- **優先度**: 高
- **推定工数**: 1時間

## タスク概要

`PrefixManagement.tsx` がモックデータ（`uncertainty-scope.json`）を使用しており、
DBと接続されていない問題を修正する。

## 問題点

1. **データ取得**: `uncertainty-scope.json` のモックJSONから読み込んでいる
2. **保存API**: `/api/v1/namespaces/prefixes` という存在しないエンドポイントを使用
   - 正しいエンドポイント: `POST /api/v1/namespaces`
3. **削除API**: 未接続

## 修正内容

### 修正ファイル
- `frontend/src/components/namespace/PrefixManagement.tsx`

### 変更概要
1. モックデータインポートを削除
2. `useEffect` で `getNamespaceList()` を呼び出してDB取得に切り替え
3. 保存処理を `createNamespace()` に修正（URL修正）
4. 削除処理を `deleteNamespace()` に修正
5. モックデータに依存するツリー構造ロジックを削除（シンプル化）

## 承認記録
- **承認日時**: 2026-07-15 14:46
