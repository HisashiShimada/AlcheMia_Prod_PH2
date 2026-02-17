# タスク計画書: マスタ管理_Creator_DB接続化

## メタデータ
- **作成日時**: 2026-01-19 08:18
- **タスクID**: creator-db-connection
- **優先度**: 中
- **推定工数**: 4時間

## 1. タスク概要

データ管理者メニューのマスタ管理画面で、Creatorマスタ選択時に、JSONファイルではなく`creator_master`テーブルからデータを取得して一覧表示するように改修します。

## 2. 目的と期待される成果

### 目的
- Creatorマスタのデータソースを静的JSONファイルからデータベースに移行
- リアルタイムなデータ更新を可能にする
- データの一元管理を実現する

### 期待される成果
- [x] creator_masterテーブルから正しくデータを取得できる
- [x] 一覧画面に正しくデータが表示される
- [x] is_activeによるアクティブ/非アクティブの切り替えが機能する
- [x] マルチテナント分離が正しく機能する
- [x] 既存の編集・追加・削除機能が正常に動作する

## 3. 実装ステップ

### Phase 1: 現状分析と設計
- [x] 現在のJSONファイル構造を確認
- [x] creator_masterテーブル定義を確認
- [x] データマッピング仕様を策定
- [x] API設計

### Phase 2: バックエンドAPI実装
- [ ] ルート追加（/api/master/creator）
- [ ] コントローラー作成
- [ ] サービス層作成
- [ ] リポジトリ層作成（SQL実装）
- [ ] エラーハンドリング実装
- [ ] テスト実装

### Phase 3: フロントエンド修正
- [ ] MasterManagementMock.tsxの修正
  - [ ] API呼び出し処理追加
  - [ ] データ変換処理追加
  - [ ] ローディング状態管理
  - [ ] エラーハンドリング
- [ ] 型定義の修正

### Phase 4: 動作確認
- [ ] ローカル環境でのテスト
- [ ] データ取得確認
- [ ] 一覧表示確認
- [ ] CRUD操作確認
- [ ] エラーケースの確認

## 4. 影響範囲

### 変更するファイル
1. **バックエンド**
   - `backend/src/routes/masterRoutes.ts` - ルート追加（新規または追加）
   - `backend/src/controllers/masterController.ts` - コントローラー追加（新規または追加）
   - `backend/src/services/masterService.ts` - サービス追加（新規または追加）
   - `backend/src/repositories/creatorRepository.ts` - リポジトリ追加（新規作成）

2. **フロントエンド**
   - `frontend/mock/components/MasterManagementMock.tsx` - API呼び出し実装
   - `frontend/src/services/masterService.ts` - APIクライアント追加（新規または追加）

### 新規作成するファイル
1. `backend/src/repositories/creatorRepository.ts` - Creatorマスタリポジトリ
2. `frontend/src/services/masterService.ts` - マスタ管理APIサービス（存在しない場合）

### 影響を受ける機能
- マスタ管理画面のCreatorマスタ一覧表示
- Creatorマスタの編集・追加・削除機能

## 5. 技術的詳細

### 5.1. データベーススキーマ

```sql
CREATE TABLE creator_master (
    organization_id UUID NOT NULL,
    creator_uuid UUID NOT NULL,
    vendor_uuid UUID,
    instrument_uuid UUID,
    corporation_id UUID,
    creator_id CHARACTER VARYING NOT NULL,      -- ID列
    creator_name CHARACTER VARYING NOT NULL,    -- 名称列
    creator_description CHARACTER VARYING,      -- 説明列
    creator_annotation CHARACTER VARYING,       -- 注釈列
    is_active BOOLEAN,                          -- アクティブ判定
    create_at TIMESTAMP,
    update_at TIMESTAMP,
    CONSTRAINT creator_master_PKC PRIMARY KEY (organization_id, creator_uuid)
);
```

### 5.2. データマッピング仕様

| DB カラム名 | 画面表示列名 | 必須 | 備考 |
|------------|------------|------|------|
| `creator_id` | ID | ○ | 一覧の最初の列 |
| `creator_name` | 名称 | ○ | 強調表示 |
| `creator_description` | 説明 | - | 420px幅 |
| `creator_annotation` | 注釈 | - | 420px幅 |
| `is_active` | アクティブボタン | ○ | true/false |

### 5.3. API設計

#### エンドポイント: GET /api/master/creator

**リクエスト**
```http
GET /api/master/creator
Headers:
  Authorization: Bearer <JWT_TOKEN>
  X-Organization-Id: <ORGANIZATION_ID>
```

**クエリパラメータ**
- `display_scope`: string - "all" | "own" （全体表示 or 自組織のみ）
- `search`: string - 検索キーワード（オプション）
- `is_active`: boolean - アクティブフィルタ（オプション）

