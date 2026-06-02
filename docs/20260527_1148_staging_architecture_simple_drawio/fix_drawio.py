import sys

path = r'D:\workspace\git\mmdpf\docs\design\infrastructure\staging-architecture-simple.drawio'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 修正1: alb-pv ラベル更新
old1 = 'prod-verification-alb&#xa;HTTPS:443&#xa;(ALB / ACM証明書)'
new1 = 'prod-verification-alb&#xa;HTTPS:443 (ACM証明書)&#xa;mTLS不要・クライアント証明書不要&#xa;/* → prod-frontend-service:3000&#xa;/api/* → alchemia-backend-service:3001'
if old1 in content:
    content = content.replace(old1, new1)
    print('修正1: alb-pv ラベル更新 OK')
else:
    print('修正1: 対象文字列が見つかりません', file=sys.stderr)

# 修正2: legend-lb-subnet を user-https の前に追加（重複防止チェック付き）
if 'legend-lb-subnet' not in content:
    legend_lb = (
        '                <mxCell id="legend-lb-subnet" value="【LB のサブネット配置について】'
        '&#xa;NLB / ALB / prod-verification-alb はいずれも Internet-facing。'
        '&#xa;public-1a (10.1.1.0/24) と public-1c (10.1.2.0/24) の'
        '&#xa;両パブリックサブネットにまたがって配置される（AWS要件: 最低2AZ）。"'
        ' style="text;html=1;strokeColor=#666666;fillColor=#f5f5f5;fontColor=#333333;'
        'align=left;verticalAlign=top;whiteSpace=wrap;rounded=1;fontSize=10;"'
        ' parent="1" vertex="1">\n'
        '                    <mxGeometry x="760" y="70" width="430" height="75" as="geometry"/>\n'
        '                </mxCell>\n'
    )
    marker = '                <mxCell id="user-https"'
    content = content.replace(marker, legend_lb + marker, 1)
    print('修正2: legend-lb-subnet 追加 OK')
else:
    print('修正2: legend-lb-subnet は既に存在します')

# 修正3: lb-area を nlb の前に追加（重複防止チェック付き）
if 'lb-area' not in content:
    lb_area = (
        '                <mxCell id="lb-area" value="LB 層（Internet-facing / public-1a &amp; public-1c にまたがって配置）"'
        ' style="rounded=1;whiteSpace=wrap;html=1;fillColor=#fff2cc;strokeColor=#d6b656;'
        'fontSize=10;fontStyle=1;verticalAlign=top;align=center;spacingTop=5;dashed=1;"'
        ' parent="1" vertex="1">\n'
        '                    <mxGeometry x="140" y="250" width="1400" height="170" as="geometry"/>\n'
        '                </mxCell>\n'
    )
    marker2 = '                <mxCell id="nlb"'
    content = content.replace(marker2, lb_area + marker2, 1)
    print('修正3: lb-area 追加 OK')
else:
    print('修正3: lb-area は既に存在します')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print('ファイル書き込み完了')
