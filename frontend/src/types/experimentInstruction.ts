/**
 * experimentInstruction.ts
 * 実験指示タブ（指示一覧 > 実験指示）の型定義
 *
 * @remarks
 * バックエンド experimentInstructionController.ts のモックレスポンス構造に対応する。
 */

// ─────────────────────────────────────────────────────────────
// API レスポンス型
// ─────────────────────────────────────────────────────────────

/**
 * プロパティ値（想定値と実績値のペア）
 */
export interface ExperimentInstructionProperty {
  /** MAIMLプロパティキー（例: "ns1:Temperature"） */
  key: string;
  /** 表示ラベル（例: "温度"） */
  label: string;
  /** MAIMLの xsi:type（例: "FloatValue", "IntegerValue", "StringValue"） */
  xsiType: string;
  /** 想定値（管理者が設定した指示値） */
  expected: number | string | null;
  /** 実績値（作業者が記録した値）。未記録の場合は null */
  actual: number | string | null;
  /** 単位（例: "℃", "rpm"） */
  unit: string;
}

/**
 * 実験指示レコード（テンプレート単位）
 * 1件 = 1テンプレートの指示データ
 */
export interface ExperimentInstruction {
  /** メソッドID */
  methodId: string;
  /** メソッド名 */
  methodName: string;
  /** タスク番号 */
  taskNumber: number;
  /** タスクステータスコード（code_master: task_status） */
  taskStatus: string;
  /** トランジションID */
  transitionId: string;
  /** トランジション名 */
  transitionName: string;
  /** テンプレート名 */
  templateName: string;
  /** プロパティ値一覧（想定値 + 実績値） */
  properties: ExperimentInstructionProperty[];
}

/**
 * メソッド情報
 */
export interface ProjectMethod {
  /** メソッドID */
  id: string;
  /** メソッド名 */
  name: string;
}

// ─────────────────────────────────────────────────────────────
// API レスポンスラッパー
// ─────────────────────────────────────────────────────────────

export interface GetExperimentInstructionsResponse {
  success: boolean;
  data: ExperimentInstruction[];
}

export interface GetProjectMethodsResponse {
  success: boolean;
  data: ProjectMethod[];
}

export interface ApproveTaskResponse {
  success: boolean;
  message: string;
}

export interface RecordNgResponse {
  success: boolean;
  message: string;
}

// ─────────────────────────────────────────────────────────────
// フロントエンドUI用の集約型
// ─────────────────────────────────────────────────────────────

/**
 * タスクグループ
 * 同一 methodId + taskNumber でグループ化した単位
 */
export interface TaskGroup {
  /** グループキー（"methodId_taskNumber" 形式） */
  key: string;
  methodId: string;
  methodName: string;
  taskNumber: number;
  taskStatus: string;
  /** グループに属する実験指示レコード（テンプレート単位） */
  instructions: ExperimentInstruction[];
}

/**
 * NG記録リクエスト
 */
export interface RecordNgRequest {
  ngReason: string;
}

// ─────────────────────────────────────────────────────────────
// フィルタ・ソート条件
// ─────────────────────────────────────────────────────────────

/**
 * 実験指示タブのフィルタ条件
 */
export interface ExperimentInstructionFilter {
  /** フィルタするメソッドID（undefined = すべて） */
  methodId?: string;
  /** フィルタするタスクステータス（undefined = すべて） */
  taskStatus?: string;
}
