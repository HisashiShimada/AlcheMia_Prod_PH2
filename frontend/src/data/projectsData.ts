import {
  ProjectData,
} from '@/types/experimentWorker';

export const projectsData: Record<string, ProjectData> = {
  "project_001": {
    "projectId": "project_001",
    "projectName": "高温材料特性評価実験",
    "fileName": "experiment_workflow_v2.maiml",
    "workAssignment": {
      "workId": "work_001",
      "fileKey": "org_maiml_lab_001/projects/proj_001/files/experiment_workflow_v2.maiml",
      "fileName": "experiment_workflow_v2.maiml",
      "assignedBy": {
        "userId": "manager_001",
        "userName": "山田太郎",
        "role": "Manager"
      },
      "assignedAt": "2024-12-05T10:30:00Z",
      "confirmedAt": null,
      "status": "assigned"
    },
    "instructions": [
      {
        "instructionId": "inst_001",
        "targetType": "file",
        "content": "この実験は高温環境での材料特性評価を行います。実験開始前に必ず保護具（耐熱手袋、保護メガネ）を着用してください。実験室の温度が25℃以上の場合は、冷房を稼働させて室温を調整してください。",
        "priority": "high",
        "instructionType": "safety",
        "createdAt": "2024-12-05T10:00:00Z",
        "updatedAt": null,
        "createdBy": {
          "userId": "manager_001",
          "userName": "山田太郎"
        },
        "isRead": false
      },
      {
        "instructionId": "inst_002",
        "targetType": "file",
        "content": "実験データは測定ごとに必ず保存してください。データの欠損があると再実験が必要になります。測定値の異常を発見した場合は、すぐに管理者に報告してください。",
        "priority": "high",
        "instructionType": "general",
        "createdAt": "2024-12-05T10:05:00Z",
        "updatedAt": null,
        "createdBy": {
          "userId": "manager_001",
          "userName": "山田太郎"
        },
        "isRead": false
      },
      {
        "instructionId": "inst_003",
        "targetType": "file",
        "content": "実験終了後は必ず機器の電源を切り、試料を適切に保管してください。廃液は指定の容器に入れて廃棄物置き場に移動させてください。",
        "priority": "medium",
        "instructionType": "cleanup",
        "createdAt": "2024-12-05T10:10:00Z",
        "updatedAt": null,
        "createdBy": {
          "userId": "manager_001",
          "userName": "山田太郎"
        },
        "isRead": true
      },
      {
        "instructionId": "inst_004",
        "targetType": "transition",
        "transitionId": "t001",
        "transitionName": "サンプル準備",
        "content": "サンプルは実験開始の30分前に冷蔵庫から取り出し、室温に戻してから使用してください。サンプルの重量は±0.1gの精度で測定してください。",
        "priority": "high",
        "instructionType": "setup",
        "createdAt": "2024-12-05T10:15:00Z",
        "updatedAt": "2024-12-05T14:20:00Z",
        "createdBy": {
          "userId": "manager_001",
          "userName": "山田太郎"
        },
        "isRead": false
      },
      {
        "instructionId": "inst_005",
        "targetType": "transition",
        "transitionId": "t002",
        "transitionName": "温度設定",
        "content": "加熱炉の温度は100℃に設定してください。温度が安定するまで約15分かかります。温度が設定値に達したことを確認してから次のステップに進んでください。",
        "priority": "high",
        "instructionType": "setup",
        "createdAt": "2024-12-05T10:20:00Z",
        "updatedAt": null,
        "createdBy": {
          "userId": "manager_001",
          "userName": "山田太郎"
        },
        "isRead": false
      },
      {
        "instructionId": "inst_006",
        "targetType": "transition",
        "transitionId": "t003",
        "transitionName": "データ測定",
        "content": "測定は5分間隔で実施してください。各測定値をExcelシートに記録し、異常値があれば赤色でマークしてください。測定中は加熱炉のドアを開けないでください。",
        "priority": "medium",
        "instructionType": "measurement",
        "createdAt": "2024-12-05T10:25:00Z",
        "updatedAt": null,
        "createdBy": {
          "userId": "manager_001",
          "userName": "山田太郎"
        },
        "isRead": false
      },
      {
        "instructionId": "inst_007",
        "targetType": "method",
        "methodId": "m001",
        "methodName": "温度キャリブレーション",
        "content": "加熱炉の温度計が正確であることを確認してください。標準温度計と比較し、誤差が±2℃以内であることを確認します。誤差が大きい場合は管理者に報告してください。",
        "priority": "high",
        "instructionType": "setup",
        "createdAt": "2024-12-05T10:30:00Z",
        "updatedAt": null,
        "createdBy": {
          "userId": "manager_001",
          "userName": "山田太郎"
        },
        "isRead": false
      },
      {
        "instructionId": "inst_008",
        "targetType": "method",
        "methodId": "m002",
        "methodName": "サンプル重量測定",
        "content": "精密天秤を使用してサンプルの重量を測定します。測定前に天秤のゼロ点調整を必ず実施してください。重量は小数点以下2桁まで記録してください。",
        "priority": "medium",
        "instructionType": "measurement",
        "createdAt": "2024-12-05T10:35:00Z",
        "updatedAt": null,
        "createdBy": {
          "userId": "manager_001",
          "userName": "山田太郎"
        },
        "isRead": false
      },
      {
        "instructionId": "inst_009",
        "targetType": "method",
        "methodId": "m003",
        "methodName": "データバックアップ",
        "content": "測定データは実験終了後、必ず共有フォルダとローカルPCの両方に保存してください。ファイル名は「YYYYMMDD_実験名_作業者名.xlsx」の形式で保存してください。",
        "priority": "high",
        "instructionType": "general",
        "createdAt": "2024-12-05T10:40:00Z",
        "updatedAt": null,
        "createdBy": {
          "userId": "manager_001",
          "userName": "山田太郎"
        },
        "isRead": false
      },
      {
        "instructionId": "inst_010",
        "targetType": "method",
        "methodId": "m004",
        "methodName": "機器クリーニング",
        "content": "実験終了後、加熱炉内部を柔らかい布で拭き取ってください。残留物がある場合はアルコールを使用して除去してください。クリーニング後は必ず乾燥させてから次の実験に使用してください。",
        "priority": "medium",
        "instructionType": "cleanup",
        "createdAt": "2024-12-05T10:45:00Z",
        "updatedAt": null,
        "createdBy": {
          "userId": "manager_001",
          "userName": "山田太郎"
        },
        "isRead": true
      },
      {
        "instructionId": "inst_011",
        "targetType": "method",
        "methodId": "m001",
        "methodName": "温度キャリブレーション",
        "content": "キャリブレーション実施後、結果をExcelシートに記録してください。記録項目：測定時刻、標準温度計の値、装置温度計の値、誤差。誤差が±2℃を超える場合は赤字で記入してください。",
        "priority": "high",
        "instructionType": "measurement",
        "createdAt": "2024-12-05T10:50:00Z",
        "updatedAt": null,
        "createdBy": {
          "userId": "manager_001",
          "userName": "山田太郎"
        },
        "isRead": false
      },
      {
        "instructionId": "inst_012",
        "targetType": "method",
        "methodId": "m002",
        "methodName": "サンプル重量測定",
        "content": "測定値に異常がある場合（前回測定値との差が5%以上）は、再測定を実施してください。それでも異常値が続く場合は管理者に報告してください。",
        "priority": "high",
        "instructionType": "measurement",
        "createdAt": "2024-12-05T10:55:00Z",
        "updatedAt": null,
        "createdBy": {
          "userId": "manager_001",
          "userName": "山田太郎"
        },
        "isRead": false
      },
      {
        "instructionId": "inst_013",
        "targetType": "transition",
        "transitionId": "t001",
        "transitionName": "サンプル準備",
        "content": "サンプルの表面に傷や汚れがないか目視で確認してください。異常がある場合は別のサンプルを使用してください。使用不可のサンプルは専用の容器に保管してください。",
        "priority": "medium",
        "instructionType": "setup",
        "createdAt": "2024-12-05T11:00:00Z",
        "updatedAt": null,
        "createdBy": {
          "userId": "manager_001",
          "userName": "山田太郎"
        },
        "isRead": false
      },
      {
        "instructionId": "inst_014",
        "targetType": "transition",
        "transitionId": "t002",
        "transitionName": "温度設定",
        "content": "温度上昇中は5分ごとに温度を確認し、記録シートに記入してください。急激な温度上昇がある場合は直ちに加熱を停止し、管理者に連絡してください。",
        "priority": "high",
        "instructionType": "safety",
        "createdAt": "2024-12-05T11:05:00Z",
        "updatedAt": null,
        "createdBy": {
          "userId": "manager_001",
          "userName": "山田太郎"
        },
        "isRead": false
      },
      {
        "instructionId": "inst_015",
        "targetType": "transition",
        "transitionId": "t003",
        "transitionName": "データ測定",
        "content": "測定開始時と終了時に、装置のステータスをスクリーンショットで保存してください。画像ファイル名は「測定ID_開始.png」「測定ID_終了.png」としてください。",
        "priority": "medium",
        "instructionType": "measurement",
        "createdAt": "2024-12-05T11:10:00Z",
        "updatedAt": null,
        "createdBy": {
          "userId": "manager_001",
          "userName": "山田太郎"
        },
        "isRead": false
      }
    ],
    "methods": [
      {
        "methodId": "m001",
        "methodName": "温度キャリブレーション",
        "description": "加熱炉の温度計が正確であることを確認する手順。標準温度計と比較して誤差を測定します。",
        "category": "キャリブレーション",
        "transitions": [
          {
            "transitionId": "t001",
            "transitionName": "サンプル準備",
            "description": "実験に使用するサンプルを準備する工程。",
            "category": "準備工程",
            "estimatedDuration": "15分",
            "templates": [
              {
                "templateId": "tpl_001_materials",
                "category": "Materials",
                "name": "材料情報",
                "description": "実験に使用する材料の詳細情報を入力してください。",
                "properties": [
                  {
                    "key": "material_name",
                    "label": "材料名",
                    "type": "stringType",
                    "required": true
                  },
                  {
                    "key": "material_weight",
                    "label": "材料重量",
                    "type": "floatType",
                    "units": "g",
                    "required": true,
                    "min": 0,
                    "max": 1000
                  },
                  {
                    "key": "is_certified",
                    "label": "認証済み材料",
                    "type": "booleanType",
                    "required": false
                  }
                ]
              }
            ]
          },
          {
            "transitionId": "t002",
            "transitionName": "温度設定",
            "description": "加熱炉の温度を目標値に設定し、温度が安定するまで待機する工程。",
            "category": "セットアップ",
            "estimatedDuration": "20分",
            "templates": [
              {
                "templateId": "tpl_002_conditions",
                "category": "Conditions",
                "name": "実験条件",
                "description": "実験条件を正確に設定してください。",
                "properties": [
                  {
                    "key": "target_temperature",
                    "label": "目標温度",
                    "type": "intType",
                    "units": "℃",
                    "required": true,
                    "min": 0,
                    "max": 1000
                  },
                  {
                    "key": "heating_rate",
                    "label": "昇温速度",
                    "type": "floatType",
                    "units": "℃/min",
                    "required": true,
                    "min": 0.1,
                    "max": 100
                  },
                  {
                    "key": "measurement_date",
                    "label": "測定日",
                    "type": "dateType",
                    "required": true
                  },
                  {
                    "key": "measurement_start_time",
                    "label": "測定開始時刻",
                    "type": "dateTimeType",
                    "required": true
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        "methodId": "m002",
        "methodName": "サンプル重量測定",
        "description": "精密天秤を使用してサンプルの正確な重量を測定する手順。",
        "category": "測定",
        "transitions": [
          {
            "transitionId": "t001",
            "transitionName": "サンプル準備",
            "description": "実験に使用するサンプルを準備する工程。",
            "category": "準備工程",
            "estimatedDuration": "15分"
          }
        ]
      },
      {
        "methodId": "m003",
        "methodName": "データバックアップ",
        "description": "測定データを適切に保存・バックアップする手順。",
        "category": "データ管理",
        "transitions": [
          {
            "transitionId": "t003",
            "transitionName": "データ測定",
            "description": "温度制御された環境下でデータを測定する主要工程。",
            "category": "測定工程",
            "estimatedDuration": "60分",
            "templates": [
              {
                "templateId": "tpl_003_results",
                "category": "Results",
                "name": "測定結果",
                "description": "実験で得られた測定結果を記録してください。",
                "properties": [
                  {
                    "key": "measurement_matrix",
                    "label": "測定データ（時系列）",
                    "type": "contentDoubleListType",
                    "units": "℃",
                    "required": true
                  },
                  {
                    "key": "observation",
                    "label": "観察結果",
                    "type": "stringType",
                    "required": false
                  },
                  {
                    "key": "experiment_image",
                    "label": "実験写真",
                    "type": "insertion",
                    "required": false
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        "methodId": "m004",
        "methodName": "機器クリーニング",
        "description": "実験終了後に機器を適切にクリーニングする手順。",
        "category": "後処理",
        "transitions": [
          {
            "transitionId": "t002",
            "transitionName": "温度設定",
            "description": "加熱炉の温度を目標値に設定し、温度が安定するまで待機する工程。",
            "category": "セットアップ",
            "estimatedDuration": "20分"
          },
          {
            "transitionId": "t003",
            "transitionName": "データ測定",
            "description": "温度制御された環境下でデータを測定する主要工程。",
            "category": "測定工程",
            "estimatedDuration": "60分"
          }
        ]
      }
    ],
    "transitionDetails": {
      "t001": {
        "transitionId": "t001",
        "transitionName": "サンプル準備",
        "category": "準備工程",
        "description": "実験に使用するサンプルを準備する工程。サンプルの品質が実験結果に直接影響するため、慎重に取り扱う必要があります。",
        "isExperimentRelevant": true,
        "estimatedDuration": "15分",
        "requiredEquipment": ["精密天秤", "ピンセット", "保管容器"],
        "safetyNotes": "サンプルは素手で触らないこと"
      },
      "t002": {
        "transitionId": "t002",
        "transitionName": "温度設定",
        "category": "セットアップ",
        "description": "加熱炉の温度を目標値に設定し、温度が安定するまで待機する工程。",
        "isExperimentRelevant": true,
        "estimatedDuration": "20分",
        "requiredEquipment": ["加熱炉", "温度計"],
        "safetyNotes": "高温注意。耐熱手袋を着用すること"
      },
      "t003": {
        "transitionId": "t003",
        "transitionName": "データ測定",
        "category": "測定工程",
        "description": "温度制御された環境下でデータを測定する主要工程。",
        "isExperimentRelevant": true,
        "estimatedDuration": "60分",
        "requiredEquipment": ["測定器", "データロガー", "PC"],
        "safetyNotes": "測定中は装置に触れないこと"
      }
    },
    "progressData": [
      {
        "transitionId": "t001",
        "transitionName": "サンプル準備",
        "methodId": "m001",
        "methodName": "温度キャリブレーション",
        "progressRate": 100,
        "status": "completed",
        "reportCount": 3,
        "issueCount": 0
      },
      {
        "transitionId": "t002",
        "transitionName": "温度設定",
        "methodId": "m001",
        "methodName": "温度キャリブレーション",
        "progressRate": 75,
        "status": "in_progress",
        "reportCount": 2,
        "issueCount": 1
      },
      {
        "transitionId": "t001",
        "transitionName": "サンプル準備",
        "methodId": "m002",
        "methodName": "サンプル重量測定",
        "progressRate": 50,
        "status": "in_progress",
        "reportCount": 1,
        "issueCount": 0
      },
      {
        "transitionId": "t003",
        "transitionName": "データ測定",
        "methodId": "m003",
        "methodName": "データバックアップ",
        "progressRate": 100,
        "status": "completed",
        "reportCount": 5,
        "issueCount": 0
      },
      {
        "transitionId": "t002",
        "transitionName": "温度設定",
        "methodId": "m004",
        "methodName": "機器クリーニング",
        "progressRate": 0,
        "status": "not_started",
        "reportCount": 0,
        "issueCount": 0
      },
      {
        "transitionId": "t003",
        "transitionName": "データ測定",
        "methodId": "m004",
        "methodName": "機器クリーニング",
        "progressRate": 25,
        "status": "issue",
        "reportCount": 1,
        "issueCount": 2
      }
    ]
  },
  "project_002": {
    "projectId": "project_002",
    "projectName": "Ramanスペクトル解析",
    "fileName": "Raman_analysis_v1.maiml",
    "workAssignment": {
      "workId": "work_002",
      "fileKey": "org_maiml_lab_001/projects/proj_002/files/Raman_analysis_v1.maiml",
      "fileName": "Raman_analysis_v1.maiml",
      "assignedBy": {
        "userId": "manager_002",
        "userName": "佐藤花子",
        "role": "Manager"
      },
      "assignedAt": "2024-12-06T09:00:00Z",
      "confirmedAt": null,
      "status": "assigned"
    },
    "instructions": [
      {
        "instructionId": "inst_201",
        "targetType": "file",
        "content": "Ramanスペクトル測定前にレーザーの波長を532nmに設定してください。",
        "priority": "high",
        "instructionType": "setup",
        "createdAt": "2024-12-06T08:30:00Z",
        "updatedAt": null,
        "createdBy": {
          "userId": "manager_002",
          "userName": "佐藤花子"
        },
        "isRead": false
      },
      {
        "instructionId": "inst_202",
        "targetType": "file",
        "content": "測定時間は60秒、積算回数は3回で設定してください。",
        "priority": "medium",
        "instructionType": "measurement",
        "createdAt": "2024-12-06T08:35:00Z",
        "updatedAt": null,
        "createdBy": {
          "userId": "manager_002",
          "userName": "佐藤花子"
        },
        "isRead": false
      }
    ],
    "transitionDetails": {},
    "methods": [],
    "progressData": []
  },
  "project_003": {
    "projectId": "project_003",
    "projectName": "XRF元素分析実験",
    "fileName": "XRF_experiment.maiml",
    "workAssignment": {
      "workId": "work_003",
      "fileKey": "org_maiml_lab_001/projects/proj_003/files/XRF_experiment.maiml",
      "fileName": "XRF_experiment.maiml",
      "assignedBy": {
        "userId": "manager_001",
        "userName": "山田太郎",
        "role": "Manager"
      },
      "assignedAt": "2024-12-07T14:00:00Z",
      "confirmedAt": null,
      "status": "assigned"
    },
    "instructions": [
      {
        "instructionId": "inst_301",
        "targetType": "file",
        "content": "XRF測定前にサンプルの表面をクリーニングしてください。",
        "priority": "high",
        "instructionType": "setup",
        "createdAt": "2024-12-07T13:30:00Z",
        "updatedAt": null,
        "createdBy": {
          "userId": "manager_001",
          "userName": "山田太郎"
        },
        "isRead": false
      }
    ],
    "transitionDetails": {},
    "methods": [],
    "progressData": []
  }
};
