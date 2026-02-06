/**
 * WorkflowSelectorDialog - ワークフロー選択ダイアログ
 * 
 * S3に保存されたMaiMLファイルを選択してワークフローとして追加
 * フォルダ階層表示・展開機能対応
 * 
 * @version 2.0.0
 * @date 2025-12-23
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  Input,
  Button,
  Card,
  Typography,
  Space,
  Tag,
  Collapse,
  Alert,
  Spin,
  Flex,
  theme
} from 'antd';
import {
  SearchOutlined,
  FileTextOutlined,
  FolderOutlined,
  FolderOpenOutlined,
  RightOutlined,
  DownOutlined
} from '@ant-design/icons';

const { Text, Title } = Typography;

/**
 * ファイル情報の型定義
 */
export interface FileInfo {
  key: string;
  name?: string;
  size?: number;
  lastModified?: string;
}

/**
 * フォルダノードの型定義
 */
interface FolderNode {
  name: string;
  path: string;
  children: FolderNode[];
  fileCount: number;
}

/**
 * ワークフロー選択ダイアログのProps
 */
export interface WorkflowSelectorDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (file: FileInfo) => Promise<void>;
  availableFiles?: FileInfo[];
}

/**
 * ワークフロー選択ダイアログコンポーネント
 */
const WorkflowSelectorDialog: React.FC<WorkflowSelectorDialogProps> = ({
  open,
  onClose,
  onSelect,
  availableFiles = []
}) => {
  const { token } = theme.useToken();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFile, setSelectedFile] = useState<FileInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);

  // フォルダ階層構造を構築
  const folderTree = useMemo(() => {
    return buildFolderTree(availableFiles);
  }, [availableFiles]);

  // 検索クエリまたは選択フォルダによるファイルフィルタリング
  const filteredFiles = useMemo(() => {
    let files = availableFiles;

    // フォルダ選択によるフィルタリング
    if (selectedFolder) {
      files = files.filter(file => {
        const folderPath = file.key.substring(0, file.key.lastIndexOf('/'));
        return folderPath === selectedFolder;
      });
    }

    // 検索クエリによるフィルタリング
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      files = files.filter(file => {
        const fileName = file.name?.toLowerCase() || '';
        const fileKey = file.key?.toLowerCase() || '';
        return fileName.includes(query) || fileKey.includes(query);
      });
    }

    return files;
  }, [availableFiles, searchQuery, selectedFolder]);

  // ダイアログを開いた時の初期化
  useEffect(() => {
    if (open) {
      setSearchQuery('');
      setSelectedFile(null);
      setSelectedFolder(null);
      setError(null);
      // ルートフォルダは自動展開
      setExpandedFolders(new Set(['/']));
    }
  }, [open]);

  // フォルダ展開/縮小トグル
  const handleToggleFolder = (folderPath: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderPath)) {
        newSet.delete(folderPath);
      } else {
        newSet.add(folderPath);
      }
      return newSet;
    });
  };

  // フォルダ選択（フォルダ内ファイルをフィルタ表示）
  const handleSelectFolder = (folderPath: string) => {
    setSelectedFolder(folderPath === selectedFolder ? null : folderPath);
    setSearchQuery(''); // フォルダ選択時は検索クエリをクリア
  };

  // ファイル選択ハンドラー
  const handleFileSelect = (file: FileInfo) => {
    setSelectedFile(file);
  };

  // 確定ハンドラー
  const handleConfirm = async () => {
    if (!selectedFile) {
      setError('ファイルを選択してください');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await onSelect(selectedFile);
      onClose();
    } catch (err) {
      console.error('ワークフロー選択エラー:', err);
      setError(err instanceof Error ? err.message : 'ワークフロー追加に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  // ファイルサイズのフォーマット
  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // フォルダツリーを再帰的にレンダリング
  const renderFolderTree = (node: FolderNode, level: number = 0): React.ReactNode => {
    const isExpanded = expandedFolders.has(node.path);
    const isSelected = selectedFolder === node.path;
    const hasChildren = node.children && node.children.length > 0;
    const fileCount = node.fileCount || 0;

    return (
      <div key={node.path}>
        <div
          style={{
            paddingLeft: level * 24,
            padding: token.paddingSM,
            cursor: 'pointer',
            backgroundColor: isSelected ? token.colorPrimaryBg : 'transparent',
            borderRadius: token.borderRadiusLG,
            marginBottom: 4
          }}
          onClick={() => {
            if (hasChildren) {
              handleToggleFolder(node.path);
            }
            handleSelectFolder(node.path);
          }}
        >
          <Space>
            {hasChildren && (
              isExpanded ? <DownOutlined /> : <RightOutlined />
            )}
            {isExpanded ? (
              <FolderOpenOutlined style={{ color: token.colorPrimary }} />
            ) : (
              <FolderOutlined style={{ color: token.colorTextSecondary }} />
            )}
            <Text>{node.name}</Text>
            {fileCount > 0 && (
              <Tag color="blue">{`${fileCount}件`}</Tag>
            )}
          </Space>
        </div>

        {/* 子フォルダを再帰的に表示 */}
        {hasChildren && isExpanded && (
          <div>
            {node.children.map(child => renderFolderTree(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Modal
      title={
        <Space>
          <FileTextOutlined style={{ color: token.colorPrimary }} />
          <span>ワークフロー選択</span>
        </Space>
      }
      open={open}
      onCancel={onClose}
      width={900}
      style={{ top: 40 }}
      styles={{
        body: {
          minHeight: '60vh',
          maxHeight: '70vh',
          overflow: 'hidden'
        }
      }}
      footer={[
        <Button key="cancel" onClick={onClose} disabled={isLoading}>
          キャンセル
        </Button>,
        <Button
          key="confirm"
          type="primary"
          onClick={handleConfirm}
          disabled={!selectedFile || isLoading}
          loading={isLoading}
          icon={isLoading ? <Spin size="small" /> : undefined}
        >
          {isLoading ? '追加中...' : 'ワークフロー追加'}
        </Button>
      ]}
    >
      <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
        <div>
          <Text type="secondary">追加するMaiMLファイルを選択してください</Text>
        </div>

        {/* 検索バー */}
        <Input
          placeholder="ファイル名で検索..."
          prefix={<SearchOutlined />}
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setSelectedFolder(null); // 検索時はフォルダ選択をクリア
          }}
          allowClear
        />

        {/* エラー表示 */}
        {error && (
          <Alert
            title={error}
            type="error"
            closable
            onClose={() => setError(null)}
          />
        )}

        {/* メインコンテンツ */}
        <Flex gap="middle" style={{ height: 'calc(60vh - 180px)' }}>
          {/* 左側: フォルダツリー */}
          <div
            style={{
              width: '40%',
              borderRight: `1px solid ${token.colorBorder}`,
              paddingRight: token.padding,
              overflowY: 'auto'
            }}
          >
            <Text type="secondary" strong style={{ display: 'block', marginBottom: 8 }}>
              フォルダ
            </Text>
            <div style={{ maxHeight: 'calc(60vh - 240px)', overflowY: 'auto' }}>
              {folderTree.map((node) => renderFolderTree(node))}
            </div>
          </div>

          {/* 右側: ファイル一覧 */}
          <div style={{ width: '60%', overflowY: 'auto' }}>
            <Text type="secondary" strong style={{ display: 'block', marginBottom: 8 }}>
              ファイル {selectedFolder && `(${selectedFolder})`}
            </Text>
            {filteredFiles.length === 0 ? (
              <Flex
                vertical
                align="center"
                justify="center"
                style={{ paddingTop: token.paddingXL * 2 }}
              >
                <FolderOutlined
                  style={{ fontSize: 64, color: token.colorTextDisabled, marginBottom: 16 }}
                />
                <Text type="secondary">
                  {searchQuery || selectedFolder ? 'ファイルが見つかりません' : 'フォルダを選択してください'}
                </Text>
              </Flex>
            ) : (
              <Space orientation="vertical" size="small" style={{ width: '100%' }}>
                {filteredFiles.map((file) => (
                  <Card
                    key={file.key}
                    size="small"
                    hoverable
                    style={{
                      cursor: 'pointer',
                      border: `${selectedFile?.key === file.key ? 2 : 1}px solid ${
                        selectedFile?.key === file.key ? token.colorPrimary : token.colorBorder
                      }`,
                      backgroundColor: selectedFile?.key === file.key
                        ? token.colorPrimaryBg
                        : 'transparent'
                    }}
                    onClick={() => handleFileSelect(file)}
                  >
                    <Flex gap="middle" align="flex-start">
                      <FileTextOutlined
                        style={{
                          color: selectedFile?.key === file.key
                            ? token.colorPrimary
                            : token.colorTextSecondary,
                          fontSize: 20
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <Space>
                          <Text>{file.name || file.key}</Text>
                          {file.size && (
                            <Tag>{formatFileSize(file.size)}</Tag>
                          )}
                        </Space>
                        <div>
                          <Text type="secondary" ellipsis style={{ fontSize: 12 }}>
                            {file.key}
                          </Text>
                        </div>
                      </div>
                    </Flex>
                  </Card>
                ))}
              </Space>
            )}
          </div>
        </Flex>

        {/* 選択ファイル情報 */}
        {selectedFile && (
          <div
            style={{
              padding: token.padding,
              backgroundColor: token.colorPrimaryBg,
              borderRadius: token.borderRadiusLG,
              border: `1px solid ${token.colorPrimary}`
            }}
          >
            <Text strong style={{ color: token.colorPrimary, display: 'block', marginBottom: 8 }}>
              選択中のファイル
            </Text>
            <Space orientation="vertical" size="small">
              <Text>
                <strong>名前:</strong> {selectedFile.name || selectedFile.key}
              </Text>
              <Text ellipsis>
                <strong>パス:</strong> {selectedFile.key}
              </Text>
              {selectedFile.size && (
                <Text>
                  <strong>サイズ:</strong> {formatFileSize(selectedFile.size)}
                </Text>
              )}
            </Space>
          </div>
        )}
      </Space>
    </Modal>
  );
};

/**
 * ファイル一覧からフォルダツリーを構築
 * @param files - ファイル一覧
 * @returns フォルダツリー（ルートノードの配列）
 */
const buildFolderTree = (files: FileInfo[]): FolderNode[] => {
  const tree: FolderNode[] = [];
  const folderMap = new Map<string, FolderNode>();

  // ルートノードを追加
  const rootNode: FolderNode = {
    name: 'ルート',
    path: '/',
    children: [],
    fileCount: 0
  };
  folderMap.set('/', rootNode);
  tree.push(rootNode);

  // 各ファイルからフォルダパスを抽出してツリーに追加
  files.forEach(file => {
    const parts = file.key.split('/');
    parts.pop(); // ファイル名を除外

    let currentPath = '';
    let parentNode = rootNode;

    parts.forEach((part) => {
      currentPath += (currentPath ? '/' : '') + part;

      if (!folderMap.has(currentPath)) {
        const newNode: FolderNode = {
          name: part,
          path: currentPath,
          children: [],
          fileCount: 0
        };

        folderMap.set(currentPath, newNode);
        parentNode.children.push(newNode);
      }

      parentNode = folderMap.get(currentPath)!;
    });

    // ファイルカウントを増やす
    if (parentNode) {
      parentNode.fileCount = (parentNode.fileCount || 0) + 1;
    }
  });

  // 子フォルダがない空フォルダを削除し、ファイル数で並び替え
  const cleanTree = (nodes: FolderNode[]): FolderNode[] => {
    return nodes
      .filter(node => node.children.length > 0 || node.fileCount > 0)
      .map(node => ({
        ...node,
        children: cleanTree(node.children).sort((a, b) => 
          a.name.localeCompare(b.name)
        )
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  return cleanTree(tree);
};

export default WorkflowSelectorDialog;
