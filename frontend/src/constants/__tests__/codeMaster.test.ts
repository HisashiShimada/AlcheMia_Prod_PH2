/**
 * フロントエンド code_master 定数 単体テスト
 *
 * 目的:
 * - constants/codeMaster.ts の各定数が正しい数値を持つことを検証
 * - constants/httpStatus.ts のHTTPステータスコード定数を検証
 * - バックエンドの codeMaster.enum.ts と値が一致していることを保証
 *
 * テスト対象:
 * - frontend/src/constants/codeMaster.ts
 * - frontend/src/constants/httpStatus.ts
 */

import {
  ProjectStatus,
  CheckoutStatus,
  TaskStatus,
  InstructionStatus,
  InstructionPriority,
  InstructionTypeCode,
  IssueType,
  ExperimentCondition,
  TransitionStatusCode,
} from '@/constants/codeMaster';
import { HTTP_STATUS } from '@/constants/httpStatus';

// ============================================================
// ProjectStatus
// ============================================================
describe('ProjectStatus', () => {
  it('PLANNING は 0 である', () => {
    expect(ProjectStatus.PLANNING).toBe(0);
  });
  it('TASK_PENDING は 1 である', () => {
    expect(ProjectStatus.TASK_PENDING).toBe(1);
  });
  it('TASK_IN_PROGRESS は 2 である', () => {
    expect(ProjectStatus.TASK_IN_PROGRESS).toBe(2);
  });
  it('REVIEW_WAITING は 3 である', () => {
    expect(ProjectStatus.REVIEW_WAITING).toBe(3);
  });
  it('COMPLETED は 4 である', () => {
    expect(ProjectStatus.COMPLETED).toBe(4);
  });
  it('ERROR は 5 である', () => {
    expect(ProjectStatus.ERROR).toBe(5);
  });
  it('全6種類の値を持つ', () => {
    expect(Object.keys(ProjectStatus)).toHaveLength(6);
  });
  it('値の重複がない', () => {
    const values = Object.values(ProjectStatus);
    expect(new Set(values).size).toBe(values.length);
  });
});

// ============================================================
// CheckoutStatus
// ============================================================
describe('CheckoutStatus', () => {
  it('CHECKED_IN は 0 である', () => {
    expect(CheckoutStatus.CHECKED_IN).toBe(0);
  });
  it('CHECKED_OUT は 1 である', () => {
    expect(CheckoutStatus.CHECKED_OUT).toBe(1);
  });
  it('全2種類の値を持つ', () => {
    expect(Object.keys(CheckoutStatus)).toHaveLength(2);
  });
});

// ============================================================
// TaskStatus
// ============================================================
describe('TaskStatus', () => {
  it('PENDING は 0 である', () => {
    expect(TaskStatus.PENDING).toBe(0);
  });
  it('IN_PROGRESS は 1 である', () => {
    expect(TaskStatus.IN_PROGRESS).toBe(1);
  });
  it('REVIEW_WAITING は 2 である', () => {
    expect(TaskStatus.REVIEW_WAITING).toBe(2);
  });
  it('COMPLETED は 3 である', () => {
    expect(TaskStatus.COMPLETED).toBe(3);
  });
  it('FORCED_TERMINATED は 4 である', () => {
    expect(TaskStatus.FORCED_TERMINATED).toBe(4);
  });
  it('全5種類の値を持つ', () => {
    expect(Object.keys(TaskStatus)).toHaveLength(5);
  });
  it('値の重複がない', () => {
    const values = Object.values(TaskStatus);
    expect(new Set(values).size).toBe(values.length);
  });
});

// ============================================================
// InstructionStatus
// ============================================================
describe('InstructionStatus', () => {
  it('UNSENT は 0 である', () => {
    expect(InstructionStatus.UNSENT).toBe(0);
  });
  it('SENT は 1 である', () => {
    expect(InstructionStatus.SENT).toBe(1);
  });
  it('全2種類の値を持つ', () => {
    expect(Object.keys(InstructionStatus)).toHaveLength(2);
  });
});

// ============================================================
// InstructionPriority
// ============================================================
describe('InstructionPriority', () => {
  it('LOW は 0 である', () => {
    expect(InstructionPriority.LOW).toBe(0);
  });
  it('NORMAL は 1 である', () => {
    expect(InstructionPriority.NORMAL).toBe(1);
  });
  it('MEDIUM は 2 である', () => {
    expect(InstructionPriority.MEDIUM).toBe(2);
  });
  it('HIGH は 3 である', () => {
    expect(InstructionPriority.HIGH).toBe(3);
  });
  it('全4種類の値を持つ', () => {
    expect(Object.keys(InstructionPriority)).toHaveLength(4);
  });
  it('値の重複がない', () => {
    const values = Object.values(InstructionPriority);
    expect(new Set(values).size).toBe(values.length);
  });
});

