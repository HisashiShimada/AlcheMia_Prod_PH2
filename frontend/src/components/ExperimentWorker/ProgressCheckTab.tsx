'use client';

import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { Card, Space, Button, Typography, Tabs, theme, Badge, App } from 'antd';
import { RightOutlined, CheckSquareOutlined } from '@ant-design/icons';
import type { BadgeProps } from 'antd';
import ProgressCheckTable from './ProgressCheckTable';
import IssueReportModal from './IssueReportModal';
import IssueManagementModal from './IssueManagementModal';
import { getWorkerTasks, updateTaskStatus } from '@/services/projectApiService';
import type { WorkerTasksResponse, WorkerMethod, WorkerTask } from '@/services/projectApiService';
import { AxiosError } from 'axios';
import type { Task, Method, ProjectStatus, Issue, IssueStatus } from '@/types/experimentWorker';

const { Title, Text } = Typography;

/**
 * 空状態アイコンのサイズ（UIポリシー準拠）
 */
const EMPTY_ICON_SIZE = 48;

interface ProgressCheckTabProps {
selectedProject: string | null;
  selectedProjectName: string;
  onProjectChange: (projectId: string) => void;
  selectedMethodId: string | null;
  onSelectMethod: (methodId: string) => void;
  onTabChange?: (tabKey: string) => void;
  onSelectTaskAndTab?: (taskId: string, tabKey: string) => void;
  /** trueのとき強制終了ボタンを無効化（オーバーレイ閲覧モード用） */
  readOnly?: boolean;
}

/**
 * 進捗確認タブ - メインコンテナ
 * プロジェクト選択に連動してサブタスク一覧を表示
 */
