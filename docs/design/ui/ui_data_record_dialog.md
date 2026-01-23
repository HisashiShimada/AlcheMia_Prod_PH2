# 実験データ記録ダイアログ UI設計書

## メタデータ
- **画面ID**: DataRecordDialog
- **画面名**: 実験データ記録ダイアログ
- **ファイルパス**: `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx`
- **利用権限**: 実験作業者（experiment_worker）
- **作成日**: 2026-01-21
- **最終更新日**: 2026-01-21

---

## 1. 概要

### 1.1 画面の目的
トランジション（実験工程）の実験データを記録するためのモーダルダイアログです。テンプレートを選択し、各プロパティに実験結果を入力してデータを保存します。

### 1.2 主要機能
- テンプレートの選択（Materials/Conditions/Results）
- プロパティタイプ別のデータ入力
- DataGrid編集（行列の動的追加・削除）
- トランジションステータスの更新
- みなし進捗更新機能
- 作業指示の確認
- プロジェクトステータスに応じた編集制御

### 1.3 アクセス権限
- **対象ロール**: 実験作業者（experiment_worker）
- **必要条件**: ログイン済み、有効なセッション、編集可能なプロジェクト

---

## 2. 画面構成

### 2.1 画面イメージ
![実験データ記録イメージ](images\ui_data_record_dialog.jpg)

### 2.2 レイアウト構造

```
┌─────────────────────────────────────────────────────────────┐
│ Modal (width: 1400px)                                       │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Title: 実験データ記録 - [トランジション名]              │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ Body:                                                    │ │
│ │ ┌────────────────────────────────────────────────────┐  │ │
│ │ │ □ みなし進捗更新    [作業指示] ボタン             │  │ │
│ │ └────────────────────────────────────────────────────┘  │ │
│ │                                                          │ │
│ │ ┌──────────────────────────────────────────────────┐    │ │
│ │ │ ▼ ステータス更新（みなし進捗OFFの時のみ表示）    │    │ │
│ │ │ ┌─────────────┬─────────────────────────────────┐│    │ │
│ │ │ │ ステータス  │ 進捗スライダー (0%-100%)        ││    │ │
│ │ │ ├─────────────┴─────────────────────────────────┤│    │ │
│ │ │ │ コメント (TextArea)                            ││    │ │
│ │ │ ├───────────────────────────────────────────────┤│    │ │
│ │ │ │                            [保存] ボタン       ││    │ │
│ │ │ └───────────────────────────────────────────────┘│    │ │
│ │ └──────────────────────────────────────────────────┘    │ │
│ │                                                          │ │
│ │ Layout (2カラム, height: 600px)                         │ │
│ │ ┌────────────┬──────────────────────────────────────┐   │ │
│ │ │ Sider      │ Content                              │   │ │
│ │ │ (300px)    │ (残り幅)                             │   │ │
│ │ ├────────────┼──────────────────────────────────────┤   │ │
│ │ │ テンプレート│ データ記録                            │   │ │
│ │ │ 一覧       │                                      │   │ │
│ │ │            │ ┌──────────────────────────────────┐ │   │ │
│ │ │ [検索]     │ │ Form (選択されたテンプレート)     │ │   │ │
│ │ │ [種別]     │ │ - プロパティ入力フォーム          │ │   │ │
│ │ │            │ │ - DataGrid                        │ │   │ │
│ │ │ ┌─────────┐│ │ - ネストプロパティ                │ │   │ │
│ │ │ │ Table   ││ │ - ファイルアップロード            │ │   │ │
│ │ │ │材料 IN  ││ └──────────────────────────────────┘ │   │ │
│ │ │ │条件 IN  ││                                      │   │ │
│ │ │ │結果 OUT ││ ※未選択時: Alertメッセージ表示      │   │ │
│ │ │ └─────────┘│                                      │   │ │
│ │ └────────────┴──────────────────────────────────────┘   │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ Footer:                                                  │ │
│ │ [キャンセル]                      [保存] ボタン          │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘

DataGrid編集画面:
┌──────────────────────────────────────────────┐
│ プロパティ名 [単位]                          │
│ ┌──────────────────────────────────────────┐ │
│ │ Table (bordered, size="small")           │ │
│ │ #  │ 列1 [x] │ 列2 [x] │ 列3 [x]       │ │
│ │ 1[x]│ 0.00    │ 0.00    │ 0.00          │ │
│ │ 2[x]│ 0.00    │ 0.00    │ 0.00          │ │
│ └──────────────────────────────────────────┘ │
│ [行を追加] [列を追加]                        │
└──────────────────────────────────────────────┘

子モーダル:
- InstructionConfirmationModal（作業指示確認）
```

