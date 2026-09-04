import { useState, useMemo } from 'react';
import type { Instruction, WorkAssignment } from '@/types/experimentWorker';
import type { WorkerInstruction } from '@/types/project';
import { getWorkerInstructions } from '@/services/projectApiService';

/**
 * WorkerInstruction をフロントエンド型 Instruction に変換する
 * method_id / task_no / transition_id の有無からグループを判定する。
 */
function convertWorkerInstruction(apiData: WorkerInstruction): Instruction {
  return {
    instructionId: apiData.id,
    transitionId: apiData.transition_id || undefined,
    transitionName: apiData.transition_name || undefined,
    methodId: apiData.method_id || undefined,
    methodName: apiData.method_name || undefined,
    taskId: apiData.task_no ? `${apiData.project_id}-${apiData.method_id}-${apiData.task_no}` : undefined,
    taskName: apiData.task_no ? `Task ${apiData.task_no}` : undefined,
    content: apiData.instruction_content,
    instructionKey: apiData.instruction_key || undefined,
    createdAt: apiData.create_at,
    updatedAt: null,
    createdBy: {
      userId: apiData.created_by,
      userName: apiData.created_by_name,
    },
    isRead: apiData.is_acknowledged,
    isAcknowledged: apiData.is_acknowledged,
    acknowledgedAt: undefined,
    acknowledgedBy: undefined,
    acknowledgedByName: undefined,
  };
}

/**
 * 指示管理のカスタムフック
 * プロジェクト選択、指示データ、統計情報を管理
 */
export function useInstructions() {
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [instructions, setInstructions] = useState<Instruction[]>([]);
  const [workAssignment, setWorkAssignment] = useState<WorkAssignment | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // プロジェクト選択ハンドラー（value = projectId）
  const handleProjectChange = async (value: string) => {
    setSelectedProject(value);
    
    // 空文字列またはundefinedの場合は、データをクリア
    if (!value) {
      setInstructions([]);
      setWorkAssignment(null);
      setError(null);
      return;
    }
    
    // API呼び出しで指示一覧を取得
    setLoading(true);
    setError(null);
    
    try {
      const result = await getWorkerInstructions(value);
      
      if (result.success && result.data) {
        // バックエンドレスポンスをフロントエンド型に変換
        const convertedInstructions: Instruction[] = result.data.map(convertWorkerInstruction);
        setInstructions(convertedInstructions);
      } else {
        setError(result.error?.message || '指示の取得に失敗しました');
        setInstructions([]);
      }
    } catch (err) {
      console.error('Failed to fetch instructions:', err);
      setError('指示の取得に失敗しました');
      setInstructions([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 指示一覧を再取得する関数（確認完了後に呼び出し）
   */
  const refetchInstructions = async () => {
    if (!selectedProject) {
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await getWorkerInstructions(selectedProject);
      
      if (result.success && result.data) {
        const convertedInstructions: Instruction[] = result.data.map(convertWorkerInstruction);
        setInstructions(convertedInstructions);
      } else {
        setError(result.error?.message || '指示の取得に失敗しました');
      }
    } catch (err) {
      console.error('Failed to fetch instructions:', err);
      setError('指示の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // 指示一覧（ソートなし）
  const sortedInstructions = useMemo(() => {
    return [...instructions];
  }, [instructions]);

  // 統計情報
  const stats = useMemo(
    () => ({
      total: instructions.length,
      file: instructions.filter((i) => !i.methodId && !i.transitionId).length,
      method: instructions.filter((i) => !!i.methodId && !i.transitionId).length,
      task: instructions.filter((i) => !!i.methodId && !!i.taskId).length,
      transition: instructions.filter((i) => !!i.methodId && !!i.transitionId && !i.taskId).length,
      unread: instructions.filter((i) => !i.isRead).length,
    }),
    [instructions]
  );

  return {
    selectedProject,
    instructions,
    workAssignment,
    sortedInstructions,
    stats,
    handleProjectChange,
    refetchInstructions,
    loading,
    error,
  };
}
