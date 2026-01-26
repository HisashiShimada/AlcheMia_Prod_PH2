/**
 * SaveConfirmDialog - 保存確認ダイアログ
 * 
 * Material-UI → Ant Design v6 変換版
 * 
 * 機能:
 * - S3 or ローカルダウンロード選択
 * - S3フォルダ階層選択（マルチテナント対応）
 * - バリデーション結果表示（簡易版）
 * - 自動補正/強制保存/キャンセル
 * 
 * @version 2.0.0
 * @date 2025-12-23
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  Button,
  Radio,
  Input,
  Typography,
  Alert,
  Spin,
  Space,
  Collapse,
  List,
  Tag,
  Divider,
} from 'antd';
import {
  FolderOutlined,
  CloudUploadOutlined,
  DownloadOutlined,
  WarningOutlined,
  ToolOutlined,
  DownOutlined,
  RightOutlined,
} from '@ant-design/icons';

const { Text, Title } = Typography;

/**
 * ValidationResult型定義
 */
interface ValidationResult {
  errors?: Array<{
    type?: string;
    message?: string;
    description?: string;
    xpath?: string;
  }>;
  warnings?: Array<any>;
  corrections?: Array<any>;
}

/**
 * FolderItem型定義
 */
interface FolderItem {
  fullPath: string;
  path?: string;
  fileCount?: number;
}

/**
 * FolderStructure型定義
 */
interface FolderStructure {
  [key: string]: FolderStructureItem;
}

interface FolderStructureItem {
  __isFolder?: boolean;
  __folderName?: string;
  __folderPath?: string;
  __depth?: number;
  __fileCount?: number;
  [key: string]: any;
}

/**
 * SaveConfirmDialogのProps型定義
 */
export interface SaveConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  validationResult: ValidationResult | null;
  onSave: (action: string, destination: string, folder: string) => void;
  sourceFolder?: string;
}

/**
 * SaveConfirmDialogコンポーネント
 */
