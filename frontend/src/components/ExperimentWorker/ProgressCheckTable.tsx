'use client';

import React, { useState } from 'react';
import { Task, ProjectStatus } from '@/types/experimentWorker';
import ViewRendererDialog from '@/components/viewer/ViewRendererDialog';
import SubNetViewer from '@/components/viewer/dialogs/SubNetViewer';
import type { FileData, SubnetData } from '@/components/viewer/ViewRendererDialog';
import TaskListTable from './TaskListTable';

interface ProgressCheckTableProps {
tasks: Task[];
  projectStatus: ProjectStatus | null;
  onTaskAction: (taskId: string, action: string) => void;
  /** trueのとき強制終了ボタンを無効化（オーバーレイ閲覧モード用） */
  readOnly?: boolean;
}

/**
 * 進捗確認テーブル（親コンポーネント）
 * タスク一覧を表示（メソッドはタブで選択済み）
 */
export default function ProgressCheckTable({ tasks, projectStatus, onTaskAction, readOnly = false }: ProgressCheckTableProps) {
  // ViewRendererDialogの管理
  const [viewerDialogs, setViewerDialogs] = useState<Array<{
    id: string;
    file: FileData;
    zIndex: number;
  }>>([]);
  const [nextZIndex, setNextZIndex] = useState(999999);
  
  // SubNetViewerの管理
  const [subnetData, setSubnetData] = useState<SubnetData | null>(null);
  
  // 進捗率クリック時のハンドラー
  const handleProgressRateClick = (task: Task) => {
    const fileData: FileData = {
      id: 'test_omori11',
      name: 'test_omori11.maiml',
      path: '/data/mock/test_omori11.maiml',
      size: 0,
      lastModified: new Date().toISOString(),
      type: 'maiml',
    };

    const newDialog = {
      id: `flow-diagram-${Date.now()}`,
      file: fileData,
      zIndex: nextZIndex,
    };

    setViewerDialogs([...viewerDialogs, newDialog]);
    setNextZIndex(nextZIndex + 1);
  };

  // ダイアログを閉じる
  const handleCloseDialog = (id: string) => {
    setViewerDialogs(viewerDialogs.filter((d) => d.id !== id));
  };

  // ダイアログにフォーカス
  const handleFocusDialog = (id: string) => {
    const dialog = viewerDialogs.find((d) => d.id === id);
    if (dialog && dialog.zIndex !== nextZIndex - 1) {
      setViewerDialogs(
        viewerDialogs.map((d) =>
          d.id === id ? { ...d, zIndex: nextZIndex } : d
        )
      );
      setNextZIndex(nextZIndex + 1);
    }
  };

  // SubNetViewerを開く
  const handleOpenSubNetViewer = (data: SubnetData) => {
    setSubnetData(data);
  };

  // SubNetViewerを閉じる
  const handleCloseSubNetViewer = () => {
    setSubnetData(null);
  };

  return (
    <div data-testid="progress-check-table">
      {/* タスク一覧テーブル（メソッドはタブで選択済み） */}
      <TaskListTable
        tasks={tasks}
        selectedMethodId={null}
        projectStatus={projectStatus}
        onTaskAction={onTaskAction}
        onProgressRateClick={handleProgressRateClick}
        readOnly={readOnly}
      />
      
      {/* ViewRendererDialog群 */}
      {viewerDialogs.map((dialog) => (
        <ViewRendererDialog
          key={dialog.id}
          id={dialog.id}
          contentType="file"
          file={dialog.file}
          zIndex={dialog.zIndex}
          initialPosition={{ x: 100, y: 100 }}
          initialSize={{ width: 1200, height: 800 }}
          onClose={handleCloseDialog}
          onFocus={handleFocusDialog}
          onOpenSubNetViewer={handleOpenSubNetViewer}
        />
      ))}

      {/* SubNetViewer */}
      {subnetData && (
        <SubNetViewer
          open={true}
          nodeName={subnetData.transitionName}
          maimlData={subnetData.maimlData}
          templateMap={subnetData.templateMap}
          petriNetData={subnetData.petriNetData}
          onClose={handleCloseSubNetViewer}
        />
      )}
    </div>
  );
}
