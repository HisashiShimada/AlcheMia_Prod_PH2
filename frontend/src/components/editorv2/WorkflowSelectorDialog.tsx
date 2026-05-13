/**
 * WorkflowSelectorDialog - ワークフロー選択ダイアログ
 * 
 * S3に保存されたMaiMLファイルを選択してワークフローとして追加
 * フォルダ階層表示・展開機能対応
 * 
 * @version 1.1.0 (TypeScript移植版)
 * @date 2026-01-29
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Input, Button, Tree, Alert, Typography, Tag, Space, Flex } from 'antd';
import {
  FileOutlined,
  SearchOutlined,
  FolderOutlined,
  FolderOpenOutlined,
} from '@ant-design/icons';
import type { DataNode } from 'antd/es/tree';
import type { FileInfo } from '@/types/editor';
import type { FolderNode } from '@/types/storage';

const { Text } = Typography;

/**
 * WorkflowSelectorDialog Props
 */
interface WorkflowSelectorDialogProps {
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
  availableFiles = [],
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFile, setSelectedFile] = useState<FileInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>(['/']);
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

  // Ant Design Tree用のDataNode変換
  const treeData = useMemo(() => {
    return convertToTreeData(folderTree);
  }, [folderTree]);

  // ダイアログを開いた時の初期化
  useEffect(() => {
    if (open) {
      setSearchQuery('');
      setSelectedFile(null);
      setSelectedFolder(null);
      setError(null);
      // ルートフォルダは自動展開
      setExpandedKeys(['/']);
    }
  }, [open]);

  // フォルダ選択（フォルダ内ファイルをフィルタ表示）
  const handleSelectFolder = (selectedKeys: React.Key[]) => {
    const folderPath = selectedKeys[0] as string;
    setSelectedFolder(folderPath === selectedFolder ? null : folderPath);
    setSearchQuery(''); // フォルダ選択時は検索クエリをクリア
  };

  // フォルダ展開/縮小
  const handleExpand = (expandedKeys: React.Key[]) => {
    setExpandedKeys(expandedKeys);
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
      setError((err as Error).message || 'ワークフロー追加に失敗しました');
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

  return (
    <Modal
      title={
        <Space>
          <FileOutlined />
          <span>ワークフロー選択</span>
        </Space>
      }
      open={open}
      onCancel={onClose}
      width={900}
      style={{ top: 40 }}
      footer={[
        <Button key="cancel" onClick={onClose} disabled={isLoading}>
          キャンセル
        </Button>,
        <Button
          key="submit"
          type="primary"
          onClick={handleConfirm}
          disabled={!selectedFile || isLoading}
          loading={isLoading}
        >
          {isLoading ? '追加中...' : 'ワークフロー追加'}
        </Button>,
      ]}
    >
      <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
        <Text type="secondary">追加するMaiMLファイルを選択してください</Text>

        {/* 検索バー */}
        <Input
          placeholder="ファイル名で検索..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setSelectedFolder(null); // 検索時はフォルダ選択をクリア
          }}
          prefix={<SearchOutlined />}
          allowClear
        />

        {/* エラー表示 */}
        {error && <Alert title={error} type="error" showIcon />}

        {/* フォルダツリーとファイル一覧 */}
        <Flex gap="middle" style={{ height: 400 }}>
          {/* 左側: フォルダツリー */}
          <div
            style={{
              width: '40%',
              borderRight: '1px solid #f0f0f0',
              paddingRight: 12,
              overflowY: 'auto',
            }}
          >
            <Text type="secondary" strong style={{ display: 'block', marginBottom: 8 }}>
              フォルダ
            </Text>
            <Tree
              showLine
              showIcon
              treeData={treeData}
              expandedKeys={expandedKeys}
              onExpand={handleExpand}
              onSelect={handleSelectFolder}
              icon={(props) => {
                if (props.expanded) {
                  return <FolderOpenOutlined style={{ color: '#1890ff' }} />;
                }
                return <FolderOutlined />;
              }}
            />
          </div>

          {/* 右側: ファイル一覧 */}
          <div style={{ width: '60%', overflowY: 'auto' }}>
            <Text type="secondary" strong style={{ display: 'block', marginBottom: 8 }}>
              ファイル {selectedFolder && `(${selectedFolder})`}
            </Text>
            {filteredFiles.length === 0 ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '40px 0',
                }}
              >
                <FolderOutlined style={{ fontSize: 64, color: '#d9d9d9', marginBottom: 16 }} />
                <Text type="secondary">
                  {searchQuery || selectedFolder ? 'ファイルが見つかりません' : 'フォルダを選択してください'}
                </Text>
              </div>
            ) : (
              <div style={{ border: '1px solid #d9d9d9', borderRadius: 6 }}>
                {filteredFiles.map((file) => (
                  <div
                    key={file.key}
                    onClick={() => handleFileSelect(file)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '8px 12px',
                      cursor: 'pointer',
                      backgroundColor: selectedFile?.key === file.key ? '#e6f7ff' : undefined,
                      border: selectedFile?.key === file.key ? '2px solid #1890ff' : undefined,
                      borderBottom: '1px solid #f0f0f0',
                    }}
                  >
                    <FileOutlined
                      style={{
                        fontSize: 20,
                        marginRight: 12,
                        color: selectedFile?.key === file.key ? '#1890ff' : undefined,
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Space>
                        {file.name || file.key}
                        {file.size && (
                          <Tag color="blue">{formatFileSize(file.size)}</Tag>
                        )}
                      </Space>
                      <Text type="secondary" ellipsis style={{ fontSize: 12, display: 'block' }}>
                        {file.key}
                      </Text>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Flex>

        {/* 選択ファイル情報 */}
        {selectedFile && (
          <Alert
            title="選択中のファイル"
            description={
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
            }
            type="info"
            showIcon
          />
        )}
      </Space>
    </Modal>
  );
};

/**
 * ファイル一覧からフォルダツリーを構築
 */
const buildFolderTree = (files: FileInfo[]): FolderNode[] => {
  const tree: FolderNode[] = [];
  const folderMap = new Map<string, FolderNode>();

  // ルートノードを追加
  const rootNode: FolderNode = {
    name: 'ルート',
    path: '/',
    children: [],
    fileCount: 0,
  };
  folderMap.set('/', rootNode);
  tree.push(rootNode);

  // 各ファイルからフォルダパスを抽出してツリーに追加
  files.forEach((file) => {
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
          fileCount: 0,
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

  // 子フォルダがない空フォルダを削除し、名前順で並び替え
  const cleanTree = (nodes: FolderNode[]): FolderNode[] => {
    return nodes
      .filter((node) => node.children.length > 0 || node.fileCount > 0)
      .map((node) => ({
        ...node,
        children: cleanTree(node.children).sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  return cleanTree(tree);
};

/**
 * FolderNodeをAnt Design Tree用のDataNodeに変換
 */
const convertToTreeData = (nodes: FolderNode[]): DataNode[] => {
  return nodes.map((node) => ({
    title: (
      <Space>
        {node.name}
        {node.fileCount > 0 && <Tag color="blue">{node.fileCount}件</Tag>}
      </Space>
    ),
    key: node.path,
    children: node.children.length > 0 ? convertToTreeData(node.children) : undefined,
  }));
};

export default WorkflowSelectorDialog;