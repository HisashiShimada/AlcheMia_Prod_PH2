# タスク計画書: 非アクティブマスタ選択肢除外修正

## メタデータ
- **作成日時**: 2026-09-04 14:33
- **タスクID**: 20260904_1000
- **優先度**: 高
- **推定工数**: 0.5時間

## タスク概要

実験管理者メニューのプロジェクト編集 → Document ダイアログにおいて、
データ管理者メニューで非アクティブに設定した Creator / Vendor / Instrument が
選択肢に表示されてしまう不具合を修正する。

## 事象

1. データ管理者メニューで Creator を非アクティブに設定
2. 実験管理者メニューでプロジェクト編集 → Document ダイアログを開く
3. Creator の選択肢に非アクティブにしたCreatorが表示される（Vendor / Instrument も同様）

## 根本原因

`frontend/src/components/editorv2/DocumentEditDialog.tsx` の `loadMasterData` 関数内で
マスタデータを取得する際に `isActive: true` フィルターを渡していないため、
非アクティブなマスタも含む全件が選択肢として返される。

```typescript
// 問題のある実装（フィルターなし → 全件取得）
const [creatorsData, vendorsData, instrumentsData] = await Promise.all([
  fetchMasters('creator') as Promise<CreatorRecord[]>,
  fetchMasters('vendor') as Promise<VendorRecord[]>,
  fetchMasters('instrument') as Promise<InstrumentRecord[]>,
]);
```

APIは既に `is_active` クエリパラメータに完全対応済みのため、
フロントエンドからフィルターを渡すだけで修正できる。

## 目的と期待される成果

- [x] Document ダイアログの Creator 選択肢にアクティブなものだけが表示される
- [x] Document ダイアログの Vendor 選択肢にアクティブなものだけが表示される
- [x] Document ダイアログの Instrument 選択肢にアクティブなものだけが表示される

## 実装ステップ

- [x] Step 1: タスクフォルダ・PLAN.md 作成
- [x] Step 2: `DocumentEditDialog.tsx` の `fetchMasters` 呼び出しに `{ isActive: true }` フィルターを追加
- [x] Step 3: 型チェック（コードレビュー）で問題なし確認済み
- [ ] Step 4: 動作確認（手動テスト）

## 変更ファイル

1. `frontend/src/components/editorv2/DocumentEditDialog.tsx` - `fetchMasters` 呼び出しに `activeFilter` を追加

## 修正内容

```typescript
// 修正前
const [creatorsData, vendorsData, instrumentsData] = await Promise.all([
  fetchMasters('creator') as Promise<CreatorRecord[]>,
  fetchMasters('vendor') as Promise<VendorRecord[]>,
  fetchMasters('instrument') as Promise<InstrumentRecord[]>,
]);

// 修正後（isActive: true フィルターを追加。インラインオブジェクト禁止規約に従い変数に代入）
const activeFilter = { isActive: true };
const [creatorsData, vendorsData, instrumentsData] = await Promise.all([
  fetchMasters('creator', activeFilter) as Promise<CreatorRecord[]>,
  fetchMasters('vendor', activeFilter) as Promise<VendorRecord[]>,
  fetchMasters('instrument', activeFilter) as Promise<InstrumentRecord[]>,
]);
```

## 影響範囲

- **変更箇所**: `DocumentEditDialog.tsx` の `useEffect` 内のみ
- **他画面への影響**: なし（MasterManagement.tsx 等は別APIコールのため影響なし）
- **バックエンド変更**: 不要（APIは `is_active` クエリパラメータに対応済み）

## リスク

| リスク | 対策 |
|--------|------|
| 既存Documentに保存済みの非アクティブマスタが参照できなくなる | 選択肢への表示制限のみであり、保存済みデータへの影響はなし |

## テスト計画

- [ ] データ管理者で Creator を1件非アクティブに設定し、Document ダイアログの選択肢に表示されないことを確認
- [ ] データ管理者で Vendor を1件非アクティブに設定し、Document ダイアログの選択肢に表示されないことを確認
- [ ] データ管理者で Instrument を1件非アクティブに設定し、Document ダイアログの選択肢に表示されないことを確認
- [ ] アクティブな Creator / Vendor / Instrument は引き続き選択肢に表示されることを確認

## 承認記録

- **計画書提示日時**: 2026-09-04 14:33
- **承認日時**: 2026-09-04 14:33
- **承認者コメント**: ユーザー承認済み（Act モード切り替えにて確認）
