# テキストボックス分析・共通化検討書

## 1. 現状分析

### 1.1 使用されているコンポーネント

MaiML Viewerで使用されているテキストボックス系コンポーネント：

| コンポーネント | 用途 | 出現頻度 |
|---------------|------|---------|
| Input | 一行テキスト入力 | 高（31箇所） |
| Input.TextArea | 複数行テキスト入力 | 中（5箇所） |
| Input.Password | パスワード入力 | 低（1箇所） |
| InputNumber | 数値入力 | 低（4箇所） |
| Select | ドロップダウン選択 | 高（41箇所） |

---

## 2. 全画面横断的なパターン分析

全画面から抽出したテキストボックスの使用パターンを、機能・用途別に分類します。

### 2.1 検索・フィルタリング用入力（出現頻度: 高）

**機能**: データの検索・絞り込み

**特徴:**
- `prefix={<SearchOutlined />}` - 検索アイコン必須
- `allowClear={true}` - クリアボタン必須
- 固定幅: 200px〜300px
- size: middle（32px）

**出現箇所:**
- プロジェクト管理画面：プロジェクト検索
- フォーマット管理画面：フォーマット検索
- 進捗確認画面：プロジェクト検索
- タスク一覧：タスク検索
- トランジション一覧：トランジション検索
- 進捗報告：トランジション検索
- 実験記録：データ検索

**実装例:**
```typescript
// プロジェクト管理画面
<Input
  prefix={<SearchOutlined />}
  placeholder="ID、名前、説明等で検索"
  value={searchQuery}
  onChange={(e) => setSearchQuery(e.target.value)}
  style={{ width: 250 }}
  allowClear
/>

// タスク一覧
<Input
  prefix={<SearchOutlined />}
  placeholder="タスク名、ステータス、進捗率..."
  allowClear
/>

// トランジション一覧
<Input
  prefix={<SearchOutlined />}
  placeholder="トランジション名、説明で検索..."
  allowClear
/>
```

---

### 2.2 フォーム入力（標準サイズ）（出現頻度: 高）

**機能**: 一般的なデータ入力

**特徴:**
- size: middle（32px）
- `maxLength` + `showCount` で文字数制限表示
- Form.Item内で使用（バリデーション対応）
- placeholder必須
- 幅: 自動（親要素に合わせる）

**出現箇所:**
- プロジェクト作成モーダル：プロジェクト名
- フォーマット作成モーダル：ファイル名
- フォルダ作成モーダル：フォルダ名
- ドキュメント編集ダイアログ：各種メタデータ入力
- 指示ダイアログ：タスク名入力
- Petri Netエディタ：ノードラベル編集

**実装例:**
```typescript
// プロジェクト作成
<Input
  placeholder="プロジェクト名を入力"
  maxLength={100}
  showCount
  autoFocus
/>

// ドキュメント編集
<Input placeholder="document_001" />
<Input placeholder="実験名" />
<Input placeholder="Creator" />

// Petri Netエディタ
<Input
  value={selectedNode.data.label || ''}
  onChange={(e) => updateNodeLabel(e.target.value)}
/>
```

---

### 2.3 複数行入力（TextArea）（出現頻度: 中）

**機能**: 説明文、コメント、長文の入力

**特徴:**
- rows: 4（標準）
- `maxLength` + `showCount` で文字数制限表示
- maxLength: 500文字が標準
- 幅: 自動（親要素に合わせる）

**出現箇所:**
- プロジェクト作成モーダル：プロジェクト概要
- フォーマット作成モーダル：ファイル概要
- データ記録ダイアログ：コメント入力
- 進捗報告：報告内容

**実装例:**
```typescript
// プロジェクト作成
<Input.TextArea
  placeholder="プロジェクトの概要を入力（任意）"
  maxLength={500}
  showCount
  rows={4}
/>

// フォーマット作成
<Input.TextArea
  placeholder="ファイルの概要を入力（オプション）"
  rows={4}
/>
```

---

### 2.4 選択入力（Select）（出現頻度: 高）

**機能**: ドロップダウンからの選択

**特徴:**
- 固定幅: 150px, 200px, 250px（選択肢の長さに応じて）
- `options`配列で選択肢を指定
- `allowClear`でクリア可能（オプション）
- value制御

**出現箇所:**
- プロジェクト管理：所有者絞込、部門絞込、ステータス絞込
- フォーマット管理：カテゴリ絞込、ファイルタイプ絞込
- 進捗確認：フィルタ各種
- タスク一覧：ステータスフィルタ
- 実験作業者メニュー：プロジェクト選択、メソッド選択
- 指示ダイアログ：作業者割当、優先度、タイプ選択
- 進捗報告：ステータス選択、問題タイプ選択