### 2.3 使用コンポーネント

#### Ant Design コンポーネント
- `Modal` - ダイアログコンテナ (width: 1400px, top: 20)
- `Layout` - 2カラムレイアウト (Sider + Content)
- `Sider` - 左サイドバー (width: 300px)
- `Content` - 右コンテンツエリア
- `Form` - データ入力フォーム
- `Input` / `TextArea` - テキスト入力
- `InputNumber` - 数値入力
- `Checkbox` - チェックボックス
- `DatePicker` - 日付/日時選択
- `Select` - ドロップダウン選択（ステータス、テンプレート種別）
- `Table` - テンプレート一覧、DataGrid
- `Button` - 各種ボタン
- `Space` - 要素の間隔制御
- `Row` / `Col` - グリッドレイアウト
- `Alert` - 情報メッセージ
- `Tag` - ラベル表示
- `Upload` - ファイルアップロード
- `Slider` - 進捗スライダー
- `Typography.Title` - 見出し
- `Typography.Text` - テキスト表示
- `theme` - デザイントークン取得

#### カスタムコンポーネント
- `InstructionConfirmationModal` - 作業指示確認モーダル

#### アイコン
- `PlusOutlined` - 追加アイコン（行列追加）
- `DeleteOutlined` - 削除アイコン（行列削除）
- `UploadOutlined` - アップロードアイコン
- `SaveOutlined` - 保存アイコン
- `CloseOutlined` - 閉じるアイコン
- `FileTextOutlined` - ファイルアイコン
- `DownOutlined` - 下向き矢印（展開）
- `RightOutlined` - 右向き矢印（折りたたみ）
- `SearchOutlined` - 検索アイコン
- `AppstoreOutlined` - アプリアイコン（テンプレート一覧）
- `InfoCircleOutlined` - 情報アイコン（作業指示）

---

## 3. コントロール一覧

### 3.1 入力項目

#### 上部コントロール

| 項目名 | タイプ | 必須 | 初期値 | 説明 |
|--------|--------|------|--------|------|
| useDeemedProgress | Checkbox | - | true | みなし進捗更新フラグ |

#### ステータス更新セクション（みなし進捗OFF時のみ表示）

| 項目名 | タイプ | 必須 | 初期値 | 説明 |
|--------|--------|------|--------|------|
| selectedStatus | Select | ○ | 'initial' | トランジションステータス |
| progress | Slider | - | 0 | 進捗率（0-100%） |
| comment | TextArea | - | '' | コメント |

#### テンプレート一覧フィルタ

| 項目名 | タイプ | 必須 | 初期値 | 説明 |
|--------|--------|------|--------|------|
| templateSearchText | Input | - | '' | テンプレート名検索 |
| selectedTemplateCategory | Select | - | undefined | テンプレート種別（Materials/Conditions/Results） |

#### データ入力フォーム（選択されたテンプレートに依存）

| プロパティタイプ | コンポーネント | 説明 |
|----------------|---------------|------|
| stringType | TextArea | 文字列入力（3行） |
| intType | InputNumber | 整数入力（step: 1, precision: 0） |
| floatType | InputNumber | 小数入力（step: 0.01, precision: 2） |
| booleanType | Checkbox | 真偽値 |
| dateType | DatePicker | 日付（YYYY-MM-DD） |
| dateTimeType | DatePicker | 日時（YYYY-MM-DD HH:mm:ss） |
| contentDoubleListType | DataGrid | 2次元数値配列 |
| propertyListType | ネストフォーム | 階層化されたプロパティ |
| insertion | Upload | ファイルアップロード |

### 3.2 ボタン

| ボタン名 | タイプ | 表示条件 | アクション |
|---------|--------|---------|-----------|
| 作業指示 | default + InfoCircleOutlined | 常時 | InstructionConfirmationModalを開く |
| ステータス更新保存 | primary + SaveOutlined | ステータス更新セクション表示時 & プロジェクト編集可能 | ステータスを保存（モック） |
| 行を追加 | small + PlusOutlined | DataGrid表示時 & プロジェクト編集可能 | DataGridに行を追加 |
| 列を追加 | small + PlusOutlined | DataGrid表示時 & プロジェクト編集可能 | DataGridに列を追加 |
| 行削除 | text + danger + DeleteOutlined | DataGrid各行 & プロジェクト編集可能 | 行を削除（最低1行は残す） |
| 列削除 | text + danger + DeleteOutlined | DataGrid各列 & プロジェクト編集可能 | 列を削除（最低1列は残す） |
| キャンセル | default | 常時 | ダイアログを閉じる |
| 保存 | primary + SaveOutlined | 常時 | テンプレートデータを保存 |

