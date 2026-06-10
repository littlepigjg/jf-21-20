import { useState } from 'react';
import {
  RefreshCw,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Image as ImageIcon,
  Wand2,
  ChevronDown,
  ChevronUp,
  Info,
  Activity,
  Zap,
} from 'lucide-react';
import { useEditorStore } from '@/stores/editorStore';
import { cn } from '@/lib/utils';

function getScoreColor(score: number): string {
  if (score >= 90) return 'text-emerald-400';
  if (score >= 70) return 'text-cyan-400';
  if (score >= 50) return 'text-yellow-400';
  return 'text-orange-400';
}

function getScoreBgColor(score: number): string {
  if (score >= 90) return 'bg-emerald-500';
  if (score >= 70) return 'bg-cyan-500';
  if (score >= 50) return 'bg-yellow-500';
  return 'bg-orange-500';
}

function getSeverityColor(severity: 'low' | 'medium' | 'high'): string {
  switch (severity) {
    case 'high':
      return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
    case 'medium':
      return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
    default:
      return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
  }
}

function getSeverityIcon(severity: 'low' | 'medium' | 'high') {
  switch (severity) {
    case 'high':
      return <AlertTriangle className="w-4 h-4" />;
    case 'medium':
      return <Info className="w-4 h-4" />;
    default:
      return <CheckCircle2 className="w-4 h-4" />;
  }
}

function getTypeIcon(type: string) {
  switch (type) {
    case 'delay':
      return <Clock className="w-3.5 h-3.5" />;
    case 'frame':
      return <ImageIcon className="w-3.5 h-3.5" />;
    case 'blend':
      return <Sparkles className="w-3.5 h-3.5" />;
    case 'crossfade':
      return <Zap className="w-3.5 h-3.5" />;
    default:
      return <Info className="w-3.5 h-3.5" />;
  }
}

function ScoreDisplay({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 42;
  const progress = (score / 100) * circumference;
  const offset = circumference - progress;

  return (
    <div className="flex items-center gap-4">
      <div className="relative w-24 h-24">
        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="42"
            strokeWidth="8"
            fill="none"
            className="stroke-slate-700"
          />
          <circle
            cx="50"
            cy="50"
            r="42"
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            className={getScoreBgColor(score).replace('bg-', 'stroke-')}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.5s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn('text-2xl font-bold font-mono', getScoreColor(score))}>
            {score.toFixed(0)}
          </span>
          <span className="text-xs text-slate-500">/ 100</span>
        </div>
      </div>
      <div className="flex-1 space-y-1">
        <div className="text-sm font-medium text-slate-200">循环平滑度</div>
        <div className={cn('text-xs', getScoreColor(score))}>
          {score >= 90
            ? '完美循环，非常流畅'
            : score >= 70
              ? '良好，轻微优化效果更佳'
              : score >= 50
                ? '一般，存在明显跳变'
                : '较差，需要优化'}
        </div>
      </div>
    </div>
  );
}

