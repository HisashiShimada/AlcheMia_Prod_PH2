import { useState, useMemo } from 'react';
import type { Instruction, Priority, WorkAssignment } from '@/types/experimentWorker';
import { projectsData } from '@/data/projectsData';

/**
 * 指示管理のカスタムフック
 * プロジェクト選択、指示データ、統計情報を管理
 */
export function useInstructions() {
  const [selectedProject, setSelectedProject] = useState('');
  const [instructions, setInstructions] = useState<Instruction[]>([]);
  const [workAssignment, setWorkAssignment] = useState<WorkAssignment | null>(null);

  // プロジェクト選択ハンドラー
  const handleProjectChange = (value: string) => {
    setSelectedProject(value);
    const projectData = projectsData[value];
    if (projectData) {
      setInstructions(projectData.instructions);
      setWorkAssignment(projectData.workAssignment);
    } else {
      setInstructions([]);
      setWorkAssignment(null);
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
      method: instructions.filter((i) => i.targetType === 'method').length,
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
