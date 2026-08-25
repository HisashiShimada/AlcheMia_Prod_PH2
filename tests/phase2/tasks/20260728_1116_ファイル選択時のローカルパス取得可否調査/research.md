# 調査レポート: エクスプローラー/D&Dでのファイル選択時にローカルパスは取得できるか

- **作成日**: 2026-07-28
- **目的**: `<input type="file">` やドラッグ＆ドロップで選択したファイルのローカルファイルシステム上の絶対パスが取得できるか調査する

---

## 1. 結論

**ブラウザのWeb標準APIでは、選択したファイルのローカル絶対パスは取得できない。**

これはセキュリティ上の設計によるものであり、すべてのモダンブラウザ（Chrome / Firefox / Safari / Edge）で共通の仕様。ライブラリやフレームワーク（React、Next.js等）の問題ではなく、ブラウザ自体の制約。

---

## 2. File API で取得できる情報

`<input type="file">` の `onChange` イベントや `onDrop` イベントから渡される `File` オブジェクトで取得できるプロパティは以下の通り。

| プロパティ | 型 | 内容 | 例 |
|---|---|---|---|
| `file.name` | `string` | ファイル名のみ（パスなし） | `"sample_data.xml"` |
| `file.size` | `number` | バイト単位のファイルサイズ | `12345` |
| `file.type` | `string` | MIMEタイプ（ブラウザが推測） | `"application/xml"` |
| `file.lastModified` | `number` | 最終更新日時（Unixミリ秒） | `1720000000000` |
| `file.webkitRelativePath` | `string` | フォルダ選択時のみ有効（後述） | `"myFolder/sub/a.xml"` |

### 取得できない情報

| 取得できない情報 | 説明 |
|---|---|
| 絶対パス | `C:\Users\xxx\Desktop\a.xml` や `/home/user/a.xml` 等は一切取得不可 |
| 保存先ディレクトリ | どのフォルダに保存されているか不明 |
| ドライブ情報 / ネットワークパス | UNCパス等も取得不可 |

---

## 3. `input.value` のダミーパス（fakepath）

`<input type="file">` 要素の `.value` プロパティを参照すると、実パスではなく以下のようなダミー文字列が返る。

```
C:\fakepath\sample_data.xml
```

これは歴史的な経緯でかつては実パスが取れていたが、セキュリティ問題として塞がれた。現在はファイル名のみ抽出できるが実パスは含まれない。**利用価値はほぼない**。

---

## 4. `webkitRelativePath` の挙動

`<input type="file">` に `webkitdirectory` 属性を付けてフォルダ全体を選択させた場合のみ、`file.webkitRelativePath` に**選択したフォルダを起点とした相対パス**が格納される。

```
// 例: "MyProject" フォルダを選択した場合
file.webkitRelativePath === "MyProject/subdir/data.xml"
```

- **フォルダ配下の相対パスのみ**（選択フォルダより上位の情報はない）
- **ファイル単体選択時は空文字列** `""` が返る
- `webkitdirectory` はW3C標準外だが主要ブラウザで動作する（TypeScriptでは `@ts-expect-error` が必要）

### 本プロジェクトでの使用箇所

```tsx
// frontend/src/components/format/FormatUploadDialog.tsx
const fileWithPath = file as File & { webkitRelativePath?: string };
name: fileWithPath.webkitRelativePath || file.name,

// frontend/src/components/project/BulkUploadDialog.tsx
const firstFileWithPath = files[0] as File & { webkitRelativePath?: string };
if (firstFileWithPath.webkitRelativePath) {
  const folderName = firstFileWithPath.webkitRelativePath.split('/')[0];
  setBatchName(t('upload.batchNameFolder', { name: folderName }));
}
```

フォルダアップロード時にサブパスやフォルダ名の推測として使われており、想定された用途で使用されている。

---

## 5. なぜ絶対パスが取得できないのか（セキュリティモデル）

ブラウザはサンドボックス化されており、Webページからユーザーのローカルファイルシステムに自由アクセスできると以下のリスクが生じる：

1. **情報漏洩**: ユーザーのフォルダ構成・ファイル名がサーバーに送信される
2. **フィッシング**: ファイル配置場所の特定でユーザー行動が推測される
3. **ファイルシステムの探索**: 任意のパスを試してファイルの存在確認ができてしまう

このため、W3C / WHATWGの仕様で意図的に制限されている。

---

## 6. 代替手段の検討

もし何らかの理由でローカルパスに近い情報が必要な場合の選択肢：

### 6-1. File System Access API（推奨：モダンブラウザのみ）

Chrome 86+ / Edge 86+ で使用可能な新しいAPI。ユーザーの明示的な許可のもと、ファイルハンドルを通じてファイルを読み書きできる。

```ts
// ファイル選択
const [fileHandle] = await window.showOpenFilePicker();
const file = await fileHandle.getFile();
// fileHandle.name でファイル名取得（絶対パスは依然として取得不可）
```

> **注意**: 絶対パスそのものは取得できないが、同じファイルハンドルで継続的な読み書きが可能。  
> Firefox は2024年時点で未対応。

### 6-2. Electron（デスクトップアプリ化）

Electronを使えばNode.jsのfsモジュールが使えるため完全な絶対パスが取得できる。Web版とは別途対応が必要。

### 6-3. サーバー側でのパス管理

本プロジェクトのように、ファイル選択後にS3へアップロードしてS3キー（パス）で管理するアプローチが最も現実的。ローカルパスは不要で、S3上のパスを正の情報として扱う。

### 6-4. `webkitRelativePath` の利用

フォルダアップロードが前提の場合、`webkitRelativePath` から選択フォルダより下のディレクトリ構造は再現できる（本プロジェクトの `FormatUploadDialog` がこの方式）。

---

## 7. 本プロジェクトでの現状実装確認

| ファイル | 方式 | 取得している情報 |
|---|---|---|
| `InsertionEditorCompact.tsx` | `<input type="file">` + `onDrop` | `file.name`、`file.size`（バリデーション用）、ファイル内容 |
| `ContentGridEditor.tsx` | `<input type="file">` + `onDrop` | `file`（ファイル内容をCSV/XMLパース） |
| `FormatUploadDialog.tsx` | `webkitdirectory` 対応 | `file.webkitRelativePath`（サブパス）、`file.name` |
| `BulkUploadDialog.tsx` | `webkitdirectory` 対応 | `file.webkitRelativePath`（フォルダ名推測） |
| `TemplateEditorDialog.tsx` | `<input type="file">` + `onDrop` | `file.name`（`InsertionEditorCompact`経由） |

いずれも `file.name` 相当の情報のみを使用しており、ローカル絶対パスには依存していない。**現状の実装は仕様の制約の中で適切に設計されている**。

---

## まとめ

- **ローカルの絶対パスはブラウザ標準APIでは取得不可（仕様による制限）**
- `file.name`（ファイル名のみ）と `file.webkitRelativePath`（フォルダ選択時の相対パス）が取得可能な最大情報
- 本プロジェクトはS3キーをアップロード先パスとして管理するアーキテクチャであり、ローカルパス不要の設計になっている
- `TemplateEditorDialog` の `sourceS3Key` からアップロードパスを構築する方針は、この制約を踏まえた正しいアプローチ