export default function LoopOptimizerPanel() {
  const {
    frames,
    loopAnalysis,
    loopOptimizeConfig,
    setLoopOptimizeConfig,
    analyzeLoopFrames,
    applyLoopOptimization,
    isAnalyzingLoop,
  } = useEditorStore();

  const [blendCount, setBlendCount] = useState(3);
  const [showDetails, setShowDetails] = useState(false);

  const handleAnalyze = () => {
    analyzeLoopFrames();
  };

  const handleOptimize = () => {
    applyLoopOptimization(blendCount);
  };

  if (frames.length < 2) {
    return (
      <div className="px-4 pb-4">
        <div className="flex items-center gap-2 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
          <Info className="w-4 h-4 text-slate-500 flex-shrink-0" />
          <p className="text-xs text-slate-500">请至少导入2帧后进行循环分析</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pb-4 space-y-4">
      <div className="flex gap-2">
        <button
          onClick={handleAnalyze}
          disabled={isAnalyzingLoop}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
        >
          <RefreshCw className={cn('w-4 h-4', isAnalyzingLoop && 'animate-spin')} />
          {loopAnalysis ? '重新分析' : '分析循环'}
        </button>
        <button
          onClick={handleOptimize}
          disabled={!loopAnalysis || isAnalyzingLoop}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Wand2 className="w-4 h-4" />
          一键优化
        </button>
      </div>

      {loopAnalysis ? (
        <>
          <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
            <ScoreDisplay score={loopAnalysis.smoothnessScore} />
          </div>

          {loopAnalysis.isPerfectLoop && (
            <div className="flex items-center gap-2 p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span className="text-xs text-emerald-400">检测到完美循环！首尾帧衔接自然</span>
            </div>
          )}

          {loopAnalysis.abruptTransitions.length > 0 && (
            <div className="flex items-start gap-2 p-3 bg-orange-500/10 rounded-lg border border-orange-500/30">
              <AlertTriangle className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-medium text-orange-400">
                  检测到 {loopAnalysis.abruptTransitions.length} 处突变
                </div>
                <div className="text-xs text-orange-300/70 mt-0.5">
                  帧位置: {loopAnalysis.abruptTransitions.map((i) => i + 1).join(', ')}
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-medium text-slate-200">优化建议</span>
              </div>
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="p-1 hover:bg-slate-700 rounded transition-colors"
              >
                {showDetails ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </button>
            </div>

            <div className="space-y-2">
              {loopAnalysis.recommendations.map((rec, idx) => (
                <div
                  key={idx}
                  className={cn('p-2.5 rounded-lg border', getSeverityColor(rec.severity))}
                >
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5">{getSeverityIcon(rec.severity)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        {getTypeIcon(rec.type)}
                        <span className="text-xs font-medium">{rec.title}</span>
                      </div>
                      <p className="text-xs opacity-75 mt-1">{rec.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {showDetails && (
            <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700 space-y-2">
              <div className="text-xs font-medium text-slate-300 mb-2">详细分析数据</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">平均帧差</span>
                  <span className="text-slate-300 font-mono">
                    {loopAnalysis.avgFrameDiff.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">帧差异方差</span>
                  <span className="text-slate-300 font-mono">
                    {loopAnalysis.stdFrameDiff.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">首尾帧差</span>
                  <span className="text-slate-300 font-mono">
                    {loopAnalysis.firstLastFrameDiff.avgPixelDiff.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">像素变化率</span>
                  <span className="text-slate-300 font-mono">
                    {(loopAnalysis.firstLastFrameDiff.changedPixelRatio * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">边缘变化率</span>
                  <span className="text-slate-300 font-mono">
                    {(loopAnalysis.firstLastFrameDiff.edgeChangeRatio * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">运动偏移</span>
                  <span className="text-slate-300 font-mono">
                    ({loopAnalysis.firstLastFrameDiff.motionVector.x.toFixed(1)},{' '}
                    {loopAnalysis.firstLastFrameDiff.motionVector.y.toFixed(1)})
                  </span>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="flex items-center gap-2 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
          <Info className="w-4 h-4 text-slate-500 flex-shrink-0" />
          <p className="text-xs text-slate-500">点击"分析循环"检测首尾帧连续性</p>
        </div>
      )}

      <div className="border-t border-slate-700 pt-3 space-y-3">
        <div className="text-sm font-medium text-slate-200">优化选项</div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={loopOptimizeConfig.autoAdjustDelays}
            onChange={(e) => setLoopOptimizeConfig({ autoAdjustDelays: e.target.checked })}
            className="w-4 h-4 rounded border-slate-600 text-violet-600 focus:ring-violet-500 bg-slate-900"
          />
          <span className="text-sm text-slate-300">自动调整帧延迟</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={loopOptimizeConfig.addBlendFrames}
            onChange={(e) => setLoopOptimizeConfig({ addBlendFrames: e.target.checked })}
            className="w-4 h-4 rounded border-slate-600 text-violet-600 focus:ring-violet-500 bg-slate-900"
          />
          <span className="text-sm text-slate-300">添加首尾混合过渡帧</span>
        </label>

        {loopOptimizeConfig.addBlendFrames && (
          <div className="space-y-1 pl-6">
            <div className="flex items-center justify-between">
              <label className="text-xs text-slate-400">过渡帧数量</label>
              <span className="text-xs text-slate-300 font-mono">{blendCount}</span>
            </div>
            <input
              type="range"
              min={1}
              max={8}
              step={1}
              value={blendCount}
              onChange={(e) => setBlendCount(Number(e.target.value))}
              className="w-full h-1 bg-slate-700 rounded-full appearance-none cursor-pointer accent-violet-500"
            />
          </div>
        )}

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-xs text-slate-400">交叉淡化强度</label>
            <span className="text-xs text-slate-300 font-mono">
              {Math.round(loopOptimizeConfig.crossfadeStrength * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={loopOptimizeConfig.crossfadeStrength}
            onChange={(e) =>
              setLoopOptimizeConfig({ crossfadeStrength: Number(e.target.value) })
            }
            className="w-full h-1 bg-slate-700 rounded-full appearance-none cursor-pointer accent-emerald-500"
          />
        </div>
      </div>
    </div>
  );
}
