/**
 * TaskService型定義
 * 
 * @description タスクステータス更新サービスの型定義
 * Task: 2.1 コントローラー層実装
 */

import { TaskStatusEnumType } from '../enums/codeMaster.enum';

/**
 * タスクステータス文字列型（APIリクエスト/レスポンス境界用）
 * フロントエンドから受け取るJSON文字列値→Enum数値への変換に使用。
 * 内部ロジックでは TaskStatusEnumType（数値）を使用すること。
 */
export type TaskStatusString = 'not_started' | 'in_progress' | 'review_waiting' | 'completed' | 'forced_terminated';

/** @deprecated TaskStatusString を使用してください */
export type TaskStatus = TaskStatusString;

/** TaskStatusEnum数値型（内部ロジック用） */
export type { TaskStatusEnumType };

export interface TaskStatusResponse {
  organizationId: string;
  projectId: string;
  projectName: string;
  methodId: string;
  taskNo: number;
  taskStatus: TaskStatus;
  experimentUserId: string | null;
  experimentUserName: string | null;
  experimentStartAt: string | null;
  experimentEndAt: string | null;
  updateAt: string;
}

export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
    originalError?: Error;
  };
}

/**
 * updateTaskStatusのパラメータ
 */
export interface UpdateTaskStatusParams {
  organizationId: string;
  projectId: string;
  methodId: string;
  taskNo: number;
  status: TaskStatus; // 文字列のステータス値
  currentUpdateAt: string;
  userId: string;
  comment?: string;
}
