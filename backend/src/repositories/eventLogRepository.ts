/**
 * EventLogRepository
 * 
 * maiml_event_logテーブルへのデータアクセスを担当するリポジトリ
 * イベントログの記録操作を提供します。
 */

import { PoolClient } from 'pg';
import { TransitionStatus } from '../types/transitionData';
import { loadSqlFile } from '../sql/loader';
import { getPgp } from '../database/db';
import type { EventLogRow } from '../types/eventLog';

/**
 * 指示送信ログのパラメータ
 */
export interface InstructionSentLogParams {
  /** メソッドID（nullの場合はファイル全体指示） */
  methodId: string | null;
  /** トランジションID */
  transitionId: string | null;
  /**
   * programのID（MAIMLファイルから解析して取得）
   * トランジション（target=3）・タスク（target=2）の場合に trace @ref として使用する。
   */
  programId: string | null;
  /** タスク連番 */
  taskNo: number | null;
  /** 実験指示ID */
  experimentInstructionId: string;
  /** 送信ユーザID */
  userId: string;
  /** 送信日時（ISO8601文字列） */
  sentAt: string;
  /** 指示内容テキスト */
  instructions: string | null;
}

/**
 * 指示確認ログのパラメータ
 */
export interface InstructionConfirmLogParams {
  /** メソッドID（nullの場合はファイル全体指示） */
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
 * プロジェクト指示送信用パラメータ
 * insertProjectInstructionSentLog で使用する。
 * 指示種別（instructionKey）と粒度に応じたJSON構造を生成する。
 *
 * @see .clinerules/references/eventlog_structure.md — lifecycle:transition 系 eventLog 共通ルール
 */
export interface ProjectInstructionSentLogParams {
  /** メソッドID（全体指示の場合はnull） */
  methodId: string | null;
  /** トランジションID（トランジション単位の場合のみ） */
  transitionId: string | null;
  /** programタグのID（トランジション/タスク単位の場合に必須） */
  programId: string | null;
  /** タスク連番（タスク単位の場合のみ） */
  taskNo: number | null;
  /** 実験指示ID */
  experimentInstructionId: string;
  /** 送信ユーザID */
  userId: string;
  /** 送信日時（ISO8601文字列） */
  sentAt: string;
  /** 指示内容テキスト */
  instructions: string | null;
  /** MAIMLのpropertyタグキー（必須） */
  instructionKey: string;
  /** プロジェクト名（ID命名規則に使用） */
  projectName: string;
  /**
   * ExperimentPlanDialog で指定した作業予定者（assignee）の ownerRef 一覧
   * 0件または未指定の場合は ownerRef_assignee タグを省略する
   */
  assigneeOwnerRefs?: string[] | null;
  /**
   * トランジション+タスク単位の場合に experiment_plan から取得した Creator 一覧
   * 0件または未指定の場合は creatorRef タグを省略する
   */
  creatorRefs?: string[] | null;
  /**
   * トランジション+タスク単位の場合に experiment_plan から取得した Instrument 一覧
   * 0件または未指定の場合は instrumentRef タグを省略する
   */
  instrumentRefs?: string[] | null;
}

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
  private sequenceQueryPromise: Promise<string> = loadSqlFile('event_log/getNextSequenceNo.sql');
  private insertQueryPromise: Promise<string> = loadSqlFile('event_log/insertEventLog.sql');

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
      const sequenceQuery = await this.sequenceQueryPromise;
      const sequenceResult = await client.query(sequenceQuery, [
        organizationId,
        projectId,
      ]);

      const nextSequenceNo = sequenceResult.rows[0].next_sequence_no;

      const insertQuery = await this.insertQueryPromise;

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
      const sequenceQuery = await this.sequenceQueryPromise;
      const sequenceResult = await client.query(sequenceQuery, [
        organizationId,
        projectId,
      ]);
      const nextSequenceNo: number = sequenceResult.rows[0].next_sequence_no;

      // instruction_target に応じた JSON 構造を構築
      const logJson = this.buildEventLogJson(params, nextSequenceNo);

