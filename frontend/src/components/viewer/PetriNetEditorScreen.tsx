'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button, Spin, message } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { ReactFlowProvider } from 'reactflow';
import PetriNetEditor from '@/components/editor/PetriNetEditor';

/**
 * PetriNetエディタのフルスクリーン表示画面
 * 
 * ExperimentAdminMenuから呼び出され、プロジェクトの実験フローを編集する
 */

interface PetriNetEditorScreenProps {
  /** 編集するプロジェクトのID */
  projectId: string;
  /** プロジェクト名 */
  projectName: string;
  /** プロジェクト概要 */
  projectOverview?: string;
  /** 画面を閉じるコールバック */
  onClose: () => void;
}

/**
 * PetriNetエディタスクリーンコンポーネント
 */
export default function PetriNetEditorScreen({
  projectId,
  projectName,
  projectOverview,
  onClose
}: PetriNetEditorScreenProps) {
  // ステート管理
  const [isLoading, setIsLoading] = useState(true);
  const [maimlContent, setMaimlContent] = useState<string | undefined>(undefined);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  /**
   * プロジェクト情報とファイルを読み込む
   */
  useEffect(() => {
    loadProjectData();
  }, [projectId]);

  /**
   * プロジェクトデータの読み込み
   */
  const loadProjectData = async () => {
    try {
      setIsLoading(true);
      
      console.log('📂 [PetriNetEditorScreen] Loading project data:', projectId);
      console.log('📝 [PetriNetEditorScreen] Project name:', projectName);
      console.log('📄 [PetriNetEditorScreen] Project overview:', projectOverview);
      
      // TODO: プロジェクトに関連するMAIMLファイルを検索して読み込む
      // 以下の順で探す:
      // 1. プロジェクトのメインMAIMLファイル
      // 2. プロジェクトフォルダ内の*.maimlファイル
      // 3. なければundefined（新規作成）
      
      // 仮実装: 新規作成モードで開始
      setMaimlContent(undefined);
      
      console.log('✅ [PetriNetEditorScreen] MAIML content ready (新規作成モード)');
    } catch (error) {
      console.error('❌ [PetriNetEditorScreen] Failed to load project data:', error);
      message.error('プロジェクトの読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 戻るボタンのハンドラー
   */
  const handleBack = useCallback(() => {
    console.log('🔙 [PetriNetEditorScreen] Back button clicked');
    console.log('📝 [PetriNetEditorScreen] Has unsaved changes:', hasUnsavedChanges);
    
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
   * 保存処理のハンドラー
   */
  const handleSave = useCallback(async (content: string) => {
    try {
      console.log('💾 [PetriNetEditorScreen] Save initiated');
      console.log('📄 [PetriNetEditorScreen] Content length:', content.length);
      
      // TODO: 保存APIの実装
      // 以下の処理を行う:
      // 1. contentをS3に保存（org_xxx/projects/project_id/workflow.maiml）
      // 2. プロジェクトのメタデータを更新
      // 3. 保存日時を記録
      
      // 仮実装: ローカルストレージに保存
      const saveKey = `project-${projectId}-workflow`;
      localStorage.setItem(saveKey, content);
      
      console.log('✅ [PetriNetEditorScreen] Save completed successfully');
      message.success('保存しました');
      
      // 未保存フラグをクリア
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('❌ [PetriNetEditorScreen] Save failed:', error);
      message.error('保存に失敗しました');
      throw error; // エディタ側でハンドリング
    }
  }, [projectId]);

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
        <Spin size="large" tip="プロジェクトを読み込み中..." />
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
            実験フロー編集 - {projectName}
          </h1>
          {projectOverview && (
            <p style={{ 
              margin: '4px 0 0 0', 
              fontSize: '14px', 
              color: '#8c8c8c' 
            }}>
              {projectOverview}
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
          <PetriNetEditor
            initialContent={maimlContent}
            projectId={projectId}
            projectName={projectName}
            onSave={handleSave}
            onContentChange={handleContentChange}
          />
        </ReactFlowProvider>
      </div>
    </div>
  );
}
