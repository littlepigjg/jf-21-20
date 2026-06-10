import type { Frame, FrameDifference, LoopAnalysisResult, LoopRecommendation } from '@/types';
import { cloneImageData, generateId } from './imageUtils';

const HISTOGRAM_BINS = 16;
const EDGE_THRESHOLD = 30;
const PIXEL_CHANGE_THRESHOLD = 15;

export function computeFrameDifference(
  frame1: ImageData,
  frame2: ImageData,
  index: number,
  nextIndex: number
): FrameDifference {
  const width = Math.min(frame1.width, frame2.width);
  const height = Math.min(frame1.height, frame2.height);
  const data1 = frame1.data;
  const data2 = frame2.data;

  let totalDiff = 0;
  let maxDiff = 0;
  let changedPixels = 0;
  let edgeChanges = 0;
  let totalEdgePixels = 0;

  const hist1 = computeHistogram(frame1);
  const hist2 = computeHistogram(frame2);
  const histDiff: number[] = [];
  for (let i = 0; i < hist1.length; i++) {
    histDiff.push(Math.abs(hist1[i] - hist2[i]));
  }

  let motionX = 0;
  let motionY = 0;
  let motionSamples = 0;
  const searchRadius = 4;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r1 = data1[idx];
      const g1 = data1[idx + 1];
      const b1 = data1[idx + 2];
      const r2 = data2[idx];
      const g2 = data2[idx + 1];
      const b2 = data2[idx + 2];

      const dr = r1 - r2;
      const dg = g1 - g2;
      const db = b1 - b2;
      const diff = Math.sqrt(dr * dr + dg * dg + db * db);

      totalDiff += diff;
      if (diff > maxDiff) maxDiff = diff;
      if (diff > PIXEL_CHANGE_THRESHOLD) changedPixels++;

      let localMaxDiff = diff;
      let bestDx = 0;
      let bestDy = 0;
      for (let dy = -searchRadius; dy <= searchRadius; dy++) {
        for (let dx = -searchRadius; dx <= searchRadius; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
          const nIdx = (ny * width + nx) * 4;
          const nr2 = data2[nIdx];
          const ng2 = data2[nIdx + 1];
          const nb2 = data2[nIdx + 2];
          const ndr = r1 - nr2;
          const ndg = g1 - ng2;
          const ndb = b1 - nb2;
          const ndiff = Math.sqrt(ndr * ndr + ndg * ndg + ndb * ndb);
          if (ndiff < localMaxDiff) {
            localMaxDiff = ndiff;
            bestDx = dx;
            bestDy = dy;
          }
        }
      }
      if (bestDx !== 0 || bestDy !== 0) {
        motionX += bestDx;
        motionY += bestDy;
        motionSamples++;
      }

      if (y > 0 && y < height - 1 && x > 0 && x < width - 1) {
        const leftIdx = (y * width + (x - 1)) * 4;
        const rightIdx = (y * width + (x + 1)) * 4;
        const upIdx = ((y - 1) * width + x) * 4;
        const downIdx = ((y + 1) * width + x) * 4;

        const edgeMag1 =
          Math.abs(data1[leftIdx] - data1[rightIdx]) +
          Math.abs(data1[upIdx] - data1[downIdx]);
        const edgeMag2 =
          Math.abs(data2[leftIdx] - data2[rightIdx]) +
          Math.abs(data2[upIdx] - data2[downIdx]);

        if (edgeMag1 > EDGE_THRESHOLD || edgeMag2 > EDGE_THRESHOLD) {
          totalEdgePixels++;
          if (Math.abs(edgeMag1 - edgeMag2) > EDGE_THRESHOLD) {
            edgeChanges++;
          }
        }
      }
    }
  }

  const totalPixels = width * height;

  return {
    index,
    nextIndex,
    avgPixelDiff: totalDiff / totalPixels,
    maxPixelDiff: maxDiff,
    changedPixelRatio: changedPixels / totalPixels,
    edgeChangeRatio: totalEdgePixels > 0 ? edgeChanges / totalEdgePixels : 0,
    motionVector: {
      x: motionSamples > 0 ? motionX / motionSamples : 0,
      y: motionSamples > 0 ? motionY / motionSamples : 0,
    },
    colorHistogramDiff: histDiff,
  };
}

function computeHistogram(imageData: ImageData): number[] {
  const binsPerChannel = HISTOGRAM_BINS;
  const totalBins = binsPerChannel * 3;
  const histogram = new Array(totalBins).fill(0);
  const data = imageData.data;
  const totalPixels = imageData.width * imageData.height;
  const binSize = 256 / binsPerChannel;

  for (let i = 0; i < data.length; i += 4) {
    const r = Math.min(binsPerChannel - 1, Math.floor(data[i] / binSize));
    const g = Math.min(binsPerChannel - 1, Math.floor(data[i + 1] / binSize));
    const b = Math.min(binsPerChannel - 1, Math.floor(data[i + 2] / binSize));
    histogram[r]++;
    histogram[binsPerChannel + g]++;
    histogram[binsPerChannel * 2 + b]++;
  }

  for (let i = 0; i < totalBins; i++) {
    histogram[i] /= totalPixels;
  }

  return histogram;
}

