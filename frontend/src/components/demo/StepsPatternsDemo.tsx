'use client';

import React, { useState } from 'react';
import { Steps, Card, Space, Button, message, theme, Divider } from 'antd';
import {
  UserOutlined,
  SolutionOutlined,
  LoadingOutlined,
  SmileOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';

const { useToken } = theme;

/**
 * ステップ表示の全パターンデモコンポーネント
 */
export default function StepsPatternsDemo() {
  const { token } = useToken();
  const [currentStep1, setCurrentStep1] = useState(0);
  const [currentStep2, setCurrentStep2] = useState(0);
  const [currentStep3, setCurrentStep3] = useState(0);
  const [currentStep4, setCurrentStep4] = useState(0);

  // パターン1: 標準の進行制御
  const nextStep1 = () => {
    if (currentStep1 < 4) {
      setCurrentStep1(currentStep1 + 1);
    } else {
      message.success('プロセスが完了しました！');
    }
  };

  const prevStep1 = () => {
    if (currentStep1 > 0) {
      setCurrentStep1(currentStep1 - 1);
    }
  };

  // パターン3: ナビゲーションステップの変更
  const onChangeStep3 = (value: number) => {
    console.log('onChange:', value);
    setCurrentStep3(value);
    message.info(`ステップ ${value + 1} に移動しました`);
  };

  return (
    <div style={{ padding: '24px', background: token.colorBgLayout }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* ヘッダー */}
        <Card>
          <Space direction="vertical" size="small">
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>
              ステップ表示パターン
            </h1>
            <p style={{ margin: 0, color: token.colorTextSecondary }}>
              Steps コンポーネントの標準3パターンと各種バリエーション
            </p>
          </Space>
        </Card>

        {/* パターン1: 水平ステップ（標準） */}
        <Card
          title="パターン1: 水平ステップ（標準）"
          extra={<span style={{ color: token.colorTextSecondary }}>フォーム入力・登録プロセス・短いワークフロー</span>}
        >
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {/* 基本的な水平ステップ */}
            <div>
              <h4>基本的な水平ステップ</h4>
              <Steps
                current={currentStep1}
                items={[
                  {
                    title: 'ユーザー情報',
                  },
                  {
                    title: '認証設定',
                  },
                  {
                    title: '確認',
                  },
                  {
                    title: '完了',
                  },
                ]}
              />
              <Divider />
              <Space>
                <Button onClick={prevStep1} disabled={currentStep1 === 0}>
                  前へ
                </Button>
                <Button type="primary" onClick={nextStep1} disabled={currentStep1 === 4}>
                  {currentStep1 === 3 ? '完了' : '次へ'}
                </Button>
              </Space>
            </div>

            {/* 説明文付き */}
            <div>
              <h4>説明文付き</h4>
              <Steps
                current={1}
                items={[
                  {
                    title: 'ステップ1',
                    description: '基本情報を入力',
                  },
                  {
                    title: 'ステップ2',
                    description: '詳細設定を確認',
                  },
                  {
                    title: 'ステップ3',
                    description: '内容を確認して完了',
                  },
                ]}
              />
            </div>

            {/* エラー状態 */}
            <div>
              <h4>エラー状態</h4>
              <Steps
                current={1}
                status="error"
                items={[
                  {
                    title: 'ステップ1',
                    description: '完了',
                  },
                  {
                    title: 'ステップ2',
                    description: 'エラーが発生しました',
                  },
                  {
                    title: 'ステップ3',
                    description: '待機中',
                  },
                ]}
              />
            </div>

            {/* カスタムアイコン */}
            <div>
              <h4>カスタムアイコン</h4>
              <Steps
                current={1}
                items={[
                  {
                    title: 'ログイン',
                    icon: <UserOutlined />,
                  },
                  {
                    title: '認証中',
                    icon: <LoadingOutlined />,
                  },
                  {
                    title: '完了',
                    icon: <SmileOutlined />,
                  },
                ]}
              />
            </div>

            {/* Small サイズ */}
            <div>
              <h4>Small サイズ</h4>
              <Steps
                current={1}
                size="small"
                items={[
                  {
                    title: 'ステップ1',
                  },
                  {
                    title: 'ステップ2',
                  },
                  {
                    title: 'ステップ3',
                  },
                  {
                    title: 'ステップ4',
                  },
                ]}
              />
            </div>
          </Space>
        </Card>

        {/* パターン2: 垂直ステップ */}
        <Card
          title="パターン2: 垂直ステップ"
          extra={<span style={{ color: token.colorTextSecondary }}>長いプロセス・詳細説明付きステップ・サイドバー配置</span>}
        >
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {/* 基本的な垂直ステップ */}
            <div style={{ display: 'flex', gap: '48px' }}>
              <div style={{ flex: 1 }}>
                <h4>基本的な垂直ステップ</h4>
                <Steps
                  direction="vertical"
                  current={currentStep2}
                  items={[
                    {
                      title: 'プロジェクト作成',
                      description: 'プロジェクト名と説明を入力します',
                    },
                    {
                      title: 'メンバー招待',
                      description: 'チームメンバーを招待します',
                    },
                    {
                      title: '初期設定',
                      description: 'プロジェクトの初期設定を行います',
                    },
                    {
                      title: 'レビュー',
                      description: '設定内容を確認します',
                    },
                    {
                      title: '完了',
                      description: 'プロジェクトの作成が完了しました',
                    },
                  ]}
                />
                <Divider />
                <Space>
                  <Button
                    onClick={() => setCurrentStep2(Math.max(0, currentStep2 - 1))}
                    disabled={currentStep2 === 0}
                  >
                    前へ
                  </Button>
                  <Button
                    type="primary"
                    onClick={() => setCurrentStep2(Math.min(4, currentStep2 + 1))}
                    disabled={currentStep2 === 4}
                  >
                    {currentStep2 === 4 ? '完了' : '次へ'}
                  </Button>
                </Space>
              </div>

              <div style={{ flex: 1 }}>
                <h4>アイコン付き垂直ステップ</h4>
                <Steps
                  direction="vertical"
                  current={2}
                  items={[
                    {
                      title: 'アカウント作成',
                      description: 'ユーザー情報を入力',
                      icon: <UserOutlined />,
                    },
                    {
                      title: 'メール認証',
                      description: '認証メールを確認',
                      icon: <SolutionOutlined />,
                    },
                    {
                      title: 'プロフィール設定',
                      description: '詳細情報を入力',
                      icon: <CheckCircleOutlined />,
                    },
                    {
                      title: '完了',
                      description: '登録完了',
                      icon: <SmileOutlined />,
                    },
                  ]}
                />
              </div>
            </div>

            {/* エラー状態 - 垂直 */}
            <div style={{ maxWidth: '400px' }}>
              <h4>エラー状態 - 垂直</h4>
              <Steps
                direction="vertical"
                current={2}
                status="error"
                items={[
                  {
                    title: 'データ準備',
                    description: '完了しました',
                  },
                  {
                    title: 'アップロード',
                    description: '完了しました',
                  },
                  {
                    title: '検証',
                    description: 'データの形式が正しくありません',
                    icon: <CloseCircleOutlined />,
                  },
                  {
                    title: '完了',
                    description: '待機中',
                  },
                ]}
              />
            </div>

            {/* Small サイズ - 垂直 */}
            <div style={{ maxWidth: '400px' }}>
              <h4>Small サイズ - 垂直</h4>
              <Steps
                direction="vertical"
                current={1}
                size="small"
                items={[
                  {
                    title: 'ステップ1',
                    description: '短い説明文',
                  },
                  {
                    title: 'ステップ2',
                    description: '短い説明文',
                  },
                  {
                    title: 'ステップ3',
                    description: '短い説明文',
                  },
                ]}
              />
            </div>
          </Space>
        </Card>

        {/* パターン3: ナビゲーションステップ */}
        <Card
          title="パターン3: ナビゲーションステップ"
          extra={<span style={{ color: token.colorTextSecondary }}>ページ間の遷移・ウィザード形式の入力</span>}
        >
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {/* 基本的なナビゲーションステップ */}
            <div>
              <h4>基本的なナビゲーションステップ（クリック可能）</h4>
              <Steps
                type="navigation"
                current={currentStep3}
                onChange={onChangeStep3}
                items={[
                  {
                    title: '基本情報',
                  },
                  {
                    title: '詳細設定',
                  },
                  {
                    title: '確認',
                  },
                  {
                    title: '完了',
                  },
                ]}
              />
              <Divider />
              <p style={{ color: token.colorTextSecondary }}>
                現在のステップ: {currentStep3 + 1} / 4
              </p>
            </div>

            {/* 説明文付きナビゲーション */}
            <div>
              <h4>説明文付きナビゲーション</h4>
              <Steps
                type="navigation"
                current={1}
                onChange={(current) => message.info(`ステップ ${current + 1} をクリック`)}
                items={[
                  {
                    title: 'プロジェクト選択',
                    description: 'Step 1',
                  },
                  {
                    title: 'ファイルアップロード',
                    description: 'Step 2',
                  },
                  {
                    title: 'データ検証',
                    description: 'Step 3',
                  },
                  {
                    title: '処理実行',
                    description: 'Step 4',
                  },
                ]}
              />
            </div>

            {/* エラー状態 - ナビゲーション */}
            <div>
              <h4>エラー状態 - ナビゲーション</h4>
              <Steps
                type="navigation"
                current={2}
                status="error"
                onChange={(current) => message.info(`ステップ ${current + 1} をクリック`)}
                items={[
                  {
                    title: 'ステップ1',
                    status: 'finish',
                  },
                  {
                    title: 'ステップ2',
                    status: 'finish',
                  },
                  {
                    title: 'ステップ3',
                    status: 'error',
                  },
                  {
                    title: 'ステップ4',
                    status: 'wait',
                  },
                ]}
              />
            </div>

            {/* Small サイズ - ナビゲーション */}
            <div>
              <h4>Small サイズ - ナビゲーション</h4>
              <Steps
                type="navigation"
                size="small"
                current={currentStep4}
                onChange={setCurrentStep4}
                items={[
                  {
                    title: 'ステップ1',
                  },
                  {
                    title: 'ステップ2',
                  },
                  {
                    title: 'ステップ3',
                  },
                ]}
              />
            </div>
          </Space>
        </Card>

        {/* 実装コード例 */}
        <Card title="実装コード例">
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <h4>パターン1: 水平ステップ（標準）</h4>
              <pre style={{
                background: token.colorBgContainer,
                padding: '12px',
                borderRadius: '6px',
                border: `1px solid ${token.colorBorder}`,
                overflow: 'auto',
              }}>
                {`<Steps
  current={1}
  items={[
    { title: 'ステップ1' },
    { title: 'ステップ2' },
    { title: 'ステップ3' },
  ]}
/>`}
              </pre>
            </div>

            <div>
              <h4>パターン2: 垂直ステップ</h4>
              <pre style={{
                background: token.colorBgContainer,
                padding: '12px',
                borderRadius: '6px',
                border: `1px solid ${token.colorBorder}`,
                overflow: 'auto',
              }}>
                {`<Steps
  direction="vertical"
  current={1}
  items={[
    {
      title: 'ステップ1',
      description: '詳細説明テキスト',
    },
    {
      title: 'ステップ2',
      description: '詳細説明テキスト',
    },
  ]}
/>`}
              </pre>
            </div>

            <div>
              <h4>パターン3: ナビゲーションステップ</h4>
              <pre style={{
                background: token.colorBgContainer,
                padding: '12px',
                borderRadius: '6px',
                border: `1px solid ${token.colorBorder}`,
                overflow: 'auto',
              }}>
                {`<Steps
  type="navigation"
  current={1}
  onChange={(current) => console.log(current)}
  items={[
    { title: 'ステップ1' },
    { title: 'ステップ2' },
    { title: 'ステップ3' },
  ]}
/>`}
              </pre>
            </div>
          </Space>
        </Card>

        {/* 使用上の注意点 */}
        <Card title="使用上の注意点">
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <h4 style={{ color: token.colorSuccess }}>✅ DO（推奨）</h4>
              <ul style={{ color: token.colorTextSecondary, lineHeight: 1.8 }}>
                <li>ステップ数は3-5個を目安にする（水平ステップ）</li>
                <li>各ステップのラベルは簡潔に（2-8文字）</li>
                <li>現在のステップを明確に表示する</li>
                <li>完了したステップはチェックマークで表示する</li>
                <li>エラーが発生したステップは赤色で強調する</li>
                <li>ナビゲーションタイプでは過去のステップに戻れるようにする</li>
                <li>垂直ステップでは説明文を活用する</li>
              </ul>
            </div>
            <Divider />
            <div>
              <h4 style={{ color: token.colorError }}>❌ DON'T（非推奨）</h4>
              <ul style={{ color: token.colorTextSecondary, lineHeight: 1.8 }}>
                <li>水平ステップで8個以上のステップを配置しない</li>
                <li>ラベルが長すぎて折り返しが発生する</li>
                <li>各ステップの幅が不均等になる（水平ステップ）</li>
                <li>エラー状態を放置する（ユーザーに修正方法を示す）</li>
                <li>ステップをスキップできるようにする（順次進行が原則）</li>
                <li>モバイルで水平ステップを使用する（垂直推奨）</li>
              </ul>
            </div>
          </Space>
        </Card>
      </Space>
    </div>
  );
}
