'use client';

import React, { useState, useMemo } from 'react';
import { Tree, Input, Card, Typography, Space, Row, Col, Divider, Tag, Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import {
  FolderOutlined,
  FolderOpenOutlined,
  FileOutlined,
  SearchOutlined,
  MoreOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import type { TreeDataNode, TreeProps } from 'antd';

const { Title, Text, Paragraph } = Typography;
const { Search } = Input;

// パターン1: 標準ツリー用データ
const organizationTreeData: TreeDataNode[] = [
  {
    title: '本社',
    key: '0',
    children: [
      {
        title: '開発部',
        key: '0-0',
        children: [
          { title: 'フロントエンドチーム', key: '0-0-0' },
          { title: 'バックエンドチーム', key: '0-0-1' },
          { title: 'インフラチーム', key: '0-0-2' },
        ],
      },
      {
        title: '営業部',
        key: '0-1',
        children: [
          { title: '国内営業', key: '0-1-0' },
          { title: '海外営業', key: '0-1-1' },
        ],
      },
      {
        title: '人事部',
        key: '0-2',
        children: [
          { title: '採用担当', key: '0-2-0' },
          { title: '労務担当', key: '0-2-1' },
        ],
      },
    ],
  },
  {
    title: '大阪支社',
    key: '1',
    children: [
      { title: '開発部', key: '1-0' },
      { title: '営業部', key: '1-1' },
    ],
  },
];

// パターン2: チェックボックスツリー用データ
const permissionTreeData: TreeDataNode[] = [
  {
    title: 'ユーザー管理',
    key: '0',
    children: [
      { title: 'ユーザー一覧閲覧', key: '0-0' },
      { title: 'ユーザー作成', key: '0-1' },
      { title: 'ユーザー編集', key: '0-2' },
      { title: 'ユーザー削除', key: '0-3' },
    ],
  },
  {
    title: '組織管理',
    key: '1',
    children: [
      { title: '組織一覧閲覧', key: '1-0' },
      { title: '組織作成', key: '1-1' },
      { title: '組織編集', key: '1-2' },
      { title: '組織削除', key: '1-3' },
    ],
  },
  {
    title: 'プロジェクト管理',
    key: '2',
    children: [
      { title: 'プロジェクト一覧閲覧', key: '2-0' },
      { title: 'プロジェクト作成', key: '2-1' },
      { title: 'プロジェクト編集', key: '2-2' },
    ],
  },
  {
    title: '実験管理',
    key: '3',
    children: [
      { title: '実験一覧閲覧', key: '3-0' },
      { title: '実験データ登録', key: '3-1' },
      { title: '実験データ編集', key: '3-2' },
    ],
  },
];

// パターン3: ディレクトリツリー用データ
const directoryTreeData: TreeDataNode[] = [
  {
    title: 'プロジェクト',
    key: '0',
    icon: <FolderOutlined />,
    children: [
      {
        title: 'src',
        key: '0-0',
        icon: <FolderOutlined />,
        children: [
          {
            title: 'components',
            key: '0-0-0',
            icon: <FolderOutlined />,
            children: [
              { title: 'Header.tsx', key: '0-0-0-0', icon: <FileOutlined />, isLeaf: true },
              { title: 'Footer.tsx', key: '0-0-0-1', icon: <FileOutlined />, isLeaf: true },
            ],
          },
          {
            title: 'pages',
            key: '0-0-1',
            icon: <FolderOutlined />,
            children: [
              { title: 'index.tsx', key: '0-0-1-0', icon: <FileOutlined />, isLeaf: true },
              { title: 'about.tsx', key: '0-0-1-1', icon: <FileOutlined />, isLeaf: true },
            ],
          },
          { title: 'App.tsx', key: '0-0-2', icon: <FileOutlined />, isLeaf: true },
          { title: 'index.tsx', key: '0-0-3', icon: <FileOutlined />, isLeaf: true },
        ],
      },
      {
        title: 'public',
        key: '0-1',
        icon: <FolderOutlined />,
        children: [
          { title: 'favicon.ico', key: '0-1-0', icon: <FileOutlined />, isLeaf: true },
          { title: 'logo.png', key: '0-1-1', icon: <FileOutlined />, isLeaf: true },
        ],
      },
      { title: 'package.json', key: '0-2', icon: <FileOutlined />, isLeaf: true },
      { title: 'tsconfig.json', key: '0-3', icon: <FileOutlined />, isLeaf: true },
      { title: 'README.md', key: '0-4', icon: <FileOutlined />, isLeaf: true },
    ],
  },
];

// 応用パターン: 検索可能ツリー用データ
const searchableTreeData: TreeDataNode[] = [
  {
    title: '材料科学',
    key: '0',
    children: [
      {
        title: '金属材料',
        key: '0-0',
        children: [
          { title: '鉄鋼材料', key: '0-0-0' },
          { title: 'アルミニウム合金', key: '0-0-1' },
          { title: 'チタン合金', key: '0-0-2' },
        ],
      },
      {
        title: 'セラミックス',
        key: '0-1',
        children: [
          { title: '酸化物セラミックス', key: '0-1-0' },
          { title: '窒化物セラミックス', key: '0-1-1' },
        ],
      },
    ],
  },
  {
    title: '高分子材料',
    key: '1',
    children: [
      { title: '熱可塑性樹脂', key: '1-0' },
      { title: '熱硬化性樹脂', key: '1-1' },
      { title: 'エラストマー', key: '1-2' },
    ],
  },
  {
    title: '複合材料',
    key: '2',
    children: [
      { title: '炭素繊維強化プラスチック', key: '2-0' },
      { title: 'ガラス繊維強化プラスチック', key: '2-1' },
    ],
  },
];

// 応用パターン: ドラッグ可能ツリー用データ
const draggableTreeData: TreeDataNode[] = [
  {
    title: '実験グループA',
    key: '0',
    children: [
      { title: '実験001', key: '0-0' },
      { title: '実験002', key: '0-1' },
      { title: '実験003', key: '0-2' },
    ],
  },
  {
    title: '実験グループB',
    key: '1',
    children: [
      { title: '実験004', key: '1-0' },
      { title: '実験005', key: '1-1' },
    ],
  },
];

// 応用パターン: 仮想スクロールツリー用データ（大量データ生成）
const generateVirtualTreeData = (count: number): TreeDataNode[] => {
  const data: TreeDataNode[] = [];
  for (let i = 0; i < count; i++) {
    data.push({
      title: `ノード ${i + 1}`,
      key: `${i}`,
      children: [
        { title: `子ノード ${i}-1`, key: `${i}-0` },
        { title: `子ノード ${i}-2`, key: `${i}-1` },
        { title: `子ノード ${i}-3`, key: `${i}-2` },
      ],
    });
  }
  return data;
};

const TreePatternsDemo: React.FC = () => {
  const [selectedKeys1, setSelectedKeys1] = useState<React.Key[]>([]);
  const [checkedKeys, setCheckedKeys] = useState<React.Key[]>([]);
  const [selectedKeys3, setSelectedKeys3] = useState<React.Key[]>([]);
  const [searchValue, setSearchValue] = useState('');
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [autoExpandParent, setAutoExpandParent] = useState(true);
  const [draggableData, setDraggableData] = useState(draggableTreeData);

  // 仮想スクロールツリーデータ（1000ノード）
  const virtualTreeData = useMemo(() => generateVirtualTreeData(1000), []);

  // 検索機能の実装
  const getParentKey = (key: React.Key, tree: TreeDataNode[]): React.Key => {
    let parentKey: React.Key = '';
    for (let i = 0; i < tree.length; i++) {
      const node = tree[i];
      if (node.children) {
        if (node.children.some((item) => item.key === key)) {
          parentKey = node.key;
        } else if (getParentKey(key, node.children)) {
          parentKey = getParentKey(key, node.children);
        }
      }
    }
    return parentKey;
  };

  const onSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    const newExpandedKeys: React.Key[] = [];

    const loop = (data: TreeDataNode[]) => {
      data.forEach((item) => {
        if (item.title && typeof item.title === 'string' && item.title.indexOf(value) > -1) {
          const key = getParentKey(item.key, searchableTreeData);
          if (key) newExpandedKeys.push(key);
        }
        if (item.children) {
          loop(item.children);
        }
      });
    };

    loop(searchableTreeData);
    setExpandedKeys(newExpandedKeys);
    setSearchValue(value);
    setAutoExpandParent(true);
  };

  const onExpand = (newExpandedKeys: React.Key[]) => {
    setExpandedKeys(newExpandedKeys);
    setAutoExpandParent(false);
  };

  // 検索結果のハイライト表示
  const highlightSearchValue = (title: string) => {
    const index = title.indexOf(searchValue);
    if (searchValue && index > -1) {
      const beforeStr = title.substring(0, index);
      const matchStr = title.substring(index, index + searchValue.length);
      const afterStr = title.substring(index + searchValue.length);
      return (
        <span>
          {beforeStr}
          <span style={{ color: '#CF0027', fontWeight: 'bold' }}>{matchStr}</span>
          {afterStr}
        </span>
      );
    }
    return <span>{title}</span>;
  };

  const searchableTreeDataWithHighlight = useMemo(() => {
    const loop = (data: TreeDataNode[]): TreeDataNode[] =>
      data.map((item) => {
        const strTitle = item.title as string;
        const index = strTitle.indexOf(searchValue);
        const title = highlightSearchValue(strTitle);
        if (item.children) {
          return { ...item, title, children: loop(item.children) };
        }
        return { ...item, title };
      });

    return loop(searchableTreeData);
  }, [searchValue, highlightSearchValue]);

  // ドラッグ&ドロップの実装
  const onDrop: TreeProps['onDrop'] = (info) => {
    const dropKey = info.node.key;
    const dragKey = info.dragNode.key;
    const dropPos = info.node.pos.split('-');
    const dropPosition = info.dropPosition - Number(dropPos[dropPos.length - 1]);

    const loop = (
      data: TreeDataNode[],
      key: React.Key,
      callback: (node: TreeDataNode, i: number, data: TreeDataNode[]) => void,
    ) => {
      for (let i = 0; i < data.length; i++) {
        if (data[i].key === key) {
          return callback(data[i], i, data);
        }
        if (data[i].children) {
          loop(data[i].children!, key, callback);
        }
      }
    };

    const data = [...draggableData];
    let dragObj: TreeDataNode;

    loop(data, dragKey, (item, index, arr) => {
      arr.splice(index, 1);
      dragObj = item;
    });

    if (!info.dropToGap) {
      loop(data, dropKey, (item) => {
        item.children = item.children || [];
        item.children.unshift(dragObj);
      });
    } else if (
      ((info.node as unknown as { props: { children?: unknown[]; expanded?: boolean } }).props.children || []).length > 0 &&
      (info.node as unknown as { props: { children?: unknown[]; expanded?: boolean } }).props.expanded &&
      dropPosition === 1
    ) {
      loop(data, dropKey, (item) => {
        item.children = item.children || [];
        item.children.unshift(dragObj);
      });
    } else {
      let ar: TreeDataNode[] = [];
      let i: number;
      loop(data, dropKey, (_item, index, arr) => {
        ar = arr;
        i = index;
      });
      if (dropPosition === -1) {
        ar.splice(i!, 0, dragObj!);
      } else {
        ar.splice(i! + 1, 0, dragObj!);
      }
    }

    setDraggableData(data);
  };

  // コンテキストメニューのアイテム
  const contextMenuItems: MenuProps['items'] = [
    {
      key: 'edit',
      icon: <EditOutlined />,
      label: '編集',
    },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      label: '削除',
      danger: true,
    },
    {
      type: 'divider',
    },
    {
      key: 'new',
      icon: <PlusOutlined />,
      label: '新規作成',
    },
  ];

  return (
    <div style={{ padding: '24px', backgroundColor: '#fafafa', minHeight: '100vh' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* ヘッダー */}
        <div>
          <Title level={2}>ツリー構造表示パターン</Title>
          <Paragraph>
            階層データを表示するためのツリーコンポーネントの標準パターンと応用パターンを示します。
          </Paragraph>
        </div>

        <Divider />

        {/* パターン1: 標準ツリー */}
        <Card title="パターン1: 標準ツリー" style={{ marginBottom: 24 }}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Tag color="blue">用途</Tag>
              <Text>階層データの閲覧・ナビゲーション</Text>
            </div>
            <div>
              <Text type="secondary">
                組織階層、カテゴリー階層、メニュー構造などの表示に使用します。
              </Text>
            </div>

            <Row gutter={24}>
              <Col span={12}>
                <Card type="inner" title="デフォルト表示">
                  <Tree
                    treeData={organizationTreeData}
                    defaultExpandAll
                    showIcon
                    selectedKeys={selectedKeys1}
                    onSelect={(keys) => setSelectedKeys1(keys)}
                  />
                </Card>
              </Col>
              <Col span={12}>
                <Card type="inner" title="初期状態（折りたたみ）">
                  <Tree
                    treeData={organizationTreeData}
                    showIcon
                    defaultExpandedKeys={['0']}
                  />
                </Card>
              </Col>
            </Row>

            <Card type="inner" title="仕様詳細">
              <Space direction="vertical" size="small">
                <Text>• 行の高さ: 32px</Text>
                <Text>• フォントサイズ: 14px</Text>
                <Text>• インデント幅: 24px</Text>
                <Text>• アイコンサイズ: 16px</Text>
                <Text>• showLine: false（線を表示しない）</Text>
                <Text>• showIcon: true（アイコンを表示）</Text>
                <Text>• selectable: true（選択可能）</Text>
                <Text>• multiple: false（単一選択）</Text>
              </Space>
            </Card>
          </Space>
        </Card>

        <Divider />

        {/* パターン2: チェックボックスツリー */}
        <Card title="パターン2: チェックボックスツリー" style={{ marginBottom: 24 }}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Tag color="green">用途</Tag>
              <Text>階層データからの複数選択</Text>
            </div>
            <div>
              <Text type="secondary">
                権限設定、カテゴリー選択、フィルター設定などに使用します。
              </Text>
            </div>

            <Row gutter={24}>
              <Col span={12}>
                <Card type="inner" title="親子連動あり">
                  <Tree
                    checkable
                    treeData={permissionTreeData}
                    defaultExpandAll
                    checkedKeys={checkedKeys}
                    onCheck={(keys) => setCheckedKeys(keys as React.Key[])}
                  />
                </Card>
              </Col>
              <Col span={12}>
                <Card type="inner" title="親子連動なし">
                  <Tree
                    checkable
                    checkStrictly
                    treeData={permissionTreeData}
                    defaultExpandAll
                  />
                </Card>
              </Col>
            </Row>

            <Card type="inner" title="選択された権限">
              <Text>選択数: {checkedKeys.length}件</Text>
              <div style={{ marginTop: 8 }}>
                {checkedKeys.map((key) => (
                  <Tag key={key} color="blue" style={{ marginBottom: 4 }}>
                    {key}
                  </Tag>
                ))}
              </div>
            </Card>

            <Card type="inner" title="仕様詳細">
              <Space direction="vertical" size="small">
                <Text>• checkable: true（チェックボックス表示）</Text>
                <Text>• checkStrictly: false（親子連動あり）</Text>
                <Text>• showIcon: false（アイコン非表示）</Text>
                <Text>• selectable: false（クリックで選択しない）</Text>
              </Space>
            </Card>
          </Space>
        </Card>

        <Divider />

        {/* パターン3: ディレクトリツリー */}
        <Card title="パターン3: ディレクトリツリー" style={{ marginBottom: 24 }}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Tag color="purple">用途</Tag>
              <Text>ファイル/フォルダ構造の表示</Text>
            </div>
            <div>
              <Text type="secondary">
                ファイルエクスプローラー、プロジェクト構造、ドキュメント階層などの表示に使用します。
              </Text>
            </div>

            <Row gutter={24}>
              <Col span={12}>
                <Card type="inner" title="フォルダ構造">
                  <Tree
                    showLine
                    showIcon
                    treeData={directoryTreeData}
                    defaultExpandAll
                    selectedKeys={selectedKeys3}
                    onSelect={(keys) => setSelectedKeys3(keys)}
                    switcherIcon={<FolderOutlined />}
                  />
                </Card>
              </Col>
              <Col span={12}>
                <Card type="inner" title="選択されたファイル">
                  {selectedKeys3.length > 0 ? (
                    <Space direction="vertical">
                      <Text strong>選択: {selectedKeys3[0]}</Text>
                      <Text type="secondary">
                        ファイルのプロパティや内容をここに表示できます。
                      </Text>
                    </Space>
                  ) : (
                    <Text type="secondary">ファイルを選択してください</Text>
                  )}
                </Card>
              </Col>
            </Row>

            <Card type="inner" title="仕様詳細">
              <Space direction="vertical" size="small">
                <Text>• showLine: true（線を表示）</Text>
                <Text>• showIcon: true（アイコン表示）</Text>
                <Text>• フォルダアイコン: FolderOutlined / FolderOpenOutlined</Text>
                <Text>• ファイルアイコン: FileOutlined</Text>
                <Text>• isLeaf: true（末端ノード）</Text>
              </Space>
            </Card>
          </Space>
        </Card>

        <Divider />

        {/* 応用パターン1: 検索可能ツリー */}
        <Card title="応用パターン: 検索可能ツリー" style={{ marginBottom: 24 }}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Tag color="cyan">応用</Tag>
              <Text>検索機能付きツリー</Text>
            </div>
            <div>
              <Text type="secondary">
                大量の階層データから特定項目を検索する際に使用します。
              </Text>
            </div>

            <Card type="inner">
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <Search
                  placeholder="材料名で検索..."
                  onChange={onSearch}
                  style={{ width: 250 }}
                  prefix={<SearchOutlined />}
                  allowClear
                />
                <Tree
                  treeData={searchableTreeDataWithHighlight}
                  expandedKeys={expandedKeys}
                  autoExpandParent={autoExpandParent}
                  onExpand={onExpand}
                  showIcon
                />
              </Space>
            </Card>
          </Space>
        </Card>

        <Divider />

        {/* 応用パターン2: ドラッグ可能ツリー */}
        <Card title="応用パターン: ドラッグ可能ツリー" style={{ marginBottom: 24 }}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Tag color="orange">応用</Tag>
              <Text>ドラッグ&ドロップによる並び替え</Text>
            </div>
            <div>
              <Text type="secondary">
                階層構造の並び替えや再編成に使用します。ノードをドラッグして移動できます。
              </Text>
            </div>

            <Card type="inner">
              <Tree
                draggable
                blockNode
                treeData={draggableData}
                defaultExpandAll
                onDrop={onDrop}
              />
            </Card>
          </Space>
        </Card>

        <Divider />

        {/* 応用パターン3: 仮想スクロールツリー */}
        <Card title="応用パターン: 仮想スクロールツリー" style={{ marginBottom: 24 }}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Tag color="red">応用</Tag>
              <Text>大量データ対応（1000ノード）</Text>
            </div>
            <div>
              <Text type="secondary">
                1000ノード以上の大量データを効率的に表示します。仮想スクロールによりパフォーマンスを維持します。
              </Text>
            </div>

            <Card type="inner">
              <Tree
                treeData={virtualTreeData}
                height={400}
                virtual
                defaultExpandedKeys={['0', '1', '2']}
              />
            </Card>
          </Space>
        </Card>

        <Divider />

        {/* 応用パターン4: コンテキストメニュー付きツリー */}
        <Card title="応用パターン: コンテキストメニュー付きツリー" style={{ marginBottom: 24 }}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Tag color="magenta">応用</Tag>
              <Text>右クリックメニュー対応</Text>
            </div>
            <div>
              <Text type="secondary">
                ファイル操作や項目管理で、右クリックメニューから各種操作を実行できます。
              </Text>
            </div>

            <Card type="inner">
              <Tree
                showLine
                showIcon
                treeData={directoryTreeData.map((node) => ({
                  ...node,
                  title: (
                    <Dropdown menu={{ items: contextMenuItems }} trigger={['contextMenu']}>
                      <span style={{ userSelect: 'none' }}>{node.title}</span>
                    </Dropdown>
                  ),
                }))}
                defaultExpandAll
              />
              <div style={{ marginTop: 16 }}>
                <Text type="secondary">
                  ノード上で右クリックするとメニューが表示されます。
                </Text>
              </div>
            </Card>
          </Space>
        </Card>

        <Divider />

        {/* 色とスタイル */}
        <Card title="色とスタイルの定義">
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Card type="inner" title="通常状態">
                <Space direction="vertical" size="small">
                  <div>
                    <div
                      style={{
                        display: 'inline-block',
                        width: 16,
                        height: 16,
                        backgroundColor: '#ffffff',
                        border: '1px solid #d9d9d9',
                        marginRight: 8,
                      }}
                    />
                    <Text>背景色: #ffffff</Text>
                  </div>
                  <div>
                    <div
                      style={{
                        display: 'inline-block',
                        width: 16,
                        height: 16,
                        backgroundColor: '#212121',
                        marginRight: 8,
                      }}
                    />
                    <Text>テキスト色: #212121</Text>
                  </div>
                  <div>
                    <div
                      style={{
                        display: 'inline-block',
                        width: 16,
                        height: 16,
                        backgroundColor: '#757575',
                        marginRight: 8,
                      }}
                    />
                    <Text>アイコン色: #757575</Text>
                  </div>
                </Space>
              </Card>
            </Col>

            <Col span={12}>
              <Card type="inner" title="ホバー状態">
                <Space direction="vertical" size="small">
                  <div>
                    <div
                      style={{
                        display: 'inline-block',
                        width: 16,
                        height: 16,
                        backgroundColor: '#f5f5f5',
                        border: '1px solid #d9d9d9',
                        marginRight: 8,
                      }}
                    />
                    <Text>背景色: #f5f5f5</Text>
                  </div>
                  <div>
                    <div
                      style={{
                        display: 'inline-block',
                        width: 16,
                        height: 16,
                        backgroundColor: '#212121',
                        marginRight: 8,
                      }}
                    />
                    <Text>テキスト色: #212121</Text>
                  </div>
                </Space>
              </Card>
            </Col>

            <Col span={12}>
              <Card type="inner" title="選択状態">
                <Space direction="vertical" size="small">
                  <div>
                    <div
                      style={{
                        display: 'inline-block',
                        width: 16,
                        height: 16,
                        backgroundColor: '#FFF1F3',
                        border: '1px solid #CF0027',
                        marginRight: 8,
                      }}
                    />
                    <Text>背景色: #FFF1F3</Text>
                  </div>
                  <div>
                    <div
                      style={{
                        display: 'inline-block',
                        width: 16,
                        height: 16,
                        backgroundColor: '#CF0027',
                        marginRight: 8,
                      }}
                    />
                    <Text>テキスト色: #CF0027</Text>
                  </div>
                  <div>
                    <div
                      style={{
                        display: 'inline-block',
                        width: 16,
                        height: 16,
                        backgroundColor: '#CF0027',
                        marginRight: 8,
                      }}
                    />
                    <Text>アイコン色: #CF0027</Text>
                  </div>
                </Space>
              </Card>
            </Col>

            <Col span={12}>
              <Card type="inner" title="無効状態">
                <Space direction="vertical" size="small">
                  <div>
                    <div
                      style={{
                        display: 'inline-block',
                        width: 16,
                        height: 16,
                        backgroundColor: '#ffffff',
                        border: '1px solid #d9d9d9',
                        marginRight: 8,
                      }}
                    />
                    <Text>背景色: #ffffff</Text>
                  </div>
                  <div>
                    <div
                      style={{
                        display: 'inline-block',
                        width: 16,
                        height: 16,
                        backgroundColor: '#bdbdbd',
                        marginRight: 8,
                      }}
                    />
                    <Text>テキスト色: #bdbdbd</Text>
                  </div>
                  <div>
                    <div
                      style={{
                        display: 'inline-block',
                        width: 16,
                        height: 16,
                        backgroundColor: '#bdbdbd',
                        marginRight: 8,
                      }}
                    />
                    <Text>アイコン色: #bdbdbd</Text>
                  </div>
                </Space>
              </Card>
            </Col>
          </Row>
        </Card>
      </Space>
    </div>
  );
};

export default TreePatternsDemo;
