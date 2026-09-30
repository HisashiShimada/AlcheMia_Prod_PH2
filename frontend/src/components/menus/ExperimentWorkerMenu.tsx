  'use client';

import React, { useState, useEffect } from 'react';
import { Layout, Typography, Space, Button, Tabs, theme, Select, App, Spin, Modal } from 'antd';
import {
  FormOutlined,
  CheckSquareOutlined,
  FolderOutlined,
  CheckOutlined,
  LoadingOutlined,
  ExclamationCircleOutlined,
  AlertOutlined,
} from '@ant-design/icons';
import styled from '@emotion/styled';
import Header from '../common/Header';
import SubHeader from '../common/SubHeader';
import { User, MenuType } from '@/types/auth';
import { useLanguage } from '@/contexts/LanguageContext';
import { getPermissionsFromToken } from '@/utils/jwtUtils';
import { useInstructions } from '@/hooks/useInstructions';
import { useExpandState } from '@/hooks/useExpandState';
import WorkRecordPanel from '../ExperimentWorker/WorkRecordPanel';
import IssueManagementModal from '../ExperimentWorker/IssueManagementModal';
import ProgressOverviewTab from '../ExperimentWorker/ProgressOverviewTab';
import type { ProgressRow } from '../ExperimentWorker/ProgressOverviewTab';
import ProjectSelectionModal from '../ExperimentWorker/ProjectSelectionModal';
import type { WorkerProject } from '@/types/project';
import type { ProjectStatus as ProjectStatusType } from '@/types/experimentWorker';
import { isRecordViewableStatus } from '@/types/experimentWorker';
import { getWorkerAccessibleProjects, requestApproval, getWorkerTasks, fetchTransitionStatus, getNgTasks, updateTransitionStatus, forceTerminateProject } from '@/services/projectApiService';
import type { NgTaskItem } from '@/services/projectApiService';
import { TransitionStatusCode } from '@/constants/codeMaster';
import { TaskStatus } from '@/constants/codeMaster';
import { getIssues } from '@/services/issueApiService';
import type { WorkerMethod, WorkerTask } from '@/types/project';
import { useCodeMaster } from '@/hooks/useCodeMaster';
import { AxiosError } from 'axios';
import { extractErrorMessage } from '@/utils/errorUtils';
import { HTTP_STATUS } from '@/constants/httpStatus';
import { mapErrorToMessage } from '@/utils/errorUtils';

const { Content } = Layout;
const { Title, Text } = Typography;

/**
 * レイアウト定数（UIポリシー準拠）
 */
const HEADER_HEIGHT = 64;      // UIポリシー: Header高さ 64px
const SUBHEADER_HEIGHT = 48;   // UIポリシー: SubHeader高さ 48px（タブなし）
const SELECTION_AREA_HEIGHT = 56; // プロジェクト・メソッド選択エリア高さ
const TOTAL_HEADER_HEIGHT = HEADER_HEIGHT + SUBHEADER_HEIGHT; // 合計 112px

/**
 * レスポンシブコンテナ（UIポリシー準拠）
 * ブレークポイント:
 * - xs, sm (< 768px): 100% 幅
 * - md (768px+): 最大768px
 * - lg (992px+): 最大992px
 * - xl (1200px+): 最大1200px
 * - xxl (1600px+): 最大1400px
 */
const ResponsiveContainer = styled.div`
  width: 100%;
  padding: 0 8px;

  @media (min-width: 768px) {
    padding: 0 16px;
  }
`;

/**
 * 実験作業者メニューのProps
 */
interface ExperimentWorkerMenuProps {
  user: User;
  onLogout: () => void;
  onNavigate: (path: string) => void;
  onMenuChange?: (menuType: MenuType) => void;
  /** true のとき Header/SubHeader を非表示にしてコンテンツのみ表示 */
  overlayMode?: boolean;
  /** 固定するプロジェクトID（指定時はプロジェクト選択を disabled にして初期選択） */
  fixedProjectId?: string;
  /** true のとき操作ボタン（選択・承認依頼）を disabled にする */
  readOnly?: boolean;
}

/**
 * 実験作業者メニュー画面
 * サブヘッダーに埋め込まれたタブでメニューを表示
 */
