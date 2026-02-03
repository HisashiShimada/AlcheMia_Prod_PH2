# タスク計画書: PetriNetEditorInner.tsx UIポリシー準拠とエラー解消

## メタデータ
- **作成日時**: 2026-01-30 11:34
- **タスクID**: PetriNetEditorInner_UIPolicy_Conversion
- **優先度**: 高
- **推定工数**: 4-6時間

## 1. タスク概要

`frontend/src/components/editorv2/PetriNetEditorInner.tsx` をプロジェクトのUIポリシーに準拠させ、TypeScriptエラー、ESLintエラーを解消します。

**主な変更内容:**
- Material-UI (MUI) → Ant Design v6への完全移行
- インラインスタイル（sx prop）の削除とAnt Design propsへの置き換え
- TypeScript型定義の追加・修正
- ESLint警告の解消

## 2. 目的と期待される成果

### 目的
- プロジェクトのUIポリシーに完全準拠したコードに変換
- TypeScript/ESLintエラーをゼロにする
- 統一されたデザインシステムの維持

### 期待される成果
- [x] Material-UIコンポーネントをAnt Design v6に完全移行
- [x] すべてのインラインスタイルをAnt Design propsに置き換え
- [x] TypeScriptエラーを0件にする
- [x] ESLintエラー/警告を0件にする
- [x] コードの可読性と保守性の向上

## 3. 実装ステップ

### Phase 1: 現状分析と問題箇所特定
- [x] ファイル全体の読み込みと分析
- [x] Material-UIコンポーネントの使用箇所リストアップ
- [x] インラインスタイル（sx prop）使用箇所リストアップ
- [x] TypeScriptエラーの特定
- [x] ESLintエラー/警告の特定

**分析結果:**

**Material-UIコンポーネント使用箇所（5箇所）:**
1. `Box` - 約10箇所（レイアウト用）
2. `ThemeProvider` - 3箇所（editorTheme使用）
3. `CircularProgress` - 1箇所（ローディング表示）
4. `Alert` - 3箇所（エラー・警告表示）
5. `Typography` - 1箇所（テキスト表示）

**インラインスタイル（sx prop）使用箇所（約15箇所）:**
- ローディング画面: `sx={{ height: '100%', display: 'flex', ... }}`
- エラー画面: `sx={{ maxWidth: 600, mb: 1, ... }}`
- 警告バナー: `sx={{ mb: 0, borderRadius: 0, ... }}`
- メインレイアウト: `sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}`

**TypeScript問題:**
- propsインターフェースが未定義
- any型の使用（暗黙的）
- イベントハンドラーの型が不完全

**ESLint問題:**
- 未使用のインポート: `lazy`, `Suspense`（コメントアウト済み）
- editorTheme.tsへの依存（削除検討）

### Phase 2: Material-UI → Ant Design v6 変換
- [ ] `Box` → `div` + Ant Design Layout/Space/Flex
- [ ] `ThemeProvider` → 削除（Ant Design ConfigProviderは上位で設定済み）
- [ ] `CircularProgress` → `Spin`
- [ ] `Alert` → `Alert`
- [ ] `Typography` → `Typography`
- [ ] インポート文の整理

### Phase 3: インラインスタイル削除とAnt Design props化
- [ ] `sx={{ height: '100%', ... }}` → Ant Design props + CSS Modules（必要に応じて）
- [ ] `sx={{ display: 'flex', ... }}` → `<Flex>` コンポーネント
- [ ] `sx={{ color: 'text.secondary', ... }}` → `theme.useToken()` + トークン参照
- [ ] `sx={{ p: 2, gap: 2 }}` → `<Space>` コンポーネントまたはpadding props

### Phase 4: TypeScript型定義の追加・修正
- [ ] propsインターフェースの定義（不足している場合）
- [ ] コールバック関数の型定義
- [ ] anyの削除と適切な型の指定
- [ ] ジェネリクスの適切な使用

### Phase 5: ESLintエラー解消
- [ ] 未使用のインポート削除
- [ ] 未使用の変数削除
- [ ] コーディング規約違反の修正
- [ ] `useCallback`/`useMemo`の適切な依存配列設定

