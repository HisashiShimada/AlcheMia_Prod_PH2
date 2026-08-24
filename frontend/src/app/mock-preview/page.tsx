'use client';

/**
 * モチE��プレビューペ�Eジ
 * 
 * URL: /mock-preview
 * 画面イメージ確認専用。本番では使用しなぁE��E
 */

import React from 'react';
import { Typography, Card, Divider, Alert, ConfigProvider, Tabs } from 'antd';
import InstructionManagementTabMock from '@/components/project/mock/ExperimentInstructionMock';
import ExperimentWorkerScreenMock from '@/components/ExperimentWorker/mock/ExperimentWorkerScreenMock';
import ProgressOverviewPatternsMock from '@/components/ExperimentWorker/mock/ProgressOverviewPatternsMock';
import DataRecordDialogMock from '@/components/ExperimentWorker/mock/DataRecordDialogMock';
const { Title, Text } = Typography;

export default function MockPreviewPage() {
  return (
    <ConfigProvider>
      <div style={{ padding: 24, backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
        <Title level={3}>🖼�E�EモチE��プレビュー</Title>

        <Alert
          type="info"
          showIcon
          message="こ�Eペ�Eジは画面イメージ確認専用です。固定データを使用してぁE��す、E
          style={{ marginBottom: 16 }}
        />

        <Tabs
          type="card"
          items={[
            {
              key: 'worker_screen',
              label: '�E 実験作業老E��面�E�リチE��イン�E�E,
              children: (
                <>
                  {/* ─── 凡侁E─── */}
                  <Card size="small" title="凡例�E変更概要E style={{ marginBottom: 16 }}>
                    <Text strong>主な変更点:</Text>
                    <ul style={{ marginTop: 8 }}>
                      <li>DataRecordDialog�E�モーダル�E��E 全画面2タブ構�Eに変更</li>
                      <li><Text strong>タチE「作業記録、E/Text>: プロジェクト指示確誁E+ プロパティ単位で想定値/実績値を並べて記録</li>
                      <li><Text strong>タチE「�E体進捗、E/Text>: 全タスク・全トランジションの進捗一覧�E�「作業へ」「詳細確認」で作業記録タブに連携�E�E/li>
                      <li><Text strong style={{ color: '#ff4d4f' }}>「問題報告」�Eタン</Text>: タブ外�EチE��ーに独立�E置�E�常時アクセス可能・現在作業中トランジションを�E動セチE���E�E/li>
                    </ul>
                    <Divider style={{ margin: '8px 0' }} />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      モチE��チE�Eタ: タスク#1�E��E完亁E��E タスク#2�E�混吁E作業中、加熱・遠忁E�E離:未着手！E
                    </Text>
                  </Card>

                  {/* ─── 実験作業老E��面 モチE�� ─── */}
                  <Card
                    title={
                      <span>
                        <Text strong>実験作業老E��面</Text>
                        <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                          ─ UIリチE��イン案！EタチE+ 問題報告独立！E
                        </Text>
                      </span>
                    }
                    style={{ marginBottom: 24 }}
                  >
                    <ExperimentWorkerScreenMock />
                  </Card>
                </>
              ),
            },
            {
              key: 'progress_overview_patterns',
              label: '📊 全体進捗タチEレイアウト案！E/B/C�E�E,
              children: (
                <>
                  <Card size="small" title="比輁E��要E style={{ marginBottom: 16 }}>
                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                      <li><Text strong>パターンA</Text>: サマリーカーチE�E�EチE��プレート数・入力状況E���Eログレスバ�E�E��E所要時間�E問題数を�E追加</li>
                      <li><Text strong>パターンB</Text>: サマリーカーチE�E�Eタスク単位で折りたたみ展開�E�各行に詳細惁E��インライン表示�E�E/li>
                      <li><Text strong>パターンC</Text>: サマリーカード追加のみ�E�既存テーブルはそ�Eまま�E�E/li>
                    </ul>
                  </Card>
                  <Card style={{ marginBottom: 24, minHeight: 600 }}>
                    <ProgressOverviewPatternsMock />
                  </Card>
                </>
              ),
            },
            {
              key: 'data_record_dialog',
              label: '📋 DataRecordDialog�E�Ensertion確認！E,
              children: (
                <>
                  <Card size="small" title="確認シナリオ" style={{ marginBottom: 16 }}>
                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                      <li>
                        <Text strong>シナリオ1</Text>: MAIMLチE��プレートに{' '}
                        <Text code>&lt;insertion&gt;</Text> 持E��が含まれる場吁E
                        �E�Eesults チE��プレートを選択すると挿入フィールドが表示�E�E
                      </li>
                      <li>
                        <Text strong>シナリオ2</Text>: ダイアログ冁E�E「Insertion 追加」�Eタンで
                        カスタムプロパティとして Insertion を追加する場吁E
                      </li>
                    </ul>
                    <Divider style={{ margin: '8px 0' }} />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      ※ projectId / methodId / taskNo を渡してぁE��ぁE��めEAPI 呼び出し�E発生しません、E
                    </Text>
                  </Card>
                  <Card style={{ marginBottom: 24 }}>
                    <DataRecordDialogMock />
                  </Card>
                </>
              ),
            },
            {
              key: 'instruction_management',
              label: '持E��管琁E��ブ（旧モチE���E�E,
              children: (
                <>
                  {/* ─── 凡侁E─── */}
                  <Card size="small" title="凡例�EモチE��チE�Eタ冁E��" style={{ marginBottom: 16 }}>
                    <Text>以下�E2メソチE��・4タスクのチE�Eタを表示してぁE��す！E/Text>
                    <ul style={{ marginTop: 8 }}>
                      <li><Text strong>合�E工稁E/ Task 1</Text>�E�Eプロパティ�E�Eond-1ÁE, Result-1ÁE�E�… <Text type="warning">レビュー征E��</Text> ↁE「承認」「NG」�Eタン活性</li>
                      <li><Text strong>合�E工稁E/ Task 2</Text>�E�Eプロパティ�E�Eond-2ÁE�E�… <Text type="secondary">実行中</Text>�E�実績値未記録�E�E/li>
                      <li><Text strong>精製工稁E/ Task 1</Text>�E�Eプロパティ�E�Eond-1ÁE, Material-1ÁE�E�… <Text style={{ color: '#52c41a' }}>完亁E/Text></li>
                      <li><Text strong>精製工稁E/ Task 2</Text>�E�Eプロパティ�E�Eond-1ÁE�E�… <Text type="secondary">実行征E��</Text></li>
                    </ul>
                    <Divider style={{ margin: '8px 0' }} />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      ※ 承認�ENG操作�EモチE��冁E��スチE�Eタスを変更するのみ�E�EPI未接続！E
                    </Text>
                  </Card>

                  {/* ─── 持E��管琁E��チEモチE�� ─── */}
                  <Card
                    title={
                      <span>
                        <Text strong>持E��管琁E/Text>
                        <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                          ─ ProjectManagement Tab 3 の新レイアウチE
                        </Text>
                      </span>
                    }
                    style={{ marginBottom: 24 }}
                  >
                    <InstructionManagementTabMock />
                  </Card>
                </>
              ),
            },
          ]}
        />
      </div>
    </ConfigProvider>
  );
}
