import {
  ProjectData,
  Task,
  WorkflowStatistics,
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
        "tasks": [
          {
            "taskId": "task_m001_001",
            "taskName": "温度記録",
            "sampleNumber": "Sample-001",
            "notes": "標準温度計との比較測定",
            "status": "started",
            "progressRate": 30,
            "progressReport": "実験記録報告",
            "recordNumber": "EXP-2024-001"
          },
          {
            "taskId": "task_m001_002",
            "taskName": "誤差計算",
            "sampleNumber": "Sample-001",
            "notes": "温度誤差の算出と記録",
            "status": "not_started",
            "progressRate": 0,
            "progressReport": "",
            "recordNumber": ""
          },
          {
            "taskId": "task_m001_003",
            "taskName": "レポート作成",
            "sampleNumber": "Sample-001",
            "notes": "キャリブレーション結果のまとめ",
            "status": "not_started",
            "progressRate": 0,
            "progressReport": "",
            "recordNumber": ""
          }
        ],
        "transitions": [
          {
            "transitionId": "t001",
            "transitionName": "サンプル準備",
            "description": "実験に使用するサンプルを準備する工程。",
            "category": "準備工程",
            "estimatedDuration": "15分",
            "totalMaterialsCount": 3,
            "totalIngredientsCount": 2,
            "totalResultsCount": 1,
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
            "totalMaterialsCount": 2,
            "totalIngredientsCount": 4,
            "totalResultsCount": 2,
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
        "tasks": [
          {
            "taskId": "task_m002_001",
            "taskName": "重量測定記録",
            "sampleNumber": "Sample-W001",
            "notes": "精密天秤による重量測定とデータ記録",
            "status": "not_started",
            "progressRate": 0,
            "progressReport": "",
            "recordNumber": ""
          }
        ],
        "transitions": [
          {
            "transitionId": "t004",
            "transitionName": "測定環境準備",
            "description": "測定を開始する前に環境条件を整える工程。",
            "category": "準備工程",
            "estimatedDuration": "10分",
            "totalMaterialsCount": 0,
            "totalIngredientsCount": 3,
            "totalResultsCount": 0
          },
          {
            "transitionId": "t005",
            "transitionName": "天秤キャリブレーション",
            "description": "精密天秤の精度を確認し、必要に応じて調整する工程。",
            "category": "キャリブレーション",
            "estimatedDuration": "15分",
            "totalMaterialsCount": 1,
            "totalIngredientsCount": 2,
            "totalResultsCount": 1
          },
          {
            "transitionId": "t006",
            "transitionName": "ゼロ点調整",
            "description": "天秤のゼロ点を調整して正確な測定を可能にする工程。",
            "category": "調整",
            "estimatedDuration": "5分",
            "totalMaterialsCount": 0,
            "totalIngredientsCount": 1,
            "totalResultsCount": 0
          },
          {
            "transitionId": "t007",
            "transitionName": "サンプルA-1測定",
            "description": "サンプルA-1の重量を測定する工程。",
            "category": "測定工程",
            "estimatedDuration": "3分",
            "totalMaterialsCount": 1,
            "totalIngredientsCount": 0,
            "totalResultsCount": 1
          },
          {
            "transitionId": "t008",
            "transitionName": "サンプルA-2測定",
            "description": "サンプルA-2の重量を測定する工程。",
            "category": "測定工程",
            "estimatedDuration": "3分",
            "totalMaterialsCount": 1,
            "totalIngredientsCount": 0,
            "totalResultsCount": 1
          },
          {
            "transitionId": "t009",
            "transitionName": "サンプルA-3測定",
            "description": "サンプルA-3の重量を測定する工程。",
            "category": "測定工程",
            "estimatedDuration": "3分",
            "totalMaterialsCount": 1,
            "totalIngredientsCount": 0,
            "totalResultsCount": 1
          },
          {
            "transitionId": "t010",
            "transitionName": "サンプルB-1測定",
            "description": "サンプルB-1の重量を測定する工程。",
            "category": "測定工程",
            "estimatedDuration": "3分",
            "totalMaterialsCount": 1,
            "totalIngredientsCount": 0,
            "totalResultsCount": 1
          },
          {
            "transitionId": "t011",
            "transitionName": "サンプルB-2測定",
            "description": "サンプルB-2の重量を測定する工程。",
            "category": "測定工程",
            "estimatedDuration": "3分",
            "totalMaterialsCount": 1,
            "totalIngredientsCount": 0,
            "totalResultsCount": 1
          },
          {
            "transitionId": "t012",
            "transitionName": "サンプルB-3測定",
            "description": "サンプルB-3の重量を測定する工程。",
            "category": "測定工程",
            "estimatedDuration": "3分",
            "totalMaterialsCount": 1,
            "totalIngredientsCount": 0,
            "totalResultsCount": 1
          },
          {
            "transitionId": "t013",
            "transitionName": "重量データ記録",
            "description": "測定した重量データをシステムに記録する工程。",
            "category": "記録",
            "estimatedDuration": "10分",
            "totalMaterialsCount": 0,
            "totalIngredientsCount": 2,
            "totalResultsCount": 6
          },
          {
            "transitionId": "t014",
            "transitionName": "データ検証",
            "description": "記録したデータの妥当性を検証する工程。",
            "category": "検証",
            "estimatedDuration": "15分",
            "totalMaterialsCount": 0,
            "totalIngredientsCount": 1,
            "totalResultsCount": 1
          },
          {
            "transitionId": "t015",
            "transitionName": "異常値チェック",
            "description": "測定値に異常がないか統計的に確認する工程。",
            "category": "検証",
            "estimatedDuration": "10分",
            "totalMaterialsCount": 0,
            "totalIngredientsCount": 2,
            "totalResultsCount": 1
          },
          {
            "transitionId": "t016",
            "transitionName": "再測定判定",
            "description": "再測定の必要性を判断する工程。",
            "category": "判定",
            "estimatedDuration": "5分",
            "totalMaterialsCount": 0,
            "totalIngredientsCount": 1,
            "totalResultsCount": 1
          },
          {
            "transitionId": "t017",
            "transitionName": "環境データ記録",
            "description": "測定時の温度・湿度・気圧を記録する工程。",
            "category": "記録",
            "estimatedDuration": "5分",
            "totalMaterialsCount": 0,
            "totalIngredientsCount": 3,
            "totalResultsCount": 3
          },
          {
            "transitionId": "t018",
            "transitionName": "測定結果入力",
            "description": "測定結果を正式なフォーマットで入力する工程。",
            "category": "入力",
            "estimatedDuration": "20分",
            "totalMaterialsCount": 0,
            "totalIngredientsCount": 4,
            "totalResultsCount": 6
          },
          {
            "transitionId": "t019",
            "transitionName": "データバックアップ",
            "description": "測定データをバックアップする工程。",
            "category": "データ管理",
            "estimatedDuration": "5分",
            "totalMaterialsCount": 0,
            "totalIngredientsCount": 1,
            "totalResultsCount": 0
          },
          {
            "transitionId": "t020",
            "transitionName": "品質確認",
            "description": "測定データの品質を最終確認する工程。",
            "category": "品質管理",
            "estimatedDuration": "15分",
            "totalMaterialsCount": 0,
            "totalIngredientsCount": 2,
            "totalResultsCount": 1
          },
          {
            "transitionId": "t021",
            "transitionName": "承認申請",
            "description": "測定結果の承認を申請する工程。",
            "category": "申請",
            "estimatedDuration": "5分",
            "totalMaterialsCount": 0,
            "totalIngredientsCount": 1,
            "totalResultsCount": 0
          },
          {
            "transitionId": "t022",
            "transitionName": "最終確認",
            "description": "すべての工程が完了していることを最終確認する工程。",
            "category": "確認",
            "estimatedDuration": "10分",
            "totalMaterialsCount": 0,
            "totalIngredientsCount": 1,
            "totalResultsCount": 1
          },
          {
            "transitionId": "t023",
            "transitionName": "レポート作成",
            "description": "測定結果のレポートを作成する工程。",
            "category": "報告",
            "estimatedDuration": "30分",
            "totalMaterialsCount": 0,
            "totalIngredientsCount": 5,
            "totalResultsCount": 1
          },
          {
            "transitionId": "t024",
            "transitionName": "サンプル保管",
            "description": "測定済みサンプルを適切に保管する工程。",
            "category": "後処理",
            "estimatedDuration": "10分",
            "totalMaterialsCount": 6,
            "totalIngredientsCount": 1,
            "totalResultsCount": 0
          },
          {
            "transitionId": "t025",
            "transitionName": "記録完了",
            "description": "すべての記録作業を完了する工程。",
            "category": "完了",
            "estimatedDuration": "5分",
            "totalMaterialsCount": 0,
            "totalIngredientsCount": 0,
            "totalResultsCount": 1
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
            "totalMaterialsCount": 0,
            "totalIngredientsCount": 0,
            "totalResultsCount": 1,
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
            "estimatedDuration": "20分",
            "totalMaterialsCount": 2,
            "totalIngredientsCount": 4,
            "totalResultsCount": 2
          },
          {
            "transitionId": "t003",
            "transitionName": "データ測定",
            "description": "温度制御された環境下でデータを測定する主要工程。",
            "category": "測定工程",
            "estimatedDuration": "60分",
            "totalMaterialsCount": 0,
            "totalIngredientsCount": 0,
            "totalResultsCount": 1
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
      },
      "t004": {
        "transitionId": "t004",
        "transitionName": "測定環境準備",
        "category": "準備工程",
        "description": "測定を開始する前に環境条件を整える工程。室温・湿度を確認し、測定に適した状態にします。",
        "isExperimentRelevant": true,
        "estimatedDuration": "10分",
        "requiredEquipment": ["温湿度計", "エアコン", "除湿機"],
        "safetyNotes": "測定環境を整えてから作業開始すること"
      }
    },
    "progressData": [
      {
        "transitionId": "t001",
        "transitionName": "サンプル準備",
        "taskName": "温度記録",
        "methodId": "m001",
        "methodName": "温度キャリブレーション",
        "progressRate": 100,
        "status": "completed",
        "reportCount": 3,
        "issueCount": 0,
        "inputMaterialsCount": 3,
        "inputIngredientsCount": 2,
        "inputResultsCount": 1
      },
      {
        "transitionId": "t002",
        "transitionName": "温度設定",
        "taskName": "温度記録",
        "methodId": "m001",
        "methodName": "温度キャリブレーション",
        "progressRate": 75,
        "status": "in_progress",
        "reportCount": 2,
        "issueCount": 1,
        "inputMaterialsCount": 1,
        "inputIngredientsCount": 3,
        "inputResultsCount": 1
      },
      {
        "transitionId": "t001",
        "transitionName": "サンプル準備",
        "taskName": "誤差計算",
        "methodId": "m001",
        "methodName": "温度キャリブレーション",
        "progressRate": 0,
        "status": "not_started",
        "reportCount": 0,
        "issueCount": 0,
        "inputMaterialsCount": 0,
        "inputIngredientsCount": 0,
        "inputResultsCount": 0
      },
      {
        "transitionId": "t002",
        "transitionName": "温度設定",
        "taskName": "誤差計算",
        "methodId": "m001",
        "methodName": "温度キャリブレーション",
        "progressRate": 0,
        "status": "not_started",
        "reportCount": 0,
        "issueCount": 0,
        "inputMaterialsCount": 0,
        "inputIngredientsCount": 0,
        "inputResultsCount": 0
      },
      {
        "transitionId": "t001",
        "transitionName": "サンプル準備",
        "taskName": "レポート作成",
        "methodId": "m001",
        "methodName": "温度キャリブレーション",
        "progressRate": 0,
        "status": "not_started",
        "reportCount": 0,
        "issueCount": 0,
        "inputMaterialsCount": 0,
        "inputIngredientsCount": 0,
        "inputResultsCount": 0
      },
      {
        "transitionId": "t002",
        "transitionName": "温度設定",
        "taskName": "レポート作成",
        "methodId": "m001",
        "methodName": "温度キャリブレーション",
        "progressRate": 0,
        "status": "not_started",
        "reportCount": 0,
        "issueCount": 0,
        "inputMaterialsCount": 0,
        "inputIngredientsCount": 0,
        "inputResultsCount": 0
      },
      {
        "transitionId": "t004",
        "transitionName": "測定環境準備",
        "taskName": "重量測定記録",
        "methodId": "m002",
        "methodName": "サンプル重量測定",
        "progressRate": 0,
        "status": "not_started",
        "reportCount": 0,
        "issueCount": 0,
        "inputMaterialsCount": 0,
        "inputIngredientsCount": 0,
        "inputResultsCount": 0
      },
      {
        "transitionId": "t005",
        "transitionName": "天秤キャリブレーション",
        "taskName": "重量測定記録",
        "methodId": "m002",
        "methodName": "サンプル重量測定",
        "progressRate": 50,
        "status": "in_progress",
        "reportCount": 1,
        "issueCount": 0,
        "inputMaterialsCount": 1,
        "inputIngredientsCount": 1,
        "inputResultsCount": 0
      },
      {
        "transitionId": "t006",
        "transitionName": "ゼロ点調整",
        "taskName": "重量測定記録",
        "methodId": "m002",
        "methodName": "サンプル重量測定",
        "progressRate": 100,
        "status": "completed",
        "reportCount": 1,
        "issueCount": 0,
        "inputMaterialsCount": 0,
        "inputIngredientsCount": 1,
        "inputResultsCount": 0
      },
      {
        "transitionId": "t007",
        "transitionName": "サンプルA-1測定",
        "taskName": "重量測定記録",
        "methodId": "m002",
        "methodName": "サンプル重量測定",
        "progressRate": 100,
        "status": "completed",
        "reportCount": 1,
        "issueCount": 0,
        "inputMaterialsCount": 1,
        "inputIngredientsCount": 0,
        "inputResultsCount": 1
      },
      {
        "transitionId": "t008",
        "transitionName": "サンプルA-2測定",
        "taskName": "重量測定記録",
        "methodId": "m002",
        "methodName": "サンプル重量測定",
        "progressRate": 100,
        "status": "completed",
        "reportCount": 1,
        "issueCount": 0,
        "inputMaterialsCount": 1,
        "inputIngredientsCount": 0,
        "inputResultsCount": 1
      },
      {
        "transitionId": "t009",
        "transitionName": "サンプルA-3測定",
        "taskName": "重量測定記録",
        "methodId": "m002",
        "methodName": "サンプル重量測定",
        "progressRate": 100,
        "status": "completed",
        "reportCount": 1,
        "issueCount": 0,
        "inputMaterialsCount": 1,
        "inputIngredientsCount": 0,
        "inputResultsCount": 1
      },
      {
        "transitionId": "t010",
        "transitionName": "サンプルB-1測定",
        "taskName": "重量測定記録",
        "methodId": "m002",
        "methodName": "サンプル重量測定",
        "progressRate": 0,
        "status": "not_started",
        "reportCount": 0,
        "issueCount": 0,
        "inputMaterialsCount": 0,
        "inputIngredientsCount": 0,
        "inputResultsCount": 0
      },
      {
        "transitionId": "t011",
        "transitionName": "サンプルB-2測定",
        "taskName": "重量測定記録",
        "methodId": "m002",
        "methodName": "サンプル重量測定",
        "progressRate": 0,
        "status": "not_started",
        "reportCount": 0,
        "issueCount": 0,
        "inputMaterialsCount": 0,
        "inputIngredientsCount": 0,
        "inputResultsCount": 0
      },
      {
        "transitionId": "t012",
        "transitionName": "サンプルB-3測定",
        "taskName": "重量測定記録",
        "methodId": "m002",
        "methodName": "サンプル重量測定",
        "progressRate": 0,
        "status": "not_started",
        "reportCount": 0,
        "issueCount": 0,
        "inputMaterialsCount": 0,
        "inputIngredientsCount": 0,
        "inputResultsCount": 0
      },
      {
        "transitionId": "t013",
        "transitionName": "重量データ記録",
        "taskName": "重量測定記録",
        "methodId": "m002",
        "methodName": "サンプル重量測定",
        "progressRate": 0,
        "status": "not_started",
        "reportCount": 0,
        "issueCount": 0,
        "inputMaterialsCount": 0,
        "inputIngredientsCount": 0,
        "inputResultsCount": 0
      },
      {
        "transitionId": "t014",
        "transitionName": "データ検証",
        "taskName": "重量測定記録",
        "methodId": "m002",
        "methodName": "サンプル重量測定",
        "progressRate": 0,
        "status": "not_started",
        "reportCount": 0,
        "issueCount": 0,
        "inputMaterialsCount": 0,
        "inputIngredientsCount": 0,
        "inputResultsCount": 0
      },
      {
        "transitionId": "t015",
        "transitionName": "異常値チェック",
        "taskName": "重量測定記録",
        "methodId": "m002",
        "methodName": "サンプル重量測定",
        "progressRate": 0,
        "status": "not_started",
        "reportCount": 0,
        "issueCount": 0,
        "inputMaterialsCount": 0,
        "inputIngredientsCount": 0,
        "inputResultsCount": 0
      },
      {
        "transitionId": "t016",
        "transitionName": "再測定判定",
        "taskName": "重量測定記録",
        "methodId": "m002",
        "methodName": "サンプル重量測定",
        "progressRate": 0,
        "status": "not_started",
        "reportCount": 0,
        "issueCount": 0,
        "inputMaterialsCount": 0,
        "inputIngredientsCount": 0,
        "inputResultsCount": 0
      },
      {
        "transitionId": "t017",
        "transitionName": "環境データ記録",
        "taskName": "重量測定記録",
        "methodId": "m002",
        "methodName": "サンプル重量測定",
        "progressRate": 0,
        "status": "not_started",
        "reportCount": 0,
        "issueCount": 0,
        "inputMaterialsCount": 0,
        "inputIngredientsCount": 0,
        "inputResultsCount": 0
      },
      {
        "transitionId": "t018",
        "transitionName": "測定結果入力",
        "taskName": "重量測定記録",
        "methodId": "m002",
        "methodName": "サンプル重量測定",
        "progressRate": 0,
        "status": "not_started",
        "reportCount": 0,
        "issueCount": 0,
        "inputMaterialsCount": 0,
        "inputIngredientsCount": 0,
        "inputResultsCount": 0
      },
      {
        "transitionId": "t019",
        "transitionName": "データバックアップ",
        "taskName": "重量測定記録",
        "methodId": "m002",
        "methodName": "サンプル重量測定",
        "progressRate": 0,
        "status": "not_started",
        "reportCount": 0,
        "issueCount": 0,
        "inputMaterialsCount": 0,
        "inputIngredientsCount": 0,
        "inputResultsCount": 0
      },
      {
        "transitionId": "t020",
        "transitionName": "品質確認",
        "taskName": "重量測定記録",
        "methodId": "m002",
        "methodName": "サンプル重量測定",
        "progressRate": 0,
        "status": "not_started",
        "reportCount": 0,
        "issueCount": 0,
        "inputMaterialsCount": 0,
        "inputIngredientsCount": 0,
        "inputResultsCount": 0
      },
      {
        "transitionId": "t021",
        "transitionName": "承認申請",
        "taskName": "重量測定記録",
        "methodId": "m002",
        "methodName": "サンプル重量測定",
        "progressRate": 0,
        "status": "not_started",
        "reportCount": 0,
        "issueCount": 0,
        "inputMaterialsCount": 0,
        "inputIngredientsCount": 0,
        "inputResultsCount": 0
      },
      {
        "transitionId": "t022",
        "transitionName": "最終確認",
        "taskName": "重量測定記録",
        "methodId": "m002",
        "methodName": "サンプル重量測定",
        "progressRate": 0,
        "status": "not_started",
        "reportCount": 0,
        "issueCount": 0,
        "inputMaterialsCount": 0,
        "inputIngredientsCount": 0,
        "inputResultsCount": 0
      },
      {
        "transitionId": "t023",
        "transitionName": "レポート作成",
        "taskName": "重量測定記録",
        "methodId": "m002",
        "methodName": "サンプル重量測定",
        "progressRate": 0,
        "status": "not_started",
        "reportCount": 0,
        "issueCount": 0,
        "inputMaterialsCount": 0,
        "inputIngredientsCount": 0,
        "inputResultsCount": 0
      },
      {
        "transitionId": "t024",
        "transitionName": "サンプル保管",
        "taskName": "重量測定記録",
        "methodId": "m002",
        "methodName": "サンプル重量測定",
        "progressRate": 0,
        "status": "not_started",
        "reportCount": 0,
        "issueCount": 0,
        "inputMaterialsCount": 0,
        "inputIngredientsCount": 0,
        "inputResultsCount": 0
      },
      {
        "transitionId": "t025",
        "transitionName": "記録完了",
        "taskName": "重量測定記録",
        "methodId": "m002",
        "methodName": "サンプル重量測定",
        "progressRate": 0,
        "status": "not_started",
        "reportCount": 0,
        "issueCount": 0,
        "inputMaterialsCount": 0,
        "inputIngredientsCount": 0,
        "inputResultsCount": 0
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

/**
 * タスクリストから統計情報を計算する
 */
export function calculateWorkflowStatistics(tasks: Task[]): WorkflowStatistics {
  if (!tasks || tasks.length === 0) {
    return {
      notStarted: 0,
      started: 0,
      inProgress: 0,
      completed: 0,
      progressRate: 0
    };
  }

  const notStarted = tasks.filter(task => task.status === 'not_started').length;
  const started = tasks.filter(task => task.status === 'started').length;
  const inProgress = tasks.filter(task => task.status === 'in_progress').length;
  const completed = tasks.filter(task => task.status === 'completed').length;

  const totalTasks = tasks.length;
  const progressRate = totalTasks > 0 
    ? Math.round((completed / totalTasks) * 100) 
    : 0;

  return {
    notStarted,
    started,
    inProgress,
    completed,
    progressRate
  };
}

/**
 * プロジェクトIDとメソッドIDからタスクリストを取得する
 */
export function getTasksByProjectAndMethod(
  projectId: string, 
  methodId: string
): Task[] {
  const project = projectsData[projectId];
  if (!project || !project.methods) {
    return [];
  }

  const method = project.methods.find(m => m.methodId === methodId);
  if (!method || !method.tasks) {
    return [];
  }

  return method.tasks;
}

/**
 * タスクのステータスを更新する（モック用）
 */
export function updateTaskStatus(
  projectId: string,
  methodId: string,
  taskId: string,
  newStatus: Task['status']
): Task[] {
  const project = projectsData[projectId];
  if (!project || !project.methods) {
    return [];
  }

  const method = project.methods.find(m => m.methodId === methodId);
  if (!method || !method.tasks) {
    return [];
  }

  const taskIndex = method.tasks.findIndex(t => t.taskId === taskId);
  if (taskIndex === -1) {
    return method.tasks;
  }

  method.tasks[taskIndex].status = newStatus;

  if (newStatus === 'started' && !method.tasks[taskIndex].recordNumber) {
    const timestamp = new Date().getTime();
    method.tasks[taskIndex].recordNumber = `EXP-${timestamp}`;
  }

  if (newStatus === 'started' || newStatus === 'in_progress') {
    if (!method.tasks[taskIndex].progressReport) {
      method.tasks[taskIndex].progressReport = '実験記録報告';
    }
  }

  return [...method.tasks];
}