      const insertQuery = await this.insertQueryPromise;

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
   * 指示送信イベントログを記録
   *
   * 指示送信（POST /instructions/send）時に未送信指示ごとに呼び出す。
   * instruction_target に応じて以下のJSON構造を生成して maiml_event_log に保存する。
   *
   * - instruction_target = 1（ファイル全体）: eventLog > log > trace > evnet（ref なし）
   * - instruction_target = 2（タスク）:       eventLog > log > trace(@taskno) > evnet
   * - instruction_target = 3（トランジション）: eventLog > log > trace > evnet
   *
   * property のキーは確認時と異なり送信用のキーを使用する:
   *   - sent_at: 送信日時
   *   - experiment_instruction_id: 実験指示ID
   *   - instruction_user_id: 送信ユーザID
   *
   * sequence_no は (organization_id, project_id) 単位で MAX+1 自動採番。
   *
   * @param organizationId - 組織ID（マルチテナント分離）
   * @param projectId - プロジェクトID
   * @param params - 指示送信ログパラメータ
   * @param client - トランザクション用のPoolClient
   * @throws {DatabaseError} データベースエラーが発生した場合
   */
  async insertInstructionSentLog(
    organizationId: string,
    projectId: string,
    params: InstructionSentLogParams,
    client: PoolClient
  ): Promise<void> {
    try {
      // code_master から各区分のラベルマップを並列取得
      // sequence_no の自動採番（organization_id + project_id 単位の MAX+1）
      const sequenceQuery = await this.sequenceQueryPromise;
      const sequenceResult = await client.query(sequenceQuery, [
        organizationId,
        projectId,
      ]);
      const nextSequenceNo: number = sequenceResult.rows[0].next_sequence_no;

      // methodId / transitionId / taskNo の有無に応じた JSON 構造を構築
      const logJson = this.buildInstructionSentLogJson(
        params,
        nextSequenceNo,
      );

      const insertQuery = await this.insertQueryPromise;

      await client.query(insertQuery, [
        organizationId,
        projectId,
        nextSequenceNo,
        JSON.stringify(logJson),
        params.userId,
      ]);
    } catch (error) {
      throw new DatabaseError(
        'Database error occurred while inserting instruction sent log',
        error as Error
      );
    }
  }

