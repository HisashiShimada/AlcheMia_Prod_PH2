'use client';

import React, { useState } from 'react';
import { Card, Button, Space, Modal, Typography, List, theme, Tag, Divider, Input, Form, Drawer, Popover, Alert } from 'antd';
import {
  CheckOutlined,
  CloseOutlined,
  InfoCircleOutlined,
  ExclamationCircleOutlined,
  WarningOutlined,
  FolderOutlined,
  ToolOutlined,
  ArrowLeftOutlined,
  EditOutlined,
  MenuOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { confirm } = Modal;

/**
 * モーダルダイアログのパターンをデモするコンポーネント
 */
export default function ModalPatternsDemo() {
  const { token } = theme.useToken();
  
  // パターン1: 標準モーダル（3種類の幅）
  const [pattern1a_Open, setPattern1a_Open] = useState(false); // 520px
  const [pattern1b_Open, setPattern1b_Open] = useState(false); // 600px
  const [pattern1c_Open, setPattern1c_Open] = useState(false); // 700px
  
  // パターン1: ボタンバリエーション
  const [pattern1Button1_Open, setPattern1Button1_Open] = useState(false); // 1ボタン
  const [pattern1Button2_Open, setPattern1Button2_Open] = useState(false); // 2ボタン
  
  // パターン1: スクロールテスト
  const [pattern1Scroll_Open, setPattern1Scroll_Open] = useState(false);
  
  // パターン2: 大型モーダル（2種類の幅）
  const [pattern2a_Open, setPattern2a_Open] = useState(false); // 900px
  const [pattern2b_Open, setPattern2b_Open] = useState(false); // 1200px
  const [step, setStep] = useState<'project' | 'method' | 'task'>('project');
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('');
  const [selectedTask, setSelectedTask] = useState('');
  
  // パターン3: 全画面モーダル
  const [pattern3Open, setPattern3Open] = useState(false);
  
  // 特殊パターン: Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);

  // プロジェクトデータ（モック）
  const projects = [
    { id: 'project1', name: 'プロジェクト1', fileName: 'project1.maiml', methods: 5 },
    { id: 'project2', name: 'プロジェクト2', fileName: 'project2.maiml', methods: 3 },
    { id: 'project3', name: 'プロジェクト3', fileName: 'project3.maiml', methods: 7 },
  ];

  const methods = [
    { id: 'method1', name: 'メソッド1', transitions: 10 },
    { id: 'method2', name: 'メソッド2', transitions: 8 },
    { id: 'method3', name: 'メソッド3', transitions: 12 },
  ];

  const tasks = [
    { id: 'task1', name: 'タスク1', tag: '新規' },
    { id: 'task2', name: 'タスク2', tag: '' },
    { id: 'task3', name: 'タスク3', tag: '完了' },
  ];

  // 長いコンテンツ（スクロールテスト用）
  const longContent = Array.from({ length: 30 }, (_, i) => ({
    id: i + 1,
    title: `項目 ${i + 1}`,
    description: `これは項目 ${i + 1} の説明文です。スクロールのテストのために多数の項目を表示しています。`,
  }));

  // パターン2: 大型モーダルの戻るボタン
  const handleBack = () => {
    if (step === 'task') {
      setStep('method');
    } else if (step === 'method') {
      setStep('project');
    }
  };

  // パターン2: 大型モーダルの決定ボタン
  const handlePattern2Ok = () => {
    console.log('選択完了:', { selectedProject, selectedMethod, selectedTask });
    setPattern2a_Open(false);
    setPattern2b_Open(false);
    setStep('project');
  };

  // パターン2: 大型モーダルのキャンセルボタン
  const handlePattern2Cancel = () => {
    setPattern2a_Open(false);
    setPattern2b_Open(false);
    setStep('project');
    setSelectedProject('');
    setSelectedMethod('');
    setSelectedTask('');
  };

  // パターン2: モーダルのタイトルを取得
  const getPattern2Title = () => {
    if (step === 'project') {
      return (
        <Space>
          <FolderOutlined style={{ color: token.colorPrimary }} />
          <Text strong>プロジェクトを選択</Text>
        </Space>
      );
    } else if (step === 'method') {
      return (
        <Space>
          <ToolOutlined style={{ color: token.colorInfo }} />
          <Text strong>メソッドを選択</Text>
          <Text type="secondary">（プロジェクト: {selectedProject}）</Text>
        </Space>
      );
    } else {
      return (
        <Space>
          <CheckOutlined style={{ color: token.colorPrimary }} />
          <Text strong>タスクを選択</Text>
          <Text type="secondary">（メソッド: {selectedMethod}）</Text>
        </Space>
      );
    }
  };

  // パターン2: モーダルのコンテンツを取得
  const getPattern2Content = () => {
    if (step === 'project') {
      return (
        <div style={{ maxHeight: 500, overflowY: 'auto' }}>
          <List
            dataSource={projects}
            renderItem={(project) => (
              <List.Item
                onClick={() => {
                  setSelectedProject(project.name);
                  setStep('method');
                }}
                style={{
                  cursor: 'pointer',
                  padding: token.paddingMD,
                  backgroundColor: selectedProject === project.name ? token.colorPrimaryBg : 'transparent',
                  borderRadius: token.borderRadius,
                  marginBottom: token.marginXS,
                  transition: 'all 0.2s',
                }}
              >
                <List.Item.Meta
                  avatar={<FolderOutlined style={{ fontSize: 24, color: token.colorPrimary }} />}
                  title={<Text strong>{project.name}</Text>}
                  description={
                    <Space direction="vertical" size={0}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {project.fileName}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {project.methods} メソッド
                      </Text>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        </div>
      );
    } else if (step === 'method') {
      return (
        <div style={{ maxHeight: 500, overflowY: 'auto' }}>
          <List
            dataSource={methods}
            renderItem={(method) => (
              <List.Item
                onClick={() => {
                  setSelectedMethod(method.name);
                  setStep('task');
                }}
                style={{
                  cursor: 'pointer',
                  padding: token.paddingMD,
                  backgroundColor: selectedMethod === method.name ? token.colorPrimaryBg : 'transparent',
                  borderRadius: token.borderRadius,
                  marginBottom: token.marginXS,
                  transition: 'all 0.2s',
                }}
              >
                <List.Item.Meta
                  avatar={<ToolOutlined style={{ fontSize: 24, color: token.colorInfo }} />}
                  title={<Text strong>{method.name}</Text>}
                  description={
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {method.transitions} トランジション
                    </Text>
                  }
                />
              </List.Item>
            )}
          />
        </div>
      );
    } else {
      return (
        <div style={{ maxHeight: 500, overflowY: 'auto' }}>
          <List
            dataSource={tasks}
            renderItem={(task) => (
              <List.Item
                onClick={() => setSelectedTask(task.name)}
                style={{
                  cursor: 'pointer',
                  padding: token.paddingMD,
                  backgroundColor: selectedTask === task.name ? token.colorPrimaryBg : 'transparent',
                  borderRadius: token.borderRadius,
                  marginBottom: token.marginXS,
                  transition: 'all 0.2s',
                }}
              >
                <List.Item.Meta
                  avatar={<CheckOutlined style={{ fontSize: 24, color: token.colorPrimary }} />}
                  title={
                    <Space>
                      <Text strong>{task.name}</Text>
                      {task.tag && <Tag>{task.tag}</Tag>}
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        </div>
      );
    }
  };

  // パターン2: モーダルのフッターを取得
  const getPattern2Footer = () => {
    if (step === 'project') {
      return (
        <Space>
          <Button onClick={handlePattern2Cancel}>キャンセル</Button>
        </Space>
      );
    } else if (step === 'method') {
      return (
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={handleBack}>
            戻る
          </Button>
          <Button onClick={handlePattern2Cancel}>キャンセル</Button>
        </Space>
      );
    } else {
      return (
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={handleBack}>
            戻る
          </Button>
          <Button onClick={handlePattern2Cancel}>キャンセル</Button>
          <Button
            type="primary"
            onClick={handlePattern2Ok}
            disabled={!selectedTask}
            icon={<CheckOutlined />}
          >
            決定
          </Button>
        </Space>
      );
    }
  };

  // Popoverコンテンツ
  const popoverContent = (
    <div style={{ maxWidth: 300 }}>
      <Paragraph style={{ marginBottom: 0 }}>
        これはPopoverの例です。簡易な情報表示に使用します。
      </Paragraph>
    </div>
  );

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>モーダルダイアログ 全パターンテスト</Title>
      <Paragraph>
        modal_policy.mdに定義された全パターンのテストデモです。
      </Paragraph>

      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* パターン1: 標準モーダル - 幅バリエーション */}
        <Card title="パターン1: 標準モーダル（Medium） - 幅バリエーション" bordered={false}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Alert
              message="ポリシー仕様"
              description="幅: 520px（デフォルト）～700px、高さは自動調整、最大高さ: calc(100vh - 200px)"
              type="info"
              showIcon
            />
            <Space wrap>
              <Button type="primary" onClick={() => setPattern1a_Open(true)}>
                520px（デフォルト）
              </Button>
              <Button type="primary" onClick={() => setPattern1b_Open(true)}>
                600px（中間）
              </Button>
              <Button type="primary" onClick={() => setPattern1c_Open(true)}>
                700px（最大）
              </Button>
            </Space>
          </Space>

          {/* 520px */}
          <Modal
            title={
              <Space>
                <InfoCircleOutlined style={{ color: token.colorInfo }} />
                <Text strong>標準モーダル（520px）</Text>
              </Space>
            }
            open={pattern1a_Open}
            onOk={() => setPattern1a_Open(false)}
            onCancel={() => setPattern1a_Open(false)}
            width={520}
            okText="保存"
            cancelText="キャンセル"
          >
            <Form layout="vertical">
              <Form.Item label="ユーザー名">
                <Input placeholder="ユーザー名を入力" />
              </Form.Item>
              <Form.Item label="メールアドレス">
                <Input placeholder="メールアドレスを入力" />
              </Form.Item>
            </Form>
          </Modal>

          {/* 600px */}
          <Modal
            title={
              <Space>
                <InfoCircleOutlined style={{ color: token.colorInfo }} />
                <Text strong>標準モーダル（600px）</Text>
              </Space>
            }
            open={pattern1b_Open}
            onOk={() => setPattern1b_Open(false)}
            onCancel={() => setPattern1b_Open(false)}
            width={600}
            okText="保存"
            cancelText="キャンセル"
          >
            <Form layout="vertical">
              <Form.Item label="ユーザー名">
                <Input placeholder="ユーザー名を入力" />
              </Form.Item>
              <Form.Item label="メールアドレス">
                <Input placeholder="メールアドレスを入力" />
              </Form.Item>
              <Form.Item label="説明">
                <Input.TextArea rows={3} placeholder="説明を入力" />
              </Form.Item>
            </Form>
          </Modal>

          {/* 700px */}
          <Modal
            title={
              <Space>
                <InfoCircleOutlined style={{ color: token.colorInfo }} />
                <Text strong>標準モーダル（700px）</Text>
              </Space>
            }
            open={pattern1c_Open}
            onOk={() => setPattern1c_Open(false)}
            onCancel={() => setPattern1c_Open(false)}
            width={700}
            okText="保存"
            cancelText="キャンセル"
          >
            <Form layout="vertical">
              <Form.Item label="ユーザー名">
                <Input placeholder="ユーザー名を入力" />
              </Form.Item>
              <Form.Item label="メールアドレス">
                <Input placeholder="メールアドレスを入力" />
              </Form.Item>
              <Form.Item label="電話番号">
                <Input placeholder="電話番号を入力" />
              </Form.Item>
              <Form.Item label="説明">
                <Input.TextArea rows={4} placeholder="説明を入力" />
              </Form.Item>
            </Form>
          </Modal>
        </Card>

        {/* パターン1: 標準モーダル - ボタンバリエーション */}
        <Card title="パターン1: 標準モーダル - ボタンバリエーション" bordered={false}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Alert
              message="ポリシー仕様"
              description="1ボタン: 「閉じる」のみ（情報表示）、2ボタン: 「キャンセル」「決定」（確認）"
              type="info"
              showIcon
            />
            <Space wrap>
              <Button type="primary" onClick={() => setPattern1Button1_Open(true)}>
                1ボタン（情報表示）
              </Button>
              <Button type="primary" onClick={() => setPattern1Button2_Open(true)}>
                2ボタン（確認）
              </Button>
            </Space>
          </Space>

          {/* 1ボタン */}
          <Modal
            title="お知らせ"
            open={pattern1Button1_Open}
            onCancel={() => setPattern1Button1_Open(false)}
            footer={
              <Button type="primary" onClick={() => setPattern1Button1_Open(false)}>
                閉じる
              </Button>
            }
            width={520}
          >
            <Paragraph>
              システムメンテナンスのお知らせです。
            </Paragraph>
            <Paragraph>
              2025年1月1日 0:00〜6:00の間、システムメンテナンスを実施します。
            </Paragraph>
          </Modal>

          {/* 2ボタン */}
          <Modal
            title="確認"
            open={pattern1Button2_Open}
            onOk={() => setPattern1Button2_Open(false)}
            onCancel={() => setPattern1Button2_Open(false)}
            okText="実行"
            cancelText="キャンセル"
            width={520}
          >
            <Paragraph>
              この操作を実行してもよろしいですか？
            </Paragraph>
          </Modal>
        </Card>

        {/* パターン1: 標準モーダル - スクロールテスト */}
        <Card title="パターン1: 標準モーダル - スクロールテスト" bordered={false}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Alert
              message="ポリシー仕様"
              description="最大高さ: calc(100vh - 200px)、ボディ部分のみスクロール可能"
              type="info"
              showIcon
            />
            <Button type="primary" onClick={() => setPattern1Scroll_Open(true)}>
              長いコンテンツを表示
            </Button>
          </Space>

          <Modal
            title="スクロールテスト"
            open={pattern1Scroll_Open}
            onOk={() => setPattern1Scroll_Open(false)}
            onCancel={() => setPattern1Scroll_Open(false)}
            width={600}
            okText="閉じる"
            cancelText="キャンセル"
          >
            <List
              dataSource={longContent}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    title={item.title}
                    description={item.description}
                  />
                </List.Item>
              )}
            />
          </Modal>
        </Card>

        {/* パターン2: 大型モーダル - 幅バリエーション */}
        <Card title="パターン2: 大型モーダル（Large） - 幅バリエーション" bordered={false}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Alert
              message="ポリシー仕様"
              description="幅: 800px～1200px、高さは自動調整、最大高さ: calc(100vh - 100px)"
              type="info"
              showIcon
            />
            <Space wrap>
              <Button type="primary" onClick={() => { setPattern2a_Open(true); setStep('project'); }}>
                900px（3ステップウィザード）
              </Button>
              <Button type="primary" onClick={() => { setPattern2b_Open(true); setStep('project'); }}>
                1200px（3ステップウィザード）
              </Button>
            </Space>
          </Space>

          {/* 900px */}
          <Modal
            title={getPattern2Title()}
            open={pattern2a_Open}
            onCancel={handlePattern2Cancel}
            width={900}
            footer={getPattern2Footer()}
          >
            {getPattern2Content()}
          </Modal>

          {/* 1200px */}
          <Modal
            title={getPattern2Title()}
            open={pattern2b_Open}
            onCancel={handlePattern2Cancel}
            width={1200}
            footer={getPattern2Footer()}
          >
            {getPattern2Content()}
          </Modal>
        </Card>

        {/* パターン3: 全画面モーダル */}
        <Card title="パターン3: 全画面モーダル（Fullscreen）" bordered={false}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Alert
              message="ポリシー仕様"
              description="100vw × 100vh、ボーダーラジアス0px、マスク背景なし、ヘッダーパディング: 上下16px・左右32px"
              type="info"
              showIcon
            />
            <Button type="primary" onClick={() => setPattern3Open(true)}>
              全画面モーダルを開く
            </Button>
          </Space>

          <Modal
            title={
              <Space>
                <EditOutlined style={{ color: token.colorPrimary, fontSize: 20 }} />
                <Text strong style={{ fontSize: token.fontSizeHeading4 }}>
                  ドキュメントエディタ
                </Text>
              </Space>
            }
            open={pattern3Open}
            onCancel={() => setPattern3Open(false)}
            width="100vw"
            style={{ maxWidth: '100vw', top: 0, paddingBottom: 0 }}
            bodyStyle={{
              height: 'calc(100vh - 110px)',
              overflow: 'auto',
              padding: 0,
            }}
            footer={
              <Space>
                <Button onClick={() => setPattern3Open(false)}>キャンセル</Button>
                <Button type="primary" icon={<CheckOutlined />}>
                  保存
                </Button>
              </Space>
            }
          >
            <div style={{ padding: '32px', minHeight: '100%', backgroundColor: token.colorBgLayout }}>
              <Card>
                <Title level={3}>ドキュメントタイトル</Title>
                <Divider />
                <Paragraph>
                  これは全画面モーダルのデモです。ビューアーやエディタなど、
                  大きな作業領域が必要な場合に使用します。
                </Paragraph>
                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                  {Array.from({ length: 10 }, (_, i) => (
                    <Card key={i} type="inner" title={`セクション ${i + 1}`}>
                      <Paragraph>
                        セクション{i + 1}のコンテンツです。全画面表示により、
                        大量のデータや複雑なフォームを表示するのに適しています。
                      </Paragraph>
                    </Card>
                  ))}
                </Space>
              </Card>
            </div>
          </Modal>
        </Card>

        <Divider />

        {/* 特殊パターン: Modal.confirm系 */}
        <Card title="特殊パターン: 確認ダイアログ（Modal.confirm系）" bordered={false}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Alert
              message="ポリシー仕様"
              description="パターン1の特殊形、アイコン付き、シンプルなテキストのみ、2ボタン（キャンセル・OK）"
              type="info"
              showIcon
            />
            <Space wrap>
              <Button
                danger
                icon={<ExclamationCircleOutlined />}
                onClick={() => {
                  confirm({
                    title: '削除確認',
                    icon: <ExclamationCircleOutlined />,
                    content: 'この項目を削除してもよろしいですか？この操作は取り消すことができません。',
                    okText: '削除',
                    okType: 'danger',
                    cancelText: 'キャンセル',
                  });
                }}
              >
                Confirm（削除確認）
              </Button>
              <Button
                icon={<InfoCircleOutlined />}
                onClick={() => {
                  Modal.info({
                    title: '情報',
                    content: 'これは情報表示用のモーダルです。',
                    okText: '閉じる',
                  });
                }}
              >
                Info（情報）
              </Button>
              <Button
                icon={<CheckOutlined />}
                onClick={() => {
                  Modal.success({
                    title: '成功',
                    content: '操作が正常に完了しました。',
                    okText: '閉じる',
                  });
                }}
              >
                Success（成功）
              </Button>
              <Button
                icon={<WarningOutlined />}
                onClick={() => {
                  Modal.warning({
                    title: '警告',
                    content: 'この操作には注意が必要です。',
                    okText: '閉じる',
                  });
                }}
              >
                Warning（警告）
              </Button>
              <Button
                danger
                icon={<CloseOutlined />}
                onClick={() => {
                  Modal.error({
                    title: 'エラー',
                    content: '操作に失敗しました。もう一度お試しください。',
                    okText: '閉じる',
                  });
                }}
              >
                Error（エラー）
              </Button>
            </Space>
          </Space>
        </Card>

        {/* 特殊パターン: Drawer */}
        <Card title="特殊パターン: Drawer（ドロワー）" bordered={false}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Alert
              message="ポリシー仕様"
              description="別コンポーネント、横からスライドイン、デフォルト幅378px、用途: サイドメニュー、通知パネル、設定パネル"
              type="warning"
              showIcon
            />
            <Button
              icon={<MenuOutlined />}
              onClick={() => setDrawerOpen(true)}
            >
              Drawerを開く
            </Button>
          </Space>

          <Drawer
            title="設定"
            placement="right"
            onClose={() => setDrawerOpen(false)}
            open={drawerOpen}
          >
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <div>
                <Text strong>通知設定</Text>
                <Paragraph type="secondary">
                  通知の受信設定を変更できます。
                </Paragraph>
              </div>
              <div>
                <Text strong>表示設定</Text>
                <Paragraph type="secondary">
                  画面表示に関する設定を変更できます。
                </Paragraph>
              </div>
              <div>
                <Text strong>アカウント設定</Text>
                <Paragraph type="secondary">
                  アカウント情報を管理できます。
                </Paragraph>
              </div>
            </Space>
          </Drawer>
        </Card>

        {/* 特殊パターン: Popover */}
        <Card title="特殊パターン: Popover（ポップオーバー）" bordered={false}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Alert
              message="ポリシー仕様"
              description="軽量な吹き出し表示、マスクなし、小さなサイズ、対象要素に追従、用途: ツールチップ、簡易な情報表示"
              type="warning"
              showIcon
            />
            <Popover
              content={popoverContent}
              title="ヘルプ"
              trigger="click"
            >
              <Button icon={<QuestionCircleOutlined />}>
                Popoverを表示
              </Button>
            </Popover>
          </Space>
        </Card>

        {/* 実装仕様のまとめ */}
        <Card title="実装仕様のまとめ" bordered={false}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text strong>共通仕様:</Text>
              <ul>
                <li>ボーダーラジアス: 12px（全画面モーダルは0px）</li>
                <li>シャドウ: 0 8px 24px rgba(0, 0, 0, 0.16)</li>
                <li>マスク背景: rgba(0, 0, 0, 0.45)（全画面モーダルはなし）</li>
                <li>アニメーション: 0.2s（フェードイン + スケール）</li>
              </ul>
            </div>
            <div>
              <Text strong>キーボード操作:</Text>
              <ul>
                <li>Esc: モーダルを閉じる</li>
                <li>Enter: プライマリボタンのアクション（フォーカスがボタン以外の場合）</li>
                <li>Tab: フォーカス移動（モーダル内のみ）</li>
              </ul>
            </div>
            <div>
              <Text strong>アクセシビリティ:</Text>
              <ul>
                <li>role=&quot;dialog&quot; 自動付与</li>
                <li>aria-modal=&quot;true&quot; 設定</li>
                <li>フォーカストラップ実装</li>
                <li>モーダル表示時に最初のフォーカス可能要素にフォーカス</li>
              </ul>
            </div>
          </Space>
        </Card>
      </Space>
    </div>
  );
}
