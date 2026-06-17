'use client';

/**
 * 暗号化管理メインコンポーネント
 *
 * @description
 * MAIMLファイルの暗号化・復号化・鍵管理を行うメイン画面。
 * 左ペイン: MAIMLツリー（暗号化対象の選択）
 * 右ペイン: 暗号化設定 + XMLプレビュー
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Layout, Typography, Tabs, Spin, Alert, message } from 'antd';
import { LockOutlined, KeyOutlined } from '@ant-design/icons';

import EncryptionTargetTree from './EncryptionTargetTree';
import EncryptionConfigPanel from './EncryptionConfigPanel';
import EncryptionPreviewPanel from './EncryptionPreviewPanel';
import KeyManagement from './KeyManagement';

import * as encryptionService from '@/services/encryptionService';
import type {
  MaimlTreeNode,
  EncryptionKey,
  EncryptionConfig,
  EncryptionPreviewResponse,
} from '@/types/encryption';
import { DEFAULT_ENCRYPTION_CONFIG } from '@/types/encryption';

const { Sider, Content } = Layout;
const { Title } = Typography;

interface EncryptionManagementProps {
  /** 対象プロジェクト名 */
  projectName: string;
}

const EncryptionManagement: React.FC<EncryptionManagementProps> = ({ projectName }) => {
  // ---------------------------------------------------------------------------
  // 状態管理
  // ---------------------------------------------------------------------------

  /** MAIMLツリー */
  const [treeData, setTreeData] = useState<MaimlTreeNode[]>([]);
  const [treeLoading, setTreeLoading] = useState(true);
  const [treeError, setTreeError] = useState<string | null>(null);

  /** 選択中のノードパス */
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<MaimlTreeNode | null>(null);

  /** 暗号化鍵一覧 */
  const [keys, setKeys] = useState<EncryptionKey[]>([]);

  /** 暗号化設定 */
  const [config, setConfig] = useState<EncryptionConfig>(DEFAULT_ENCRYPTION_CONFIG);

  /** プレビュー */
  const [preview, setPreview] = useState<EncryptionPreviewResponse | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  /** 暗号化実行中 */
  const [executing, setExecuting] = useState(false);

  /** 現在のタブ */
  const [activeTab, setActiveTab] = useState<string>('encrypt');

  // ---------------------------------------------------------------------------
  // データ取得
  // ---------------------------------------------------------------------------

  /** MAIMLツリーを取得 */
  const loadTree = useCallback(async () => {
    setTreeLoading(true);
    setTreeError(null);
    try {
      const structure = await encryptionService.getMaimlStructure(projectName);
      setTreeData(structure);
    } catch {
      setTreeError('MAIMLファイルの構造を取得できませんでした。');
    } finally {
      setTreeLoading(false);
    }
  }, [projectName]);

  /** 鍵一覧を取得 */
  const loadKeys = useCallback(async () => {
    try {
      const keyList = await encryptionService.listKeys();
      setKeys(keyList);
    } catch {
      // 鍵一覧取得失敗は警告のみ
      console.warn('鍵一覧の取得に失敗しました');
    }
  }, []);

  useEffect(() => {
    loadTree();
    loadKeys();
  }, [loadTree, loadKeys]);

  // ---------------------------------------------------------------------------
  // イベントハンドラ
  // ---------------------------------------------------------------------------

  /** ノード選択 */
  const handleSelectNode = useCallback((node: MaimlTreeNode) => {
    setSelectedPath(node.path);
    setSelectedNode(node);
    setPreview(null);
  }, []);

  /** プレビュー生成 */
  const handlePreview = useCallback(async () => {
    if (!selectedPath) return;
    setPreviewLoading(true);
    try {
      const result = await encryptionService.previewEncryption(projectName, config);
      setPreview(result);
    } catch {
      message.error('プレビューの生成に失敗しました。');
    } finally {
      setPreviewLoading(false);
    }
  }, [projectName, selectedPath, config]);

  /** 暗号化実行 */
  const handleEncrypt = useCallback(async () => {
    if (!selectedPath) return;
    setExecuting(true);
    try {
      await encryptionService.encryptElement(projectName, selectedPath, config);
      message.success('暗号化が完了しました。');
      // ツリーを再読み込みして暗号化状態を反映
      await loadTree();
      setSelectedPath(null);
      setSelectedNode(null);
      setPreview(null);
    } catch {
      message.error('暗号化に失敗しました。');
    } finally {
      setExecuting(false);
    }
  }, [projectName, selectedPath, config, loadTree]);

  // ---------------------------------------------------------------------------
  // レンダリング
  // ---------------------------------------------------------------------------

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* ページヘッダー */}
      <div style={{ padding: '16px 24px', borderBottom: '1px solid #f0f0f0' }}>
        <Title level={4} style={{ margin: 0 }}>
          <LockOutlined style={{ marginRight: 8 }} />
          暗号化管理：{projectName}
        </Title>
      </div>

      {/* メインタブ */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        style={{ flex: 1, padding: '0 16px' }}
        items={[
          {
            key: 'encrypt',
            label: (
              <span>
                <LockOutlined />
                暗号化・復号化
              </span>
            ),
            children: (
              <Layout style={{ height: 'calc(100vh - 200px)', background: 'transparent' }}>
                {/* 左ペイン: MAIMLツリー */}
                <Sider
                  width={320}
                  style={{
                    background: '#fff',
                    border: '1px solid #f0f0f0',
                    borderRadius: 8,
                    marginRight: 16,
                    overflow: 'auto',
                  }}
                >
                  <div style={{ padding: 16 }}>
                    <Typography.Text strong style={{ fontSize: 14 }}>
                      暗号化対象の選択
                    </Typography.Text>
                  </div>
                  {treeLoading ? (
                    <div style={{ textAlign: 'center', padding: 32 }}>
                      <Spin tip="読み込み中..." />
                    </div>
                  ) : treeError ? (
                    <Alert type="error" message={treeError} style={{ margin: 16 }} />
                  ) : (
                    <EncryptionTargetTree
                      treeData={treeData}
                      selectedPath={selectedPath}
                      onSelect={handleSelectNode}
                    />
                  )}
                </Sider>

                {/* 右ペイン: 設定 + プレビュー */}
                <Content style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <EncryptionConfigPanel
                    selectedNode={selectedNode}
                    config={config}
                    keys={keys}
                    onConfigChange={setConfig}
                    onPreview={handlePreview}
                    onEncrypt={handleEncrypt}
                    previewLoading={previewLoading}
                    executing={executing}
                  />
                  <EncryptionPreviewPanel preview={preview} loading={previewLoading} />
                </Content>
              </Layout>
            ),
          },
          {
            key: 'keys',
            label: (
              <span>
                <KeyOutlined />
                鍵管理
              </span>
            ),
            children: (
              <KeyManagement
                keys={keys}
                onKeysChange={loadKeys}
              />
            ),
          },
        ]}
      />
    </div>
  );
};

export default EncryptionManagement;