// ============================================================
// InstructionTypeCode
// ============================================================
describe('InstructionTypeCode', () => {
  it('GENERAL は 0 である', () => {
    expect(InstructionTypeCode.GENERAL).toBe(0);
  });
  it('SETUP は 1 である', () => {
    expect(InstructionTypeCode.SETUP).toBe(1);
  });
  it('MEASUREMENT は 2 である', () => {
    expect(InstructionTypeCode.MEASUREMENT).toBe(2);
  });
  it('SAFETY は 3 である', () => {
    expect(InstructionTypeCode.SAFETY).toBe(3);
  });
  it('CLEANING は 4 である', () => {
    expect(InstructionTypeCode.CLEANING).toBe(4);
  });
  it('全5種類の値を持つ', () => {
    expect(Object.keys(InstructionTypeCode)).toHaveLength(5);
  });
  it('値の重複がない', () => {
    const values = Object.values(InstructionTypeCode);
    expect(new Set(values).size).toBe(values.length);
  });
});

// ============================================================
// IssueType
// ============================================================
describe('IssueType', () => {
  it('MATERIAL_SHORTAGE は 0 である', () => {
    expect(IssueType.MATERIAL_SHORTAGE).toBe(0);
  });
  it('EQUIPMENT_FAILURE は 1 である', () => {
    expect(IssueType.EQUIPMENT_FAILURE).toBe(1);
  });
  it('UNCLEAR_PROCEDURE は 2 である', () => {
    expect(IssueType.UNCLEAR_PROCEDURE).toBe(2);
  });
  it('SAFETY_CONCERN は 3 である', () => {
    expect(IssueType.SAFETY_CONCERN).toBe(3);
  });
  it('QUALITY_ISSUE は 4 である', () => {
    expect(IssueType.QUALITY_ISSUE).toBe(4);
  });
  it('TIME_CONSTRAINT は 5 である', () => {
    expect(IssueType.TIME_CONSTRAINT).toBe(5);
  });
  it('OTHER は 6 である', () => {
    expect(IssueType.OTHER).toBe(6);
  });
  it('全7種類の値を持つ', () => {
    expect(Object.keys(IssueType)).toHaveLength(7);
  });
  it('値の重複がない', () => {
    const values = Object.values(IssueType);
    expect(new Set(values).size).toBe(values.length);
  });
});

// ============================================================
// ExperimentCondition
// ============================================================
describe('ExperimentCondition', () => {
  it('SAME_CONDITIONS は 0 である', () => {
    expect(ExperimentCondition.SAME_CONDITIONS).toBe(0);
  });
  it('INDIVIDUAL_CONDITIONS は 1 である', () => {
    expect(ExperimentCondition.INDIVIDUAL_CONDITIONS).toBe(1);
  });
  it('全2種類の値を持つ', () => {
    expect(Object.keys(ExperimentCondition)).toHaveLength(2);
  });
});

// ============================================================
// TransitionStatusCode
// ============================================================
describe('TransitionStatusCode', () => {
  it('INITIAL は 1 である', () => {
    expect(TransitionStatusCode.INITIAL).toBe(1);
  });
  it('PREPARING は 2 である', () => {
    expect(TransitionStatusCode.PREPARING).toBe(2);
  });
  it('READY は 3 である', () => {
    expect(TransitionStatusCode.READY).toBe(3);
  });
  it('IN_PROGRESS は 4 である', () => {
    expect(TransitionStatusCode.IN_PROGRESS).toBe(4);
  });
  it('PAUSED は 5 である', () => {
    expect(TransitionStatusCode.PAUSED).toBe(5);
  });
  it('COMPLETED は 6 である', () => {
    expect(TransitionStatusCode.COMPLETED).toBe(6);
  });
  it('ERROR は 7 である', () => {
    expect(TransitionStatusCode.ERROR).toBe(7);
  });
  it('全7種類の値を持つ', () => {
    expect(Object.keys(TransitionStatusCode)).toHaveLength(7);
  });
  it('値の重複がない', () => {
    const values = Object.values(TransitionStatusCode);
    expect(new Set(values).size).toBe(values.length);
  });
});

