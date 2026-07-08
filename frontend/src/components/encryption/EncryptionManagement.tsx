'use client';

/**
 * 暗号化管理メインコンポーネント
 *
 * @description
 * MAIMLファイルの暗号化・復号化・鍵管理を行うメイン画面。
 *
 * 左ペイン: MAIMLツリー（クリックでノードを選択）
 * 右ペイン:
 *   選択ノード配下から暗号化対象を自動収集し、収集結果に応じて表示を切り替える：
 *   - 'encrypt': 未暗号化要素のみ → 暗号化設定パネル
 *   - 'decrypt': 暗号化済み要素のみ → 復号化パネル
 *   - 'mixed' : 混在 → エラーAlert（個別に復号化してから再実行を促す）
 *   - 'none'  : 対象なし → 空状態表示
 *
 * 選択方式: チェックボックスなし。ツリーノードをクリック選択し、
 *           配下の対象要素をまとめて一括処理する。
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Layout, Typography, Spin, Alert, message, Tabs, Space, Button, Tooltip, Modal, Tag, List,
} from 'antd';
import {
  LockOutlined, UnlockOutlined, SyncOutlined, ScissorOutlined,
  CloseOutlined, ExclamationCircleOutlined, SettingOutlined, CodeOutlined,
  WarningOutlined,
} from '@ant-design/icons';

import EncryptionTargetTree from './EncryptionTargetTree';
import EncryptionConfigPanel from './EncryptionConfigPanel';
import EncryptionPreviewPanel from './EncryptionPreviewPanel';
import DecryptionPanel from './DecryptionPanel';
import SplitWizardModal from './SplitWizardModal';

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
 *
 * - isEncryptable && !isEncrypted → encryptCandidates
 * - isEncrypted                   → decryptCandidates
 * - 両方存在 → mode: 'mixed'
 * - encryptCandidatesのみ → mode: 'encrypt'
 * - decryptCandidatesのみ → mode: 'decrypt'
 * - どちらもなし → mode: 'none'
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
  const [treeData, setTreeData] = useState<MaimlTreeNode[]>([]);
  const [treeLoading, setTreeLoading] = useState(true);
  const [treeError, setTreeError] = useState<string | null>(null);

  /** 選択中のノードパス（クリック選択） */
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<MaimlTreeNode | null>(null);

  /** 暗号化鍵一覧 */
  const [keys, setKeys] = useState<EncryptionKey[]>([]);

  /** 暗号化設定 */
  const [config, setConfig] = useState<EncryptionConfig>(DEFAULT_ENCRYPTION_CONFIG);

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
   * 右ペインのアクティブタブ
   * 'config'  : 設定タブ（暗号化設定 or 復号化設定を自動切替）
   * 'preview' : XMLプレビュータブ（暗号化プレビュー or 復号化プレビューを自動切替）
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

  /**
   * 選択ノード配下の収集結果
   * - selectedNode が null の場合は 'none'
   */
  const collectResult = useMemo<CollectResult>(() => {
    if (!selectedNode) {
      return { mode: 'none', encryptCandidates: [], decryptCandidates: [] };
    }
    return collectTargets(selectedNode);
  }, [selectedNode]);

  const { mode: targetMode, encryptCandidates, decryptCandidates } = collectResult;

  /** 暗号化実行可否（encryptモードかつ鍵がロード済み） */
  const canEncrypt = targetMode === 'encrypt' && !!config.loadedKey;

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

  /** 暗号化プレビュー生成（path と config を直接受け取るコア実装） */
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
   * - collectTargets でモードを判定
   * - encryptモード: デフォルト設定でプレビューを即時実行
   * - decryptモード: decryptPreview をクリア
   * - mixedモード / noneモード: プレビューをクリア
   */
  const handleSelectNode = useCallback((node: MaimlTreeNode) => {
    setSelectedPath(node.path);
    setSelectedNode(node);
    setPreview(null);
    setDecryptPreview(null);
    setRightTab('config');

    const result = collectTargets(node);
    if (result.mode === 'encrypt') {
      // 未暗号化ノード: デフォルト設定でプレビューを即時実行
      runPreview(node.path, DEFAULT_ENCRYPTION_CONFIG);
    }
  }, [runPreview]);

  /**
   * 暗号化プレビュー更新（手動 / デバウンス自動更新から呼ばれる）
   */
  const handlePreview = useCallback(async () => {
    if (!selectedPath) return;
    await runPreview(selectedPath, config);
  }, [selectedPath, config, runPreview]);

  /** 暗号化実行（複数対象を一括） */
  const handleEncrypt = useCallback(async () => {
    if (encryptCandidates.length === 0) return;
    setExecuting(true);
    try {
      const targetPaths = encryptCandidates.map((n) => n.path);
      await encryptionService.encryptElements(projectName, targetPaths, config);
      message.success(`暗号化が完了しました（${targetPaths.length}件）。`);
      await loadTree();
      setSelectedPath(null);
      setSelectedNode(null);
      setPreview(null);
    } catch {
      message.error('暗号化に失敗しました。');
    } finally {
      setExecuting(false);
    }
  }, [projectName, encryptCandidates, config, loadTree]);

  /** キャンセル：鍵を消去してモーダルを閉じる */
  const handleCancel = useCallback(() => {
    setConfig((prev) => ({ ...prev, loadedKey: undefined }));
    setSelectedPath(null);
    setSelectedNode(null);
    setPreview(null);
    setDecryptPreview(null);
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

  /** 復号化プレビュー */
  const handleDecryptPreview = useCallback(async (keyId: string, password?: string) => {
    if (decryptCandidates.length === 0) return;
    setDecryptPreviewLoading(true);
    try {
      // 代表ノード（先頭）でプレビュー
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
      setRightTab('preview');
    } catch {
      message.error('復号化プレビューの生成に失敗しました。');
    } finally {
      setDecryptPreviewLoading(false);
    }
  }, [projectName, decryptCandidates]);

  /** 復号化実行（複数対象を一括） */
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
      message.success(`復号化が完了しました（${targetPaths.length}件）。`);
      await loadTree();
      setSelectedPath(null);
      setSelectedNode(null);
      setDecryptPreview(null);
      setRightTab('config');
    } catch {
      message.error('復号化に失敗しました。');
    } finally {
      setDecryptExecuting(false);
    }
  }, [projectName, decryptCandidates, loadTree]);

  // ---------------------------------------------------------------------------
  // レンダリング
  // ---------------------------------------------------------------------------

  /**
   * 設定タブのラベル：targetModeに応じてアイコン・テキストを変える
   */
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

  /**
   * XMLプレビュータブのラベル
   */
  const previewTabLabel = (
    <Space size={4}>
      <CodeOutlined />
      {targetMode === 'decrypt' ? '復号プレビュー' : '暗号化プレビュー'}
    </Space>
  );

  /**
   * 右ペインの設定エリア: targetModeに応じて表示を切り替え
   */
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
                  <Space direction="vertical" size={4} style={{ width: '100%' }}>
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
            keys={keys}
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
              /* 復号化モード */
              <Tooltip title={decryptCandidates.length === 0 ? '復号化対象がありません' : '設定タブで鍵を選択して復号化してください'}>
                <Button
                  icon={<UnlockOutlined />}
                  onClick={() => setRightTab('config')}
                  disabled={decryptCandidates.length === 0}
                >
                  復号化設定へ（{decryptCandidates.length}件）
                </Button>
              </Tooltip>
            ) : targetMode === 'encrypt' ? (
              /* 暗号化モード */
              <>
                <Tooltip title={!config.loadedKey ? '鍵をロードしてください' : `${encryptCandidates.length}件の要素を暗号化します`}>
                  <Button
                    type="primary"
                    icon={<LockOutlined />}
                    onClick={handleEncryptWithConfirm}
                    loading={executing}
                    disabled={!canEncrypt}
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
            ) : null /* noneモード / mixedモードはボタンなし */ }

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
        <Space direction="vertical" style={{ width: '100%' }} size={12}>
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