const SaveConfirmDialog: React.FC<SaveConfirmDialogProps> = ({
  open,
  onClose,
  validationResult,
  onSave,
  sourceFolder = '',
}) => {
  // 保存先選択 ('s3' | 'download')
  const [saveDestination, setSaveDestination] = useState('s3');
  
  // S3フォルダ関連
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [folderStructure, setFolderStructure] = useState<FolderStructure>({});
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [selectedFolder, setSelectedFolder] = useState('');
  const [customFolder, setCustomFolder] = useState('');
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [showCustomFolderInput, setShowCustomFolderInput] = useState(false);
  const [folderListVisible, setFolderListVisible] = useState(false);

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
      const currentOrgId = localStorage.getItem('currentOrganizationId');
      
      if (!currentOrgId) {
        console.error('❌ [SaveConfirmDialog] Organization ID not found');
        setFolders([]);
        setLoadingFolders(false);
        return;
      }
      
      const response = await fetch(`/api/s3/folders?organizationId=${currentOrgId}`, {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      
      const result = await response.json();
      
      if (result.success && result.folders) {
        const orgFolders = result.folders;
        setFolders(orgFolders);
        buildFolderStructure(orgFolders);
        
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

  // フォルダ階層構造を構築
  const buildFolderStructure = (folderList: FolderItem[]) => {
    const structure: FolderStructure = {};
    const defaultExpanded: Record<string, boolean> = {};
    
    folderList.forEach(folder => {
      const parts = folder.fullPath.split('/').filter(p => p);
      let current: any = structure;
      
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
          
          if (i === 0) {
            defaultExpanded[currentPath] = true;
          }
        }
        
        current = current[part];
      }
    });
    
    setFolderStructure(structure);
    setExpandedFolders(defaultExpanded);
  };

  // フォルダの展開/折りたたみを切り替え
  const toggleFolder = useCallback((path: string) => {
    setExpandedFolders(prev => ({
      ...prev,
      [path]: !prev[path]
    }));
  }, []);

  // フォルダ選択
  const handleFolderSelect = useCallback((folderPath: string) => {
    setSelectedFolder(folderPath);
    setFolderListVisible(false);
  }, []);

  // フォルダツリーを再帰的にレンダリング
  const renderFolderTree = (items: FolderStructure, depth = 0): React.ReactNode => {
    if (!items) return null;
    
    return Object.keys(items).sort().map(key => {
      const item = items[key];
      
      if (key.startsWith('__')) return null;
      
      const itemPath = item.__folderPath as string;
      const isExpanded = expandedFolders[itemPath];
      const isSelected = selectedFolder === itemPath;
      const hasChildren = Object.keys(item).some(k => !k.startsWith('__'));
      
      return (
        <div key={itemPath}>
          <div
            style={{
              paddingLeft: `${8 + depth * 16}px`,
              padding: '4px 8px',
              borderRadius: '4px',
              marginBottom: '4px',
              backgroundColor: isSelected ? '#e6f7ff' : 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
            onClick={() => handleFolderSelect(itemPath)}
          >
            <span
              onClick={(e) => {
                if (hasChildren) {
                  e.stopPropagation();
                  toggleFolder(itemPath);
                }
              }}
              style={{ marginRight: 8, cursor: hasChildren ? 'pointer' : 'default' }}
            >
              {hasChildren ? (
                isExpanded ? <DownOutlined style={{ fontSize: 12 }} /> : <RightOutlined style={{ fontSize: 12 }} />
              ) : (
                <span style={{ width: 12, display: 'inline-block' }} />
              )}
            </span>
            <FolderOutlined style={{ marginRight: 8, color: '#1890ff' }} />
            <Text strong={isSelected}>{item.__folderName || key}</Text>
            {(item.__fileCount as number) > 0 && (
              <Tag style={{ marginLeft: 8, fontSize: '12px', padding: '0 4px' }}>
                {item.__fileCount}
              </Tag>
            )}
          </div>
          {hasChildren && isExpanded && (
            <div style={{ marginLeft: 0 }}>
              {renderFolderTree(item as FolderStructure, depth + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  // 保存アクション
  const handleChoice = (action: string) => {
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
      title={
        <Space>
          {hasErrors ? <WarningOutlined style={{ color: '#ff4d4f' }} /> : <CloudUploadOutlined />}
          <span>{hasErrors ? 'バリデーションエラー検出' : 'MaiML保存'}</span>
        </Space>
      }
      open={open}
      onCancel={onClose}
      width={700}
      footer={null}
      style={{ borderRadius: 8 }}
    >
      <div>
        {/* バリデーション結果統計 */}
        {hasErrors && (
          <Alert
            title={
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <Text>
                  <strong>❌ エラー:</strong> {errorCount}件
                </Text>
                <Text>
                  <strong>⚠️ 警告:</strong> {warningCount}件
                </Text>
                <Text style={{ gridColumn: '1 / -1' }}>
                  <strong>🔧 自動補正可能:</strong> {correctionsCount}件
                </Text>
              </div>
            }
            type="error"
            style={{ marginBottom: 16 }}
          />
        )}

        {/* エラー詳細プレビュー */}
        {hasErrors && validationResult?.errors && (
          <div style={{ marginBottom: 16, padding: 12, backgroundColor: '#fafafa', borderRadius: 4, maxHeight: 200, overflowY: 'auto' }}>
            <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
              エラー詳細 (上位3件):
            </Text>
            {validationResult.errors.slice(0, 3).map((error, index) => (
              <div key={index} style={{ marginBottom: 8, padding: 8, backgroundColor: '#fff', borderRadius: 4, border: '1px solid #d9d9d9' }}>
                <Text type="danger" strong>
                  {error.type || 'Validation Error'}
                </Text>
                <div style={{ marginTop: 4 }}>
                  <Text type="secondary">
                    {error.message || error.description || 'エラー詳細なし'}
                  </Text>
                </div>
                {error.xpath && (
                  <div style={{ marginTop: 4 }}>
                    <Text style={{ fontSize: 12, color: '#1890ff' }}>
                      📍 XPath: {error.xpath}
                    </Text>
                  </div>
                )}
              </div>
            ))}
            {validationResult.errors.length > 3 && (
              <Text type="secondary" style={{ marginTop: 8, display: 'block', fontSize: 12 }}>
                ... 他 {validationResult.errors.length - 3} 件のエラー
              </Text>
            )}
          </div>
        )}

        {/* 保存先選択 */}
        <div style={{ marginBottom: 16, padding: 16, backgroundColor: '#e6f7ff', borderRadius: 4, border: '2px solid #1890ff' }}>
          <div style={{ marginBottom: 12 }}>
            <Text strong style={{ fontSize: 16 }}>
              <CloudUploadOutlined style={{ marginRight: 8 }} />
              保存先を選択
            </Text>
          </div>
          
          <Radio.Group value={saveDestination} onChange={(e) => setSaveDestination(e.target.value)}>
            <Space orientation="vertical">
              <Radio value="s3">
                <CloudUploadOutlined /> S3に保存
              </Radio>
              <Radio value="download">
                <DownloadOutlined /> ローカルダウンロード
              </Radio>
            </Space>
          </Radio.Group>

          {/* S3フォルダ選択 */}
          {saveDestination === 's3' && (
            <div style={{ marginTop: 16 }}>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>
                📁 保存先フォルダ:
              </Text>
              
              {loadingFolders ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 8 }}>
                  <Spin size="small" />
                  <Text type="secondary">フォルダ読み込み中...</Text>
                </div>
              ) : showCustomFolderInput ? (
                <div>
                  <Input
                    value={customFolder}
                    onChange={(e) => setCustomFolder(e.target.value)}
                    placeholder="例: DEV/MyProject/Data"
                    style={{ marginBottom: 8 }}
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
                </div>
              ) : (
                <div>
                  <Button
                    block
                    onClick={() => setFolderListVisible(!folderListVisible)}
                    icon={<FolderOutlined />}
                    style={{ marginBottom: 8, textAlign: 'left' }}
                  >
                    {selectedFolder || '-- フォルダを選択 --'}
                  </Button>
                  
                  {folderListVisible && (
                    <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid #d9d9d9', borderRadius: 4, padding: 8, backgroundColor: '#fff' }}>
                      {Object.keys(folderStructure).length > 0 ? (
                        renderFolderTree(folderStructure)
                      ) : (
                        <Text type="secondary" style={{ display: 'block', textAlign: 'center', padding: 16 }}>
                          フォルダが見つかりません
                        </Text>
                      )}
                    </div>
                  )}
                  
                  <Button
                    block
                    size="small"
                    onClick={() => setShowCustomFolderInput(true)}
                    style={{ marginTop: 8 }}
                  >
                    ➕ 新規フォルダパスを入力
                  </Button>
                </div>
              )}
              
              <Text type="secondary" style={{ marginTop: 8, display: 'block', fontSize: 12 }}>
                💡 選択したフォルダにファイルが保存されます
              </Text>
            </div>
          )}

          <Text type="secondary" style={{ marginTop: 8, display: 'block', fontSize: 12 }}>
            {saveDestination === 's3' 
              ? '💡 S3の指定フォルダにファイルを保存します' 
              : '💡 ファイルをブラウザからダウンロードします'}
          </Text>
        </div>

        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
          {hasErrors 
            ? '保存を続行するには、以下のいずれかを選択してください:' 
            : '保存先を選択して保存してください:'}
        </Text>

        {/* アクションボタン */}
        <Space orientation="vertical" style={{ width: '100%' }}>
          {hasErrors && hasCorrections && (
            <Button
              type="primary"
              block
              size="large"
              icon={<ToolOutlined />}
              onClick={() => handleChoice('auto-correct')}
              style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
            >
              🔧 自動補正して保存 (推奨)
              <Tag style={{ marginLeft: 8 }}>
                → {saveDestination === 's3' ? 'S3' : 'ダウンロード'}
              </Tag>
            </Button>
          )}
          
          <Button
            type={hasErrors ? 'default' : 'primary'}
            block
            size="large"
            icon={hasErrors ? <WarningOutlined /> : <CloudUploadOutlined />}
            onClick={() => handleChoice(hasErrors ? 'force-save' : 'save')}
            danger={hasErrors}
          >
            {hasErrors ? '⚠️ エラーを無視して強制保存' : '💾 保存'}
            <Tag style={{ marginLeft: 8 }}>
              → {saveDestination === 's3' ? 'S3' : 'ダウンロード'}
            </Tag>
          </Button>
          
          <Button
            block
            onClick={() => handleChoice('cancel')}
          >
            ❌ キャンセル
          </Button>

          {hasErrors && (
            <Alert
              title="💡 ヒント: ValidationPanelでエラー詳細を確認できます"
              type="info"
              style={{ marginTop: 8 }}
            />
          )}
        </Space>
      </div>
    </Modal>
  );
};

export default SaveConfirmDialog;
