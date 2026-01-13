# ボタン分析・共通化検討書

## 1. ボタン一覧（画面別）

### 1.1 Provider Menu（プロバイダーメニュー）

#### 会社管理タブ（CompanyManagementMock.tsx）
| ボタン名 | アイコン | type | 用途 | 位置 |
|---------|---------|------|------|------|
| CSVアップロード | UploadOutlined | default | CSVファイルからデータをインポート | ツールバー右 |
| CSVダウンロード | DownloadOutlined | default | データをCSV形式でエクスポート | ツールバー右 |
| 追加 | PlusOutlined | default | 新規会社を追加するモーダルを開く | ツールバー右 |
| アクティブ | DeleteOutlined | success | 選択した会社をアクティブ化 | ツールバー右 |
| 非アクティブ | DeleteOutlined | danger | 選択した会社を非アクティブ化 | ツールバー右 |
| リロード | ReloadOutlined | default | データを再読み込み | ツールバー右 |
| 編集 | EditOutlined | default | 会社情報を編集 | テーブル行内 |
| アクティブ/非アクティブ | - | danger/default | 個別の会社の状態を切替 | テーブル行内 |

**備考**: 組織管理と同じCRUD操作パターン

#### 組織管理タブ（OrganizationManagementMock.tsx）
| ボタン名 | アイコン | type | 用途 | 位置 |
|---------|---------|------|------|------|
| CSVアップロード | UploadOutlined | default | CSVファイルからデータをインポート | ツールバー右 |
| CSVダウンロード | DownloadOutlined | default | データをCSV形式でエクスポート | ツールバー右 |
| 追加 | PlusOutlined | default | 新規組織を追加するモーダルを開く | ツールバー右 |
| アクティブ | DeleteOutlined | success | 選択した組織をアクティブ化 | ツールバー右 |
| 非アクティブ | DeleteOutlined | danger | 選択した組織を非アクティブ化 | ツールバー右 |
| リロード | ReloadOutlined | default | データを再読み込み | ツールバー右 |
| 編集 | EditOutlined | default | 組織情報を編集 | テーブル行内 |
| アクティブ/非アクティブ | - | danger/default | 個別の組織の状態を切替 | テーブル行内 |

#### 情報ダウンロードタブ（InformationDownloadMock.tsx）
| ボタン名 | アイコン | type | 用途 | 位置 |
|---------|---------|------|------|------|
| CSVダウンロード | DownloadOutlined | default | 組織統計情報をCSV形式でダウンロード | カード右上 |

**備考**: 組織統計情報（組織ID、組織名、ユーザー数、ストレージ使用量等）をCSVファイルとしてエクスポート

---

### 1.2 System Admin Menu（システム管理者メニュー）

#### システム概要タブ
**備考**: 統計情報表示（ボタン操作なし）

#### 組織統計情報タブ（OrganizationStatisticsMock.tsx）
| ボタン名 | アイコン | type | 用途 | 位置 |
|---------|---------|------|------|------|
| リロード | ReloadOutlined | default | 統計情報を再読み込み | カード右上 |

**備考**: ストレージ使用量、プロジェクト数、アクティブユーザー数の統計カード表示

#### ユーザー管理タブ（UserManagement.tsx）
| ボタン名 | アイコン | type | 用途 | 位置 |
|---------|---------|------|------|------|
| CSVアップロード | UploadOutlined | default | CSVファイルからユーザーデータをインポート | ツールバー右 |
| CSVダウンロード | DownloadOutlined | default | ユーザーデータをCSV形式でエクスポート | ツールバー右 |
| 追加 | PlusOutlined | default | 新規ユーザーを追加するモーダルを開く | ツールバー右 |
| アクティブ | DeleteOutlined | success | 選択したユーザーをアクティブ化 | ツールバー右 |
| 非アクティブ | DeleteOutlined | danger | 選択したユーザーを非アクティブ化 | ツールバー右 |
| リロード | ReloadOutlined | default | データを再読み込み | ツールバー右 |
| 編集 | EditOutlined | default | ユーザー情報を編集 | テーブル行内 |
| アクティブ/非アクティブ | - | danger/default | 個別のユーザーの状態を切替 | テーブル行内 |

**備考**: 組織管理・会社管理と同じCRUD操作パターン。ユーザー名、ユーザーID、メールアドレスで検索可能。所属部署、二段階認証、ロールでフィルタ可能。

