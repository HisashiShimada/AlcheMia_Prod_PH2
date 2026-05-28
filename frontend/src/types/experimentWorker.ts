import {
  ProjectStatusType,
  ProjectStatus as ProjectStatusConst,
  TaskStatusType,
  TaskStatus as TaskStatusConst,
  IssueTypeType,
} from '@/constants/codeMaster';

// 優先度の型
export type Priority = 'high' | 'medium' | 'normal' | 'low';

// 指示タイプ
export type InstructionType = 'safety' | 'setup' | 'measurement' | 'cleanup' | 'general';

/**
 * Property タグ用の型（<property xsi:type="...">）
 * MAIML の propertyType 系 xsiType に対応
 * xsiType をそのまま使用する（変換なし）
 */
export type PropertyType =
  // --- 文字列型 ---
  | 'stringType'         // 文字列
  | 'tokenType'          // トークン（空白正規化済み文字列）
  | 'stringEnumType'     // 列挙文字列
  // --- 整数型 ---
  | 'intType'            // 32bit 整数
  | 'longType'           // 64bit 整数
  | 'shortType'          // 16bit 整数
  | 'byteType'           // 8bit 整数
  | 'unsignedIntType'    // 符号なし 32bit 整数
  | 'unsignedLongType'   // 符号なし 64bit 整数
  | 'unsignedShortType'  // 符号なし 16bit 整数
  | 'unsignedByteType'   // 符号なし 8bit 整数
  // --- 浮動小数点型 ---
  | 'floatType'          // 単精度浮動小数点
  | 'doubleType'         // 倍精度浮動小数点
  | 'decimalType'        // 任意精度小数
  // --- 真偽値型 ---
  | 'booleanType'        // 真偽値
  // --- 日時型 ---
  | 'dateType'           // 日付
  | 'dateTimeType'       // 日時
  // --- Property リスト型（スペース区切り値列）---
  | 'stringListType'     // 文字列リスト
  | 'intListType'        // 整数リスト
  | 'longListType'       // 64bit整数リスト
  | 'shortListType'      // 16bit整数リスト
  | 'byteListType'       // 8bit整数リスト
  | 'unsignedIntListType'
  | 'floatListType'      // 単精度浮動小数点リスト
  | 'doubleListType'     // 倍精度浮動小数点リスト
  | 'decimalListType'    // 任意精度小数リスト
  | 'booleanListType'    // 真偽値リスト
  | 'dateTimeListType'   // 日時リスト
  // --- 構造型・特殊型 ---
  | 'propertyListType'   // 子 Property・子 Content をネストする構造型
  | 'insertion';         // ファイルアップロード（<insertion> タグ）

/**
 * Content タグ用の型（<content xsi:type="...">）
 * MAIML の contentBaseType 系 xsiType に対応
 * xsiType をそのまま使用する（変換なし）
 */
export type ContentType =
  | 'contentStringListType'    // 文字列リスト
  | 'contentIntListType'       // 整数リスト
  | 'contentLongListType'      // 64bit整数リスト
  | 'contentShortListType'     // 16bit整数リスト
  | 'contentByteListType'      // 8bit整数リスト
  | 'contentUnsignedIntListType'
  | 'contentFloatListType'     // 単精度浮動小数点リスト
  | 'contentDoubleListType'    // 倍精度浮動小数点リスト（2次元数値データグリッドとして表示）
  | 'contentDecimalListType'   // 任意精度小数リスト
  | 'contentBooleanListType'   // 真偽値リスト
  | 'contentDateTimeListType'; // 日時リスト

/**
 * Content フィールドの型（Property と区別するための専用型）
 * DataRecordDialog の Template.contents[] および Property.contents[] で使用
 * maiml-unified.ts の Content インターフェースの UI 用サブセット
 */
export interface ContentField {
  key: string;
  label: string;
  type: ContentType;     // ContentType（PropertyType と分離）
  units?: string;
  description?: string;
  axis?: string;         // maiml-unified.ts の Content.axis に対応
  size?: number;         // maiml-unified.ts の Content.size に対応
  nestedProperties?: Property[]; // 子 Property（XSD の genericDataContainerGroup に対応）
  contents?: ContentField[];     // 子 Content（XSD の genericDataContainerGroup に対応・再帰）
}

// テンプレートカテゴリ
export type TemplateCategory = 'Materials' | 'Conditions' | 'Results';

// ユーザー情報
export interface User {
  userId: string;
  userName: string;
  role?: string;
}

