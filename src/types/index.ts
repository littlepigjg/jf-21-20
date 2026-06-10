export interface Frame {
  id: string;
  imageData: ImageData;
  delay: number;
  width: number;
  height: number;
  disposalMethod: number;
}

export interface Caption {
  id: string;
  text: string;
  frameRange: [number, number];
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  strokeColor: string;
  strokeWidth: number;
  align: 'left' | 'center' | 'right';
}

export interface CropConfig {
  enabled: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ExportConfig {
  colors: number;
  quality: number;
  fps: number;
  dither: boolean;
  repeat: number;
  width: number;
  height: number;
}

export interface FrameDifference {
  index: number;
  nextIndex: number;
  avgPixelDiff: number;
  maxPixelDiff: number;
  changedPixelRatio: number;
  edgeChangeRatio: number;
  motionVector: { x: number; y: number };
  colorHistogramDiff: number[];
}

export interface LoopAnalysisResult {
  smoothnessScore: number;
  firstLastFrameDiff: FrameDifference;
  allFrameDiffs: FrameDifference[];
  avgFrameDiff: number;
  stdFrameDiff: number;
  isPerfectLoop: boolean;
  abruptTransitions: number[];
  recommendations: LoopRecommendation[];
}

export interface LoopRecommendation {
  type: 'delay' | 'frame' | 'blend' | 'crossfade' | 'general';
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  applied: boolean;
}

export interface LoopOptimizeConfig {
  enabled: boolean;
  autoAdjustDelays: boolean;
  addBlendFrames: boolean;
  crossfadeStrength: number;
  targetSmoothness: number;
}

export interface EditorState {
  frames: Frame[];
  selectedFrameIndex: number;
  captions: Caption[];
  crop: CropConfig;
  exportConfig: ExportConfig;
  isPlaying: boolean;
  playbackSpeed: number;
  currentFrameIndex: number;
  canvasWidth: number;
  canvasHeight: number;
  loopAnalysis: LoopAnalysisResult | null;
  loopOptimizeConfig: LoopOptimizeConfig;
  isAnalyzingLoop: boolean;
}
