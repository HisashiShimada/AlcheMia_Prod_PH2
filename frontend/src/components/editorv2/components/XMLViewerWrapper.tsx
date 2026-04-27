/**
 * XMLViewerWrapper - 非同期XML生成を処理するラッパーコンポーネント（TypeScript版）
 *
 * convertReactFlowToMaiML と convertMultipleMethodsToMaiML は非同期関数なので、
 * useEffect 内で呼び出して結果を state に保存します。
 * @mui/material の CircularProgress/Box → Ant Design の Spin/div に置き換え済み
 *
 * @version 1.0.0
 */

import React, { useState, useEffect } from 'react';
import { Spin } from 'antd';
import XMLViewer from './XMLViewer';
import { convertReactFlowToMaiML } from '../utils/converters/reactFlowToMaiml';
import { convertMultipleMethodsToMaiML } from '../utils/converters/multiMethodConverter';
import type { Node, Edge } from 'reactflow';
import type { NodeData, EdgeData, DocumentData, MethodData } from '../../../types/editor';

/**
 * XMLViewerWrapperProps - Props型定義
 */
export interface XMLViewerWrapperProps {
  nodes: Node<NodeData>[];
  edges: Edge<EdgeData>[];
  documentData: DocumentData | null;
  multiMethodMode: boolean;
  methods: MethodData[];
  activeMethodIndex: number;
}

/**
 * XMLViewerWrapper - 非同期XML生成ラッパー
 */
const XMLViewerWrapper: React.FC<XMLViewerWrapperProps> = ({
  nodes,
  edges,
  documentData,
  multiMethodMode,
  methods,
  activeMethodIndex,
}) => {
  const [xmlContent, setXmlContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    const generateXML = async (): Promise<void> => {
      try {
        setLoading(true);

        const metadata = {
          name: documentData?.name || 'document',
          description: documentData?.description || '',
        };

        const allTemplatesFromContext = window.clineAllTemplates || null;

        let xmlString: string;
        if (multiMethodMode && methods.length > 0) {
          // マルチメソッドモードの場合
          const currentViewport = { x: 0, y: 0, zoom: 1 };
          const updatedMethods = [...methods];
          updatedMethods[activeMethodIndex] = {
            ...updatedMethods[activeMethodIndex],
            nodes: nodes,
            edges: edges,
            viewport: currentViewport,
          };
          xmlString = await convertMultipleMethodsToMaiML(
            updatedMethods,
            metadata,
            documentData,
            allTemplatesFromContext
          );
        } else {
          // 単一メソッドモードの場合
          xmlString = await convertReactFlowToMaiML(
            nodes,
            edges,
            metadata,
            documentData,
            null,
            allTemplatesFromContext
          );
        }

        if (isMounted) {
          setXmlContent(xmlString);
          setLoading(false);
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        console.error('❌ [XMLViewerWrapper] XML生成エラー:', err);
        if (isMounted) {
          setXmlContent(`<!-- XMLの生成中にエラーが発生しました: ${err.message} -->`);
          setLoading(false);
        }
      }
    };

    generateXML();

    return () => {
      isMounted = false;
    };
  }, [nodes, edges, documentData, multiMethodMode, methods, activeMethodIndex]);

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
          minHeight: '400px',
        }}
      >
        <Spin size="large" tip="XML を生成中...">
          <div />
        </Spin>
      </div>
    );
  }

  return <XMLViewer xmlContent={xmlContent} />;
};

export default XMLViewerWrapper;
