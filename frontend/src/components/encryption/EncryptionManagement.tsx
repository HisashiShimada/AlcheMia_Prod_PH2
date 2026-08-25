'use client';

/**
 * 暗号化管理メインコンポーネント
 *
 * @description
 * MAIMLファイルの暗号化・復号化・鍵管理を行うメイン画面。
 *
 * ■ 大枠タブ（mainTab）
 *   - 'encrypt-target': 暗号化対象選択タブ
 *   - 'key-settings'  : 鍵設定タブ（1MAIMLに共通の鍵設定）
 *
 * ■ 暗号化対象選択タブの構成
 *   左ペイン: MAIMLツリー（クリックでノードを選択）
 *   右ペイン（rightTab で切り替え）:
 *     - 'config'  : 暗号化設定 or 復号化設定（targetModeで自動切替）
 *     - 'preview' : XMLプレビュー
 *
 * ■ targetMode
 *   - 'encrypt': 未暗号化要素のみ → 暗号化設定パネル
 *   - 'decrypt': 暗号化済み要素のみ → 復号化パネル
 *   - 'mixed' : 混在 → エラーAlert
 *   - 'none'  : 対象なし → 空状態表示
 *
 * ■ 鍵の設計方針
 *   1MAIMLに対して暗号化鍵・復号化鍵はそれぞれ1つ。
 *   鍵設定タブで一元管理し、各設定パネルはpropsで受け取る。
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Layout, Typography, Spin, Alert, message, Tabs, Space, Button, Tooltip, Modal, Tag, List,
} from 'antd';
import {
  LockOutlined, UnlockOutlined, SyncOutlined, ScissorOutlined,
  CloseOutlined, ExclamationCircleOutlined, SettingOutlined, CodeOutlined,
  WarningOutlined, KeyOutlined,
} from '@ant-design/icons';
import { useLanguage } from '@/contexts/LanguageContext';

import EncryptionTargetTree from './EncryptionTargetTree';
import EncryptionConfigPanel from './EncryptionConfigPanel';
import EncryptionPreviewPanel from './EncryptionPreviewPanel';
import DecryptionPanel from './DecryptionPanel';
import SplitWizardModal from './SplitWizardModal';
import KeySettingsTab from './KeySettingsTab';
import type { DecryptionKeyState } from './DecryptionKeyPanel';

import * as encryptionService from '@/services/encryptionService';
import type {
  MaimlTreeNode,
  EncryptionKey,
  EncryptionConfig,
  EncryptionPreviewResponse,
  UpaViolation,
} from '@/types/encryption';
import { DEFAULT_ENCRYPTION_CONFIG } from '@/types/encryption';

const { Sider, Content } = Layout;
const { Title, Text } = Typography;

// ---------------------------------------------------------------------------
// 対象収集ロジック
// ---------------------------------------------------------------------------

/** 配下の処理対象モード */
type TargetMode = 'none' | 'encrypt' | 'decrypt' | 'mixed';

interface CollectResult {
  mode: TargetMode;
  /** 未暗号化で暗号化可能な要素 */
  encryptCandidates: MaimlTreeNode[];
  /** 暗号化済みで復号化対象な要素 */
  decryptCandidates: MaimlTreeNode[];
}

/**
 * 指定ノード自身 + 配下を再帰的に走査し、暗号化/復号化対象要素を収集する。
 */