### 3.3 表示項目

#### テンプレート一覧テーブル

| カラム | 内容 | 説明 |
|--------|------|------|
| テンプレート名 | Text（太字） | テンプレートの名前 |
| プロパティ数 | Text（副次） | (X項目) |
| テンプレート種別タグ | Tag | 材料（青）/ 条件（緑）/ 結果（橙） |
| I/Oタグ | Tag | IN（青）/ OUT（緑） |

選択状態: `rowClassName`でハイライト表示

#### ステータス選択肢

| 値 | ラベル |
|---|--------|
| initial | 初期状態 |
| preparing | 準備状態 |
| ready | 準備完了状態 |
| running | 動作状態 |
| paused | 休止状態 |
| completed | 終状態 |
| error | 異常終了状態 |

#### 空状態メッセージ

| 状態 | メッセージ | タイプ |
|------|-----------|--------|
| テンプレート未選択 | テンプレートを選択してください<br>左側のテンプレート一覧から記録したいテンプレートを選択してください。 | info |

---

## 4. イベント

### 4.1 ダイアログイベント

| イベント名 | トリガー | 処理内容 |
|-----------|---------|---------|
| ダイアログ表示 | open prop変更 | フォームリセット、初期値設定、DataGrid初期化 |
| onClose | キャンセルボタン / 閉じるボタン | ダイアログを閉じる |

### 4.2 テンプレート選択イベント

| イベント名 | トリガー | 処理内容 |
|-----------|---------|---------|
| onRow.onClick | テンプレート行クリック | selectedTemplateIdを更新、フォーム表示 |
| templateSearchText変更 | 検索入力 | テンプレート一覧をフィルタリング |
| selectedTemplateCategory変更 | 種別選択 | テンプレート一覧をフィルタリング |

### 4.3 データ入力イベント

| イベント名 | トリガー | 処理内容 |
|-----------|---------|---------|
| handleSaveTemplate | 保存ボタンクリック | フォームバリデーション → データ整形 → onSave呼び出し |
| handleDataGridChange | DataGridセル入力 | dataGrids State更新 |
| handleAddRow | 行追加ボタン | DataGridに新規行追加 |
| handleAddColumn | 列追加ボタン | DataGridに新規列追加 |
| handleDeleteRow | 行削除ボタン | 指定行を削除 |
| handleDeleteColumn | 列削除ボタン | 指定列を削除 |

### 4.4 ステータス更新イベント

| イベント名 | トリガー | 処理内容 |
|-----------|---------|---------|
| useDeemedProgress変更 | チェックボックス | ステータス更新セクションの表示切替 |
| selectedStatus変更 | ステータス選択 | selectedStatus State更新 |
| progress変更 | スライダー移動 | progress State更新 |
| comment変更 | コメント入力 | comment State更新 |
| ステータス更新保存 | 保存ボタンクリック | ステータス更新データをログ出力（モック） |

### 4.5 作業指示確認イベント

| イベント名 | トリガー | 処理内容 |
|-----------|---------|---------|
| 作業指示ボタンクリック | ボタンクリック | InstructionConfirmationModalを開く |
| InstructionConfirmationModal閉じる | モーダルキャンセル | instructionModalOpenをfalseに設定 |

---

## 5. データフロー

### 5.1 Props（親から受け取るデータ）

```typescript
interface DataRecordDialogProps {
  open: boolean;                          // ダイアログの表示状態
  transition: Transition | null;          // 対象トランジション
  projectStatus: ProjectStatus | null;    // プロジェクトステータス
  onClose: () => void;                    // 閉じるハンドラ
  onSave: (data: ExperimentDataValue[]) => void; // 保存ハンドラ
  projectId?: string;                     // プロジェクトID（作業指示用）
  methodId?: string;                      // メソッドID（作業指示用）
}
```

### 5.2 State（内部状態）

