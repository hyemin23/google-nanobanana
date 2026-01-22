
import { PosePreset, PosePresetFamily } from '../types';

/**
 * 12 Presets Auto Generator v1.0
 * 
 * 역할을 명확히:
 * 기본 포즈 정의를 입력받아 안전 규칙을 적용하고 중복을 제거하여
 * 최종 라이브러리(CONSTANTS)에 등록할 JSON 객체를 생성한다.
 */

// 1. Global Constraints (전역 안전 규칙)
const GLOBAL_SAFE_RANGES = {
  body_rotation_deg: [-20, 20],
  torso_tilt_deg: [-10, 10],
  arm_raise_deg: [0, 35],
  elbow_bend_deg: [0, 60],
};

const FORBIDDEN_PATTERNS = [
  'arms_crossed',
  'hands_cover_chest_area',
  'deep_pockets',
  'legs_crossed_tightly'
];

// Helper: Clamping function
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

// Helper: Preset Factory
const createPreset = (
  idSuffix: string,
  family: PosePresetFamily,
  nameKo: string,
  nameEn: string,
  icon: string,
  params: {
    rotation: number;
    arm: string;
    leg?: string;
    weight?: string;
    head?: 'full' | 'optional' | 'none';
    desc: string;
    tags: string[];
    use: ('detail_page' | 'thumbnail')[];
    ctr: number;
    micro?: number;
  }
): PosePreset => {
  // Safety Clamp Enforcement
  const safeRotation = clamp(params.rotation, GLOBAL_SAFE_RANGES.body_rotation_deg[0], GLOBAL_SAFE_RANGES.body_rotation_deg[1]);

  return {
    id: `POSE_${family === 'COMMERCE_SAFE' ? 'COM_SAFE' : family === 'CROP_FOCUS' ? 'CROP' : 'RECOVERY'}_${idSuffix}`,
    version: '1.0.0',
    family,
    name_ko: nameKo,
    name_en: nameEn,
    ui: {
      icon,
      tags_ko: params.tags,
      recommended_for: params.use
    },
    intent: {
      goal: 'conversion',
      risk_level: 'low'
    },
    skeleton_template: {
      pose_signature: {
        body_rotation_deg: safeRotation,
        arm_state: params.arm,
        leg_state: params.leg || 'neutral',
        weight_shift: params.weight || 'center',
        head_visibility: params.head || 'optional',
        description: params.desc
      }
    },
    safety_constraints: {
      safe_ranges: {
        body_rotation: [safeRotation - 5, safeRotation + 5],
        arm_raise: GLOBAL_SAFE_RANGES.arm_raise_deg,
      },
      forbidden_rules: FORBIDDEN_PATTERNS
    },
    micro_variation: {
      enabled: !!params.micro,
      level: params.micro || 0
    },
    scoring_priors: {
      ctr_expected: params.ctr
    }
  };
};

export class PosePresetGenerator {
  
  static generateCommerceSafe(): PosePreset[] {
    return [
      createPreset('001', 'COMMERCE_SAFE', '정면 차렷', 'Front Neutral Stand', '🧍', {
        rotation: 0, arm: 'resting_sides', weight: 'center', desc: 'Front view, standing straight, arms naturally at sides.',
        tags: ['국룰', '전신', '안정'], use: ['detail_page', 'thumbnail'], ctr: 0.9, micro: 0.1
      }),
      createPreset('002', 'COMMERCE_SAFE', '좌측 15도 차렷', 'Left 15 Deg Stand', '↙️', {
        rotation: -15, arm: 'resting', weight: 'center', desc: 'Body rotated 15 degrees left, showing side fit.',
        tags: ['입체감', '핏강조'], use: ['detail_page'], ctr: 0.85, micro: 0.12
      }),
      createPreset('003', 'COMMERCE_SAFE', '우측 15도 차렷', 'Right 15 Deg Stand', '↘️', {
        rotation: 15, arm: 'resting', weight: 'center', desc: 'Body rotated 15 degrees right, showing side fit.',
        tags: ['입체감', '핏강조'], use: ['detail_page'], ctr: 0.85, micro: 0.12
      }),
      createPreset('004', 'COMMERCE_SAFE', '체중 오른발', 'Weight Shift Right', '🚶', {
        rotation: 0, arm: 'resting', leg: 'weight_right', weight: 'right', desc: 'Standing with weight shifted to right leg, natural vibe.',
        tags: ['자연스러움'], use: ['detail_page'], ctr: 0.82, micro: 0.15
      }),
      createPreset('005', 'COMMERCE_SAFE', '손 미세 변형', 'Hand Variation', '🤚', {
        rotation: 0, arm: 'slight_bend', weight: 'center', desc: 'Hands slightly bent or active to show sleeve detail.',
        tags: ['디테일', '소매'], use: ['detail_page'], ctr: 0.80, micro: 0.18
      })
    ];
  }

  static generateCropFocus(): PosePreset[] {
    return [
      createPreset('001', 'CROP_FOCUS', '상반신 정면', 'Upper Body Front', '👤', {
        rotation: 0, arm: 'resting', head: 'none', desc: 'Upper body crop, facing forward, focus on torso.',
        tags: ['상반신', '크롭'], use: ['detail_page'], ctr: 0.88
      }),
      createPreset('002', 'CROP_FOCUS', '상반신 좌측 15도', 'Upper Body Left 15', '🌔', {
        rotation: -15, arm: 'resting', head: 'none', desc: 'Upper body crop, rotated left.',
        tags: ['상반신', '각도'], use: ['detail_page'], ctr: 0.85
      }),
      createPreset('003', 'CROP_FOCUS', '상반신 우측 15도', 'Upper Body Right 15', '🌖', {
        rotation: 15, arm: 'resting', head: 'none', desc: 'Upper body crop, rotated right.',
        tags: ['상반신', '각도'], use: ['detail_page'], ctr: 0.85
      }),
      createPreset('004', 'CROP_FOCUS', '하반신 정면', 'Lower Body Front', '👖', {
        rotation: 0, arm: 'hidden', leg: 'step_slight', head: 'none', desc: 'Lower body crop, slight step width.',
        tags: ['하반신', '바지핏'], use: ['detail_page'], ctr: 0.83
      }),
      createPreset('005', 'CROP_FOCUS', '하반신 측면', 'Lower Body Side', '🦵', {
        rotation: 15, arm: 'hidden', leg: 'neutral', head: 'none', desc: 'Lower body crop, side silhouette.',
        tags: ['하반신', '실루엣'], use: ['detail_page'], ctr: 0.80
      })
    ];
  }

  static generateRecovery(): PosePreset[] {
    return [
      createPreset('001', 'RECOVERY', '기본 안전 포즈', 'Normalize Base', '🩹', {
        rotation: 0, arm: 'resting', head: 'none', desc: 'Reset to safe standard pose. Use this to fix broken generations.',
        tags: ['복구', '초기화'], use: ['detail_page'], ctr: 0.9
      }),
      createPreset('002', 'RECOVERY', '목짤 안전 포즈', 'Safety Headless', '✂️', {
        rotation: 0, arm: 'resting', head: 'none', desc: 'Force headless crop with standard pose. Maximum safety.',
        tags: ['얼굴제거', '안전'], use: ['detail_page'], ctr: 0.88
      })
    ];
  }

  static generateAll(): PosePreset[] {
    return [
      ...this.generateCommerceSafe(),
      ...this.generateCropFocus(),
      ...this.generateRecovery()
    ];
  }
}
