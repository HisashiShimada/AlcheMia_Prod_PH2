'use client';

import React, { useState, useEffect } from 'react';
import { Card, Progress, Steps, Space, Button, Row, Col, Typography, Divider, theme } from 'antd';
import {
  CheckCircleOutlined,
  SyncOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  UploadOutlined,
  DatabaseOutlined,
  CheckOutlined,
  LoadingOutlined,
  UserOutlined,
  SolutionOutlined,
  SmileOutlined,
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { useToken } = theme;

/**
 * 進捗状況表示パターンデモコンポーネント
 * docs/design/ui/progress_policy.mdに基づく全パターンの実装例
 */
const ProgressPatternsDemo: React.FC = () => {
  const { token } = useToken();
  const [lineProgress, setLineProgress] = useState(45);
  const [circleProgress, setCircleProgress] = useState(65);
  const [currentStep, setCurrentStep] = useState(1);
  const [simulationProgress, setSimulationProgress] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);

  // 自動進捗シミュレーション
  useEffect(() => {
    if (isSimulating && simulationProgress < 100) {
      const timer = setTimeout(() => {
        setSimulationProgress((prev) => {
          const newProgress = Math.min(prev + 5, 100);
          if (newProgress >= 100) {
            setTimeout(() => setIsSimulating(false), 100);
          }
          return newProgress;
        });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isSimulating, simulationProgress]);

  const startSimulation = () => {
    setSimulationProgress(0);
    setIsSimulating(true);
  };

  const resetSimulation = () => {
    setSimulationProgress(0);
    setIsSimulating(false);
  };

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {/* ヘッダー */}
      <Card>
        <Title level={2}>進捗状況表示パターン</Title>
        <Paragraph>
          <Text type="secondary">
            ファイルアップロード、データ処理、ワークフローなど、様々な進捗状況を表示するための
            標準パターンを定義しています。
          </Text>
        </Paragraph>
        <Paragraph>
          <Text strong>参照:</Text>{' '}
          <Text code>docs/design/ui/progress_policy.md</Text>
        </Paragraph>
      </Card>

      {/* 標準3パターン */}
      <Card title="標準3パターン">
        {/* パターン1: 線形プログレス（水平バー） */}
        <Title level={4}>パターン1: 線形プログレス（水平バー）</Title>
        <Paragraph>
          <Text type="secondary">
            用途: ファイルアップロード、データ処理、タスク進行状況
          </Text>
        </Paragraph>
        <Card size="small" style={{ marginBottom: 24, backgroundColor: token.colorBgLayout }}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text>ファイルアップロード中...</Text>
              <Progress 
                percent={lineProgress} 
                strokeColor={token.colorPrimary}
                trailColor={token.colorFillSecondary}
              />
            </div>
            <Space>
              <Button onClick={() => setLineProgress(Math.max(0, lineProgress - 10))}>
                -10%
              </Button>
              <Button onClick={() => setLineProgress(Math.min(100, lineProgress + 10))}>
                +10%
              </Button>
              <Button onClick={() => setLineProgress(0)}>リセット</Button>
            </Space>
          </Space>
        </Card>

        <Divider />

        {/* パターン2: 円形プログレス（小） */}
        <Title level={4}>パターン2: 円形プログレス（小）</Title>
        <Paragraph>
          <Text type="secondary">
            用途: ダッシュボードのKPI表示、コンパクトな進捗表示
          </Text>
        </Paragraph>
        <Card size="small" style={{ marginBottom: 24, backgroundColor: token.colorBgLayout }}>
          <Row gutter={[16, 16]} align="middle">
            <Col>
              <Progress 
                type="circle" 
                percent={circleProgress}
                width={80}
                strokeWidth={6}
                strokeColor={token.colorPrimary}
                trailColor={token.colorFillSecondary}
              />
            </Col>
            <Col>
              <Space>
                <Button onClick={() => setCircleProgress(Math.max(0, circleProgress - 10))}>
                  -10%
                </Button>
                <Button onClick={() => setCircleProgress(Math.min(100, circleProgress + 10))}>
                  +10%
                </Button>
                <Button onClick={() => setCircleProgress(0)}>リセット</Button>
              </Space>
            </Col>
          </Row>
        </Card>

        <Divider />

        {/* パターン3: ステップ表示 */}
        <Title level={4}>パターン3: ステップ表示</Title>
        <Paragraph>
          <Text type="secondary">
            用途: ウィザード形式の処理、段階的なワークフロー
          </Text>
        </Paragraph>
        <Card size="small" style={{ marginBottom: 24, backgroundColor: token.colorBgLayout }}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Steps 
              current={currentStep}
              items={[
                {
                  title: '開始',
                  description: '初期設定',
                  icon: <UserOutlined />,
                },
                {
                  title: '処理中',
                  description: 'データ処理',
                  icon: <SolutionOutlined />,
                },
                {
                  title: '完了',
                  description: '結果確認',
                  icon: <SmileOutlined />,
                },
              ]}
            />
            <Space>
              <Button 
                onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                disabled={currentStep === 0}
              >
                前へ
              </Button>
              <Button 
                onClick={() => setCurrentStep(Math.min(2, currentStep + 1))}
                disabled={currentStep === 2}
              >
                次へ
              </Button>
              <Button onClick={() => setCurrentStep(0)}>リセット</Button>
            </Space>
          </Space>
        </Card>
      </Card>

      {/* 状態別の表示 */}
      <Card title="状態別の表示">
        <Row gutter={[24, 24]}>
          {/* 通常状態 */}
          <Col xs={24} md={12}>
            <Card size="small" title="通常状態">
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <Progress 
                  percent={75} 
                  strokeColor={token.colorPrimary}
                  trailColor={token.colorFillSecondary}
                />
                <Progress 
                  type="circle" 
                  percent={75}
                  width={80}
                  strokeWidth={6}
                  strokeColor={token.colorPrimary}
                />
              </Space>
            </Card>
          </Col>

          {/* 成功状態 */}
          <Col xs={24} md={12}>
            <Card size="small" title="成功状態">
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <Progress 
                  percent={100} 
                  status="success"
                  strokeColor={token.colorSuccess}
                />
                <Progress 
                  type="circle" 
                  percent={100}
                  width={80}
                  strokeWidth={6}
                  status="success"
                  strokeColor={token.colorSuccess}
                />
              </Space>
            </Card>
          </Col>

          {/* 警告状態 */}
          <Col xs={24} md={12}>
            <Card size="small" title="警告状態">
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <Progress 
                  percent={50} 
                  strokeColor={token.colorWarning}
                  trailColor={token.colorFillSecondary}
                />
                <Progress 
                  type="circle" 
                  percent={50}
                  width={80}
                  strokeWidth={6}
                  strokeColor={token.colorWarning}
                />
              </Space>
            </Card>
          </Col>

          {/* エラー状態 */}
          <Col xs={24} md={12}>
            <Card size="small" title="エラー状態">
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <Progress 
                  percent={30} 
                  status="exception"
                  strokeColor={token.colorError}
                />
                <Progress 
                  type="circle" 
                  percent={30}
                  width={80}
                  strokeWidth={6}
                  status="exception"
                  strokeColor={token.colorError}
                />
              </Space>
            </Card>
          </Col>
        </Row>
      </Card>

      {/* 補足パターン */}
      <Card title="補足パターン">
        <Row gutter={[24, 24]}>
          {/* 円形プログレス（大） */}
          <Col xs={24} md={12}>
            <Card size="small" title="円形プログレス（大）">
              <Paragraph>
                <Text type="secondary">用途: 大きな画面での強調表示、メインKPI</Text>
              </Paragraph>
              <div style={{ textAlign: 'center' }}>
                <Progress 
                  type="circle" 
                  percent={85}
                  width={120}
                  strokeWidth={8}
                  strokeColor={token.colorPrimary}
                  format={(percent) => `${percent}%`}
                />
              </div>
            </Card>
          </Col>

          {/* 細い線形プログレス */}
          <Col xs={24} md={12}>
            <Card size="small" title="細い線形プログレス">
              <Paragraph>
                <Text type="secondary">用途: カード内の簡易進捗表示、テーブル行内</Text>
              </Paragraph>
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <div>
                  <Text>タスク1</Text>
                  <Progress 
                    percent={60} 
                    strokeColor={token.colorPrimary}
                    strokeWidth={4}
                    showInfo={false}
                  />
                </div>
                <div>
                  <Text>タスク2</Text>
                  <Progress 
                    percent={40} 
                    strokeColor={token.colorPrimary}
                    strokeWidth={4}
                    showInfo={false}
                  />
                </div>
                <div>
                  <Text>タスク3</Text>
                  <Progress 
                    percent={90} 
                    strokeColor={token.colorPrimary}
                    strokeWidth={4}
                    showInfo={false}
                  />
                </div>
              </Space>
            </Card>
          </Col>

          {/* ダッシュボードプログレス */}
          <Col xs={24} md={12}>
            <Card size="small" title="ダッシュボードプログレス">
              <Paragraph>
                <Text type="secondary">用途: ダッシュボードの統計情報</Text>
              </Paragraph>
              <Row gutter={16} justify="center">
                <Col>
                  <Progress 
                    type="circle" 
                    percent={70}
                    width={100}
                    strokeWidth={8}
                    strokeColor={token.colorSuccess}
                    format={(percent) => (
                      <Space direction="vertical" size={0} align="center">
                        <CheckCircleOutlined style={{ fontSize: 24, color: token.colorSuccess }} />
                        <Text strong>{percent}%</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>完了</Text>
                      </Space>
                    )}
                  />
                </Col>
                <Col>
                  <Progress 
                    type="circle" 
                    percent={45}
                    width={100}
                    strokeWidth={8}
                    strokeColor={token.colorPrimary}
                    format={(percent) => (
                      <Space direction="vertical" size={0} align="center">
                        <SyncOutlined spin style={{ fontSize: 24, color: token.colorPrimary }} />
                        <Text strong>{percent}%</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>処理中</Text>
                      </Space>
                    )}
                  />
                </Col>
              </Row>
            </Card>
          </Col>

          {/* 垂直ステップ表示 */}
          <Col xs={24} md={12}>
            <Card size="small" title="垂直ステップ表示">
              <Paragraph>
                <Text type="secondary">用途: 縦長のサイドバーでのワークフロー表示</Text>
              </Paragraph>
              <Steps 
                direction="vertical" 
                size="small" 
                current={1}
                items={[
                  {
                    title: 'アカウント作成',
                    description: '基本情報の入力',
                  },
                  {
                    title: 'プロフィール設定',
                    description: '詳細情報の入力',
                  },
                  {
                    title: '確認',
                    description: '入力内容の確認',
                  },
                  {
                    title: '完了',
                    description: '登録完了',
                  },
                ]}
              />
            </Card>
          </Col>
        </Row>
      </Card>

      {/* インタラクティブデモ */}
      <Card title="インタラクティブデモ: ファイルアップロードシミュレーション">
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Card size="small" style={{ backgroundColor: token.colorBgLayout }}>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <div>
                <Space>
                  <UploadOutlined style={{ fontSize: 20, color: token.colorPrimary }} />
                  <Text strong>ファイルアップロード中...</Text>
                </Space>
              </div>
              
              <Progress 
                percent={simulationProgress}
                strokeColor={
                  simulationProgress === 100 
                    ? token.colorSuccess 
                    : token.colorPrimary
                }
                status={simulationProgress === 100 ? 'success' : 'active'}
              />
              
              <Space>
                <Button 
                  type="primary" 
                  onClick={startSimulation}
                  disabled={isSimulating}
                  icon={<UploadOutlined />}
                >
                  アップロード開始
                </Button>
                <Button 
                  onClick={resetSimulation}
                  disabled={isSimulating}
                >
                  リセット
                </Button>
              </Space>
              
              {simulationProgress === 100 && (
                <div>
                  <CheckCircleOutlined style={{ color: token.colorSuccess, marginRight: 8 }} />
                  <Text type="success">アップロードが完了しました</Text>
                </div>
              )}
            </Space>
          </Card>
        </Space>
      </Card>

      {/* ステップの詳細例 */}
      <Card title="ステップの詳細例: プロジェクト作成ワークフロー">
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Steps 
            current={1}
            items={[
              {
                title: 'プロジェクト情報',
                description: '名前と説明を入力',
                icon: <SolutionOutlined />,
              },
              {
                title: 'メンバー招待',
                description: 'チームメンバーを追加',
                icon: <UserOutlined />,
              },
              {
                title: '初期設定',
                description: '権限とルールの設定',
                icon: <DatabaseOutlined />,
              },
              {
                title: '完了',
                description: 'プロジェクト作成完了',
                icon: <CheckOutlined />,
              },
            ]}
          />
        </Space>
      </Card>

      {/* エラーステップの例 */}
      <Card title="エラーステップの例">
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Steps 
            current={1} 
            status="error"
            items={[
              {
                title: 'データ検証',
                description: '入力データの検証',
                icon: <CheckCircleOutlined />,
              },
              {
                title: '処理実行',
                description: 'データ処理中にエラー',
                icon: <CloseCircleOutlined />,
              },
              {
                title: '完了',
                description: '未実行',
                icon: <ClockCircleOutlined />,
              },
            ]}
          />
        </Space>
      </Card>

      {/* 使用ガイドライン */}
      <Card title="使用ガイドライン">
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Card size="small" title="✅ DO（推奨）" headStyle={{ backgroundColor: token.colorSuccessBg }}>
              <ul>
                <li>進捗の変化はアニメーションで滑らかに表示する</li>
                <li>完了時は成功色（緑）で表示する</li>
                <li>エラー時は必ずエラー色（赤）で表示する</li>
                <li>長時間かかる処理は線形プログレスを使用する</li>
                <li>ステップ表示には明確な各ステップ名を付ける</li>
                <li>パーセンテージは常に表示する（コンパクト表示を除く）</li>
              </ul>
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card size="small" title="❌ DON'T（非推奨）" headStyle={{ backgroundColor: token.colorErrorBg }}>
              <ul>
                <li>進捗が不明な場合に0%を表示しない（スピナーを使用する）</li>
                <li>複数の進捗バーを縦に密集させない（最低16pxの間隔を空ける）</li>
                <li>進捗色をカスタマイズしない（状態色のみ使用する）</li>
                <li>ステップ表示で5ステップを超えない（長すぎる場合は分割する）</li>
                <li>円形プログレスを小さすぎるサイズで使用しない（最小60px）</li>
              </ul>
            </Card>
          </Col>
        </Row>
      </Card>
    </Space>
  );
};

export default ProgressPatternsDemo;
