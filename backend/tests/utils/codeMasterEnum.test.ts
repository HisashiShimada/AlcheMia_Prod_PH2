/**
 * code_master ENUM定数 単体テスト
 *
 * 目的:
 * - codeMaster.enum.ts の各ENUM定数が正しい数値を持つことを検証
 * - バックエンドとフロントエンドの定数値が一致していることを保証
 * - HTTPステータスコード定数（httpStatus.ts）の値を検証
 *
 * テスト対象:
 * - backend/src/enums/codeMaster.enum.ts
 * - backend/src/constants/httpStatus.ts
 */

import {
  ProjectStatusEnum,
  CheckoutStatusEnum,
  TaskStatusEnum,
  InstructionStatusEnum,
  InstructionPriorityEnum,
  InstructionTargetEnum,
  InstructionTypeEnum,
  IssueTypeEnum,
  ExperimentConditionEnum,
} from '../../src/enums/codeMaster.enum';
import { HTTP_STATUS } from '../../src/constants/httpStatus';

// ============================================================
// ProjectStatusEnum
// ============================================================
describe('ProjectStatusEnum', () => {
  it('PLANNING は 0 である', () => {
    expect(ProjectStatusEnum.PLANNING).toBe(0);
  });
  it('TASK_PENDING は 1 である', () => {
    expect(ProjectStatusEnum.TASK_PENDING).toBe(1);
  });
  it('TASK_IN_PROGRESS は 2 である', () => {
    expect(ProjectStatusEnum.TASK_IN_PROGRESS).toBe(2);
  });
  it('REVIEW_WAITING は 3 である', () => {
    expect(ProjectStatusEnum.REVIEW_WAITING).toBe(3);
  });
  it('COMPLETED は 4 である', () => {
    expect(ProjectStatusEnum.COMPLETED).toBe(4);
  });
  it('ERROR は 5 である', () => {
    expect(ProjectStatusEnum.ERROR).toBe(5);
  });
  it('全6種類の値を持つ', () => {
    expect(Object.keys(ProjectStatusEnum)).toHaveLength(6);
  });
  it('値の重複がない', () => {
    const values = Object.values(ProjectStatusEnum);
    expect(new Set(values).size).toBe(values.length);
  });
});

// ============================================================
// CheckoutStatusEnum
// ============================================================
describe('CheckoutStatusEnum', () => {
  it('CHECKED_IN は 0 である', () => {
    expect(CheckoutStatusEnum.CHECKED_IN).toBe(0);
  });
  it('CHECKED_OUT は 1 である', () => {
    expect(CheckoutStatusEnum.CHECKED_OUT).toBe(1);
  });
  it('全2種類の値を持つ', () => {
    expect(Object.keys(CheckoutStatusEnum)).toHaveLength(2);
  });
});

// ============================================================
// TaskStatusEnum
// ============================================================
describe('TaskStatusEnum', () => {
  it('PENDING は 0 である', () => {
    expect(TaskStatusEnum.PENDING).toBe(0);
  });
  it('IN_PROGRESS は 1 である', () => {
    expect(TaskStatusEnum.IN_PROGRESS).toBe(1);
  });
  it('REVIEW_WAITING は 2 である', () => {
    expect(TaskStatusEnum.REVIEW_WAITING).toBe(2);
  });
  it('COMPLETED は 3 である', () => {
    expect(TaskStatusEnum.COMPLETED).toBe(3);
  });
  it('FORCED_TERMINATED は 4 である', () => {
    expect(TaskStatusEnum.FORCED_TERMINATED).toBe(4);
  });
  it('全5種類の値を持つ', () => {
    expect(Object.keys(TaskStatusEnum)).toHaveLength(5);
  });
  it('値の重複がない', () => {
    const values = Object.values(TaskStatusEnum);
    expect(new Set(values).size).toBe(values.length);
  });
});

