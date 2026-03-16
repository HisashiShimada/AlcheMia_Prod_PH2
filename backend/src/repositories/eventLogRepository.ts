/**
 * EventLogRepository
 * 
 * maiml_event_logテーブルへのデータアクセスを担当するリポジトリ
 * イベントログの記録操作を提供します。
 */

import { PoolClient } from 'pg';
import { TransitionStatus } from '../types/transitionData';

/**
 * 指示確認ログのパラメータ
 */
export interface InstructionConfirmLogParams {
  /** 指示対象: 1=ファイル全体、2=タスク、3=トランジション */
  instructionTarget: number;
  /** メソッドID */
  methodId: string | null;
  /** トランジションID */
  transitionId: string | null;
  /**
   * programのID（MAIMLファイルから解析して取得）
   * トランジション（target=3）・タスク（target=2）の場合に trace @ref として使用する。
   * MAIMLファイルの <program id="..."> 属性値。
   */
  programId: string | null;
  /** タスク連番 */
  taskNo: number | null;
  /** 実験指示ID */
  experimentInstructionId: string;
  /** 確認ユーザID */
  userId: string;
  /** 確認日時（ISO8601文字列） */
  acknowledgedAt: string;
}

/**
 * イベントタイプ
 */
export type EventType = 'transition_status_update' | 'template_data_saved';

/**
 * イベントログデータ
 */
export interface EventLogData {
  event_type: EventType;
  method_id: string;
  task_no: number;
  transition_id?: string;
  place_id?: string;
  status?: TransitionStatus; // 数値型（0-6）
  progress_rate?: number;
  comment?: string | null;
  updated_by: string;
  timestamp: Date;
}

/**
 * データベースエラー
 */
export class DatabaseError extends Error {
  originalError?: Error;

  constructor(message: string = 'Database error', originalError?: Error) {
    super(message);
    this.name = 'DatabaseError';
    this.originalError = originalError;
  }
}

/**
 * EventLogRepository
 * 
 * maiml_event_logテーブルへのイベント記録操作を提供します。
 * すべての操作でorganization_idによるマルチテナント分離を保証します。
 */
export class EventLogRepository {
  /**
   * イベントログを記録
   * 
   * maiml_event_logテーブルにイベントを記録します。
   * sequence_noは(organization_id, project_id)単位で自動採番されます。
   * 
   * @param organizationId - 組織ID（マルチテナント分離）
   * @param projectId - プロジェクトID
   * @param eventData - イベントログデータ
   * @param client - トランザクション用のPoolClient
   * @throws {DatabaseError} データベースエラーが発生した場合
   */
  async logEvent(
    organizationId: string,
    projectId: string,
    eventData: EventLogData,
    client: PoolClient
  ): Promise<void> {
    try {
      // sequence_noの自動採番
      // organization_idとproject_idの組み合わせで最大値を取得し、+1する
      const sequenceQuery = `
        SELECT COALESCE(MAX(sequence_no), 0) + 1 as next_sequence_no
        FROM maiml_event_log
        WHERE organization_id = $1 AND project_id = $2
      `;

      const sequenceResult = await client.query(sequenceQuery, [
        organizationId,
        projectId,
      ]);

      const nextSequenceNo = sequenceResult.rows[0].next_sequence_no;

      // イベントログをJSONB形式で保存
      // Parameterized Queryを使用してSQLインジェクション対策
      // organization_idフィルタを含め、マルチテナント分離を保証
      const insertQuery = `
        INSERT INTO maiml_event_log (
          organization_id,
          project_id,
          sequence_no,
          log,
          create_user_id,
          create_at,
          update_user_id,
          update_at
        )
        VALUES (
          $1,
          $2,
          $3,
          $4::jsonb,
          $5,
          CURRENT_TIMESTAMP,
          $5,
          CURRENT_TIMESTAMP
        )
      `;

      // イベントデータをJSONオブジェクトとして構築
      // undefinedのフィールドはJSONに含めない
      const logData: Record<string, unknown> = {
        event_type: eventData.event_type,
        method_id: eventData.method_id,
        task_no: eventData.task_no,
        updated_by: eventData.updated_by,
        timestamp: eventData.timestamp.toISOString(),
      };

      // オプショナルフィールドの追加
      if (eventData.transition_id !== undefined) {
        logData.transition_id = eventData.transition_id;
      }
      if (eventData.place_id !== undefined) {
        logData.place_id = eventData.place_id;
      }
      if (eventData.status !== undefined) {
        logData.status = eventData.status;
      }
      if (eventData.progress_rate !== undefined) {
        logData.progress_rate = eventData.progress_rate;
      }
      if (eventData.comment !== undefined) {
        logData.comment = eventData.comment;
      }

      const params = [
        organizationId,
        projectId,
        nextSequenceNo,
        JSON.stringify(logData), // JSONB型として保存
        eventData.updated_by,
      ];

      await client.query(insertQuery, params);
    } catch (error) {
      throw new DatabaseError(
        'Database error occurred while logging event',
        error as Error
      );
    }
  }

