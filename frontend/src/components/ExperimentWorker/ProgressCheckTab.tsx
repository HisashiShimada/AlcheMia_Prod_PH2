'use client';

import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { Card, Space, Typography, Tabs, theme, Badge, App } from 'antd';
import { CheckSquareOutlined } from '@ant-design/icons';
import type { BadgeProps } from 'antd';
import ProgressCheckTable from './ProgressCheckTable';
import IssueManagementModal from './IssueManagementModal';
import { getWorkerTasks, updateTaskStatus } from '@/services/projectApiService';
import type { WorkerMethod, WorkerTask } from '@/services/projectApiService';
import { extractErrorMessage } from '@/utils/errorUtils';
import { AxiosError } from 'axios';
import type { Task, Method, ProjectStatus } from '@/types/experimentWorker';
import { useLanguage } from '@/contexts/LanguageContext';
import { HTTP_STATUS } from '@/constants/httpStatus';

const { Title, Text } = Typography;

/**
 * 空状態アイコンのサイズ（UIポリシー基準）
 */
const EMPTY_ICON_SIZE = 48;

interface ProgressCheckTabProps {
  selectedProject: string | null;
  /** 選択中プロジェクトのプロジェクト名（UI表示用） */
  selectedProjectName?: string;
  onProjectChange: (projectId: string) => void;
  selectedMethodId: string | null;
  onSelectMethod: (methodId: string) => void;
  onTabChange?: (tabKey: string) => void;
  onSelectTaskAndTab?: (taskId: string, tabKey: string, methodId?: string) => void;
  /** trueのとき強制終了ボタンを無効化（リードオンリービュー用） */
  readOnly?: boolean;
}

