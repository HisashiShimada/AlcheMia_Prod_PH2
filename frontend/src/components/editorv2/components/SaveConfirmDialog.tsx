/**
 * SaveConfirmDialog - V2保存確認ダイアログ
 * 
 * 機能:
 * - S3 or ローカルダウンロード選択
 * - S3フォルダ選択（マルチテナント対応）
 * - バリデーション結果表示
 * - 自動補正/強制保存/キャンセル
 * 
 * @version 2.0.0
 * @date 2026-01-29
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  Button,
  Radio,
  Input,
  Typography,
  Space,
  Spin,
  Alert,
  Tree,
  Collapse,
  Tag,
  Divider,
} from 'antd';
import type { DataNode } from 'antd/es/tree';
import {
  FolderOutlined,
  CloudUploadOutlined,
  DownloadOutlined,
  WarningOutlined,
  ToolOutlined,
  CloseCircleOutlined,
  FolderOpenOutlined,
} from '@ant-design/icons';

const { Text, Title } = Typography;
const { Panel } = Collapse;

interface ValidationError {
  type?: string;
  message?: string;
  description?: string;
  xpath?: string;
}

interface ValidationResult {
  errors?: ValidationError[];
  warnings?: ValidationError[];
  corrections?: unknown[];
}

interface S3Folder {
  fullPath: string;
  fileCount?: number;
}

interface SaveConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  validationResult?: ValidationResult | null;
  onSave: (action: 'save' | 'auto-correct' | 'force-save' | 'cancel', destination: string, folder?: string) => void;
  sourceFolder?: string;
}

interface FolderNode {
  __isFolder?: boolean;
  __folderName?: string;
  __folderPath?: string;
  __depth?: number;
  __fileCount?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FolderStructure = Record<string, any>;

const SaveConfirmDialog: React.FC<SaveConfirmDialogProps> = ({
  open,
  onClose,
  validationResult,
  onSave,
  sourceFolder = '',
}) => {
  // 保存先選択
  const [saveDestination, setSaveDestination] = useState<'s3' | 'download'>('s3');
  
  // S3フォルダ関連
  const [folders, setFolders] = useState<S3Folder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>('');
  const [customFolder, setCustomFolder] = useState<string>('');
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [showCustomFolderInput, setShowCustomFolderInput] = useState(false);
  const [treeData, setTreeData] = useState<DataNode[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);

  // sourceFolderをデフォルト値として設定
  useEffect(() => {
    if (open && saveDestination === 's3' && sourceFolder && !selectedFolder) {
      console.log('✅ [SaveConfirmDialog] ソースフォルダを初期値に設定:', sourceFolder);
      setSelectedFolder(sourceFolder);
    }
  }, [open, saveDestination, sourceFolder, selectedFolder]);

  // S3フォルダ一覧取得
  useEffect(() => {
    if (open && saveDestination === 's3') {
      fetchS3Folders();
    }
  }, [open, saveDestination]);

  const fetchS3Folders = async () => {
    setLoadingFolders(true);
    try {
      const userInfoStr = localStorage.getItem('userInfo');
      const userInfo = userInfoStr ? JSON.parse(userInfoStr) : null;
      const currentOrgId = userInfo?.organizationId;
      
      if (!currentOrgId) {
        console.error('❌ [SaveConfirmDialog] Organization ID not found');
        setFolders([]);
        setLoadingFolders(false);
        return;
      }
      
      console.log('🔍 [SaveConfirmDialog] Fetching folders for organization:', currentOrgId);
      
      const response = await fetch(`/api/s3/folders?organizationId=${currentOrgId}`, {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      
      const result = await response.json();
      
      if (result.success && result.folders) {
        const orgFolders = result.folders;
        
        console.log('✅ [SaveConfirmDialog] Folders loaded:', {
          total: orgFolders.length,
          organizationId: currentOrgId,
        });
        
        setFolders(orgFolders);
        buildTreeData(orgFolders);
        
        // デフォルトフォルダを設定
        if (sourceFolder) {
          setSelectedFolder(sourceFolder);
        } else if (orgFolders.length > 0) {
          setSelectedFolder(orgFolders[0].fullPath.replace(/\/$/, ''));
        }
      }
    } catch (error) {
      console.error('❌ [SaveConfirmDialog] フォルダ取得エラー:', error);
      setFolders([]);
    } finally {
      setLoadingFolders(false);
    }
  };

  // フォルダ階層をTreeデータに変換
  const buildTreeData = (folderList: S3Folder[]) => {
    const structure: FolderStructure = {};
    const defaultExpanded: React.Key[] = [];
    
    folderList.forEach(folder => {
      const parts = folder.fullPath.split('/').filter(p => p);
      let current = structure;
      
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const currentPath = parts.slice(0, i + 1).join('/');
        
        if (!current[part]) {
          current[part] = {
            __isFolder: true,
            __folderName: part,
            __folderPath: currentPath,
            __depth: i,
            __fileCount: folder.fileCount || 0,
          };
          
          // 1階層目はデフォルトで展開
          if (i === 0) {
            defaultExpanded.push(currentPath);
          }
        }
        
        current = current[part] as FolderStructure;
      }
    });
    
    const tree = buildTreeNodes(structure);
    setTreeData(tree);
    setExpandedKeys(defaultExpanded);
  };

  // 再帰的にTreeノードを構築
  const buildTreeNodes = (items: FolderStructure, depth = 0): DataNode[] => {
    return Object.keys(items)
      .filter(key => !key.startsWith('__'))
      .sort()
      .map(key => {
        const item = items[key] as FolderNode;
        const itemPath = (item.__folderPath || key) as string;
        const hasChildren = Object.keys(item).some(k => !k.startsWith('__'));
        
        return {
          title: (
            <Space>
              <Text>{item.__folderName || key}</Text>
              {item.__fileCount && item.__fileCount > 0 && (
                <Tag>{item.__fileCount}</Tag>
              )}
            </Space>
          ),
          key: itemPath,
          icon: <FolderOutlined />,
          children: hasChildren ? buildTreeNodes(item as FolderStructure, depth + 1) : undefined,
        };
      });
  };

  // フォルダ選択
  const handleFolderSelect = useCallback((selectedKeys: React.Key[]) => {
    if (selectedKeys.length > 0) {
      setSelectedFolder(selectedKeys[0] as string);
    }
  }, []);

  // 保存アクション
  const handleChoice = (action: 'save' | 'auto-correct' | 'force-save' | 'cancel') => {
    const folder = showCustomFolderInput ? customFolder : selectedFolder;
    onSave(action, saveDestination, folder);
  };

  // バリデーション結果の統計
  const errorCount = validationResult?.errors?.length || 0;
  const warningCount = validationResult?.warnings?.length || 0;
  const correctionsCount = validationResult?.corrections?.length || 0;
  const hasErrors = errorCount > 0;
  const hasCorrections = correctionsCount > 0;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={700}
      footer={null}
      title={
        <Space>
          {hasErrors ? <WarningOutlined style={{ color: '#ff4d4f' }} /> : <CloudUploadOutlined />}
          <span>{hasErrors ? 'バリデーションエラー検出' : 'MaiML保存'}</span>
        </Space>
      }
    >
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        {/* バリデーション結果統計（エラーがある場合のみ） */}
        {hasErrors && (
          <Alert
            message={
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <Space>
                  <Text strong>❌ エラー:</Text>
                  <Text>{errorCount}件</Text>
                </Space>
                <Space>
                  <Text strong>⚠️ 警告:</Text>
                  <Text>{warningCount}件</Text>
                </Space>
                <Space>
                  <Text strong>🔧 自動補正可能:</Text>
                  <Text>{correctionsCount}件</Text>
                </Space>
              </Space>
            }
            type="error"
            showIcon
          />
        )}

        {/* エラー詳細プレビュー（上位3件） */}
        {hasErrors && validationResult?.errors && validationResult.errors.length > 0 && (
          <Collapse>
            <Panel header="エラー詳細 (上位3件)" key="errors">
              <Space direction="vertical" style={{ width: '100%' }}>
                {validationResult.errors.slice(0, 3).map((error, index) => (
                  <Alert
                    key={index}
                    message={error.type || 'Validation Error'}
                    description={
                      <>
                        <Text>{error.message || error.description || 'エラー詳細なし'}</Text>
                        {error.xpath && (
                          <div style={{ marginTop: 4 }}>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              📍 XPath: {error.xpath}
                            </Text>
                          </div>
                        )}
                      </>
                    }
                    type="error"
                    showIcon
                  />
                ))}
                {validationResult.errors.length > 3 && (
                  <Text type="secondary">... 他 {validationResult.errors.length - 3} 件のエラー</Text>
                )}
              </Space>
            </Panel>
          </Collapse>
        )}

        {/* 保存先選択 */}
        <div style={{ padding: 16, backgroundColor: '#e6f4ff', borderRadius: 8, border: '2px solid #1677ff' }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Space>
              <CloudUploadOutlined />
              <Text strong>保存先を選択</Text>
            </Space>
            <Radio.Group value={saveDestination} onChange={(e) => setSaveDestination(e.target.value)}>
              <Space>
                <Radio value="s3">
                  <Space size="small">
                    <CloudUploadOutlined />
                    <span>S3に保存</span>
                  </Space>
                </Radio>
                <Radio value="download">
                  <Space size="small">
                    <DownloadOutlined />
                    <span>ローカルダウンロード</span>
                  </Space>
                </Radio>
              </Space>
            </Radio.Group>

            {/* S3フォルダ選択 */}
            {saveDestination === 's3' && (
              <div style={{ marginTop: 16 }}>
                <Text strong>📁 保存先フォルダ:</Text>
                
                {loadingFolders ? (
                  <div style={{ padding: 16, textAlign: 'center' }}>
                    <Spin tip="フォルダ読み込み中..." />
                  </div>
                ) : showCustomFolderInput ? (
                  <Space direction="vertical" style={{ width: '100%', marginTop: 8 }}>
                    <Input
                      value={customFolder}
                      onChange={(e) => setCustomFolder(e.target.value)}
                      placeholder="例: DEV/MyProject/Data"
                    />
                    <Button
                      size="small"
                      onClick={() => {
                        setShowCustomFolderInput(false);
                        setCustomFolder('');
                      }}
                    >
                      既存フォルダから選択
                    </Button>
                  </Space>
                ) : (
                  <Space direction="vertical" style={{ width: '100%', marginTop: 8 }}>
                    <Alert
                      message={
                        <Space>
                          <FolderOpenOutlined />
                          <Text>{selectedFolder || '-- フォルダを選択 --'}</Text>
                        </Space>
                      }
                      type="info"
                    />
                    
                    {treeData.length > 0 ? (
                      <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid #d9d9d9', borderRadius: 4, padding: 8, backgroundColor: '#fff' }}>
                        <Tree
                          showIcon
                          treeData={treeData}
                          expandedKeys={expandedKeys}
                          selectedKeys={[selectedFolder]}
                          onSelect={handleFolderSelect}
                          onExpand={(keys) => setExpandedKeys(keys)}
                        />
                      </div>
                    ) : (
                      <Alert message="フォルダが見つかりません" type="warning" />
                    )}
                    
                    <Button
                      block
                      size="small"
                      onClick={() => setShowCustomFolderInput(true)}
                    >
                      ➕ 新規フォルダパスを入力
                    </Button>
                  </Space>
                )}
                
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
                  💡 選択したフォルダにファイルが保存されます
                </Text>
              </div>
            )}

            <Text type="secondary" style={{ fontSize: 12 }}>
              {saveDestination === 's3' 
                ? '💡 S3の指定フォルダにファイルを保存します' 
                : '💡 ファイルをブラウザからダウンロードします'}
            </Text>
          </Space>
        </div>

        {/* 説明文 */}
        <Text type="secondary">
          {hasErrors 
            ? '保存を続行するには、以下のいずれかを選択してください:' 
            : '保存先を選択して保存してください:'}
        </Text>

        {/* アクションボタン */}
        <Space direction="vertical" style={{ width: '100%' }}>
          {/* 自動補正ボタン（エラーがある場合のみ） */}
          {hasErrors && hasCorrections && (
            <Button
              block
              type="primary"
              size="large"
              icon={<ToolOutlined />}
              onClick={() => handleChoice('auto-correct')}
              style={{ backgroundColor: '#52c41a' }}
            >
              🔧 自動補正して保存 (推奨)
              <Tag style={{ marginLeft: 8 }}>
                → {saveDestination === 's3' ? 'S3' : 'ダウンロード'}
              </Tag>
            </Button>
          )}
          
          {/* 保存ボタン（エラーなし）or 強制保存ボタン（エラーあり） */}
          <Button
            block
            type={hasErrors ? 'default' : 'primary'}
            size="large"
            danger={hasErrors}
            icon={hasErrors ? <WarningOutlined /> : <CloudUploadOutlined />}
            onClick={() => handleChoice(hasErrors ? 'force-save' : 'save')}
          >
            {hasErrors ? '⚠️ エラーを無視して強制保存' : '💾 保存'}
            <Tag style={{ marginLeft: 8 }}>
              → {saveDestination === 's3' ? 'S3' : 'ダウンロード'}
            </Tag>
          </Button>
          
          {/* キャンセルボタン */}
          <Button
            block
            icon={<CloseCircleOutlined />}
            onClick={() => handleChoice('cancel')}
          >
            キャンセル
          </Button>
        </Space>

        {/* 注意書き（エラーがある場合のみ） */}
        {hasErrors && (
          <Alert
            message="💡 ヒント: ValidationPanelでエラー詳細を確認できます"
            type="info"
            showIcon
          />
        )}
      </Space>
    </Modal>
  );
};

export default SaveConfirmDialog;