# apiClient.ts 残存関数 使用箇所一覧

**作成日**: 2026-01-23 14:12  
**目的**: API設計書と完全一致しない関数をapiClient.tsに残し、使用箇所と概要を記録

---

## 📋 概要

API設計書（2026-01-21更新版）と照合した結果、完全一致しない関数が9個あります。
これらは当面apiClient.tsに残して使用し、将来的にAPI設計書の策定後に移行します。

---

## ⚠️ 統合・調整が必要な関数（5個）

### 1. fetchMultipleMethodsStructureFromContent

**現在のシグネチャ**:
```typescript
fetchMultipleMethodsStructureFromContent(content: string): Promise<MultipleMethodsStructure>
```

**用途**: MAIMLコンテンツから複数メソッドのPetri Net構造を取得

**API設計書との対応**: `POST /api/v1/maiml/parse` に統合予定

**使用箇所**:
- `frontend/src/components/common/ViewRenderer.tsx` (推定)
  - PetriNetVisualizationでMAIMLコンテンツを解析
  - メソッド一覧を取得して表示

**対応方針**:
- api_maiml_editor.md の API 1番として定義済み
- 将来的に `parseMaimlContent()` に統合
- 現状: apiClient.tsで継続使用

---

### 2. fetchPetriNetStructure

**現在のシグネチャ**:
```typescript
fetchPetriNetStructure(content: string, methodId: string): Promise<PetriNetStructure>
```

**用途**: 単一メソッドのPetri Net構造を取得

**API設計書との対応**: `POST /api/v1/maiml/parse` に統合予定

**使用箇所**:
- `frontend/src/components/project/ProjectManagement.tsx` (推定)
  - ビューアボタン押下時にMAIMLを解析
- `frontend/src/components/experiment_worker/WorkProgressDetailDialog.tsx` (推定)
  - 進捗確認タブで特定メソッドを表示

**対応方針**:
- fetchMultipleMethodsStructureFromContent と同じAPIに統合
- レスポンスから特定methodIdを抽出する形に変更
- 現状: apiClient.tsで継続使用

---

### 3. fetchFormatById

**現在のシグネチャ**:
```typescript
fetchFormatById(formatId: string): Promise<Format>
```

**用途**: フォーマット詳細情報を1件取得

**API設計書との対応**: 未定義

**使用箇所**:
- `frontend/src/components/format/FormatManagement.tsx` (推定)
  - フォーマット編集時に詳細を取得
- `frontend/src/components/format/FormatFileDialog.tsx` (推定)
  - フォーマット情報を表示

**対応方針**:
- 短期: `getFormats()` で一覧取得後、フロント側でフィルタ
  ```typescript
  const formats = await getFormats();
  const format = formats.data.formats.find(f => f.format_id === formatId);
  ```
- 長期: `GET /api/v1/formats/:formatId` を新規追加（要検討）
- 現状: apiClient.tsで継続使用

---

### 4. fetchTransitionStatus

**現在のシグネチャ**:
```typescript
fetchTransitionStatus(workerId: string, fileKey: string): Promise<TransitionStatus[]>
```

**用途**: ワーカーの特定ファイルに対するトランジション状態を取得

**API設計書との対応**: `GET /api/v1/projects/:projectId/tasks`（推定）

**使用箇所**:
- `frontend/src/components/experiment_worker/ExperimentRecordTab.tsx` (推定)
  - 実験記録タブでトランジション状態を表示
  - 作業済み/未作業の判定

**対応方針**:
- パラメータ変更が必要
  - 旧: `(workerId, fileKey)` → 新: `(projectId)`
  - レスポンスにトランジション状態を含める想定
- API設計書で詳細仕様を確認後に移行
- 現状: apiClient.tsで継続使用

---

### 5. fetchExperimentRecords

**現在のシグネチャ**:
```typescript
fetchExperimentRecords(workId: string): Promise<ExperimentRecord[]>
```

**用途**: ワーカーの実験記録一覧を取得

**API設計書との対応**: タスク詳細APIまたは進捗確認API（推定）

**使用箇所**:
- `frontend/src/components/experiment_worker/ExperimentRecordTab.tsx` (推定)
  - 実験記録タブで過去の記録を表示
- `frontend/src/components/experiment_admin/ProgressMonitoringTab.tsx` (推定)
  - 進捗確認タブで実験記録を参照

**対応方針**:
- パラメータ変更が必要
  - 旧: `(workId)` → 新: `(taskId)` または `(projectId, methodId)`
- api_progress_monitoring.md で定義される可能性
- 現状: apiClient.tsで継続使用

---

## ❌ 定義なし（マスタAPI）4個

### 6-9. マスタデータ取得関数

これらはマスタデータ管理APIとして将来的に設計が必要です。

#### 6. fetchCreators