export function analyzeLoop(frames: Frame[]): LoopAnalysisResult {
  if (frames.length < 2) {
    return {
      smoothnessScore: 0,
      firstLastFrameDiff: createEmptyDiff(0, 0),
      allFrameDiffs: [],
      avgFrameDiff: 0,
      stdFrameDiff: 0,
      isPerfectLoop: false,
      abruptTransitions: [],
      recommendations: [],
    };
  }

  const allFrameDiffs: FrameDifference[] = [];
  for (let i = 0; i < frames.length; i++) {
    const nextIndex = (i + 1) % frames.length;
    allFrameDiffs.push(
      computeFrameDifference(frames[i].imageData, frames[nextIndex].imageData, i, nextIndex)
    );
  }

  const firstLastFrameDiff = allFrameDiffs[allFrameDiffs.length - 1];

  const avgDiffs = allFrameDiffs.map((d) => d.avgPixelDiff);
  const avgFrameDiff = avgDiffs.reduce((a, b) => a + b, 0) / avgDiffs.length;
  const variance =
    avgDiffs.reduce((sum, val) => sum + Math.pow(val - avgFrameDiff, 2), 0) / avgDiffs.length;
  const stdFrameDiff = Math.sqrt(variance);

  const meanAllDiffs = avgFrameDiff;
  const abruptThreshold = meanAllDiffs + stdFrameDiff * 1.5;
  const abruptTransitions = allFrameDiffs
    .filter((d) => d.avgPixelDiff > abruptThreshold)
    .map((d) => d.index);

  const firstLastDiff = firstLastFrameDiff.avgPixelDiff;
  const transitionConsistency = stdFrameDiff > 0 ? 1 / (1 + stdFrameDiff / meanAllDiffs) : 1;
  const loopContinuity = 1 / (1 + firstLastDiff / (meanAllDiffs || 1));
  const changeRatio = 1 - firstLastFrameDiff.changedPixelRatio;
  const edgeStability = 1 - firstLastFrameDiff.edgeChangeRatio;

  const smoothnessScore = Math.max(
    0,
    Math.min(
      100,
      (transitionConsistency * 30 + loopContinuity * 40 + changeRatio * 20 + edgeStability * 10) *
        100
    )
  );

  const isPerfectLoop =
    firstLastDiff < 2 && firstLastFrameDiff.changedPixelRatio < 0.01 && smoothnessScore >= 95;

  const recommendations = generateRecommendations(
    frames,
    allFrameDiffs,
    firstLastFrameDiff,
    smoothnessScore,
    abruptTransitions
  );

  return {
    smoothnessScore,
    firstLastFrameDiff,
    allFrameDiffs,
    avgFrameDiff,
    stdFrameDiff,
    isPerfectLoop,
    abruptTransitions,
    recommendations,
  };
}

function createEmptyDiff(index: number, nextIndex: number): FrameDifference {
  return {
    index,
    nextIndex,
    avgPixelDiff: 0,
    maxPixelDiff: 0,
    changedPixelRatio: 0,
    edgeChangeRatio: 0,
    motionVector: { x: 0, y: 0 },
    colorHistogramDiff: new Array(HISTOGRAM_BINS * 3).fill(0),
  };
}

