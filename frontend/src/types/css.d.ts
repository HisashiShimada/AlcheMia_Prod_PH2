/**
 * CSSファイルの副作用インポート（import 'xxx.css'）に対する型宣言
 * TypeScript の `moduleResolution: "bundler"` では CSS副作用インポートの型宣言が必要
 */
declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}
