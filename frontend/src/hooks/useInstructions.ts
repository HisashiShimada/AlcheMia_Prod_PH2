import { useState, useMemo } from 'react';
import type { Instruction, Priority, WorkAssignment } from '@/types/experimentWorker';
import { getWorkerInstructions, convertApiToInstruction } from '@/services/projectApiService';

/**
 * 指示管理のカスタムフック
 * プロジェクト選択、指示データ、統計情報を管理
 */
export function useInstructions() {
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedProjectName, setSelectedProjectName] = useState<string>('');
  const [instructions, setInstructions] = useState<Instruction[]>([]);
  const [workAssignment, setWorkAssignment] = useState<WorkAssignment | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // プロジェクト選択ハンドラー
  const handleProjectChange = async (value: string, projectName: string) => {
    setSelectedProject(value);
    setSelectedProjectName(projectName);
    
    // 空文字列またはundefinedの場合は、データをクリア
    if (!value || !projectName) {
      setInstructions([]);
      setWorkAssignment(null);
      setError(null);
      return;
    }
    
    // API呼び出しで指示一覧を取得
    setLoading(true);
    setError(null);
    
    try {
      const result = await getWorkerInstructions(projectName);
      
      if (result.success && result.data) {
        // バックエンドレスポンスをフロントエンド型に変換
        const convertedInstructions: Instruction[] = result.data.map(convertApiToInstruction);
        setInstructions(convertedInstructions);
      } else {
        setError(result.error?.message || '指示の取得に失敗しました');
        setInstructions([]);
      }
    } catch (err) {
      console.error('指示取得エラー:', err);
      setError('指示の取得に失敗しました');
      setInstructions([]);
    } finally {
      setLoading(false);
    }
  };

  // 優先度順でソート
  const sortedInstructions = useMemo(() => {
    const priorityOrder: Record<Priority, number> = {
      high: 0,
      medium: 1,
      normal: 2,
      low: 3,
    };
    return [...instructions].sort(
      (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
    );
  }, [instructions]);

  // 統計情報
  const stats = useMemo(
    () => ({
      total: instructions.length,
      file: instructions.filter((i) => i.targetType === 'file').length,
      method: instructions.filter((i) => i.targetType === 'task').length, // 後方互換性のためmethodキーを維持、taskでフィルタ
      transition: instructions.filter((i) => i.targetType === 'transition')
        .length,
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
  };
}
