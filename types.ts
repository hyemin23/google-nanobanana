
// @google/genai Resolution and AspectRatio types
export type Resolution = '1K' | '2K' | '4K';
export type Quality = Resolution; 
export type AspectRatio = '1:1' | '9:16' | '4:3' | '16:9';
export type Gender = 'Male' | 'Female';
export type ViewMode = 'top' | 'full' | 'bottom';
export type FaceMode = 'ON' | 'OFF';
export type FitSubMode = 'pose-change' | 'fitting-variation' | 'background-change' | 'detail-extra' | 'partial-edit' | 'paint-garment-color' | 'top-design-replace' | 'commercial-pose' | 'smart-pose-ref';

// Updated GenerationConfig to include all properties used in the app
export interface GenerationConfig {
  freePrompt: string;
  locationIds?: string[];
  quality: Resolution;
  aspectRatio: AspectRatio;
  gender: Gender;
  imageFile: File | null;
}

export interface ProductInfo {
  name: string;
  originalPrice: string;
  salePrice: string;
  category: string;
  merchantInfo: string;
  features: string;
  targetGender: string[];
  targetAge: string[];
}

export interface DetailImageSegment {
  id: string;
  title: string;
  logicalSection: string;
  keyMessage: string;
  visualPrompt: string;
  imageUrl?: string;
  isGenerating?: boolean;
}

export type PageLength = '5' | '7' | '9' | 'auto';

export interface SizeData {
  shoulder?: string;
  chest?: string;
  sleeve?: string;
  length?: string;
  waist?: string;
  hip?: string;
  thigh?: string;
  hem?: string;
}

export interface AnalysisResult {
  category: string;
  fit: string;
  materialType: string;
  color?: string;
}

export interface PoseDefinition {
  id: string;
  name: string;
  prompt: string;
}

export interface TopDesignAnalysis {
  level: 'L1' | 'L2' | 'L3';
  reason: string;
  baseCategory?: string;
  refCategory?: string;
}

export type QCStatus = 'RECOMMENDED' | 'USABLE' | 'NOT_RECOMMENDED';

export interface QCAnalysis {
  status: QCStatus;
  score: number;
  rejectReasons: string[];
  signature: {
    rotation: number;
    armState: string;
  };
  details: {
    faceConfidence: number;
    bodyRatio: number;
    centering: number;
    total?: number;
  };
}

export interface CommercialPoseResult {
  id: string;
  url: string;
  qc: QCAnalysis | null;
  status: 'generating' | 'analyzing' | 'success' | 'failed';
  error?: string;
  // For Smart Pose v2
  isFallback?: boolean;
  fallbackReason?: string;
  appliedPreset?: string;
  sourceType?: 'preset' | 'custom'; // Added source type
  sourceName?: string; // Added source name
}

// Smart Pose v2 Types
export interface PoseSafetyAnalysis {
  isSafe: boolean;
  riskLevel: 'SAFE' | 'WARNING' | 'DANGER';
  issues: string[]; // e.g., "EXTREME_ARM_ANGLE", "TORSO_OCCLUSION"
  fallbackRecommended: boolean;
  reason: string;
}

// Smart Pose Engine v2.5+ Configuration
export interface SmartPoseV25Config {
  hand_config?: {
    state: 'one_hand_pocket' | 'arms_crossed' | 'natural';
    pocket_zone_definition?: {
      ref_joint: 'left_hip' | 'right_hip';
      offset_x_ratio: number; // 0.05
      offset_y_ratio: number; // 0.15
    };
    mask_priority: 'override_skeleton' | 'standard'; // Mask > Skeleton rule
  };
  walk_config?: {
    mode: 'micro_walk' | 'static';
    max_stride_ratio: number; // 0.05 (5% of height)
    static_validation: boolean; // Force center of mass check
  };
  depth_config?: {
    scope: 'arms_only' | 'full_body'; // Depth map restriction
  };
  safety_clamp?: {
    enabled: boolean;
    max_knee_bend: number; // 15 deg
    min_elbow_angle: number; // 80 deg
  };
}

export type PosePresetFamily = 'COMMERCE_SAFE' | 'CROP_FOCUS' | 'RECOVERY' | 'ANGLE_SET' | 'DETAIL_EMPHASIS' | 'LOWER_BODY_FOCUS';

export interface PosePreset {
  id: string;
  version: string;
  family: PosePresetFamily;
  name_ko: string;
  name_en: string;
  ui: {
    icon: string; // Emoji or Icon name
    tags_ko: string[];
    recommended_for: ('detail_page' | 'thumbnail')[];
  };
  intent: {
    goal: string;
    risk_level: 'low' | 'medium' | 'high';
  };
  skeleton_template: {
    pose_signature: {
      body_rotation_deg: number;
      arm_state: string;
      leg_state?: string;
      weight_shift?: string;
      head_visibility?: 'full' | 'optional' | 'none';
      description: string;
    };
  };
  safety_constraints: {
    safe_ranges: {
        body_rotation?: number[];
        arm_raise?: number[];
        torso_tilt?: number[];
        [key: string]: number[] | undefined;
    };
    forbidden_rules: string[];
  };
  micro_variation?: {
    enabled: boolean;
    level: number;
  };
  scoring_priors: {
    ctr_expected: number;
  };
  // v2.5+ Engine Config Mapping
  v25_engine_config?: SmartPoseV25Config;
}