```typescript
// フォームインスタンス
const [form] = Form.useForm();

// フォームデータ
const [formData, setFormData] = useState<Record<string, ExperimentDataValue>>({});

// DataGrid管理
const [dataGrids, setDataGrids] = useState<Record<string, number[][]>>({});

// ローディング状態
const [loading, setLoading] = useState(false);

// クライアント判定
const [isClient, setIsClient] = useState(false);

// 作業指示モーダル
const [instructionModalOpen, setInstructionModalOpen] = useState(false);

// テンプレート一覧フィルタ
const [templateSearchText, setTemplateSearchText] = useState('');
const [selectedTemplateCategory, setSelectedTemplateCategory] = useState<TemplateCategory | undefined>(undefined);
const [templatesExpanded, setTemplatesExpanded] = useState(true);

// テンプレート選択（単一選択）
const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

// プロパティ入力フォーム折りたたみ
const [propertyFormExpanded, setPropertyFormExpanded] = useState(true);

// ステータス更新折りたたみ
const [statusUpdateExpanded, setStatusUpdateExpanded] = useState(true);

// ステータスとコメント
const [selectedStatus, setSelectedStatus] = useState<TransitionStatus>('initial');
const [comment, setComment] = useState('');
const [progress, setProgress] = useState<number>(0);

// みなし進捗更新
const [useDeemedProgress, setUseDeemedProgress] = useState(true);
```

### 5.3 算出データ（useMemo）

```typescript
// プロジェクト編集可能フラグ
const isProjectEditable = projectStatus ? isEditableStatus(projectStatus) : true;

// フィルタ済みテンプレート一覧
const filteredTemplates = useMemo(() => {
  let filtered = templatesList;

  // 名前での検索
  if (templateSearchText) {
    filtered = filtered.filter((template) =>
      template.name.toLowerCase().includes(templateSearchText.toLowerCase())
    );
  }

  // 種別での絞り込み
  if (selectedTemplateCategory) {
    filtered = filtered.filter((template) => 
      template.category === selectedTemplateCategory
    );
  }

  return filtered;
}, [templateSearchText, selectedTemplateCategory]);

// 選択されたテンプレート
const selectedTemplate = useMemo(() => {
  if (!selectedTemplateId) return null;
  return filteredTemplates.find(template => 
    template.templateId === selectedTemplateId
  );
}, [filteredTemplates, selectedTemplateId]);
```

### 5.4 使用するAPI

| API | メソッド | エンドポイント | 用途 | 実装状況 |
|-----|---------|--------------|------|---------|
| 実験データ保存API | POST | `/api/v1/experiments/{transitionId}/data` | 実験データの保存 | TODO |
| ステータス更新API | PUT | `/api/v1/transitions/{transitionId}/status` | トランジションステータスの更新 | TODO |
| ファイルアップロードAPI | POST | `/api/v1/files/upload` | 実験データファイルのアップロード | TODO |

**実験データ保存API詳細:**
- **リクエストボディ**:
  ```json
  {
    "transitionId": "string",
    "templateId": "string",
    "status": "initial|preparing|ready|running|paused|completed|error",
    "progress": 0,
    "comment": "string",
    "experimentData": {
      "templateId": "string",
      "category": "Materials|Conditions|Results",
      "property1": "value1",
      "property2": 123.45,
      ...
    }
  }
  ```

### 5.5 データソース

- `templatesList` - テンプレートマスターデータ（モック）
- `transition.templates` - トランジションに紐づくテンプレート一覧

---

## 6. エラーチェック

### 6.1 バリデーション

| 項目 | ルール | エラーメッセージ |
|------|--------|----------------|
| 必須プロパティ | required: true | 「{プロパティ名}は必須項目です」 |
| 整数値 | type: intType | 「整数を入力してください」 |
| 小数値 | type: floatType | 「数値を入力してください」 |
| 日付 | type: dateType | 「日付を選択してください」 |
| 最小値 | min設定あり | 「{min}以上の値を入力してください」 |
| 最大値 | max設定あり | 「{max}以下の値を入力してください」 |

### 6.2 保存時のチェック

