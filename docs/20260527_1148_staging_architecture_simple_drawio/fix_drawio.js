const fs = require('fs');
const p = 'D:/workspace/git/mmdpf/docs/design/infrastructure/staging-architecture-simple.drawio';
let c = fs.readFileSync(p, 'utf8');

// 修正2: legend-lb-subnet を user-https の前に追加
if (!c.includes('legend-lb-subnet')) {
  const lb = [
    '                <mxCell id="legend-lb-subnet" value="LB subnet note: NLB/ALB/prod-verification-alb are Internet-facing.&#xa;',
    'Placed across public-1a (10.1.1.0/24) and public-1c (10.1.2.0/24).&#xa;',
    '(AWS requires min 2 AZs for ALB/NLB)" ',
    'style="text;html=1;strokeColor=#666666;fillColor=#f5f5f5;fontColor=#333333;align=left;verticalAlign=top;whiteSpace=wrap;rounded=1;fontSize=10;" ',
    'parent="1" vertex="1">\n',
    '                    <mxGeometry x="760" y="70" width="430" height="75" as="geometry"/>\n',
    '                </mxCell>\n'
  ].join('');
  c = c.replace('                <mxCell id="user-https"', lb + '                <mxCell id="user-https"');
  console.log('legend-lb-subnet added');
} else {
  console.log('legend-lb-subnet already exists');
}

// 修正3: lb-area を nlb の前に追加
if (!c.includes('lb-area')) {
  const la = [
    '                <mxCell id="lb-area" value="LB layer (Internet-facing / placed across public-1a and public-1c)" ',
    'style="rounded=1;whiteSpace=wrap;html=1;fillColor=#fff2cc;strokeColor=#d6b656;fontSize=10;fontStyle=1;verticalAlign=top;align=center;spacingTop=5;dashed=1;" ',
    'parent="1" vertex="1">\n',
    '                    <mxGeometry x="140" y="250" width="1400" height="170" as="geometry"/>\n',
    '                </mxCell>\n'
  ].join('');
  c = c.replace('                <mxCell id="nlb"', la + '                <mxCell id="nlb"');
  console.log('lb-area added');
} else {
  console.log('lb-area already exists');
}

fs.writeFileSync(p, c, 'utf8');
console.log('done');
