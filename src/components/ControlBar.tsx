import React, { useState } from 'react';
import { Play, Pause, RotateCcw, SkipForward, Save, Camera } from 'lucide-react';
import useSimulationStore from '../store/useSimulationStore';
import useSimulation from '../hooks/useSimulation';
import api from '../services/api';
import SaveExperimentDialog from './SaveExperimentDialog';
import type { TemperatureSnapshot } from '@shared/types';

export const ControlBar: React.FC = () => {
  const {
    currentStep,
    totalSteps,
    currentTemperature,
    currentExperimentId,
    addSnapshot,
  } = useSimulationStore();

  const { play, pause, reset, stepForward, isRunning, isPaused, isFinished, isIdle } = useSimulation();
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);

  const generateId = () => `snap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const handleSaveSnapshot = async () => {
    const snapshot: TemperatureSnapshot = {
      id: generateId(),
      experimentId: currentExperimentId || 'default',
      step: currentStep,
      timestamp: Date.now(),
      temperatureData: currentTemperature.map(row => [...row]),
      name: `绗?${currentStep} 姝,
    };

    try {
      await api.snapshots.create(snapshot);
      addSnapshot(snapshot);
    } catch (error) {
      console.error('淇濆瓨蹇収澶辫触:', error);
    }
  };

  const formatTime = (step: number) => {
    const time = step * 0.1;
    return `${time.toFixed(1)}s`;
  };

  return (
    <>
      <div className="h-20 bg-slate-900/95 backdrop-blur-sm border-t border-slate-700 px-6 flex items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-slate-800 rounded-xl p-1">
            {isIdle || isPaused || isFinished ? (
              <button
                onClick={play}
                className="w-12 h-12 flex items-center justify-center bg-green-500 hover:bg-green-400 text-white rounded-xl transition-all hover:scale-105 shadow-lg shadow-green-500/30"
                title="鎾斁"
              >
                <Play className="w-5 h-5 ml-0.5" />
              </button>
            ) : (
              <button
                onClick={pause}
                className="w-12 h-12 flex items-center justify-center bg-yellow-500 hover:bg-yellow-400 text-white rounded-xl transition-all hover:scale-105 shadow-lg shadow-yellow-500/30"
                title="鏆傚仠"
              >
                <Pause className="w-5 h-5" />
              </button>
            )}

            <button
              onClick={stepForward}
              disabled={isRunning}
              className="w-12 h-12 flex items-center justify-center bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-all hover:scale-105"
              title="鍗曟鎵ц"
            >
              <SkipForward className="w-5 h-5" />
            </button>

            <button
              onClick={reset}
              className="w-12 h-12 flex items-center justify-center bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-all hover:scale-105"
              title="閲嶇疆"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveSnapshot}
              className="flex items-center gap-2 px-4 py-2.5 bg-purple-500/90 hover:bg-purple-500 text-white rounded-xl transition-all hover:scale-105 shadow-lg shadow-purple-500/20 text-sm font-medium"
            >
              <Camera className="w-4 h-4" />
              淇濆瓨蹇収
            </button>
            <button
              onClick={() => setSaveDialogOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-500/90 hover:bg-blue-500 text-white rounded-xl transition-all hover:scale-105 shadow-lg shadow-blue-500/20 text-sm font-medium"
            >
              <Save className="w-4 h-4" />
              淇濆瓨瀹為獙
            </button>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div className="text-center">
            <div className="text-xs text-slate-400 font-medium">褰撳墠姝ユ暟</div>
            <div className="text-2xl font-bold text-white font-mono">
              {currentStep} <span className="text-sm text-slate-500">/ {totalSteps}</span>
            </div>
          </div>

          <div className="w-px h-10 bg-slate-700" />

          <div className="text-center">
            <div className="text-xs text-slate-400 font-medium">妯℃嫙鏃堕棿</div>
            <div className="text-2xl font-bold text-cyan-400 font-mono">
              {formatTime(currentStep)}
            </div>
          </div>

          <div className="w-px h-10 bg-slate-700" />

          <div className="text-center">
            <div className="text-xs text-slate-400 font-medium">鐘舵€?/div>
            <div className={`text-lg font-bold ${
              isRunning ? 'text-green-400' :
              isPaused ? 'text-yellow-400' :
              isFinished ? 'text-purple-400' :
              'text-slate-400'
            }`}>
              {isRunning ? '杩愯涓? : isPaused ? '宸叉殏鍋? : isFinished ? '宸插畬鎴? : '寰呭懡'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-48 h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 via-green-500 to-yellow-500 transition-all duration-100"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
          <span className="text-xs text-slate-400 font-mono min-w-12">
            {((currentStep / totalSteps) * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      <SaveExperimentDialog
        open={saveDialogOpen}
        onClose={() => setSaveDialogOpen(false)}
        onSaved={() => setSaveDialogOpen(false)}
      />
    </>
  );
};

export default ControlBar;