### Phase 6: テストとリファクタリング
- [ ] コンパイルエラーの確認
- [ ] 画面表示の動作確認
- [ ] コードの可読性向上
- [ ] コメントの追加・更新

## 4. 影響範囲

### 変更するファイル
1. `frontend/src/components/editorv2/PetriNetEditorInner.tsx` - 主要な変更箇所

### 影響を受ける可能性のあるファイル
- `frontend/src/components/editorv2/styles/editorTheme.ts` - テーマ設定（削除検討）
- 親コンポーネントから呼び出されている箇所（動作確認必要）

### 影響を受ける機能
- ペトリネットエディタのUI表示
- ローディング表示
- エラー表示
- バリデーション警告バナー

## 5. 技術的詳細

### Material-UI → Ant Design v6 対応表

| Material-UI | Ant Design v6 | 備考 |
|-------------|---------------|------|
| `Box` | `div` + `Space`/`Flex` | レイアウトに応じて使い分け |
| `ThemeProvider` | 削除 | 上位で設定済み |
| `CircularProgress` | `Spin` | - |
| `Alert` | `Alert` | 同名だが異なるコンポーネント |
| `Typography` | `Typography` | 同名だが異なるコンポーネント |
| `sx` prop | Ant Design props | インラインスタイル禁止 |

### インラインスタイル削除方針

**変換前:**
```typescript
<Box sx={{ 
  height: '100%', 
  display: 'flex', 
  flexDirection: 'column',
  gap: 2,
  p: 2
}}>
  <CircularProgress />
  <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
    読み込み中...
  </Typography>
</Box>
```

**変換後:**
```typescript
<Flex 
  vertical 
  align="center" 
  justify="center" 
  gap="middle"
  style={{ height: '100%', padding: token.paddingLG }}
>
  <Spin />
  <Typography.Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
    読み込み中...
  </Typography.Text>
</Flex>
```

### デザイントークン使用例

```typescript
import { theme } from 'antd';

const { token } = theme.useToken();

// ✅ トークン使用
<div style={{ 
  color: token.colorTextSecondary,
  fontSize: token.fontSizeSM,
  padding: token.paddingLG
}}>
```

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 既存の動作が変わる | 高 | 中 | 段階的な変更と動作確認 |
| レイアウトが崩れる | 中 | 高 | 変更後に画面表示を詳細確認 |
| TypeScriptエラーが新たに発生 | 中 | 低 | 型定義を慎重に追加 |
| パフォーマンスへの影響 | 低 | 低 | Ant Designは高パフォーマンス |

## 7. テスト計画

### 動作確認項目
- [ ] ローディング表示が正しく表示される
- [ ] エラーメッセージが正しく表示される
- [ ] 警告バナーが正しく表示される
- [ ] ペトリネットキャンバスが正常に描画される
- [ ] テンプレート一覧表示が正常に動作する
- [ ] 各種ダイアログが正常に開閉する
- [ ] レスポンシブレイアウトが正常に動作する

### TypeScript/ESLintチェック
- [ ] `npm run type-check` でエラーなし
- [ ] `npm run lint` でエラー/警告なし
- [ ] VSCodeでエラー表示がない

## 8. ロールバック計画

問題が発生した場合は以下の手順でロールバック：
1. Gitで直前のコミットに戻す
2. 変更内容を見直して修正
3. 段階的に再適用

## 9. 関連ドキュメント

- [UIポリシー](.clinerules/references/ui_policy.md)
- [フロントエンド規約](.clinerules/development/frontend.md)
- [Ant Design v6 公式ドキュメント](https://ant.design/components/overview)

## 10. 承認記録

- **計画書提示日時**: 2026-01-30 11:34
- **承認日時**: （承認待ち）
- **承認者コメント**: 

## 11. 実施記録

### 実施日時
- 開始: （未開始）
- 完了: （未完了）

### 計画からの変更点
（実施中に記録）

### 発生した問題と解決方法
（実施中に記録）

### 最終的な成果物
- [ ] PetriNetEditorInner.tsx - UIポリシー準拠版
- [ ] TypeScriptエラー: 0件
- [ ] ESLintエラー: 0件

## 12. 振り返り

### うまくいった点
（実施後に記録）

### 改善が必要な点
（実施後に記録）

### 学んだこと
（実施後に記録）