// 指示データ
export interface Instruction {
  instructionId: string;
  transitionId?: string;
  transitionName?: string;
  methodId?: string;
  methodName?: string;
  taskId?: string;
  taskName?: string;
  content: string;
  priority: Priority;
  instructionType: InstructionType;
  createdAt: string;
  updatedAt: string | null;
  createdBy: User;
  isRead: boolean;
  // API仕様に基づく確認済みフラグ（API: is_acknowledged）
  isAcknowledged: boolean;           // 確認済みフラグ
  acknowledgedAt?: string;            // 確認日時（ISO 8601）
  acknowledgedBy?: string;            // 確認者ID
  acknowledgedByName?: string;        // 確認者名
}

// 作業割り当て
export interface WorkAssignment {
  workId: string;
  fileKey: string;
  fileName: string;
  assignedBy: User;
  assignedAt: string;
  confirmedAt: string | null;
  status: string;
}

// トランジション詳細
export interface TransitionDetail {
  transitionId: string;
  transitionName: string;
  category: string;
  description: string;
  isExperimentRelevant: boolean;
  estimatedDuration: string;
  requiredEquipment: string[];
  safetyNotes: string;
}

// トランジション（シンプル版）
export interface Transition {
  transitionId: string;
  transitionName: string;
  description?: string;
  category?: string;
  estimatedDuration?: string;
  workOrder?: number; // 作業順序（フロー図での並び順と接続に使用）
  templates?: Template[];
  // Phase 6追加: 実験記録タブ用のプロパティ
  status?: ProgressStatus; // ステータス
  progressRate?: number; // 進捗率（浸食率）
  inputMaterialsCount?: number; // 入力済材料数
  totalMaterialsCount?: number; // 材料の総数
  inputIngredientsCount?: number; // 入力済素材数
  totalIngredientsCount?: number; // 素材の総数
  inputResultsCount?: number; // 入力済結果数
  totalResultsCount?: number; // 結果の総数
}

// メソッド
export interface Method {
  methodId: string;
  methodName: string;
  experimentOrder: number; // 実験順序（1から開始）
  description: string;
  category: string;
  transitions: Transition[];
  tasks?: Task[]; // Phase 2: タスク一覧（実験作業タブ用）
}

// プロパティ定義
export interface Property {
  key: string;
  label: string;
  type: PropertyType;
  units?: string;
  required?: boolean;
  defaultValue?: string | number | boolean | null;
  options?: string[];
  min?: number;
  max?: number;
  nestedProperties?: Property[];       // 子 Property（maiml-unified の properties[] に対応）
  contents?: ContentField[];           // 子 Content（maiml-unified の contents[] に対応）
  description?: string;                // プロパティの説明文（MAIMLの <description> 要素）
  formatString?: string;               // 数値フォーマット文字列（例: "%.3f"）
  scaleFactor?: string;                // 単位変換係数
}


/**
 * テンプレートレベルの <insertion> タグの型（非カスタム）
 * MAIML の resultTemplate / conditionTemplate に直接含まれるファイル添付フィールド
 */
export interface InsertionField {
  /** 既存ファイルの URI（新規の場合は空文字列） */
  uri: string;
  /** ファイルのハッシュ値（SHA256） */
  hash?: string;
  /** ファイルのMIMEタイプ（例: "image/tiff", "txt/ascii"） */
  format?: string;
  /** フィールドの説明 */
  description?: string;
}

// テンプレート定義
export interface Template {
  templateId: string;
  category: TemplateCategory;
  name: string;
  description?: string;
  properties: Property[];
  contents?: ContentField[];           // テンプレートトップレベルの Content（Property と別枠）
  insertions?: InsertionField[];       // テンプレートトップレベルの <insertion>（非カスタム）
}

// 実験データ値
export interface ExperimentDataValue {
  [key: string]: string | number | boolean | Date | null | number[][] | ExperimentDataValue | ExperimentDataValue[];
}

// 実験記録データ
export interface ExperimentRecord {
  recordId?: string;
  transitionId: string;
  templateId: string;
  category: TemplateCategory;
  data: ExperimentDataValue;
  createdAt?: string;
  updatedAt?: string;
}

// 過去の実験結果データ（ドロップダウン用）
export interface PastExperimentData {
  recordId: string;
  transitionId: string;
  templateId: string;
  data: ExperimentDataValue;
  createdAt: string;
}

// プロジェクト状態（数値コード）
// constants/codeMaster.ts の ProjectStatus を使用すること
// 0=計画中, 1=タスク実行待ち, 2=タスク実行中, 3=承認待ち, 4=完了, 5=異常終了
export type ProjectStatus = ProjectStatusType;

