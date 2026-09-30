/**
 * XMLViewer - MaiML XMLビューアコンポーネント（TypeScript版）
 *
 * シンタックスハイライト付きでXML構造を表示
 *
 * @version 1.0.0
 */

import React, { useState, useEffect } from 'react';
import './XMLViewer.css';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * XMLViewerProps - XMLViewerコンポーネントのProps型定義
 */
export interface XMLViewerProps {
  xmlContent?: string;
  showLineNumbers?: boolean;
  highlightErrors?: boolean;
  maxHeight?: string;
  onError?: ((error: Error) => void) | null;
}

/**
 * XMLViewer - シンタックスハイライト付きXMLビューア
 */
const XMLViewer: React.FC<XMLViewerProps> = ({
  xmlContent = '',
  showLineNumbers = true,
  highlightErrors = true,
  maxHeight = '600px',
  onError = null,
}) => {
  const { t } = useLanguage();
  const [highlightedXML, setHighlightedXML] = useState<string>('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [lineCount, setLineCount] = useState<number>(0);

  // HTMLエスケープ
  const escapeHTML = (str: string): string => {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  // XMLシンタックスハイライト
  const highlightXML = (xml: string): string => {
    let highlighted = escapeHTML(xml);

    // XMLタグ（開始タグ、終了タグ、自己完結タグ）
    highlighted = highlighted.replace(
      /(&lt;\/?)([\w:.-]+)((?:\s+[\w:.-]+(?:=&quot;[^&quot;]*&quot;)?)*\s*)(\/?&gt;)/g,
      (_match, open: string, tagName: string, attrs: string, close: string) => {
        // 属性をハイライト
        const highlightedAttrs = attrs.replace(
          /([\w:.-]+)(=)(&quot;)([^&quot;]*)(&quot;)/g,
          '<span class="xml-attr-name">$1</span><span class="xml-equals">$2</span><span class="xml-quote">$3</span><span class="xml-attr-value">$4</span><span class="xml-quote">$5</span>'
        );
        return `<span class="xml-bracket">${open}</span><span class="xml-tag">${tagName}</span>${highlightedAttrs}<span class="xml-bracket">${close}</span>`;
      }
    );

    // XMLコメント
    highlighted = highlighted.replace(
      /(&lt;!--)([\s\S]*?)(--&gt;)/g,
      '<span class="xml-comment">$1$2$3</span>'
    );

    // XML宣言
    highlighted = highlighted.replace(
      /(&lt;\?xml)([\s\S]*?)(\?&gt;)/g,
      '<span class="xml-declaration">$1$2$3</span>'
    );

    // テキストコンテンツ（タグ間の内容）
    highlighted = highlighted.replace(
      /(&gt;)([^&lt;]+)(&lt;)/g,
      (_match, open: string, content: string, close: string) => {
        // 空白のみの場合はハイライトしない
        if (content.trim().length === 0) {
          return _match;
        }
        return `${open}<span class="xml-text">${content}</span>${close}`;
      }
    );

    return highlighted;
  };

  useEffect(() => {
    if (!xmlContent) {
      setHighlightedXML('');
      setParseError(null);
      return;
    }

    try {
      // XMLのパース検証
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');

      // パースエラーチェック
      const parserError = xmlDoc.getElementsByTagName('parsererror');
      if (parserError.length > 0) {
        const errorText = parserError[0].textContent || t('xmlViewer.parseError');
        setParseError(errorText);
        if (onError) {
          onError(new Error(errorText));
        }
      } else {
        setParseError(null);
      }

      // シンタックスハイライト適用
      const highlighted = highlightXML(xmlContent);
      setHighlightedXML(highlighted);

      // 行数をカウント
      const lines = xmlContent.split('\n');
      setLineCount(lines.length);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error('❌ [XMLViewer] XML処理エラー:', err);
      setParseError(err.message);
      if (onError) {
        onError(err);
      }
      // エラーがあっても表示は続行
      setHighlightedXML(escapeHTML(xmlContent));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [xmlContent, onError]);

  // コピー機能
  const handleCopy = (): void => {
    if (navigator.clipboard && xmlContent) {
      navigator.clipboard
        .writeText(xmlContent)
        .then(() => {
          alert(t('xmlViewer.copySuccess'));
        })
        .catch((err: Error) => {
          console.error('❌ [XMLViewer] コピー失敗:', err);
          alert(t('xmlViewer.copyFailed'));
        });
    }
  };

  // ダウンロード機能
  const handleDownload = (): void => {
    if (!xmlContent) return;

    const blob = new Blob([xmlContent], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `maiml_export_${new Date().getTime()}.maiml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!xmlContent) {
    return (
      <div className="xml-viewer-empty">
        <div className="xml-viewer-empty-icon">📄</div>
        <div className="xml-viewer-empty-text">{t('xmlViewer.noContent')}</div>
      </div>
    );
  }

  return (
    <div className="xml-viewer-container">
      {/* ツールバー */}
      <div className="xml-viewer-toolbar">
        <div className="xml-viewer-info">
          <span className="xml-viewer-info-item">📊 {lineCount} {t('xmlViewer.lines')}</span>
          <span className="xml-viewer-info-item">
            📦 {(new Blob([xmlContent]).size / 1024).toFixed(2)} KB
          </span>
        </div>

        <div className="xml-viewer-actions">
          <button
            className="xml-viewer-btn"
            onClick={handleCopy}
            title={t('xmlViewer.copyTitle')}
          >
            📋 {t('xmlViewer.copyButton')}
          </button>
          <button
            className="xml-viewer-btn"
            onClick={handleDownload}
            title={t('xmlViewer.downloadTitle')}
          >
            💾 {t('xmlViewer.downloadButton')}
          </button>
        </div>
      </div>

      {/* エラー表示 */}
      {highlightErrors && parseError && (
        <div className="xml-viewer-error">
          <div className="xml-viewer-error-title">⚠️ {t('xmlViewer.parseErrorTitle')}</div>
          <div className="xml-viewer-error-message">{parseError}</div>
        </div>
      )}

      {/* XML表示エリア */}
      <div className="xml-viewer-content" style={{ maxHeight }}>
        {showLineNumbers && (
          <div className="xml-viewer-line-numbers">
            {Array.from({ length: lineCount }, (_, i) => (
              <div key={i + 1} className="xml-viewer-line-number">
                {i + 1}
              </div>
            ))}
          </div>
        )}

        <pre className="xml-viewer-code">
          <code
            className="xml-viewer-code-content"
            dangerouslySetInnerHTML={{ __html: highlightedXML }}
          />
        </pre>
      </div>
    </div>
  );
};

export default XMLViewer;
