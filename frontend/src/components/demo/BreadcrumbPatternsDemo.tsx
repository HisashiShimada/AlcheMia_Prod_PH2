'use client';

import React from 'react';
import { Breadcrumb, Card, Space, Row, Col, Divider, message } from 'antd';
import {
  HomeOutlined,
  FolderOutlined,
  FileOutlined,
  ExperimentOutlined,
  ProjectOutlined,
  SettingOutlined,
  UserOutlined,
  DatabaseOutlined
} from '@ant-design/icons';

/**
 * パターン1-1: 2階層
 */
const Pattern1_2Levels = () => {
  const items = [
    {
      title: 'ホーム',
      href: '#'
    },
    {
      title: 'プロジェクト'
    }
  ];

  return (
    <Card title="パターン1-1: 2階層" size="small">
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <Breadcrumb items={items} />
        
        <Divider style={{ margin: '12px 0' }} />
        
        <div style={{ fontSize: 12, color: '#757575' }}>
          <strong>用途:</strong> トップページから1階層下のページ<br />
          <strong>階層数:</strong> 2階層<br />
          <strong>特徴:</strong> シンプルで視認性が高い
        </div>
      </Space>
    </Card>
  );
};

/**
 * パターン1-2: 3階層
 */
const Pattern1_3Levels = () => {
  const items = [
    {
      title: 'ホーム',
      href: '#',
      onClick: (e: React.MouseEvent) => {
        e.preventDefault();
        message.info('ホームに遷移');
      }
    },
    {
      title: 'プロジェクト',
      href: '#',
      onClick: (e: React.MouseEvent) => {
        e.preventDefault();
        message.info('プロジェクト一覧に遷移');
      }
    },
    {
      title: 'プロジェクト詳細'
    }
  ];

  return (
    <Card title="パターン1-2: 3階層" size="small">
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <Breadcrumb items={items} />
        
        <Divider style={{ margin: '12px 0' }} />
        
        <div style={{ fontSize: 12, color: '#757575' }}>
          <strong>用途:</strong> 最も一般的なパターン<br />
          <strong>階層数:</strong> 3階層<br />
          <strong>特徴:</strong> ホーム → 一覧 → 詳細の流れ
        </div>
      </Space>
    </Card>
  );
};

/**
 * パターン1-3: 4階層（最大）
 */
const Pattern1_4Levels = () => {
  const items = [
    {
      title: 'ホーム',
      href: '#',
      onClick: (e: React.MouseEvent) => {
        e.preventDefault();
        message.info('ホームに遷移');
      }
    },
    {
      title: 'プロジェクト',
      href: '#',
      onClick: (e: React.MouseEvent) => {
        e.preventDefault();
        message.info('プロジェクト一覧に遷移');
      }
    },
    {
      title: 'プロジェクト詳細',
      href: '#',
      onClick: (e: React.MouseEvent) => {
        e.preventDefault();
        message.info('プロジェクト詳細に遷移');
      }
    },
    {
      title: '実験データ'
    }
  ];

  return (
    <Card title="パターン1-3: 4階層（最大）" size="small">
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <Breadcrumb items={items} />
        
        <Divider style={{ margin: '12px 0' }} />
        
        <div style={{ fontSize: 12, color: '#757575' }}>
          <strong>用途:</strong> 深い階層を持つページ<br />
          <strong>階層数:</strong> 4階層（標準パターンの最大）<br />
          <strong>特徴:</strong> これ以上は省略表示を推奨
        </div>
      </Space>
    </Card>
  );
};

/**
 * パターン2-1: アイコン付き（標準）
 */
