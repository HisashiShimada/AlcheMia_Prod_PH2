/**
 * EventLogRepository
 * 
 * maiml_event_logテーブルへのデータアクセスを担当するリポジトリ
 * イベントログの記録操作を提供します。
 */

import { PoolClient } from 'pg';
import { TransitionStatus } from '../types/transitionData';
import { loadSqlFile } from '../sql/loader';

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
   * プロジェクト指示送信用の eventLog JSON 構造を生成するヘルパー
   *
   * 共通プロパティ（全粒度）:
   *   - property[@key='SupervisorDirectiveTimestamp'] — 送信日時
   *   - property[@key=instructionKey] — 指示種別キーと指示内容
   *   - ownerRef[@ref=userId(@→_)] — 指示出しユーザーID（@を_に置換）
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
    } = params;

    // ownerRef の @ref 値: userId の "@" を "_" に置換
    const ownerRefObj = { '@ref': userId.replace('@', '_') };

    // 共通 property 配列（送信日時 + 指示種別キー）
    const properties: Record<string, unknown>[] = [
      {
        '@key': 'SupervisorDirectiveTimestamp',
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
          '@id': `eventLog_${sequenceNo}`,
          property: properties,
          ownerRef: ownerRefObj,
        },
      };
    } else if (taskNo != null) {
      // タスク単位: log > trace[@ref=programId, @taskno] > event > resultsRef + property + ownerRef
      const resultsId = `results_${sequenceNo}`;
      return {
        eventLog: {
          '@id': `eventLog_${sequenceNo}`,
          log: {
            '@id': `log_${sequenceNo}`,
            '@ref': methodId,
            trace: {
              '@id': `trace_${sequenceNo}`,
              '@ref': programId ?? `trace_${sequenceNo}`,
              '@taskno': String(taskNo),
              event: {
                '@id': `event_${sequenceNo}`,
                '@ref': experimentInstructionId,
                resultsRef: { '@ref': resultsId },
                property: properties,
                ownerRef: ownerRefObj,
              },
            },
          },
        },
      };
    } else if (transitionId) {
      // トランジション単位: log > trace[@ref=programId] > event[@ref=instructionId] > property + ownerRef
      return {
        eventLog: {
          '@id': `eventLog_${sequenceNo}`,
          log: {
            '@id': `log_${sequenceNo}`,
            '@ref': methodId,
            trace: {
              '@id': `trace_${sequenceNo}`,
              '@ref': programId ?? `trace_${sequenceNo}`,
              event: {
                '@id': `event_${sequenceNo}`,
                '@ref': experimentInstructionId,
                property: properties,
                ownerRef: ownerRefObj,
              },
            },
          },
        },
      };
    } else {
      // メソッド単位: log[@ref=methodId] > property + ownerRef
      return {
        eventLog: {
          '@id': `eventLog_${sequenceNo}`,
          log: {
            '@id': `log_${sequenceNo}`,
            '@ref': methodId,
            property: properties,
            ownerRef: ownerRefObj,
          },
        },
      };
    }
  }
}
