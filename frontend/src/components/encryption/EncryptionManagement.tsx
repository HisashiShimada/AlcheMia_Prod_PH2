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
import { Layout, Typography, Spin, Alert, message, Tabs, Space, Button, Tooltip, Modal } from 'antd';
import {
  LockOutlined, SyncOutlined, ScissorOutlined, CloseOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';

import EncryptionTargetTree from './EncryptionTargetTree';
import EncryptionConfigPanel from './EncryptionConfigPanel';
import EncryptionPreviewPanel from './EncryptionPreviewPanel';
import EncryptedElementsListTab from './EncryptedElementsListTab';
import DecryptionPanel from './DecryptionPanel';
import SplitWizardModal from './SplitWizardModal';

import * as encryptionService from '@/services/encryptionService';
import type {
  MaimlTreeNode,
  EncryptionKey,
  EncryptionConfig,
  EncryptionPreviewResponse,
  EncryptedChildElement,
  UpaViolation,
} from '@/types/encryption';
import { DEFAULT_ENCRYPTION_CONFIG } from '@/types/encryption';

const { Sider, Content } = Layout;
const { Title } = Typography;

interface EncryptionManagementProps {
  /** 対象プロジェクト名 */
  projectName: string;
  /** モーダルを閉じるコールバック */
  onClose?: () => void;
}

const EncryptionManagement: React.FC<EncryptionManagementProps> = ({ projectName, onClose }) => {
  // ---------------------------------------------------------------------------
  // 状態管理
  // ---------------------------------------------------------------------------

  /** MAIMLツリー */
  const [treeData, setTreeData] = useState<MaimlTreeNode[]>([]);
  const [treeLoading, setTreeLoading] = useState(true);
  const [treeError, setTreeError] = useState<string | null>(null);

  /** 選択中のノードパス（クリック選択） */
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<MaimlTreeNode | null>(null);

  /** チェック済みパスの Set（チェックボックス選択） */
  const [checkedPaths, setCheckedPaths] = useState<Set<string>>(new Set());

  /** 暗号化鍵一覧 */
  const [keys, setKeys] = useState<EncryptionKey[]>([]);

  /** 暗号化設定 */
  const [config, setConfig] = useState<EncryptionConfig>(DEFAULT_ENCRYPTION_CONFIG);

  /** プレビュー */
  const [preview, setPreview] = useState<EncryptionPreviewResponse | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  /** 暗号化実行中 */
  const [executing, setExecuting] = useState(false);

  /** 右ペインのアクティブタブ（デフォルト: 暗号化設定） */
  const [rightTab, setRightTab] = useState<'config' | 'preview' | 'encrypted-list' | 'decrypt'>('config');

  /** 暗号化確認ダイアログ */
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  /** 分割ウィザード */
  const [splitWizardOpen, setSplitWizardOpen] = useState(false);
  const [upaViolations, setUpaViolations] = useState<UpaViolation[]>([]);
  const hasUpaViolation = upaViolations.length > 0;

  /** 暗号化済み子要素一覧 */
  const [encryptedChildren, setEncryptedChildren] = useState<EncryptedChildElement[]>([]);
  const [encryptedChildrenLoading, setEncryptedChildrenLoading] = useState(false);

  /** 復号化プレビュー（EncryptionPreviewPanel に渡せるよう EncryptionPreviewResponse として管理） */
  const [decryptPreview, setDecryptPreview] = useState<EncryptionPreviewResponse | null>(null);
  const [decryptPreviewLoading, setDecryptPreviewLoading] = useState(false);

  /** 復号化実行中 */
  const [decryptExecuting, setDecryptExecuting] = useState(false);

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

  /** プレビュー生成（path と config を直接受け取るコア実装） */
  const runPreview = useCallback(async (
    path: string,
    previewConfig: EncryptionConfig,
  ) => {
    setPreviewLoading(true);
    try {
      const result = await encryptionService.previewEncryption(projectName, previewConfig);
      setPreview(result);
    } catch {
      message.error('プレビューの生成に失敗しました。');
    } finally {
      setPreviewLoading(false);
    }
  }, [projectName]);

  /**
   * ノード選択
   * 選択直後にデフォルト設定（DEFAULT_ENCRYPTION_CONFIG）でプレビューを即時実行する
   * タブは暗号化設定のまま維持する
   */
  const handleSelectNode = useCallback((node: MaimlTreeNode) => {
    setSelectedPath(node.path);
    setSelectedNode(node);
    setPreview(null);
    // デフォルト設定で初回プレビューを即時実行（設定変更前のベースライン表示）
    runPreview(node.path, DEFAULT_ENCRYPTION_CONFIG);
  }, [runPreview]);

  /**
   * プレビュー更新（手動 / デバウンス自動更新から呼ばれる）
   * 現在の config の内容でプレビューを再生成する
   */
  const handlePreview = useCallback(async () => {
    if (!selectedPath) return;
    await runPreview(selectedPath, config);
  }, [selectedPath, config, runPreview]);

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

  /** キャンセル：鍵を消去してモーダルを閉じる */
  const handleCancel = useCallback(() => {
    setConfig((prev) => ({ ...prev, loadedKey: undefined }));
    setSelectedPath(null);
    setSelectedNode(null);
    setPreview(null);
    setUpaViolations([]);
    setSplitWizardOpen(false);
    onClose?.();
  }, [onClose]);

  /** 暗号化確認ダイアログを開く */
  const handleEncryptWithConfirm = useCallback(() => {
    setConfirmModalOpen(true);
  }, []);

  const handleConfirmOk = useCallback(() => {
    setConfirmModalOpen(false);
    handleEncrypt();
  }, [handleEncrypt]);

  const handleConfirmCancel = useCallback(() => {
    setConfirmModalOpen(false);
  }, []);

  /** 暗号化実行可否 */
  const canEncrypt = selectedNode !== null && !selectedNode.isEncrypted && !!config.loadedKey;

  /** 分割ウィザードを開く */
  const handleOpenSplitWizard = useCallback(() => {
    setSplitWizardOpen(true);
  }, []);

  /** 分割ウィザードを閉じる */
  const handleCloseSplitWizard = useCallback(() => {
    setSplitWizardOpen(false);
  }, []);

  /** 分割完了後：UPA違反をクリアしてツリーを再取得 */
  const handleSplitComplete = useCallback(async () => {
    setSplitWizardOpen(false);
    setUpaViolations([]);
    await loadTree();
  }, [loadTree]);

  /** 暗号化済み子要素一覧を取得 */
  const loadEncryptedChildren = useCallback(async (node: MaimlTreeNode) => {
    setEncryptedChildrenLoading(true);
    try {
      const items = await encryptionService.getEncryptedChildren(projectName, node.path);
      setEncryptedChildren(items);
    } catch {
      setEncryptedChildren([]);
    } finally {
      setEncryptedChildrenLoading(false);
    }
  }, [projectName]);

  /**
   * タブ変更ハンドラ
   * 「秘匿済み一覧」タブに切り替えた時のみ、暗号化済み子要素を取得する
   */
  const handleTabChange = useCallback((key: string) => {
    const tabKey = key as 'config' | 'preview' | 'encrypted-list' | 'decrypt';
    setRightTab(tabKey);
    if (tabKey === 'encrypted-list' && selectedNode) {
      loadEncryptedChildren(selectedNode);
    }
    // 復号化タブに切り替えたらプレビューをクリア
    if (tabKey === 'decrypt') {
      setDecryptPreview(null);
    }
  }, [selectedNode, loadEncryptedChildren]);

  /** 秘匿済み一覧の行クリック → ツリーで該当要素を選択 */
  const handleSelectEncryptedElement = useCallback((path: string) => {
    const findNode = (nodes: MaimlTreeNode[]): MaimlTreeNode | null => {
      for (const n of nodes) {
        if (n.path === path) return n;
        if (n.children) {
          const found = findNode(n.children);
          if (found) return found;
        }
      }
      return null;
    };
    const node = findNode(treeData);
    if (node) {
      setSelectedPath(path);
      setSelectedNode(node);
      setDecryptPreview(null);
      // 復号化タブに切り替える
      setRightTab('decrypt');
    }
  }, [treeData]);

  /** 復号化プレビュー */
  const handleDecryptPreview = useCallback(async (keyId: string, password?: string) => {
    if (!selectedNode) return;
    setDecryptPreviewLoading(true);
    try {
      const result = await encryptionService.getDecryptPreview(projectName, {
        projectName,
        targetPath: selectedNode.path,
        keyId,
        password,
      });
      // DecryptPreviewResponse → EncryptionPreviewResponse へ変換（algorithmUri を補完）
      const asPreview: EncryptionPreviewResponse = {
        beforeXml: result.beforeXml,
        afterXml: result.afterXml,
        algorithmUri: '',
      };
      setDecryptPreview(asPreview);
      // プレビュータブに切り替えて表示
      setRightTab('preview');
    } catch {
      message.error('復号化プレビューの生成に失敗しました。');
    } finally {
      setDecryptPreviewLoading(false);
    }
  }, [projectName, selectedNode]);

  /** 復号化実行 */
  const handleDecryptExecute = useCallback(async (keyId: string, password?: string) => {
    if (!selectedNode) return;
    setDecryptExecuting(true);
    try {
      await encryptionService.executeDecrypt(projectName, {
        projectName,
        targetPath: selectedNode.path,
        keyId,
        password,
      });
      message.success('復号化が完了しました。');
      await loadTree();
      setSelectedPath(null);
      setSelectedNode(null);
      setDecryptPreview(null);
      setEncryptedChildren([]);
      setRightTab('config');
    } catch {
      message.error('復号化に失敗しました。');
    } finally {
      setDecryptExecuting(false);
    }
  }, [projectName, selectedNode, loadTree]);

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

      {/* コンテンツエリア */}
      <Layout style={{ flex: 1, padding: '16px', background: 'transparent' }}>
        {/* 左ペイン: MAIMLツリー */}
        <Sider
          width={480}
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
              checkedPaths={checkedPaths}
              onSelect={handleSelectNode}
              onCheck={setCheckedPaths}
            />
          )}
        </Sider>

        {/* 右ペイン: 設定 / プレビュー（タブ切り替え） */}
        <Content style={{ overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
          <Tabs
            activeKey={rightTab}
            onChange={handleTabChange}
            style={{ flex: 1, minHeight: 0 }}
            items={[
              {
                key: 'config',
                label: '暗号化設定',
                children: (
                  <EncryptionConfigPanel
                    projectName={projectName}
                    selectedNode={selectedNode}
                    config={config}
                    keys={keys}
                    onConfigChange={setConfig}
                    onPreview={handlePreview}
                    onEncrypt={handleEncrypt}
                    onOpenSplitWizard={handleOpenSplitWizard}
                    previewLoading={previewLoading}
                    executing={executing}
                    hasUpaViolation={hasUpaViolation}
                  />
                ),
              },
              {
                key: 'encrypted-list',
                label: '秘匿済み一覧',
                children: (
                  <EncryptedElementsListTab
                    selectedNode={selectedNode}
                    encryptedChildren={encryptedChildren}
                    loading={encryptedChildrenLoading}
                    onSelectElement={handleSelectEncryptedElement}
                  />
                ),
              },
              {
                key: 'decrypt',
                label: '復号化',
                children: (
                  <DecryptionPanel
                    projectName={projectName}
                    selectedNode={selectedNode}
                    keys={keys}
                    previewLoading={decryptPreviewLoading}
                    executing={decryptExecuting}
                    onDecryptPreview={handleDecryptPreview}
                    onDecryptExecute={handleDecryptExecute}
                  />
                ),
              },
              {
                key: 'preview',
                label: 'XMLプレビュー',
                children: (
                  <EncryptionPreviewPanel
                    preview={rightTab === 'decrypt' || decryptPreview !== null ? decryptPreview : preview}
                    loading={rightTab === 'decrypt' ? decryptPreviewLoading : previewLoading}
                    mode={decryptPreview !== null ? 'decrypt' : 'encrypt'}
                  />
                ),
              },
            ]}
          />

          {/* ━━━ ダイアログフッター: ボタン行（タブの外、横一列） ━━━ */}
          <div style={{
            padding: '10px 16px',
            borderTop: '1px solid #f0f0f0',
            background: '#fafafa',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8,
            flexShrink: 0,
          }}>
            <Tooltip title={!selectedNode ? '秘匿対象を選択してください' : !config.loadedKey ? '鍵をロードしてください' : ''}>
              <Button
                type="primary"
                icon={<LockOutlined />}
                onClick={handleEncryptWithConfirm}
                loading={executing}
                disabled={!canEncrypt}
              >
                暗号化を実行
              </Button>
            </Tooltip>

            <Tooltip title="設定内容でXMLプレビューを更新します（自動更新: 300ms）">
              <Button
                icon={<SyncOutlined />}
                onClick={handlePreview}
                loading={previewLoading}
                disabled={!selectedNode}
              >
                プレビューを更新
              </Button>
            </Tooltip>

            <Tooltip title={!hasUpaViolation ? 'UPA制約違反が検出された場合に有効化されます' : '要素を分割してUPA制約を解消してから秘匿化します'}>
              <Button
                icon={<ScissorOutlined />}
                onClick={handleOpenSplitWizard}
                disabled={!hasUpaViolation}
              >
                要素を分割して部分を秘匿化
              </Button>
            </Tooltip>

            <Button
              icon={<CloseOutlined />}
              onClick={handleCancel}
              disabled={executing}
            >
              キャンセル
            </Button>
          </div>
        </Content>
      </Layout>

      {/* 分割ウィザード */}
      <SplitWizardModal
        open={splitWizardOpen}
        onClose={handleCloseSplitWizard}
        selectedNode={selectedNode}
        violations={upaViolations}
        onSplitComplete={handleSplitComplete}
      />

      {/* 暗号化実行確認ダイアログ */}
      <Modal
        open={confirmModalOpen}
        title={
          <Space>
            <ExclamationCircleOutlined style={{ color: '#faad14' }} />
            暗号化の実行確認
          </Space>
        }
        onOk={handleConfirmOk}
        onCancel={handleConfirmCancel}
        okText="暗号化を実行"
        cancelText="キャンセル"
        okButtonProps={{ type: 'primary', icon: <LockOutlined />, loading: executing }}
        width={460}
      >
        <Space orientation="vertical" style={{ width: '100%' }} size={12}>
          <Alert
            type="warning"
            showIcon
            message="この操作は元に戻せません"
            description="選択した要素を暗号化します。バックアップファイルが自動作成されますが、復号化には対応する鍵が必要です。"
          />
          {selectedNode && (
            <div style={{ padding: '8px 12px', background: '#f5f5f5', borderRadius: 4 }}>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>暗号化対象：</Typography.Text>
              <Typography.Text strong style={{ marginLeft: 4 }}>
                {selectedNode.label ?? selectedNode.key ?? selectedNode.tagName}
              </Typography.Text>
              <br />
              <Typography.Text type="secondary" style={{ fontSize: 11 }}>{selectedNode.path}</Typography.Text>
            </div>
          )}
          {config.loadedKey && (
            <div>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>使用する鍵：</Typography.Text>
              <Typography.Text code style={{ marginLeft: 4 }}>{config.loadedKey.keyIdentifier}</Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: 11, marginLeft: 4 }}>
                ({config.loadedKey.fileName})
              </Typography.Text>
            </div>
          )}
        </Space>
      </Modal>
    </div>
  );
};

export default EncryptionManagement;