// ============================================================
// HTTP_STATUS
// ============================================================
describe('HTTP_STATUS', () => {
  describe('2xx Success', () => {
    it('OK は 200 である', () => {
      expect(HTTP_STATUS.OK).toBe(200);
    });
    it('CREATED は 201 である', () => {
      expect(HTTP_STATUS.CREATED).toBe(201);
    });
    it('NO_CONTENT は 204 である', () => {
      expect(HTTP_STATUS.NO_CONTENT).toBe(204);
    });
  });

  describe('4xx Client Error', () => {
    it('BAD_REQUEST は 400 である', () => {
      expect(HTTP_STATUS.BAD_REQUEST).toBe(400);
    });
    it('UNAUTHORIZED は 401 である', () => {
      expect(HTTP_STATUS.UNAUTHORIZED).toBe(401);
    });
    it('FORBIDDEN は 403 である', () => {
      expect(HTTP_STATUS.FORBIDDEN).toBe(403);
    });
    it('NOT_FOUND は 404 である', () => {
      expect(HTTP_STATUS.NOT_FOUND).toBe(404);
    });
    it('CONFLICT は 409 である', () => {
      expect(HTTP_STATUS.CONFLICT).toBe(409);
    });
    it('TOO_MANY_REQUESTS は 429 である', () => {
      expect(HTTP_STATUS.TOO_MANY_REQUESTS).toBe(429);
    });
  });

  describe('5xx Server Error', () => {
    it('INTERNAL_SERVER_ERROR は 500 である', () => {
      expect(HTTP_STATUS.INTERNAL_SERVER_ERROR).toBe(500);
    });
    it('BAD_GATEWAY は 502 である', () => {
      expect(HTTP_STATUS.BAD_GATEWAY).toBe(502);
    });
    it('SERVICE_UNAVAILABLE は 503 である', () => {
      expect(HTTP_STATUS.SERVICE_UNAVAILABLE).toBe(503);
    });
    it('GATEWAY_TIMEOUT は 504 である', () => {
      expect(HTTP_STATUS.GATEWAY_TIMEOUT).toBe(504);
    });
  });

  it('値の重複がない', () => {
    const values = Object.values(HTTP_STATUS);
    expect(new Set(values).size).toBe(values.length);
  });
});

// ============================================================
// バックエンドとフロントエンドの整合性確認
// バックエンド codeMaster.enum.ts と同一値であることを保証
// ============================================================
describe('フロントエンド定数とバックエンド ENUM の整合性', () => {
  it('ProjectStatus の全値がバックエンド ProjectStatusEnum と一致する', () => {
    expect(ProjectStatus.PLANNING).toBe(0);
    expect(ProjectStatus.TASK_PENDING).toBe(1);
    expect(ProjectStatus.TASK_IN_PROGRESS).toBe(2);
    expect(ProjectStatus.REVIEW_WAITING).toBe(3);
    expect(ProjectStatus.COMPLETED).toBe(4);
    expect(ProjectStatus.ERROR).toBe(5);
  });

  it('CheckoutStatus の全値がバックエンド CheckoutStatusEnum と一致する', () => {
    expect(CheckoutStatus.CHECKED_IN).toBe(0);
    expect(CheckoutStatus.CHECKED_OUT).toBe(1);
  });

  it('TaskStatus の全値がバックエンド TaskStatusEnum と一致する', () => {
    expect(TaskStatus.PENDING).toBe(0);
    expect(TaskStatus.IN_PROGRESS).toBe(1);
    expect(TaskStatus.REVIEW_WAITING).toBe(2);
    expect(TaskStatus.COMPLETED).toBe(3);
    expect(TaskStatus.FORCED_TERMINATED).toBe(4);
  });

  it('InstructionStatus の全値がバックエンド InstructionStatusEnum と一致する', () => {
    expect(InstructionStatus.UNSENT).toBe(0);
    expect(InstructionStatus.SENT).toBe(1);
  });

  it('InstructionPriority の全値がバックエンド InstructionPriorityEnum と一致する', () => {
    expect(InstructionPriority.LOW).toBe(0);
    expect(InstructionPriority.NORMAL).toBe(1);
    expect(InstructionPriority.MEDIUM).toBe(2);
    expect(InstructionPriority.HIGH).toBe(3);
  });

  it('InstructionTypeCode の全値がバックエンド InstructionTypeEnum と一致する', () => {
    expect(InstructionTypeCode.GENERAL).toBe(0);
    expect(InstructionTypeCode.SETUP).toBe(1);
    expect(InstructionTypeCode.MEASUREMENT).toBe(2);
    expect(InstructionTypeCode.SAFETY).toBe(3);
    expect(InstructionTypeCode.CLEANING).toBe(4);
  });

  it('ExperimentCondition の全値がバックエンド ExperimentConditionEnum と一致する', () => {
    expect(ExperimentCondition.SAME_CONDITIONS).toBe(0);
    expect(ExperimentCondition.INDIVIDUAL_CONDITIONS).toBe(1);
  });
});
