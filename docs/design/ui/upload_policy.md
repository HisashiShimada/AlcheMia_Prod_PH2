# ファイルアップロード形状ポリシー

## 標準3パターン

### パターン1: ファイルアップロード（ボタン型）
**用途**: 単一または複数ファイルの選択・アップロード

- 高さ: `token.controlHeight` (32px)
- ボタン幅: 自動（テキスト + アイコン + パディング）
- ボタンタイプ: default（アウトライン）
- アイコン: UploadOutlined（14px）
- ボーダー: 1px solid `token.colorBorder`
- 角丸: `token.borderRadius` (8px)
- パディング: 左右 `token.controlPaddingHorizontal` (15px)
- ファイル名表示: ボタン右側に表示（リスト形式）
- リストタイプ: text（テキストリスト）
- リスト項目の高さ: 22px
- リスト項目の間隔: 8px
- maxCount: 指定可能（1の場合は単一、制限なしの場合は複数）
- multiple: true/false（複数選択の可否）

**単一ファイル実装例**:
```tsx
<Upload
  maxCount={1}
  beforeUpload={() => false}
  showUploadList={{
    showRemoveIcon: true,
    showPreviewIcon: false
  }}
>
  <Button icon={<UploadOutlined />}>ファイルを選択</Button>
</Upload>
```

**複数ファイル実装例**:
```tsx
<Upload
  multiple
  beforeUpload={() => false}
  showUploadList={{
    showRemoveIcon: true,
    showPreviewIcon: true
  }}
  listType="text"
>
  <Button icon={<UploadOutlined />}>ファイルをアップロード</Button>
</Upload>
```

---

### パターン2: ドラッグ&ドロップエリア
**用途**: ビジュアル重視の単一/複数ファイルアップロード