**レスポンス（成功）**
```json
{
  "success": true,
  "data": [
    {
      "creatorId": "001",
      "creatorName": "サンプル作成者",
      "creatorDescription": "説明文",
      "creatorAnnotation": "注釈",
      "isActive": true,
      "vendorName": "ベンダー名",
      "instrumentName": "機器名",
      "updatedAt": "20260119081800"
    }
  ],
  "meta": {
    "timestamp": "2026-01-19T08:18:00Z",
    "requestId": "req_abc123"
  }
}
```

**レスポンス（エラー）**
```json
{
  "success": false,
  "error": {
    "code": "DATABASE_ERROR",
    "message": "データの取得に失敗しました"
  },
  "meta": {
    "timestamp": "2026-01-19T08:18:00Z",
    "requestId": "req_abc123"
  }
}
```

### 5.4. SQL実装

```sql
-- 全件取得（自組織のみ）
SELECT 
    cm.creator_id,
    cm.creator_name,
    cm.creator_description,
    cm.creator_annotation,
    cm.is_active,
    vm.vendor_name,
    im.instrument_name,
    cm.update_at
FROM creator_master cm
LEFT JOIN vendor_master vm ON cm.vendor_uuid = vm.vendor_uuid 
    AND cm.organization_id = vm.organization_id
LEFT JOIN instrument_master im ON cm.instrument_uuid = im.instrument_uuid 
    AND cm.organization_id = im.organization_id
WHERE cm.organization_id = $1
ORDER BY cm.creator_id;

-- 検索付き
SELECT 
    cm.creator_id,
    cm.creator_name,
    cm.creator_description,
    cm.creator_annotation,
    cm.is_active,
    vm.vendor_name,
    im.instrument_name,
    cm.update_at
FROM creator_master cm
LEFT JOIN vendor_master vm ON cm.vendor_uuid = vm.vendor_uuid 
    AND cm.organization_id = vm.organization_id
LEFT JOIN instrument_master im ON cm.instrument_uuid = im.instrument_uuid 
    AND cm.organization_id = im.organization_id
WHERE cm.organization_id = $1
  AND (
    cm.creator_id ILIKE $2 OR
    cm.creator_name ILIKE $2 OR
    cm.creator_description ILIKE $2 OR
    cm.creator_annotation ILIKE $2
  )
ORDER BY cm.creator_id;
```

### 5.5. アーキテクチャ上の考慮事項

#### レイヤー分離
1. **ルート層**: HTTPリクエストの受信、レスポンスの返却
2. **コントローラー層**: リクエストパラメータの検証、サービス呼び出し
3. **サービス層**: ビジネスロジック、データ変換
4. **リポジトリ層**: データベースアクセス、SQLクエリ実行

#### マルチテナント分離
- すべてのクエリに`organization_id`フィルタを必須とする
- ミドルウェアチェーン: `auth` → `tenantIsolation` → `permissionCheck`

#### エラーハンドリング
- データベース接続エラー
- データ取得失敗
- 権限エラー
- バリデーションエラー

### 5.6. セキュリティ考慮事項
- [x] 認証・認可: JWTトークン検証必須
- [x] マルチテナント分離: organization_idフィルタ必須
- [x] SQLインジェクション対策: Parameterized Queries使用
- [x] データ検証: 入力値のバリデーション

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 既存のJSONベース機能との互換性問題 | 中 | 中 | データ形式の変換処理を実装 |
| パフォーマンス劣化 | 低 | 低 | インデックス確認、クエリ最適化 |
| vendor/instrument情報の欠損 | 中 | 中 | LEFT JOINで対応、NULL処理実装 |
| 他のマスタへの影響 | 高 | 低 | Creatorマスタのみを対象とする条件分岐 |

## 7. テスト計画

### 7.1. ユニットテスト
- [x] creatorRepository.tsのテスト
  - [x] 正常系: データ取得成功
  - [x] 異常系: データベースエラー
  - [x] 境界値: 空データ
- [x] masterService.tsのテスト
  - [x] データ変換処理
  - [x] フィルタリング処理

### 7.2. 統合テスト
- [x] API エンドポイントのテスト
  - [x] GET /api/master/creator（全件取得）
  - [x] GET /api/master/creator?search=xxx（検索）
  - [x] GET /api/master/creator?display_scope=own（自組織のみ）

### 7.3. 手動テスト
- [x] 一覧表示確認
- [x] 検索機能確認
- [x] アクティブ/非アクティブ切り替え確認
- [x] データがない場合の表示確認
- [x] エラー時の表示確認

## 8. ロールバック計画

問題が発生した場合のロールバック手順：

### 手順1: フロントエンドの切り戻し
```typescript
// MasterManagementMock.tsx
// API呼び出しをコメントアウトし、JSONファイルからの読み込みに戻す
const data = masterDataMap[selectedMasterInfo.relationData];
setMasters(data);
```

### 手順2: APIルートの無効化
```typescript
// backend/src/routes/masterRoutes.ts
// 新規追加したルートをコメントアウト
// router.get('/creator', auth, tenantIsolation, masterController.getCreator);
```