```typescript
const handleSaveTemplate = async () => {
  if (!selectedTemplate) {
    message.error('テンプレートが選択されていません');
    return;
  }

  try {
    setLoading(true);
    const values = await form.validateFields(); // バリデーション
    
    // データ整形
    const templateData: ExperimentDataValue = {
      templateId: selectedTemplate.templateId,
      category: selectedTemplate.category,
    };
    
    // プロパティごとの値設定
    selectedTemplate.properties.forEach((prop) => {
      const key = `${selectedTemplate.templateId}_${prop.key}`;
      if (prop.type === 'contentDoubleListType') {
        templateData[prop.key] = dataGrids[key] || [[0, 0, 0]];
      } else if (prop.type === 'dateType' || prop.type === 'dateTimeType') {
        const dateValue = values[key];
        templateData[prop.key] = dateValue ? 
          dayjs(dateValue).format(
            prop.type === 'dateType' ? 'YYYY-MM-DD' : 'YYYY-MM-DD HH:mm:ss'
          ) : null;
      } else {
        templateData[prop.key] = values[key] ?? null;
      }
    });
    
    onSave([templateData]);
    message.success(`「${selectedTemplate.name}」を保存しました`);
  } catch (error) {
    console.error('Validation failed:', error);
    message.error('入力内容を確認してください');
  } finally {
    setLoading(false);
  }
};
```

### 6.3 編集制御

```typescript
// プロジェクトステータスによる編集可否
const isProjectEditable = projectStatus ? isEditableStatus(projectStatus) : true;

// 全ての入力コンポーネントでdisabledプロパティを設定
disabled={!isProjectEditable}
```

---

## 7. 画面遷移

### 7.1 遷移元
- ExperimentRecordTab（実験記録タブ）から「データ記録」ボタンクリック

### 7.2 遷移先
なし（モーダルダイアログのため）

### 7.3 モーダル遷移

```
DataRecordDialog
  └→ InstructionConfirmationModal（作業指示確認）
      └→ 閉じる
```

---

## 8. レスポンシブ対応

### 8.1 ブレークポイント

| サイズ | 幅 | 対応 |
|--------|-----|-----|
| Mobile | < 768px | 非推奨（モーダル幅1400pxのため） |
| Tablet | 768px - 1024px | 部分対応（横スクロール） |
| Desktop | > 1024px | 完全対応 |

### 8.2 レスポンシブ制御

- モーダル幅: 1400px固定（デスクトップ向け）
- サイドバー幅: 300px固定
- コンテンツエリア: 残り幅を使用
- フォームカラム: 通常12span、DataGrid/ネストプロパティは24span

---

## 9. パフォーマンス考慮事項

### 9.1 最適化

- `filteredTemplates`, `selectedTemplate`は`useMemo`でメモ化
- DataGrid更新は個別セルのみ更新
- 大量のプロパティがある場合の仮想スクロール検討（将来）

### 9.2 データ量

- テンプレート数: 最大100件程度を想定
- DataGrid: 最大100行×20列程度を想定
- プロパティ数: テンプレートあたり最大50項目程度を想定

---

## 10. 備考

### 10.1 特記事項

1. **テンプレート選択方式**
   - 単一選択のみ
   - 選択したテンプレートのみフォーム表示
   - 複数テンプレートの同時記録は非対応（Phase 1）

2. **DataGrid編集**
   - 初期値: 1行3列（[[0, 0, 0]]）
   - 最低1行1列は残す（全削除不可）
   - 小数第2位まで入力可能

3. **ステータス更新機能**
   - みなし進捗更新ON: ステータス更新セクション非表示、保存時に自動判定
   - みなし進捗更新OFF: ステータス更新セクション表示、手動入力
   - プロジェクトが編集不可の場合: ステータス更新セクション初期折りたたみ

4. **プロジェクトステータス制御**
   - `isEditableStatus()`で編集可否を判定
   - 編集不可の場合: 全入力コンポーネントがdisabled

5. **ファイルアップロード**
   - 現在はモック実装（S3アップロード未実装）
   - beforeUploadでアップロード処理を実装予定

### 10.2 将来の拡張

1. 複数テンプレートの同時記録
2. テンプレートのバージョン管理
3. 過去の実験データの参照・コピー機能
4. DataGridのCSVインポート/エクスポート
5. プロパティの条件分岐表示
6. 実験データの差分比較
7. リアルタイムバリデーション
8. オートセーブ機能

### 10.3 関連ドキュメント

- [InstructionConfirmationModal UI設計書](./ui_instruction_confirmation_modal.md)
- [ExperimentRecordTab UI設計書](./ui_experiment_record_tab.md)
- [画面一覧](./ui_screen_list.md)
- [API一覧（実験作業者画面）](../api/API一覧_実験作業者画面.md)

---

## 11. 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 1.0.0 | 2026-01-21 | 初版作成 | Cline |
