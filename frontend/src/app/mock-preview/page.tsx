'use client';

/**
 * モックプレビューページ
 * 
 * URL: /mock-preview
 * 画面イメージ確認専用。本番では使用しない。
 */

import React from 'react';
import { Typography, Card, Divider, Alert, ConfigProvider, Tabs } from 'antd';
import InstructionManagementTabMock from '@/components/project/mock/ExperimentInstructionMock';
import ExperimentWorkerScreenMock from '@/components/ExperimentWorker/mock/ExperimentWorkerScreenMock';
import ProgressOverviewPatternsMock from '@/components/ExperimentWorker/mock/ProgressOverviewPatternsMock';
const { Title, Text } = Typography;

export default function MockPreviewPage() {
  return (
    <ConfigProvider>
      <div style={{ padding: 24, backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
        <Title level={3}>🖼️ モックプレビュー</Title>

        <Alert
          type="info"
          showIcon
          message="このページは画面イメージ確認専用です。固定データを使用しています。"
          style={{ marginBottom: 16 }}
        />

        <Tabs
          type="card"
          items={[
            {
              key: 'worker_screen',
              label: '🆕 実験作業者画面（リデザイン）',
              children: (
                <>
                  {/* ─── 凡例 ─── */}
                  <Card size="small" title="凡例・変更概要" style={{ marginBottom: 16 }}>
                    <Text strong>主な変更点:</Text>
                    <ul style={{ marginTop: 8 }}>
                      <li>DataRecordDialog（モーダル）→ 全画面2タブ構成に変更</li>
                      <li><Text strong>タブ1「作業記録」</Text>: プロジェクト指示確認 + プロパティ単位で想定値/実績値を並べて記録</li>
                      <li><Text strong>タブ2「全体進捗」</Text>: 全タスク・全トランジションの進捗一覧（「作業へ」「詳細確認」で作業記録タブに連携）</li>
                      <li><Text strong style={{ color: '#ff4d4f' }}>「問題報告」ボタン</Text>: タブ外ヘッダーに独立配置（常時アクセス可能・現在作業中トランジションを自動セット）</li>
                    </ul>
                    <Divider style={{ margin: '8px 0' }} />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      モックデータ: タスク#1（全完了）/ タスク#2（混合:作業中、加熱・遠心分離:未着手）
                    </Text>
                  </Card>

                  {/* ─── 実験作業者画面 モック ─── */}
                  <Card
                    title={
                      <span>
                        <Text strong>実験作業者画面</Text>
                        <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                          ─ UIリデザイン案（2タブ + 問題報告独立）
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
              label: '📊 全体進捗タブ レイアウト案（A/B/C）',
              children: (
                <>
                  <Card size="small" title="比較概要" style={{ marginBottom: 16 }}>
                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                      <li><Text strong>パターンA</Text>: サマリーカード ＋ テンプレート数・入力状況（プログレスバー）・所要時間・問題数を列追加</li>
                      <li><Text strong>パターンB</Text>: サマリーカード ＋ タスク単位で折りたたみ展開（各行に詳細情報インライン表示）</li>
                      <li><Text strong>パターンC</Text>: サマリーカード追加のみ（既存テーブルはそのまま）</li>
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
              label: '📋 DataRecordDialog（Insertion確認）',
              children: (
                <>
                  <Card size="small" title="確認シナリオ" style={{ marginBottom: 16 }}>
                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                      <li>
                        <Text strong>シナリオ1</Text>: MAIMLテンプレートに{' '}
                        <Text code>&lt;insertion&gt;</Text> 指示が含まれる場合
                        （Results テンプレートを選択すると挿入フィールドが表示）
                      </li>
                      <li>
                        <Text strong>シナリオ2</Text>: ダイアログ内の「Insertion 追加」ボタンで
                        カスタムプロパティとして Insertion を追加する場合
                      </li>
                    </ul>
                    <Divider style={{ margin: '8px 0' }} />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      ※ projectId / methodId / taskNo を渡していないため API 呼び出しは発生しません。
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
              label: '指示管理タブ（旧モック）',
              children: (
                <>
                  {/* ─── 凡例 ─── */}
                  <Card size="small" title="凡例・モックデータ内容" style={{ marginBottom: 16 }}>
                    <Text>以下の2メソッド・4タスクのデータを表示しています：</Text>
                    <ul style={{ marginTop: 8 }}>
                      <li><Text strong>合成工程 / Task 1</Text>：4プロパティ（Cond-1×2, Result-1×2）… <Text type="warning">レビュー待ち</Text> → 「承認」「NG」ボタン活性</li>
                      <li><Text strong>合成工程 / Task 2</Text>：2プロパティ（Cond-2×2）… <Text type="secondary">実行中</Text>（実績値未記録）</li>
                      <li><Text strong>精製工程 / Task 1</Text>：3プロパティ（Cond-1×2, Material-1×1）… <Text style={{ color: '#52c41a' }}>完了</Text></li>
                      <li><Text strong>精製工程 / Task 2</Text>：1プロパティ（Cond-1×1）… <Text type="secondary">実行待ち</Text></li>
                    </ul>
                    <Divider style={{ margin: '8px 0' }} />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      ※ 承認・NG操作はモック内でステータスを変更するのみ（API未接続）
                    </Text>
                  </Card>

                  {/* ─── 指示管理タブ モック ─── */}
                  <Card
                    title={
                      <span>
                        <Text strong>指示管理</Text>
                        <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                          ─ ProjectManagement Tab 3 の新レイアウト
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