function generateRecommendations(
  frames: Frame[],
  allFrameDiffs: FrameDifference[],
  firstLastDiff: FrameDifference,
  smoothnessScore: number,
  abruptTransitions: number[]
): LoopRecommendation[] {
  const recommendations: LoopRecommendation[] = [];

  if (smoothnessScore >= 90) {
    recommendations.push({
      type: 'general',
      severity: 'low',
      title: '循环效果良好',
      description: '当前动画循环已经非常平滑自然，无需额外优化。',
      applied: true,
    });
    return recommendations;
  }

  if (firstLastDiff.avgPixelDiff > 15 || firstLastDiff.changedPixelRatio > 0.25) {
    recommendations.push({
      type: 'blend',
      severity: firstLastDiff.changedPixelRatio > 0.5 ? 'high' : 'medium',
      title: '添加首尾帧过渡帧',
      description: `首帧和末帧差异较大（像素变化率 ${(firstLastDiff.changedPixelRatio * 100).toFixed(1)}%），建议在首尾之间添加混合过渡帧使循环更自然。`,
      applied: false,
    });
  }

  if (abruptTransitions.length > 0) {
    recommendations.push({
      type: 'delay',
      severity: abruptTransitions.length > 3 ? 'high' : 'medium',
      title: '调整突变帧的延迟时间',
      description: `检测到 ${abruptTransitions.length} 处突变过渡（帧 ${abruptTransitions.map((i) => i + 1).join(', ')}），建议增加这些位置的帧延迟或添加过渡帧。`,
      applied: false,
    });
  }

  const delays = frames.map((f) => f.delay);
  const avgDelay = delays.reduce((a, b) => a + b, 0) / delays.length;
  const delayVariance =
    delays.reduce((sum, d) => sum + Math.pow(d - avgDelay, 2), 0) / delays.length;
  const delayStd = Math.sqrt(delayVariance);

  if (delayStd > avgDelay * 0.5) {
    recommendations.push({
      type: 'delay',
      severity: 'low',
      title: '统一帧延迟时间',
      description: `帧延迟时间差异较大（标准差 ${delayStd.toFixed(0)}ms），统一延迟可获得更稳定的循环节奏。`,
      applied: false,
    });
  }

  if (firstLastDiff.motionVector.x !== 0 || firstLastDiff.motionVector.y !== 0) {
    recommendations.push({
      type: 'crossfade',
      severity: 'medium',
      title: '启用首尾交叉淡化',
      description: `检测到首尾帧存在运动偏移（X: ${firstLastDiff.motionVector.x.toFixed(1)}, Y: ${firstLastDiff.motionVector.y.toFixed(1)}），交叉淡化可以掩盖运动不连续。`,
      applied: false,
    });
  }

  if (frames.length < 8) {
    recommendations.push({
      type: 'frame',
      severity: 'low',
      title: '增加帧数量',
      description: `当前只有 ${frames.length} 帧，更多的中间帧可以让循环动画更加流畅自然。`,
      applied: false,
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      type: 'general',
      severity: 'low',
      title: '轻微优化建议',
      description: '动画整体循环效果不错，可根据预览效果微调帧延迟获得更好的观感。',
      applied: true,
    });
  }

  return recommendations.sort((a, b) => {
    const severityOrder = { high: 0, medium: 1, low: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}

export function blendImageData(img1: ImageData, img2: ImageData, alpha: number): ImageData {
  const width = Math.min(img1.width, img2.width);
  const height = Math.min(img1.height, img2.height);
  const result = new ImageData(width, height);
  const data1 = img1.data;
  const data2 = img2.data;
  const out = result.data;

  for (let i = 0; i < width * height * 4; i += 4) {
    out[i] = Math.round(data1[i] * (1 - alpha) + data2[i] * alpha);
    out[i + 1] = Math.round(data1[i + 1] * (1 - alpha) + data2[i + 1] * alpha);
    out[i + 2] = Math.round(data1[i + 2] * (1 - alpha) + data2[i + 2] * alpha);
    out[i + 3] = Math.round(data1[i + 3] * (1 - alpha) + data2[i + 3] * alpha);
  }

  return result;
}

export interface OptimizeOptions {
  addBlendFrames: boolean;
  blendFrameCount: number;
  autoAdjustDelays: boolean;
  crossfadeStrength: number;
}

export function optimizeLoop(frames: Frame[], options: OptimizeOptions): Frame[] {
  if (frames.length < 2) return frames;

  let result = frames.map((f) => ({ ...f, imageData: cloneImageData(f.imageData) }));

  if (options.autoAdjustDelays) {
    const analysis = analyzeLoop(result);
    const avgDelay = result.reduce((sum, f) => sum + f.delay, 0) / result.length;

    result = result.map((frame, index) => {
      const diff = analysis.allFrameDiffs[index];
      if (!diff) return frame;

      const diffFactor = diff.avgPixelDiff / (analysis.avgFrameDiff || 1);
      const newDelay = Math.round(Math.max(20, Math.min(500, avgDelay * Math.min(diffFactor, 2))));
      return { ...frame, delay: newDelay };
    });

    const lastDelay = result[result.length - 1].delay;
    const firstLastDiff = analysis.firstLastFrameDiff;
    const extraDelay = Math.round(firstLastDiff.avgPixelDiff * 2);
    result[result.length - 1].delay = Math.min(1000, lastDelay + extraDelay);
  }

  if (options.addBlendFrames && options.blendFrameCount > 0) {
    const lastFrame = result[result.length - 1];
    const firstFrame = result[0];
    const blendFrames: Frame[] = [];
    const count = options.blendFrameCount;

    for (let i = 1; i <= count; i++) {
      const alpha = i / (count + 1);
      const blended = blendImageData(lastFrame.imageData, firstFrame.imageData, alpha);
      blendFrames.push({
        id: generateId(),
        imageData: blended,
        delay: Math.round(lastFrame.delay / 2),
        width: blended.width,
        height: blended.height,
        disposalMethod: 2,
      });
    }

    result = [...result, ...blendFrames];
  }

  if (options.crossfadeStrength > 0 && options.crossfadeStrength <= 1) {
    const lastFrame = result[result.length - 1];
    const firstFrame = result[0];
    const crossfadedLast = blendImageData(
      lastFrame.imageData,
      firstFrame.imageData,
      options.crossfadeStrength * 0.3
    );
    result[result.length - 1] = {
      ...lastFrame,
      imageData: crossfadedLast,
    };
  }

  return result;
}