#### セッション管理タブ（SessionManagementMock.tsx）
| ボタン名 | アイコン | type | 用途 | 位置 |
|---------|---------|------|------|------|
| 自動更新（チェックボックス） | - | - | 自動更新機能のON/OFF切替 | ツールバー右 |
| 更新間隔選択 | - | - | 自動更新の間隔を設定（1/5/10/30分） | ツールバー右 |
| リロード | ReloadOutlined | default | セッション情報を再読み込み | ツールバー右 |
| 終了 | - | default | 個別のセッションを強制終了 | テーブル行内 |

**備考**: アクティブなセッション一覧を表示。自分のセッションは終了不可。ユーザー名、メールアドレス、セッション時間で検索可能。

#### 部署管理タブ（MasterManagementMock.tsx）
| ボタン名 | アイコン | type | 用途 | 位置 |
|---------|---------|------|------|------|
| CSVアップロード | UploadOutlined | default | CSVファイルからマスタデータをインポート | ツールバー右 |
| CSVダウンロード | DownloadOutlined | default | マスタデータをCSV形式でエクスポート | ツールバー右 |
| 追加 | PlusOutlined | default | 新規マスタを追加するモーダルを開く | ツールバー右 |
| アクティブ | DeleteOutlined | success | 選択したマスタをアクティブ化 | ツールバー右 |
| 非アクティブ | DeleteOutlined | danger | 選択したマスタを非アクティブ化 | ツールバー右 |
| リロード | ReloadOutlined | default | データを再読み込み | ツールバー右 |
| 編集 | EditOutlined | default | マスタ情報を編集 | テーブル行内 |
| アクティブ/非アクティブ | - | danger/default | 個別のマスタの状態を切替 | テーブル行内 |

**備考**: マスタ管理モックコンポーネント使用。データ管理者メニューと共通。組織管理と同様のCRUD操作パターン。マスタ種別選択（組織、部署、ユーザー、実験装置等）と表示切替（全体/自組織）機能あり。

#### ロール管理タブ（RoleManagementMock.tsx）
| ボタン名 | アイコン | type | 用途 | 位置 |
|---------|---------|------|------|------|
| CSVアップロード | UploadOutlined | default | CSVファイルからロールデータをインポート | ツールバー右 |
| CSVダウンロード | DownloadOutlined | default | ロールデータをCSV形式でエクスポート | ツールバー右 |
| 追加 | PlusOutlined | default | 新規ロールを追加するモーダルを開く | ツールバー右 |
| アクティブ | DeleteOutlined | success | 選択したロールをアクティブ化 | ツールバー右 |
| 非アクティブ | DeleteOutlined | danger | 選択したロールを非アクティブ化 | ツールバー右 |
| リロード | ReloadOutlined | default | データを再読み込み | ツールバー右 |
| 編集 | EditOutlined | default | ロール情報を編集 | テーブル行内 |
| アクティブ/非アクティブ | - | danger/default | 個別のロールの状態を切替 | テーブル行内 |

**備考**: 組織管理と同様のCRUD操作パターン。機能名（機能ID）をクリックすると機能管理モーダルが開き、アクセス権限（読み取り専用/書込可）を設定可能。

---

### 1.3 Data Admin Menu（データ管理者メニュー）

#### マスタ管理タブ（MasterManagementMock.tsx）
| ボタン名 | アイコン | type | 用途 | 位置 |
|---------|---------|------|------|------|
| マスタ選択（ドロップダウン） | - | - | マスタ種別を選択（組織、部署、ユーザー、実験装置等） | ツールバー左 |
| 表示切替（ドロップダウン） | - | - | 全体/自組織でフィルタリング | ツールバー左 |
| CSVアップロード | UploadOutlined | default | CSVファイルからマスタデータをインポート | ツールバー右 |
| CSVダウンロード | DownloadOutlined | default | マスタデータをCSV形式でエクスポート | ツールバー右 |
| 追加 | PlusOutlined | default | 新規マスタを追加するモーダルを開く | ツールバー右 |
| アクティブ | DeleteOutlined | success | 選択したマスタをアクティブ化 | ツールバー右 |
| 非アクティブ | DeleteOutlined | danger | 選択したマスタを非アクティブ化 | ツールバー右 |
| リロード | ReloadOutlined | default | データを再読み込み | ツールバー右 |
| 編集 | EditOutlined | default | マスタ情報を編集 | テーブル行内 |
| アクティブ/非アクティブ | - | danger/default | 個別のマスタの状態を切替 | テーブル行内 |

**備考**: System Admin Menuの部署管理タブと同じMasterManagementMockコンポーネントを使用。マスタ種別選択により、組織、部署、ユーザー、実験装置、実験装置タイプ、実験装置ベンダー等のマスタを管理可能。表示切替で全体/自組織のフィルタリングが可能。

