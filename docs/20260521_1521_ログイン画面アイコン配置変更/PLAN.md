# タスク計画書: ログイン画面アイコン配置変更

## メタデータ
- **作成日時**: 2026-05-21 15:21
- **タスクID**: ログイン画面アイコン配置変更
- **優先度**: 低
- **推定工数**: 0.5時間

## タスク概要

ログイン画面のロゴエリアを、現在の「`logo_alchemia.png` 1枚のみ」から、提供された画像デザインに合わせて「`icon_alchemia.png`（アイコン）＋ `logo_alchemia.png`（テキストロゴ）横並び」レイアウトに変更する。

## 目的と期待される成果

### 目的
- ブランドデザインに合致したログイン画面のロゴ表示に更新する

### 期待される成果
- [x] ログイン画面のロゴエリアがアイコン＋テキストロゴの横並びに変更される
- [x] タスク計画書の作成
- [x] UI設計書の更新

## 実装ステップ

- [x] タスク計画書作成
- [x] `LoginPage.tsx` のロゴ部分を修正
- [x] `docs/design/ui/ui_login.md` の該当箇所を更新

## 変更ファイル

1. `frontend/src/components/LoginPage.tsx` - ロゴエリアをアイコン+テキスト横並びに変更
2. `docs/design/ui/ui_login.md` - セクション3.2・3.3のロゴ仕様を更新

## 技術的詳細

### 変更前
```tsx
<Image
  src="/icons/logo_alchemia.png"
  alt={t('common.appName')}
  width={260}
  height={80}
  style={{ objectFit: 'contain', maxWidth: '100%' }}
  priority
/>
```

### 変更後
```tsx
<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
  <Image
    src="/icons/icon_alchemia.png"
    alt="AlcheMia icon"
    width={60}
    height={60}
    style={{ objectFit: 'contain' }}
    priority
  />
  <Image
    src="/icons/logo_alchemia.png"
    alt={t('common.appName')}
    width={200}
    height={60}
    style={{ objectFit: 'contain' }}
    priority
  />
</div>
```

## 承認記録
- **計画書提示日時**: 2026-05-21 15:21
- **承認日時**: 2026-05-21 15:25

## 実施記録

### 実施日時
開始: 2026-05-21 15:25
完了: 2026-05-21 15:30

### 最終的な成果物
- [x] タスク計画書作成
- [x] `LoginPage.tsx` 修正完了
- [x] `ui_login.md` 更新完了