  /**
   * 指示送信用の eventLog JSON 構造を生成するヘルパー
   *
   * methodId / transitionId / taskNo の有無で JSON 構造を判定する:
   * - methodId あり && transitionId あり && taskNo あり → タスク指示
   * - methodId あり && transitionId あり               → トランジション指示
   * - methodId あり                                    → メソッド指示
   * - それ以外                                         → ファイル全体指示
   *
   * @param params - 指示送信ログパラメータ
   * @param sequenceNo - 採番済みの sequence_no（ID生成に使用）
   * @returns eventLog JSON オブジェクト
   */
  private buildInstructionSentLogJson(
    params: InstructionSentLogParams,
    sequenceNo: number,
  ): Record<string, unknown> {
    const {
      methodId,
      transitionId,
      programId,
      taskNo,
      experimentInstructionId,
      userId,
      sentAt,
      instructions,
    } = params;

    const logId = `log_${sequenceNo}`;
    const evnetId = `evnet_${sequenceNo}`;

    // property 配列（全ターゲット共通）
    const properties = [
      {
        '@key': 'sent_at',
        '@xsi:type': 'dateTimeType',
        '#text': sentAt,
      },
      {
        '@key': 'experiment_instruction_id',
        '@xsi:type': 'stringType',
        '#text': experimentInstructionId,
      },
      {
        '@key': 'instruction_user_id',
        '@xsi:type': 'stringType',
        '#text': userId,
      },
      {
        '@key': 'instructions',
        '@xsi:type': 'stringType',
        '#text': instructions ?? '',
      },
    ];

    if (!!methodId && taskNo != null) {
      // タスク指示: eventLog > log > trace(@id, @ref=programId, @taskno) > evnet(@ref=experimentInstructionId)
      // transitionId は不要（methodId + taskNo でタスク指示を判定）
      const traceId = `trace_${sequenceNo}`;
      return {
        eventLog: {
          log: {
            '@id': logId,
            '@ref': methodId,
            trace: {
              '@id': traceId,
              '@ref': programId ?? traceId,
              '@taskno': String(taskNo),
              evnet: {
                '@id': evnetId,
                '@ref': experimentInstructionId,
                property: properties,
              },
            },
          },
        },
      };
    } else if (!!methodId && !!transitionId) {
      // トランジション指示: eventLog > log > trace(@id, @ref=programId) > evnet(@ref=experimentInstructionId)
      const traceId = `trace_${sequenceNo}`;
      return {
        eventLog: {
          log: {
            '@id': logId,
            '@ref': methodId,
            trace: {
              '@id': traceId,
              '@ref': programId ?? traceId,
              evnet: {
                '@id': evnetId,
                '@ref': experimentInstructionId,
                property: properties,
              },
            },
          },
        },
      };
    } else if (!!methodId) {
      // メソッド指示: eventLog > log(@ref=methodId) > trace > evnet(@ref=experimentInstructionId)
      const traceId = `trace_${sequenceNo}`;
      return {
        eventLog: {
          log: {
            '@id': logId,
            '@ref': methodId,
            trace: {
              '@id': traceId,
              // '@ref' は意図的に省略（programId は不要）
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
      // ファイル全体指示: eventLog > log > trace > evnet（ref なし）
      const traceId = `trace_${sequenceNo}`;
      return {
        eventLog: {
          log: {
            '@id': logId,
            // '@ref' は意図的に省略（ファイル全体指示はrefなし）
            trace: {
              '@id': traceId,
              // '@ref' は意図的に省略
              evnet: {
                '@id': evnetId,
                // '@ref' は意図的に省略
                property: properties,
              },
            },
          },
        },
      };
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
    client: PoolClient,
    /** log/@ref に使用するメソッドID（未指定時は transitionId をフォールバック） */
    methodId?: string | null,
    /** trace/@ref に使用するプログラムID（未指定時は transitionId をフォールバック） */
    programId?: string | null,
    /** event/@ref に使用するインストラクションID（未指定時は transitionId をフォールバック） */
    instructionId?: string | null,
    /** event/resultsRef の ref 値配列（data層の result-type place IDを参照） */
    resultsRefs?: string[] | null
  ): Promise<void> {
    try {
      // 1. sequence_no の自動採番（organization_id + project_id 単位の MAX+1）
      const sequenceQuery = await this.sequenceQueryPromise;
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
      // ref 採番ルール（MAIML XML 仕様準拠）:
      //   log/@ref   → methodId（メソッドID）
      //   trace/@ref → programId（プログラムID）
      //   event/@ref → instructionId（インストラクションID）
      // いずれも未指定の場合は transitionId をフォールバックとして使用する
      const logRefId    = methodId     ?? transitionId;
      const traceRefId  = programId    ?? transitionId;
      const eventRefId  = instructionId ?? transitionId;

      // resultsRefs: data層の result-type place ID 配列を { '@ref': placeId } 形式に変換
      // XSD: eventType.resultsRefs は Reference[] (ref: string が必須)
      const resultsRefsJson = (resultsRefs && resultsRefs.length > 0)
        ? resultsRefs.map(ref => ({ '@ref': ref }))
        : undefined;

      const eventObj: Record<string, unknown> = {
        '@id': `event_report_${loginId}_${ts}`,
        '@ref': eventRefId,
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
      };

      // resultsRef が存在する場合のみ追加
      if (resultsRefsJson) {
        eventObj['resultsRef'] = resultsRefsJson.length === 1
          ? resultsRefsJson[0]
          : resultsRefsJson;
      }

      const logJson = {
        eventLog: {
          '@id': 'eventLogID',
          log: {
            '@id': `work_${ts}_${shortName}_log_transition_${transitionId}`,
            '@ref': logRefId,
            trace: {
              '@id': `trace_${transitionId}_work_${ts}_${shortName}`,
              '@ref': traceRefId,
              event: eventObj,
            },
          },
        },
      };

      // 5. maiml_event_log にINSERT
      const insertQuery = await this.insertQueryPromise;

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
   * 指示確認用の eventLog JSON 構造を生成するヘルパー
   *
   * methodId / transitionId / taskNo の有無で JSON 構造を判定する:
   * - methodId あり && transitionId あり && taskNo あり → タスク指示
   * - methodId あり && transitionId あり               → トランジション指示
   * - methodId あり                                    → メソッド指示
   * - それ以外                                         → ファイル全体指示
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
      methodId,
      transitionId,
      programId,
      taskNo,
      experimentInstructionId,
      userId,
      acknowledgedAt,
    } = params;

    const logId = `log_${sequenceNo}`;
    const evnetId = `evnet_${sequenceNo}`;

    // property 配列（全ターゲット共通）
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

    if (!!methodId && taskNo != null) {
      // タスク指示: eventLog > log > trace(@id, @ref=programId, @taskno) > evnet(@ref=experimentInstructionId)
      // transitionId は不要（methodId + taskNo でタスク指示を判定）
      const traceId = `trace_${sequenceNo}`;
      return {
        eventLog: {
          log: {
            '@id': logId,
            '@ref': methodId,
            trace: {
              '@id': traceId,
              '@ref': programId ?? traceId,
              '@taskno': String(taskNo),
              evnet: {
                '@id': evnetId,
                '@ref': experimentInstructionId,
                property: properties,
              },
            },
          },
        },
      };
    } else if (!!methodId && !!transitionId) {
      // トランジション指示: eventLog > log > trace(@id, @ref=programId) > evnet(@ref=experimentInstructionId)
      const traceId = `trace_${sequenceNo}`;
      return {
        eventLog: {
          log: {
            '@id': logId,
            '@ref': methodId,
            trace: {
              '@id': traceId,
              '@ref': programId ?? traceId,
              evnet: {
                '@id': evnetId,
                '@ref': experimentInstructionId,
                property: properties,
              },
            },
          },
        },
      };
    } else if (!!methodId) {
      // メソッド指示: eventLog > log(@ref=methodId) > trace > evnet(@ref=experimentInstructionId)
      const traceId = `trace_${sequenceNo}`;
      return {
        eventLog: {
          log: {
            '@id': logId,
            '@ref': methodId,
            trace: {
              '@id': traceId,
              // '@ref' は意図的に省略（programId は不要）
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
      // ファイル全体指示: eventLog > log > trace > evnet（ref なし）
      const traceId = `trace_${sequenceNo}`;
      return {
        eventLog: {
          log: {
            '@id': logId,
            // '@ref' は意図的に省略（ファイル全体指示はrefなし）
            trace: {
              '@id': traceId,
              // '@ref' は意図的に省略
              evnet: {
                '@id': evnetId,
                // '@ref' は意図的に省略
                property: properties,
              },
            },
          },
        },
      };
    }
  }

  /**
   * プロジェクト指示送信イベントログを記録
   *
   * タスク登録タブのプロジェクト指示ダイアログから登録された指示の送信時に呼び出す。
   * 粒度（全体/メソッド/トランジション/タスク）に応じて以下のJSON構造を生成する。
   *
   * - 全体指示（methodId=null）:
   *     eventLog > property[@key='SupervisorDirectiveTimestamp'] + property[@key=instructionKey] + ownerRef
   * - メソッド単位（methodId あり）:
   *     eventLog > log[@ref=methodId] > property × 2 + ownerRef
   * - トランジション単位（methodId + transitionId あり）:
   *     eventLog > log[@ref=methodId] > trace[@ref=programId] > event[@ref=instructionId] > property × 2 + ownerRef
   * - タスク単位（methodId + taskNo あり）:
   *     eventLog > log[@ref=methodId] > trace[@ref=programId, @taskno] > event > resultsRef + property × 2 + ownerRef
   *
   * ownerRef の @ref 値は userId の "@" を "_" に置換した値。
   *
   * @param organizationId - 組織ID
   * @param projectId - プロジェクトID
   * @param params - プロジェクト指示送信ログパラメータ
   * @param client - トランザクション用のPoolClient
   */
  async insertProjectInstructionSentLog(
    organizationId: string,
    projectId: string,
    params: ProjectInstructionSentLogParams,
    client: PoolClient
  ): Promise<void> {
    try {
      const sequenceQuery = await this.sequenceQueryPromise;
      const sequenceResult = await client.query(sequenceQuery, [organizationId, projectId]);
      const sequenceNo: number = sequenceResult.rows[0].next_sequence_no;

      const logJson = this.buildProjectInstructionSentLogJson(params, sequenceNo);

      const insertQuery = await this.insertQueryPromise;
      await client.query(insertQuery, [
        organizationId,
        projectId,
        sequenceNo,
        JSON.stringify(logJson),
        params.userId,
      ]);
    } catch (error) {
      throw new DatabaseError(
        'Database error occurred while inserting project instruction sent log',
        error as Error
      );
    }
  }

  /**
   * 前提トランジション未設定のトランジションに対する lifecycle:transition 遷移記録を挿入する
   *
   * @see .clinerules/references/eventlog_structure.md — セクション3
   *
   * 指示事項の有無によらず、前提トランジションID が設定されていないトランジションに対して
   * time:timestamp + lifecycle:transition のみを含む最小構成の event タグを生成して記録する。
   *
   * @param organizationId - 組織ID
   * @param projectId      - プロジェクトID
   * @param params         - 生成に必要なパラメータ
   * @param client         - トランザクション用の PoolClient
   */
  /**
   * 前提トランジション未設定のトランジションに対する lifecycle:transition 遷移記録を挿入する
   *
   * @see .clinerules/references/eventlog_structure.md — セクション3
   *
   * 指示事項の有無によらず、前提トランジションID が設定されていないトランジションに対して
   * time:timestamp + lifecycle:transition のみを含む最小構成の event タグを生成して記録する。
   *
   * @param organizationId  - 組織ID
   * @param projectId       - プロジェクトID
   * @param params          - 生成に必要なパラメータ
   * @param client          - トランザクション用の PoolClient
   * @param lifecycleValue  - lifecycle:transition の値（省略時: 'schedule'）
   * @param phaseIdentifier - フェーズ識別名（省略時: 'PreparationEvent'）
   *                          ID プレフィックス・name・description に使用する。
   *                          省略時は 'Preparation_schedule' フェーズ動作を維持。
   *                          強制終了時は 'ForceTerminateEvent' を指定し
   *                          phasePrefix（フェーズ名部分）は 'ForceTerminate_ate_abort' になる。
   */
  async insertLifecycleTransitionEventLog(
    organizationId: string,
    projectId: string,
    params: {
      methodId: string;
      programId: string | null;
      transitionId: string;
      userId: string;
      sentAt: string;
      projectName: string;
    },
    client: PoolClient,
    lifecycleValue: string = 'schedule',
    phaseIdentifier: string = 'PreparationEvent'
  ): Promise<void> {
    try {
      const sequenceQuery = await this.sequenceQueryPromise;
      const sequenceResult = await client.query(sequenceQuery, [organizationId, projectId]);
      const sequenceNo: number = sequenceResult.rows[0].next_sequence_no;

      const { methodId, programId, transitionId, sentAt, projectName } = params;

      // フェーズ名部分: 'PreparationEvent' → 'Preparation_schedule'、'ForceTerminateEvent' → 'ForceTerminate_ate_abort'
      const phaseNameMap: Record<string, string> = {
        PreparationEvent: 'Preparation_schedule',
        ForceTerminateEvent: 'ForceTerminate_ate_abort',
      };
      const phaseName = phaseNameMap[phaseIdentifier] ?? `${phaseIdentifier}_${lifecycleValue}`;

      const idPrefix = `${projectName}${phaseName}_${sequenceNo}`;
      const commonNameDesc = {
        name: `Alchemia:${phaseIdentifier}`,
        description: `${projectName} ${phaseIdentifier}(${lifecycleValue})`,
      };

      // 最小構成: time:timestamp + lifecycle:transition のみ
      const logJson = {
        eventLog: {
          '@id': 'eventLogID', // MAIML上1つのみ存在。buildEventLogXML が既存MAIMLの値で上書きするため固定値
          // name/description は eventLog タグには付与しない（MAIML上1つしか存在できないため特定処理に紐づけられない）
          log: {
            '@id': `log_${idPrefix}`,
            '@ref': methodId,
            ...commonNameDesc,
            trace: {
              '@id': `trace_${idPrefix}`,
              '@ref': programId ?? `trace_${idPrefix}`,
              ...commonNameDesc,
              event: {
                '@id': `event_${idPrefix}`,
                '@ref': transitionId,
                ...commonNameDesc,
                property: [
                  {
                    '@key': 'time:timestamp',
                    '@xsi:type': 'dateTimeType',
                    '#text': sentAt,
                  },
                  {
                    '@key': 'lifecycle:transition',
                    '@xsi:type': 'stringType',
                    '#text': lifecycleValue,
                  },
                ],
              },
            },
          },
        },
      };

      const insertQuery = await this.insertQueryPromise;
      await client.query(insertQuery, [
        organizationId,
        projectId,
        sequenceNo,
        JSON.stringify(logJson),
        params.userId,
      ]);
    } catch (error) {
      throw new DatabaseError(
        'Database error occurred while inserting lifecycle transition event log',
        error as Error
      );
    }
  }

  /**
   * プロジェクト指示送信用の eventLog JSON 構造を生成するヘルパー
   *
   * @see .clinerules/references/eventlog_structure.md — lifecycle:transition 系 eventLog 共通ルール
   *
   * ID 命名規則（Preparation_schedule フェーズ）:
   *   eventLog/@id = 既存 MAIML の値を維持（MAIML上1つのみ存在するため命名規則対象外）
   *   log/@id      = "log_{projectName}Preparation_schedule_{seq}"
   *   trace/@id    = "trace_{projectName}Preparation_schedule_{seq}"
   *   event/@id    = "event_{projectName}Preparation_schedule_{seq}"
   *   ownerRef/@id（issuer）  = "ownerRef_{projectName}Preparation_schedule_{seq}_issuer"
   *   ownerRef/@id（assignee）= "ownerRef_{projectName}Preparation_schedule_{seq}_assignee"
   *
   * 共通プロパティ（全粒度）:
   *   - property[@key='time:timestamp'] — 送信日時（XES標準キー）
   *   - property[@key=instructionKey]   — 指示種別キーと指示内容
   *   - ownerRef（issuer）  — 指示出しユーザーID（@→_置換）
   *   - ownerRef（assignee）— ExperimentPlanDialog 指定の作業予定者（0件時は省略）
   *
   * name / description（全タグ共通）:
   *   name        = "Alchemia:PreparationEvent"
   *   description = "{projectName} PreparationEvent(schedule)"
   *
   * 粒度別の構造:
   *   - 全体指示（methodId=null）:
   *       eventLog > property × 2 + ownerRef × 1〜2
   *   - メソッド単位（methodId のみ）:
   *       eventLog > log[@ref=methodId] > property × 2 + ownerRef × 1〜2
   *   - トランジション単位（methodId + transitionId）:
   *       eventLog > log > trace[@ref=programId] > event[@ref=instructionId]
   *                          > property × 2 + ownerRef × 1〜2
   *   - タスク単位（methodId + taskNo、transitionId なし）:
   *       eventLog > log > trace[@ref=programId, @taskno]
   *                          > property × 3 + ownerRef × 1〜2
   *       ※ property の3件目は Alchemia:SupervisorDirectiveTaskNo（intType）
   *       ※ event タグは使用しない
   *   - トランジション+タスク単位（methodId + transitionId + taskNo、最優先）:
   *       eventLog > log > trace[@ref=programId] > event[@ref=instructionId]
   *                          > property × 3 + lifecycle:transition + ownerRef × 1〜2
   *                          + creatorRef[] + instrumentRef[]
   */
  private buildProjectInstructionSentLogJson(
    params: ProjectInstructionSentLogParams,
    sequenceNo: number
  ): Record<string, unknown> {
    const {
      methodId,
      transitionId,
      programId,
      taskNo,
      experimentInstructionId,
      userId,
      sentAt,
      instructions,
      instructionKey,
      projectName,
      assigneeOwnerRefs,
      creatorRefs,
      instrumentRefs,
    } = params;

    // ── ID プレフィックス（共通ルール: eventlog_structure.md 2-1）──────────
    const idPrefix = `${projectName}Preparation_schedule_${sequenceNo}`;

    // ── name / description（共通ルール: eventlog_structure.md 2-2）──────────
    const commonNameDesc = {
      name: 'Alchemia:PreparationEvent',
      description: `${projectName} PreparationEvent(schedule)`,
    };

    // ── ownerRef 構築（共通ルール: eventlog_structure.md 2-5）───────────────
    // issuer: 指示出しユーザー（@→_置換）
    const issuerOwnerRef = {
      '@id': `ownerRef_${idPrefix}_issuer`,
      '@ref': userId.replace('@', '_'),
    };
    // assignee: ExperimentPlanDialog で指定した作業予定者（0件時は省略）
    const assigneeList = (assigneeOwnerRefs ?? []).filter(Boolean);
    const buildOwnerRefs = (): unknown => {
      if (assigneeList.length === 0) {
        return issuerOwnerRef;
      }
      const assigneeRefs = assigneeList.map((ref, idx) => ({
        '@id': assigneeList.length === 1
          ? `ownerRef_${idPrefix}_assignee`
          : `ownerRef_${idPrefix}_assignee_${idx + 1}`,
        '@ref': ref,
      }));
      return [issuerOwnerRef, ...assigneeRefs];
    };
    const ownerRefValue = buildOwnerRefs();

    // ── 共通 property 配列（共通ルール: eventlog_structure.md 2-3）──────────
    // time:timestamp（XES標準キー）+ 指示種別キー
    const baseProperties: Record<string, unknown>[] = [
      {
        '@key': 'time:timestamp',
        '@xsi:type': 'dateTimeType',
        '#text': sentAt,
      },
      {
        '@key': instructionKey,
        '@xsi:type': 'stringType',
        '#text': instructions ?? '',
      },
    ];

    if (!methodId) {
      // 全体指示: eventLog 直下に property + ownerRef
      return {
        eventLog: {
          '@id': 'eventLogID', // MAIML上1つのみ存在。buildEventLogXML が既存MAIMLの値で上書きするため固定値
          // name/description は eventLog タグには付与しない（MAIML上1つしか存在できないため特定処理に紐づけられない）
          property: baseProperties,
          ownerRef: ownerRefValue,
        },
      };
    } else if (transitionId && taskNo != null) {
      // トランジション+タスク単位（最優先）:
      //   log > trace[@ref=programId] > event[@ref=instructionId]
      //     > property × 3 + lifecycle:transition + ownerRef + creatorRef[] + instrumentRef[]
      const propertiesWithTaskNoAndLifecycle = [
        ...baseProperties,
        {
          '@key': 'Alchemia:SupervisorDirectiveTaskNo',
          '@xsi:type': 'intType',
          '#text': taskNo,
        },
        // lifecycle:transition（共通ルール: eventlog_structure.md 2-4）
        {
          '@key': 'lifecycle:transition',
          '@xsi:type': 'stringType',
          '#text': 'schedule',
        },
      ];

      const eventObj: Record<string, unknown> = {
        '@id': `event_${idPrefix}`,
        '@ref': experimentInstructionId,
        ...commonNameDesc,
        property: propertiesWithTaskNoAndLifecycle,
        ownerRef: ownerRefValue,
      };

      // creatorRef タグ（0件の場合は省略）
      const creatorRefList = (creatorRefs ?? []).filter(Boolean);
      if (creatorRefList.length === 1) {
        eventObj.creatorRef = { '@ref': creatorRefList[0] };
      } else if (creatorRefList.length > 1) {
        eventObj.creatorRef = creatorRefList.map((ref) => ({ '@ref': ref }));
      }

      // instrumentRef タグ（0件の場合は省略）
      const instrumentRefList = (instrumentRefs ?? []).filter(Boolean);
      if (instrumentRefList.length === 1) {
        eventObj.instrumentRef = { '@ref': instrumentRefList[0] };
      } else if (instrumentRefList.length > 1) {
        eventObj.instrumentRef = instrumentRefList.map((ref) => ({ '@ref': ref }));
      }

      return {
        eventLog: {
          '@id': 'eventLogID', // MAIML上1つのみ存在。buildEventLogXML が既存MAIMLの値で上書きするため固定値
          // name/description は eventLog タグには付与しない（MAIML上1つしか存在できないため特定処理に紐づけられない）
          log: {
            '@id': `log_${idPrefix}`,
            '@ref': methodId,
            ...commonNameDesc,
            trace: {
              '@id': `trace_${idPrefix}`,
              '@ref': programId ?? `trace_${idPrefix}`,
              ...commonNameDesc,
              event: eventObj,
            },
          },
        },
      };
    } else if (taskNo != null) {
      // タスク単位（transitionId なし）:
      //   log > trace[@ref=programId, @taskno] > property × 3 + ownerRef
      //   ※ event タグは使用しない
      const propertiesWithTaskNo = [
        ...baseProperties,
        {
          '@key': 'Alchemia:SupervisorDirectiveTaskNo',
          '@xsi:type': 'intType',
          '#text': taskNo,
        },
      ];
      return {
        eventLog: {
          '@id': 'eventLogID', // MAIML上1つのみ存在。buildEventLogXML が既存MAIMLの値で上書きするため固定値
          // name/description は eventLog タグには付与しない（MAIML上1つしか存在できないため特定処理に紐づけられない）
          log: {
            '@id': `log_${idPrefix}`,
            '@ref': methodId,
            ...commonNameDesc,
            trace: {
              '@id': `trace_${idPrefix}`,
              '@ref': programId ?? `trace_${idPrefix}`,
              '@taskno': String(taskNo),
              ...commonNameDesc,
              property: propertiesWithTaskNo,
              ownerRef: ownerRefValue,
            },
          },
        },
      };
    } else if (transitionId) {
      // トランジション単位: log > trace[@ref=programId] > event[@ref=instructionId] > property + ownerRef
      return {
        eventLog: {
          '@id': 'eventLogID', // MAIML上1つのみ存在。buildEventLogXML が既存MAIMLの値で上書きするため固定値
          // name/description は eventLog タグには付与しない（MAIML上1つしか存在できないため特定処理に紐づけられない）
          log: {
            '@id': `log_${idPrefix}`,
            '@ref': methodId,
            ...commonNameDesc,
            trace: {
              '@id': `trace_${idPrefix}`,
              '@ref': programId ?? `trace_${idPrefix}`,
              ...commonNameDesc,
              event: {
                '@id': `event_${idPrefix}`,
                '@ref': experimentInstructionId,
                ...commonNameDesc,
                property: baseProperties,
                ownerRef: ownerRefValue,
              },
            },
          },
        },
      };
    } else {
      // メソッド単位: log[@ref=methodId] > property + ownerRef
      return {
        eventLog: {
          '@id': 'eventLogID', // MAIML上1つのみ存在。buildEventLogXML が既存MAIMLの値で上書きするため固定値
          // name/description は eventLog タグには付与しない（MAIML上1つしか存在できないため特定処理に紐づけられない）
          log: {
            '@id': `log_${idPrefix}`,
            '@ref': methodId,
            ...commonNameDesc,
            property: baseProperties,
            ownerRef: ownerRefValue,
          },
        },
      };
    }
  }

  /**
   * タスクレビュー（承認/NG）イベントログを記録
   *
   * JSON構造: log[@ref=methodId] > trace[@taskno=taskNo] > event > property + ownerRef
   * ID命名: log_{projectName}Task_review_{seq} / trace_* / event_* / ownerRef_*_issuer
   *
   * @param organizationId - 組織ID  @param projectId - プロジェクトID
   * @param methodId - メソッドID    @param taskNo - タスク連番
   * @param reviewType - レビュー種別（`ReviewTypeEnum.APPROVED` or `ReviewTypeEnum.NG`）
   * @param ngReason - NG理由（NG時のみ、承認時は null）
   * @param reviewUserId - レビュアーユーザID
   * @param projectName - プロジェクト名（ID命名規則に使用）
   * @param client - トランザクション用のPoolClient
   */
  async insertTaskReviewLog(
    organizationId: string,
    projectId: string,
    methodId: string,
    taskNo: number,
    reviewType: string,
    ngReason: string | null,
    reviewUserId: string,
    projectName: string,
    client: PoolClient
  ): Promise<void> {
    try {
      const sequenceQuery = await this.sequenceQueryPromise;
      const sequenceResult = await client.query(sequenceQuery, [organizationId, projectId]);
      const seq: number = sequenceResult.rows[0].next_sequence_no;

      const nowIso = new Date().toISOString();
      const idPrefix = `${projectName}Task_review_${seq}`;

      const properties: Record<string, unknown>[] = [
        { '@key': 'time:timestamp', '@xsi:type': 'dateTimeType', '#text': nowIso },
        { '@key': 'Alchemia:reviewResult', '@xsi:type': 'stringType', '#text': reviewType },
      ];
      if (reviewType === 'ng' && ngReason) {
        properties.push({ '@key': 'Alchemia:ngReason', '@xsi:type': 'stringType', '#text': ngReason });
      }

      const logJson = {
        eventLog: {
          '@id': 'eventLogID',
          log: {
            '@id': `log_${idPrefix}`,
            '@ref': methodId,
            trace: {
              '@id': `trace_${idPrefix}`,
              '@ref': methodId,
              '@taskno': String(taskNo),
              event: {
                '@id': `event_${idPrefix}`,
                '@ref': methodId,
                property: properties,
                ownerRef: { '@id': `ownerRef_${idPrefix}_issuer`, '@ref': reviewUserId.replace(/@/g, '_') },
              },
            },
          },
        },
      };

      const insertQuery = await this.insertQueryPromise;
      await client.query(insertQuery, [organizationId, projectId, seq, JSON.stringify(logJson), reviewUserId]);
    } catch (error) {
      throw new DatabaseError('Database error occurred while inserting task review log', error as Error);
    }
  }

  /**
   * 記録値訂正イベントログを記録
   *
   * JSON構造: log[@ref=methodId] > trace[@taskno=taskNo] > event[] > property + ownerRef
   * ID命名: log_{projectName}Record_correction_{seq} / event_{idPrefix}_{n}（n: 1始まり）
   *
   * @param organizationId    - 組織ID  @param projectId - プロジェクトID
   * @param methodId          - メソッドID  @param taskNo - タスク連番
   * @param corrections       - 訂正内容一覧 [{instanceUuid, propKey, beforeValue, afterValue}]
   * @param correctedByUserId - 訂正者ユーザID
   * @param projectName       - プロジェクト名（ID命名規則に使用）
   * @param client            - トランザクション用のPoolClient
   */
  async insertRecordCorrectionLog(
    organizationId: string,
    projectId: string,
    methodId: string,
    taskNo: number,
    corrections: Array<{
      instanceUuid: string;
      propKey: string;
      beforeValue: unknown;
      afterValue: unknown;
    }>,
    correctedByUserId: string,
    projectName: string,
    client: PoolClient
  ): Promise<void> {
    try {
      const sequenceQuery = await this.sequenceQueryPromise;
      const sequenceResult = await client.query(sequenceQuery, [organizationId, projectId]);
      const seq: number = sequenceResult.rows[0].next_sequence_no;

      const nowIso = new Date().toISOString();
      const idPrefix = `${projectName}Record_correction_${seq}`;
      const ownerRef = { '@id': `ownerRef_${idPrefix}_issuer`, '@ref': correctedByUserId.replace(/@/g, '_') };

      const events = corrections.map((correction, index) => ({
        '@id': `event_${idPrefix}_${index + 1}`,
        '@ref': methodId,
        property: [
          { '@key': 'time:timestamp', '@xsi:type': 'dateTimeType', '#text': nowIso },
          { '@key': 'Alchemia:correctionInstanceUuid', '@xsi:type': 'stringType', '#text': correction.instanceUuid },
          { '@key': 'Alchemia:correctionPropKey', '@xsi:type': 'stringType', '#text': correction.propKey },
          { '@key': 'Alchemia:correctionBeforeValue', '@xsi:type': 'stringType', '#text': String(correction.beforeValue ?? '') },
          { '@key': 'Alchemia:correctionAfterValue', '@xsi:type': 'stringType', '#text': String(correction.afterValue ?? '') },
        ],
        ownerRef,
      }));

      const logJson = {
        eventLog: {
          '@id': 'eventLogID',
          log: {
            '@id': `log_${idPrefix}`,
            '@ref': methodId,
            trace: {
              '@id': `trace_${idPrefix}`,
              '@ref': methodId,
              '@taskno': String(taskNo),
              event: events.length === 1 ? events[0] : events,
            },
          },
        },
      };

      const insertQuery = await this.insertQueryPromise;
      await client.query(insertQuery, [organizationId, projectId, seq, JSON.stringify(logJson), correctedByUserId]);
    } catch (error) {
      throw new DatabaseError('Database error occurred while inserting record correction log', error as Error);
    }
  }

  /**
   * プロジェクトの maiml_event_log 全件取得
   *
   * sequence_no 昇順で返す（eventLog 内のログ順序を保持するため）。
   *
   * @param organizationId - 組織ID（マルチテナント分離）
   * @param projectId      - プロジェクトID
   * @returns EventLogRow 配列（sequence_no 昇順）
   * @throws {DatabaseError} データベースエラーが発生した場合
   */
  async findAllByProject(
    organizationId: string,
    projectId: string
  ): Promise<EventLogRow[]> {
    try {
      const sql = await loadSqlFile('event_log/findAllByProject.sql');
      const pgp = getPgp();
      return pgp.any<EventLogRow>(sql, [organizationId, projectId]);
    } catch (error) {
      throw new DatabaseError(
        'Database error occurred while fetching event logs',
        error as Error
      );
    }
  }
}