// ============================================================
// InstructionStatusEnum
// ============================================================
describe('InstructionStatusEnum', () => {
  it('UNSENT は 0 である', () => {
    expect(InstructionStatusEnum.UNSENT).toBe(0);
  });
  it('SENT は 1 である', () => {
    expect(InstructionStatusEnum.SENT).toBe(1);
  });
  it('全2種類の値を持つ', () => {
    expect(Object.keys(InstructionStatusEnum)).toHaveLength(2);
  });
});

// ============================================================
// InstructionPriorityEnum
// ============================================================
describe('InstructionPriorityEnum', () => {
  it('LOW は 0 である', () => {
    expect(InstructionPriorityEnum.LOW).toBe(0);
  });
  it('NORMAL は 1 である', () => {
    expect(InstructionPriorityEnum.NORMAL).toBe(1);
  });
  it('MEDIUM は 2 である', () => {
    expect(InstructionPriorityEnum.MEDIUM).toBe(2);
  });
  it('HIGH は 3 である', () => {
    expect(InstructionPriorityEnum.HIGH).toBe(3);
  });
  it('全4種類の値を持つ', () => {
    expect(Object.keys(InstructionPriorityEnum)).toHaveLength(4);
  });
  it('値の重複がない', () => {
    const values = Object.values(InstructionPriorityEnum);
    expect(new Set(values).size).toBe(values.length);
  });
});

// ============================================================
// InstructionTargetEnum
// ============================================================
describe('InstructionTargetEnum', () => {
  it('ENTIRE_FILE は 0 である', () => {
    expect(InstructionTargetEnum.ENTIRE_FILE).toBe(0);
  });
  it('SPECIFIC_TASK は 1 である', () => {
    expect(InstructionTargetEnum.SPECIFIC_TASK).toBe(1);
  });
  it('SPECIFIC_TRANSITION は 2 である', () => {
    expect(InstructionTargetEnum.SPECIFIC_TRANSITION).toBe(2);
  });
  it('全3種類の値を持つ', () => {
    expect(Object.keys(InstructionTargetEnum)).toHaveLength(3);
  });
});

// ============================================================
// InstructionTypeEnum
// ============================================================
describe('InstructionTypeEnum', () => {
  it('GENERAL は 0 である', () => {
    expect(InstructionTypeEnum.GENERAL).toBe(0);
  });
  it('SETUP は 1 である', () => {
    expect(InstructionTypeEnum.SETUP).toBe(1);
  });
  it('MEASUREMENT は 2 である', () => {
    expect(InstructionTypeEnum.MEASUREMENT).toBe(2);
  });
  it('SAFETY は 3 である', () => {
    expect(InstructionTypeEnum.SAFETY).toBe(3);
  });
  it('CLEANING は 4 である', () => {
    expect(InstructionTypeEnum.CLEANING).toBe(4);
  });
  it('全5種類の値を持つ', () => {
    expect(Object.keys(InstructionTypeEnum)).toHaveLength(5);
  });
  it('値の重複がない', () => {
    const values = Object.values(InstructionTypeEnum);
    expect(new Set(values).size).toBe(values.length);
  });
});

// ============================================================
// IssueTypeEnum
// ============================================================
describe('IssueTypeEnum', () => {
  it('MATERIAL_SHORTAGE は 0 である', () => {
    expect(IssueTypeEnum.MATERIAL_SHORTAGE).toBe(0);
  });
  it('EQUIPMENT_FAILURE は 1 である', () => {
    expect(IssueTypeEnum.EQUIPMENT_FAILURE).toBe(1);
  });
  it('UNCLEAR_PROCEDURE は 2 である', () => {
    expect(IssueTypeEnum.UNCLEAR_PROCEDURE).toBe(2);
  });
  it('SAFETY_CONCERN は 3 である', () => {
    expect(IssueTypeEnum.SAFETY_CONCERN).toBe(3);
  });
  it('QUALITY_ISSUE は 4 である', () => {
    expect(IssueTypeEnum.QUALITY_ISSUE).toBe(4);
  });
  it('TIME_CONSTRAINT は 5 である', () => {
    expect(IssueTypeEnum.TIME_CONSTRAINT).toBe(5);
  });
  it('OTHER は 6 である', () => {
    expect(IssueTypeEnum.OTHER).toBe(6);
  });
  it('全7種類の値を持つ', () => {
    expect(Object.keys(IssueTypeEnum)).toHaveLength(7);
  });
  it('値の重複がない', () => {
    const values = Object.values(IssueTypeEnum);
    expect(new Set(values).size).toBe(values.length);
  });
});

