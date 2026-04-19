## 2. 事前確認

### 1.1 既存環境の情報収集

- `subnets`
  - subnet-0c386da2db38952dc
  - subnet-0388f1051ba7b98ce
- `securityGroups` 
  - sg-08569630d4e399b60
- `taskDefinition` 
  - arn:aws:ecs:ap-northeast-1:137068252939:task-definition/alchemia-nginx:9
  
### 1.2 VPC IDの確認

- `VpcId`
  - subnet-0c386da2db38952dc : vpc-037a0cb50e47092a0
  - subnet-0388f1051ba7b98ce : vpc-037a0cb50e47092a0

※同じもの

### 1.3 現在のロードバランサーの種類確認

"Type": "application"

## 2. フェーズ1: ALBとNLBの共存構成

### Step 1: NLBの作成

[実行結果](#Step-1:-NLBの作成-実行結果①)

[実行結果](#Step-1:-NLBの作成-実行結果②)  
NLB
- ARN
  - arn:aws:elasticloadbalancing:ap-northeast-1:137068252939:loadbalancer/net/alchemia-staging-nlb/0fd64d466d1b557b
- DNS
  - alchemia-staging-nlb-0fd64d466d1b557b.elb.ap-northeast-1.amazonaws.com

### Step 2: TCP:443 用ターゲットグループの作成

- arn
  - arn:aws:elasticloadbalancing:ap-northeast-1:137068252939:targetgroup/alchemia-nginx-tg-tcp443/8e711b39e6bc198f

### Step 3: NLBにリスナー（TCP:443）を追加

### Step 4: ECSタスクのSGにTCP:443のインバウンドを追加

### Step 5: HTTPS用 ECSサービスを新規作成

### Step 6: デプロイスクリプトの切り替え

### Step 7: 動作確認





## 実行結果

### Step 1: NLBの作成 実行結果①
```
[ec2-user@ip-10-1-11-44 Alchemia_Staging]$ aws elbv2 create-load-balancer \
  --name alchemia-staging-nlb \
  --type network \
  --scheme internet-facing \
  --subnets subnet-0c386da2db38952dc subnet-0388f1051ba7b98ce \
  --region ap-northeast-1
{
    "LoadBalancers": [
        {
            "LoadBalancerArn": "arn:aws:elasticloadbalancing:ap-northeast-1:137068252939:loadbalancer/net/alchemia-staging-nlb/0fd64d466d1b557b",
            "DNSName": "alchemia-staging-nlb-0fd64d466d1b557b.elb.ap-northeast-1.amazonaws.com",
            "CanonicalHostedZoneId": "Z31USIVHYNEOWT",
            "CreatedTime": "2026-04-16T08:51:23.329000+00:00",
            "LoadBalancerName": "alchemia-staging-nlb",
            "Scheme": "internet-facing",
            "VpcId": "vpc-037a0cb50e47092a0",
            "State": {
                "Code": "provisioning"
            },
            "Type": "network",
            "AvailabilityZones": [
                {
                    "ZoneName": "ap-northeast-1a",
                    "SubnetId": "subnet-0c386da2db38952dc",
                    "LoadBalancerAddresses": []
                },
                {
                    "ZoneName": "ap-northeast-1c",
                    "SubnetId": "subnet-0388f1051ba7b98ce",
                    "LoadBalancerAddresses": []
                }
            ],
            "IpAddressType": "ipv4",
            "EnablePrefixForIpv6SourceNat": "off"
        }
    ]
}
```

### Step 1: NLBの作成 実行結果②
```
[ec2-user@ip-10-1-11-44 Alchemia_Staging]$ aws elbv2 describe-load-balancers \
  --names alchemia-staging-nlb \
  --region ap-northeast-1 \
  --query 'LoadBalancers[0].{ARN:LoadBalancerArn,DNS:DNSName}'
{
    "ARN": "arn:aws:elasticloadbalancing:ap-northeast-1:137068252939:loadbalancer/net/alchemia-staging-nlb/0fd64d466d1b557b",
    "DNS": "alchemia-staging-nlb-0fd64d466d1b557b.elb.ap-northeast-1.amazonaws.com"
}
```

### Step 2: TCP:443 用ターゲットグループの作成 実行結果
```
[ec2-user@ip-10-1-11-44 Alchemia_Staging]$ aws elbv2 create-target-group \
  --name alchemia-nginx-tg-tcp443 \
  --protocol TCP \
  --port 443 \
  --vpc-id vpc-037a0cb50e47092a0 \
  --target-type ip \
  --health-check-protocol TCP \
  --health-check-port 80 \
  --health-check-interval-seconds 30 \
  --healthy-threshold-count 3 \
  --unhealthy-threshold-count 3 \
  --region ap-northeast-1
{
    "TargetGroups": [
        {
            "TargetGroupArn": "arn:aws:elasticloadbalancing:ap-northeast-1:137068252939:targetgroup/alchemia-nginx-tg-tcp443/8e711b39e6bc198f",
            "TargetGroupName": "alchemia-nginx-tg-tcp443",
            "Protocol": "TCP",
            "Port": 443,
            "VpcId": "vpc-037a0cb50e47092a0",
            "HealthCheckProtocol": "TCP",
            "HealthCheckPort": "80",
            "HealthCheckEnabled": true,
            "HealthCheckIntervalSeconds": 30,
            "HealthCheckTimeoutSeconds": 10,
            "HealthyThresholdCount": 3,
            "UnhealthyThresholdCount": 3,
            "TargetType": "ip",
            "IpAddressType": "ipv4"
        }
    ]
}
[ec2-user@ip-10-1-11-44 Alchemia_Staging]$ aws elbv2 describe-target-groups \
  --names alchemia-nginx-tg-tcp443 \
  --region ap-northeast-1 \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text
arn:aws:elasticloadbalancing:ap-northeast-1:137068252939:targetgroup/alchemia-nginx-tg-tcp443/8e711b39e6bc198f
[ec2-user@ip-10-1-11-44 Alchemia_Staging]$
```

### Step 3: NLBにリスナー（TCP:443）を追加 実行結果
```
[ec2-user@ip-10-1-11-44 Alchemia_Staging]$ NLB_ARN=$(aws elbv2 describe-load-balancers \
  --names alchemia-staging-nlb \
  --region ap-northeast-1 \
  --query 'LoadBalancers[0].LoadBalancerArn' \
  --output text)
[ec2-user@ip-10-1-11-44 Alchemia_Staging]$ TG_ARN_443=$(aws elbv2 describe-target-groups \
  --names alchemia-nginx-tg-tcp443 \
  --region ap-northeast-1 \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text)
[ec2-user@ip-10-1-11-44 Alchemia_Staging]$ aws elbv2 create-listener \
  --load-balancer-arn $NLB_ARN \
  --protocol TCP \
  --port 443 \
  --default-actions Type=forward,TargetGroupArn=$TG_ARN_443 \
  --region ap-northeast-1
{
    "Listeners": [
        {
            "ListenerArn": "arn:aws:elasticloadbalancing:ap-northeast-1:137068252939:listener/net/alchemia-staging-nlb/0fd64d466d1b557b/71357f8de05332a6",
            "LoadBalancerArn": "arn:aws:elasticloadbalancing:ap-northeast-1:137068252939:loadbalancer/net/alchemia-staging-nlb/0fd64d466d1b557b",
            "Port": 443,
            "Protocol": "TCP",
            "DefaultActions": [
                {
                    "Type": "forward",
                    "TargetGroupArn": "arn:aws:elasticloadbalancing:ap-northeast-1:137068252939:targetgroup/alchemia-nginx-tg-tcp443/8e711b39e6bc198f",
                    "ForwardConfig": {
                        "TargetGroups": [
                            {
                                "TargetGroupArn": "arn:aws:elasticloadbalancing:ap-northeast-1:137068252939:targetgroup/alchemia-nginx-tg-tcp443/8e711b39e6bc198f"
                            }
                        ],
                        "TargetGroupStickinessConfig": {
                            "Enabled": false
                        }
                    }
                }
            ]
        }
    ]
}
[ec2-user@ip-10-1-11-44 Alchemia_Staging]$
```

### Step 4: ECSタスクのSGにTCP:443のインバウンドを追加 実行結果
```
[ec2-user@ip-10-1-11-44 Alchemia_Staging]$ aws ec2 authorize-security-group-ingress \
  --group-id $ECS_SG_ID \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0 \
  --region ap-northeast-1
{
    "Return": true,
    "SecurityGroupRules": [
        {
            "SecurityGroupRuleId": "sgr-07886bbbc4172de7a",
            "GroupId": "sg-08569630d4e399b60",
            "GroupOwnerId": "137068252939",
            "IsEgress": false,
            "IpProtocol": "tcp",
            "FromPort": 443,
            "ToPort": 443,
            "CidrIpv4": "0.0.0.0/0",
            "SecurityGroupRuleArn": "arn:aws:ec2:ap-northeast-1:137068252939:security-group-rule/sgr-07886bbbc4172de7a"
        }
    ]
}
[ec2-user@ip-10-1-11-44 Alchemia_Staging]$ aws ec2 describe-security-groups \
  --group-ids $ECS_SG_ID \
  --region ap-northeast-1 \
  --query 'SecurityGroups[0].IpPermissions[?FromPort==`443`]'
[
    {
        "IpProtocol": "tcp",
        "FromPort": 443,
        "ToPort": 443,
        "UserIdGroupPairs": [
            {
                "UserId": "137068252939",
                "GroupId": "sg-0b315366936dbbf03"
            }
        ],
        "IpRanges": [
            {
                "CidrIp": "0.0.0.0/0"
            }
        ],
        "Ipv6Ranges": [],
        "PrefixListIds": []
    }
]
[ec2-user@ip-10-1-11-44 Alchemia_Staging]$
```

### Step 5: HTTPS用 ECSサービスを新規作成 実行結果
```
[ec2-user@ip-10-1-11-44 Alchemia_Staging]$ SUBNET1=subnet-0c386da2db38952dc
[ec2-user@ip-10-1-11-44 Alchemia_Staging]$ SUBNET2=subnet-0388f1051ba7b98ce
[ec2-user@ip-10-1-11-44 Alchemia_Staging]$ SG_ID=sg-08569630d4e399b60
[ec2-user@ip-10-1-11-44 Alchemia_Staging]$ TG_ARN_443=arn:aws:elasticloadbalancing:ap-northeast-1:137068252939:targetgroup/alchemia-nginx-tg-tcp443/8e711b39e6bc198f
[ec2-user@ip-10-1-11-44 Alchemia_Staging]$ TASK_DEF=$(aws ecs describe-task-definition \
  --task-definition alchemia-nginx \
  --region ap-northeast-1 \
  --query 'taskDefinition.taskDefinitionArn' \
  --output text)
[ec2-user@ip-10-1-11-44 Alchemia_Staging]$ echo "使用するタスク定義: $TASK_DEF"
使用するタスク定義: arn:aws:ecs:ap-northeast-1:137068252939:task-definition/alchemia-nginx:9
[ec2-user@ip-10-1-11-44 Alchemia_Staging]$ aws ecs create-service \
  --cluster alchemia-staging \
  --service-name alchemia-nginx-service-https \
  --task-definition alchemia-nginx \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNET1,$SUBNET2],securityGroups=[$SG_ID],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=$TG_ARN_443,containerName=mmdpf-nginx,containerPort=443" \
  --health-check-grace-period-seconds 120 \
  --region ap-northeast-1
{
    "service": {
        "serviceArn": "arn:aws:ecs:ap-northeast-1:137068252939:service/alchemia-staging/alchemia-nginx-service-https",
        "serviceName": "alchemia-nginx-service-https",
        "clusterArn": "arn:aws:ecs:ap-northeast-1:137068252939:cluster/alchemia-staging",
        "loadBalancers": [
            {
                "targetGroupArn": "arn:aws:elasticloadbalancing:ap-northeast-1:137068252939:targetgroup/alchemia-nginx-tg-tcp443/8e711b39e6bc198f",
                "containerName": "mmdpf-nginx",
                "containerPort": 443
            }
        ],
        "serviceRegistries": [],
        "status": "ACTIVE",
        "desiredCount": 1,
        "runningCount": 0,
        "pendingCount": 0,
        "launchType": "FARGATE",
        "platformVersion": "LATEST",
        "platformFamily": "Linux",
        "taskDefinition": "arn:aws:ecs:ap-northeast-1:137068252939:task-definition/alchemia-nginx:9",
        "deploymentConfiguration": {
            "deploymentCircuitBreaker": {
                "enable": false,
                "rollback": false
            },
            "maximumPercent": 200,
            "minimumHealthyPercent": 100,
            "strategy": "ROLLING",
            "bakeTimeInMinutes": 0
        },
        "deployments": [
            {
                "id": "ecs-svc/6660109057682729089",
                "status": "PRIMARY",
                "taskDefinition": "arn:aws:ecs:ap-northeast-1:137068252939:task-definition/alchemia-nginx:9",
                "desiredCount": 0,
                "pendingCount": 0,
                "runningCount": 0,
                "failedTasks": 0,
                "createdAt": "2026-04-16T09:13:31.843000+00:00",
                "updatedAt": "2026-04-16T09:13:31.843000+00:00",
                "launchType": "FARGATE",
                "platformVersion": "1.4.0",
                "platformFamily": "Linux",
                "networkConfiguration": {
                    "awsvpcConfiguration": {
                        "subnets": [
                            "subnet-0c386da2db38952dc",
                            "subnet-0388f1051ba7b98ce"
                        ],
                        "securityGroups": [
                            "sg-08569630d4e399b60"
                        ],
                        "assignPublicIp": "ENABLED"
                    }
                },
                "rolloutState": "IN_PROGRESS",
                "rolloutStateReason": "ECS deployment ecs-svc/6660109057682729089 in progress."
            }
        ],
        "roleArn": "arn:aws:iam::137068252939:role/aws-service-role/ecs.amazonaws.com/AWSServiceRoleForECS",
        "events": [],
        "createdAt": "2026-04-16T09:13:31.843000+00:00",
        "currentServiceRevisions": [
            {
                "arn": "arn:aws:ecs:ap-northeast-1:137068252939:service-revision/alchemia-staging/alchemia-nginx-service-https/6660109057682729089",
                "requestedTaskCount": 0,
                "runningTaskCount": 0,
                "pendingTaskCount": 0
            }
        ],
        "placementConstraints": [],
        "placementStrategy": [],
        "networkConfiguration": {
            "awsvpcConfiguration": {
                "subnets": [
                    "subnet-0c386da2db38952dc",
                    "subnet-0388f1051ba7b98ce"
                ],
                "securityGroups": [
                    "sg-08569630d4e399b60"
                ],
                "assignPublicIp": "ENABLED"
            }
        },
        "healthCheckGracePeriodSeconds": 120,
        "schedulingStrategy": "REPLICA",
        "deploymentController": {
            "type": "ECS"
        },
        "createdBy": "arn:aws:iam::137068252939:user/99999_AISol-Admin",
        "enableECSManagedTags": false,
        "propagateTags": "NONE",
        "enableExecuteCommand": false,
        "availabilityZoneRebalancing": "ENABLED",
        "resourceManagementType": "CUSTOMER"
    }
}
[ec2-user@ip-10-1-11-44 Alchemia_Staging]$
```