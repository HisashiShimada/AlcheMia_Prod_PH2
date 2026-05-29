"""
オンプレミス版 mmdpf システム構成図 生成スクリプト
- Ubuntu サーバー 1台 + Docker Compose 構成
- nginx / frontend / backend / postgres / redis / swift / ollama
"""
import os

OUTPUT = os.path.join(os.path.dirname(__file__),
                      '../../docs/design/infrastructure/onprem-architecture.drawio')
OUTPUT = os.path.normpath(OUTPUT)

XML = """<mxfile host="65bd71144e">
    <diagram id="onprem-architecture" name="オンプレミス システム構成図">
        <mxGraphModel dx="2000" dy="1000" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1654" pageHeight="1169" math="0" shadow="0">
            <root>
                <mxCell id="0"/>
                <mxCell id="1" parent="0"/>

                <!-- タイトル -->
                <mxCell id="title" value="mmdpf オンプレミス システム構成図" style="text;html=1;strokeColor=none;fillColor=none;align=center;verticalAlign=middle;whiteSpace=wrap;rounded=0;fontSize=20;fontStyle=1;" parent="1" vertex="1">
                    <mxGeometry x="300" y="20" width="1000" height="45" as="geometry"/>
                </mxCell>

                <!-- ブラウザ（ユーザー） -->
                <mxCell id="browser" value="ブラウザ&#xa;（クライアント証明書 .p12）" style="shape=mxgraph.cisco.computers_and_peripherals.pc;fillColor=#dae8fc;strokeColor=#6c8ebf;fontStyle=1;fontSize=11;verticalLabelPosition=bottom;verticalAlign=top;" parent="1" vertex="1">
                    <mxGeometry x="50" y="380" width="70" height="70" as="geometry"/>
                </mxCell>

                <!-- オンプレミスサーバー 外枠 -->
                <mxCell id="server-box" value="オンプレミスサーバー（Ubuntu 20.04/22.04/24.04 LTS）&#xa;Docker Compose" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#f5f5f5;strokeColor=#666666;fontColor=#333333;fontStyle=1;fontSize=13;verticalAlign=top;align=center;spacingTop=8;" parent="1" vertex="1">
                    <mxGeometry x="200" y="150" width="1380" height="920" as="geometry"/>
                </mxCell>

                <!-- ===== nginx ===== -->
                <mxCell id="nginx" value="mmdpf-nginx&#xa;リバースプロキシ / mTLS クライアント証明書認証&#xa;ポート: 80 (HTTP), 443 (HTTPS)" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#ffe6cc;strokeColor=#d79b00;fontStyle=1;fontSize=11;verticalAlign=middle;align=center;" parent="1" vertex="1">
                    <mxGeometry x="530" y="260" width="560" height="80" as="geometry"/>
                </mxCell>

                <!-- ===== フロントエンド ===== -->
                <mxCell id="frontend" value="mmdpf-frontend&#xa;Next.js フロントエンド&#xa;ポート: 3000" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#d5e8d4;strokeColor=#82b366;fontStyle=1;fontSize=11;verticalAlign=middle;align=center;" parent="1" vertex="1">
                    <mxGeometry x="350" y="440" width="280" height="80" as="geometry"/>
                </mxCell>

                <!-- ===== バックエンド ===== -->
                <mxCell id="backend" value="mmdpf-backend&#xa;Node.js / Express API サーバー&#xa;ポート: 3001" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#d5e8d4;strokeColor=#82b366;fontStyle=1;fontSize=11;verticalAlign=middle;align=center;" parent="1" vertex="1">
                    <mxGeometry x="990" y="440" width="280" height="80" as="geometry"/>
                </mxCell>

                <!-- ===== データストア群 ===== -->
                <!-- postgres -->
                <mxCell id="postgres" value="mmdpf-postgres&#xa;PostgreSQL&#xa;データベース&#xa;ポート: 5432" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;fontStyle=1;fontSize=11;verticalAlign=middle;align=center;" parent="1" vertex="1">
                    <mxGeometry x="280" y="660" width="220" height="100" as="geometry"/>
                </mxCell>

                <!-- redis -->
                <mxCell id="redis" value="mmdpf-redis&#xa;Redis&#xa;セッションストア&#xa;ポート: 6379" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;fontStyle=1;fontSize=11;verticalAlign=middle;align=center;" parent="1" vertex="1">
                    <mxGeometry x="560" y="660" width="220" height="100" as="geometry"/>
                </mxCell>

                <!-- swift -->
                <mxCell id="swift" value="mmdpf-swift&#xa;OpenStack Swift&#xa;オブジェクトストレージ&#xa;ポート: 8080" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;fontStyle=1;fontSize=11;verticalAlign=middle;align=center;" parent="1" vertex="1">
                    <mxGeometry x="840" y="660" width="220" height="100" as="geometry"/>
                </mxCell>

                <!-- ollama -->
                <mxCell id="ollama" value="mmdpf-ollama&#xa;Ollama&#xa;AI Model Engine&#xa;（セマンティック検索）&#xa;ポート: 11434" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#e1d5e7;strokeColor=#9673a6;fontStyle=1;fontSize=11;verticalAlign=middle;align=center;" parent="1" vertex="1">
                    <mxGeometry x="1120" y="640" width="220" height="120" as="geometry"/>
                </mxCell>

                <!-- ===== SSL証明書 ===== -->
                <mxCell id="certs-box" value="SSL 証明書" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#fff2cc;strokeColor=#d6b656;fontStyle=1;fontSize=12;verticalAlign=top;align=center;spacingTop=5;" parent="1" vertex="1">
                    <mxGeometry x="1380" y="260" width="160" height="200" as="geometry"/>
                </mxCell>
                <mxCell id="cert-ca" value="CA 証明書&#xa;ca.crt / ca.key&#xa;（クライアント証明書検証）" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#fff2cc;strokeColor=#d6b656;fontSize=10;verticalAlign=middle;align=center;" parent="1" vertex="1">
                    <mxGeometry x="1390" y="295" width="140" height="65" as="geometry"/>
                </mxCell>
                <mxCell id="cert-server" value="サーバー証明書&#xa;server.crt / server.key&#xa;（HTTPS 終端）" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#fff2cc;strokeColor=#d6b656;fontSize=10;verticalAlign=middle;align=center;" parent="1" vertex="1">
                    <mxGeometry x="1390" y="375" width="140" height="65" as="geometry"/>
                </mxCell>

                <!-- ===== nginx 設定 ===== -->
                <mxCell id="nginx-config" value="nginx 設定&#xa;nginx.prod.conf&#xa;ssl.conf" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#f8cecc;strokeColor=#b85450;fontSize=10;verticalAlign=middle;align=center;" parent="1" vertex="1">
                    <mxGeometry x="1380" y="480" width="160" height="70" as="geometry"/>
                </mxCell>

                <!-- ===== DB マイグレーション ===== -->
                <mxCell id="migrations" value="DB マイグレーション&#xa;migrations/*.sql" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#f8cecc;strokeColor=#b85450;fontSize=10;verticalAlign=middle;align=center;" parent="1" vertex="1">
                    <mxGeometry x="1380" y="570" width="160" height="60" as="geometry"/>
                </mxCell>

                <!-- ===== 環境変数 ===== -->
                <mxCell id="envfile" value=".env&#xa;（DB/Redis/Swift/JWT&#xa;シークレット等）" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#f8cecc;strokeColor=#b85450;fontSize=10;verticalAlign=middle;align=center;" parent="1" vertex="1">
                    <mxGeometry x="1380" y="650" width="160" height="70" as="geometry"/>
                </mxCell>

                <!-- ===== docker-compose ===== -->
                <mxCell id="compose" value="docker-compose.prod.yml&#xa;（--profile onprem）" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#f8cecc;strokeColor=#b85450;fontSize=10;verticalAlign=middle;align=center;" parent="1" vertex="1">
                    <mxGeometry x="1380" y="740" width="160" height="60" as="geometry"/>
                </mxCell>

                <!-- ===== ポート開放メモ ===== -->
                <mxCell id="firewall-note" value="ファイアウォール（ufw）&#xa;開放ポート: 80/tcp, 443/tcp" style="text;html=1;strokeColor=#0066CC;fillColor=#dae8fc;align=left;verticalAlign=top;whiteSpace=wrap;rounded=1;fontSize=10;" parent="1" vertex="1">
                    <mxGeometry x="220" y="870" width="300" height="50" as="geometry"/>
                </mxCell>

                <!-- ===== サーバー要件メモ ===== -->
                <mxCell id="server-req" value="サーバー要件&#xa;OS: Ubuntu 20.04/22.04/24.04 LTS&#xa;CPU: 2コア以上 / メモリ: 8GB以上&#xa;ディスク: 20GB以上" style="text;html=1;strokeColor=#666666;fillColor=#f5f5f5;align=left;verticalAlign=top;whiteSpace=wrap;rounded=1;fontSize=10;" parent="1" vertex="1">
                    <mxGeometry x="600" y="870" width="360" height="60" as="geometry"/>
                </mxCell>

                <!-- ===== エッジ（接続線） ===== -->

                <!-- ブラウザ → nginx (HTTPS:443) -->
                <mxCell id="e-browser-nginx" value="HTTPS:443&#xa;クライアント証明書（mTLS）" style="edgeStyle=orthogonalEdgeStyle;rounded=0;strokeColor=#0066CC;fontColor=#0066CC;fontSize=10;fontStyle=1;" parent="1" source="browser" target="nginx" edge="1">
                    <mxGeometry relative="1" as="geometry">
                        <Array as="points">
                            <mxPoint x="120" y="415"/>
                            <mxPoint x="120" y="300"/>
                            <mxPoint x="530" y="300"/>
                        </Array>
                    </mxGeometry>
                </mxCell>

                <!-- nginx → frontend (/) -->
                <mxCell id="e-nginx-frontend" value="/ (HTTP:3000)" style="edgeStyle=orthogonalEdgeStyle;rounded=0;strokeColor=#82b366;fontColor=#82b366;fontSize=10;" parent="1" source="nginx" target="frontend" edge="1">
                    <mxGeometry relative="1" as="geometry">
                        <Array as="points">
                            <mxPoint x="650" y="340"/>
                            <mxPoint x="490" y="340"/>
                            <mxPoint x="490" y="440"/>
                        </Array>
                    </mxGeometry>
                </mxCell>

                <!-- nginx → backend (/api/) -->
                <mxCell id="e-nginx-backend" value="/api/ (HTTP:3001)" style="edgeStyle=orthogonalEdgeStyle;rounded=0;strokeColor=#82b366;fontColor=#82b366;fontSize=10;" parent="1" source="nginx" target="backend" edge="1">
                    <mxGeometry relative="1" as="geometry">
                        <Array as="points">
                            <mxPoint x="980" y="340"/>
                            <mxPoint x="1130" y="340"/>
                            <mxPoint x="1130" y="440"/>
                        </Array>
                    </mxGeometry>
                </mxCell>

                <!-- backend → postgres -->
                <mxCell id="e-backend-postgres" value="TCP:5432" style="edgeStyle=orthogonalEdgeStyle;rounded=0;strokeColor=#6c8ebf;fontColor=#6c8ebf;fontSize=10;" parent="1" source="backend" target="postgres" edge="1">
                    <mxGeometry relative="1" as="geometry">
                        <Array as="points">
                            <mxPoint x="1050" y="560"/>
                            <mxPoint x="1050" y="610"/>
                            <mxPoint x="390" y="610"/>
                            <mxPoint x="390" y="660"/>
                        </Array>
                    </mxGeometry>
                </mxCell>

                <!-- backend → redis -->
                <mxCell id="e-backend-redis" value="TCP:6379" style="edgeStyle=orthogonalEdgeStyle;rounded=0;strokeColor=#6c8ebf;fontColor=#6c8ebf;fontSize=10;" parent="1" source="backend" target="redis" edge="1">
                    <mxGeometry relative="1" as="geometry">
                        <Array as="points">
                            <mxPoint x="1080" y="560"/>
                            <mxPoint x="1080" y="620"/>
                            <mxPoint x="670" y="620"/>
                            <mxPoint x="670" y="660"/>
                        </Array>
                    </mxGeometry>
                </mxCell>

                <!-- backend → swift -->
                <mxCell id="e-backend-swift" value="HTTP:8080" style="edgeStyle=orthogonalEdgeStyle;rounded=0;strokeColor=#6c8ebf;fontColor=#6c8ebf;fontSize=10;" parent="1" source="backend" target="swift" edge="1">
                    <mxGeometry relative="1" as="geometry">
                        <Array as="points">
                            <mxPoint x="1110" y="560"/>
                            <mxPoint x="1110" y="630"/>
                            <mxPoint x="950" y="630"/>
                            <mxPoint x="950" y="660"/>
                        </Array>
                    </mxGeometry>
                </mxCell>

                <!-- backend → ollama -->
                <mxCell id="e-backend-ollama" value="HTTP:11434&#xa;（OLLAMA_HOST）" style="edgeStyle=orthogonalEdgeStyle;rounded=0;strokeColor=#9673a6;fontColor=#9673a6;fontSize=10;" parent="1" source="backend" target="ollama" edge="1">
                    <mxGeometry relative="1" as="geometry">
                        <Array as="points">
                            <mxPoint x="1230" y="560"/>
                            <mxPoint x="1230" y="640"/>
                        </Array>
                    </mxGeometry>
                </mxCell>

                <!-- nginx → certs -->
                <mxCell id="e-nginx-certs" value="参照" style="edgeStyle=orthogonalEdgeStyle;rounded=0;strokeColor=#d6b656;fontColor=#d6b656;fontSize=10;dashed=1;" parent="1" source="nginx" target="certs-box" edge="1">
                    <mxGeometry relative="1" as="geometry">
                        <Array as="points">
                            <mxPoint x="1090" y="300"/>
                            <mxPoint x="1380" y="300"/>
                        </Array>
                    </mxGeometry>
                </mxCell>

            </root>
        </mxGraphModel>
    </diagram>
</mxfile>
"""

with open(OUTPUT, 'w', encoding='utf-8') as f:
    f.write(XML)

size = os.path.getsize(OUTPUT)
print(f'Written: {OUTPUT}')
print(f'Size: {size} bytes')