// プロジェクトデータ
export interface ProjectData {
  projectId: string;
  projectName: string;
  description?: string; // プロジェクトの説明
  fileName: string;
  status: ProjectStatus; // プロジェクト状態
  workAssignment: WorkAssignment;
  instructions: Instruction[];
  transitionDetails: Record<string, TransitionDetail>;
  methods?: Method[];
  progressData?: TransitionProgress[];
}

/**
 * プロジェクト状態のヘルパー関数
 */

/**
 * 編集可能な状態かどうかを判定
 * タスク実行待ち（1）またはタスク実行中（2）の場合に編集可能
 * @param status プロジェクト状態（数値）
 * @returns 編集可能な場合true
 */
export function isEditableStatus(status: ProjectStatus): boolean {
  return (
    status === ProjectStatusConst.TASK_PENDING ||
    status === ProjectStatusConst.TASK_IN_PROGRESS
  );
}

/**
 * プロジェクト選択可能な状態かどうかを判定
 * タスク実行待ち（1）・タスク実行中（2）・承認待ち（3）の場合に選択可能
 * @param status プロジェクト状態（数値）
 * @returns 選択可能な場合true
 */
export function isSelectableStatus(status: ProjectStatus): boolean {
  return (
    status === ProjectStatusConst.TASK_PENDING ||
    status === ProjectStatusConst.TASK_IN_PROGRESS ||
    status === ProjectStatusConst.REVIEW_WAITING
  );
}

/**
 * 実験記録の参照・操作が可能な状態かどうかを判定
 * タスク実行中（2）・承認待ち（3）・完了（4）の場合に記録ボタンを活性化する
 * @param status プロジェクト状態（数値）
 * @returns 記録を参照・操作可能な場合true
 */
export function isRecordViewableStatus(status: ProjectStatus): boolean {
  return (
    status === ProjectStatusConst.TASK_IN_PROGRESS ||
    status === ProjectStatusConst.REVIEW_WAITING ||
    status === ProjectStatusConst.COMPLETED
  );
}

// 統計情報
export interface Stats {
  total: number;
  file: number;
  method: number;
  task: number;
  transition: number;
  unread: number;
}

// 進捗ステータス
export type ProgressStatus = 'not_started' | 'in_progress' | 'completed' | 'on_hold' | 'issue';

/**
 * トランジションステータス（実験データ記録用）
 * 数値型（TransitionStatusEnumに対応）
 * 0: 初期状態, 1: 準備中, 2: 準備完了, 3: 実行中, 4: 一時停止, 5: 完了, 6: エラー
 */
export type TransitionStatus = number;

// トランジション進捗情報
export interface TransitionProgress {
  transitionId: string;
  transitionName: string;
  taskId?: string; // タスクID（Phase 6で追加）
  taskName?: string; // タスク名（Phase 6で追加）
  methodId: string;
  methodName: string;
  progressRate: number; // 0-100
  status: ProgressStatus;
  reportCount: number; // 進捗報告数
  issueCount: number; // 未解決課題数
  inputMaterialsCount?: number; // 入力済み材料数（Phase 6で追加）
  inputIngredientsCount?: number; // 入力済み素材数（Phase 6で追加）
  inputResultsCount?: number; // 入力済み結果数（Phase 6で追加）
}

// ===== Phase 1: 実験作業タブ用の型定義 =====

/**
 * タスクステータス（数値コード）
 * constants/codeMaster.ts の TaskStatus を使用すること
 * 0=実行待ち, 1=実行中, 2=レビュー待ち, 3=完了, 4=異常終了
 */
export type TaskStatus = TaskStatusType;

// タスクデータ（実験作業タブ用）
export interface Task {
  taskId: string;              // タスクID
  projectId?: string;          // プロジェクトID（Phase 7追加: プロジェクト選択連動用）
  methodId?: string;           // メソッドID（Phase 7追加: プロジェクト選択連動用）
  methodName: string;          // メソッド名（Phase 1追加: グループ化・折りたたみ用）
  taskNo: string;              // タスクNo（Phase 8追加: タスク一覧テーブル表示用）
  taskName: string;            // タスク名
  sampleNumber: string;        // サンプル番号
  notes: string;               // 備考
  status: TaskStatus;          // ステータス
  assignedUserId?: string;     // 割り当てユーザーID
  assignedUserName?: string;   // 割り当てユーザー名
  createdAt?: string;          // 作成日時（ISO8601形式）
  updatedAt: string;           // 更新日時（ISO8601形式、楽観的ロック用に必須）
  progressRate: number;        // 進捗率（0-100）
  transitionStatuses?: TransitionStatus[]; // トランジションステータス一覧
  progressReport: string;      // 進捗報告の状態（例: "実験記録報告"）
  recordNumber: string;        // 実験記録番号
}