const Pattern2_WithIcons = () => {
  const items = [
    {
      title: (
        <>
          <HomeOutlined style={{ fontSize: 16 }} />
          <span style={{ marginLeft: 4 }}>ホーム</span>
        </>
      ),
      href: '#',
      onClick: (e: React.MouseEvent) => {
        e.preventDefault();
        message.info('ホームに遷移');
      }
    },
    {
      title: (
        <>
          <FolderOutlined style={{ fontSize: 16 }} />
          <span style={{ marginLeft: 4 }}>プロジェクト</span>
        </>
      ),
      href: '#',
      onClick: (e: React.MouseEvent) => {
        e.preventDefault();
        message.info('プロジェクト一覧に遷移');
      }
    },
    {
      title: (
        <>
          <FileOutlined style={{ fontSize: 16 }} />
          <span style={{ marginLeft: 4 }}>プロジェクト詳細</span>
        </>
      )
    }
  ];

  return (
    <Card title="パターン2-1: アイコン付き（標準）" size="small">
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <Breadcrumb items={items} />
        
        <Divider style={{ margin: '12px 0' }} />
        
        <div style={{ fontSize: 12, color: '#757575' }}>
          <strong>用途:</strong> 視認性を高めたいページ<br />
          <strong>特徴:</strong> 各階層に適切なアイコンを配置<br />
          <strong>アイコンサイズ:</strong> 16px
        </div>
      </Space>
    </Card>
  );
};

/**
 * パターン2-2: ダッシュボード用
 */
const Pattern2_DashboardExample = () => {
  const items = [
    {
      title: (
        <>
          <HomeOutlined style={{ fontSize: 16 }} />
          <span style={{ marginLeft: 4 }}>ダッシュボード</span>
        </>
      ),
      href: '#',
      onClick: (e: React.MouseEvent) => {
        e.preventDefault();
        message.info('ダッシュボードに遷移');
      }
    },
    {
      title: (
        <>
          <DatabaseOutlined style={{ fontSize: 16 }} />
          <span style={{ marginLeft: 4 }}>データ管理</span>
        </>
      ),
      href: '#',
      onClick: (e: React.MouseEvent) => {
        e.preventDefault();
        message.info('データ管理に遷移');
      }
    },
    {
      title: (
        <>
          <ExperimentOutlined style={{ fontSize: 16 }} />
          <span style={{ marginLeft: 4 }}>実験記録</span>
        </>
      )
    }
  ];

  return (
    <Card title="パターン2-2: ダッシュボード用" size="small">
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <Breadcrumb items={items} />
        
        <Divider style={{ margin: '12px 0' }} />
        
        <div style={{ fontSize: 12, color: '#757575' }}>
          <strong>用途:</strong> ダッシュボード、管理画面<br />
          <strong>特徴:</strong> 機能を視覚的に表現<br />
          <strong>推奨:</strong> 主要な機能ページに使用
        </div>
      </Space>
    </Card>
  );
};

/**
 * パターン2-3: 設定画面用
 */
const Pattern2_SettingsExample = () => {
  const items = [
    {
      title: (
        <>
          <HomeOutlined style={{ fontSize: 16 }} />
          <span style={{ marginLeft: 4 }}>ホーム</span>
        </>
      ),
      href: '#',
      onClick: (e: React.MouseEvent) => {
        e.preventDefault();
        message.info('ホームに遷移');
      }
    },
    {
      title: (
        <>
          <SettingOutlined style={{ fontSize: 16 }} />
          <span style={{ marginLeft: 4 }}>システム設定</span>
        </>
      ),
      href: '#',
      onClick: (e: React.MouseEvent) => {
        e.preventDefault();
        message.info('システム設定に遷移');
      }
    },
    {
      title: (
        <>
          <UserOutlined style={{ fontSize: 16 }} />
          <span style={{ marginLeft: 4 }}>ユーザー管理</span>
        </>
      )
    }
  ];

  return (
    <Card title="パターン2-3: 設定画面用" size="small">
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <Breadcrumb items={items} />
        
        <Divider style={{ margin: '12px 0' }} />
        
        <div style={{ fontSize: 12, color: '#757575' }}>
          <strong>用途:</strong> 設定、管理画面<br />
          <strong>特徴:</strong> 設定項目を明確に表示<br />
          <strong>推奨:</strong> 複雑な設定画面に使用
        </div>
      </Space>
    </Card>
  );
};

/**
 * パターン3-1: 5階層以上（ドロップダウン）
 */
