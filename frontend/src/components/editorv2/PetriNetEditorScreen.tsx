'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button, Spin, message } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { ReactFlowProvider } from 'reactflow';
import PetriNetEditorInner from '@/components/editorv2/PetriNetEditorInner';
import { getFileContentAsText } from '@/services/fileAccessService';
import type { MaimlEditorParams } from '@/types/maimlEditor';

/**
 * PetriNetエディタのフルスクリーン表示画面
 *
 * ProjectManagement / FormatManagement から呼び出され、
 * MAIML ファイルを編集する汎用エディタ画面。
 * 旧 projectId / projectName / projectOverview Props は廃止し
 * MaimlEditorParams 一本化で受け取る。
 */

interface PetriNetEditorScreenProps {
  /** 編集パラメータ（共通型） */
  params: MaimlEditorParams;
  /** 画面を閉じるコールバック */
  onClose: () => void;
}

/**
 * PetriNetエディタスクリーンコンポーネント
 */
export default function PetriNetEditorScreen({
  params,
  onClose,
}: PetriNetEditorScreenProps) {
  const {
    editMode,
    editingFileName,
    originalFileName,
    sourceS3Key,
    displayTitle,
    displaySubtitle,
    documentId,
    description,
  } = params;

  // ステート管理
  const [isLoading, setIsLoading] = useState(true);
  const [maimlContent, setMaimlContent] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  /**
   * S3 から MAIML ファイルを読み込む
   * 存在しない場合（404 / null）は新規作成モードで開始
   */
  useEffect(() => {
    loadMaimlData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceS3Key]);

  const loadMaimlData = async () => {
    try {
      setIsLoading(true);
      console.log('📂 [PetriNetEditorScreen] Loading MAIML:', sourceS3Key);

      const content = await getFileContentAsText(sourceS3Key);
      setMaimlContent(content ?? null);

      if (content) {
        console.log('✅ [PetriNetEditorScreen] MAIML loaded from S3, length:', content.length);
      } else {
        console.log('✅ [PetriNetEditorScreen] No existing MAIML → 新規作成モード');
      }
    } catch (error) {
      console.error('❌ [PetriNetEditorScreen] Failed to load MAIML:', error);
      // ファイルが存在しない場合は新規作成として続行
      setMaimlContent(null);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 戻るボタンのハンドラー
   */
  const handleBack = useCallback(() => {
    console.log('🔙 [PetriNetEditorScreen] Back button clicked');

    if (hasUnsavedChanges) {
      const confirmed = window.confirm(
        '保存されていない変更があります。破棄して戻りますか？'
      );
      if (confirmed) {
        console.log('✅ [PetriNetEditorScreen] User confirmed, closing editor');
        onClose();
      } else {
        console.log('❌ [PetriNetEditorScreen] User cancelled');
      }
    } else {
      console.log('✅ [PetriNetEditorScreen] No unsaved changes, closing editor');
      onClose();
    }
  }, [hasUnsavedChanges, onClose]);

  /**
   * コンテンツ変更通知のハンドラー
   */
  const handleContentChange = useCallback(() => {
    if (!hasUnsavedChanges) {
      console.log('📝 [PetriNetEditorScreen] Content changed, marking as unsaved');
      setHasUnsavedChanges(true);
    }
  }, [hasUnsavedChanges]);

  // ローディング中
  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#f0f2f5'
      }}>
        <Spin size="large">
          <div style={{ minHeight: 100 }} />
        </Spin>
      </div>
    );
  }

  // メイン画面
  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      backgroundColor: '#ffffff'
    }}>
      {/* ヘッダーバー */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid #f0f0f0',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        backgroundColor: 'white',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        zIndex: 10
      }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={handleBack}
          size="middle"
        >
          戻る
        </Button>

        <div style={{ flex: 1 }}>
          <h1 style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: 600,
            color: '#262626'
          }}>
            {editMode === 'project' ? '実験フロー編集' : 'フォーマット編集'} - {displayTitle}
          </h1>
          {displaySubtitle && (
            <p style={{
              margin: '4px 0 0 0',
              fontSize: '14px',
              color: '#8c8c8c'
            }}>
              {displaySubtitle}
            </p>
          )}
        </div>

        {hasUnsavedChanges && (
          <div style={{
            padding: '4px 12px',
            backgroundColor: '#fff7e6',
            border: '1px solid #ffd591',
            borderRadius: '4px',
            fontSize: '14px',
            color: '#d46b08'
          }}>
            ● 未保存の変更があります
          </div>
        )}
      </div>

      {/* エディタ本体（ReactFlowProviderでラップ） */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <ReactFlowProvider>
          <PetriNetEditorInner
            maimlData={maimlContent}
            editingFileName={editingFileName}
            editMode={editMode}
            originalFileName={originalFileName}
            sourceS3Key={sourceS3Key}
            initialDocumentId={documentId}
            initialDescription={description}
          />
        </ReactFlowProvider>
      </div>
    </div>
  );
}
