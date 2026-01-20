'use client';

import React, { useState } from 'react';
import { Spin, Button, Card, Space, Typography, Tag, Table, Modal, message } from 'antd';
import { SaveOutlined, DeleteOutlined, DownloadOutlined, ReloadOutlined } from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;

/**
 * ローディングスピナー形状ポリシーのテスト画面
 * 
 * 標準3パターンを表示:
 * 1. 全画面オーバーレイ型
 * 2. コンテナオーバーレイ型
 * 3. インライン型（ボタン内）
 */
export default function LoadingSpinnerPatternsDemo() {
  // パターン1: 全画面オーバーレイ
  const [fullScreenLoading, setFullScreenLoading] = useState(false);
  
  // パターン2: コンテナオーバーレイ
  const [cardLoading, setCardLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  
  // パターン3: インライン型（ボタン内）
  const [saveLoading, setSaveLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);

  // テーブルデータ
  const tableData = [
    { key: '1', name: 'プロジェクトA', status: '進行中', date: '2024-01-15' },
    { key: '2', name: 'プロジェクトB', status: '完了', date: '2024-02-20' },
    { key: '3', name: 'プロジェクトC', status: '計画中', date: '2024-03-10' },
  ];

  const tableColumns = [
    { title: 'プロジェクト名', dataIndex: 'name', key: 'name' },
    { title: 'ステータス', dataIndex: 'status', key: 'status' },
    { title: '日付', dataIndex: 'date', key: 'date' },
  ];

  // パターン1のテスト関数
  const testFullScreenLoading = () => {
    setFullScreenLoading(true);
    setTimeout(() => {
      setFullScreenLoading(false);
      message.success('データの読み込みが完了しました');
    }, 3000);
  };

  // パターン2のテスト関数（Card）
  const testCardLoading = () => {
    setCardLoading(true);
    setTimeout(() => {
      setCardLoading(false);
      message.success('カードデータの取得が完了しました');
    }, 2000);
  };

  // パターン2のテスト関数（Table）
  const testTableLoading = () => {
    setTableLoading(true);
    setTimeout(() => {
      setTableLoading(false);
      message.success('テーブルデータの取得が完了しました');
    }, 2500);
  };

  // パターン2のテスト関数（Modal）
  const testModalLoading = () => {
    setModalVisible(true);
  };

  const handleModalSubmit = () => {
    setModalLoading(true);
    setTimeout(() => {
      setModalLoading(false);
      setModalVisible(false);
      message.success('フォームの送信が完了しました');
    }, 2000);
  };

  // パターン3のテスト関数（保存ボタン）
  const testSaveButton = () => {
    setSaveLoading(true);
    setTimeout(() => {
      setSaveLoading(false);
      message.success('保存しました');
    }, 1500);
  };

  // パターン3のテスト関数（削除ボタン）
  const testDeleteButton = () => {
    setDeleteLoading(true);
    setTimeout(() => {
      setDeleteLoading(false);
      message.success('削除しました');
    }, 1500);
  };

  // パターン3のテスト関数（ダウンロードボタン）
  const testDownloadButton = () => {
    setDownloadLoading(true);
    setTimeout(() => {
      setDownloadLoading(false);
      message.success('ダウンロードが完了しました');
    }, 2000);
  };

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto', backgroundColor: '#fafafa' }}>
      <Title level={2}>ローディングスピナー形状ポリシー - 全パターンテスト画面</Title>
      <Paragraph>
        標準3パターンのテストです。各パターンのボタンをクリックして、ローディング状態を確認してください。
      </Paragraph>

      {/* 全画面オーバーレイのSpinコンポーネント */}
      {fullScreenLoading && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(255, 255, 255, 0.8)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Spin size="large" tip="読み込み中..." />
        </div>
      )}

      {/* 標準3パターン */}
      <Title level={3} style={{ marginTop: '32px' }}>標準3パターン</Title>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        
        {/* パターン1: 全画面オーバーレイ型 */}
        <Card
          title={
            <Space>
              <Tag color="red">パターン1</Tag>
              <Text strong>全画面オーバーレイ型（Full Screen Overlay）</Text>
            </Space>
          }
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text type="secondary">用途: データ取得中・処理中の画面全体をブロック</Text>
            </div>

            <div style={{ backgroundColor: '#f5f5f5', padding: '16px', borderRadius: '8px' }}>
              <Space direction="vertical" size="small">
                <Text>• スピナーサイズ: <strong>large</strong> (48px)</Text>
                <Text>• 背景色: rgba(255, 255, 255, 0.8) (白80%透過)</Text>
                <Text>• スピナー色: token.colorPrimary (#CF0027)</Text>
                <Text>• z-index: <strong>9999</strong></Text>
                <Text>• 位置: 画面中央固定（fixed）</Text>
                <Text>• テキスト: あり（例: "読み込み中..."）</Text>
                <Text>• テキストサイズ: token.fontSizeLG (16px)</Text>
              </Space>
            </div>

            <div>
              <Text strong style={{ display: 'block', marginBottom: '8px' }}>テスト:</Text>
              <Button 
                type="primary" 
                onClick={testFullScreenLoading}
                icon={<ReloadOutlined />}
              >
                全画面ローディングを表示（3秒）
              </Button>
            </div>

            <div style={{ backgroundColor: '#fff7e6', padding: '12px', borderRadius: '8px' }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                <strong>使用場面:</strong><br />
                • ページ全体のデータを初期ロード中<br />
                • 認証処理中（ログイン、ログアウト）<br />
                • 組織切り替え中<br />
                • ファイルインポート処理中（大量データ）
              </Text>
            </div>
          </Space>
        </Card>

        {/* パターン2: コンテナオーバーレイ型 */}
        <Card
          title={
            <Space>
              <Tag color="blue">パターン2</Tag>
              <Text strong>コンテナオーバーレイ型（Container Overlay）</Text>
            </Space>
          }
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text type="secondary">用途: 特定のコンテナ（Card、Modal、Table等）内のローディング</Text>
            </div>

            <div style={{ backgroundColor: '#f5f5f5', padding: '16px', borderRadius: '8px' }}>
              <Space direction="vertical" size="small">
                <Text>• スピナーサイズ: <strong>default</strong> (32px)</Text>
                <Text>• 背景色: rgba(255, 255, 255, 0.8) (白80%透過)</Text>
                <Text>• スピナー色: token.colorPrimary (#CF0027)</Text>
                <Text>• 位置: コンテナ中央（absolute）</Text>
                <Text>• テキスト: あり（例: "データ取得中..."）</Text>
                <Text>• テキストサイズ: token.fontSize (14px)</Text>
              </Space>
            </div>

            <div>
              <Text strong style={{ display: 'block', marginBottom: '16px' }}>テスト:</Text>
              
              {/* Card内のローディング */}
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <div>
                  <Text style={{ display: 'block', marginBottom: '8px' }}>① Card内のローディング</Text>
                  <Button onClick={testCardLoading}>カードデータを取得（2秒）</Button>
                </div>
                
                <Spin spinning={cardLoading} tip="データ取得中...">
                  <Card 
                    style={{ minHeight: '150px' }}
                    title="統計情報"
                  >
                    <Space direction="vertical" size="small">
                      <Text>総プロジェクト数: 42</Text>
                      <Text>進行中: 15</Text>
                      <Text>完了: 27</Text>
                    </Space>
                  </Card>
                </Spin>
              </Space>

              {/* Table内のローディング */}
              <Space direction="vertical" size="middle" style={{ width: '100%', marginTop: '24px' }}>
                <div>
                  <Text style={{ display: 'block', marginBottom: '8px' }}>② Table内のローディング</Text>
                  <Button onClick={testTableLoading}>テーブルデータを取得（2.5秒）</Button>
                </div>
                
                <Spin spinning={tableLoading} tip="データ取得中...">
                  <Table 
                    columns={tableColumns} 
                    dataSource={tableData}
                    pagination={false}
                  />
                </Spin>
              </Space>

              {/* Modal内のローディング */}
              <Space direction="vertical" size="middle" style={{ width: '100%', marginTop: '24px' }}>
                <div>
                  <Text style={{ display: 'block', marginBottom: '8px' }}>③ Modal内のローディング</Text>
                  <Button onClick={testModalLoading}>モーダルを開く</Button>
                </div>
              </Space>

              <Modal
                title="フォーム送信"
                open={modalVisible}
                onOk={handleModalSubmit}
                onCancel={() => setModalVisible(false)}
                confirmLoading={modalLoading}
              >
                <Spin spinning={modalLoading} tip="送信中...">
                  <Space direction="vertical" size="middle" style={{ width: '100%', minHeight: '100px' }}>
                    <Text>フォームの内容がここに表示されます。</Text>
                    <Text type="secondary">「OK」をクリックすると送信処理が開始されます（2秒）。</Text>
                  </Space>
                </Spin>
              </Modal>
            </div>

            <div style={{ backgroundColor: '#fff7e6', padding: '12px', borderRadius: '8px' }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                <strong>使用場面:</strong><br />
                • テーブルのデータ取得中<br />
                • カード内の部分データ更新中<br />
                • タブ切り替え時のデータロード中<br />
                • モーダル内のフォーム送信中
              </Text>
            </div>
          </Space>
        </Card>

        {/* パターン3: インライン型（ボタン内） */}
        <Card
          title={
            <Space>
              <Tag color="green">パターン3</Tag>
              <Text strong>インライン型（Button Inline）</Text>
            </Space>
          }
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text type="secondary">用途: ボタンクリック後の処理中を示す</Text>
            </div>

            <div style={{ backgroundColor: '#f5f5f5', padding: '16px', borderRadius: '8px' }}>
              <Space direction="vertical" size="small">
                <Text>• スピナーサイズ: <strong>small</strong> (16px)</Text>
                <Text>• 背景色: なし（透過）</Text>
                <Text>• スピナー色: #ffffff (白) ※プライマリボタンの場合</Text>
                <Text>• スピナー色: token.colorPrimary (#CF0027) ※デフォルトボタンの場合</Text>
                <Text>• 位置: ボタン内アイコン位置</Text>
                <Text>• テキスト: なし（ボタンテキストのみ）</Text>
              </Space>
            </div>

            <div>
              <Text strong style={{ display: 'block', marginBottom: '16px' }}>テスト:</Text>
              
              <Space wrap size="middle">
                {/* プライマリボタン */}
                <Button 
                  type="primary"
                  loading={saveLoading}
                  onClick={testSaveButton}
                  icon={!saveLoading ? <SaveOutlined /> : undefined}
                >
                  保存
                </Button>

                {/* デンジャーボタン */}
                <Button 
                  danger
                  loading={deleteLoading}
                  onClick={testDeleteButton}
                  icon={!deleteLoading ? <DeleteOutlined /> : undefined}
                >
                  削除
                </Button>

                {/* デフォルトボタン */}
                <Button 
                  loading={downloadLoading}
                  onClick={testDownloadButton}
                  icon={!downloadLoading ? <DownloadOutlined /> : undefined}
                >
                  ダウンロード
                </Button>

                {/* 大型ボタン */}
                <Button 
                  type="primary"
                  size="large"
                  loading={saveLoading}
                  onClick={testSaveButton}
                  icon={!saveLoading ? <SaveOutlined /> : undefined}
                >
                  大型保存ボタン
                </Button>

                {/* 小型ボタン */}
                <Button 
                  size="small"
                  loading={downloadLoading}
                  onClick={testDownloadButton}
                  icon={!downloadLoading ? <DownloadOutlined /> : undefined}
                >
                  小型ボタン
                </Button>
              </Space>
            </div>

            <div style={{ backgroundColor: '#fff7e6', padding: '12px', borderRadius: '8px' }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                <strong>使用場面:</strong><br />
                • ボタンクリック後の非同期処理中<br />
                • フォーム送信中（ボタンを無効化）<br />
                • アクション実行中（削除、保存、更新など）<br />
                • 短時間（1-3秒）の処理
              </Text>
            </div>
          </Space>
        </Card>
      </Space>

      {/* 実装ガイドライン */}
      <Title level={3} style={{ marginTop: '32px' }}>実装ガイドライン</Title>
      
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card title="DO（推奨）">
          <Space direction="vertical" size="small">
            <Text>✅ データ取得開始時に即座に表示する</Text>
            <Text>✅ 処理完了後は即座に非表示にする</Text>
            <Text>✅ 適切なメッセージを表示する（&ldquo;読み込み中...&rdquo;、&ldquo;保存中...&rdquo;）</Text>
            <Text>✅ 長時間処理の場合はプログレスバーを検討する</Text>
            <Text>✅ エラー時はローディングを停止し、エラーメッセージを表示する</Text>
          </Space>
        </Card>

        <Card title="DON'T（非推奨）">
          <Space direction="vertical" size="small">
            <Text>❌ 100ms未満の処理で表示しない（チラつき防止）</Text>
            <Text>❌ 複数のスピナーを同時に表示しない</Text>
            <Text>❌ ローディング中にユーザー操作を許可しない</Text>
            <Text>❌ スピナーのみでメッセージなし（何を待っているか不明確）</Text>
            <Text>❌ 無限ローディング（タイムアウト処理を実装）</Text>
          </Space>
        </Card>

        <Card title="タイムアウト処理">
          <Space direction="vertical" size="small">
            <Text><strong>推奨タイムアウト時間:</strong></Text>
            <Text>• API取得（軽量）: 10秒</Text>
            <Text>• API取得（重量）: 30秒</Text>
            <Text>• ファイルアップロード: 60秒</Text>
            <Text>• 一括処理: 120秒</Text>
          </Space>
        </Card>

        <Card title="パターン選択フローチャート">
          <Space direction="vertical" size="small">
            <Text><strong>処理対象は？</strong></Text>
            <Text>├─ 画面全体 → <Tag color="red">パターン1（全画面オーバーレイ型）</Tag></Text>
            <Text>├─ 特定コンテナ → <Tag color="blue">パターン2（コンテナオーバーレイ型）</Tag></Text>
            <Text>└─ ボタンアクション → <Tag color="green">パターン3（インライン型）</Tag></Text>
          </Space>
        </Card>
      </Space>
    </div>
  );
}