// ワークフロー統計（実験作業タブ用）
export interface WorkflowStatistics {
  notStarted: number;    // 開始前のトランジション数
  started: number;       // 開始数
  inProgress: number;    // 作業中数
  completed: number;     // 完了数
  progressRate: number;  // 進捗率（%）
}

// ===== Phase: 問題報告モーダル用の型定義 =====

/**
 * 問題タイプ（数値コード）
 * constants/codeMaster.ts の IssueType を使用すること
 * 0=材料不足, 1=機器故障, 2=手順不明確, 3=安全性の懸念, 4=品質問題, 5=時間制約, 6=その他
 */
export type IssueType = IssueTypeType;

// 問題報告データ（問題報告モーダル用）
export interface IssueReportData {
  taskId: string;          // タスクID
  issueType: IssueType;    // 問題タイプ
  comment: string;         // コメント
  reportedAt?: string;     // 報告日時（バックエンドで設定）
  reportedBy?: string;     // 報告者（バックエンドで設定）
}

// ===== Phase: 問題管理（参照・コメント）用の型定義 =====

// 問題状態（未解決/解決済）
export type IssueStatus = 'unresolved' | 'resolved';

// 問題対象タイプ（プロジェクト/タスク/トランジション）
export type IssueTargetType = 'project' | 'task' | 'transition';

// 問題コメント
export interface IssueComment {
  commentId: string;       // コメントID
  issueId: string;         // 問題ID
  content: string;         // コメント内容
  createdBy: User;         // 記入者
  createdAt: string;       // 記入時刻
}

// 問題
export interface Issue {
  issueId: string;         // 問題ID
  transitionId: string;    // トランジションID
  transitionName: string;  // トランジション名
  projectId?: string;      // プロジェクトID（対象がプロジェクトの場合）
  projectName?: string;    // プロジェクト名（対象がプロジェクトの場合）
  taskId?: string;         // タスクID（対象がタスクの場合）
  taskName?: string;       // タスク名（対象がタスクの場合）
  title: string;           // タイトル
  content: string;         // 内容
  status: IssueStatus;     // 状態（未解決/解決済）
  targetType: IssueTargetType; // 対象（プロジェクト/タスク/トランジション）
  issueType?: IssueType;   // 問題タイプ（材料不足/機器故障/etc.）
  reportedBy: User;        // 報告者
  reportedAt: string;      // 報告時刻
  comments: IssueComment[]; // コメント一覧
}

// ===== カスタムプロパティ用の型定義 =====

/** カスタムプロパティのコンテナ種別 */
export type ContainerType = 'property' | 'content' | 'insertion';

/**
 * カスタムプロパティの型（property/content 共通）
 * insertion の場合は containerType で判別するため customType は 'insertion' 固定
 * content の場合は MAIML 仕様の listType を使用:
 *   contentStringListType / contentDoubleListType / contentIntListType
 */
export type CustomPropertyType =
  // --- property 系 ---
  | 'stringType'
  | 'tokenType'
  | 'stringEnumType'
  | 'intType'
  | 'longType'
  | 'shortType'
  | 'byteType'
  | 'unsignedIntType'
  | 'unsignedLongType'
  | 'unsignedShortType'
  | 'unsignedByteType'
  | 'floatType'
  | 'doubleType'
  | 'decimalType'
  | 'booleanType'
  | 'dateType'
  | 'dateTimeType'
  | 'stringListType'
  | 'intListType'
  | 'longListType'
  | 'shortListType'
  | 'byteListType'
  | 'unsignedIntListType'
  | 'floatListType'
  | 'doubleListType'
  | 'decimalListType'
  | 'booleanListType'
  | 'dateTimeListType'
  // --- content 系 ---
  | 'contentStringListType'
  | 'contentIntListType'
  | 'contentLongListType'
  | 'contentShortListType'
  | 'contentByteListType'
  | 'contentUnsignedIntListType'
  | 'contentFloatListType'
  | 'contentDoubleListType'
  | 'contentDecimalListType'
  | 'contentBooleanListType'
  | 'contentDateTimeListType'
  // --- insertion ---
  | 'insertion';