/**
 * 進捗確認タブ - メインコンポーネント
 * プロジェクトを選択するとAPIからタスク一覧を取得して表示する
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
  // デザイントークンを取得（UIポリシー基準）
  const { token } = theme.useToken();
  const { t } = useLanguage();
  
  // Ant Design App コンテキストからmessageを取得
  const { message } = App.useApp();
  
  // API連携の状態管理
  const [loading, setLoading] = useState<boolean>(false);
  const [methods, setMethods] = useState<Method[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  
  // プロジェクトの状態を取得（現時点ではAPIから取得できるまでnull）
  const projectStatus: ProjectStatus | null = null;
  
  // プロジェクトを選択したらAPIからタスク一覧を取得
  useEffect(() => {
    const fetchWorkerTasks = async () => {
      if (!selectedProject) {
        setMethods([]);
        setTasks([]);
        setProjectId(null);
        return;
      }

      setLoading(true);
      try {
        console.log('[DEBUG] ProgressCheckTab - Fetching worker tasks', { selectedProject });
        
        const result = await getWorkerTasks(selectedProject);
        
        if (result.success && result.data) {
          const apiData = result.data;
          
          console.log('[DEBUG] ProgressCheckTab - API response', {
            project_id: apiData.project_id,
            methodCount: apiData.methods.length
          });
          
          // プロジェクトIDを保存
          setProjectId(apiData.project_id);
          
          // メソッド一覧を変換（APIレスポンスのプロパティをコンポーネント用にマッピング）
          const methodsData: Method[] = apiData.methods.map((method: WorkerMethod) => ({
            methodId: method.method_id,
            methodName: method.method_name,
            experimentOrder: method.experiment_order,
            description: '', // APIには存在しないためデフォルト値
            category: 'experiment', // APIには存在しないためデフォルト値
            transitions: [], // APIには存在しないためデフォルト値
          }));
          
          // 全タスクを変換（APIレスポンスのプロパティをコンポーネント用にマッピング）
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
                taskName: task.task_no.toString(), // task_nameフィールドは除外されているのでtask_noを代用
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
          
          // 重複 taskId を排除
          const uniqueTasksMap1 = new Map<string, Task>();
          allTasks.forEach(task => uniqueTasksMap1.set(task.taskId, task));
          const uniqueTasks1 = Array.from(uniqueTasksMap1.values());
          setMethods(methodsData);
          setTasks(uniqueTasks1);
          
          // API取得完了後に最初のメソッドを自動選択
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
          message.error(extractErrorMessage(null));
          setMethods([]);
          setTasks([]);
        }
      } catch (error) {
        console.error('[DEBUG] ProgressCheckTab - Error fetching tasks', error);
        message.error(extractErrorMessage(error));
        setMethods([]);
        setTasks([]);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkerTasks();
  }, [selectedProject]);
  
  // 前回のプロジェクトIDを保持（プロジェクト変更時の自動選択判定用）
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
      setNeedsAutoSelect(true); // 自動選択フラグを立てる
    }
  }, [selectedProject]);
  
  // メソッドが更新されたら自動選択
  useEffect(() => {
    console.log('[DEBUG] ProgressCheckTab - Auto-select effect', {
      methodsCount: methods.length,
      selectedMethodId,
      needsAutoSelect
    });
    
    // プロジェクト変更後の自動選択はneedsAutoSelectフラグで判定（selectedMethodIdは無視）
    if (methods.length > 0 && needsAutoSelect) {
      const sortedMethods = [...methods].sort((a, b) => a.experimentOrder - b.experimentOrder);
      console.log('[DEBUG] ProgressCheckTab - Auto-selecting first method (after project change)', {
        methodId: sortedMethods[0].methodId,
        methodName: sortedMethods[0].methodName
      });
      onSelectMethod(sortedMethods[0].methodId);
      setNeedsAutoSelect(false); // フラグをクリア
    } else if (methods.length > 0 && !selectedMethodId && !needsAutoSelect) {
      // 通常の自動選択（初回表示時など）
      const sortedMethods = [...methods].sort((a, b) => a.experimentOrder - b.experimentOrder);
      console.log('[DEBUG] ProgressCheckTab - Auto-selecting first method (normal)', {
        methodId: sortedMethods[0].methodId,
        methodName: sortedMethods[0].methodName
      });
      onSelectMethod(sortedMethods[0].methodId);
    }
  }, [methods, needsAutoSelect, selectedMethodId, onSelectMethod]);
  
  // 問題管理モーダルの状態管理（問題報告・確認・通知）
  const [issueModalVisible, setIssueModalVisible] = useState<boolean>(false);
  const [selectedTaskForIssue, setSelectedTaskForIssue] = useState<Task | null>(null);
  const [issueModalViewMode, setIssueModalViewMode] = useState<boolean>(false);

  // 問題報告モーダルを開く（報告用モード）
  const handleOpenIssueReport = useCallback((task: Task) => {
    setSelectedTaskForIssue(task);
    setIssueModalViewMode(false);
    setIssueModalVisible(true);
  }, []);

  // 問題確認モーダルを開く（参照・確認用モード）
  const handleOpenIssueCheck = useCallback((task: Task) => {
    setSelectedTaskForIssue(task);
    setIssueModalViewMode(true);
    setIssueModalVisible(true);
  }, []);

  // モーダルを閉じる
  const handleCloseIssueModal = useCallback(() => {
    setIssueModalVisible(false);
    setSelectedTaskForIssue(null);
  }, []);


  // タスクアクション処理
  const handleTaskAction = useCallback(async (taskId: string, action: string) => {
    if (!selectedProject) {
      message.warning(t('experimentWork.projectSelection.title'));
      return;
    }

    // タスクのmethodIdを取得
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
              projectName: selectedProject,
              taskUpdatedAt: task.updatedAt,
              taskUpdatedAtType: typeof task.updatedAt,
              fullTask: task
            });
            
            // task.updatedAtの検証
            if (!task.updatedAt) {
              console.error('[DEBUG] handleTaskAction - task.updatedAt is missing!', { task });
              message.error('タスクの更新日時が取得できませんでした。画面を再読み込みしてください。');
              return;
            }
            
            // タスクステータスを'in_progress'に更新
            // 楽観的ロック用にupdatedAtを送付
            const result = await updateTaskStatus(
              selectedProject,
              task.methodId,
              task.taskNo,
              'in_progress',
              undefined,      // comment（オプション）
              task.updatedAt  // currentUpdatedAt（楽観的ロック用）
            );
            
            if (result.success && result.data) {
              console.log('[DEBUG] handleTaskAction - Task status updated successfully', {
                taskNo: result.data.task_no,
                previousStatus: result.data.previous_status,
                newStatus: result.data.new_status
              });
              
              message.success('タスクを開始しました');
              
              // タスク一覧を再取得して最新の状態を反映
              const tasksResult = await getWorkerTasks(selectedProject);
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
            
            // エラー種別に応じた詳細メッセージ
            if ((error as AxiosError)?.response?.status === HTTP_STATUS.FORBIDDEN) {
              message.error('このタスクを開始する権限がありません');
            } else if ((error as AxiosError)?.response?.status === HTTP_STATUS.CONFLICT) {
              // 楽観的ロックの競合エラー: 他のユーザーが先に更新した可能性
              message.error('このタスクは他のユーザーによって更新されました。最新の情報を取得しています..');
              
              // タスク一覧を再取得して最新の状態を反映
              try {
                const tasksResult = await getWorkerTasks(selectedProject);
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
            } else if ((error as AxiosError)?.response?.status === HTTP_STATUS.NOT_FOUND) {
              message.error('タスクが見つかりません');
            } else {
              message.error('タスクの開始中にエラーが発生しました');
            }
          }
          break;

        case 'instruction':
          // 指示確認タブへ遷移（メソッドとタスクを選択してからタブ移動）
          if (onSelectTaskAndTab) {
            onSelectTaskAndTab(taskId, '2', task.methodId); // 指示確認タブ・methodIdを渡す
            message.info('指示確認タブに移動します。');
          } else {
            // フォールバック: メソッドを先に選択
            if (task.methodId && onSelectMethod) {
              onSelectMethod(task.methodId);
            }
            if (onTabChange) {
              onTabChange('2'); // 指示確認タブ
              message.info('指示確認タブに移動します。');
            }
          }
          break;

        case 'record':
          // 実験記録タブへ遷移（タスクを選択してからタブ移動）
          if (onSelectTaskAndTab) {
            onSelectTaskAndTab(taskId, '3', task.methodId); // 実験記録タブ・methodIdを渡す
            message.info('実験記録タブに移動します。');
          } else if (onTabChange) {
            onTabChange('3'); // フォールバック
            message.info('実験記録タブに移動します。');
          }
          break;

        case 'issue':
          // 問題報告モーダルを開く
          handleOpenIssueReport(task);
          break;
        
        case 'issueCheck':
          // 問題確認モーダルを開く（参照・確認用）
          handleOpenIssueCheck(task);
          break;

        case 'forceTerminate':
          // 強制終了処理
          try {
            console.log('[DEBUG] handleTaskAction - Force terminate task', {
              taskId,
              taskNo: task.taskNo,
              methodId: task.methodId,
              projectName: selectedProject,
              taskUpdatedAt: task.updatedAt,
              taskUpdatedAtType: typeof task.updatedAt,
              fullTask: task
            });
            
            // task.updatedAtの検証
            if (!task.updatedAt) {
              console.error('[DEBUG] handleTaskAction - task.updatedAt is missing!', { task });
              message.error('タスクの更新日時が取得できませんでした。画面を再読み込みしてください。');
              return;
            }
            
            // タスクステータスを'forced_terminated'に更新
            // 楽観的ロック用にupdatedAtを送付
            const result = await updateTaskStatus(
              selectedProject,
              task.methodId,
              task.taskNo,
              'forced_terminated',
              undefined,      // comment（オプション）
              task.updatedAt  // currentUpdatedAt（楽観的ロック用）
            );
            
            if (result.success && result.data) {
              console.log('[DEBUG] handleTaskAction - Task force terminated successfully', {
                taskNo: result.data.task_no,
                previousStatus: result.data.previous_status,
                newStatus: result.data.new_status
              });
              
              message.success('タスクを強制終了しました');
              
              // タスク一覧を再取得して最新の状態を反映
              const tasksResult = await getWorkerTasks(selectedProject);
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
            
            // エラー種別に応じた詳細メッセージ
            if ((error as AxiosError)?.response?.status === HTTP_STATUS.FORBIDDEN) {
              message.error('このタスクを強制終了する権限がありません');
            } else if ((error as AxiosError)?.response?.status === HTTP_STATUS.CONFLICT) {
              // 楽観的ロックの競合エラー: 他のユーザーが先に更新した可能性
              message.error('このタスクは他のユーザーによって更新されました。最新の情報を取得しています..');
              
              // タスク一覧を再取得して最新の状態を反映
              try {
                const tasksResult = await getWorkerTasks(selectedProject);
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
            } else if ((error as AxiosError)?.response?.status === HTTP_STATUS.NOT_FOUND) {
              message.error('タスクが見つかりません');
            } else {
              message.error('タスクの強制終了中にエラーが発生しました');
            }
          }
          break;

        default:
          message.warning('不明なアクションです。');
      }
    } catch (error) {
      console.error('タスクアクション処理エラー:', error);
      message.error('タスクの更新に失敗しました');
    }
  }, [selectedProject, tasks, onTabChange, onSelectTaskAndTab, onSelectMethod]);

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

  // メソッドタブを生成（各メソッドに紐づくタスクをフィルタリングして表示）
  const methodTabs = useMemo(() => {
    return methods.map((method) => {
      // このメソッドに紐づくタスクをフィルタリング
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
                projectName={selectedProject || ''}
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
          data-testid="progress-check-tab-no-project"
          style={{
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
          }}
        >
          <Space orientation="vertical" align="center" style={{ width: '100%', padding: `${token.marginXXL}px 0` }}>
            <CheckSquareOutlined style={{ fontSize: EMPTY_ICON_SIZE, color: token.colorTextDisabled }} />
            <Title level={3} type="secondary">
              <CheckSquareOutlined style={{ marginRight: token.marginXS }} />
              {t('menu.experiment_worker.tabs.progressCheck')}
            </Title>
            <Text type="secondary">
              {t('experimentWork.projectSelection.title')}
            </Text>
          </Space>
        </Card>
      ) : methods.length === 0 ? (
        <Card
          data-testid="progress-check-tab-no-methods"
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
          data-testid="progress-check-tab-content"
          style={{
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
          }}
          styles={{ body: { padding: 0 } }}
        >
          {/* メソッドタブ */}
          <Tabs
            data-testid="progress-check-method-tabs"
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

      {/* 問題管理モーダル（問題報告・確認・通知） */}
      {issueModalVisible && selectedTaskForIssue && projectId && (
        <IssueManagementModal
          open={issueModalVisible}
          targetName={selectedTaskForIssue.taskName}
          projectId={projectId}
          projectName={selectedProject || ''}
          methodId={selectedTaskForIssue.methodId}
          taskNo={selectedTaskForIssue.taskNo ? parseInt(selectedTaskForIssue.taskNo, 10) || undefined : undefined}
          onClose={handleCloseIssueModal}
          viewMode={issueModalViewMode}
        />
      )}
    </div>
  );
}
