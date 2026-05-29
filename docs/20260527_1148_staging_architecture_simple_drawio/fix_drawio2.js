const fs = require('fs');
const p = 'D:/workspace/git/mmdpf/docs/design/infrastructure/staging-architecture-simple.drawio';
let c = fs.readFileSync(p, 'utf8');

// alb-pv の fontColor を白(#ffffff)から黒(#232F3E)に変更
const before = 'id="alb-pv" value="prod-verification-alb&#xa;HTTPS:443 (ACM\u8a3c\u660e\u66f8)&#xa;mTLS\u4e0d\u8981\u30fbclient cert\u4e0d\u8981&#xa;/* to prod-frontend-service:3000&#xa;/api/* to alchemia-backend-service:3001" style="shape=mxgraph.aws4.application_load_balancer;fillColor=#0066CC;strokeColor=none;fontColor=#ffffff;';
const after  = 'id="alb-pv" value="prod-verification-alb&#xa;HTTPS:443 (ACM\u8a3c\u660e\u66f8)&#xa;mTLS\u4e0d\u8981\u30fbclient cert\u4e0d\u8981&#xa;/* to prod-frontend-service:3000&#xa;/api/* to alchemia-backend-service:3001" style="shape=mxgraph.aws4.application_load_balancer;fillColor=#0066CC;strokeColor=none;fontColor=#232F3E;';

if (c.includes(before)) {
  c = c.replace(before, after);
  console.log('fontColor changed to #232F3E');
} else {
  // フォールバック: fontColor=#ffffff の部分だけ alb-pv セル内で置換
  const re = /(id="alb-pv"[^>]*fontColor=#)ffffff/;
  if (re.test(c)) {
    c = c.replace(re, '$1232F3E');
    console.log('fontColor changed via regex');
  } else {
    console.log('target not found');
  }
}

fs.writeFileSync(p, c, 'utf8');
console.log('done');