  /**
   * 指示確認イベントログを記録
   *
   * 指示確認（PUT /instructions/:instructionId/confirm）時に呼び出す。
   * instruction_target に応じて以下のJSON構造を生成して maiml_event_log に保存する。
   *
   * - instruction_target = 1（ファイル全体）: eventLog > log + evnet（log外）
   * - instruction_target = 2（タスク）:       eventLog > log > trace(@taskno) > evnet
   * - instruction_target = 3（トランジション）: eventLog > log > trace > evnet
   *
   * sequence_no は (organization_id, project_id) 単位で MAX+1 自動採番。
   * ID採番ルール:
   *   <log id>    = "log_{sequence_no}"
   *   <evnet id>  = "evnet_{sequence_no}"（全ケース共通で自動発番）
   *   <evnet ref> = experimentInstructionId（トランジション・タスクの場合）
   *
   * @param organizationId - 組織ID（マルチテナント分離）
   * @param projectId - プロジェクトID
   * @param params - 指示確認ログパラメータ
   * @param client - トランザクション用のPoolClient
   * @throws {DatabaseError} データベースエラーが発生した場合
   */
  async insertInstructionConfirmLog(
    organizationId: string,
    projectId: string,
    params: InstructionConfirmLogParams,
    client: PoolClient
  ): Promise<void> {
    try {
      // sequence_no の自動採番（organization_id + project_id 単位の MAX+1）
      const sequenceQuery = `
        SELECT COALESCE(MAX(sequence_no), 0) + 1 AS next_sequence_no
        FROM maiml_event_log
        WHERE organization_id = $1 AND project_id = $2
      `;
      const sequenceResult = await client.query(sequenceQuery, [
        organizationId,
        projectId,
      ]);
      const nextSequenceNo: number = sequenceResult.rows[0].next_sequence_no;

      // instruction_target に応じた JSON 構造を構築
      const logJson = this.buildEventLogJson(params, nextSequenceNo);

      // maiml_event_log にINSERT（Parameterized Query）
      const insertQuery = `
        INSERT INTO maiml_event_log (
          organization_id,
          project_id,
          sequence_no,
          log,
          create_user_id,
          create_at,
          update_user_id,
          update_at
        )
        VALUES (
          $1,
          $2,
          $3,
          $4::jsonb,
          $5,
          CURRENT_TIMESTAMP,
          $5,
          CURRENT_TIMESTAMP
        )
      `;

      await client.query(insertQuery, [
        organizationId,
        projectId,
        nextSequenceNo,
        JSON.stringify(logJson),
        params.userId,
      ]);
    } catch (error) {
      throw new DatabaseError(
        'Database error occurred while inserting instruction confirm log',
        error as Error
      );
    }
  }