---

### 1.4 Experiment Admin Menu（実験管理者メニュー）

#### プロジェクト管理タブ（ProjectManagement.tsx）

**上部ツールバー（検索・フィルタエリア）:**
| UI要素名 | 種類 | 用途 | 位置 |
|---------|------|------|------|
| 所有者絞込（Select） | Select | 自分のみ/全プロジェクトで絞込 | ツールバー左 |
| 部門絞込（Select） | Select | 部門でフィルタリング | ツールバー左 |
| プロジェクトステータス絞込（Select） | Select | 計画中/保留中/進行中/完了等でフィルタ | ツールバー左 |
| チェックアウトステータス絞込（Select） | Select | チェックイン済/チェックアウト中でフィルタ | ツールバー左 |
| 検索バー（Input） | Input | ID、名前、説明等で検索 | ツールバー左 |
| 詳細検索 | SearchOutlined | primary | 詳細検索モーダルを開く | ツールバー左 |

**アクションボタン:**
| ボタン名 | アイコン | type | 用途 | 位置 |
|---------|---------|------|------|------|
| 新規プロジェクト | PlusOutlined | primary (success色) | 新規プロジェクト作成モーダルを開く | ツールバー右 |
| アップロード | UploadOutlined | primary (success色) | 一括アップロードダイアログを開く | ツールバー右 |
| リフレッシュ | ReloadOutlined | primary | データを再読み込み | ツールバー右 |

**ファイル操作バー（プロジェクト選択時）:**
| ボタン名 | アイコン | type | 用途 | 位置 |
|---------|---------|------|------|------|
| プロジェクトダウンロード | DownloadOutlined | primary | プロジェクト全体をダウンロード | ファイル操作バー |
| 編集 | EditOutlined | primary | プロジェクト情報を編集 | ファイル操作バー |
| チェックイン/チェックアウト | FileTextOutlined | primary (success/warning色) | プロジェクトのチェック状態を切替 | ファイル操作バー |
| 指示送信 | SendOutlined | primary | 作業指示を送信 | ファイル操作バー |
| 公開 | - | primary (info色) | プロジェクトを公開 | ファイル操作バー |

**備考**: 
- プロジェクトツリーとファイル一覧の2カラムレイアウト
- ファイル管理タブとタスク結果タブの2つのタブあり
- 各種フィルタ・検索機能が充実
- チェックイン/チェックアウトはプロジェクト単位で管理

#### フォーマット管理タブ（FormatManagement.tsx）

**上部ツールバー（検索・フィルタエリア）:**
| UI要素名 | 種類 | 用途 | 位置 |
|---------|------|------|------|
| カテゴリ絞込（Select） | Select | プロトコル/材料/測定/解析等でフィルタ | ツールバー左 |
| ファイルタイプ絞込（Select） | Select | XML/MaiMLでフィルタリング | ツールバー左 |
| 検索バー（Input） | Input | ID、名前、説明等で検索 | ツールバー左 |
| 詳細検索 | SearchOutlined | primary | 詳細検索モーダルを開く | ツールバー左 |

**アクションボタン:**
| ボタン名 | アイコン | type | 用途 | 位置 |
|---------|---------|------|------|------|
| リフレッシュ | ReloadOutlined | primary | データを再読み込み | ツールバー右 |

**フォーマット操作バー（フォーマット選択時）:**
| ボタン名 | アイコン | type | 用途 | 位置 |
|---------|---------|------|------|------|
| 新規XMLファイル/新規MaiMLファイル | PlusOutlined | primary (success色) | 新規フォーマットファイルを作成 | 操作バー |
| 新規フォルダ | FolderAddOutlined | primary (success色) | 新規フォルダを作成 | 操作バー |
| アップロード | UploadOutlined | primary | フォーマットファイルをアップロード | 操作バー |

**備考**: 
- プロジェクト管理と同様の構造（フォルダツリー + ファイル一覧の2カラムレイアウト）
- XML/MaiMLフォーマットファイルの管理に特化
- カテゴリ絞込（プロトコル、材料、測定、解析、サンプル、デバイス）
- ファイルタイプ絞込（XML、MaiML）

#### 進捗確認タブ（ProgressMonitoring.tsx）

**上部ツールバー（検索・フィルタエリア）:**
| UI要素名 | 種類 | 用途 | 位置 |
|---------|------|------|------|
| 所有者絞込（Select） | Select | 自分所有のみ/全体でフィルタ | ツールバー左 |
| 部門絞込（Select） | Select | 部門でフィルタリング | ツールバー左 |
| プロジェクトステータス絞込（Select） | Select | 計画中/実行待ち/実行中/完了等でフィルタ | ツールバー左 |
| チェックアウトステータス絞込（Select） | Select | 全て/チェックアウト済み/チェックイン済み | ツールバー左 |
| 検索バー（Input） | Input | 全項目で検索 | ツールバー左 |

