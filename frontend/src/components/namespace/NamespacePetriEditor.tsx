'use client';

/**
 * NamespacePetriEditor
 *
 * /namespace-petri-editor 専用のペトリネット画面。
 * - ツールバーは本物の EditorToolbar をそのまま使用（レイアウト完全一致）
 * - 名前空間ボタン押下 → NamespaceMaimlEditor をモーダルで開く
 * - その他の props にはダミー（何もしない）関数を渡す
 * - キャンバスはシンプルな空の ReactFlow
 */

import React, { useState } from 'react';
import ReactFlow, { Background, Controls, MiniMap, ReactFlowProvider } from 'reactflow';
import 'reactflow/dist/style.css';
import EditorToolbar from '@/components/editorv2/EditorToolbar';
import NamespaceMaimlEditor from './NamespaceMaimlEditor';

// 何もしない関数
const noop = () => {};

const NamespacePetriEditor: React.FC = () => {
  const [nsEditorOpen, setNsEditorOpen] = useState(false);

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#fff' }}>
      {/* 本物の EditorToolbar（名前空間ボタン以外はダミー） */}
      <EditorToolbar
        onAddNode={noop}
        onUndo={noop}
        onRedo={noop}
        canUndo={false}
        canRedo={false}
        onSave={noop}
        canSave={false}
        onEditDocument={noop}
        onValidate={noop}
        isValidating={false}
        onAddWorkflow={noop}
        workflowModeActive={false}
        viewMode="petriNet"
        onViewModeChange={noop}
        onOpenNamespaceEditor={() => setNsEditorOpen(true)}
      />

      {/* 空のペトリネットキャンバス */}
      <div style={{ flex: 1, overflow: 'hidden', background: '#fff' }}>
        <ReactFlowProvider>
          <ReactFlow
            nodes={[]}
            edges={[]}
            fitView
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            style={{ background: '#fff' }}
          >
            <Background color="#e5e7eb" gap={16} />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </ReactFlowProvider>
      </div>

      {/* MaiMLファイル 名前空間エディター（モーダル） */}
      <NamespaceMaimlEditor
        open={nsEditorOpen}
        onClose={() => setNsEditorOpen(false)}
      />
    </div>
  );
};

export default NamespacePetriEditor;
