# MUI → Ant Design v6 変換マッピング表

**作成日時**: 2026-01-27 14:15  
**目的**: Reference (MUI v5) のUI要素を現行 (Ant Design v6) に変換するマッピング定義

---

## 📋 変換対象コンポーネント

### 1. PetriNetEditorInner.jsx (1100行)

#### レイアウトコンポーネント

| Reference (MUI) | 現行 (Ant Design v6) | 備考 |
|-----------------|---------------------|------|
| `<Box>` | `<div>` + `style` or `<Flex>` | Flexboxレイアウトは`<Flex>`推奨 |
| `<Box sx={{ display: 'flex' }}>` | `<Flex>` | 新しいAnt Design v6のFlexコンポーネント |
| `<Box sx={{ position: 'relative' }}>` | `<div style={{ position: 'relative' }}>` | 通常のdiv |
| `<Box sx={{ flex: 1 }}>` | `<Flex flex={1}>` or `<div style={{ flex: 1 }}>` | |
| `<Container>` | `<div>` + `style={{ maxWidth, padding }}` | Ant Designにはない |

#### テキストコンポーネント

| Reference (MUI) | 現行 (Ant Design v6) | 備考 |
|-----------------|---------------------|------|
| `<Typography variant="h6">` | `<Typography.Title level={4}>` | h6 → level 4 |
| `<Typography variant="body1">` | `<Typography.Text>` | デフォルトテキスト |
| `<Typography variant="caption">` | `<Typography.Text type="secondary" style={{ fontSize: '0.75rem' }}>` | 小さいテキスト |

#### フィードバックコンポーネント

| Reference (MUI) | 現行 (Ant Design v6) | 備考 |
|-----------------|---------------------|------|
| `<CircularProgress>` | `<Spin>` | ローディング |
| `<Alert severity="error">` | `<Alert type="error">` | アラート |
| `<Snackbar>` | `message.info()` / `notification.open()` | トースト通知 |

---

### 2. EditorToolbar.jsx (250行)

#### ツールバーレイアウト

| Reference (MUI) | 現行 (Ant Design v6) | 備考 |
|-----------------|---------------------|------|
| `<Box sx={{ p: 1, borderBottom: 1 }}>` | `<div style={{ padding: 8, borderBottom: '1px solid #f0f0f0' }}>` | ツールバーコンテナ |
| `<Divider orientation="vertical" flexItem />` | `<Divider type="vertical" style={{ height: '100%' }} />` | 縦区切り線 |

#### ボタン

| Reference (MUI) | 現行 (Ant Design v6) | 備考 |
|-----------------|---------------------|------|
| `<Button variant="outlined" size="small" startIcon={<Icon />}>` | `<Button type="default" size="small" icon={<Icon />}>` | アウトラインボタン |
| `<Button variant="contained" size="small">` | `<Button type="primary" size="small">` | 塗りつぶしボタン |
| `<IconButton size="small">` | `<Button type="text" size="small" icon={<Icon />} />` | アイコンボタン |
| `<Tooltip title="..."><Button /></Tooltip>` | `<Tooltip title="..."><Button /></Tooltip>` | 同じ |

#### トグルボタン

| Reference (MUI) | 現行 (Ant Design v6) | 備考 |
|-----------------|---------------------|------|
| `<ToggleButtonGroup value={} onChange={}>` | `<Segmented options={[]} value={} onChange={} />` | セグメント切替 |
| `<ToggleButton value="petriNet">` | `{ label: 'ペトリネット', value: 'petriNet', icon: <Icon /> }` | Segmentedのオプション |

#### スイッチ

| Reference (MUI) | 現行 (Ant Design v6) | 備考 |
|-----------------|---------------------|------|
| `<FormControlLabel control={<Switch />} label="自動保存" />` | `<Space><Switch /><Typography.Text>自動保存</Typography.Text></Space>` | ラベル付きスイッチ |

---

### 3. PropertyPanel.jsx (750行)

#### パネルレイアウト

| Reference (MUI) | 現行 (Ant Design v6) | 備考 |
|-----------------|---------------------|------|
| `<Box sx={{ position: 'absolute', right: 0, top: 0, width: 350 }}>` | 同じ（div + style） | サイドパネル |
| `<Box sx={{ bgcolor: 'primary.main', color: 'primary.contrastText' }}>` | `<div style={{ background: token.colorPrimary, color: '#fff' }}>` | テーマトークン使用 |

#### フォーム要素

| Reference (MUI) | 現行 (Ant Design v6) | 備考 |
|-----------------|---------------------|------|
| `<TextField fullWidth label="名前" value={} onChange={} size="small" />` | `<Input placeholder="名前" value={} onChange={} />` | 通常入力 |
| `<TextField multiline rows={4} label="説明">` | `<Input.TextArea rows={4} placeholder="説明">` | 複数行入力 |
| `<FormControl fullWidth size="small"><InputLabel>ラベル</InputLabel><Select>` | `<Select placeholder="ラベル" style={{ width: '100%' }}>` | セレクト |
| `<MenuItem value="...">` | `<Select.Option value="...">` | セレクトオプション |
| `<FormControlLabel control={<Checkbox />} label="..." />` | `<Checkbox>...</Checkbox>` | チェックボックス |

#### ダイアログ

| Reference (MUI) | 現行 (Ant Design v6) | 備考 |
|-----------------|---------------------|------|
| `<Dialog open={} onClose={}>` | `<Modal open={} onCancel={} onOk={}>` | モーダルダイアログ |
| `<DialogTitle>` | `<Modal title="...">` | タイトル |
| `<DialogContent>` | Modal内のコンテンツ | 直接配置 |
| `<DialogActions>` | `<Modal footer={[<Button />]}>` | フッターボタン |
| `<DialogContentText>` | `<Typography.Paragraph>` | 説明文 |