export default function ExperimentWorkerMenu({
  user,
  onLogout,
  onNavigate,
  onMenuChange,
  overlayMode = false,
  fixedProjectId,
  readOnly = false,
}: ExperimentWorkerMenuProps) {
  const { message, modal } = App.useApp();
  const { t } = useLanguage();
  const { token } = theme.useToken();
  const [currentTab, setCurrentTab] = useState('4');
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('new');
  /** 実験記録タブで選択中の作業中トランジション rowKey */
  const [selectedWorkRowKey, setSelectedWorkRowKey] = useState<string | null>(null);
  /** 記録確認遷移時の対象タスクNo（WorkRecordPanel の initialTaskNo に渡す） */
  const [viewingWorkTaskNo, setViewingWorkTaskNo] = useState<number | null>(null);
  /** 記録確認遷移時の対象トランジションID（WorkRecordPanel の initialTransitionId に渡す） */
  const [viewingWorkTransitionId, setViewingWorkTransitionId] = useState<string | null>(null);
  /** 記録確認遷移時の対象メソッドID（WorkRecordPanel の initialMethodId に渡す） */
  const [viewingWorkMethodId, setViewingWorkMethodId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  /** 問題報告モーダル（フェーズB: IssueManagementModal を接続） */
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  /** NG理由モーダル */
  const [ngReasonModalOpen, setNgReasonModalOpen] = useState(false);
  const [ngTasks, setNgTasks] = useState<NgTaskItem[]>([]);
  const [ngTasksLoading, setNgTasksLoading] = useState(false);
  const [selectedProjectName, setSelectedProjectName] = useState<string>('');

  // プロジェクト一覧の状態管理
  const [projects, setProjects] = useState<WorkerProject[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [approvalLoading, setApprovalLoading] = useState(false);

  // コードマスタ: プロジェクトステータス
  const { options: projectStatusOptions } = useCodeMaster('project_status');

  // localStorageからpermissionsを取得（userInfo経由）
  const permissions = getPermissionsFromToken();

  // プロジェクト一覧を取得
  useEffect(() => {
    const fetchProjects = async () => {
      setProjectsLoading(true);
      try {
        const result = await getWorkerAccessibleProjects();
        if (result.success && result.data) {
          setProjects(result.data.projects);
        } else if (!result.success) {
          message.error(mapErrorToMessage(result.error?.code ?? '') || extractErrorMessage(null));
        }
      } catch (error) {
        console.error('プロジェクト一覧取得エラー:', error);
        message.error(extractErrorMessage(error));
      } finally {
        setProjectsLoading(false);
      }
    };

    fetchProjects();
  }, []);

  // 承認依頼ハンドラー
  const handleApprovalRequest = async () => {
    if (!selectedProject) {
      message.warning(t('project.selectProjectWarning'));
      return;
    }

    // 選択されたプロジェクトの情報を取得
    const selectedProjectData = projects.find(p => p.projectId === selectedProject);
    if (!selectedProjectData) {
      message.error(t('project.infoNotFound'));
      return;
    }

    setApprovalLoading(true);
    try {
      const result = await requestApproval(selectedProjectData.projectId);
      if (result.success) {
        message.success(t('worker.approvalRequestSent'));
      } else {
        message.error(mapErrorToMessage(result.error?.code ?? '') || extractErrorMessage(null));
      }
    } catch (error) {
      console.error('Approval request error:', error);
      const axiosError = error as AxiosError<{ error: { code: string; message: string } }>;
      
      if (axiosError.response?.status === HTTP_STATUS.CONFLICT) {
        message.error(t('worker.approvalRequestAlreadySent'));
      } else if (axiosError.response?.status === HTTP_STATUS.NOT_FOUND) {
        message.error(t('project.notFound'));
      } else {
        message.error(extractErrorMessage(error));
      }
    } finally {
      // 承認依頼の成功・失敗に関わらず、プロジェクト一覧を再取得してステータスを最新化する
      // （承認依頼が成功した場合: project_status が 3（タスク結果レビュー待ち）に更新される）
      // （409 Conflict の場合: 既に承認待ち状態のため再取得で最新ステータスを反映）
      try {
        const projectsResult = await getWorkerAccessibleProjects();
        if (projectsResult.success && projectsResult.data) {
          setProjects(projectsResult.data.projects);
        }
      } catch (fetchError) {
        console.error('プロジェクト一覧再取得エラー:', fetchError);
      }
      setApprovalLoading(false);
    }
  };

  // カスタムフック
  const {
    selectedProject,
    handleProjectChange: originalHandleProjectChange,
    instructions,
    refetchInstructions,
  } = useInstructions();

  // プロジェクト指示確認ハンドラー: 未確認のプロジェクト指示を全て API で確認し、
  // 対象トランジションを PREPARING → READY に遷移させる
  const handleConfirmInstruction = async (methodId: string, taskNo: number, transitionId: string) => {
    if (!selectedProject) return;

    try {

      // トランジションを PREPARING → READY に遷移させる
      // ※ バックエンドの updateTransitionStatus が PREPARING→READY 遷移時に
      //   タスク・プロジェクトステータスを自動更新する
      // ※ methodId・taskNo・transitionId の3条件で絞り込み、
      //   現在ロード中のトランジション以外を対象にしないようにする
      const preparingRow = progressRows.find(
        (r) => r.methodId === methodId && r.taskNo === taskNo && r.transitionId === transitionId
      );
      if (preparingRow) {
        try {
          await updateTransitionStatus(selectedProject, preparingRow.methodId, preparingRow.transitionId, {
            taskNo: preparingRow.taskNo,
            status: TransitionStatusCode.READY, // 準備完了状態
          });
          // プロジェクト一覧と進捗データを同時に最新化する
          // （プロジェクトステータスが TASK_PENDING → TASK_IN_PROGRESS に変わるため）
          await refreshProjectAndProgress();
        } catch (transitionErr) {
          // 既に READY 以降の状態の場合は遷移エラーになるため、ログのみ出して続行
          console.warn('[handleConfirmInstruction] トランジションステータス READY 更新スキップ:', transitionErr);
        }
      }

      message.success(t('workRecord.instructionConfirmed'));

      // プロジェクト一覧と進捗データを同時に最新化する
      await refreshProjectAndProgress();
    } catch (err) {
      console.error('[handleConfirmInstruction] 指示確認エラー:', err);
      message.error(extractErrorMessage(err));
    }
  };

  // overlayMode: fixedProjectId が指定されたら初期選択として設定
  useEffect(() => {
    if (fixedProjectId && projects.length > 0) {
      const project = projects.find(p => p.projectId === fixedProjectId);
      if (project) {
        handleProjectChange(fixedProjectId);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fixedProjectId, projects]);

  // プロジェクト変更時のハンドラー（メソッドとタスクをリセット）
  const handleProjectChange = (value: string | undefined | null) => {
    // undefined/nullは空文字列として扱う
    const projectValue = value || '';
    
    // プロジェクト名を取得
    let projectName = '';
    if (projectValue) {
      const selectedProjectData = projects.find(p => p.projectId === projectValue);
      projectName = selectedProjectData?.projectName || '';
      setSelectedProjectName(projectName);
    } else {
      setSelectedProjectName('');
    }
    
    // useInstructionsフック（指示一覧取得）にprojectIdを渡す
    originalHandleProjectChange(projectValue);
    
    // プロジェクトが変更された場合、メソッドとタスクをリセット
    setSelectedMethodId(null);
    setSelectedTaskId('');
    // 記録確認遷移用 State もリセット
    setViewingWorkTaskNo(null);
    setViewingWorkTransitionId(null);
    setViewingWorkMethodId(null);
  };

  // 選択中プロジェクトのステータス（数値）を取得
  // worker-accessible APIのレスポンスから直接参照することで、不要なAPIコールを排除
  const selectedProjectStatus = projects.find(p => p.projectId === selectedProject)?.projectStatus ?? null;
  /** 選択中プロジェクトの組織グループCD（不確かさ基準スコープ絞り込みに使用） */
  const selectedProjectOrganizationGroupCd = projects.find(p => p.projectId === selectedProject)?.organizationGroupCd ?? null;

  /**
   * 選択中プロジェクトが記録操作可能かどうか。
   * null（未選択/取得前）の場合は安全側に倒して true（活性）とする。
   * ProgressOverviewTab のリスト・フロー図両方の記録ボタン制御に使用する。
   */
  const isProjectRecordable =
    selectedProjectStatus === null ||
    isRecordViewableStatus(selectedProjectStatus as ProjectStatusType);

  const handleTabChange = (key: string) => {
    setCurrentTab(key);
    // 進捗確認タブ（'4'）または実験記録タブ（'3'）に切り替えた際、最新の進捗データを再取得する
    if ((key === '4' || key === '3') && selectedProject) {
      void reloadProgressRows(selectedProject);
    }
  };

  const handleMenuChange = (menuType: MenuType) => {
    if (onMenuChange) {
      onMenuChange(menuType);
    }
  };

  // タスクステータス変更後にプロジェクト一覧を再取得するハンドラー
  // ProgressCheckTabで実験開始・強制終了が成功したときに呼び出される。
  // プロジェクトステータスが変化するため、指示確認・実験記録タブのボタン活性状態を即座に更新する。
  const handleTaskStatusChanged = async () => {
    try {
      const result = await getWorkerAccessibleProjects();
      if (result.success && result.data) {
        setProjects(result.data.projects);
      }
    } catch (error) {
      console.error('プロジェクト一覧再取得エラー（タスクステータス変更後）:', error);
    }
  };

  /**
   * プロジェクト一覧（プロジェクト選択プルダウン）と
   * 進捗データ（ProgressOverviewTab）を同時に最新化する統合ハンドラー。
   * WorkRecordPanel の保存成功・handleConfirmInstruction など、
   * 両方の更新が必要な場面で使用する。
   * Promise.all で並列実行することで合計待ち時間を最小化する。
   */
  const refreshProjectAndProgress = async () => {
    if (!selectedProject) return;
    await Promise.all([
      handleTaskStatusChanged(),
      reloadProgressRows(selectedProject),
    ]);
  };

  // ━━━ ProgressOverviewTab 用: 実API接続 ━━━
  const [progressRows, setProgressRows] = useState<ProgressRow[]>([]);
  const [progressLoading, setProgressLoading] = useState(false);

  /** transitionId → 問題報告件数 マップ */
  const [issueCountMap, setIssueCountMap] = useState<Record<string, number>>({});

  /**
   * トランジションの数値ステータスを ProgressRow.status に変換
   * (1=初期状態, 2=準備状態, 3=準備完了状態, 4=動作状態, 5=休止状態, 6=終状態, 7=異常終了状態)
   */
  const toProgressRowStatus = (progressStatus: string): ProgressRow['status'] => {
    if (progressStatus === '終状態') return 'completed';
    if (progressStatus === '動作状態') return 'in_progress';
    if (progressStatus === '準備状態') return 'preparing';
    if (progressStatus === '準備完了状態') return 'ready';
    if (progressStatus === '休止状態') return 'on_hold';
    if (progressStatus === '異常終了状態') return 'issue';
    return 'not_started';
  };

  /**
   * WorkerTask.task_status（文字列）→ TaskStatus 数値へ変換
   * 訂正ボタンの表示制御（ProgressRow.taskStatus）に使用
   */
  const toTaskStatusNumber = (taskStatus: string): number => {
    if (taskStatus === 'not_started') return TaskStatus.PENDING;
    if (taskStatus === 'started' || taskStatus === 'in_progress') return TaskStatus.IN_PROGRESS;
    if (taskStatus === 'review_waiting') return TaskStatus.REVIEW_WAITING;
    if (taskStatus === 'review_ng') return TaskStatus.REVIEW_NG;
    if (taskStatus === 'completed') return TaskStatus.COMPLETED;
    if (taskStatus === 'forced_terminated') return TaskStatus.FORCED_TERMINATED;
    return TaskStatus.PENDING;
  };

  // プロジェクトが変わったら全体進捗データを取得
  useEffect(() => {
    const fetchProgressRows = async () => {
      if (!selectedProject) {
        setProgressRows([]);
        setIssueCountMap({});
        return;
      }

      setProgressLoading(true);
      try {
        // 進捗データと問題一覧を並列取得
        const [tasksResult, issues] = await Promise.all([
          getWorkerTasks(selectedProject),
          getIssues({ projectId: selectedProject }).catch((err) => {
            // 問題一覧取得失敗時はログだけ出して空配列で継続
            console.warn('[ProgressOverviewTab] 問題一覧取得失敗（件数表示なし）:', err);
            return [];
          }),
        ]);

        // `${taskNo}-${transitionId}` → 問題件数 マップを構築（タスク単位で正確に集計）
        const newIssueCountMap: Record<string, number> = {};
        for (const issue of issues) {
          if (issue.transitionId) {
            const key = `${issue.taskNo ?? ''}-${issue.transitionId}`;
            newIssueCountMap[key] = (newIssueCountMap[key] ?? 0) + 1;
          }
        }
        setIssueCountMap(newIssueCountMap);

        if (!tasksResult.success || !tasksResult.data) {
          setProgressRows([]);
          return;
        }

        const apiData = tasksResult.data;
        // 全メソッド×タスクの組み合わせリストを作成
        const taskCombinations: Array<{ method: WorkerMethod; task: WorkerTask }> = [];
        for (const method of apiData.methods as WorkerMethod[]) {
          for (const task of method.tasks as WorkerTask[]) {
            taskCombinations.push({ method, task });
          }
        }

        // Promise.all で全トランジション進捗を並列取得（N+1 解消）
        const transitionResults = await Promise.all(
          taskCombinations.map(async ({ method, task }) => {
            try {
              const tsRes = await fetchTransitionStatus(selectedProject, method.method_id, task.task_no);
              return { method, task, transitions: tsRes.data.transitionStatus };
            } catch {
              console.warn('[ProgressOverviewTab] トランジション取得失敗 taskNo=', task.task_no);
              return { method, task, transitions: [] };
            }
          })
        );

        // 取得結果を ProgressRow に展開
        const rows: ProgressRow[] = [];
        for (const { method, task, transitions } of transitionResults) {
          transitions.forEach((tr, idx) => {
            rows.push({
              rowKey: `${task.task_no}-${tr.transitionId}`,
              taskNo: task.task_no,
              methodId: method.method_id,
              methodName: method.method_name || method.method_id,
              transitionId: tr.transitionId,
              transitionName: tr.transitionName || tr.transitionId,
              status: toProgressRowStatus(tr.progressStatus),
              materialRecorded: tr.materialActualCount ?? 0,
              materialTotal: tr.materialCount ?? 0,
              conditionRecorded: tr.conditionActualCount ?? 0,
              conditionTotal: tr.conditionCount ?? 0,
              resultRecorded: tr.resultActualCount ?? 0,
              resultTotal: tr.resultCount ?? 0,
              issueCount: newIssueCountMap[`${task.task_no}-${tr.transitionId}`] ?? 0,
              order: idx + 1,
              prerequisiteTransitionIds: tr.prerequisiteTransitionIds ?? [],
              isRecorded: tr.isRecorded ?? false,
              taskStatus: toTaskStatusNumber(task.task_status),
            });
          });
        }

        setProgressRows(rows);
      } catch (error) {
        console.error('[ProgressOverviewTab] 全体進捗取得エラー:', error);
        setProgressRows([]);
      } finally {
        setProgressLoading(false);
      }
    };

    fetchProgressRows();
  }, [selectedProject]);

  // issueCountMap が更新されたら progressRows の issueCount を最新値に反映
  useEffect(() => {
    setProgressRows((prev) =>
      prev.map((row) => ({
        ...row,
        issueCount: issueCountMap[`${row.taskNo}-${row.transitionId}`] ?? 0,
      }))
    );
  }, [issueCountMap]);

  /**
   * 進捗データを再取得してステートを更新する（開始・切替後に呼ぶ）
   */
  const reloadProgressRows = async (projectId: string) => {
    try {
      setProgressLoading(true);
      const [tasksResult, issues] = await Promise.all([
        getWorkerTasks(projectId),
        getIssues({ projectId }).catch(() => []),
      ]);

      const newIssueCountMap: Record<string, number> = {};
      for (const issue of issues) {
        if (issue.transitionId) {
          const key = `${issue.taskNo ?? ''}-${issue.transitionId}`;
          newIssueCountMap[key] = (newIssueCountMap[key] ?? 0) + 1;
        }
      }
      setIssueCountMap(newIssueCountMap);

      if (!tasksResult.success || !tasksResult.data) {
        setProgressRows([]);
        return;
      }

      const apiData = tasksResult.data;
      const taskCombinations: Array<{ method: WorkerMethod; task: WorkerTask }> = [];
      for (const method of apiData.methods as WorkerMethod[]) {
        for (const task of method.tasks as WorkerTask[]) {
          taskCombinations.push({ method, task });
        }
      }

      const transitionResults = await Promise.all(
        taskCombinations.map(async ({ method, task }) => {
          try {
            const tsRes = await fetchTransitionStatus(projectId, method.method_id, task.task_no);
            return { method, task, transitions: tsRes.data.transitionStatus };
          } catch {
            return { method, task, transitions: [] };
          }
        })
      );

      const rows: ProgressRow[] = [];
      for (const { method, task, transitions } of transitionResults) {
        transitions.forEach((tr, idx) => {
          rows.push({
            rowKey: `${task.task_no}-${tr.transitionId}`,
            taskNo: task.task_no,
            methodId: method.method_id,
            methodName: method.method_name || method.method_id,
            transitionId: tr.transitionId,
            transitionName: tr.transitionName || tr.transitionId,
            status: toProgressRowStatus(tr.progressStatus),
            materialRecorded: tr.materialActualCount ?? 0,
            materialTotal: tr.materialCount ?? 0,
            conditionRecorded: tr.conditionActualCount ?? 0,
            conditionTotal: tr.conditionCount ?? 0,
            resultRecorded: tr.resultActualCount ?? 0,
            resultTotal: tr.resultCount ?? 0,
            issueCount: newIssueCountMap[`${task.task_no}-${tr.transitionId}`] ?? 0,
            order: idx + 1,
            prerequisiteTransitionIds: tr.prerequisiteTransitionIds ?? [],
            isRecorded: tr.isRecorded ?? false,
            taskStatus: toTaskStatusNumber(task.task_status),
          });
        });
      }
      setProgressRows(rows);
    } catch (err) {
      console.error('[reloadProgressRows] エラー:', err);
    } finally {
      setProgressLoading(false);
    }
  };

  // タブアイテムの定義（リデザイン後: 作業記録 / 全体進捗 / 不確かさ記録 の3タブ）
  const tabItems = [
    {
      key: '3',
      label: t('menu.experiment_worker.tabs.experimentRecord'),
      icon: <FormOutlined />,
      children: (
        <div style={{ padding: 12, height: 'calc(100vh - 280px)', overflowY: 'auto' }}>
          <WorkRecordPanel
            projectName={selectedProjectName || undefined}
            projectId={selectedProject || undefined}
            methodId={progressRows[0]?.methodId ?? ''}
            progressRows={progressRows}
            projectStatus={selectedProjectStatus ?? undefined}
            allWorkerInstructions={instructions}
            onConfirmInstruction={handleConfirmInstruction}
            organizationGroupCd={selectedProjectOrganizationGroupCd}
            initialTaskNo={viewingWorkTaskNo ?? undefined}
            initialTransitionId={viewingWorkTransitionId ?? undefined}
            initialMethodId={viewingWorkMethodId ?? undefined}
            onSave={refreshProjectAndProgress}
            onClearViewing={() => handleTabChange('4')}
            onStart={async (taskNo, transitionId) => {
              if (!selectedProject) return;
              const targetRow = progressRows.find((r) => r.taskNo === taskNo && r.transitionId === transitionId);
              if (!targetRow) { message.warning(t('experimentWorker.startNoTarget')); return; }
              try {
                await updateTransitionStatus(selectedProject, targetRow.methodId, targetRow.transitionId, {
                  taskNo: targetRow.taskNo,
                  status: TransitionStatusCode.IN_PROGRESS,
                });
                await reloadProgressRows(selectedProject);
              } catch (err) {
                console.error('[WorkRecordPanel onStart] ステータス更新エラー:', err);
                message.error(t('experimentWorker.startFailed'));
              }
            }}
            onEnd={async (taskNo, transitionId) => {
              if (!selectedProject) return;
              const targetRow = progressRows.find((r) => r.taskNo === taskNo && r.transitionId === transitionId);
              if (!targetRow) { message.warning(t('experimentWorker.endNoTarget')); return; }
              try {
                await updateTransitionStatus(selectedProject, targetRow.methodId, targetRow.transitionId, {
                  taskNo: targetRow.taskNo,
                  status: TransitionStatusCode.COMPLETED,
                });
                await reloadProgressRows(selectedProject);
              } catch (err) {
                console.error('[WorkRecordPanel onEnd] ステータス更新エラー:', err);
                message.error(t('experimentWorker.startFailed'));
              }
            }}
            onStatusChange={async (transitionId, status) => {
              if (!selectedProject) return;
              const targetRow = progressRows.find((r) => r.transitionId === transitionId);
              if (!targetRow) return;
              const statusCodeMap: Record<string, number> = {
                not_started: TransitionStatusCode.INITIAL,
                preparing:   TransitionStatusCode.PREPARING,
                ready:       TransitionStatusCode.READY,
                running:     TransitionStatusCode.IN_PROGRESS,
                paused:      TransitionStatusCode.PAUSED,
                completed:   TransitionStatusCode.COMPLETED,
                error:       TransitionStatusCode.ERROR,
              };
              const statusCode = statusCodeMap[status];
              if (statusCode === undefined) return;
              try {
                await updateTransitionStatus(selectedProject, targetRow.methodId, targetRow.transitionId, {
                  taskNo: targetRow.taskNo,
                  status: statusCode,
                });
                await reloadProgressRows(selectedProject);
              } catch (err) {
                console.error('[WorkRecordPanel onStatusChange] ステータス更新エラー:', err);
                message.error(t('experimentWorker.startFailed'));
              }
            }}
            onForceEnd={async () => {
              if (!selectedProject) return;
              const currentProject = selectedProject;
              modal.confirm({
                title: t('projectManagement.forceTerminate.confirmTitle'),
                content: t('projectManagement.forceTerminate.confirmContent'),
                okText: t('projectManagement.forceTerminate.okText'),
                okButtonProps: { danger: true },
                cancelText: t('common.cancel'),
                onOk: async () => {
                  try {
                    await forceTerminateProject(currentProject);
                    message.success(t('projectManagement.forceTerminate.successMessage', { name: currentProject }));
                    await reloadProgressRows(currentProject);
                  } catch (err) {
                    console.error('[WorkRecordPanel onForceEnd] 強制終了エラー:', err);
                    message.error(t('projectManagement.forceTerminate.errorMessage'));
                  }
                },
              });
            }}
          />
        </div>
      ),
    },
    {
      key: '4',
      label: t('menu.experiment_worker.tabs.progressCheck'),
      icon: <CheckSquareOutlined />,
      children: (
        <div style={{ padding: '12px 16px 0' }}>
          {progressLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
              <Spin tip={t('progressOverview.loading')}>
                <div style={{ minHeight: 40 }} />
              </Spin>
            </div>
          ) : (
            <ProgressOverviewTab
              rows={progressRows}
              isProjectRecordable={isProjectRecordable}
              onGoToWork={(taskNo, transitionId, methodId) => {
                setViewingWorkTaskNo(taskNo);
                setViewingWorkTransitionId(transitionId);
                setViewingWorkMethodId(methodId);
                handleTabChange('3');
              }}
            />
          )}
        </div>
      ),
    },
  ];

  /** コンテンツ部分（プロジェクト選択エリア + タブ） */
  const contentBody = (
    <ResponsiveContainer>
      {/* プロジェクト選択・選択ボタン */}
      <div style={{
        height: SELECTION_AREA_HEIGHT,
        marginBottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: token.marginXS,
        flexWrap: 'nowrap',
        backgroundColor: token.colorBgContainer,
        border: `1px solid ${token.colorBorder}`,
        borderLeft: 'none',
        borderRight: 'none',
        paddingLeft: token.paddingLG,
        paddingRight: token.paddingLG,
      }}>
        <Space size="middle" style={{ flex: '0 0 auto' }}>
          <FolderOutlined style={{ fontSize: 16, color: token.colorPrimary }} />
          <Text strong>{t('experimentWork.labels.project')}:</Text>
          <Select
            data-testid="project-select"
            value={selectedProject === '' ? undefined : selectedProject}
            placeholder="-"
            style={{ width: 280 }}
            onChange={handleProjectChange}
            loading={projectsLoading}
            /* overlayMode: fixedProjectId がある場合はプロジェクト変更不可 */
            disabled={projectsLoading || (overlayMode && !!fixedProjectId)}
            notFoundContent={projectsLoading ? <Spin size="small" /> : t('experimentWork.labels.noProjects')}
            options={[
              { value: '', label: '-' },
              ...projects.map((project) => {
                const statusLabel = projectStatusOptions.find(opt => String(opt.value) === String(project.projectStatus))?.label ?? String(project.projectStatus);
                return {
                  value: project.projectId,
                  label: `${project.projectName} - ${statusLabel}`
                };
              })
            ]}
            size="middle"
          />
          {/* 選択ボタン: readOnly時は disabled */}
          <Button
            data-testid="project-select-button"
            type="primary"
            icon={<CheckOutlined />}
            onClick={() => setDialogOpen(true)}
            size="large"
            disabled={readOnly}
          >
            {t('experimentWork.selectButton')}
          </Button>

          {/* 承認依頼ボタン（進捗確認タブ選択時のみ表示） */}
          {currentTab === '4' && (() => {
            // 承認依頼ボタンの活性条件:
            // 1. プロジェクト選択済み
            // 2. ローディング中でない
            // 3. 全トランジションのステータスが「終状態（completed）」
            // 4. 全トランジションの記録済みフラグが true
            const allCompleted =
              progressRows.length > 0 &&
              progressRows.every((r) => r.status === 'completed');
            const allRecorded =
              progressRows.length > 0 &&
              progressRows.every((r) => r.isRecorded === true);
            const canRequestApproval =
              !readOnly &&
              !!selectedProject &&
              selectedProject !== '' &&
              !approvalLoading &&
              allCompleted &&
              allRecorded;
            return (
              <Button
                type="default"
                onClick={handleApprovalRequest}
                size="large"
                disabled={!canRequestApproval}
                loading={approvalLoading}
                icon={approvalLoading ? <LoadingOutlined /> : undefined}
              >
                {t('experimentWork.approvalRequest')}
              </Button>
            );
          })()}

          {/* NG理由ボタン */}
          <Button
            danger
            ghost
            icon={<AlertOutlined />}
            size="large"
            disabled={!selectedProject || selectedProject === ''}
            loading={ngTasksLoading}
            onClick={async () => {
              if (!selectedProject) return;
              setNgTasksLoading(true);
              try {
                const items = await getNgTasks(selectedProject);
                setNgTasks(items);
              } catch (err) {
                console.error('[NG理由] 取得エラー:', err);
                setNgTasks([]);
              } finally {
                setNgTasksLoading(false);
              }
              setNgReasonModalOpen(true);
            }}
          >
            {t('experimentWorker.ngReason.button')}
          </Button>

          {/* 問題報告ボタン（フェーズB: IssueManagementModal に接続） */}
          <Button
            type="default"
            icon={<ExclamationCircleOutlined />}
            size="large"
            disabled={!selectedProject || selectedProject === ''}
            onClick={() => setIssueModalOpen(true)}
            style={
              !selectedProject || selectedProject === ''
                ? undefined
                : { borderColor: '#fa8c16', color: '#fa8c16' }
            }
          >
            問題報告
          </Button>
        </Space>
      </div>

      {/* NG理由モーダル */}
      <Modal
        open={ngReasonModalOpen}
        onCancel={() => setNgReasonModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setNgReasonModalOpen(false)}>
            {t('common.close')}
          </Button>,
        ]}
        title={
          <span style={{ color: '#ff4d4f' }}>
            <AlertOutlined style={{ marginRight: 8 }} />
            {t('experimentWorker.ngReason.modalTitle')}
          </span>
        }
      >
        {ngTasks.length === 0 ? (
          <p style={{ margin: 0, color: '#888' }}>{t('experimentWorker.ngReason.noNgTasks')}</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {ngTasks.map((ng) => (
              <div
                key={`${ng.methodId}-${ng.taskNo}`}
                style={{
                  border: '1px solid #ffccc7',
                  borderRadius: 6,
                  padding: '8px 12px',
                  background: '#fff2f0',
                }}
              >
                <div style={{ fontWeight: 'bold', marginBottom: 4, fontSize: 13 }}>
                  タスク #{ng.taskNo}
                  {ng.methodId && (
                    <span style={{ fontWeight: 'normal', color: '#888', marginLeft: 8, fontSize: 12 }}>
                      ({ng.methodId})
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 14, lineHeight: 1.6 }}>
                  {ng.reviewResult || t('experimentWorker.ngReason.noReason')}
                </div>
                {ng.reviewedAt && (
                  <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>
                    {new Date(ng.reviewedAt).toLocaleString('ja-JP')}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* タブ */}
      <div style={{ borderRadius: 0 }}>
        <Tabs
          activeKey={currentTab}
          onChange={handleTabChange}
          items={tabItems}
          size="large"
          style={{ marginBottom: 0 }}
          tabBarStyle={{
            padding: `0 ${token.paddingLG}px`,
            margin: 0,
            borderTop: `1px solid ${token.colorBorder}`,
            borderBottom: `1px solid ${token.colorBorder}`,
            borderLeft: 'none',
            borderRight: 'none',
            borderRadius: 0,
          }}
        />
      </div>

      {/* 問題報告モーダル */}
      <IssueManagementModal
        open={issueModalOpen}
        targetName={selectedProjectName || selectedProject || ''}
        projectId={selectedProject || ''}
        projectName={selectedProjectName}
        onClose={() => setIssueModalOpen(false)}
        viewMode={false}
        projectStatus={selectedProjectStatus as ProjectStatusType | null}
      />

      {/* プロジェクト選択モーダル（readOnly時は不要だが、一応open=falseで無効化） */}
      <ProjectSelectionModal
        open={!readOnly && dialogOpen}
        onClose={() => setDialogOpen(false)}
        selectedProject={selectedProject}
        onProjectChange={handleProjectChange}
        projects={projects}
        loading={projectsLoading}
      />
    </ResponsiveContainer>
  );

  // overlayMode のとき: Header/SubHeader なしでコンテンツのみ返す
  if (overlayMode) {
    return (
      <div style={{ height: '100%', overflow: 'auto', background: token.colorBgLayout }}>
        {contentBody}
      </div>
    );
  }

  // 通常モード: Header + SubHeader + Content で返す
  return (
    <Layout style={{ minHeight: '100vh', background: token.colorBgLayout }}>
      <Header user={user} onLogout={onLogout} />
      <SubHeader
        title={t('menu.experiment_worker.title')}
        currentMenu="experiment_worker"
        onMenuChange={handleMenuChange}
        userPermissions={permissions}
      />
      <Content
        style={{
          marginTop: TOTAL_HEADER_HEIGHT,
          padding: 0,
        }}
      >
        {contentBody}
      </Content>
    </Layout>
  );
}