/**
 * カスタムプロパティ（ユーザーが任意追加するプロパティ）
 * DataRecordDialog の state で管理する
 */
export interface CustomPropertyValue {
  /** state内の一意キー（追加順識別子）*/
  id: string;
  /** MAIML上のプロパティキー名 */
  key: string;
  /** コンテナ種別 */
  containerType: ContainerType;
  /** データ型（insertion の場合は 'insertion' 固定） */
  customType: CustomPropertyType;
  /**
   * 入力値
   * - property: string（型に応じてパース）
   * - content: string[]（各要素が1行のスペース区切り値リスト）
   * - insertion: null（File オブジェクトは file フィールドで管理）
   */
  value: string | string[] | null;
  /** 単位（property/content のみ） */
  units: string;
  /**
   * insertion 専用: 選択済みファイルオブジェクト
   * 保存時に S3 アップロードして uri を取得する
   */
  file?: File | null;
  /**
   * insertion 専用: S3 アップロード後の URI（s3Key）
   * ファイルアップロード完了後にこのフィールドに格納する
   */
  uri?: string;
  /** insertion 専用: SHA256 ハッシュ（ファイル選択時に生成） */
  hash?: string;
  /** insertion 専用: MIMEタイプ（ファイル選択時に自動検出） */
  format?: string;
  /** カスタムプロパティ識別フラグ（常に true） */
  isCustomProperty: true;
}

// 問題報告フォームデータ
export interface IssueReportFormData {
  title: string;           // タイトル
  targetType: IssueTargetType; // 対象
  issueType: IssueType;    // 問題タイプ
  content: string;         // 内容
}

/**
 * 問題報告APIのリクエストボディ
 * POST /api/v1/issues
 * 移動元: services/issueApiService.ts
 */
export interface CreateIssueParams {
  /** プロジェクトID（UUID、必須） */
  projectId: string;
  /** メソッドID（オプション） */
  methodId?: string;
  /** 問題タイプ（必須）: code_master.code_value（整数） */
  issueType: number;
  /** 対象タイプ（必須） */
  targetType: string;
  /** タスク連番（オプション） */
  taskNo?: number;
  /** トランジションID（オプション） */
  transitionId?: string;
  /** タイトル（必須、最大200文字） */
  title: string;
  /** 内容（必須、最大2000文字） */
  description: string;
}

/**
 * コメント追加APIのリクエストパラメータ
 * POST /api/v1/issues/comments
 * 移動元: services/issueApiService.ts
 */
export interface AddCommentParams {
  /** プロジェクト名（必須） */
  projectName: string;
  /** 問題ID（UUID、必須） */
  issueId: string;
  /** コメント内容（必須） */
  comment: string;
}

/**
 * 問題一覧取得APIのクエリパラメータ
 * GET /api/v1/issues
 * 移動元: services/issueApiService.ts
 */
export interface GetIssuesParams {
  /** プロジェクトID（UUID、必須） */
  projectId: string;
  /** メソッドID（オプション。省略時はプロジェクト全件を返す） */
  methodId?: string;
  /** タスク連番（オプション） */
  taskNo?: number;
  /** トランジションID（オプション） */
  transitionId?: string;
  /** ステータスフィルタ（オプション） */
  status?: 'unresolved' | 'resolved';
  /** 問題タイプフィルタ（オプション）: code_master.code_value（整数） */
  issueType?: number;
}

/**
 * UnifiedSelectionDialog 用プロジェクト情報
 * 移動元: components/ExperimentWorker/UnifiedSelectionDialog.tsx
 */
export interface ProjectInfo {
  projectId: string;
  projectName: string;
  fileName?: string;
  methods?: Method[];
}

/**
 * 統合選択ダイアログのステップ
 * 移動元: components/ExperimentWorker/UnifiedSelectionDialog.tsx
 */
export type SelectionStep = 'project' | 'method' | 'task';

/**
 * 実験記録タブの表示モード
 * 移動元: components/ExperimentWorker/ExperimentRecordTab.tsx
 */
export type ViewMode = 'list' | 'flow';

/**
 * 選択ダイアログのタイプ
 * 移動元: components/ExperimentWorker/SelectionDialog.tsx
 */
export type SelectionType = 'project' | 'method' | 'task';

/**
 * 選択ダイアログのアイテム
 * 移動元: components/ExperimentWorker/SelectionDialog.tsx
 */
export interface SelectionItem {
  id: string;
  name: string;
  subtitle?: string;
  description?: string;
  tag?: string;
}