const Pattern3_LongPath = () => {
  const items = [
    {
      title: 'ホーム',
      href: '#',
      onClick: (e: React.MouseEvent) => {
        e.preventDefault();
        message.info('ホームに遷移');
      }
    },
    {
      title: '...',
      menu: {
        items: [
          {
            key: '1',
            label: '組織管理',
            onClick: () => message.info('組織管理に遷移')
          },
          {
            key: '2',
            label: 'プロジェクト',
            onClick: () => message.info('プロジェクトに遷移')
          },
          {
            key: '3',
            label: 'プロジェクト詳細',
            onClick: () => message.info('プロジェクト詳細に遷移')
          }
        ]
      }
    },
    {
      title: '実験管理',
      href: '#',
      onClick: (e: React.MouseEvent) => {
        e.preventDefault();
        message.info('実験管理に遷移');
      }
    },
    {
      title: '実験データ詳細'
    }
  ];

  return (
    <Card title="パターン3-1: 5階層以上（ドロップダウン）" size="small">
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <Breadcrumb items={items} />
        
        <Divider style={{ margin: '12px 0' }} />
        
        <div style={{ fontSize: 12, color: '#757575' }}>
          <strong>用途:</strong> 5階層以上の深い階層<br />
          <strong>表示形式:</strong> 先頭1個 + ... + 最後2個<br />
          <strong>特徴:</strong> ドロップダウンで省略された階層を表示<br />
          <strong>操作:</strong> 「...」をクリックして中間階層を表示
        </div>
      </Space>
    </Card>
  );
};

/**
 * パターン3-2: 7階層以上（アイコン付き）
 */
const Pattern3_VeryLongPath = () => {
  const items = [
    {
      title: (
        <>
          <HomeOutlined style={{ fontSize: 16 }} />
          <span style={{ marginLeft: 4 }}>ホーム</span>
        </>
      ),
      href: '#',
      onClick: (e: React.MouseEvent) => {
        e.preventDefault();
        message.info('ホームに遷移');
      }
    },
    {
      title: '...',
      menu: {
        items: [
          {
            key: '1',
            label: (
              <>
                <SettingOutlined style={{ fontSize: 14, marginRight: 8 }} />
                システム管理
              </>
            ),
            onClick: () => message.info('システム管理に遷移')
          },
          {
            key: '2',
            label: (
              <>
                <DatabaseOutlined style={{ fontSize: 14, marginRight: 8 }} />
                組織管理
              </>
            ),
            onClick: () => message.info('組織管理に遷移')
          },
          {
            key: '3',
            label: (
              <>
                <ProjectOutlined style={{ fontSize: 14, marginRight: 8 }} />
                プロジェクト
              </>
            ),
            onClick: () => message.info('プロジェクトに遷移')
          },
          {
            key: '4',
            label: (
              <>
                <FolderOutlined style={{ fontSize: 14, marginRight: 8 }} />
                プロジェクト詳細
              </>
            ),
            onClick: () => message.info('プロジェクト詳細に遷移')
          },
          {
            key: '5',
            label: (
              <>
                <ExperimentOutlined style={{ fontSize: 14, marginRight: 8 }} />
                実験管理
              </>
            ),
            onClick: () => message.info('実験管理に遷移')
          }
        ]
      }
    },
    {
      title: (
        <>
          <FileOutlined style={{ fontSize: 16 }} />
          <span style={{ marginLeft: 4 }}>実験データ</span>
        </>
      ),
      href: '#',
      onClick: (e: React.MouseEvent) => {
        e.preventDefault();
        message.info('実験データに遷移');
      }
    },
    {
      title: '詳細情報'
    }
  ];

  return (
    <Card title="パターン3-2: 7階層以上（アイコン付き）" size="small">
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <Breadcrumb items={items} />
        
        <Divider style={{ margin: '12px 0' }} />
        
        <div style={{ fontSize: 12, color: '#757575' }}>
          <strong>用途:</strong> 非常に深い階層構造<br />
          <strong>表示形式:</strong> 先頭1個 + ... + 最後2個<br />
          <strong>特徴:</strong> アイコンとドロップダウンの組み合わせ<br />
          <strong>操作:</strong> ドロップダウン内もアイコン付きで視認性向上
        </div>
      </Space>
    </Card>
  );
};

/**
 * パターン3-3: モバイル最適化
 */
