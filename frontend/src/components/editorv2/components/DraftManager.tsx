/**
 * DraftManager - Draft管理UIコンポーネント（V2版）
 * PetriNetEditorV2用にAnt Designで実装
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  Button,
  Input,
  List,
  Typography,
  Space,
  Spin,
  Alert,
  Select,
  Switch,
  Card,
  Popconfirm,
  Tag,
  Divider,
} from 'antd';
import {
  SaveOutlined,
  DeleteOutlined,
  FolderOpenOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import useDraftManager from '../hooks/useDraftManager';
import { Draft, EditState } from '../../../types/editor';
import * as draftService from '@/services/draftService';
import { useLanguage } from '@/contexts/LanguageContext';

const { Text } = Typography;

interface DraftManagerProps {
  show: boolean;
  onClose: () => void;
  onLoadDraft: (data: Draft & { fileName?: string }) => void;
  currentEditState: EditState | null;
  userId: string;
  autoSaveEnabled?: boolean;
  onAutoSaveToggle?: (enabled: boolean) => void;
  currentDraftKey?: string | null;
  /** プロジェクトID（保存時に記録し、復元時のプロジェクト特定に使用） */
  projectId?: string;
}

const DraftManager: React.FC<DraftManagerProps> = ({
  show,
  onClose,
  onLoadDraft,
  currentEditState,
  userId,
  autoSaveEnabled = false,
  onAutoSaveToggle,
  currentDraftKey = null,
  projectId,
}) => {
  const { t } = useLanguage();

  // useDraftManager hook の使用
  const {
    drafts,
    isLoading,
    error,
    fetchDrafts,
    saveDraft,
    deleteDraft,
  } = useDraftManager(currentEditState, { userId, projectId });

  // ローカル状態管理
  const [searchQuery, setSearchQuery] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newDraftName, setNewDraftName] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'nodeCount'>('date');
  const [selectedAutoSaveGeneration, setSelectedAutoSaveGeneration] = useState(0);

  // userIdバリデーション
  useEffect(() => {
    if (!userId || userId === 'default-user' || userId === 'unknown-user') {
      console.error('❌ [DraftManager V2] Invalid userId:', userId);
    }
  }, [userId]);

  // モーダル表示時にDraft一覧を取得
  useEffect(() => {
    if (show) {
      console.log('📄 [DraftManager V2] モーダル表示 - Draft一覧取得');
      fetchDrafts();
    }
  }, [show, fetchDrafts]);

  // イベントハンドラー

  /**
   * 新規保存ダイアログを開く
   */
  const handleOpenSaveDialog = () => {
    // ダイアログを開く際に初期値を設定
    if (currentEditState?.fileName) {
      const defaultName = `Draft - ${currentEditState.fileName} - ${new Date().toLocaleString('ja-JP')}`;
      setNewDraftName(defaultName);
    }
    setShowSaveDialog(true);
  };

  /**
   * 新規保存実行
   */
  const handleSaveNew = async () => {
    if (!newDraftName.trim()) {
      Modal.error({ title: t('draftManager.saveDialogErrorTitle'), content: t('draftManager.saveDialogErrorContent') });
      return;
    }

    try {
      const draftKey = `draft_${Date.now()}`;

      await saveDraft({
        draftKey,
        draftName: newDraftName,
        originalFileKey: currentEditState?.fileName || '',
        nodes: currentEditState?.nodes || [],
        edges: currentEditState?.edges || [],
        templates: currentEditState?.templates || [],
        documentData: currentEditState?.documentData,
        lastSavedAt: new Date().toISOString(),
        projectId: projectId || null,
      });

      Modal.success({ title: t('draftManager.saveSuccess'), content: t('draftManager.saveSuccessContent') });
      setShowSaveDialog(false);
      setNewDraftName('');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      Modal.error({ title: t('draftManager.saveError'), content: errorMessage });
    }
  };

  /**
   * Draft読み込み（確認ダイアログ付き）
   */
  const handleLoadDraft = async (draft: Draft) => {
    // キャンバス上にオブジェクトが存在する場合は警告
    const hasExistingContent =
      currentEditState &&
      ((currentEditState.nodes && currentEditState.nodes.length > 0) ||
        (currentEditState.edges && currentEditState.edges.length > 0) ||
        (currentEditState.templates && Object.keys(currentEditState.templates).length > 0));

    if (hasExistingContent) {
      const objectCounts = [
        currentEditState.nodes?.length > 0 ? `${currentEditState.nodes.length}${t('draftManager.nodeUnit')}` : '',
        currentEditState.edges?.length > 0 ? `${currentEditState.edges.length}${t('draftManager.arcUnit')}` : '',
        currentEditState.templates && Object.keys(currentEditState.templates).length > 0
          ? `${Object.keys(currentEditState.templates).length}${t('draftManager.templateUnit')}`
          : '',
      ]
        .filter(Boolean)
        .join(t('common.searchJoiner'));

      Modal.confirm({
        title: t('draftManager.loadConfirmTitle'),
        content: t('draftManager.loadConfirmContent').replace('{{objects}}', objectCounts),
        onOk: async () => {
          try {
            const data = await draftService.fetchDraftById(draft.draftKey);

            console.log('🔍 [DraftManager V2] Draft読み込みデータ:', {
              data,
              nodes長さ: data.nodes?.length,
              edges長さ: data.edges?.length,
              templates: data.templates,
              fileName: data.originalFileKey || data.draftName,
            });

            const loadData = {
              ...data,
              fileName: data.originalFileKey || data.draftName,
            };

            console.log('📤 [DraftManager V2] 親コンポーネントに渡すデータ:', loadData);

            onLoadDraft(loadData);

            onClose();
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            Modal.error({ title: t('draftManager.loadError'), content: errorMessage });
          }
        },
      });
    } else {
      // コンテンツがない場合はそのまま読み込み
      try {
        const data = await draftService.fetchDraftById(draft.draftKey);

        console.log('🔍 [DraftManager V2] Draft読み込みデータ:', {
          data,
          nodes長さ: data.nodes?.length,
          edges長さ: data.edges?.length,
          templates: data.templates,
          fileName: data.originalFileKey || data.draftName,
        });

        const loadData = {
          ...data,
          fileName: data.originalFileKey || data.draftName,
        };

        console.log('📤 [DraftManager V2] 親コンポーネントに渡すデータ:', loadData);

        onLoadDraft(loadData);

        onClose();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        Modal.error({ title: t('draftManager.loadError'), content: errorMessage });
      }
    }
  };

  /**
   * Draft削除実行
   */
  const handleDelete = async (draftKey: string, draftName: string) => {
    try {
      await deleteDraft(draftKey);
      Modal.success({ title: t('draftManager.deleteSuccess'), content: t('draftManager.deleteSuccessContent').replace('{{name}}', draftName) });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      Modal.error({ title: t('draftManager.deleteError'), content: errorMessage });
    }
  };

  /**
   * 自動保存トグル
   */
  const handleAutoSaveToggle = (checked: boolean) => {
    if (onAutoSaveToggle) {
      onAutoSaveToggle(checked);
    }
  };

  // フィルタリング・ソート
  const { autoSaveDrafts, manualDrafts } = useMemo(() => {
    // 🔧 修正: drafts が配列であることを保証
    const draftArray = Array.isArray(drafts) ? drafts : [];
    
    console.log('🔍 [DraftManager V2] フィルタリング実行:', {
      drafts配列: draftArray,
      drafts長さ: draftArray.length,
      drafts型: typeof drafts,
      drafts配列判定: Array.isArray(drafts)
    });
    
    let filtered = draftArray;

    // 検索フィルター
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = draftArray.filter(
        (draft) =>
          draft.draftName.toLowerCase().includes(query) ||
          draft.originalFileKey?.toLowerCase().includes(query)
      );
    }

    // 自動保存と手動保存に分ける
    const autoSaves = filtered.filter((d : Draft) => d.draftName && d.draftName.includes('自動保存'))
      .sort((a, b) => new Date(b.lastSavedAt).getTime() - new Date(a.lastSavedAt).getTime());

    const manuals = filtered.filter((d) => !d.draftName || !d.draftName.includes('自動保存'));

    // 手動保存をソート
    const sortedManuals = [...manuals].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.draftName.localeCompare(b.draftName);
        case 'nodeCount':
          return ((b.nodes?.length || 0) - (a.nodes?.length || 0));
        case 'date':
        default:
          return new Date(b.lastSavedAt || new Date()).getTime() - new Date(a.lastSavedAt || new Date()).getTime();
      }
    });

    return {
      autoSaveDrafts: autoSaves,
      manualDrafts: sortedManuals,
    };
  }, [drafts, searchQuery, sortBy]);

  if (!show) return null;

  return (
    <>
      {/* メインモーダル */}
      <Modal
        title={
          <Space>
            <FolderOpenOutlined />
            <span>{t('draftManager.title')}</span>
          </Space>
        }
        open={show}
        onCancel={onClose}
        width={900}
        footer={null}
        styles={{ body: { maxHeight: '70vh', overflowY: 'auto' } }}
      >
        {/* ツールバー */}
        <Space style={{ marginBottom: 16, flexWrap: 'wrap', width: '100%' }}>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleOpenSaveDialog}
            loading={isLoading}
          >
            {t('draftManager.saveButton')}
          </Button>

          {/* 自動保存トグル */}
          <Space>
            <Switch checked={autoSaveEnabled} onChange={handleAutoSaveToggle} />
            <Text>
              {autoSaveEnabled ? '🟢' : '⚪'} {t('draftManager.autoSave')}
            </Text>
          </Space>

          <div style={{ flex: 1 }} />

          {/* 検索 */}
          <Input
            placeholder={t('draftManager.searchPlaceholder')}
            prefix={<SearchOutlined />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: 200 }}
            allowClear
          />

          {/* ソート */}
          <Select
            value={sortBy}
            onChange={setSortBy}
            style={{ width: 150 }}
            options={[
              { label: t('draftManager.sortDate'), value: 'date' },
              { label: t('draftManager.sortName'), value: 'name' },
              { label: t('draftManager.sortNodeCount'), value: 'nodeCount' },
            ]}
          />
        </Space>

        {/* 自動保存ステータス表示 */}
        {autoSaveEnabled && currentDraftKey && (
          <Alert
            title={t('draftManager.autoSaveStatus').replace('{{key}}', currentDraftKey || '')}
            type="success"
            style={{ marginBottom: 16 }}
          />
        )}

        {/* エラー表示 */}
        {error && (
          <Alert title={t('draftManager.errorTitle')} description={error} type="error" style={{ marginBottom: 16 }} showIcon />
        )}

        {/* Draft一覧 */}
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin size="large" />
          </div>
        ) : autoSaveDrafts.length === 0 && manualDrafts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
            <Text type="secondary">{t('draftManager.noDrafts')}</Text>
            {searchQuery && <div><Text type="secondary">{t('draftManager.searchResultEmpty')}</Text></div>}
          </div>
        ) : (
          <>
            {/* 自動保存セクション */}
            {autoSaveDrafts.length > 0 && (
              <Card
                size="small"
                title={<Text strong style={{ color: '#1677ff' }}>{t('draftManager.autoSaveSection')}</Text>}
                style={{ marginBottom: 16, backgroundColor: '#f0f8ff' }}
              >
                <Space orientation="vertical" style={{ width: '100%' }}>
                  <Select
                    value={selectedAutoSaveGeneration}
                    onChange={setSelectedAutoSaveGeneration}
                    style={{ width: '100%', maxWidth: 300 }}
                    options={autoSaveDrafts.slice(0, 3).map((draft, index) => ({
                      label: `${index === 0 ? t('draftManager.autoSaveLatest') : t('draftManager.autoSaveGeneration').replace('{{count}}', String(index))} - ${new Date(draft.lastSavedAt || new Date()).toLocaleString('ja-JP', {
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}`,
                      value: index,
                    }))}
                  />

                  {autoSaveDrafts[selectedAutoSaveGeneration] && (
                    <Space>
                      <Tag color="blue">
                        {t('draftManager.nodeCount').replace('{{count}}', String(autoSaveDrafts[selectedAutoSaveGeneration].nodes?.length || 0))}
                      </Tag>
                      <Tag color="blue">
                        {t('draftManager.arcCount').replace('{{count}}', String(autoSaveDrafts[selectedAutoSaveGeneration].edges?.length || 0))}
                      </Tag>
                      <Button
                        type="primary"
                        icon={<FolderOpenOutlined />}
                        onClick={() => handleLoadDraft(autoSaveDrafts[selectedAutoSaveGeneration])}
                        loading={isLoading}
                      >
                        {t('draftManager.loadButton')}
                      </Button>
                    </Space>
                  )}
                </Space>
              </Card>
            )}

            {/* 手動保存セクション */}
            {manualDrafts.length > 0 && (
              <>
                <Divider>
                  <Text strong>{t('draftManager.manualSaveSection').replace('{{count}}', String(manualDrafts.length))}</Text>
                </Divider>
                <List
                  dataSource={manualDrafts}
                  renderItem={(draft) => (
                    <Card size="small" style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text strong>{draft.draftName}</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {new Date(draft.lastSavedAt || new Date()).toLocaleString('ja-JP')}
                        </Text>
                      </div>

                      <Space wrap style={{ marginBottom: 8 }}>
                        <Tag>{t('draftManager.nodeCount').replace('{{count}}', String(draft.nodes?.length || 0))}</Tag>
                        <Tag>{t('draftManager.arcCount').replace('{{count}}', String(draft.edges?.length || 0))}</Tag>
                        <Tag>{t('draftManager.templateCount').replace('{{count}}', String(Object.keys(draft.templates || {}).length))}</Tag>
                      </Space>

                      {draft.originalFileKey && (
                        <div style={{ marginBottom: 8 }}>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            📄 {draft.originalFileKey}
                          </Text>
                        </div>
                      )}

                      <Space>
                        <Button
                          type="primary"
                          size="small"
                          icon={<FolderOpenOutlined />}
                          onClick={() => handleLoadDraft(draft)}
                          loading={isLoading}
                        >
                          {t('draftManager.loadButton')}
                        </Button>
                        <Popconfirm
                          title={t('draftManager.deleteConfirmTitle')}
                          description={t('draftManager.deleteConfirmDescription').replace('{{name}}', draft.draftName)}
                          onConfirm={() => handleDelete(draft.draftKey, draft.draftName)}
                          okText={t('draftManager.deleteOkText')}
                          cancelText={t('draftManager.deleteCancelText')}
                        >
                          <Button danger size="small" icon={<DeleteOutlined />} loading={isLoading}>
                            {t('draftManager.deleteButton')}
                          </Button>
                        </Popconfirm>
                      </Space>
                    </Card>
                  )}
                />
              </>
            )}
          </>
        )}
      </Modal>

      {/* 新規保存モーダル */}
      <Modal
        title={t('draftManager.saveDialogTitle')}
        open={showSaveDialog}
        onOk={handleSaveNew}
        onCancel={() => setShowSaveDialog(false)}
        okText={t('draftManager.saveDialogOkText')}
        cancelText={t('draftManager.saveDialogCancelText')}
        confirmLoading={isLoading}
      >
        <Input
          placeholder={t('draftManager.saveDialogPlaceholder')}
          value={newDraftName}
          onChange={(e) => setNewDraftName(e.target.value)}
          onPressEnter={handleSaveNew}
        />
      </Modal>
    </>
  );
};

export default DraftManager;