---

### 4. MethodTabPanel.jsx (270行)

#### タブ

| Reference (MUI) | 現行 (Ant Design v6) | 備考 |
|-----------------|---------------------|------|
| `<Tabs value={} onChange={} variant="scrollable">` | `<Tabs activeKey={} onChange={} type="card">` | タブコンテナ |
| `<Tab label={<Box>...</Box>}>` | `<Tabs.TabPane tab={<Space>...</Space>} key={}>` | タブアイテム |
| `styled(Tabs)(({ theme }) => ({ ... }))` | 直接 `style` prop or CSS Modules | スタイル定義 |

#### チップ（バッジ）

| Reference (MUI) | 現行 (Ant Design v6) | 備考 |
|-----------------|---------------------|------|
| `<Chip label="5 nodes" size="small" color="primary" />` | `<Tag color="blue">5 nodes</Tag>` | タグ/バッジ |

---

## 🎨 テーマトークンのマッピング

### カラー

| MUI Theme | Ant Design v6 Token | 用途 |
|-----------|---------------------|------|
| `theme.palette.primary.main` | `token.colorPrimary` | プライマリカラー |
| `theme.palette.background.paper` | `token.colorBgContainer` | 背景（白） |
| `theme.palette.divider` | `token.colorBorder` | 区切り線 |
| `theme.palette.text.secondary` | `token.colorTextSecondary` | 二次テキスト |
| `theme.palette.action.hover` | `token.colorBgTextHover` | ホバー背景 |
| `theme.palette.error.main` | `token.colorError` | エラー色 |

### スペーシング

| MUI | Ant Design v6 | 値 |
|-----|---------------|-----|
| `theme.spacing(1)` | `token.marginXS` | 8px |
| `theme.spacing(2)` | `token.margin` | 16px |
| `theme.spacing(3)` | `token.marginLG` | 24px |

### フォントサイズ

| MUI | Ant Design v6 | 値 |
|-----|---------------|-----|
| `0.875rem` | `token.fontSizeSM` | 12px |
| `1rem` | `token.fontSize` | 14px |
| `1.25rem` | `token.fontSizeLG` | 16px |

---

## 📐 レイアウトパターンの変換

### パターン1: Flexboxレイアウト

**Reference (MUI):**
```jsx
<Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
  <Button>ボタン1</Button>
  <Button>ボタン2</Button>
</Box>
```

**現行 (Ant Design v6):**
```tsx
<Flex gap="small" align="center">
  <Button>ボタン1</Button>
  <Button>ボタン2</Button>
</Flex>
```

### パターン2: 縦スクロールコンテナ

**Reference (MUI):**
```jsx
<Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
  {children}
</Box>
```

**現行 (Ant Design v6):**
```tsx
<div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
  {children}
</div>
```

### パターン3: カラー付きヘッダー

**Reference (MUI):**
```jsx
<Box sx={{ 
  p: 2, 
  bgcolor: 'primary.main', 
  color: 'primary.contrastText',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center'
}}>
  <Typography variant="h6">タイトル</Typography>
  <IconButton onClick={onClose} sx={{ color: 'inherit' }}>
    <CloseIcon />
  </IconButton>
</Box>
```

**現行 (Ant Design v6):**
```tsx
const { token } = theme.useToken();

<Flex 
  style={{ 
    padding: 16, 
    background: token.colorPrimary, 
    color: '#fff',
  }}
  justify="space-between"
  align="center"
>
  <Typography.Title level={4} style={{ margin: 0, color: 'inherit' }}>
    タイトル
  </Typography.Title>
  <Button 
    type="text" 
    icon={<CloseIcon />} 
    onClick={onClose}
    style={{ color: 'inherit' }}
  />
</Flex>
```

---

## ⚠️ 注意点

### 1. スタイル記述の違い

**MUI (styled-components API):**
```jsx
const StyledBox = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  backgroundColor: theme.palette.background.paper,
}));
```

**Ant Design (インライン or CSS Modules):**
```tsx
// インライン
<div style={{ padding: 16, background: token.colorBgContainer }}>

// または CSS Modules
import styles from './styles.module.css';
<div className={styles.container}>
```

### 2. テーマトークンの取得

**MUI:**
```jsx
import { useTheme } from '@mui/material/styles';
const theme = useTheme();
// theme.palette.primary.main
```

**Ant Design:**
```tsx
import { theme } from 'antd';
const { token } = theme.useToken();
// token.colorPrimary
```

### 3. アイコンの扱い

**MUI:**
```jsx
import AddIcon from '@mui/icons-material/Add';
<IconButton><AddIcon /></IconButton>
```

**Ant Design:**
```tsx
import { PlusOutlined } from '@ant-design/icons';
<Button icon={<PlusOutlined />} />
```

---

## 📝 次のアクション

### Phase 4: 実装優先順位

1. **高優先度**
   - EditorToolbar.tsx の変換
   - PropertyPanel.tsx の変換
   - MethodTabPanel.tsx の変換

2. **中優先度**
   - PetriNetEditor.tsx のレイアウト調整
   - ダイアログ群の変換

3. **低優先度**
   - 細部のスタイル調整
   - アニメーション/トランジション

### 変換テンプレート

各コンポーネントの変換時は以下の順序で実施：

1. ✅ インポート文の変換（MUI → Ant Design）
2. ✅ styled-components の削除、インラインスタイル化
3. ✅ コンポーネントマッピング適用
4. ✅ テーマトークン取得（theme.useToken()）
5. ✅ props の変換（variant → type など）
6. ✅ 動作確認

---

**作成者**: Cline  
**バージョン**: 1.0.0