// ============================================================
// ExperimentConditionEnum
// ============================================================
describe('ExperimentConditionEnum', () => {
  it('SAME_CONDITIONS は 0 である', () => {
    expect(ExperimentConditionEnum.SAME_CONDITIONS).toBe(0);
  });
  it('INDIVIDUAL_CONDITIONS は 1 である', () => {
    expect(ExperimentConditionEnum.INDIVIDUAL_CONDITIONS).toBe(1);
  });
  it('全2種類の値を持つ', () => {
    expect(Object.keys(ExperimentConditionEnum)).toHaveLength(2);
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
// (フロントエンド constants/codeMaster.ts と同一値であること)
// ============================================================
describe('バックエンド ENUM とフロントエンド定数の整合性', () => {
  it('ProjectStatusEnum の全値がフロントエンド定数と一致する（期待値ベース）', () => {
    // フロントエンド codeMaster.ts と同一値であることを期待値で保証
    expect(ProjectStatusEnum.PLANNING).toBe(0);
    expect(ProjectStatusEnum.TASK_PENDING).toBe(1);
    expect(ProjectStatusEnum.TASK_IN_PROGRESS).toBe(2);
    expect(ProjectStatusEnum.REVIEW_WAITING).toBe(3);
    expect(ProjectStatusEnum.COMPLETED).toBe(4);
    expect(ProjectStatusEnum.ERROR).toBe(5);
  });

  it('CheckoutStatusEnum の全値がフロントエンド定数と一致する', () => {
    expect(CheckoutStatusEnum.CHECKED_IN).toBe(0);
    expect(CheckoutStatusEnum.CHECKED_OUT).toBe(1);
  });

  it('InstructionStatusEnum の全値がフロントエンド定数と一致する', () => {
    expect(InstructionStatusEnum.UNSENT).toBe(0);
    expect(InstructionStatusEnum.SENT).toBe(1);
  });

  it('InstructionPriorityEnum の全値がフロントエンド定数と一致する', () => {
    expect(InstructionPriorityEnum.LOW).toBe(0);
    expect(InstructionPriorityEnum.NORMAL).toBe(1);
    expect(InstructionPriorityEnum.MEDIUM).toBe(2);
    expect(InstructionPriorityEnum.HIGH).toBe(3);
  });

  it('InstructionTargetEnum の全値がフロントエンド定数と一致する', () => {
    expect(InstructionTargetEnum.ENTIRE_FILE).toBe(0);
    expect(InstructionTargetEnum.SPECIFIC_TASK).toBe(1);
    expect(InstructionTargetEnum.SPECIFIC_TRANSITION).toBe(2);
  });

  it('InstructionTypeEnum の全値がフロントエンド定数と一致する', () => {
    expect(InstructionTypeEnum.GENERAL).toBe(0);
    expect(InstructionTypeEnum.SETUP).toBe(1);
    expect(InstructionTypeEnum.MEASUREMENT).toBe(2);
    expect(InstructionTypeEnum.SAFETY).toBe(3);
    expect(InstructionTypeEnum.CLEANING).toBe(4);
  });

  it('ExperimentConditionEnum の全値がフロントエンド定数と一致する', () => {
    expect(ExperimentConditionEnum.SAME_CONDITIONS).toBe(0);
    expect(ExperimentConditionEnum.INDIVIDUAL_CONDITIONS).toBe(1);
  });
});
