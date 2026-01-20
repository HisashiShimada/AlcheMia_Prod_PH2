import React from 'react';
import FormPatternsDemo from '@/components/demo/FormPatternsDemo';

export const metadata = {
  title: 'フォーム管理パターン | UIデモ',
  description: 'form_policy.md に基づいたフォーム管理の4つの標準パターンのデモ',
};

/**
 * フォーム管理パターンのデモページ
 * 
 * このページでは以下のパターンを確認できます：
 * 1. パターン1: 基本フォーム（labelCol: 6, wrapperCol: 18）
 * 2. パターン2: コンパクトフォーム（labelCol: 8, wrapperCol: 16）
 * 3. パターン3: 縦配置フォーム（layout: vertical）
 * 4. パターン4: インラインフォーム（layout: inline）
 * 
 * また、以下の使用例も含まれます：
 * - モーダル内フォーム
 * - ドロワー内フォーム
 * - バリデーション状態の表示
 * - 複雑なフォームの構成例
 * 
 * @see docs/design/ui/form_policy.md
 */
export default function FormPatternsPage() {
  return <FormPatternsDemo />;
}
