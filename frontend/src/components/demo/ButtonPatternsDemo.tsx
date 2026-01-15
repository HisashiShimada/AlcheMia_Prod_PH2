'use client';

import React, { useState } from 'react';
import { 
  Button, 
  Card, 
  Space, 
  Divider, 
  Input,
  Table,
  Modal,
  message,
  theme,
  Typography 
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UploadOutlined,
  DownloadOutlined,
  SearchOutlined,
  ReloadOutlined,
  FileTextOutlined,
  SendOutlined,
  CheckOutlined,
  EyeOutlined,
  SaveOutlined,
  CloseOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
  ClearOutlined,
  GlobalOutlined,
} from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;

export default function ButtonPatternsDemo() {
  const { token } = theme.useToken();
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [stepModalOpen, setStepModalOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // デモ用のハンドラー
  const handleClick = (label: string) => {
    message.info(`${label} ボタンがクリックされました`);
  };

  const handleLoadingClick = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      message.success('処理が完了しました');
    }, 2000);
  };

  // テーブル用のサンプルデータ
  const tableData = [
    { key: '1', id: '001', name: 'サンプルデータ1', status: 'アクティブ', is_active: true },
    { key: '2', id: '002', name: 'サンプルデータ2', status: '非アクティブ', is_active: false },
    { key: '3', id: '003', name: 'サンプルデータ3', status: 'アクティブ', is_active: true },
  ];

  const tableColumns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
    { title: '名前', dataIndex: 'name', key: 'name' },
    { title: 'ステータス', dataIndex: 'status', key: 'status', width: 120 },
    {
      title: '操作',
      key: 'action',
      width: 280,
      render: (_: unknown, record: { is_active: boolean }) => (
        <Space size="small">
          <Button 
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleClick('編集')}
          >
            編集
          </Button>
          <Button 
            size="small"
            type="link"
            icon={<EyeOutlined />}
            onClick={() => handleClick('詳細')}
          >
            詳細
          </Button>
          <Button 
            size="small"
            danger={record.is_active}
            onClick={() => handleClick(record.is_active ? '非アクティブ化' : 'アクティブ化')}
          >
            {record.is_active ? '非アクティブ化' : 'アクティブ化'}
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px', backgroundColor: token.colorBgLayout, minHeight: '100vh' }}>
      <Title level={2}>ボタン形状ポリシー - デモ画面</Title>
      <Paragraph>
        button_policy.mdで定義された標準5パターンと除外パターン、カラーバリエーションを網羅的に表示します。
      </Paragraph>

      {/* 標準5パターン */}
      <Card title="標準5パターン" style={{ marginBottom: 24 }}>
        
        {/* パターン1: 主要アクション */}
        <div style={{ marginBottom: 32 }}>
          <Title level={4}>パターン1: 主要アクション (type=&quot;primary&quot;)</Title>
          <Paragraph type="secondary">
            用途: ページ内で最も重要なアクション（保存、検索、新規作成など）
          </Paragraph>
          <Space wrap>
            <Button type="primary" icon={<EditOutlined />} onClick={() => handleClick('編集')}>
              編集
            </Button>
            <Button type="primary" icon={<SearchOutlined />} onClick={() => handleClick('詳細検索')}>
              詳細検索
            </Button>
            <Button type="primary" icon={<SaveOutlined />} onClick={() => handleClick('保存')}>
              保存
            </Button>
            <Button type="primary" icon={<CheckOutlined />} onClick={() => handleClick('確定')}>
              確定
            </Button>
            <Button 
              type="primary" 
              icon={<SendOutlined />} 
              loading={loading}
              onClick={handleLoadingClick}
            >
              送信
            </Button>
          </Space>
        </div>

        <Divider />

        {/* パターン2: 一般アクション */}
        <div style={{ marginBottom: 32 }}>
          <Title level={4}>パターン2: 一般アクション (type=&quot;default&quot;)</Title>
          <Paragraph type="secondary">
            用途: 通常の操作（追加、リロード、詳細など）
          </Paragraph>
          <Space wrap>
            <Button icon={<PlusOutlined />} onClick={() => handleClick('追加')}>
              追加
            </Button>
            <Button icon={<ReloadOutlined />} onClick={() => handleClick('リロード')}>
              リロード
            </Button>
            <Button icon={<UploadOutlined />} onClick={() => handleClick('CSVアップロード')}>
              CSVアップロード
            </Button>
            <Button icon={<DownloadOutlined />} onClick={() => handleClick('CSVダウンロード')}>
              CSVダウンロード
            </Button>
            <Button icon={<CloseOutlined />} onClick={() => handleClick('キャンセル')}>
              キャンセル
            </Button>
          </Space>
        </div>

        <Divider />

        {/* パターン3: 危険アクション */}
        <div style={{ marginBottom: 32 }}>
          <Title level={4}>パターン3: 危険アクション (danger)</Title>
          <Paragraph type="secondary">
            用途: 削除、非アクティブ化など取り返しのつかない操作
          </Paragraph>
          <Space wrap>
            <Button type="primary" danger icon={<DeleteOutlined />} onClick={() => handleClick('削除')}>
              削除
            </Button>
            <Button 
              danger 
              icon={<DeleteOutlined />}
              onClick={() => handleClick('非アクティブ化')}
            >
              非アクティブ化
            </Button>
            <Button 
              style={{ 
                color: token.colorSuccess,
                borderColor: token.colorSuccess 
              }}
              icon={<CheckOutlined />}
              onClick={() => handleClick('アクティブ化')}
            >
              アクティブ化
            </Button>
          </Space>
        </div>

        <Divider />

        {/* パターン4: テーブル行内アクション */}
        <div style={{ marginBottom: 32 }}>
          <Title level={4}>パターン4: テーブル行内アクション (size="small")</Title>
          <Paragraph type="secondary">
            用途: テーブル各行の操作（編集、詳細、状態切替など）
          </Paragraph>
          <Table 
            dataSource={tableData} 
            columns={tableColumns}
            pagination={false}
            size="small"
          />
        </div>

        <Divider />

        {/* パターン5: テキストリンク */}
        <div style={{ marginBottom: 32 }}>
          <Title level={4}>パターン5: テキストリンク (type=&quot;text&quot; / type=&quot;link&quot;)</Title>
          <Paragraph type="secondary">
            用途: 軽量なアクション、インラインリンク
          </Paragraph>
          <Space wrap>
            <Button type="text" icon={<EyeOutlined />} onClick={() => handleClick('詳細表示')}>
              詳細表示
            </Button>
            <Button type="link" icon={<EyeOutlined />} onClick={() => handleClick('詳細表示')}>
              詳細表示
            </Button>
            <Button type="text" onClick={() => handleClick('キャンセル')}>
              キャンセル
            </Button>
            <Button type="link" onClick={() => handleClick('リンク')}>
              リンク
            </Button>
          </Space>
        </div>
      </Card>

      {/* カラーバリエーション */}
      <Card title="カラーバリエーション (type=&apos;primary&apos; + style)" style={{ marginBottom: 24 }}>
        
        {/* Primary色（赤） */}
        <div style={{ marginBottom: 24 }}>
          <Title level={4}>Primary色（赤）- デフォルト</Title>
          <Space wrap>
            <Button type="primary" icon={<EditOutlined />}>
              編集
            </Button>
            <Button type="primary" icon={<SearchOutlined />}>
              詳細検索
            </Button>
            <Button type="primary" icon={<SendOutlined />}>
              指示送信
            </Button>
          </Space>
        </div>

        <Divider />

        {/* Success色（緑） */}
        <div style={{ marginBottom: 24 }}>
          <Title level={4}>Success色（緑）- 作成・成功</Title>
          <Space wrap>
            <Button 
              type="primary"
              icon={<PlusOutlined />}
              style={{ 
                backgroundColor: token.colorSuccess,
                borderColor: token.colorSuccess 
              }}
            >
              新規作成
            </Button>
            <Button 
              type="primary"
              icon={<UploadOutlined />}
              style={{ 
                backgroundColor: token.colorSuccess,
                borderColor: token.colorSuccess 
              }}
            >
              アップロード
            </Button>
            <Button 
              type="primary"
              icon={<FileTextOutlined />}
              style={{ 
                backgroundColor: token.colorSuccess,
                borderColor: token.colorSuccess 
              }}
            >
              チェックイン
            </Button>
          </Space>
        </div>

        <Divider />

        {/* Info色（青） */}
        <div style={{ marginBottom: 24 }}>
          <Title level={4}>Info色（青）- 情報取得</Title>
          <Space wrap>
            <Button 
              type="primary"
              icon={<DownloadOutlined />}
              style={{ 
                backgroundColor: token.colorInfo,
                borderColor: token.colorInfo 
              }}
            >
              ダウンロード
            </Button>
            <Button 
              type="primary"
              icon={<GlobalOutlined />}
              style={{ 
                backgroundColor: token.colorInfo,
                borderColor: token.colorInfo 
              }}
            >
              公開
            </Button>
          </Space>
        </div>

        <Divider />

        {/* Warning色（オレンジ） */}
        <div style={{ marginBottom: 24 }}>
          <Title level={4}>Warning色（オレンジ）- 注意</Title>
          <Space wrap>
            <Button 
              type="primary"
              icon={<FileTextOutlined />}
              style={{ 
                backgroundColor: token.colorWarning,
                borderColor: token.colorWarning 
              }}
            >
              チェックアウト
            </Button>
          </Space>
        </div>

        <Divider />

        {/* Error色（赤） */}
        <div style={{ marginBottom: 24 }}>
          <Title level={4}>Error色（赤）- 削除・エラー</Title>
          <Space wrap>
            <Button type="primary" danger icon={<DeleteOutlined />}>
              削除
            </Button>
            <Button danger icon={<DeleteOutlined />}>
              非アクティブ化
            </Button>
          </Space>
        </div>
      </Card>

      {/* サイズバリエーション */}
      <Card title="サイズバリエーション" style={{ marginBottom: 24 }}>
        <div style={{ marginBottom: 24 }}>
          <Title level={4}>Large (40px) - ログイン画面など</Title>
          <Space wrap>
            <Button type="primary" size="large" icon={<EditOutlined />}>
              編集
            </Button>
            <Button size="large" icon={<PlusOutlined />}>
              追加
            </Button>
            <Button type="link" size="large" icon={<EyeOutlined />}>
              詳細表示
            </Button>
          </Space>
        </div>

        <Divider />

        <div style={{ marginBottom: 24 }}>
          <Title level={4}>Middle (32px) - 標準</Title>
          <Space wrap>
            <Button type="primary" icon={<EditOutlined />}>
              編集
            </Button>
            <Button icon={<PlusOutlined />}>
              追加
            </Button>
            <Button type="link" icon={<EyeOutlined />}>
              詳細表示
            </Button>
          </Space>
        </div>

        <Divider />

        <div style={{ marginBottom: 24 }}>
          <Title level={4}>Small (24px) - テーブル行内</Title>
          <Space wrap>
            <Button type="primary" size="small" icon={<EditOutlined />}>
              編集
            </Button>
            <Button size="small" icon={<PlusOutlined />}>
              追加
            </Button>
            <Button type="link" size="small" icon={<EyeOutlined />}>
              詳細表示
            </Button>
          </Space>
        </div>
      </Card>

      {/* 配置パターン */}
      <Card title="配置パターン" style={{ marginBottom: 24 }}>
        
        {/* ツールバー配置 */}
        <div style={{ marginBottom: 32 }}>
          <Title level={4}>ツールバー配置</Title>
          <Paragraph type="secondary">
            左側: 検索・フィルタ、右側: CSV操作・追加・リロード
          </Paragraph>
          <Space size="middle" style={{ width: '100%', justifyContent: 'space-between' }}>
            <Space size="small">
              <Input 
                prefix={<SearchOutlined />}
                placeholder="検索"
                style={{ width: 250 }}
                allowClear
              />
              <Button type="primary" icon={<SearchOutlined />}>
                詳細検索
              </Button>
            </Space>
            
            <Space size="small">
              <Button icon={<UploadOutlined />}>CSVアップロード</Button>
              <Button icon={<DownloadOutlined />}>CSVダウンロード</Button>
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                style={{ 
                  backgroundColor: token.colorSuccess,
                  borderColor: token.colorSuccess 
                }}
              >
                追加
              </Button>
              <Button icon={<ReloadOutlined />}>リロード</Button>
            </Space>
          </Space>
        </div>

        <Divider />

        {/* モーダルフッター配置 */}
        <div style={{ marginBottom: 24 }}>
          <Title level={4}>モーダルフッター配置</Title>
          <Paragraph type="secondary">
            左側: クリア、右側: キャンセル・保存
          </Paragraph>
          <Button onClick={() => setModalOpen(true)}>
            モーダルを開く
          </Button>
        </div>

        <Divider />

        {/* ステップ式モーダル */}
        <div style={{ marginBottom: 24 }}>
          <Title level={4}>ステップ式モーダルフッター</Title>
          <Paragraph type="secondary">
            左側: 戻る、右側: キャンセル・次へ/完了
          </Paragraph>
          <Button onClick={() => setStepModalOpen(true)}>
            ステップモーダルを開く
          </Button>
        </div>
      </Card>

      {/* 除外パターン */}
      <Card title="除外パターン（特殊用途）" style={{ marginBottom: 24 }}>
        
        <div style={{ marginBottom: 24 }}>
          <Title level={4}>Dashed Type - プレースホルダー的な追加</Title>
          <Space wrap>
            <Button type="dashed" icon={<PlusOutlined />}>
              項目を追加
            </Button>
            <Button type="dashed" block icon={<PlusOutlined />} style={{ width: 300 }}>
              領域を追加
            </Button>
          </Space>
        </div>

        <Divider />

        <div style={{ marginBottom: 24 }}>
          <Title level={4}>Ghost Type - 透明背景</Title>
          <Space wrap>
            <Button type="primary" ghost icon={<EditOutlined />}>
              編集
            </Button>
            <Button type="primary" ghost danger icon={<DeleteOutlined />}>
              削除
            </Button>
          </Space>
        </div>

        <Divider />

        <div style={{ marginBottom: 24 }}>
          <Title level={4}>Circle/Round Shape - アイコンのみ</Title>
          <Space wrap>
            <Button icon={<SearchOutlined />} shape="circle" />
            <Button icon={<EditOutlined />} shape="circle" />
            <Button icon={<DeleteOutlined />} shape="circle" danger />
            <Button type="primary" icon={<PlusOutlined />} shape="circle" />
          </Space>
        </div>

        <Divider />

        <div style={{ marginBottom: 24 }}>
          <Title level={4}>Block Type - 全幅</Title>
          <div style={{ maxWidth: 400 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button type="primary" block icon={<SaveOutlined />}>
                保存
              </Button>
              <Button block icon={<CloseOutlined />}>
                キャンセル
              </Button>
            </Space>
          </div>
        </div>

        <Divider />

        <div style={{ marginBottom: 24 }}>
          <Title level={4}>Button Group - 連結ボタン</Title>
          <Space direction="vertical">
            <Button.Group>
              <Button>左</Button>
              <Button>中央</Button>
              <Button>右</Button>
            </Button.Group>
            <Button.Group>
              <Button icon={<ArrowLeftOutlined />}>前へ</Button>
              <Button icon={<ArrowRightOutlined />}>次へ</Button>
            </Button.Group>
          </Space>
        </div>
      </Card>

      {/* 状態デモ */}
      <Card title="ボタンの状態" style={{ marginBottom: 24 }}>
        <div style={{ marginBottom: 24 }}>
          <Title level={4}>無効状態 (disabled)</Title>
          <Space wrap>
            <Button type="primary" disabled icon={<EditOutlined />}>
              編集（無効）
            </Button>
            <Button disabled icon={<PlusOutlined />}>
              追加（無効）
            </Button>
            <Button type="link" disabled icon={<EyeOutlined />}>
              詳細（無効）
            </Button>
          </Space>
        </div>

        <Divider />

        <div style={{ marginBottom: 24 }}>
          <Title level={4}>ローディング状態 (loading)</Title>
          <Space wrap>
            <Button 
              type="primary" 
              loading={loading}
              icon={<SaveOutlined />}
              onClick={handleLoadingClick}
            >
              保存
            </Button>
            <Button 
              loading={loading}
              icon={<UploadOutlined />}
              onClick={handleLoadingClick}
            >
              アップロード
            </Button>
            <Text type="secondary">※ボタンをクリックすると2秒間ローディング状態になります</Text>
          </Space>
        </div>
      </Card>

      {/* モーダル */}
      <Modal
        title="編集"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button onClick={() => handleClick('クリア')} icon={<ClearOutlined />}>
              クリア
            </Button>
            <Space size="small">
              <Button onClick={() => setModalOpen(false)} icon={<CloseOutlined />}>
                キャンセル
              </Button>
              <Button 
                type="primary" 
                onClick={() => {
                  handleClick('保存');
                  setModalOpen(false);
                }}
                icon={<SaveOutlined />}
              >
                保存
              </Button>
            </Space>
          </div>
        }
      >
        <p>モーダルのコンテンツがここに入ります。</p>
        <p>左側にクリアボタン、右側にキャンセル・保存ボタンが配置されています。</p>
      </Modal>

      {/* ステップ式モーダル */}
      <Modal
        title={`ステップ ${currentStep + 1} / 3`}
        open={stepModalOpen}
        onCancel={() => {
          setStepModalOpen(false);
          setCurrentStep(0);
        }}
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button 
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              icon={<ArrowLeftOutlined />}
              disabled={currentStep === 0}
            >
              戻る
            </Button>
            <Space size="small">
              <Button onClick={() => {
                setStepModalOpen(false);
                setCurrentStep(0);
              }}>
                キャンセル
              </Button>
              {currentStep < 2 ? (
                <Button 
                  type="primary" 
                  onClick={() => setCurrentStep(currentStep + 1)}
                  icon={<ArrowRightOutlined />}
                >
                  次へ
                </Button>
              ) : (
                <Button 
                  type="primary" 
                  onClick={() => {
                    handleClick('選択完了');
                    setStepModalOpen(false);
                    setCurrentStep(0);
                  }}
                  icon={<CheckOutlined />}
                >
                  選択完了
                </Button>
              )}
            </Space>
          </div>
        }
      >
        <p>ステップ {currentStep + 1} のコンテンツがここに入ります。</p>
        <p>左側に戻るボタン、右側にキャンセル・次へ（または完了）ボタンが配置されています。</p>
      </Modal>
    </div>
  );
}