**現在のシグネチャ**:
```typescript
fetchCreators(): Promise<Creator[]>
```

**用途**: 作成者マスタ一覧を取得

**使用箇所**:
- `frontend/src/components/experiment_admin/DocumentEditDialog.tsx` (推定)
  - Material/Condition/Resultテンプレート編集時に作成者を選択
- `frontend/src/components/experiment_worker/DataRecordDialog.tsx` (推定)
  - 実験データ記録時に作成者を選択

**対応方針**: `GET /api/v1/masters/creators` として設計（将来）

---

#### 7. fetchVendors

**現在のシグネチャ**:
```typescript
fetchVendors(): Promise<Vendor[]>
```

**用途**: ベンダー（供給元）マスタ一覧を取得

**使用箇所**:
- `frontend/src/components/experiment_admin/DocumentEditDialog.tsx` (推定)
  - Materialテンプレート編集時にベンダーを選択
- `frontend/src/components/experiment_worker/DataRecordDialog.tsx` (推定)
  - 実験データ記録時にベンダーを選択

**対応方針**: `GET /api/v1/masters/vendors` として設計（将来）

---

#### 8. fetchOwners

**現在のシグネチャ**:
```typescript
fetchOwners(): Promise<Owner[]>
```

**用途**: 所有者マスタ一覧を取得

**使用箇所**:
- `frontend/src/components/experiment_admin/DocumentEditDialog.tsx` (推定)
  - Condition/Resultテンプレート編集時に所有者を選択
- `frontend/src/components/experiment_worker/DataRecordDialog.tsx` (推定)
  - 実験データ記録時に所有者を選択

**対応方針**: `GET /api/v1/masters/owners` として設計（将来）

---

#### 9. fetchInstruments

**現在のシグネチャ**:
```typescript
fetchInstruments(): Promise<Instrument[]>
```

**用途**: 機器マスタ一覧を取得

**使用箇所**:
- `frontend/src/components/experiment_admin/DocumentEditDialog.tsx` (推定)
  - Conditionテンプレート編集時に機器を選択
- `frontend/src/components/experiment_worker/DataRecordDialog.tsx` (推定)
  - 実験データ記録時に機器を選択

**対応方針**: `GET /api/v1/masters/instruments` として設計（将来）

---

## 📂 ファイル構成

```
frontend/src/api/
├── projectApiService.ts          # ✅ 正式版（実装済み）
├── maimlApiService.ts            # ✅ 新規作成（2026-01-23）
├── formatApiService.ts           # ✅ 新規作成（2026-01-23）
├── utils/
│   └── apiClient.ts              # ⚠️ 残存関数（9個）継続使用
└── mockApiService.ts             # 📝 将来作成（マスタAPI用）
```

---

## 🎯 移行計画

### Phase 1: 現状維持（2026-01-23 ～ 2026-02-28）

**対応**:
- apiClient.tsの9関数をそのまま使用
- 新規APIは各サービスファイルに実装

**理由**:
- API設計書が未確定（特にマスタAPI）
- 使用箇所の調査が不完全

---

### Phase 2: 統合関数の移行（2026-03-01 ～ 2026-04-30）

**対象**: 統合・調整が必要な5関数

**手順**:
1. api_maiml_editor.mdで`parseMaimlContent()`のAPI仕様を確定
2. maimlApiService.tsに移行
3. 使用箇所を段階的に更新
4. apiClient.tsから削除

---

### Phase 3: マスタAPI設計（2026-05-01 ～ 2026-07-31）

**対象**: マスタデータ取得4関数

**手順**:
1. マスタ管理API設計書を作成（`api_master.md`）
2. `mockApiService.ts` 作成
3. マスタAPI実装
4. apiClient.tsから移行

---

## 📝 メンテナンス指針

### DO（推奨）

✅ apiClient.tsの関数を使用する場合、このドキュメントを確認する
✅ 新規APIは必ず各サービスファイル（projectApiService.ts等）に実装
✅ 移行計画に従って段階的に更新
✅ 使用箇所が判明したら、このドキュメントを更新

### DON'T（非推奨）

❌ apiClient.tsに新規関数を追加しない
❌ API設計書を無視して独自実装しない
❌ 使用箇所不明のまま削除しない

---

## 🔗 関連ドキュメント

- [API一覧](./design/api/api_list.md) - 全API一覧
- [MAIML編集API](./design/api/api_maiml_editor.md) - MAIML関連API
- [フォーマット管理API](./design/api/api_format_management.md) - フォーマット関連API
- [プロジェクト管理API](./design/api/api_project_management.md) - プロジェクト関連API
- [API実装パターン比較](./20260123_1330_API実装パターン比較分析.md) - 実装方針

---

**作成者**: Cline  
**作成日**: 2026-01-23 14:12  
**次回更新予定**: 使用箇所調査完了後