  /**
   * トランジション進捗更新イベントログを記録
   *
   * トランジションの進捗が更新された際（みなし進捗・手動更新）に呼び出す。
   * 以下のXML構造を模したJSONを maiml_event_log に保存する。
   *
   * ```xml
   * <eventLog id="eventLogID">
   *   <log id="work_{ts}_{shortName}_log_transition_{transitionId}" ref="{transitionId}">
   *     <trace id="trace_{transitionId}_work_{ts}_{shortName}" ref="{transitionId}">
   *       <event id="event_report_{loginId}_{ts}" ref="{transitionId}">
   *         <property key="timestamp" xsi:type="xs:dateTime">...</property>
   *         <property key="worker_id" xsi:type="xs:string">...</property>
   *         <property key="status" xsi:type="xs:string">...</property>
   *         <property key="progress_percentage" xsi:type="xs:int">...</property>
   *         <property key="report_type" xsi:type="xs:string">transition_progress</property>
   *         <property key="comments" xsi:type="xs:string">...</property>
   *       </event>
   *     </trace>
   *   </log>
   * </eventLog>
   * ```
   *
   * ID採番ルール:
   *   ts        = Date.now()（Unixミリ秒）
   *   shortName = loginIdの@より前の部分（例: yukihiro.omori@... → yukihiro）
   *   loginId   = user_authenticationテーブルから取得（取得失敗時はuserIdをフォールバック）
   *
   * @param organizationId - 組織ID（マルチテナント分離）
   * @param projectId - プロジェクトID
   * @param transitionId - トランジションID
   * @param userId - 更新者ユーザID（user_authenticationのuser_id）
   * @param statusLabel - ステータスラベル文字列（例: "running", "completed"）
   * @param progressPercentage - 進捗率（0-100）
   * @param comment - コメント（省略可）
   * @param client - トランザクション用のPoolClient
   * @throws {DatabaseError} データベースエラーが発生した場合
   */
  async insertTransitionProgressLog(
    organizationId: string,
    projectId: string,
    transitionId: string,
    userId: string,
    statusLabel: string,
    progressPercentage: number,
    comment: string | null | undefined,
    client: PoolClient
  ): Promise<void> {
    try {
      // 1. sequence_no の自動採番（organization_id + project_id 単位の MAX+1）
      const sequenceQuery = `
        SELECT COALESCE(MAX(sequence_no), 0) + 1 AS next_sequence_no
        FROM maiml_event_log
        WHERE organization_id = $1 AND project_id = $2
      `;
      const sequenceResult = await client.query(sequenceQuery, [
        organizationId,
        projectId,
      ]);
      const nextSequenceNo: number = sequenceResult.rows[0].next_sequence_no;

      // 2. loginId の設定
      //    user_authentication の user_id はメールアドレス形式のためそのまま loginId として使用する
      const loginId: string = userId;

      // 3. ID生成に必要な値を算出
      //    ts1: ログ生成タイムスタンプ（Unixミリ秒）
      //    shortName: loginIdの@より前の部分（メールアドレス以外の場合はloginId全体）
      const ts = Date.now();
      const atIndex = loginId.indexOf('@');
      const shortName = atIndex > 0 ? loginId.substring(0, atIndex) : loginId;
      const nowIso = new Date(ts).toISOString();

      // 4. JSON構造を構築
      const logJson = {
        eventLog: {
          '@id': 'eventLogID',
          log: {
            '@id': `work_${ts}_${shortName}_log_transition_${transitionId}`,
            '@ref': transitionId,
            trace: {
              '@id': `trace_${transitionId}_work_${ts}_${shortName}`,
              '@ref': transitionId,
              event: {
                '@id': `event_report_${loginId}_${ts}`,
                '@ref': transitionId,
                property: [
                  {
                    '@key': 'timestamp',
                    '@xsi:type': 'dateTimeType',
                    '#text': nowIso,
                  },
                  {
                    '@key': 'worker_id',
                    '@xsi:type': 'stringType',
                    '#text': loginId,
                  },
                  {
                    '@key': 'status',
                    '@xsi:type': 'stringType',
                    '#text': statusLabel,
                  },
                  {
                    '@key': 'progress_percentage',
                    '@xsi:type': 'intType',
                    '#text': progressPercentage,
                  },
                  {
                    '@key': 'report_type',
                    '@xsi:type': 'stringType',
                    '#text': 'transition_progress',
                  },
                  {
                    '@key': 'comments',
                    '@xsi:type': 'stringType',
                    '#text': comment ?? '',
                  },
                ],

              },
            },
          },
        },
      };

      // 5. maiml_event_log にINSERT（Parameterized Query）
      const insertQuery = `
        INSERT INTO maiml_event_log (
          organization_id,
          project_id,
          sequence_no,
          log,
          create_user_id,
          create_at,
          update_user_id,
          update_at
        )
        VALUES (
          $1,
          $2,
          $3,
          $4::jsonb,
          $5,
          CURRENT_TIMESTAMP,
          $5,
          CURRENT_TIMESTAMP
        )
      `;

      await client.query(insertQuery, [
        organizationId,
        projectId,
        nextSequenceNo,
        JSON.stringify(logJson),
        userId,
      ]);
    } catch (error) {
      throw new DatabaseError(
        'Database error occurred while inserting transition progress log',
        error as Error
      );
    }
  }