**実装例:**
```typescript
// プロジェクト管理（短い選択肢）
<Select
  style={{ width: 150 }}
  value={ownerFilter}
  onChange={setOwnerFilter}
  options={[
    { value: 'my_only', label: '自分のみ' },
    { value: 'all', label: '全プロジェクト' },
  ]}
/>

// プロジェクト管理（長い選択肢）
<Select
  style={{ width: 200 }}
  value={projectStatusFilter}
  onChange={setProjectStatusFilter}
  options={[
    { value: 'all', label: '全て' },
    { value: 'planning', label: '計画中' },
    { value: 'in_progress', label: '進行中' },
  ]}
/>
```

---

### 2.5 数値入力（InputNumber）（出現頻度: 低）

**機能**: 数値専用の入力

**特徴:**
- `style={{ width: '100%' }}` が標準
- min/max で範囲制限（オプション）
- placeholder推奨

**出現箇所:**
- データ記録ダイアログ：測定値入力
- グリッド入力：セル内の数値入力
- 指示ダイアログ：優先度入力（数値型）

**実装例:**
```typescript
// データ入力
<InputNumber
  style={{ width: '100%' }}
  placeholder="値を入力"
/>

// グリッド入力
<InputNumber
  value={grid[rowIndex][colIndex]}
  onChange={(value) => handleGridChange(rowIndex, colIndex, value)}
  style={{ width: '100%' }}
/>

// 範囲指定付き
<Input
  type="number"
  min={1}
  max={10}
  placeholder="1-10"
/>
```

---

### 2.6 大型入力（Large Size）（出現頻度: 極低）

**機能**: 重要性を強調する入力フィールド

**特徴:**
- size: large（40px）
- フォントサイズ: 16px
- ラベル付き（必須マーク付き）
- パディング: 水平 15px

**出現箇所:**
- ログイン画面：ユーザー名・パスワード入力

**実装例:**
```typescript
// ユーザー名入力
<Input
  size="large"
  placeholder="ユーザー名を入力"
  autoComplete="username"
  autoFocus
/>

// パスワード入力
<Input.Password
  size="large"
  placeholder="パスワードを入力"
  autoComplete="current-password"
  iconRender={(visible) => visible ? <EyeOutlined /> : <EyeInvisibleOutlined />}
/>
```

---

### 2.7 読み取り専用表示（Disabled）（出現頻度: 極低）

**機能**: 編集不可の情報表示

**特徴:**
- `disabled={true}`
- 幅: `100%`または自動

**出現箇所:**
- 指示ダイアログ：自動設定された値の表示

**実装例:**
```typescript
<Input 
  value="実験全体への指示" 
  disabled 
  style={{ width: '100%' }} 
/>
```

---

## 3. 全画面横断的パターンの統一提案

### 3.1 分析結果から導かれる統一パターン

全画面（ログイン、プロジェクト管理、フォーマット管理、進捗確認、実験作業者画面など）を横断的に分析した結果、以下の3つの基本パターンに集約できます：

| パターン | 出現頻度 | 主な用途 | 特徴 |
|---------|---------|---------|------|
| **1. 標準入力** | 高 | フォーム入力全般 | size: middle, 自動幅 |
| **2. 検索入力** | 高 | 検索・フィルタリング | prefix: 検索アイコン, 固定幅 |
| **3. 複数行入力** | 中 | 説明文・長文 | rows: 4, 文字数制限 |

**オプション（4パターン目）:**
- **大型入力**: ログイン画面専用（出現頻度: 極低）

### 3.2 出現頻度と使用箇所の分析

#### 高頻度パターン（必須）

| パターン | 出現回数 | 使用画面数 | 代表的な使用箇所 |
|---------|---------|-----------|---------------|
| 標準入力 | 20+ | 全画面 | プロジェクト名、ファイル名、メタデータ入力 |
| 検索入力 | 8+ | 7画面以上 | プロジェクト検索、タスク検索、フィルタ |

#### 中頻度パターン（推奨）

| パターン | 出現回数 | 使用画面数 | 代表的な使用箇所 |
|---------|---------|-----------|---------------|
| 複数行入力 | 5+ | 4画面以上 | プロジェクト概要、コメント、報告内容 |

#### 低頻度パターン（オプション）

| パターン | 出現回数 | 使用画面数 | 代表的な使用箇所 |
|---------|---------|-----------|---------------|
| 大型入力 | 2 | 1画面 | ログイン画面のみ |

### 3.3 統一パターンの決定理由

#### ✅ 3パターンを推奨する理由

