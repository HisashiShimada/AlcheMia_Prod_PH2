import { useState } from 'react';

/**
 * 展開/折りたたみ状態を管理するカスタムフック
 * グループ、メソッド、トランジションの展開状態を個別に管理
 */
export function useExpandState() {
  // 折りたたみ状態管理
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    file: true,
    method: true,
    task: true,
    transition: true,
  });
  const [expandedMethods, setExpandedMethods] = useState<Record<string, boolean>>({});
  const [expandedTransitions, setExpandedTransitions] = useState<Record<string, boolean>>({});

  // 折りたたみ切り替え
  const toggleGroup = (groupType: string) => {
    setExpandedGroups((prev) => ({ ...prev, [groupType]: !prev[groupType] }));
  };

  const toggleMethod = (methodId: string) => {
    setExpandedMethods((prev) => ({ ...prev, [methodId]: !prev[methodId] }));
  };

  const toggleTransition = (transitionId: string) => {
    setExpandedTransitions((prev) => ({
      ...prev,
      [transitionId]: !prev[transitionId],
    }));
  };

  // プロジェクト変更時に全て展開状態にリセット
  const resetExpandState = () => {
    setExpandedGroups({ file: true, method: true, task: true, transition: true });
    setExpandedMethods({});
    setExpandedTransitions({});
  };

  return {
    expandedGroups,
    expandedMethods,
    expandedTransitions,
    toggleGroup,
    toggleMethod,
    toggleTransition,
    resetExpandState,
  };
}
