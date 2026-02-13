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
  ReloadOutlined,
  DeleteOutlined,
  FolderOpenOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import useDraftManager from '../hooks/useDraftManager';
import { Draft, EditState } from '../../../types/editor';

const { Title, Text } = Typography;

interface DraftManagerProps {
  show: boolean;
  onClose: () => void;
  onLoadDraft: (data: Draft & { fileName?: string }) => void;
  currentEditState: EditState | null;
  userId: string;
  autoSaveEnabled?: boolean;
  onAutoSaveToggle?: (enabled: boolean) => void;
  currentDraftKey?: string | null;
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
}) => {
  // useDraftManager hook の使用
  const {
    drafts,
    isLoading,
    error,
    fetchDrafts,
    saveDraft,
    deleteDraft,
  } = useDraftManager(currentEditState, { userId });

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

  // 新規保存ダイアログを開く際に初期値を設定
  useEffect(() => {
    if (showSaveDialog && currentEditState?.fileName) {
      const defaultName = `Draft - ${currentEditState.fileName} - ${new Date().toLocaleString('ja-JP')}`;
      setNewDraftName(defaultName);
    }
  }, [showSaveDialog, currentEditState]);

  // イベントハンドラー

  /**
   * 新規保存ダイアログを開く
   */
  const handleOpenSaveDialog = () => {
    setShowSaveDialog(true);
  };

  /**
   * 新規保存実行
   */
  const handleSaveNew = async () => {
    if (!newDraftName.trim()) {
      Modal.error({ title: 'エラー', content: 'Draft名を入力してください' });
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
      });

      Modal.success({ title: '保存完了', content: 'Draftを保存しました' });
      setShowSaveDialog(false);
      setNewDraftName('');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      Modal.error({ title: '保存エラー', content: errorMessage });
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
        currentEditState.nodes?.length > 0 ? `${currentEditState.nodes.length}個のノード` : '',
        currentEditState.edges?.length > 0 ? `${currentEditState.edges.length}個のアーク` : '',
        currentEditState.templates && Object.keys(currentEditState.templates).length > 0
          ? `${Object.keys(currentEditState.templates).length}個のテンプレート`
          : '',
      ]
        .filter(Boolean)
        .join('、');

      Modal.confirm({
        title: '編集中のMaiMLを破棄して読み込みますか？',
        content: `現在のキャンバスには以下が存在します：\n${objectCounts}\n\n現在の編集内容は失われます。`,
        onOk: async () => {
          try {
            console.log('📖 [DraftManager V2] Draft読み込み:', draft.draft_key);

            const currentOrgId = localStorage.getItem('currentOrganizationId');
            const response = await fetch(
              `/api/s3/drafts/${encodeURIComponent(draft.draft_key)}?userId=${encodeURIComponent(userId)}&organizationId=${currentOrgId}`,
              { credentials: 'include' }
            );

            if (!response.ok) {
              throw new Error(`Draft読み込み失敗: ${response.status}`);
            }

            const data = await response.json();

            onLoadDraft({
              ...data.draft,
              fileName: data.draft.original_file_key || data.draft.draft_name,
            });

            onClose();
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            Modal.error({ title: '読み込みエラー', content: errorMessage });
          }
        },
      });
    } else {
      // コンテンツがない場合はそのまま読み込み
      try {
        console.log('📖 [DraftManager V2] Draft読み込み:', draft.draft_key);

        const currentOrgId = localStorage.getItem('currentOrganizationId');
        const response = await fetch(
          `/api/s3/drafts/${encodeURIComponent(draft.draft_key)}?userId=${encodeURIComponent(userId)}&organizationId=${currentOrgId}`,
          { credentials: 'include' }
        );

        if (!response.ok) {
          throw new Error(`Draft読み込み失敗: ${response.status}`);
        }

        const data = await response.json();

        onLoadDraft({
          ...data.draft,
          fileName: data.draft.original_file_key || data.draft.draft_name,
        });

        onClose();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        Modal.error({ title: '読み込みエラー', content: errorMessage });
      }
    }
  };

  /**
   * Draft削除実行
   */
  const handleDelete = async (draftKey: string, draftName: string) => {
    try {
      await deleteDraft(draftKey);
      Modal.success({ title: '削除完了', content: `"${draftName}" を削除しました` });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      Modal.error({ title: '削除エラー', content: errorMessage });
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
    let filtered = drafts;

    // 検索フィルター
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = drafts.filter(
        (draft) =>
          draft.draft_name.toLowerCase().includes(query) ||
          draft.original_file_key?.toLowerCase().includes(query)
      );
    }

    // 自動保存と手動保存に分ける
    const autoSaves = filtered
      .filter((d) => d.draft_name && d.draft_name.includes('自動保存'))
      .sort((a, b) => new Date(b.last_saved_at).getTime() - new Date(a.last_saved_at).getTime());

    const manuals = filtered.filter((d) => !d.draft_name || !d.draft_name.includes('自動保存'));

    // 手動保存をソート
    const sortedManuals = [...manuals].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.draft_name.localeCompare(b.draft_name);
        case 'nodeCount':
          return ((b.nodes?.length || 0) - (a.nodes?.length || 0));
        case 'date':
        default:
          return new Date(b.last_saved_at).getTime() - new Date(a.last_saved_at).getTime();
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
            <span>Draft管理</span>
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
            新規保存
          </Button>
          <Button icon={<ReloadOutlined />} onClick={() => fetchDrafts()} loading={isLoading}>
            更新
          </Button>

          {/* 自動保存トグル */}
          <Space>
            <Switch checked={autoSaveEnabled} onChange={handleAutoSaveToggle} />
            <Text>
              {autoSaveEnabled ? '🟢' : '⚪'} 自動保存
            </Text>
          </Space>

          <div style={{ flex: 1 }} />

          {/* 検索 */}
          <Input
            placeholder="検索..."
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
              { label: '📅 日付順', value: 'date' },
              { label: '📝 名前順', value: 'name' },
              { label: '🔢 ノード数順', value: 'nodeCount' },
            ]}
          />
        </Space>

        {/* 自動保存ステータス表示 */}
        {autoSaveEnabled && currentDraftKey && (
          <Alert
            message={`🟢 自動保存有効 | 編集中: ${currentDraftKey} | 間隔: 30秒`}
            type="success"
            style={{ marginBottom: 16 }}
          />
        )}

        {/* エラー表示 */}
        {error && (
          <Alert message="エラー" description={error} type="error" style={{ marginBottom: 16 }} showIcon />
        )}

        {/* Draft一覧 */}
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin size="large" />
          </div>
        ) : autoSaveDrafts.length === 0 && manualDrafts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
            <Text type="secondary">🔭 Draftがありません</Text>
            {searchQuery && <div><Text type="secondary">検索結果: 0件</Text></div>}
          </div>
        ) : (
          <>
            {/* 自動保存セクション */}
            {autoSaveDrafts.length > 0 && (
              <Card
                size="small"
                title={<Text strong style={{ color: '#1677ff' }}>🤖 自動保存（最大3世代）</Text>}
                style={{ marginBottom: 16, backgroundColor: '#f0f8ff' }}
              >
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Select
                    value={selectedAutoSaveGeneration}
                    onChange={setSelectedAutoSaveGeneration}
                    style={{ width: '100%', maxWidth: 300 }}
                    options={autoSaveDrafts.slice(0, 3).map((draft, index) => ({
                      label: `${index === 0 ? '最新' : `${index}世代前`} - ${new Date(draft.last_saved_at).toLocaleString('ja-JP', {
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
                        🔵 {autoSaveDrafts[selectedAutoSaveGeneration].nodes?.length || 0} ノード
                      </Tag>
                      <Tag color="blue">
                        🔗 {autoSaveDrafts[selectedAutoSaveGeneration].edges?.length || 0} アーク
                      </Tag>
                      <Button
                        type="primary"
                        icon={<FolderOpenOutlined />}
                        onClick={() => handleLoadDraft(autoSaveDrafts[selectedAutoSaveGeneration])}
                        loading={isLoading}
                      >
                        読み込み
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
                  <Text strong>💾 手動保存（{manualDrafts.length}件）</Text>
                </Divider>
                <List
                  dataSource={manualDrafts}
                  renderItem={(draft) => (
                    <Card size="small" style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text strong>{draft.draft_name}</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {new Date(draft.last_saved_at).toLocaleString('ja-JP')}
                        </Text>
                      </div>

                      <Space wrap style={{ marginBottom: 8 }}>
                        <Tag>🔵 {draft.nodes?.length || 0} ノード</Tag>
                        <Tag>🔗 {draft.edges?.length || 0} アーク</Tag>
                        <Tag>📋 {Object.keys(draft.templates || {}).length} テンプレート</Tag>
                      </Space>

                      {draft.original_file_key && (
                        <div style={{ marginBottom: 8 }}>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            📄 {draft.original_file_key}
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
                          読み込み
                        </Button>
                        <Popconfirm
                          title="Draft削除確認"
                          description={`"${draft.draft_name}" を削除しますか？`}
                          onConfirm={() => handleDelete(draft.draft_key, draft.draft_name)}
                          okText="削除"
                          cancelText="キャンセル"
                        >
                          <Button danger size="small" icon={<DeleteOutlined />} loading={isLoading}>
                            削除
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
        title="💾 新規Draft保存"
        open={showSaveDialog}
        onOk={handleSaveNew}
        onCancel={() => setShowSaveDialog(false)}
        okText="保存"
        cancelText="キャンセル"
        confirmLoading={isLoading}
      >
        <Input
          placeholder="Draft名を入力"
          value={newDraftName}
          onChange={(e) => setNewDraftName(e.target.value)}
          onPressEnter={handleSaveNew}
        />
      </Modal>
    </>
  );
};

export default DraftManager;