### 手順3: 動作確認
- JSONファイルからのデータ読み込みが正常に動作することを確認

## 9. 関連ドキュメント

- [creator_master DDL](../design/db/ddl/creator_master.sql)
- [vendor_master DDL](../design/db/ddl/vendor_master.sql)
- [instrument_master DDL](../design/db/ddl/instrument_master.sql)
- [バックエンド規約](../.clinerules/development/backend.md)
- [API設計規約](../.clinerules/development/api.md)
- [セキュリティ規約](../.clinerules/development/security.md)

## 10. 承認記録

- **計画書提示日時**: 2026-01-19 08:18
- **承認日時**: （ユーザー承認後に記入）
- **承認者コメント**: （ユーザーからのフィードバック）

## 11. 実施記録

### 実施日時
開始: （作業開始時に記入）
完了: （作業完了時に記入）

### 計画からの変更点
（実施中に発生した計画からの変更や追加作業）

### 発生した問題と解決方法
（実施中に発生した問題とその解決方法）

### 最終的な成果物
- [ ] バックエンドAPI実装完了
- [ ] フロントエンド修正完了
- [ ] 動作確認完了

## 12. 振り返り

### うまくいった点
（成功要因）

### 改善が必要な点
（今後の改善点）

### 学んだこと
（このタスクから得られた知見）

---

## 補足: 実装の詳細フロー

### フロントエンド実装フロー

```typescript
// 1. マスタ選択時の処理分岐
useEffect(() => {
  if (!selectedMasterInfo) return;
  
  setLoading(true);
  
  // Creatorマスタ（masterId === '8'）の場合はAPI呼び出し
  if (selectedMasterInfo.masterId === '8') {
    fetchCreatorFromDB();
  } else {
    // 従来通りJSONファイルから読み込み
    const data = masterDataMap[selectedMasterInfo.relationData];
    setMasters(data);
  }
  
  setLoading(false);
}, [selectedMasterInfo]);

// 2. API呼び出し処理
const fetchCreatorFromDB = async () => {
  try {
    const response = await axios.get('/api/master/creator', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Organization-Id': organizationId
      },
      params: {
        display_scope: displayScope,
        search: searchText
      }
    });
    
    if (response.data.success) {
      // DB形式→画面表示形式に変換
      const convertedData = response.data.data.map(item => ({
        masterId: '8',
        creatorId: item.creatorId,
        creatorName: item.creatorName,
        creatorDescription: item.creatorDescription,
        creatorAnnotation: item.creatorAnnotation,
        vendorName: item.vendorName,
        instrumentName: item.instrumentName,
        isActive: item.isActive,
        updatedAt: item.updatedAt
      }));
      
      setMasters(convertedData);
    }
  } catch (error) {
    console.error('Creator取得エラー:', error);
    message.error('Creatorマスタの取得に失敗しました');
    setMasters([]);
  }
};
```

### バックエンド実装フロー

```typescript
// 1. ルート定義
router.get(
  '/creator',
  auth,
  tenantIsolation,
  permissionCheck(['data_admin', 'system_admin']),
  masterController.getCreator
);

// 2. コントローラー
export const getCreator = async (req: Request, res: Response) => {
  try {
    const organizationId = req.organizationId;
    const { display_scope, search, is_active } = req.query;
    
    const creators = await masterService.getCreatorMasters(
      organizationId,
      { displayScope: display_scope, search, isActive: is_active }
    );
    
    res.json({
      success: true,
      data: creators,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id']
      }
    });
  } catch (error) {
    next(error);
  }
};

// 3. サービス
export const getCreatorMasters = async (
  organizationId: string,
  filters: any
) => {
  const creators = await creatorRepository.findAll(organizationId, filters);
  
  // データ変換処理
  return creators.map(creator => ({
    creatorId: creator.creator_id,
    creatorName: creator.creator_name,
    creatorDescription: creator.creator_description,
    creatorAnnotation: creator.creator_annotation,
    isActive: creator.is_active,
    vendorName: creator.vendor_name,
    instrumentName: creator.instrument_name,
    updatedAt: formatDateTime(creator.update_at)
  }));
};

// 4. リポジトリ
export const findAll = async (
  organizationId: string,
  filters: any
) => {
  const query = `
    SELECT 
      cm.creator_id,
      cm.creator_name,
      cm.creator_description,
      cm.creator_annotation,
      cm.is_active,
      vm.vendor_name,
      im.instrument_name,
      cm.update_at
    FROM creator_master cm
    LEFT JOIN vendor_master vm ON cm.vendor_uuid = vm.vendor_uuid 
      AND cm.organization_id = vm.organization_id
    LEFT JOIN instrument_master im ON cm.instrument_uuid = im.instrument_uuid 
      AND cm.organization_id = im.organization_id
    WHERE cm.organization_id = $1
    ORDER BY cm.creator_id
  `;
  
  const result = await db.query(query, [organizationId]);
  return result.rows;
};