export default function ProgressCheckTab({
  selectedProject,
  selectedProjectName,
  onProjectChange,
  selectedMethodId,
  onSelectMethod,
  onTabChange,
  onSelectTaskAndTab,
  readOnly = false,
}: ProgressCheckTabProps) {
  // テーマトークンを取得（UIポリシー準拠）
  const { token } = theme.useToken();
  
  // Ant Design App コンテキストからmessageを取得
  const { message } = App.useApp();
  
  // API連携の状態管理
  const [loading, setLoading] = useState<boolean>(false);
  const [methods, setMethods] = useState<Method[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  
  // プロジェクトの状態を取得（暫定: APIから取得できるまでnull）
  const projectStatus: ProjectStatus | null = null;
  
  // プロジェクト選択時にAPI呼び出し
  useEffect(() => {
    const fetchWorkerTasks = async () => {
      if (!selectedProject || !selectedProjectName) {
        setMethods([]);
        setTasks([]);
        setProjectId(null);
        return;
      }

      setLoading(true);
      try {
        console.log('[DEBUG] ProgressCheckTab - Fetching worker tasks', { selectedProject, selectedProjectName });
        
        const result = await getWorkerTasks(selectedProjectName);
        
        if (result.success && result.data) {
          const apiData = result.data;
          
          console.log('[DEBUG] ProgressCheckTab - API response', {
            project_id: apiData.project_id,
            methodCount: apiData.methods.length
          });
          
          // プロジェクトIDを保存
          setProjectId(apiData.project_id);
          
          // メソッド一覧を変換（UI用の型に必須プロパティを補完）
          const methodsData: Method[] = apiData.methods.map((method: WorkerMethod) => ({
            methodId: method.method_id,
            methodName: method.method_name,
            experimentOrder: method.experiment_order,
            description: '', // APIには存在しないためデフォルト値
            category: 'experiment', // APIには存在しないためデフォルト値
            transitions: [], // APIには存在しないためデフォルト値
          }));
          
          // 全タスクを変換（UI用の型に必須プロパティを補完）
          const allTasks: Task[] = apiData.methods.flatMap((method: WorkerMethod) =>
            method.tasks.map((task: WorkerTask) => {
              console.log('[DEBUG] Converting task from API', {
                task_no: task.task_no,
                created_at: task.created_at,
                updated_at: task.updated_at,
                updated_at_type: typeof task.updated_at,
                full_api_task: task
              });
              
              return {
                taskId: `${apiData.project_id}-${method.method_id}-${task.task_no}`,
                taskNo: task.task_no.toString(), // string型に変換
                taskName: task.task_no.toString(), // task_nameカラム削除のため、task_noを代用
                methodId: method.method_id,
                methodName: method.method_name, // メソッド名を追加
                status: task.task_status as Task['status'],
                assignedUserId: task.experiment_user_id,
                assignedUserName: task.experiment_user_name,
                createdAt: task.created_at,
                updatedAt: task.updated_at,
                projectId: apiData.project_id,
                sampleNumber: '', // APIには存在しないためデフォルト値（string型）
                notes: '', // APIには存在しないためデフォルト値
                progressRate: parseFloat(task.progress_rate) || 0, // APIのprogress_rateを数値変換
                transitionStatuses: [], // APIには存在しないためデフォルト値
                progressReport: '', // APIには存在しないためデフォルト値
                recordNumber: '', // APIには存在しないためデフォルト値（string型）
              };
            })
          );
          
          console.log('[DEBUG] ProgressCheckTab - Converted data', {
            methodCount: methodsData.length,
            taskCount: allTasks.length
          });
          
          setMethods(methodsData);
          setTasks(allTasks);
          
          // API取得完了後、最初のメソッドを自動選択
          if (methodsData.length > 0) {
            const sortedMethods = [...methodsData].sort((a, b) => a.experimentOrder - b.experimentOrder);
            console.log('[DEBUG] ProgressCheckTab - Auto-selecting after API fetch', {
              methodId: sortedMethods[0].methodId,
              methodName: sortedMethods[0].methodName
            });
            onSelectMethod(sortedMethods[0].methodId);
          }
          
          message.success('タスク一覧を取得しました');
        } else {
          console.error('[DEBUG] ProgressCheckTab - API returned unsuccessful', result);
          message.error('タスク一覧の取得に失敗しました');
          setMethods([]);
          setTasks([]);
        }
      } catch (error) {
        console.error('[DEBUG] ProgressCheckTab - Error fetching tasks', error);
        message.error('タスク一覧の取得中にエラーが発生しました');
        setMethods([]);
        setTasks([]);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkerTasks();
  }, [selectedProject, selectedProjectName]);
  
  // 前回のプロジェクトIDを保持（プロジェクト変更検知用）
  const prevProjectRef = useRef<string | null>(null);
  const [needsAutoSelect, setNeedsAutoSelect] = useState<boolean>(false);
  
  // プロジェクト変更を検知
  useEffect(() => {
    if (selectedProject !== prevProjectRef.current) {
      console.log('[DEBUG] ProgressCheckTab - Project changed detected', {
        from: prevProjectRef.current,
        to: selectedProject
      });
      prevProjectRef.current = selectedProject;
      setNeedsAutoSelect(true); // 自動選択フラグをセット
    }
  }, [selectedProject]);
  
  // メソッドが更新されたら自動選択
  useEffect(() => {
    console.log('[DEBUG] ProgressCheckTab - Auto-select effect', {
      methodsCount: methods.length,
      selectedMethodId,
      needsAutoSelect
    });
    
    // プロジェクト変更後の自動選択（needsAutoSelectフラグで判定、selectedMethodIdは無視）
    if (methods.length > 0 && needsAutoSelect) {
      const sortedMethods = [...methods].sort((a, b) => a.experimentOrder - b.experimentOrder);
      console.log('[DEBUG] ProgressCheckTab - Auto-selecting first method (after project change)', {
        methodId: sortedMethods[0].methodId,
        methodName: sortedMethods[0].methodName
      });
      onSelectMethod(sortedMethods[0].methodId);
      setNeedsAutoSelect(false); // フラグをクリア
    } else if (methods.length > 0 && !selectedMethodId && !needsAutoSelect) {
      // 通常の自動選択ロジック（初回表示時など）
      const sortedMethods = [...methods].sort((a, b) => a.experimentOrder - b.experimentOrder);
      console.log('[DEBUG] ProgressCheckTab - Auto-selecting first method (normal)', {
        methodId: sortedMethods[0].methodId,
        methodName: sortedMethods[0].methodName
      });
      onSelectMethod(sortedMethods[0].methodId);
    }
  }, [methods, needsAutoSelect, selectedMethodId, onSelectMethod]);
  
  // 問題報告モーダルの状態管理
  const [issueReportModalVisible, setIssueReportModalVisible] = useState<boolean>(false);
  const [selectedTaskForIssue, setSelectedTaskForIssue] = useState<Task | null>(null);
  
  // 問題確認モーダルの状態管理
  const [issueCheckModalVisible, setIssueCheckModalVisible] = useState<boolean>(false);
  const [selectedTaskForIssueCheck, setSelectedTaskForIssueCheck] = useState<Task | null>(null);

  // 問題報告モーダルを開く
  const handleOpenIssueReport = useCallback((task: Task) => {
    setSelectedTaskForIssue(task);
    setIssueReportModalVisible(true);
  }, []);

  // 問題報告モーダルを閉じる
  const handleCloseIssueReport = useCallback(() => {
    setIssueReportModalVisible(false);
    setSelectedTaskForIssue(null);
  }, []);

  // 問題確認モーダルを開く（参照専用）
  const handleOpenIssueCheck = useCallback((task: Task) => {
    setSelectedTaskForIssueCheck(task);
    setIssueCheckModalVisible(true);
  }, []);

  // 問題確認モーダルを閉じる
  const handleCloseIssueCheck = useCallback(() => {
    setIssueCheckModalVisible(false);
    setSelectedTaskForIssueCheck(null);
  }, []);


  // タスクアクション処理
  const handleTaskAction = useCallback(async (taskId: string, action: string) => {
    if (!selectedProject) {
      message.warning('プロジェクトを選択してください');
      return;
    }

    // タスクからmethodIdを取得
    const task = tasks.find(t => t.taskId === taskId);
    if (!task || !task.methodId) {
      message.error('タスク情報が見つかりません');
      return;
    }

    try {
      switch (action) {
        case 'start':
          // タスク開始処理
          try {
            console.log('[DEBUG] handleTaskAction - Start task', {
              taskId,
              taskNo: task.taskNo,
              methodId: task.methodId,
              projectName: selectedProjectName,
              taskUpdatedAt: task.updatedAt,
              taskUpdatedAtType: typeof task.updatedAt,
              fullTask: task
            });
            
            // task.updatedAtの検証
            if (!task.updatedAt) {
              console.error('[DEBUG] handleTaskAction - task.updatedAt is missing!', { task });
              message.error('タスクの更新日時が取得できません。画面を再読み込みしてください。');
              return;
            }
            
            // タスクステータスを'in_progress'に更新
            // 楽観的ロック用に現在のupdatedAtを送信
            const result = await updateTaskStatus(
              selectedProjectName,
              task.methodId,
              task.taskNo,
              'in_progress',
              undefined,      // comment（オプショナル）
              task.updatedAt  // currentUpdatedAt（楽観的ロック用・必須）
            );
            
            if (result.success && result.data) {
              console.log('[DEBUG] handleTaskAction - Task status updated successfully', {
                taskNo: result.data.task_no,
                previousStatus: result.data.previous_status,
                newStatus: result.data.new_status
              });
              
              message.success('タスクを開始しました');
              
              // タスク一覧を再取得して最新の状態を反映
              const tasksResult = await getWorkerTasks(selectedProjectName);
              if (tasksResult.success && tasksResult.data) {
                const apiData = tasksResult.data;
                
                // メソッド一覧を変換
                const methodsData: Method[] = apiData.methods.map((method: WorkerMethod) => ({
                  methodId: method.method_id,
                  methodName: method.method_name,
                  experimentOrder: method.experiment_order,
                  description: '',
                  category: 'experiment',
                  transitions: [],
                }));
                
                // 全タスクを変換
                const allTasks: Task[] = apiData.methods.flatMap((method: WorkerMethod) =>
                  method.tasks.map((apiTask: WorkerTask) => ({
                    taskId: `${apiData.project_id}-${method.method_id}-${apiTask.task_no}`,
                    taskNo: apiTask.task_no.toString(),
                    taskName: apiTask.task_no.toString(),
                    methodId: method.method_id,
                    methodName: method.method_name,
                    status: apiTask.task_status as Task['status'],
                    assignedUserId: apiTask.experiment_user_id,
                    assignedUserName: apiTask.experiment_user_name,
                    createdAt: apiTask.created_at,
                    updatedAt: apiTask.updated_at,
                    projectId: apiData.project_id,
                    sampleNumber: '',
                    notes: '',
                    progressRate: parseFloat(apiTask.progress_rate) || 0,
                    transitionStatuses: [],
                    progressReport: '',
                    recordNumber: '',
                  }))
                );
                
                setMethods(methodsData);
                setTasks(allTasks);
                
                console.log('[DEBUG] handleTaskAction - Tasks refreshed', {
                  methodCount: methodsData.length,
                  taskCount: allTasks.length
                });
              }
            } else {
              console.error('[DEBUG] handleTaskAction - Update failed', result);
              message.error('タスクの開始に失敗しました');
            }
          } catch (error) {
            console.error('[DEBUG] handleTaskAction - Error starting task', {
              error,
              errorMessage: error instanceof Error ? error.message : 'Unknown error',
              errorResponse: (error as AxiosError)?.response?.data,
              errorStatus: (error as AxiosError)?.response?.status
            });
            
            // エラーメッセージの詳細表示
            if ((error as AxiosError)?.response?.status === 403) {
              message.error('このタスクを開始する権限がありません');
            } else if ((error as AxiosError)?.response?.status === 409) {
              // 楽観的ロック競合エラー: 他のユーザーが先に更新した可能性
              message.error('このタスクは他のユーザーによって更新されました。最新の情報を取得しています...');
              
              // タスク一覧を再取得して最新の状態を反映
              try {
                const tasksResult = await getWorkerTasks(selectedProjectName);
                if (tasksResult.success && tasksResult.data) {
                  const apiData = tasksResult.data;
                  
                  // メソッド一覧を変換
                  const methodsData: Method[] = apiData.methods.map((method: WorkerMethod) => ({
                    methodId: method.method_id,
                    methodName: method.method_name,
                    experimentOrder: method.experiment_order,
                    description: '',
                    category: 'experiment',
                    transitions: [],
                  }));
                  
                  // 全タスクを変換
                  const allTasks: Task[] = apiData.methods.flatMap((method: WorkerMethod) =>
                    method.tasks.map((apiTask: WorkerTask) => ({
                      taskId: `${apiData.project_id}-${method.method_id}-${apiTask.task_no}`,
                      taskNo: apiTask.task_no.toString(),
                      taskName: apiTask.task_no.toString(),
                      methodId: method.method_id,
                      methodName: method.method_name,
                      status: apiTask.task_status as Task['status'],
                      assignedUserId: apiTask.experiment_user_id,
                      assignedUserName: apiTask.experiment_user_name,
                      createdAt: apiTask.created_at,
                      updatedAt: apiTask.updated_at,
                      projectId: apiData.project_id,
                      sampleNumber: '',
                      notes: '',
                      progressRate: parseFloat(apiTask.progress_rate) || 0,
                      transitionStatuses: [],
                      progressReport: '',
                      recordNumber: '',
                    }))
                  );
                  
                  setMethods(methodsData);
                  setTasks(allTasks);
                  
                  console.log('[DEBUG] handleTaskAction - Tasks refreshed after 409 conflict', {
                    methodCount: methodsData.length,
                    taskCount: allTasks.length
                  });
                }
              } catch (refreshError) {
                console.error('[DEBUG] handleTaskAction - Failed to refresh tasks after 409', refreshError);
                message.warning('最新の情報取得に失敗しました。画面を再読み込みしてください。');
              }
            } else if ((error as AxiosError)?.response?.status === 404) {
              message.error('タスクが見つかりません');
            } else {
              message.error('タスクの開始中にエラーが発生しました');
            }
          }
          break;

        case 'instruction':
          // 指示確認タブへ遷移（メソッドとタスクを選択状態にする）
          if (onSelectTaskAndTab) {
            onSelectTaskAndTab(taskId, '2'); // 指示確認タブ
            message.info('指示確認タブに移動します');
          } else {
            // フォールバック: メソッドのみ選択
            if (task.methodId && onSelectMethod) {
              onSelectMethod(task.methodId);
            }
            if (onTabChange) {
              onTabChange('2'); // 指示確認タブ
              message.info('指示確認タブに移動します');
            }
          }
          break;

        case 'record':
          // 実験記録タブへ遷移（タスクを選択状態にする）
          if (onSelectTaskAndTab) {
            onSelectTaskAndTab(taskId, '3'); // 実験記録タブ
            message.info('実験記録タブに移動します');
          } else if (onTabChange) {
            onTabChange('3'); // フォールバック
            message.info('実験記録タブに移動します');
          }
          break;

        case 'issue':
          // 問題報告モーダルを開く
          handleOpenIssueReport(task);
          break;
        
        case 'issueCheck':
          // 問題確認モーダルを開く（参照専用）
          handleOpenIssueCheck(task);
          break;

        case 'forceTerminate':
          // 強制終了処理
          try {
            console.log('[DEBUG] handleTaskAction - Force terminate task', {
              taskId,
              taskNo: task.taskNo,
              methodId: task.methodId,
              projectName: selectedProjectName,
              taskUpdatedAt: task.updatedAt,
              taskUpdatedAtType: typeof task.updatedAt,
              fullTask: task
            });
            
            // task.updatedAtの検証
            if (!task.updatedAt) {
              console.error('[DEBUG] handleTaskAction - task.updatedAt is missing!', { task });
              message.error('タスクの更新日時が取得できません。画面を再読み込みしてください。');
              return;
            }
            
            // タスクステータスを'forced_terminated'に更新
            // 楽観的ロック用に現在のupdatedAtを送信
            const result = await updateTaskStatus(
              selectedProjectName,
              task.methodId,
              task.taskNo,
              'forced_terminated',
              undefined,      // comment（オプショナル）
              task.updatedAt  // currentUpdatedAt（楽観的ロック用・必須）
            );
            
            if (result.success && result.data) {
              console.log('[DEBUG] handleTaskAction - Task force terminated successfully', {
                taskNo: result.data.task_no,
                previousStatus: result.data.previous_status,
                newStatus: result.data.new_status
              });
              
              message.success('タスクを強制終了しました');
              
              // タスク一覧を再取得して最新の状態を反映
              const tasksResult = await getWorkerTasks(selectedProjectName);
              if (tasksResult.success && tasksResult.data) {
                const apiData = tasksResult.data;
                
                // メソッド一覧を変換
                const methodsData: Method[] = apiData.methods.map((method: WorkerMethod) => ({
                  methodId: method.method_id,
                  methodName: method.method_name,
                  experimentOrder: method.experiment_order,
                  description: '',
                  category: 'experiment',
                  transitions: [],
                }));
                
                // 全タスクを変換
                const allTasks: Task[] = apiData.methods.flatMap((method: WorkerMethod) =>
                  method.tasks.map((apiTask: WorkerTask) => ({
                    taskId: `${apiData.project_id}-${method.method_id}-${apiTask.task_no}`,
                    taskNo: apiTask.task_no.toString(),
                    taskName: apiTask.task_no.toString(),
                    methodId: method.method_id,
                    methodName: method.method_name,
                    status: apiTask.task_status as Task['status'],
                    assignedUserId: apiTask.experiment_user_id,
                    assignedUserName: apiTask.experiment_user_name,
                    createdAt: apiTask.created_at,
                    updatedAt: apiTask.updated_at,
                    projectId: apiData.project_id,
                    sampleNumber: '',
                    notes: '',
                    progressRate: parseFloat(apiTask.progress_rate) || 0,
                    transitionStatuses: [],
                    progressReport: '',
                    recordNumber: '',
                  }))
                );
                
                setMethods(methodsData);
                setTasks(allTasks);
                
                console.log('[DEBUG] handleTaskAction - Tasks refreshed', {
                  methodCount: methodsData.length,
                  taskCount: allTasks.length
                });
              }
            } else {
              console.error('[DEBUG] handleTaskAction - Force terminate failed', result);
              message.error('タスクの強制終了に失敗しました');
            }
          } catch (error) {
            console.error('[DEBUG] handleTaskAction - Error force terminating task', {
              error,
              errorMessage: error instanceof Error ? error.message : 'Unknown error',
              errorResponse: (error as AxiosError)?.response?.data,
              errorStatus: (error as AxiosError)?.response?.status
            });
            
            // エラーメッセージの詳細表示
            if ((error as AxiosError)?.response?.status === 403) {
              message.error('このタスクを強制終了する権限がありません');
            } else if ((error as AxiosError)?.response?.status === 409) {
              // 楽観的ロック競合エラー: 他のユーザーが先に更新した可能性
              message.error('このタスクは他のユーザーによって更新されました。最新の情報を取得しています...');
              
              // タスク一覧を再取得して最新の状態を反映
              try {
                const tasksResult = await getWorkerTasks(selectedProjectName);
                if (tasksResult.success && tasksResult.data) {
                  const apiData = tasksResult.data;
                  
                  // メソッド一覧を変換
                  const methodsData: Method[] = apiData.methods.map((method: WorkerMethod) => ({
                    methodId: method.method_id,
                    methodName: method.method_name,
                    experimentOrder: method.experiment_order,
                    description: '',
                    category: 'experiment',
                    transitions: [],
                  }));
                  
                  // 全タスクを変換
                  const allTasks: Task[] = apiData.methods.flatMap((method: WorkerMethod) =>
                    method.tasks.map((apiTask: WorkerTask) => ({
                      taskId: `${apiData.project_id}-${method.method_id}-${apiTask.task_no}`,
                      taskNo: apiTask.task_no.toString(),
                      taskName: apiTask.task_no.toString(),
                      methodId: method.method_id,
                      methodName: method.method_name,
                      status: apiTask.task_status as Task['status'],
                      assignedUserId: apiTask.experiment_user_id,
                      assignedUserName: apiTask.experiment_user_name,
                      createdAt: apiTask.created_at,
                      updatedAt: apiTask.updated_at,
                      projectId: apiData.project_id,
                      sampleNumber: '',
                      notes: '',
                      progressRate: parseFloat(apiTask.progress_rate) || 0,
                      transitionStatuses: [],
                      progressReport: '',
                      recordNumber: '',
                    }))
                  );
                  
                  setMethods(methodsData);
                  setTasks(allTasks);
                  
                  console.log('[DEBUG] handleTaskAction - Tasks refreshed after 409 conflict', {
                    methodCount: methodsData.length,
                    taskCount: allTasks.length
                  });
                }
              } catch (refreshError) {
                console.error('[DEBUG] handleTaskAction - Failed to refresh tasks after 409', refreshError);
                message.warning('最新の情報取得に失敗しました。画面を再読み込みしてください。');
              }
            } else if ((error as AxiosError)?.response?.status === 404) {
              message.error('タスクが見つかりません');
            } else {
              message.error('タスクの強制終了中にエラーが発生しました');
            }
          }
          break;

        default:
          message.warning('不明なアクションです');
      }
    } catch (error) {
      console.error('タスクアクション処理エラー:', error);
      message.error('タスクの更新に失敗しました');
    }
  }, [selectedProject, tasks, onTabChange, onSelectTaskAndTab, onSelectMethod]);

  // 承認依頼ボタン
  const handleApprovalRequest = useCallback(() => {
    message.info('承認依頼機能は今後実装予定です');
  }, []);

  // コメント送信処理
  const handleCommentSubmit = useCallback((taskId: string, comment: string) => {
    console.log('コメント送信:', { taskId, comment });
    // TODO: バックエンドAPIへの送信処理を実装
    message.success('コメントを送信しました');
  }, []);

  // ステータス変更処理
  const handleStatusChange = useCallback((taskId: string, newStatus: IssueStatus) => {
    console.log('ステータス変更:', { taskId, newStatus });
    // TODO: バックエンドAPIへの送信処理を実装
    message.success(`ステータスを「${newStatus === 'unresolved' ? '未解決' : '解決済'}」に変更しました`);
  }, []);

  // モックの問題データ（プロジェクト全体の問題を想定）

  // メソッドのステータスを計算する関数
  const getMethodStatus = useCallback((methodTasks: Task[]): {
    status: BadgeProps['status'];
    label: string;
  } => {
    if (methodTasks.length === 0) {
      return { status: 'default', label: '未着手' };
    }

    // 強制終了タスクがあればエラー
    const hasForceTerminated = methodTasks.some(t => t.status === 'forced_terminated');
    if (hasForceTerminated) {
      return { status: 'error', label: 'エラー' };
    }

    // 全タスクが完了していれば完了
    const allCompleted = methodTasks.every(t => t.status === 'completed');
    if (allCompleted) {
      return { status: 'success', label: '完了' };
    }

    // 作業中のタスクがあれば作業中
    const hasInProgress = methodTasks.some(
      t => t.status === 'in_progress'
    );
    if (hasInProgress) {
      return { status: 'processing', label: '作業中' };
    }

    // それ以外は未着手
    return { status: 'default', label: '未着手' };
  }, []);

  // メソッドタブの生成（各メソッドに紐づくタスクのみを表示）
  const methodTabs = useMemo(() => {
    return methods.map((method) => {
      // このメソッドに紐づくタスクのみをフィルタリング
      const methodTasks = tasks.filter(task => task.methodId === method.methodId);
      
      // メソッドのステータスを取得
      const methodStatus = getMethodStatus(methodTasks);
      
      return {
        key: method.methodId,
        label: (
          <div style={{ textAlign: 'left', lineHeight: '1.3', padding: '4px 0' }}>
            <div style={{ fontSize: '14px', fontWeight: 500 }}>
              {method.methodName}
            </div>
            <div style={{ 
              fontSize: '12px', 
              color: token.colorTextSecondary,
              marginTop: '2px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <Badge status={methodStatus.status} />
              <span>{methodStatus.label}</span>
              <span style={{ margin: '0 4px' }}>|</span>
              <span>{methodTasks.length}タスク</span>
            </div>
          </div>
        ),
        children: (
          <div style={{ marginTop: token.marginLG }}>
            {methodTasks.length > 0 ? (
              <ProgressCheckTable
                tasks={methodTasks}
                projectStatus={projectStatus}
                onTaskAction={handleTaskAction}
                readOnly={readOnly}
              />
            ) : (
              <div
                style={{
                  textAlign: 'center',
                  padding: '40px',
                  color: token.colorTextDisabled,
                  fontSize: '14px'
                }}
              >
                タスクが見つかりません
              </div>
            )}
          </div>
        ),
      };
    });
  }, [methods, tasks, projectStatus, handleTaskAction, token, getMethodStatus]);

  return (
    <div style={{ padding: 0 }}>
      {loading ? (
        <Card
          style={{
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
          }}
        >
          <Space orientation="vertical" align="center" style={{ width: '100%', padding: `${token.marginXXL}px 0` }}>
            <div className="ant-spin ant-spin-spinning">
              <span className="ant-spin-dot ant-spin-dot-spin">
                <i className="ant-spin-dot-item"></i>
                <i className="ant-spin-dot-item"></i>
                <i className="ant-spin-dot-item"></i>
                <i className="ant-spin-dot-item"></i>
              </span>
            </div>
            <Text type="secondary" style={{ marginTop: token.margin }}>
              タスク一覧を読み込んでいます...
            </Text>
          </Space>
        </Card>
      ) : !selectedProject ? (
        <Card
          style={{
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
          }}
        >
          <Space orientation="vertical" align="center" style={{ width: '100%', padding: `${token.marginXXL}px 0` }}>
            <CheckSquareOutlined style={{ fontSize: EMPTY_ICON_SIZE, color: token.colorTextDisabled }} />
            <Title level={3} type="secondary">
              <CheckSquareOutlined style={{ marginRight: token.marginXS }} />
              進捗確認
            </Title>
            <Text type="secondary">
              プロジェクトを選択してください
            </Text>
          </Space>
        </Card>
      ) : methods.length === 0 ? (
        <Card
          style={{
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
          }}
        >
          <Space orientation="vertical" align="center" style={{ width: '100%', padding: `${token.marginXXL}px 0` }}>
            <CheckSquareOutlined style={{ fontSize: EMPTY_ICON_SIZE, color: token.colorTextDisabled }} />
            <Title level={3} type="secondary">
              メソッドが見つかりません
            </Title>
            <Text type="secondary">
              このプロジェクトにはメソッドが登録されていません
            </Text>
          </Space>
        </Card>
      ) : (
        <Card
          style={{
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
          }}
          styles={{ body: { padding: 0 } }}
        >
          {/* メソッドタブ */}
          <Tabs
            activeKey={selectedMethodId || undefined}
            onChange={onSelectMethod}
            items={methodTabs}
            size="middle"
            type="card"
            style={{
              marginBottom: 0,
            }}
            tabBarStyle={{
              marginBottom: 0,
              paddingLeft: token.padding,
              paddingRight: token.padding,
            }}
          />
        </Card>
      )}

      {/* 問題報告モーダル */}
      <IssueReportModal
        visible={issueReportModalVisible}
        task={selectedTaskForIssue}
        initialStatus="unresolved"
        onClose={handleCloseIssueReport}
        onCommentSubmit={handleCommentSubmit}
        onStatusChange={handleStatusChange}
      />

      {/* 問題確認モーダル（参照専用） */}
      {selectedTaskForIssueCheck && projectId && (
        <IssueManagementModal
          visible={issueCheckModalVisible}
          targetName={selectedTaskForIssueCheck.taskName}
          projectId={projectId}
          projectName={selectedProject || ''}
          methodId={selectedTaskForIssueCheck.methodId}
          taskNo={selectedTaskForIssueCheck.taskNo ? parseInt(selectedTaskForIssueCheck.taskNo, 10) || undefined : undefined}
          onClose={handleCloseIssueCheck}
          viewMode={true}
        />
      )}
    </div>
  );
}