**アクションボタン:**
| ボタン名 | アイコン | type | 用途 | 位置 |
|---------|---------|------|------|------|
| リフレッシュ | ReloadOutlined | primary | データを再読み込み | ツールバー右 |

**テーブル内アクション:**
| ボタン名 | アイコン | type | 用途 | 位置 |
|---------|---------|------|------|------|
| 詳細表示 | EyeOutlined | primary ghost | 作業進捗詳細ダイアログを開く | テーブル行内 |

**備考**: 
- プロジェクト一覧を進捗状況と共に表示
- 各種フィルタリング機能（所有者、部門、ステータス、チェックアウト状態）
- プロジェクトごとのタスク進捗（完了数/総数）を表示
- 詳細表示でPetri Net可視化とタスク詳細を確認可能

---

### 1.5 Experiment Worker Menu（実験作業者メニュー）

#### 共通選択エリア（ExperimentWorkerMenu.tsx）
| ボタン名 | アイコン | type | 用途 | 位置 |
|---------|---------|------|------|------|
| 選択 | CheckOutlined | primary | 統合選択ダイアログを開く | 選択エリア右 |

#### タスク一覧タブ（TaskListTab）
| ボタン名 | アイコン | type | 用途 | 位置 |
|---------|---------|------|------|------|
| リフレッシュ | ReloadOutlined | primary | タスク一覧を再読み込み | ツールバー |

#### 作業指示タブ（InstructionConfirmationTab）
| ボタン名 | アイコン | type | 用途 | 位置 |
|---------|---------|------|------|------|
| 確認 | CheckOutlined | primary | 作業指示を確認済みにする | カード内 |
| 詳細 | EyeOutlined | default | 作業指示の詳細を表示 | カード内 |

#### 実験記録タブ（ExperimentRecordTab）
| ボタン名 | アイコン | type | 用途 | 位置 |
|---------|---------|------|------|------|
| クリア | - | default | 入力内容をクリア | モーダルフッター |
| キャンセル | - | default | モーダルを閉じる | モーダルフッター |
| 保存 | - | primary | 実験記録を保存 | モーダルフッター |

#### 進捗報告タブ（ProgressReportTab）
| ボタン名 | アイコン | type | 用途 | 位置 |
|---------|---------|------|------|------|
| クリア | - | default | 入力内容をクリア | モーダルフッター |
| キャンセル | - | default | モーダルを閉じる | モーダルフッター |
| 報告 | - | primary | 進捗を報告 | モーダルフッター |

#### 統合選択ダイアログ（UnifiedSelectionDialog）
| ボタン名 | アイコン | type | 用途 | 位置 |
|---------|---------|------|------|------|
| 戻る | ArrowLeftOutlined | default | 前のステップに戻る | モーダルフッター左 |
| キャンセル | - | default | ダイアログを閉じる | モーダルフッター右 |
| 次へ | ArrowRightOutlined | primary | 次のステップへ進む | モーダルフッター右 |
| 選択完了 | CheckOutlined | primary | 選択を確定 | モーダルフッター右 |



---

## 2. ボタンの用途分類

### 2.1 データ操作系

#### 新規作成・追加
- **新規プロジェクト** (PlusOutlined, primary, success色)
- **追加** (PlusOutlined, default)

#### 編集
- **編集** (EditOutlined, default/primary)

#### 削除・状態変更
- **アクティブ** (DeleteOutlined, success色)
- **非アクティブ** (DeleteOutlined, danger色)
- **アクティブ/非アクティブ切替** (danger/default)

---

### 2.2 データ入出力系

#### インポート
- **CSVアップロード** (UploadOutlined, default)
- **アップロード** (UploadOutlined, primary, success色)

#### エクスポート
- **CSVダウンロード** (DownloadOutlined, default)
- **プロジェクトダウンロード** (DownloadOutlined, primary)

---

### 2.3 検索・フィルタ系

#### 検索
- **詳細検索** (SearchOutlined, primary)

---

### 2.4 リフレッシュ・リロード系

- **リロード** (ReloadOutlined, default)
- **リフレッシュ** (ReloadOutlined, primary)

---

### 2.5 ワークフロー制御系

#### チェックアウト管理
- **チェックイン/チェックアウト** (FileTextOutlined, primary, success/warning色)

