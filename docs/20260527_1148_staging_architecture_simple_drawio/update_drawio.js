const fs = require('fs');
const out = 'd:/workspace/git/mmdpf/docs/design/infrastructure/staging-architecture-simple.drawio';

const xml = `<mxfile host="65bd71144e">
    <diagram id="staging-unified" name="検証環境 統合システム構成図">
        <mxGraphModel dx="3328" dy="899" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1654" pageHeight="1169" math="0" shadow="0">
            <root>
                <mxCell id="0"/>
                <mxCell id="1" parent="0"/>
                <mxCell id="title" value="検証環境 AWSシステム構成図（alchemia-staging）" style="text;html=1;strokeColor=none;fillColor=none;align=center;verticalAlign=middle;whiteSpace=wrap;rounded=0;fontSize=18;fontStyle=1;" parent="1" vertex="1">
                    <mxGeometry x="200" y="20" width="1200" height="40" as="geometry"/>
                </mxCell>
                <mxCell id="legend-staging" value="【通常Staging構成】&#xa;NLB(TCP:443 パススルー) → nginx-service&#xa;ALB(HTTP:80 / ?orgId=) → nginx-service&#xa;nginx: SSL終端 / mTLS認証 / org_id抽出" style="text;html=1;strokeColor=#d79b00;fillColor=#ffe6cc;align=left;verticalAlign=top;whiteSpace=wrap;rounded=1;fontSize=10;" parent="1" vertex="1">
                    <mxGeometry x="20" y="70" width="340" height="75" as="geometry"/>
                </mxCell>
                <mxCell id="legend-pv" value="【本番検証構成 (prod-verification)】&#xa;prod-verification-alb(HTTPS:443) → prod-frontend-service&#xa;nginx / NLB / mTLS: なし&#xa;alchemia-backend-service は既存と共用" style="text;html=1;strokeColor=#0066CC;fillColor=#dae8fc;align=left;verticalAlign=top;whiteSpace=wrap;rounded=1;fontSize=10;" parent="1" vertex="1">
                    <mxGeometry x="370" y="70" width="380" height="75" as="geometry"/>
                </mxCell>
                <mxCell id="legend-lb-subnet" value="【LB のサブネット配置について】&#xa;NLB / ALB / prod-verification-alb はいずれも Internet-facing。&#xa;public-1a (10.1.1.0/24) と public-1c (10.1.2.0/24) の&#xa;両パブリックサブネットにまたがって配置される（AWS要件: 最低2AZ）。" style="text;html=1;strokeColor=#666666;fillColor=#f5f5f5;fontColor=#333333;align=left;verticalAlign=top;whiteSpace=wrap;rounded=1;fontSize=10;" parent="1" vertex="1">
                    <mxGeometry x="760" y="70" width="430" height="75" as="geometry"/>
                </mxCell>
                <mxCell id="user-https" value="ユーザー（mTLS）&#xa;クライアント証明書 .p12" style="shape=mxgraph.aws4.user;fillColor=#232F3E;strokeColor=none;fontColor=#232F3E;labelBackgroundColor=#ffffff;sketch=0;fontStyle=1;fontSize=10;verticalLabelPosition=bottom;verticalAlign=top;" parent="1" vertex="1">
                    <mxGeometry x="-30" y="180" width="50" height="50" as="geometry"/>
                </mxCell>
                <mxCell id="user-http" value="ユーザー&#xa;?orgId=クエリ" style="shape=mxgraph.aws4.user;fillColor=#232F3E;strokeColor=none;fontColor=#232F3E;labelBackgroundColor=#ffffff;sketch=0;fontStyle=1;fontSize=10;verticalLabelPosition=bottom;verticalAlign=top;" parent="1" vertex="1">
                    <mxGeometry x="-30" y="370" width="50" height="50" as="geometry"/>
                </mxCell>
                <mxCell id="user-pv" value="ユーザー&#xa;(prod-verification)" style="shape=mxgraph.aws4.user;fillColor=#232F3E;strokeColor=none;fontColor=#232F3E;labelBackgroundColor=#ffffff;sketch=0;fontStyle=1;fontSize=10;verticalLabelPosition=bottom;verticalAlign=top;" parent="1" vertex="1">
                    <mxGeometry x="1580" y="290" width="50" height="50" as="geometry"/>
                </mxCell>
                <mxCell id="aws-cloud" value="AWS Cloud (ap-northeast-1)" style="points=[[0,0],[0.25,0],[0.5,0],[0.75,0],[1,0],[1,0.25],[1,0.5],[1,0.75],[1,1],[0.75,1],[0.5,1],[0.25,1],[0,1],[0,0.75],[0,0.5],[0,0.25]];shape=mxgraph.aws4.group;grIcon=mxgraph.aws4.group_aws_cloud_alt;grStroke=0;strokeColor=#232F3E;fillColor=#ffffff;verticalAlign=top;align=center;spacingTop=25;fontColor=#232F3E;dashed=0;fontStyle=1;fontSize=12;" parent="1" vertex="1">
                    <mxGeometry x="100" y="170" width="1460" height="900" as="geometry"/>
                </mxCell>
                <mxCell id="vpc" value="VPC: alchemia-staging-vpc (10.1.0.0/16)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#f5f5f5;strokeColor=#666666;fontColor=#333333;fontStyle=1;fontSize=11;verticalAlign=top;align=center;spacingTop=5;" parent="1" vertex="1">
                    <mxGeometry x="120" y="210" width="1420" height="840" as="geometry"/>
                </mxCell>
                <mxCell id="lb-area" value="LB layer (Internet-facing / placed across public-1a and public-1c)" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#fff2cc;strokeColor=#d6b656;fontSize=10;fontStyle=1;verticalAlign=top;align=center;spacingTop=5;dashed=1;" parent="1" vertex="1">
                    <mxGeometry x="140" y="250" width="1400" height="170" as="geometry"/>
                </mxCell>
                <mxCell id="nlb" value="NLB&#xa;TCP:443&#xa;パススルー&#xa;(alchemia-staging-nlb)" style="shape=mxgraph.aws4.classic_load_balancer;fillColor=#8C4FFF;strokeColor=none;fontColor=#232F3E;labelBackgroundColor=#ffffff;sketch=0;fontSize=10;verticalLabelPosition=bottom;verticalAlign=top;" parent="1" vertex="1">
                    <mxGeometry x="200" y="270" width="60" height="60" as="geometry"/>
                </mxCell>
                <mxCell id="alb" value="ALB HTTP:80&#xa;?orgId=ルーティング&#xa;(alchemia-staging-alb)" style="shape=mxgraph.aws4.application_load_balancer;fillColor=#8C4FFF;strokeColor=none;fontColor=#232F3E;labelBackgroundColor=#ffffff;sketch=0;fontSize=10;verticalLabelPosition=bottom;verticalAlign=top;" parent="1" vertex="1">
                    <mxGeometry x="330" y="270" width="60" height="60" as="geometry"/>
                </mxCell>
                <mxCell id="alb-pv" value="prod-verification-alb&#xa;HTTPS:443 (ACM証明書)&#xa;mTLS不要・client cert不要&#xa;/* to prod-frontend-service:3000&#xa;/api/* to alchemia-backend-service:3001" style="shape=mxgraph.aws4.application_load_balancer;fillColor=#0066CC;strokeColor=none;fontColor=#232F3E;labelBackgroundColor=#ffffff;sketch=0;fontSize=10;verticalLabelPosition=bottom;verticalAlign=top;" parent="1" vertex="1">
                    <mxGeometry x="1360" y="270" width="60" height="60" as="geometry"/>
                </mxCell>
                <mxCell id="az-1a" value="AZ: ap-northeast-1a" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#f8cecc;strokeColor=#b85450;fontStyle=1;fontSize=10;verticalAlign=top;align=center;spacingTop=5;" parent="1" vertex="1">
                    <mxGeometry x="140" y="450" width="680" height="570" as="geometry"/>
                </mxCell>
                <mxCell id="az-1c" value="AZ: ap-northeast-1c" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;fontStyle=1;fontSize=10;verticalAlign=top;align=center;spacingTop=5;" parent="1" vertex="1">
                    <mxGeometry x="840" y="450" width="680" height="570" as="geometry"/>
                </mxCell>
                <mxCell id="pub-1a-label" value="■ public-1a (10.1.1.0/24) subnet-0c386da2db38952dc" style="text;html=1;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;whiteSpace=wrap;rounded=0;fontSize=9;fontColor=#006600;" parent="1" vertex="1">
                    <mxGeometry x="155" y="490" width="350" height="20" as="geometry"/>
                </mxCell>
                <mxCell id="pub-1c-label" value="■ public-1c (10.1.2.0/24) subnet-0388f1051ba7b98ce" style="text;html=1;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;whiteSpace=wrap;rounded=0;fontSize=9;fontColor=#006600;" parent="1" vertex="1">
                    <mxGeometry x="850" y="490" width="350" height="20" as="geometry"/>
                </mxCell>
                <mxCell id="nginx-service" value="ECS Fargate: alchemia-nginx-service【両AZにまたがる】&#xa;subnets: subnet-0c386da2db38952dc (1a) / subnet-0388f1051ba7b98ce (1c)&#xa;(Public Subnet / Fargate)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#ffe6cc;strokeColor=#d79b00;fontSize=10;fontStyle=1;verticalAlign=top;align=center;spacingTop=5;" parent="1" vertex="1">
                    <mxGeometry x="160" y="520" width="1340" height="120" as="geometry"/>
                </mxCell>
                <mxCell id="container-nginx" value="nginx コンテナ (443/80)&#xa;SSL終端 / mTLS / org_id抽出&#xa;/api/ → backend(SD)" style="shape=mxgraph.aws4.ecs;fillColor=#ED7100;strokeColor=none;fontColor=#232F3E;labelBackgroundColor=#ffffff;sketch=0;fontSize=9;verticalLabelPosition=bottom;verticalAlign=top;" parent="1" vertex="1">
                    <mxGeometry x="220" y="550" width="50" height="50" as="geometry"/>
                </mxCell>
                <mxCell id="container-frontend-nginx" value="frontend コンテナ (3000)&#xa;Next.js" style="shape=mxgraph.aws4.ecs;fillColor=#ED7100;strokeColor=none;fontColor=#232F3E;labelBackgroundColor=#ffffff;sketch=0;fontSize=9;verticalLabelPosition=bottom;verticalAlign=top;" parent="1" vertex="1">
                    <mxGeometry x="1390" y="550" width="50" height="50" as="geometry"/>
                </mxCell>
                <mxCell id="backend-service" value="ECS Fargate: alchemia-backend-service【両構成で共用 / 両AZにまたがる】&#xa;subnets: subnet-0c386da2db38952dc (1a) / subnet-0388f1051ba7b98ce (1c) ※nginxと同一&#xa;(Public Subnet / Fargate)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#ffe6cc;strokeColor=#d79b00;fontSize=10;fontStyle=1;verticalAlign=top;align=center;spacingTop=5;" parent="1" vertex="1">
                    <mxGeometry x="160" y="670" width="1340" height="120" as="geometry"/>
                </mxCell>
                <mxCell id="container-backend" value="backend コンテナ (3001)&#xa;Node.js / Express API" style="shape=mxgraph.aws4.ecs;fillColor=#ED7100;strokeColor=none;fontColor=#232F3E;labelBackgroundColor=#ffffff;sketch=0;fontSize=10;verticalLabelPosition=bottom;verticalAlign=top;" parent="1" vertex="1">
                    <mxGeometry x="820" y="700" width="50" height="50" as="geometry"/>
                </mxCell>
                <mxCell id="frontend-pv-service" value="ECS Fargate: prod-frontend-service【prod-verification専用 / 両AZにまたがる】&#xa;subnets: subnet-05b22a899314768b5 / subnet-048d49e3c1f98334c&#xa;(Public Subnet / Fargate)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#0066CC;fontSize=10;fontStyle=1;verticalAlign=top;align=center;spacingTop=5;" parent="1" vertex="1">
                    <mxGeometry x="160" y="820" width="1340" height="120" as="geometry"/>
                </mxCell>
                <mxCell id="container-frontend-pv" value="frontend コンテナ (3000)&#xa;Next.js" style="shape=mxgraph.aws4.ecs;fillColor=#0066CC;strokeColor=none;fontColor=#232F3E;labelBackgroundColor=#ffffff;sketch=0;fontSize=10;verticalLabelPosition=bottom;verticalAlign=top;" parent="1" vertex="1">
                    <mxGeometry x="820" y="850" width="50" height="50" as="geometry"/>
                </mxCell>
                <mxCell id="priv-1a" value="Private Subnet: alchemia-private-1a (10.1.11.0/24)" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;fontSize=10;fontStyle=1;verticalAlign=top;align=center;spacingTop=5;" parent="1" vertex="1">
                    <mxGeometry x="155" y="680" width="280" height="100" as="geometry"/>
                </mxCell>
                <mxCell id="aurora" value="Aurora PostgreSQL&#xa;alchemia-staging-aurora&#xa;(Primary / 共用)" style="shape=mxgraph.aws4.aurora;fillColor=#C7131F;strokeColor=none;fontColor=#232F3E;labelBackgroundColor=#ffffff;sketch=0;fontSize=10;verticalLabelPosition=bottom;verticalAlign=top;" parent="1" vertex="1">
                    <mxGeometry x="170" y="710" width="60" height="60" as="geometry"/>
                </mxCell>
                <mxCell id="redis" value="ElastiCache Redis&#xa;alchemia-staging-redis&#xa;(共用)" style="shape=mxgraph.aws4.elasticache;fillColor=#C7131F;strokeColor=none;fontColor=#232F3E;labelBackgroundColor=#ffffff;sketch=0;fontSize=10;verticalLabelPosition=bottom;verticalAlign=top;" parent="1" vertex="1">
                    <mxGeometry x="285" y="710" width="60" height="60" as="geometry"/>
                </mxCell>
                <mxCell id="sd-label" value="Service Discovery&#xa;alchemia-backend.alchemia.local" style="text;html=1;strokeColor=#6600CC;fillColor=#f3e8ff;align=center;verticalAlign=middle;whiteSpace=wrap;rounded=1;fontSize=9;" parent="1" vertex="1">
                    <mxGeometry x="600" y="640" width="230" height="40" as="geometry"/>
                </mxCell>
                <mxCell id="ext-area" value="外部 AWS サービス（IAM Role 経由）" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#e1d5e7;strokeColor=#9673a6;fontSize=10;fontStyle=1;verticalAlign=top;align=center;spacingTop=5;" parent="1" vertex="1">
                    <mxGeometry x="140" y="1060" width="1400" height="130" as="geometry"/>
                </mxCell>
                <mxCell id="s3" value="S3&#xa;mmdpf-files" style="shape=mxgraph.aws4.s3;fillColor=#3F8624;strokeColor=none;fontColor=#232F3E;labelBackgroundColor=#ffffff;sketch=0;fontSize=10;verticalLabelPosition=bottom;verticalAlign=top;" parent="1" vertex="1">
                    <mxGeometry x="200" y="1100" width="50" height="50" as="geometry"/>
                </mxCell>
                <mxCell id="bedrock-ext" value="Bedrock&#xa;AIモデル推論" style="shape=mxgraph.aws4.bedrock;fillColor=#01A88D;strokeColor=none;fontColor=#232F3E;labelBackgroundColor=#ffffff;sketch=0;fontSize=10;verticalLabelPosition=bottom;verticalAlign=top;" parent="1" vertex="1">
                    <mxGeometry x="530" y="1100" width="50" height="50" as="geometry"/>
                </mxCell>
                <mxCell id="ssm" value="SSM&#xa;Parameter Store&#xa;証明書格納" style="shape=mxgraph.aws4.systems_manager_parameter_store;fillColor=#E7157B;strokeColor=none;fontColor=#232F3E;labelBackgroundColor=#ffffff;sketch=0;fontSize=10;verticalLabelPosition=bottom;verticalAlign=top;" parent="1" vertex="1">
                    <mxGeometry x="850" y="1100" width="50" height="50" as="geometry"/>
                </mxCell>
                <mxCell id="ecr" value="ECR&#xa;コンテナイメージ&#xa;(stagingタグ)" style="shape=mxgraph.aws4.ecr;fillColor=#ED7100;strokeColor=none;fontColor=#232F3E;labelBackgroundColor=#ffffff;sketch=0;fontSize=10;verticalLabelPosition=bottom;verticalAlign=top;" parent="1" vertex="1">
                    <mxGeometry x="1200" y="1100" width="50" height="50" as="geometry"/>
                </mxCell>
                <mxCell id="e-user-nlb" value="HTTPS:443&#xa;クライアント証明書" style="edgeStyle=orthogonalEdgeStyle;rounded=0;strokeColor=#0000FF;fontColor=#0000FF;fontSize=9;" parent="1" source="user-https" target="nlb" edge="1">
                    <mxGeometry relative="1" as="geometry">
                        <Array as="points">
                            <mxPoint x="55" y="205"/>
                            <mxPoint x="55" y="300"/>
                        </Array>
                    </mxGeometry>
                </mxCell>
                <mxCell id="e-user-alb" value="HTTP:80 ?orgId=" style="edgeStyle=orthogonalEdgeStyle;rounded=0;strokeColor=#0066CC;fontColor=#0066CC;fontSize=9;" parent="1" source="user-http" target="alb" edge="1">
                    <mxGeometry relative="1" as="geometry">
                        <Array as="points">
                            <mxPoint x="55" y="395"/>
                            <mxPoint x="55" y="300"/>
                            <mxPoint x="300" y="300"/>
                        </Array>
                    </mxGeometry>
                </mxCell>
                <mxCell id="e-user-pv" value="HTTPS:443" style="edgeStyle=orthogonalEdgeStyle;rounded=0;strokeColor=#0066CC;fontColor=#0066CC;fontSize=9;" parent="1" source="user-pv" target="alb-pv" edge="1">
                    <mxGeometry relative="1" as="geometry">
                        <Array as="points">
                            <mxPoint x="1555" y="315"/>
                        </Array>
                    </mxGeometry>
                </mxCell>
                <mxCell id="e-nlb-nginx" value="TCP:443" style="edgeStyle=orthogonalEdgeStyle;rounded=0;strokeColor=#FF8000;fontColor=#FF8000;fontSize=9;" parent="1" source="nlb" target="nginx-service" edge="1">
                    <mxGeometry relative="1" as="geometry">
                        <Array as="points">
                            <mxPoint x="230" y="420"/>
                            <mxPoint x="230" y="520"/>
                        </Array>
                    </mxGeometry>
                </mxCell>
                <mxCell id="e-alb-nginx" value="HTTP:80" style="edgeStyle=orthogonalEdgeStyle;rounded=0;strokeColor=#FF8000;fontColor=#FF8000;fontSize=9;" parent="1" source="alb" target="nginx-service" edge="1">
                    <mxGeometry relative="1" as="geometry">
                        <Array as="points">
                            <mxPoint x="360" y="420"/>
                            <mxPoint x="360" y="520"/>
                        </Array>
                    </mxGeometry>
                </mxCell>
                <mxCell id="e-nginx-backend" value="TCP:3001&#xa;Service Discovery" style="edgeStyle=orthogonalEdgeStyle;rounded=0;strokeColor=#6600CC;fontColor=#6600CC;fontSize=9;" parent="1" source="nginx-service" target="backend-service" edge="1">
                    <mxGeometry relative="1" as="geometry">
                        <Array as="points">
                            <mxPoint x="830" y="640"/>
                            <mxPoint x="830" y="670"/>
                        </Array>
                    </mxGeometry>
                </mxCell>
                <mxCell id="e-pv-frontend" value="/* port:3000" style="edgeStyle=orthogonalEdgeStyle;rounded=0;strokeColor=#0066CC;fontColor=#0066CC;fontSize=9;" parent="1" source="alb-pv" target="frontend-pv-service" edge="1">
                    <mxGeometry relative="1" as="geometry">
                        <Array as="points">
                            <mxPoint x="1390" y="420"/>
                            <mxPoint x="1390" y="820"/>
                        </Array>
                    </mxGeometry>
                </mxCell>
                <mxCell id="e-pv-backend" value="/api/* port:3001" style="edgeStyle=orthogonalEdgeStyle;rounded=0;strokeColor=#d79b00;fontColor=#d79b00;fontSize=9;" parent="1" source="alb-pv" target="backend-service" edge="1">
                    <mxGeometry relative="1" as="geometry">
                        <Array as="points">
                            <mxPoint x="1420" y="400"/>
                            <mxPoint x="1510" y="400"/>
                            <mxPoint x="1510" y="730"/>
                            <mxPoint x="1500" y="730"/>
                        </Array>
                    </mxGeometry>
                </mxCell>
                <mxCell id="e-back-aurora" value="TCP:5432 (SSL)" style="edgeStyle=orthogonalEdgeStyle;rounded=0;strokeColor=#0066CC;fontColor=#0066CC;fontSize=9;" parent="1" source="backend-service" target="aurora" edge="1">
                    <mxGeometry relative="1" as="geometry">
                        <Array as="points">
                            <mxPoint x="200" y="670"/>
                            <mxPoint x="200" y="710"/>
                        </Array>
                    </mxGeometry>
                </mxCell>
                <mxCell id="e-back-redis" value="TCP:6379 (TLS)" style="edgeStyle=orthogonalEdgeStyle;rounded=0;strokeColor=#009900;fontColor=#009900;fontSize=9;" parent="1" source="backend-service" target="redis" edge="1">
                    <mxGeometry relative="1" as="geometry">
                        <Array as="points">
                            <mxPoint x="315" y="670"/>
                            <mxPoint x="315" y="710"/>
                        </Array>
                    </mxGeometry>
                </mxCell>
                <mxCell id="e-back-s3" value="IAM Role" style="edgeStyle=orthogonalEdgeStyle;rounded=0;strokeColor=#3F8624;fontColor=#3F8624;fontSize=9;dashed=1;" parent="1" source="backend-service" target="s3" edge="1">
                    <mxGeometry relative="1" as="geometry">
                        <Array as="points">
                            <mxPoint x="225" y="790"/>
                            <mxPoint x="225" y="1040"/>
                            <mxPoint x="225" y="1100"/>
                        </Array>
                    </mxGeometry>
                </mxCell>
                <mxCell id="e-back-bedrock" value="IAM Role" style="edgeStyle=orthogonalEdgeStyle;rounded=0;strokeColor=#01A88D;fontColor=#01A88D;fontSize=9;dashed=1;" parent="1" source="backend-service" target="bedrock-ext" edge="1">
                    <mxGeometry relative="1" as="geometry">
                        <Array as="points">
                            <mxPoint x="555" y="790"/>
                            <mxPoint x="555" y="1100"/>
                        </Array>
                    </mxGeometry>
                </mxCell>
                <mxCell id="e-back-ssm" value="IAM Role" style="edgeStyle=orthogonalEdgeStyle;rounded=0;strokeColor=#E7157B;fontColor=#E7157B;fontSize=9;dashed=1;" parent="1" source="backend-service" target="ssm" edge="1">
                    <mxGeometry relative="1" as="geometry">
                        <Array as="points">
                            <mxPoint x="875" y="790"/>
                            <mxPoint x="875" y="1100"/>
                        </Array>
                    </mxGeometry>
                </mxCell>
                <mxCell id="e-back-ecr" value="イメージ取得" style="edgeStyle=orthogonalEdgeStyle;rounded=0;strokeColor=#ED7100;fontColor=#ED7100;fontSize=9;dashed=1;" parent="1" source="backend-service" target="ecr" edge="1">
                    <mxGeometry relative="1" as="geometry">
                        <Array as="points">
                            <mxPoint x="1490" y="730"/>
                            <mxPoint x="1530" y="730"/>
                            <mxPoint x="1530" y="1050"/>
                            <mxPoint x="1225" y="1050"/>
                            <mxPoint x="1225" y="1100"/>
                        </Array>
                    </mxGeometry>
                </mxCell>
                <mxCell id="e-front-pv-ecr" value="イメージ取得" style="edgeStyle=orthogonalEdgeStyle;rounded=0;strokeColor=#ED7100;fontColor=#ED7100;fontSize=9;dashed=1;" parent="1" source="frontend-pv-service" target="ecr" edge="1">
                    <mxGeometry relative="1" as="geometry">
                        <Array as="points">
                            <mxPoint x="1490" y="880"/>
                            <mxPoint x="1530" y="880"/>
                            <mxPoint x="1530" y="1050"/>
                            <mxPoint x="1225" y="1050"/>
                            <mxPoint x="1225" y="1100"/>
                        </Array>
                    </mxGeometry>
                </mxCell>
            </root>
        </mxGraphModel>
    </diagram>
</mxfile>`;

fs.writeFileSync(out, xml, 'utf8');
console.log('Written:', out);
console.log('Size:', fs.statSync(out).size, 'bytes');