- 最小高さ: 180px
- 推奨高さ: 200px
- 幅: 親要素に合わせる（または520px固定）
- ボーダー: 1px dashed `token.colorBorder`
- ボーダー（ホバー時）: 1px dashed `token.colorPrimary`
- 角丸: `token.borderRadiusLG` (12px)
- 背景色: `token.colorBgLayout` (#fafafa)
- 背景色（ホバー時）: `token.colorPrimaryBg` (#FFF1F3)
- アイコンサイズ: 48px
- アイコン色: `token.colorPrimary` (#CF0027)
- テキスト配置: 中央揃え
- パディング: 上下24px、左右16px

**内部レイアウト**:
```
┌─────────────────────────────────────┐
│                                     │
│         [Upload Icon 48px]          │
│                                     │
│    ファイルをドラッグ&ドロップ        │
│             または                   │
│          クリックして選択             │
│                                     │
│    対応形式: .pdf, .png, .jpg       │
│    最大サイズ: 10MB                  │
│                                     │
└─────────────────────────────────────┘
```

**コンポーネント実装例**:
```tsx
<Upload.Dragger
  maxCount={1}
  beforeUpload={() => false}
  showUploadList={false}
>
  <p className="ant-upload-drag-icon">
    <InboxOutlined style={{ fontSize: 48, color: token.colorPrimary }} />
  </p>
  <p className="ant-upload-text">
    ファイルをドラッグ&ドロップまたはクリックして選択
  </p>
  <p className="ant-upload-hint">
    対応形式: .pdf, .png, .jpg | 最大サイズ: 10MB
  </p>
</Upload.Dragger>
```

---

### パターン3: 画像プレビュー付きアップロード
**用途**: 画像ファイル専用アップロード（サムネイル表示）

- listType: picture-card
- サムネイルサイズ: 104x104px
- 角丸: `token.borderRadiusSM` (4px)
- ボーダー: 1px solid `token.colorBorder`
- 背景色: `token.colorBgContainer` (#ffffff)
- ホバー背景色: `token.colorBgTextHover`
- アイコン: PlusOutlined
- maxCount: 指定可能（例: 5枚まで）
- accept: image/*（画像のみ）
- showUploadList: true（サムネイル表示）

**アップロードエリア表示**:
```
┌─────┐ ┌─────┐ ┌─────┐
│     │ │     │ │  +  │
│ 画像│ │ 画像│ │     │
│  1  │ │  2  │ │アップ│
└─────┘ └─────┘ └ロード┘
```

**コンポーネント実装例**:
```tsx
<Upload
  listType="picture-card"
  maxCount={5}
  beforeUpload={() => false}
  showUploadList={{
    showPreviewIcon: true,
    showRemoveIcon: true
  }}
>
  <div>
    <PlusOutlined />
    <div style={{ marginTop: 8 }}>アップロード</div>
  </div>
</Upload>
```

---

## 共通仕様（全パターン）

### 色定義

**通常**
- ボーダー色: `token.colorBorder` (rgba(0,0,0,0.12))
- 背景色: `token.colorBgContainer` (#ffffff) / パターン2は `token.colorBgLayout` (#fafafa)
- テキスト色: `token.colorText` (#212121)
- アイコン色: `token.colorPrimary` (#CF0027)

**ホバー**
- ボーダー色: `token.colorPrimary` (#CF0027) / パターン2は dashed
- 背景色: `token.colorBgContainer` (#ffffff) / パターン2は `token.colorPrimaryBg` (#FFF1F3)
- テキスト色: `token.colorPrimaryHover` (#E63946)

**ドラッグオーバー**（パターン2のみ）
- ボーダー色: `token.colorPrimary` (#CF0027) 太さ2px
- 背景色: `token.colorPrimaryBg` (#FFF1F3)
- 不透明度: 0.8

**アップロード中**
- プログレスバー色: `token.colorPrimary` (#CF0027)
- プログレスバー背景: `token.colorBgLayout` (#fafafa)
- アイコン: LoadingOutlined（回転アニメーション）

**成功**
- アイコン: CheckCircleFilled
- アイコン色: `token.colorSuccess` (#2e7d32)
- メッセージ色: `token.colorSuccess` (#2e7d32)

**エラー**
- ボーダー色: `token.colorError` (#d32f2f)
- アイコン: CloseCircleFilled
- アイコン色: `token.colorError` (#d32f2f)
- メッセージ色: `token.colorError` (#d32f2f)

**無効**
- ボーダー色: `token.colorBorderSecondary` (rgba(0,0,0,0.06))
- 背景色: `token.colorBgContainerDisabled` (#f5f5f5)
- テキスト色: `token.colorTextDisabled` (#bdbdbd)
- カーソル: not-allowed

### ファイルアイコン

ファイル種類ごとにアイコンを表示（オプション）:
- PDF: FilePdfOutlined（赤色 #CF0027）
- 画像: FileImageOutlined（青色 #0093CF）
- Excel: FileExcelOutlined（緑色 #2e7d32）
- Word: FileWordOutlined（青色 #0093CF）
- その他: FileOutlined（グレー #757575）

### バリデーション

**ファイルサイズ制限**:
```tsx
beforeUpload={(file) => {
  const isLt10M = file.size / 1024 / 1024 < 10;
  if (!isLt10M) {
    message.error('ファイルサイズは10MB以下にしてください');
  }
  return isLt10M || Upload.LIST_IGNORE;
}}
```

**ファイル形式制限**:
```tsx
accept=".pdf,.png,.jpg,.jpeg"

beforeUpload={(file) => {
  const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg'];
  const isAllowedType = allowedTypes.includes(file.type);
  if (!isAllowedType) {
    message.error('対応していないファイル形式です');
  }
  return isAllowedType || Upload.LIST_IGNORE;
}}
```

---

## パターン選択

- 単一/複数ファイル、シンプルなUI → **パターン1（ボタン型）**
- 単一/複数ファイル、ビジュアル重視 → **パターン2（ドラッグ&ドロップ）**
- 画像ファイル専用、サムネイル表示 → **パターン3（画像プレビュー付き）**

### パターン選択チャート

```
ファイルアップロードが必要？
  ├─ Yes → 画像のみ？
  │         ├─ Yes → パターン3（画像プレビュー付き）
  │         └─ No → ビジュアル重視？
  │                   ├─ Yes → パターン2（ドラッグ&ドロップ）
  │                   └─ No → パターン1（ボタン型）
  └─ No → 不要
```

---

## 応用パターン

以下のパターンは標準3パターンの応用として扱います。

### アバター画像アップロード
- **対応する標準パターン**: パターン1（ボタン型）の特殊版
- **差異**: 円形表示（直径120px）、画像プレビュー、クロップ機能
- **用途**: ユーザーアバター画像の設定
- **制限**: 1ファイルのみ、画像形式のみ

**実装例**:
```tsx
<Upload
  maxCount={1}
  listType="picture-circle"
  beforeUpload={() => false}
  showUploadList={false}
>
  <Avatar size={120} icon={<UserOutlined />} />
</Upload>
```

### ディレクトリアップロード
- **対応する標準パターン**: パターン3（リスト型）の拡張版
- **差異**: directory属性、フォルダ構造を保持
- **用途**: フォルダごとの一括アップロード
- **注意**: ブラウザ対応が必要

**実装例**:
```tsx
<Upload
  directory
  beforeUpload={() => false}
  showUploadList={{
    showRemoveIcon: true
  }}
>
  <Button icon={<FolderOpenOutlined />}>フォルダを選択</Button>
</Upload>
```

---

## アクセシビリティ

### キーボード操作
- **Tab**: ボタン/エリアにフォーカス
- **Enter/Space**: ファイル選択ダイアログを開く
- **Tab（リスト内）**: ファイルリスト項目間を移動
- **Delete**: フォーカス中のファイルを削除

### スクリーンリーダー対応
```tsx
<Upload
  aria-label="ファイルをアップロード"
  aria-describedby="upload-hint"
>
  <Button>ファイルを選択</Button>
</Upload>
<div id="upload-hint" className="sr-only">
  対応形式: PDF、PNG、JPG。最大サイズ: 10MB
</div>
```

### 状態通知
- アップロード開始: "ファイルをアップロードしています"
- アップロード成功: "ファイルのアップロードが完了しました"
- アップロード失敗: "ファイルのアップロードに失敗しました"

---

## 完全な実装例

### パターン1: ファイルアップロード（ボタン型）- 単一ファイル版
```tsx
import { Upload, Button, message } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';

const SingleFileUpload = () => {
  const props: UploadProps = {
    maxCount: 1,
    accept: '.pdf,.png,.jpg,.jpeg',
    beforeUpload: (file) => {
      const isLt10M = file.size / 1024 / 1024 < 10;
      if (!isLt10M) {
        message.error('ファイルサイズは10MB以下にしてください');
        return Upload.LIST_IGNORE;
      }
      return false; // 自動アップロードを無効化
    },
    onChange: (info) => {
      if (info.fileList.length === 0) {
        console.log('ファイルが削除されました');
      } else {
        console.log('選択されたファイル:', info.file);
      }
    },
    showUploadList: {
      showRemoveIcon: true,
      showPreviewIcon: false
    }
  };

  return (
    <Upload {...props}>
      <Button icon={<UploadOutlined />}>ファイルを選択</Button>
    </Upload>
  );
};
```

### パターン2: ドラッグ&ドロップエリア
```tsx
import { Upload, message, theme } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';

const { Dragger } = Upload;
const { useToken } = theme;

const DraggerUpload = () => {
  const { token } = useToken();

  const props: UploadProps = {
    name: 'file',
    multiple: false,
    maxCount: 1,
    accept: '.pdf,.png,.jpg,.jpeg',
    beforeUpload: (file) => {
      const isLt10M = file.size / 1024 / 1024 < 10;
      if (!isLt10M) {
        message.error('ファイルサイズは10MB以下にしてください');
        return Upload.LIST_IGNORE;
      }

      const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg'];
      const isAllowedType = allowedTypes.includes(file.type);
      if (!isAllowedType) {
        message.error('対応していないファイル形式です');
        return Upload.LIST_IGNORE;
      }

      return false; // 自動アップロードを無効化
    },
    onChange: (info) => {
      const { status } = info.file;
      if (status === 'done') {
        message.success(`${info.file.name} のアップロードが完了しました`);
      } else if (status === 'error') {
        message.error(`${info.file.name} のアップロードに失敗しました`);
      }
    },
    showUploadList: false
  };

  return (
    <Dragger {...props} style={{ minHeight: 200 }}>
      <p className="ant-upload-drag-icon">
        <InboxOutlined 
          style={{ 
            fontSize: 48, 
            color: token.colorPrimary 
          }} 
        />
      </p>
      <p 
        className="ant-upload-text"
        style={{ 
          fontSize: token.fontSize,
          color: token.colorText 
        }}
      >
        ファイルをドラッグ&ドロップまたはクリックして選択
      </p>
      <p 
        className="ant-upload-hint"
        style={{ 
          fontSize: token.fontSizeSM,
          color: token.colorTextSecondary 
        }}
      >
        対応形式: .pdf, .png, .jpg | 最大サイズ: 10MB
      </p>
    </Dragger>
  );
};
```

### パターン1: ファイルアップロード（ボタン型）- 複数ファイル版
```tsx
import { Upload, Button, message } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import type { UploadProps, UploadFile } from 'antd';
import { useState } from 'react';

const MultipleFileUpload = () => {
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  const [fileList, setFileList] = useState<UploadFile[]>([]);

  const props: UploadProps = {
    multiple: true,
    accept: '.pdf,.png,.jpg,.jpeg,.xlsx,.docx',
    fileList,
    beforeUpload: (file) => {
      const isLt10M = file.size / 1024 / 1024 < 10;
      if (!isLt10M) {
        message.error(`${file.name}: ファイルサイズは10MB以下にしてください`);
        return Upload.LIST_IGNORE;
      }
      return false; // 自動アップロードを無効化
    },
    onChange: (info) => {
      setFileList(info.fileList);
      console.log('現在のファイルリスト:', info.fileList);
    },
    onRemove: (file) => {
      console.log('削除されたファイル:', file.name);
    },
    showUploadList: {
      showRemoveIcon: true,
      showPreviewIcon: true
    },
    listType: 'text'
  };

  return (
    <div>
      <Upload {...props}>
        <Button icon={<UploadOutlined />}>
          ファイルをアップロード
          {fileList.length > 0 && ` (選択済み: ${fileList.length})`}
        </Button>
      </Upload>
    </div>
  );
};
```

### パターン3: 画像プレビュー付きアップロード
```tsx
import { Upload } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { UploadProps, UploadFile } from 'antd';
import { useState } from 'react';

const PictureCardUpload = () => {
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  const props: UploadProps = {
    listType: 'picture-card',
    maxCount: 5,
    fileList,
    accept: 'image/*',
    beforeUpload: (file) => {
      const isLt5M = file.size / 1024 / 1024 < 5;
      if (!isLt5M) {
        message.error('画像サイズは5MB以下にしてください');
        return Upload.LIST_IGNORE;
      }
      return false;
    },
    onChange: (info) => {
      setFileList(info.fileList);
    },
    showUploadList: {
      showPreviewIcon: true,
      showRemoveIcon: true
    }
  };

  return (
    <Upload {...props}>
      <div>
        <PlusOutlined />
        <div style={{ marginTop: 8 }}>アップロード</div>
      </div>
    </Upload>
  );
};
```

---

## 使用上の注意

### DO（推奨）
✅ ファイルサイズ制限を明示する
✅ 対応ファイル形式を明示する
✅ アップロード状態を視覚的にフィードバックする
✅ エラーメッセージは具体的に記述する
✅ 大容量ファイルはプログレスバーを表示する
✅ アクセシビリティを考慮する（aria属性、キーボード操作）

### DON'T（非推奨）
❌ バリデーションなしでアップロードを許可しない
❌ 制限事項を隠さない
❌ アップロード中のフィードバックを省略しない
❌ ファイルリストの削除ボタンを省略しない
❌ モバイル環境を考慮しないUIにしない
❌ 同時に複数パターンを混在させない
