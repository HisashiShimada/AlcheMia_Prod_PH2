# 実装結果: MAIML未登録プロジェクト詳細ボタン対応

## 概要

`ProgressMonitoring` 画面から `WorkProgressDetailDialog` を開く際、MAIMLファイルが未登録のプロジェクト（`project_uuid` が NULL）でエラーが発生していた問題を修正した。

バックエンドの修正は不要で、**フロントエンドのみ**の修正で対応完了。

---

## 問題の原因

`/api/v1/projects` のレスポンスには既に `project_uuid` と `maimlFileKey` が含まれていたが、フロントエンド側でその情報を活用せず、MAIML未登録プロジェクトに対しても詳細ボタンが活性化されていた。

ボタンをクリックすると以下のいずれかのエラーが発生していた：

- `getProjectFiles()` でMAIMLファイルが見つからず `message.error('MAIMLファイルが見つかりません')` が表示される
- `WorkProgressDetailDialog` が開いた後、`progressService.getWorkDetails()` 内で `project_uuid が設定されていません` エラーが発生する

---

## 修正内容

### 修正ファイル

| ファイル | 変更内容 |
|---------|---------|
| `frontend/src/types/progress.ts` | `Project` 型に `maimlFileKey?: string \| null` と `project_uuid?: string \| null` を追加 |
| `frontend/src/components/progress/ProgressMonitoring.tsx` | `ProgressRecord` 型に `hasMaiml: boolean` を追加、データ変換・ボタン制御を修正 |

### 詳細

#### `frontend/src/types/progress.ts`

`progress.ts` 内の `Project` 型に不足していたフィールドをオプションで追加：

```ts
// MAIMLファイル情報（progress.ts ではオプション）
maimlFileKey?: string | null;
project_uuid?: string | null;
```

#### `frontend/src/components/progress/ProgressMonitoring.tsx`

**① `ProgressRecord` 型に `hasMaiml` を追加**

```ts
/** MAIMLファイルが登録済みか（project_uuid または maimlFileKey が存在する場合 true） */
hasMaiml: boolean;
```

**② データ変換ロジックで `hasMaiml` を設定**

プロジェクト一覧APIのレスポンスに含まれる `project_uuid` または `maimlFileKey` のいずれかが存在すれば `true` と判定：

```ts
// project_uuid または maimlFileKey が存在する場合は MAIML 登録済みとみなす
hasMaiml: !!(item.project_uuid || item.maimlFileKey),
```

**③ 詳細ボタンカラムに MAIML未登録チェックを追加**

- MAIML未登録（`hasMaiml === false`）の場合：
  - ボタンを `disabled` にする
  - アイコンを `WarningOutlined` に変更
  - `Tooltip` で「MAIMLファイルが未登録のため詳細を表示できません」を表示
- MAIML登録済みの場合：従来通り `EyeOutlined` アイコンでボタンが活性化

```tsx
const isMaimlMissing = !record.hasMaiml;

const button = (
  <Button
    type="primary"
    ghost
    icon={isMaimlMissing ? <WarningOutlined /> : <EyeOutlined />}
    disabled={isOtherLoading || isMaimlMissing}
    ...
  >
    {t('progress.actions.viewDetails')}
  </Button>
);

if (isMaimlMissing) {
  return (
    <Tooltip title="MAIMLファイルが未登録のため詳細を表示できません">
      <span>{button}</span>
    </Tooltip>
  );
}
```

> **Note**: `disabled` 状態のボタンは Tooltip が動作しないため、`<span>` でラップしている。

---

## 動作確認

- ビルド成功（型エラーなし）：`npm run build` exit code 0

### 手動テスト項目

| テスト内容 | 期待結果 |
|-----------|---------|
| MAIML未登録プロジェクトの詳細ボタン | グレーアウト（無効化）・`WarningOutlined` アイコン表示 |
| 無効化ボタンにホバー | 「MAIMLファイルが未登録のため詳細を表示できません」ツールチップ表示 |
| MAIML登録済みプロジェクトの詳細ボタン | 有効・`EyeOutlined` アイコン表示 |
| MAIML登録済みで詳細ボタンをクリック | 詳細ダイアログが正常に開く |

---

## バックエンドへの影響

なし（バックエンドの修正は不要だった）。