1. **標準入力**: 全画面で最も使用されている汎用パターン
   - プロジェクト作成、フォーマット作成、ドキュメント編集など
   - Form.Item内でバリデーション対応
   - レスポンシブ（親要素に合わせる）

2. **検索入力**: 7画面以上で一貫して使用される重要パターン
   - 検索アイコン（prefix）が必須
   - allowClear で UX 向上
   - 固定幅で一貫性を保つ

3. **複数行入力**: 説明文・長文入力に特化したパターン
   - rows=4 が標準
   - 文字数制限（maxLength + showCount）
   - 全モーダルフォームで使用

#### ⚠️ 4パターン目（大型入力）の扱い

- **メリット**: ログイン画面の重要性を視覚的に強調
- **デメリット**: 使用箇所が1画面のみで汎用性が低い
- **判断**: オプションとして追加可能だが、3パターンで十分

### 3.4 除外されるパターンとその理由

以下のパターンは、3つの基本パターンに統合または特殊用途として扱います：

| 除外パターン | 理由 | 統合先 |
|------------|------|--------|
| 選択入力（Select） | 別コンポーネント | 補足ガイドラインとして提供 |
| 数値入力（InputNumber） | 特殊用途・低頻度 | 必要時に個別実装 |
| 読み取り専用（Disabled） | 特殊用途・極低頻度 | 必要時に個別実装 |

---

## 4. 統一提案（3パターン）

### パターン1: 標準入力ボックス（Standard Input）

**用途**: 一般的なデータ入力、フォーム入力

**仕様:**
```typescript
<Input
  size="middle"                    // デフォルトサイズ
  placeholder="入力してください"
  maxLength={100}                  // 文字数制限（オプション）
  showCount                        // 文字数表示（オプション）
  allowClear                       // クリアボタン（オプション）
/>
```

**使用例:**
- モーダルフォームのテキスト入力
- データ編集画面の各種入力
- プロジェクト名、ファイル名、説明等

**デザイン指定:**
- 高さ: `32px`（token.controlHeight）
- ボーダーラジアス: `8px`（token.borderRadius）
- フォントサイズ: `14px`（token.fontSize）
- パディング: 水平 `11px`

---

### パターン2: 検索ボックス（Search Input）

**用途**: 検索、フィルタリング

**仕様:**
```typescript
<Input
  size="middle"
  prefix={<SearchOutlined />}      // 検索アイコン
  placeholder="検索..."
  allowClear                       // クリアボタン必須
  style={{ width: 250 }}           // 推奨幅: 200〜300px
/>
```

**使用例:**
- プロジェクト一覧の検索バー
- ファイル一覧の検索バー
- タスク一覧の検索バー
- 各種マスタデータの検索バー

**デザイン指定:**
- 高さ: `32px`
- 推奨幅: `200px` 〜 `300px`
- prefix: 常に検索アイコン
- allowClear: 必須

---

### パターン3: 複数行入力ボックス（Textarea Input）

**用途**: 説明文、コメント、長文入力

**仕様:**
```typescript
<Input.TextArea
  placeholder="説明を入力してください"
  rows={4}                         // 標準4行
  maxLength={500}                  // 文字数制限（オプション）
  showCount                        // 文字数表示（オプション）
/>
```

**使用例:**
- プロジェクト概要入力
- ファイル説明入力
- コメント入力
- 作業指示入力

**デザイン指定:**
- 行数: `4行`（標準）
- 文字数制限: 500文字（推奨）
- showCount: 推奨
- ボーダーラジアス: `8px`

---

## 5. 統一提案（4パターン、オプション）

3パターンに加えて、重要な画面で使用する大型入力を追加する場合：

### パターン4: 大型入力ボックス（Large Input）

**用途**: ログイン画面、重要なフォーム入力

**仕様:**
```typescript
<Input
  size="large"                     // 大きいサイズ
  placeholder="ユーザー名を入力"
  autoFocus                        // 自動フォーカス（オプション）
/>

<Input.Password
  size="large"
  placeholder="パスワードを入力"
  iconRender={(visible) => visible ? <EyeOutlined /> : <EyeInvisibleOutlined />}
/>
```

**使用例:**
- ログイン画面のユーザー名・パスワード入力
- 重要な設定画面のフォーム入力

**デザイン指定:**
- 高さ: `40px`（token.controlHeightLG）
- フォントサイズ: `16px`（token.fontSizeLG）
- パディング: 水平 `15px`

---

## 6. 補足: Select（ドロップダウン）の統一

Selectコンポーネントも頻繁に使用されているため、統一ガイドラインを提供：

