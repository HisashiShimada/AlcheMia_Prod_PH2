# staging-architecture-simple.drawio 修正メモ

## 修正対象
`docs/design/infrastructure/staging-architecture-simple.drawio`

---

## 修正1: prod-verification-alb（alb-pv）の説明追加

### 現状のラベル（value）
```
prod-verification-alb
HTTPS:443
(ALB / ACM証明書)
```

### 修正後のラベル（value）
```
prod-verification-alb
HTTPS:443 (ACM証明書)
mTLS不要・クライアント証明書不要
/* → prod-frontend-service:3000
/api/* → alchemia-backend-service:3001
```

### drawioのセル定義（修正箇所）
```xml
<!-- 変更前 -->
<mxCell id="alb-pv" value="prod-verification-alb&#xa;HTTPS:443&#xa;(ALB / ACM証明書)"
  style="shape=mxgraph.aws4.application_load_balancer;fillColor=#0066CC;strokeColor=none;fontColor=#ffffff;labelBackgroundColor=#ffffff;sketch=0;fontSize=10;verticalLabelPosition=bottom;verticalAlign=top;"
  parent="1" vertex="1">
    <mxGeometry x="1360" y="270" width="60" height="60" as="geometry"/>
</mxCell>

<!-- 変更後 -->
<mxCell id="alb-pv" value="prod-verification-alb&#xa;HTTPS:443 (ACM証明書)&#xa;mTLS不要・クライアント証明書不要&#xa;/* → prod-frontend-service:3000&#xa;/api/* → alchemia-backend-service:3001"
  style="shape=mxgraph.aws4.application_load_balancer;fillColor=#0066CC;strokeColor=none;fontColor=#ffffff;labelBackgroundColor=#ffffff;sketch=0;fontSize=10;verticalLabelPosition=bottom;verticalAlign=top;"
  parent="1" vertex="1">
    <mxGeometry x="1360" y="270" width="60" height="60" as="geometry"/>
</mxCell>
```

---

## 修正2: LBのサブネット配置を示す凡例注釈の追加

### 追加するセル（legend-lb-subnet）
既存の凡例（legend-staging, legend-pv）の右隣に追加する。

```xml
<mxCell id="legend-lb-subnet"
  value="【LB のサブネット配置について】&#xa;NLB / ALB / prod-verification-alb はいずれも Internet-facing。&#xa;public-1a (10.1.1.0/24) と public-1c (10.1.2.0/24) の&#xa;両パブリックサブネットにまたがって配置される（AWS要件: 最低2AZ）。"
  style="text;html=1;strokeColor=#666666;fillColor=#f5f5f5;fontColor=#333333;align=left;verticalAlign=top;whiteSpace=wrap;rounded=1;fontSize=10;"
  parent="1" vertex="1">
    <mxGeometry x="760" y="70" width="430" height="75" as="geometry"/>
</mxCell>
```

---

## 修正3: LB層エリアの視覚的表現（lb-area）

現状 nlb / alb / alb-pv はいずれも `parent="1"` で VPC・サブネットの外に描かれており、
どのサブネットにも属していないように見える。

AWS の仕様では ALB/NLB は **Internet-facing** の場合、
パブリックサブネット（今回は public-1a と public-1c の両方）に ENI が作成される。

この事実を図で表現するために、点線の「LB 層」エリアを VPC 内に追加する。

```xml
<mxCell id="lb-area"
  value="LB 層（Internet-facing / public-1a &amp; public-1c にまたがって配置）"
  style="rounded=1;whiteSpace=wrap;html=1;fillColor=#fff2cc;strokeColor=#d6b656;fontSize=10;fontStyle=1;verticalAlign=top;align=center;spacingTop=5;dashed=1;"
  parent="1" vertex="1">
    <mxGeometry x="140" y="250" width="1400" height="170" as="geometry"/>
</mxCell>
```

このセルを `vpc` セルの直後、`nlb` セルの直前に挿入する。

---

## 補足: ALB/NLBとサブネットの関係（AWS仕様）

| LB種別 | 配置場所 | 補足 |
|--------|----------|------|
| NLB (alchemia-staging-nlb) | public-1a + public-1c | TCP:443 パススルー、Internet-facing |
| ALB (alchemia-staging-alb) | public-1a + public-1c | HTTP:80、Internet-facing |
| prod-verification-alb | public-1a + public-1c | HTTPS:443、Internet-facing、ACM証明書 |

- AWS では ALB/NLB を作成する際に **最低2つのサブネット（異なるAZ）** の指定が必須
- 各サブネットに ENI（Elastic Network Interface）が作成される
- drawio 図では「サブネットの外」に LB アイコンを配置するレイアウトも一般的だが、
  「サブネットにまたがる」ことを表現する場合は点線エリアや注釈で補足するのがわかりやすい