  /**
   * 指示対象に応じた eventLog JSON 構造を生成するヘルパー
   *
   * @param params - 指示確認ログパラメータ
   * @param sequenceNo - 採番済みの sequence_no（ID生成に使用）
   * @returns eventLog JSON オブジェクト
   */
  private buildEventLogJson(
    params: InstructionConfirmLogParams,
    sequenceNo: number
  ): Record<string, unknown> {
    const {
      instructionTarget,
      methodId,
      programId,
      taskNo,
      experimentInstructionId,
      userId,
      acknowledgedAt,
    } = params;

    const logId = `log_${sequenceNo}`;
    const evnetId = `evnet_${sequenceNo}`;

    // property 配列（3ターゲット共通）
    const properties = [
      {
        '@key': 'acknowledged_at',
        '@xsi:type': 'dateTimeType',
        '#text': acknowledgedAt,
      },
      {
        '@key': 'experiment_instruction_id',
        '@xsi:type': 'stringType',
        '#text': experimentInstructionId,
      },
      {
        '@key': 'experiment_user_id',
        '@xsi:type': 'stringType',
        '#text': userId,
      },
    ];


    if (instructionTarget === 3) {
      // トランジション: eventLog > log > trace(@ref=programId) > evnet(@ref=experimentInstructionId)
      return {
        eventLog: {
          log: {
            '@id': logId,
            '@ref': methodId ?? '',
            trace: {
              '@ref': programId ?? '',
              evnet: {
                '@id': evnetId,
                '@ref': experimentInstructionId,
                property: properties,
              },
            },
          },
        },
      };
    } else if (instructionTarget === 2) {
      // タスク: eventLog > log > trace(@ref=programId, @taskno) > evnet(@ref=experimentInstructionId)
      return {
        eventLog: {
          log: {
            '@id': logId,
            '@ref': methodId ?? '',
            trace: {
              '@ref': programId ?? '',
              '@taskno': String(taskNo ?? ''),
              evnet: {
                '@id': evnetId,
                '@ref': experimentInstructionId,
                property: properties,
              },
            },
          },
        },
      };
    } else {
      // ファイル全体（instruction_target = 1）: eventLog > log + evnet（log外）
      return {
        eventLog: {
          log: {
            '@id': logId,
            trace: {},
          },
          evnet: {
            '@id': evnetId,
            property: properties,
          },
        },
      };
    }
  }
}