function collectTargets(node: MaimlTreeNode): CollectResult {
  const encryptCandidates: MaimlTreeNode[] = [];
  const decryptCandidates: MaimlTreeNode[] = [];

  function traverse(n: MaimlTreeNode) {
    if (n.isEncrypted) {
      decryptCandidates.push(n);
    } else if (n.isEncryptable) {
      encryptCandidates.push(n);
    }
    if (n.children) {
      n.children.forEach(traverse);
    }
  }

  traverse(node);

  let mode: TargetMode = 'none';
  if (encryptCandidates.length > 0 && decryptCandidates.length === 0) {
    mode = 'encrypt';
  } else if (decryptCandidates.length > 0 && encryptCandidates.length === 0) {
    mode = 'decrypt';
  } else if (encryptCandidates.length > 0 && decryptCandidates.length > 0) {
    mode = 'mixed';
  }

  return { mode, encryptCandidates, decryptCandidates };
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface EncryptionManagementProps {
  /** 対象プロジェクト名 */
  projectName: string;
  /** モーダルを閉じるコールバック */
  onClose?: () => void;
}

// ---------------------------------------------------------------------------
// コンポーネント
// ---------------------------------------------------------------------------

const EncryptionManagement: React.FC<EncryptionManagementProps> = ({ projectName, onClose }) => {
  // ---------------------------------------------------------------------------
  // 状態管理
  // ---------------------------------------------------------------------------

  /** MAIMLツリー */
  const { t } = useLanguage();
  const [treeData, setTreeData] = useState<MaimlTreeNode[]>([]);
  const [treeLoading, setTreeLoading] = useState(true);
  const [treeError, setTreeError] = useState<string | null>(null);

  /** 選択中のノードパス（クリック選択） */
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<MaimlTreeNode | null>(null);

  /** 暗号化鍵一覧 */
  const [keys, setKeys] = useState<EncryptionKey[]>([]);

  /** 暗号化設定（鍵設定タブの EncryptionKeyPanel が loadedKey を管理） */
  const [config, setConfig] = useState<EncryptionConfig>(DEFAULT_ENCRYPTION_CONFIG);

  /**
   * 復号化用の鍵設定（鍵設定タブの DecryptionKeyPanel から引き上げ）
   * 1MAIMLに共通する復号化鍵として使用される。
   */
  const [decryptKeyState, setDecryptKeyState] = useState<DecryptionKeyState>({
    keyId: undefined,
    password: '',
  });

  /** 暗号化プレビュー（未暗号化ノード選択時） */
  const [preview, setPreview] = useState<EncryptionPreviewResponse | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  /** 復号化プレビュー（暗号化済みノード選択時） */
  const [decryptPreview, setDecryptPreview] = useState<EncryptionPreviewResponse | null>(null);
  const [decryptPreviewLoading, setDecryptPreviewLoading] = useState(false);

  /** 暗号化実行中 */
  const [executing, setExecuting] = useState(false);

  /** 復号化実行中 */
  const [decryptExecuting, setDecryptExecuting] = useState(false);

  /**
   * 大枠タブ（モーダル上部）
   * 'encrypt-target': 暗号化対象選択タブ
   * 'key-settings'  : 鍵設定タブ
   */
  const [mainTab, setMainTab] = useState<'encrypt-target' | 'key-settings'>('encrypt-target');

  /**
   * 右ペインのアクティブタブ（暗号化対象選択タブ内）
   * 'config'  : 設定タブ（暗号化設定 or 復号化設定を自動切替）
   * 'preview' : XMLプレビュータブ
   */
  const [rightTab, setRightTab] = useState<'config' | 'preview'>('config');

  /** 暗号化確認ダイアログ */
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  /** 分割ウィザード */
  const [splitWizardOpen, setSplitWizardOpen] = useState(false);
  const [upaViolations, setUpaViolations] = useState<UpaViolation[]>([]);
  const hasUpaViolation = upaViolations.length > 0;

  // ---------------------------------------------------------------------------
  // 派生状態
  // ---------------------------------------------------------------------------

  const collectResult = useMemo<CollectResult>(() => {
    if (!selectedNode) {
      return { mode: 'none', encryptCandidates: [], decryptCandidates: [] };
    }
    return collectTargets(selectedNode);
  }, [selectedNode]);

  const { mode: targetMode, encryptCandidates, decryptCandidates } = collectResult;


  // ---------------------------------------------------------------------------
  // データ取得
  // ---------------------------------------------------------------------------

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

  const loadKeys = useCallback(async () => {
    try {
      const keyList = await encryptionService.listKeys();
      setKeys(keyList);
    } catch {
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

  const runPreview = useCallback(async (
    _path: string,
    previewConfig: EncryptionConfig,
  ) => {
    setPreviewLoading(true);
    try {
      const result = await encryptionService.previewEncryption(projectName, previewConfig);
      setPreview(result);
    } catch {
      message.error(t('encryption.previewFailed'));
    } finally {
      setPreviewLoading(false);
    }
  }, [projectName]);

  const handleSelectNode = useCallback((node: MaimlTreeNode) => {
    setSelectedPath(node.path);
    setSelectedNode(node);
    setPreview(null);
    setDecryptPreview(null);
    setRightTab('config');

    const result = collectTargets(node);
    if (result.mode === 'encrypt') {
      runPreview(node.path, DEFAULT_ENCRYPTION_CONFIG);
    }
  }, [runPreview]);

  const handlePreview = useCallback(async () => {
    if (!selectedPath) return;
    await runPreview(selectedPath, config);
  }, [selectedPath, config, runPreview]);

  const handleEncrypt = useCallback(async () => {
    if (encryptCandidates.length === 0) return;
    setExecuting(true);
    try {
      const targetPaths = encryptCandidates.map((n) => n.path);
      await encryptionService.encryptElements(projectName, targetPaths, config);
      message.success(t('encryption.encryptSuccess', { count: targetPaths.length }));
      await loadTree();
      setSelectedPath(null);
      setSelectedNode(null);
      setPreview(null);
    } catch {
      message.error(t('encryption.encryptFailed'));
    } finally {
      setExecuting(false);
    }
  }, [projectName, encryptCandidates, config, loadTree]);

  const handleCancel = useCallback(() => {
    setConfig((prev) => ({ ...prev, loadedKey: undefined }));
    setDecryptKeyState({ keyId: undefined, password: '' });
    setSelectedPath(null);
    setSelectedNode(null);
    setPreview(null);
    setDecryptPreview(null);
    setUpaViolations([]);
    setSplitWizardOpen(false);
    onClose?.();
  }, [onClose]);

  const handleEncryptWithConfirm = useCallback(() => {
    if (!config.loadedKey) {
      // 鍵未設定の場合は鍵設定タブへ誘導
      setMainTab('key-settings');
      message.warning(t('encryption.keyRequired'));
      return;
    }
    setConfirmModalOpen(true);
  }, [config.loadedKey]);

  const handleConfirmOk = useCallback(() => {
    setConfirmModalOpen(false);
    handleEncrypt();
  }, [handleEncrypt]);

  const handleConfirmCancel = useCallback(() => {
    setConfirmModalOpen(false);
  }, []);

  const handleOpenSplitWizard = useCallback(() => {
    setSplitWizardOpen(true);
  }, []);

  const handleCloseSplitWizard = useCallback(() => {
    setSplitWizardOpen(false);
  }, []);

  const handleSplitComplete = useCallback(async () => {
    setSplitWizardOpen(false);
    setUpaViolations([]);
    await loadTree();
  }, [loadTree]);

  const handleDecryptPreview = useCallback(async (keyId: string, password?: string) => {
    if (decryptCandidates.length === 0) return;
    setDecryptPreviewLoading(true);
    try {
      const representativeNode = decryptCandidates[0];
      const result = await encryptionService.getDecryptPreview(projectName, {
        projectName,
        targetPath: representativeNode.path,
        keyId,
        password,
      });
      const asPreview: EncryptionPreviewResponse = {
        beforeXml: result.beforeXml,
        afterXml: result.afterXml,
        algorithmUri: '',
      };
      setDecryptPreview(asPreview);
    } catch {
      message.error(t('encryption.decryptPreviewFailed'));
    } finally {
      setDecryptPreviewLoading(false);
    }
  }, [projectName, decryptCandidates]);

  const handleDecryptExecute = useCallback(async (keyId: string, password?: string) => {
    if (decryptCandidates.length === 0) return;
    setDecryptExecuting(true);
    try {
      const targetPaths = decryptCandidates.map((n) => n.path);
      await encryptionService.executeDecryptElements(projectName, {
        projectName,
        targetPaths,
        keyId,
        password,
      });
      message.success(t('encryption.decryptSuccess', { count: targetPaths.length }));
      await loadTree();
      setSelectedPath(null);
      setSelectedNode(null);
      setDecryptPreview(null);
      setRightTab('config');
    } catch {
      message.error(t('encryption.decryptFailed'));
    } finally {
      setDecryptExecuting(false);
    }
  }, [projectName, decryptCandidates, loadTree]);

  // ---------------------------------------------------------------------------
  // レンダリング
  // ---------------------------------------------------------------------------

  const configTabLabel = (
    <Space size={4}>
      <SettingOutlined />
      {targetMode === 'decrypt' ? '復号化設定' : '暗号化設定'}
      {selectedNode && (
        <Tag
          color={targetMode === 'decrypt' ? 'orange' : targetMode === 'mixed' ? 'error' : 'blue'}
          style={{ marginLeft: 4, fontSize: 11, lineHeight: '16px', padding: '0 4px' }}
        >
          {targetMode === 'decrypt' ? '秘匿済み' : targetMode === 'mixed' ? '混在' : targetMode === 'none' ? '対象なし' : '未秘匿'}
        </Tag>
      )}
    </Space>
  );

  const previewTabLabel = (
    <Space size={4}>
      <CodeOutlined />
      {targetMode === 'decrypt' ? '復号プレビュー' : '暗号化プレビュー'}
    </Space>
  );

  const renderConfigArea = () => {
    switch (targetMode) {
      case 'none':
        return (
          <Alert
            type="info"
            showIcon
            message="左のツリーから要素を選択してください"
            description={
              selectedNode
                ? `選択中の「${selectedNode.label ?? selectedNode.tagName}」配下に暗号化・復号化可能な要素がありません。`
                : 'ノードをクリックすると、配下の暗号化対象が自動的に収集されます。'
            }
            style={{ margin: '16px' }}
          />
        );

      case 'mixed':
        return (
          <div style={{ padding: '16px' }}>
            <Alert
              type="error"
              showIcon
              icon={<WarningOutlined />}
              message="暗号化済みと未暗号化の要素が混在しています"
              description={
                <div>
                  <p style={{ marginBottom: 8 }}>
                    選択した「<strong>{selectedNode?.label ?? selectedNode?.tagName}</strong>」配下に、
                    暗号化済み要素と未暗号化要素が混在しています。
                  </p>
                  <p style={{ marginBottom: 8 }}>
                    一括処理はできません。先に暗号化済み要素を個別に選択して復号化してから、
                    まとめて暗号化してください。
                  </p>
                  <Space orientation="vertical" size={4} style={{ width: '100%' }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      🔒 暗号化済み要素（{decryptCandidates.length}件）:
                    </Text>
                    <List
                      size="small"
                      dataSource={decryptCandidates}
                      renderItem={(n) => (
                        <List.Item style={{ padding: '2px 0' }}>
                          <Text code style={{ fontSize: 11 }}>
                            {n.label ?? n.tagName} — {n.path}
                          </Text>
                        </List.Item>
                      )}
                    />
                    <Text type="secondary" style={{ fontSize: 12, marginTop: 8 }}>
                      🔓 未暗号化要素（{encryptCandidates.length}件）:
                    </Text>
                    <List
                      size="small"
                      dataSource={encryptCandidates}
                      renderItem={(n) => (
                        <List.Item style={{ padding: '2px 0' }}>
                          <Text code style={{ fontSize: 11 }}>
                            {n.label ?? n.tagName} — {n.path}
                          </Text>
                        </List.Item>
                      )}
                    />
                  </Space>
                </div>
              }
            />
          </div>
        );

      case 'decrypt':
        return (
          <DecryptionPanel
            projectName={projectName}
            targets={decryptCandidates}
            keyId={decryptKeyState.keyId}
            password={decryptKeyState.password || undefined}
            previewLoading={decryptPreviewLoading}
            executing={decryptExecuting}
            onDecryptPreview={handleDecryptPreview}
            onDecryptExecute={handleDecryptExecute}
          />
        );

      case 'encrypt':
      default:
        return (
          <EncryptionConfigPanel
            projectName={projectName}
            targets={encryptCandidates}
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
        );
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* ページヘッダー */}
      <div style={{ padding: '16px 24px', borderBottom: '1px solid #f0f0f0' }}>
        <Title level={4} style={{ margin: 0 }}>
          <LockOutlined style={{ marginRight: 8 }} />
          暗号化管理：{projectName}
        </Title>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━ 大枠タブ ━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <Tabs
        activeKey={mainTab}
        onChange={(key) => setMainTab(key as 'encrypt-target' | 'key-settings')}
        style={{ flex: 1, minHeight: 0 }}
        tabBarStyle={{ padding: '0 24px', marginBottom: 0 }}
        items={[
          {
            key: 'encrypt-target',
            label: (
              <Space size={4}>
                <LockOutlined />
                暗号化対象選択
              </Space>
            ),
            children: (
              <Layout style={{ padding: '16px', background: 'transparent', height: '100%', overflow: 'hidden' }}>
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
                    <br />
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      ノードをクリックすると配下要素をまとめて処理できます
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

                {/* 右ペイン: 設定 / XMLプレビュー（2タブ） */}
                <Content style={{ overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
                  <Tabs
                    activeKey={rightTab}
                    onChange={(key) => setRightTab(key as 'config' | 'preview')}
                    style={{ flex: 1, minHeight: 0 }}
                    items={[
                      {
                        key: 'config',
                        label: configTabLabel,
                        children: renderConfigArea(),
                      },
                      {
                        key: 'preview',
                        label: previewTabLabel,
                        children: (
                          <EncryptionPreviewPanel
                            preview={targetMode === 'decrypt' ? decryptPreview : preview}
                            loading={targetMode === 'decrypt' ? decryptPreviewLoading : previewLoading}
                            mode={targetMode === 'decrypt' ? 'decrypt' : 'encrypt'}
                          />
                        ),
                      },
                    ]}
                  />

                  {/* ━━━ フッター: ボタン行 ━━━ */}
                  <div style={{
                    padding: '10px 16px',
                    borderTop: '1px solid #f0f0f0',
                    background: '#fafafa',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: 8,
                    flexShrink: 0,
                  }}>
                    {targetMode === 'decrypt' ? (
                      <Tooltip title={
                        !decryptKeyState.keyId
                          ? '「鍵設定」タブで復号化用の鍵を設定してください'
                          : `${decryptCandidates.length}件の要素を復号化します`
                      }>
                        <Button
                          icon={<UnlockOutlined />}
                          onClick={() => setRightTab('config')}
                          disabled={decryptCandidates.length === 0}
                        >
                          復号化設定へ（{decryptCandidates.length}件）
                        </Button>
                      </Tooltip>
                    ) : targetMode === 'encrypt' ? (
                      <>
                        <Tooltip title={
                          !config.loadedKey
                            ? '「鍵設定」タブで暗号化用の鍵を設定してください'
                            : `${encryptCandidates.length}件の要素を暗号化します`
                        }>
                          <Button
                            type="primary"
                            icon={<LockOutlined />}
                            onClick={handleEncryptWithConfirm}
                            loading={executing}
                            disabled={encryptCandidates.length === 0}
                          >
                            暗号化を実行（{encryptCandidates.length}件）
                          </Button>
                        </Tooltip>

                        <Tooltip title="設定内容でXMLプレビューを更新します（自動更新: 300ms）">
                          <Button
                            icon={<SyncOutlined />}
                            onClick={handlePreview}
                            loading={previewLoading}
                            disabled={encryptCandidates.length === 0}
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
                      </>
                    ) : null}

                    <Button
                      icon={<CloseOutlined />}
                      onClick={handleCancel}
                      disabled={executing || decryptExecuting}
                    >
                      キャンセル
                    </Button>
                  </div>
                </Content>
              </Layout>
            ),
          },
          {
            key: 'key-settings',
            label: (
              <Space size={4}>
                <KeyOutlined />
                鍵設定
                {!config.loadedKey && (
                  <Tag color="warning" style={{ fontSize: 10, padding: '0 4px', lineHeight: '16px' }}>
                    未設定
                  </Tag>
                )}
              </Space>
            ),
            children: (
              <div style={{ overflow: 'auto' }}>
                <KeySettingsTab
                  keys={keys}
                  encryptionConfig={config}
                  onEncryptionConfigChange={setConfig}
                  decryptionKeyState={decryptKeyState}
                  onDecryptionKeyChange={setDecryptKeyState}
                />
              </div>
            ),
          },
        ]}
      />

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
        width={480}
      >
        <Space orientation="vertical" style={{ width: '100%' }} size={12}>
          <Alert
            type="warning"
            showIcon
            message="この操作は元に戻せません"
            description="選択した要素を暗号化します。バックアップファイルが自動作成されますが、復号化には対応する鍵が必要です。"
          />
          {encryptCandidates.length > 0 && (
            <div style={{ padding: '8px 12px', background: '#f5f5f5', borderRadius: 4 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>暗号化対象：{encryptCandidates.length}件</Text>
              <List
                size="small"
                dataSource={encryptCandidates}
                renderItem={(n) => (
                  <List.Item style={{ padding: '2px 0' }}>
                    <Text style={{ fontSize: 12 }}>
                      {n.label ?? n.key ?? n.tagName}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 11, marginLeft: 8 }}>
                      {n.path}
                    </Text>
                  </List.Item>
                )}
              />
            </div>
          )}
          {config.loadedKey && (
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>使用する鍵：</Text>
              <Text code style={{ marginLeft: 4 }}>{config.loadedKey.keyIdentifier}</Text>
              <Text type="secondary" style={{ fontSize: 11, marginLeft: 4 }}>
                ({config.loadedKey.fileName})
              </Text>
            </div>
          )}
        </Space>
      </Modal>
    </div>
  );
};

export default EncryptionManagement;
