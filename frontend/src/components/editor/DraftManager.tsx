/**
 * DraftManager - Draft管理UIコンポーネント
 * 
 * PetriNetEditor用Draft管理機能
 * - Draft一覧取得・表示
 * - Draft保存・読み込み・削除
 * - 自動保存と手動保存の分類
 * - 検索・ソート機能
 * 
 * @version 2.0.0
 * @date 2025-12-23
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  Button,
  Input,
  List,
  Typography,
  Space,
  Tag,
  Spin,
  Alert,
  Select,
  Switch,
  Card,
  Flex,
  theme
} from 'antd';
import {
  CloseOutlined,
  SaveOutlined,
  ReloadOutlined,
  DeleteOutlined,
  FolderOpenOutlined,
  SearchOutlined,
  SortAscendingOutlined
} from '@ant-design/icons';

const { Text } = Typography;

/**
 * Draft情報の型定義
 */
interface DraftInfo {
  draft_key: string;
  draft_name: string;
  original_file_key?: string;
  last_saved_at: string;
  node_count?: number;
  arc_count?: number;
  template_count?: number;
  nodes?: any[];
  edges?: any[];
  templates?: any;
  documentData?: any;
}

/**
 * 編集状態の型定義
 */
interface EditState {
  fileName?: string;
  nodes?: any[];
  edges?: any[];
  templates?: any;
  documentData?: any;
}

/**
 * DraftManagerのProps
 */
export interface DraftManagerProps {
  open: boolean;
  onClose: () => void;
  onLoad: (draft: any) => void;
  currentEditState?: EditState;
  userId: string;
  autoSaveEnabled?: boolean;
  onAutoSaveToggle?: (enabled: boolean) => void;
  currentDraftKey?: string | null;
}

/**
 * DraftManagerコンポーネント
 */