### 標準Select
```typescript
<Select
  style={{ width: 150 }}           // 推奨幅: 150px, 200px
  placeholder="選択してください"
  options={[...]}
  allowClear                       // クリア可能（オプション）
/>
```

**推奨幅:**
- 短い選択肢（2〜3文字）: `150px`
- 中程度の選択肢（5〜10文字）: `200px`
- 長い選択肢（10文字以上）: `250px`以上

---

## 7. 非推奨パターン

以下のパターンは使用を避けるべき：

❌ **サイズ未指定のまま複数サイズを混在させる**
```typescript
// 悪い例
<Input />  // デフォルトサイズ
<Input size="large" />  // 大きいサイズ
<Input size="small" />  // 小さいサイズ
```

✅ **同じ画面内では統一サイズを使用**
```typescript
// 良い例（標準サイズで統一）
<Input size="middle" />
<Input size="middle" />
<Input size="middle" />
```

---

❌ **固定幅を指定せずに検索ボックスを配置**
```typescript
// 悪い例
<Input prefix={<SearchOutlined />} placeholder="検索" />
```

✅ **固定幅を指定**
```typescript
// 良い例
<Input 
  prefix={<SearchOutlined />} 
  placeholder="検索" 
  style={{ width: 250 }} 
/>
```

---

❌ **TextAreaのrows指定なし**
```typescript
// 悪い例
<Input.TextArea placeholder="説明を入力" />
```

✅ **rows={4}を標準とする**
```typescript
// 良い例
<Input.TextArea placeholder="説明を入力" rows={4} />
```

---

## 8. 共通化の推奨と優先順位

### 8.1 共通化すべきパターンの推奨

全画面横断的な分析結果から、以下の優先順位で共通化を推奨します：

#### 🥇 最優先: パターン2（検索入力）

**推奨理由:**
- ✅ 7画面以上で一貫して使用される
- ✅ 実装が完全に統一されている（prefix、allowClear、固定幅）
- ✅ 共通化による効果が最も大きい
- ✅ 実装の複雑度が低い

**共通化のメリット:**
- 検索UXの完全統一
- コード記述量の削減（推定30〜40%）
- バグ修正の一元化
- デザイン変更時の影響範囲最小化

**実装難易度:** ⭐（低）

**推奨実装:**
```typescript
// frontend/src/components/common/inputs/SearchInput.tsx
```

---

#### 🥈 高優先: パターン1（標準入力）

**推奨理由:**
- ✅ 全画面で最も頻繁に使用される（20+箇所）
- ⚠️ 使用方法にバリエーションがある（maxLength、showCount、autoFocusなど）
- ✅ Form.Item内での使用が多い
- ⚠️ カスタマイズが必要なケースがある

**共通化のメリット:**
- 基本的な入力フィールドの統一
- デフォルト動作の標準化
- バリデーションパターンの統一

**共通化のデメリット:**
- 過度に汎用化すると使いにくくなる可能性
- 特殊なケースへの対応が必要

**実装難易度:** ⭐⭐（中）

**推奨実装方針:**
- ベースとなるシンプルなコンポーネントを提供
- props で柔軟にカスタマイズ可能にする
- 特殊なケースは個別実装を許容する

---

#### 🥉 中優先: パターン3（複数行入力）

**推奨理由:**
- ✅ モーダルフォームで一貫して使用される（4画面以上）
- ✅ rows=4、maxLength=500 が標準
- ⚠️ 使用頻度は検索入力より低い

**共通化のメリット:**
- 説明文入力の統一
- 文字数制限の標準化
- showCount の統一

**実装難易度:** ⭐（低）

**推奨実装:**
```typescript
// frontend/src/components/common/inputs/TextAreaInput.tsx
```

---

#### ❌ 非推奨: パターン4（大型入力）

**非推奨理由:**
- ❌ 使用箇所が1画面のみ（ログイン画面専用）
- ❌ 汎用性が極めて低い
- ❌ 共通化のメリットがほとんどない

**推奨対応:**
- ログイン画面で直接実装する
- 共通コンポーネント化は不要

---

### 8.2 共通化の実装ロードマップ

#### Phase 1: 検索入力の共通化（最優先）

**期間:** 1〜2日

**実装内容:**
1. `SearchInput.tsx` の実装
2. 7画面で使用されている検索入力を置き換え
3. テスト・動作確認

**期待される効果:**
- 検索UXの完全統一
- コード削減: 約50行×7画面 = 350行

---

#### Phase 2: 標準入力の共通化（高優先）

**期間:** 3〜5日