#### 指示・送信
- **指示送信** (SendOutlined, primary)
- **選択** (CheckOutlined, primary)

#### 公開
- **公開** (-, primary, info色)

---
## 4. 共通化実装ロードマップ

### Phase 1: 基本CRUD操作ボタンの共通化（優先度: 最高）
**対象:** グループA（CRUD基本操作ボタン）

**実装内容:**
1. `frontend/src/components/common/buttons/` ディレクトリ作成
2. `CrudButtons.tsx` 実装
3. OrganizationManagement で試験的に導入
4. 他のCRUD画面へ段階的に展開

**期待効果:**
- コード重複の大幅削減（推定: 200行以上）
- UI一貫性の向上
- メンテナンス性の向上

---

### Phase 2: CSV操作ボタンの共通化（優先度: 高）
**対象:** グループB（CSV入出力ボタン）

**実装内容:**
1. `CsvButtons.tsx` 実装
2. CSV入出力を持つ全画面へ展開

**期待効果:**
- CSV操作の統一
- バグ修正の一元化
- コード重複削減（推定: 100行以上）

---

### Phase 3: リフレッシュボタンの共通化（優先度: 高）
**対象:** グループC（リフレッシュ/リロードボタン）

**実装内容:**
1. `RefreshButton.tsx` 実装
2. 全データ一覧画面へ展開
3. ローディング状態の統一

**期待効果:**
- リフレッシュ挙動の統一
- ユーザー体験の向上

---

### Phase 4: 検索・アップロードボタンの共通化（優先度: 中）
**対象:** グループD、E（検索・アップロードボタン）

**実装内容:**
1. `SearchButton.tsx` 実装
2. `UploadButton.tsx` 実装
3. 該当画面へ展開

**期待効果:**
- UI一貫性の向上
- コード整理

---

### Phase 5: 複合ボタングループの作成（優先度: 低）
**実装内容:**
各画面で頻出するボタングループを事前定義したコンポーネント作成。

例:
```typescript
// frontend/src/components/common/buttons/DataManagementToolbar.tsx
export const DataManagementToolbar: React.FC = ({
  onAdd,
  onUploadCsv,
  onDownloadCsv,
  onRefresh,
}) => {
  return (
    <Space size="small">
      <CrudButtons onAdd={onAdd} showEdit={false} showDelete={false} />
      <CsvButtons onUpload={onUploadCsv} onDownload={onDownloadCsv} />
      <RefreshButton onRefresh={onRefresh} />
    </Space>
  );
};
```

---

## 6. 期待される効果

### 6.1 開発効率の向上
- **コード記述量の削減**: 推定 30-40% 削減
- **実装時間の短縮**: ボタン関連の実装時間 50% 削減
- **バグ修正の効率化**: 1箇所修正で全画面に反映

### 6.2 品質の向上
- **UI一貫性の確保**: 全画面で統一されたボタンデザイン
- **アクセシビリティの向上**: 共通コンポーネントで一括対応
- **テスト容易性**: 共通コンポーネントの単体テストで品質担保

### 6.3 保守性の向上
- **変更容易性**: デザイン変更時の影響範囲を最小化
- **可読性**: 画面コンポーネントがシンプルになり理解しやすい
- **拡張性**: 新機能追加時に既存パターンを活用可能

---
## 8. リスクと対策

### 8.1 リスク

#### リスク1: 既存画面への影響
既存の画面に共通コンポーネントを導入することで、予期しない挙動が発生する可能性。

**対策:**
- 段階的な導入（1画面ずつ検証）
- 十分なテストケースの作成
- リグレッションテストの実施

#### リスク2: 過度な汎用化
共通コンポーネントが複雑になりすぎる可能性。

**対策:**
- シンプルなコンポーネント設計を維持
- 特殊ケースは個別実装を許容
- 定期的なコードレビュー

#### リスク3: 学習コスト
新しい共通コンポーネントの使い方を習得する必要がある。

**対策:**
- 詳細なドキュメント作成
- Storybookでの使用例提示
- チーム内での勉強会開催

---

## 9. 次のステップ

1. **Phase 1の実装開始**
   - `CrudButtons.tsx` の実装
   - OrganizationManagement での試験導入
   - フィードバック収集と改善

2. **Storybookの整備**
   - 各共通ボタンコンポーネントのストーリー作成
   - インタラクティブなデモページ作成

3. **ドキュメント整備**
   - 使用ガイドの作成
   - ベストプラクティス集の作成
   - 実装サンプル集の作成

4. **チームレビュー**
   - 設計レビューの実施
   - フィードバック反映
   - 実装方針の最終決定

---