const DraftManager: React.FC<DraftManagerProps> = ({
  open,
  onClose,
  onLoad,
  currentEditState,
  userId,
  autoSaveEnabled = false,
  onAutoSaveToggle,
  currentDraftKey = null
}) => {
  const { token } = theme.useToken();
  const [drafts, setDrafts] = useState<DraftInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedDraft, setSelectedDraft] = useState<DraftInfo | null>(null);
  const [newDraftName, setNewDraftName] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'nodeCount'>('date');
  const [selectedAutoSaveGeneration, setSelectedAutoSaveGeneration] = useState(0);

  // userIdバリデーション
  useEffect(() => {
    if (!userId || userId === 'default-user' || userId === 'unknown-user') {
      console.error('❌ [DraftManager] Invalid userId:', userId);
      setError('ユーザーIDが正しく設定されていません。ログインし直してください。');
    } else {
      console.log('✅ [DraftManager] Valid userId:', userId);
    }
  }, [userId]);

  // Draft一覧取得
  const fetchDrafts = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('📂 [DraftManager] Draft一覧取得開始 - userId:', userId);
      const currentOrgId = localStorage.getItem('currentOrganizationId');
      const response = await fetch(`/api/s3/drafts?userId=${encodeURIComponent(userId)}&organizationId=${currentOrgId}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Draft取得失敗: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`✅ [DraftManager] Draft取得成功: ${data.drafts?.length || 0}件`);
      
      setDrafts(data.drafts || []);
    } catch (err) {
      console.error('❌ [DraftManager] Draft取得エラー:', err);
      setError(err instanceof Error ? err.message : 'Draft取得エラー');
      setDrafts([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Draft保存
  const saveDraft = async (draftData: any) => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('💾 [DraftManager] Draft保存開始:', draftData.draftName, '- userId:', userId);
      
      const currentOrgId = localStorage.getItem('currentOrganizationId');
      
      const arcs = draftData.edges?.map((edge: any) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
      })) || [];
      
      const response = await fetch('/api/s3/drafts/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...draftData,
          userId,
          organizationId: currentOrgId,
          arcs: arcs,
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Draft保存失敗: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('✅ [DraftManager] Draft保存成功:', result.draft?.draft_key);
      
      await fetchDrafts();
      
      return result;
    } catch (err) {
      console.error('❌ [DraftManager] Draft保存エラー:', err);
      setError(err instanceof Error ? err.message : 'Draft保存エラー');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Draft削除
  const deleteDraft = async (draftKey: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🗑️ [DraftManager] Draft削除開始:', draftKey, '- userId:', userId);
      
      const currentOrgId = localStorage.getItem('currentOrganizationId');
      const response = await fetch(
        `/api/s3/drafts/${encodeURIComponent(draftKey)}?userId=${encodeURIComponent(userId)}&organizationId=${currentOrgId}`,
        { 
          method: 'DELETE',
          credentials: 'include'
        }
      );
      
      if (!response.ok) {
        throw new Error(`Draft削除失敗: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('✅ [DraftManager] Draft削除成功');
      
      await fetchDrafts();
      
      return result;
    } catch (err) {
      console.error('❌ [DraftManager] Draft削除エラー:', err);
      setError(err instanceof Error ? err.message : 'Draft削除エラー');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // モーダル表示時にDraft一覧を取得
  useEffect(() => {
    if (open) {
      console.log('📄 [DraftManager] モーダル表示 - Draft一覧取得');
      fetchDrafts();
    }
  }, [open]);

  // 新規保存ダイアログを開く際に初期値を設定
  useEffect(() => {
    if (showSaveDialog && currentEditState?.fileName) {
      const defaultName = `Draft - ${currentEditState.fileName} - ${new Date().toLocaleString('ja-JP')}`;
      setNewDraftName(defaultName);
    }
  }, [showSaveDialog, currentEditState]);

  // 新規保存実行
  const handleSaveNew = async () => {
    if (!newDraftName.trim()) {
      Modal.warning({ title: '入力エラー', content: 'Draft名を入力してください' });
      return;
    }

    try {
      const draftKey = `draft_${Date.now()}`;
      
      const draftData = {
        draftKey,
        draftName: newDraftName,
        originalFileKey: currentEditState?.fileName || '',
        nodes: currentEditState?.nodes || [],
        edges: currentEditState?.edges || [],
        templates: currentEditState?.templates || {},
        documentData: currentEditState?.documentData || {}
      };
      
      await saveDraft(draftData);

      Modal.success({ title: '保存完了', content: 'Draftを保存しました' });
      setShowSaveDialog(false);
      setNewDraftName('');
    } catch (error) {
      Modal.error({ 
        title: 'エラー', 
        content: `Draft保存エラー: ${error instanceof Error ? error.message : '不明なエラー'}` 
      });
    }
  };

  // Draft読み込み
  const handleLoadDraft = async (draft: DraftInfo) => {
    try {
      const hasExistingContent = currentEditState && (
        (currentEditState.nodes && currentEditState.nodes.length > 0) ||
        (currentEditState.edges && currentEditState.edges.length > 0) ||
        (currentEditState.templates && Object.keys(currentEditState.templates).length > 0)
      );
      
      if (hasExistingContent) {
        const objectCounts = [
          currentEditState.nodes?.length ? `${currentEditState.nodes.length}個のノード` : '',
          currentEditState.edges?.length ? `${currentEditState.edges.length}個のアーク` : '',
          currentEditState.templates && Object.keys(currentEditState.templates).length 
            ? `${Object.keys(currentEditState.templates).length}個のテンプレート` : ''
        ].filter(Boolean).join('、');
        
        Modal.confirm({
          title: '確認',
          content: `⚠️ 編集中のMaiMLを破棄して読み込みますか？\n\n現在のキャンバスには以下が存在します：\n${objectCounts}`,
          onOk: async () => {
            await loadDraftData(draft);
          }
        });
        return;
      }
      
      await loadDraftData(draft);
    } catch (error) {
      console.error('❌ [DraftManager] Draft読み込みエラー:', error);
      Modal.error({ 
        title: 'エラー', 
        content: `Draft読み込みエラー: ${error instanceof Error ? error.message : '不明なエラー'}` 
      });
    }
  };

  const loadDraftData = async (draft: DraftInfo) => {
    console.log('📖 [DraftManager] Draft読み込み:', draft.draft_key, '- userId:', userId);
    
    const currentOrgId = localStorage.getItem('currentOrganizationId');
    const response = await fetch(
      `/api/s3/drafts/${encodeURIComponent(draft.draft_key)}?userId=${encodeURIComponent(userId)}&organizationId=${currentOrgId}`,
      { credentials: 'include' }
    );
    
    if (!response.ok) {
      throw new Error(`Draft読み込み失敗: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (onLoad) {
      onLoad({
        ...data.draft,
        fileName: data.draft.original_file_key || data.draft.draft_name
      });
    }
    
    onClose();
  };

  // Draft削除実行
  const handleDeleteConfirm = async () => {
    if (!selectedDraft) return;

    try {
      await deleteDraft(selectedDraft.draft_key);
      Modal.success({ title: '削除完了', content: 'Draftを削除しました' });
      setShowDeleteConfirm(false);
      setSelectedDraft(null);
    } catch (error) {
      Modal.error({ 
        title: 'エラー', 
        content: `Draft削除エラー: ${error instanceof Error ? error.message : '不明なエラー'}` 
      });
    }
  };

  // フィルタリング・ソート
  const { autoSaveDrafts, manualDrafts } = useMemo(() => {
    let filtered = drafts;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = drafts.filter(draft =>
        draft.draft_name.toLowerCase().includes(query) ||
        draft.original_file_key?.toLowerCase().includes(query)
      );
    }

    const autoSaves = filtered.filter(d => 
      d.draft_name && d.draft_name.includes('自動保存')
    ).sort((a, b) => new Date(b.last_saved_at).getTime() - new Date(a.last_saved_at).getTime());

    const manuals = filtered.filter(d => 
      !d.draft_name || !d.draft_name.includes('自動保存')
    );

    const sortedManuals = [...manuals].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.draft_name.localeCompare(b.draft_name);
        case 'nodeCount':
          return (b.node_count || 0) - (a.node_count || 0);
        case 'date':
        default:
          return new Date(b.last_saved_at).getTime() - new Date(a.last_saved_at).getTime();
      }
    });

    return {
      autoSaveDrafts: autoSaves,
      manualDrafts: sortedManuals
    };
  }, [drafts, searchQuery, sortBy]);

  if (!open) return null;

  return (
    <>
      {/* メインモーダル */}
      <Modal
        title={<Text strong>📂 Draft管理</Text>}
        open={open}
        onCancel={onClose}
        width={900}
        style={{ top: 20 }}
        styles={{
          body: {
            maxHeight: 'calc(80vh - 100px)',
            overflowY: 'auto'
          }
        }}
        footer={null}
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          {/* ツールバー */}
          <Flex gap="small" wrap="wrap" align="center">
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={() => setShowSaveDialog(true)}
              disabled={isLoading}
            >
              新規保存
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchDrafts}
              disabled={isLoading}
            >
              更新
            </Button>
            
            <Flex align="center" gap="small">
              <Switch
                checked={autoSaveEnabled}
                onChange={(checked) => onAutoSaveToggle?.(checked)}
              />
              <Text>{autoSaveEnabled ? '🟢' : '⚪'} 自動保存</Text>
            </Flex>

            <div style={{ flex: 1 }} />

            <Input
              placeholder="検索..."
              prefix={<SearchOutlined />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: 200 }}
              allowClear
            />

            <Select
              value={sortBy}
              onChange={setSortBy}
              style={{ width: 150 }}
              options={[
                { label: '📅 日付順', value: 'date' },
                { label: '📝 名前順', value: 'name' },
                { label: '🔢 ノード数順', value: 'nodeCount' }
              ]}
            />
          </Flex>

          {/* 自動保存ステータス */}
          {autoSaveEnabled && currentDraftKey && (
            <Alert
              message={`🟢 自動保存有効 | 編集中: ${currentDraftKey} | 間隔: 30秒`}
              type="success"
              showIcon
            />
          )}

          {/* エラー表示 */}
          {error && (
            <Alert
              message={`⚠️ エラー: ${error}`}
              type="error"
              showIcon
              closable
              onClose={() => setError(null)}
            />
          )}

          {/* Draft一覧 */}
          {isLoading ? (
            <Flex justify="center" align="center" style={{ minHeight: 200 }}>
              <Spin size="large" />
            </Flex>
          ) : autoSaveDrafts.length === 0 && manualDrafts.length === 0 ? (
            <Flex vertical align="center" justify="center" style={{ padding: '40px 0', color: token.colorTextSecondary }}>
              <Text>🔭 Draftがありません</Text>
              {searchQuery && <Text type="secondary">検索結果: 0件</Text>}
            </Flex>
          ) : (
            <>
              {/* 自動保存セクション */}
              {autoSaveDrafts.length > 0 && (
                <Card
                  style={{ backgroundColor: '#f0f8ff', marginBottom: 16 }}
                  size="small"
                >
                  <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                    <Text strong style={{ color: token.colorPrimary }}>
                      🤖 自動保存（最大3世代）
                    </Text>
                    <Flex gap="middle" wrap="wrap" align="center">
                      <Select
                        value={selectedAutoSaveGeneration}
                        onChange={setSelectedAutoSaveGeneration}
                        style={{ minWidth: 250 }}
                        options={autoSaveDrafts.slice(0, 3).map((draft, index) => ({
                          label: `${index === 0 ? '最新' : `${index}世代前`} - ${new Date(draft.last_saved_at).toLocaleString('ja-JP', {
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}`,
                          value: index
                        }))}
                      />
                      
                      {autoSaveDrafts[selectedAutoSaveGeneration] && (
                        <>
                          <Space>
                            <Tag color="blue">🔵 {autoSaveDrafts[selectedAutoSaveGeneration].node_count || 0} ノード</Tag>
                            <Tag color="blue">🔗 {autoSaveDrafts[selectedAutoSaveGeneration].arc_count || 0} アーク</Tag>
                          </Space>
                          <Button
                            type="primary"
                            icon={<FolderOpenOutlined />}
                            onClick={() => handleLoadDraft(autoSaveDrafts[selectedAutoSaveGeneration])}
                            disabled={isLoading}
                          >
                            読み込み
                          </Button>
                        </>
                      )}
                    </Flex>
                  </Space>
                </Card>
              )}

              {/* 手動保存セクション */}
              {manualDrafts.length > 0 && (
                <>
                  <Text strong style={{ display: 'block', marginTop: 16, marginBottom: 8 }}>
                    💾 手動保存（{manualDrafts.length}件）
                  </Text>
                  <List
                    dataSource={manualDrafts}
                    renderItem={(draft) => (
                      <Card size="small" style={{ marginBottom: 8 }}>
                        <Space direction="vertical" size="small" style={{ width: '100%' }}>
                          <Flex justify="space-between" align="flex-start">
                            <Text strong>{draft.draft_name}</Text>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {new Date(draft.last_saved_at).toLocaleString('ja-JP')}
                            </Text>
                          </Flex>

                          <Space size="small" wrap>
                            <Tag>🔵 {draft.node_count || 0} ノード</Tag>
                            <Tag>🔗 {draft.arc_count || 0} アーク</Tag>
                            <Tag>📋 {draft.template_count || 0} テンプレート</Tag>
                          </Space>

                          {draft.original_file_key && (
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              📄 {draft.original_file_key}
                            </Text>
                          )}

                          <Space>
                            <Button
                              type="primary"
                              size="small"
                              icon={<FolderOpenOutlined />}
                              onClick={() => handleLoadDraft(draft)}
                              disabled={isLoading}
                            >
                              読み込み
                            </Button>
                            <Button
                              danger
                              size="small"
                              icon={<DeleteOutlined />}
                              onClick={() => {
                                setSelectedDraft(draft);
                                setShowDeleteConfirm(true);
                              }}
                              disabled={isLoading}
                            >
                              削除
                            </Button>
                          </Space>
                        </Space>
                      </Card>
                    )}
                  />
                </>
              )}
            </>
          )}
        </Space>
      </Modal>

      {/* 新規保存ダイアログ */}
      <Modal
        title="💾 新規Draft保存"
        open={showSaveDialog}
        onCancel={() => setShowSaveDialog(false)}
        onOk={handleSaveNew}
        okText="保存"
        cancelText="キャンセル"
        confirmLoading={isLoading}
      >
        <Input
          placeholder="Draft名"
          value={newDraftName}
          onChange={(e) => setNewDraftName(e.target.value)}
          onPressEnter={handleSaveNew}
          autoFocus
        />
      </Modal>

      {/* 削除確認ダイアログ */}
      <Modal
        title="🗑️ Draft削除確認"
        open={showDeleteConfirm}
        onCancel={() => setShowDeleteConfirm(false)}
        onOk={handleDeleteConfirm}
        okText="削除"
        okType="danger"
        cancelText="キャンセル"
        confirmLoading={isLoading}
      >
        <Space direction="vertical">
          <Text>以下のDraftを削除しますか?</Text>
          <Text strong>{selectedDraft?.draft_name}</Text>
        </Space>
      </Modal>
    </>
  );
};

export default DraftManager;