**実装内容:**
1. `StandardInput.tsx` の実装（柔軟性を考慮）
2. 主要なモーダルフォームで試験導入
3. フィードバックを収集して改善
4. 段階的に全画面へ展開

**期待される効果:**
- フォーム入力の標準化
- コード削減: 約30行×20箇所 = 600行

**注意点:**
- すべてを無理に共通化しない
- 特殊なケースは個別実装を許容

---

#### Phase 3: 複数行入力の共通化（中優先）

**期間:** 1〜2日

**実装内容:**
1. `TextAreaInput.tsx` の実装
2. モーダルフォームの説明文入力を置き換え

**期待される効果:**
- TextArea入力の統一
- コード削減: 約20行×5箇所 = 100行

---

### 8.3 共通化の判断基準

#### 共通化すべき条件

以下のすべてを満たす場合、共通化を推奨：

1. ✅ **使用頻度が高い**（5箇所以上）
2. ✅ **実装がほぼ同一**（90%以上が共通）
3. ✅ **将来的にも同じパターンが使われる**
4. ✅ **カスタマイズの必要性が低い**

#### 共通化すべきでない条件

以下のいずれかに該当する場合、個別実装を推奨：

1. ❌ **使用頻度が極めて低い**（1〜2箇所のみ）
2. ❌ **実装にバリエーションが多い**
3. ❌ **特殊な要件がある**
4. ❌ **共通化により複雑度が増す**

---

## 9. 実装ガイドライン

### 9.1 共通コンポーネントの実装

頻出パターンを共通コンポーネントとして実装することを推奨：

```typescript
// frontend/src/components/common/inputs/SearchInput.tsx
import { Input } from 'antd';
import { SearchOutlined } from '@ant-design/icons';

interface SearchInputProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  width?: number;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  placeholder = '検索...',
  width = 250,
}) => {
  return (
    <Input
      size="middle"
      prefix={<SearchOutlined />}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      allowClear
      style={{ width }}
    />
  );
};
```

---

### 8.2 使用方法

```typescript
import { SearchInput } from '@/components/common/inputs/SearchInput';

// 使用例
<SearchInput
  value={searchQuery}
  onChange={setSearchQuery}
  placeholder="プロジェクト名で検索"
  width={300}
/>
```

---

## 9. デザイントークン

Ant Design v6のtheme.tokenを使用して一貫性を保つ：

```typescript
import { theme } from 'antd';

const { token } = theme.useToken();

// 高さ
token.controlHeight      // 32px (middle)
token.controlHeightLG    // 40px (large)
token.controlHeightSM    // 24px (small)

// パディング
token.controlPaddingHorizontal    // 12px (middle)

// ボーダーラジアス
token.borderRadius       // 8px

// フォントサイズ
token.fontSize          // 14px (middle)
token.fontSizeLG        // 16px (large)
token.fontSizeSM        // 12px (small)

// 色
token.colorBorder       // ボーダー色
token.colorPrimary      // フォーカス時のボーダー色
token.colorError        // エラー時のボーダー色
```

---

## 10. まとめ

### 推奨パターン（3パターン）

| パターン | コンポーネント | サイズ | 用途 | 幅 |
|---------|--------------|--------|------|-----|
| **標準入力** | Input | middle | 一般的な入力 | 自動（親要素に合わせる） |
| **検索ボックス** | Input + prefix | middle | 検索・フィルタ | 200〜300px（固定） |
| **複数行入力** | Input.TextArea | - | 説明文、長文 | 自動（親要素に合わせる） |

### オプション追加（4パターン）

| パターン | コンポーネント | サイズ | 用途 | 幅 |
|---------|--------------|--------|------|-----|
| **大型入力** | Input / Input.Password | large | ログイン、重要入力 | 自動（親要素に合わせる） |

### 期待される効果

1. **UI一貫性の向上**
   - 全画面で統一されたテキストボックスデザイン
   - ユーザー体験の向上

2. **開発効率の向上**
   - パターンが明確になり、実装が迅速化
   - 共通コンポーネントで再利用性向上

3. **保守性の向上**
   - デザイン変更時の影響範囲を最小化
   - 一貫性のあるコードベース

---

## 11. 次のステップ

### Phase 1: 共通コンポーネント実装
1. `SearchInput.tsx` の実装
2. `StandardInput.tsx` の実装（オプション）
3. `TextAreaInput.tsx` の実装（オプション）

### Phase 2: 既存画面への適用
1. プロジェクト管理画面
2. フォーマット管理画面
3. 進捗確認画面
4. その他の画面に順次展開

### Phase 3: ドキュメント整備
1. 使用ガイドの作成
2. Storybookでのデモ作成
3. 実装サンプル集の作成