const Pattern3_MobileOptimized = () => {
  const items = [
    {
      title: 'ホーム',
      href: '#',
      onClick: (e: React.MouseEvent) => {
        e.preventDefault();
        message.info('ホームに遷移');
      }
    },
    {
      title: '...',
      menu: {
        items: [
          {
            key: '1',
            label: 'プロジェクト',
            onClick: () => message.info('プロジェクトに遷移')
          },
          {
            key: '2',
            label: 'プロジェクト詳細',
            onClick: () => message.info('プロジェクト詳細に遷移')
          },
          {
            key: '3',
            label: '実験管理',
            onClick: () => message.info('実験管理に遷移')
          }
        ]
      }
    },
    {
      title: '現在のページ'
    }
  ];

  return (
    <Card title="パターン3-3: モバイル最適化" size="small">
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <Breadcrumb items={items} />
        
        <Divider style={{ margin: '12px 0' }} />
        
        <div style={{ fontSize: 12, color: '#757575' }}>
          <strong>用途:</strong> モバイル表示<br />
          <strong>表示形式:</strong> 先頭1個 + ... + 最後1個<br />
          <strong>特徴:</strong> 画面幅が狭い場合の最適化<br />
          <strong>推奨:</strong> レスポンシブデザインで自動切り替え
        </div>
      </Space>
    </Card>
  );
};

/**
 * パンくずリストパターンのデモコンポーネント
 * 
 * 全3パターンを実装：
 * 1. 標準パンくずリスト（2-4階層）
 * 2. アイコン付きパンくずリスト
 * 3. ドロップダウン付きパンくずリスト（長いパス）
 */
export default function BreadcrumbPatternsDemo() {
  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* ヘッダー */}
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>
            パンくずリストパターン
          </h1>
          <p style={{ fontSize: 14, color: '#757575', marginBottom: 24 }}>
            全3パターンのパンくずリスト実装例。階層の深さに応じて適切なパターンを選択してください。
          </p>
        </div>

        {/* パターン1: 標準パンくずリスト */}
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
            パターン1: 標準パンくずリスト（2-4階層）
          </h2>
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={8}>
              <Pattern1_2Levels />
            </Col>
            <Col xs={24} lg={8}>
              <Pattern1_3Levels />
            </Col>
            <Col xs={24} lg={8}>
              <Pattern1_4Levels />
            </Col>
          </Row>
        </div>

        <Divider />

        {/* パターン2: アイコン付きパンくずリスト */}
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
            パターン2: アイコン付きパンくずリスト
          </h2>
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={8}>
              <Pattern2_WithIcons />
            </Col>
            <Col xs={24} lg={8}>
              <Pattern2_DashboardExample />
            </Col>
            <Col xs={24} lg={8}>
              <Pattern2_SettingsExample />
            </Col>
          </Row>
        </div>

        <Divider />

        {/* パターン3: ドロップダウン付きパンくずリスト */}
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
            パターン3: ドロップダウン付きパンくずリスト（長いパス）
          </h2>
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={8}>
              <Pattern3_LongPath />
            </Col>
            <Col xs={24} lg={8}>
              <Pattern3_VeryLongPath />
            </Col>
            <Col xs={24} lg={8}>
              <Pattern3_MobileOptimized />
            </Col>
          </Row>
        </div>

        <Divider />

        {/* 使用上の注意 */}
        <Card title="使用上の注意" size="small">
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <div>
              <strong style={{ color: '#2e7d32' }}>✅ DO（推奨）</strong>
              <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                <li>階層が深い場合はドロップダウンで省略する</li>
                <li>最後のアイテムはリンクなしにする</li>
                <li>ホームアイコンは先頭のみに使用する</li>
                <li>セパレーターは `/` を使用する（一貫性のため）</li>
                <li>モバイルでは簡潔に表示する</li>
              </ul>
            </div>
            <Divider style={{ margin: '12px 0' }} />
            <div>
              <strong style={{ color: '#d32f2f' }}>❌ DON&apos;T（非推奨）</strong>
              <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                <li>5階層以上を全て表示しない（画面が狭くなる）</li>
                <li>最後のアイテムにリンクを付けない（現在のページのため）</li>
                <li>過度な装飾（背景色、ボーダー等）を避ける</li>
                <li>セパレーターを独自のものに変更しない（`&gt;` や `→` など）</li>
                <li>アイコンを全てのアイテムに付けない（冗長になる）</li>
              </ul>
            </div>
          </Space>
        </Card>
      </Space>
    </div>
  );
}
