/**
 * TransitionFlowNode 単体テスト
 *
 * 対象: フロー図記録ボタンの活性/非活性判定ロジック
 *
 * 修正背景:
 *   フロー図表示時の「記録」ボタンが isProjectRecordable フラグのみで制御されており、
 *   トランジションのステータス（not_started）が考慮されていなかった。
 *   本テストにより、リスト表示と同一の判定ロジックで動作することを保証する。
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import TransitionFlowNode from '../TransitionFlowNode';
import type { Transition, ProgressStatus } from '@/types/experimentWorker';

// reactflow の Handle コンポーネントをモック化
jest.mock('reactflow', () => ({
  Handle: ({ type, position }: { type: string; position: string }) => (
    <div data-testid={`handle-${type}-${position}`} />
  ),
  Position: {
    Left: 'left',
    Right: 'right',
  },
}));

// Ant Design の theme.useToken をモック化
jest.mock('antd', () => {
  const actual = jest.requireActual('antd');
  return {
    ...actual,
    theme: {
      ...actual.theme,
      useToken: () => ({
        token: {
          colorBorder: '#d9d9d9',
          colorBgContainer: '#ffffff',
          colorWarning: '#faad14',
          colorSuccess: '#52c41a',
          colorError: '#ff4d4f',
          colorInfo: '#1677ff',
          colorPrimary: '#1677ff',
          colorText: '#000000',
          paddingSM: 8,
          borderRadiusSM: 4,
          borderRadiusLG: 8,
          boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
        },
      }),
    },
  };
});

/** テスト用トランジションデータを生成するヘルパー */
const makeTransition = (status: ProgressStatus | undefined, id = 'tr-001'): Transition => ({
  transitionId: id,
  transitionName: `テストトランジション(${status ?? 'undefined'})`,
  status,
});

/** TransitionFlowNode の data prop を生成するヘルパー */
const makeData = (
  transition: Transition,
  isProjectRecordable: boolean,
  onRecordClick = jest.fn(),
  onIssueClick = jest.fn(),
) => ({
  data: { transition, onRecordClick, onIssueClick, isProjectRecordable },
});


describe('TransitionFlowNode', () => {
  describe('記録ボタンの活性/非活性判定', () => {
    describe('isProjectRecordable=true のとき（プロジェクトが記録可能状態）', () => {
      test('not_started 状態のトランジションは記録ボタンが disabled であること', () => {
        const transition = makeTransition('not_started');
        render(<TransitionFlowNode {...makeData(transition, true)} />);
        expect(screen.getByTestId('transition-node-record-button-tr-001')).toBeDisabled();
      });

      test('preparing 状態のトランジションは記録ボタンが有効であること', () => {
        const transition = makeTransition('preparing');
        render(<TransitionFlowNode {...makeData(transition, true)} />);
        expect(screen.getByTestId('transition-node-record-button-tr-001')).toBeEnabled();
      });

      test('ready 状態のトランジションは記録ボタンが有効であること', () => {
        const transition = makeTransition('ready');
        render(<TransitionFlowNode {...makeData(transition, true)} />);
        expect(screen.getByTestId('transition-node-record-button-tr-001')).toBeEnabled();
      });

      test('in_progress 状態のトランジションは記録ボタンが有効であること', () => {
        const transition = makeTransition('in_progress');
        render(<TransitionFlowNode {...makeData(transition, true)} />);
        expect(screen.getByTestId('transition-node-record-button-tr-001')).toBeEnabled();
      });

      test('completed 状態のトランジションは記録ボタンが有効であること', () => {
        const transition = makeTransition('completed');
        render(<TransitionFlowNode {...makeData(transition, true)} />);
        expect(screen.getByTestId('transition-node-record-button-tr-001')).toBeEnabled();
      });

      test('on_hold 状態のトランジションは記録ボタンが有効であること', () => {
        const transition = makeTransition('on_hold');
        render(<TransitionFlowNode {...makeData(transition, true)} />);
        expect(screen.getByTestId('transition-node-record-button-tr-001')).toBeEnabled();
      });

      test('issue 状態のトランジションは記録ボタンが有効であること', () => {
        const transition = makeTransition('issue');
        render(<TransitionFlowNode {...makeData(transition, true)} />);
        expect(screen.getByTestId('transition-node-record-button-tr-001')).toBeEnabled();
      });

      test('status が未定義のとき記録ボタンが有効であること（undefined は not_started と別扱い）', () => {
        const transition = makeTransition(undefined);
        render(<TransitionFlowNode {...makeData(transition, true)} />);
        // status が undefined のとき transition.status === 'not_started' は false なので有効
        expect(screen.getByTestId('transition-node-record-button-tr-001')).toBeEnabled();
      });
    });

    describe('isProjectRecordable=false のとき（プロジェクトが記録操作不可状態）', () => {
      const allStatuses: Array<ProgressStatus | undefined> = [
        'not_started', 'preparing', 'ready', 'in_progress',
        'completed', 'on_hold', 'issue', undefined,
      ];

      allStatuses.forEach((status) => {
        test(`${status ?? 'undefined'} 状態でも記録ボタンが disabled であること`, () => {
          const transition = makeTransition(status);
          render(<TransitionFlowNode {...makeData(transition, false)} />);
          expect(screen.getByTestId('transition-node-record-button-tr-001')).toBeDisabled();
        });
      });
    });
  });

  describe('ステータスタグの表示', () => {
    test.each([
      ['not_started', '未開始'],
      ['preparing',   '準備中'],
      ['ready',       '準備完了'],
      ['in_progress', '作業中'],
      ['completed',   '完了'],
      ['on_hold',     '保留中'],
      ['issue',       '問題あり'],
    ] as [ProgressStatus, string][])(
      'status=%s のときステータスタグ "%s" が表示されること',
      (status, expectedText) => {
        const transition = makeTransition(status);
        render(<TransitionFlowNode {...makeData(transition, true)} />);
        expect(screen.getByText(expectedText)).toBeInTheDocument();
      }
    );
  });

  describe('記録ボタンクリックイベント', () => {
    test('有効な記録ボタンをクリックすると onRecordClick が呼ばれること', () => {
      const onRecordClick = jest.fn();
      const transition = makeTransition('in_progress');
      render(<TransitionFlowNode {...makeData(transition, true, onRecordClick)} />);
      screen.getByTestId('transition-node-record-button-tr-001').click();
      expect(onRecordClick).toHaveBeenCalledTimes(1);
      expect(onRecordClick).toHaveBeenCalledWith(transition);
    });

    test('disabled な記録ボタンをクリックしても onRecordClick が呼ばれないこと', () => {
      const onRecordClick = jest.fn();
      const transition = makeTransition('not_started');
      render(<TransitionFlowNode {...makeData(transition, true, onRecordClick)} />);
      screen.getByTestId('transition-node-record-button-tr-001').click();
      expect(onRecordClick).not.toHaveBeenCalled();
    });
  });
});
