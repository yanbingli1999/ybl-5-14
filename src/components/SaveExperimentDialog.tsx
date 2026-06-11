import React, { useState, useEffect } from 'react';
import { X, Save, AlertTriangle, Copy, RefreshCw } from 'lucide-react';
import useSimulationStore from '../store/useSimulationStore';
import api from '../services/api';
import type { ExperimentConfig } from '@shared/types';

interface SaveExperimentDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

type ConflictAction = 'overwrite' | 'copy' | 'cancel';

function buildCurrentConfig(name: string, purpose: string, operator: string, remarks: string): ExperimentConfig {
  const state = useSimulationStore.getState();
  return {
    id: state.currentExperimentId || `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name,
    createdAt: Date.now(),
    grid: state.grid,
    materialId: state.materialId,
    boundaryConditions: state.boundaryConditions,
    initialHeatSources: state.initialHeatSources,
    totalSteps: state.totalSteps,
    timeStep: state.timeStep,
    purpose,
    operator,
    remarks,
  };
}

function paramsMatch(a: ExperimentConfig, b: ExperimentConfig): boolean {
  return (
    JSON.stringify(a.grid) === JSON.stringify(b.grid) &&
    a.materialId === b.materialId &&
    JSON.stringify(a.boundaryConditions) === JSON.stringify(b.boundaryConditions) &&
    JSON.stringify(a.initialHeatSources) === JSON.stringify(b.initialHeatSources) &&
    a.totalSteps === b.totalSteps &&
    a.timeStep === b.timeStep
  );
}

export const SaveExperimentDialog: React.FC<SaveExperimentDialogProps> = ({ open, onClose, onSaved }) => {
  const experiments = useSimulationStore((s) => s.experiments);

  const [name, setName] = useState('');
  const [purpose, setPurpose] = useState('');
  const [operator, setOperator] = useState('');
  const [remarks, setRemarks] = useState('');

  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [conflictInfo, setConflictInfo] = useState<{ existing: ExperimentConfig; pending: ExperimentConfig } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      const now = new Date();
      const defaultName = `实验 ${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      setName(defaultName);
      setPurpose('');
      setOperator('');
      setRemarks('');
      setDuplicateWarning(null);
      setConflictInfo(null);
      setSaving(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const current = buildCurrentConfig(name, purpose, operator, remarks);
    const lastSaved = experiments.length > 0 ? experiments[0] : null;
    if (lastSaved && paramsMatch(current, lastSaved)) {
      setDuplicateWarning('当前参数与上次保存的实验完全一致，无需重复保存。');
    } else {
      setDuplicateWarning(null);
    }
  }, [open, name, purpose, operator, remarks, experiments]);

  const checkNameConflict = (config: ExperimentConfig): ExperimentConfig | null => {
    return experiments.find((e) => e.name === config.name && e.id !== config.id) || null;
  };

  const doSave = async (config: ExperimentConfig) => {
    setSaving(true);
    try {
      await api.experiments.create(config);
      useSimulationStore.getState().setCurrentExperimentId(config.id);
      useSimulationStore.getState().setExperiments([config, ...useSimulationStore.getState().experiments]);
      onSaved();
      onClose();
    } catch (error) {
      console.error('保存实验失败:', error);
    } finally {
      setSaving(false);
    }
  };

  const doOverwrite = async (config: ExperimentConfig, existing: ExperimentConfig) => {
    setSaving(true);
    try {
      const updated = { ...config, id: existing.id, createdAt: existing.createdAt };
      await api.experiments.update(existing.id, updated);
      const newExps = useSimulationStore.getState().experiments.map((e) =>
        e.id === existing.id ? updated : e
      );
      useSimulationStore.getState().setExperiments(newExps);
      useSimulationStore.getState().setCurrentExperimentId(existing.id);
      onSaved();
      onClose();
    } catch (error) {
      console.error('覆盖实验失败:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = () => {
    if (duplicateWarning) return;

    const config = buildCurrentConfig(name, purpose, operator, remarks);

    const conflicting = checkNameConflict(config);
    if (conflicting) {
      setConflictInfo({ existing: conflicting, pending: config });
      return;
    }

    doSave(config);
  };

  const handleConflictAction = (action: ConflictAction) => {
    if (!conflictInfo) return;
    const { existing, pending } = conflictInfo;

    if (action === 'overwrite') {
      doOverwrite(pending, existing);
    } else if (action === 'copy') {
      const copied = {
        ...pending,
        id: `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: `${pending.name} (副本)`,
      };
      doSave(copied);
    }

    setConflictInfo(null);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-800 border border-slate-600 rounded-2xl shadow-2xl w-[480px] max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-700">
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Save className="w-5 h-5 text-blue-400" />
            保存实验
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-300">
              实验名称 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="请输入实验名称"
              className="w-full px-3 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-300">实验目的</label>
            <input
              type="text"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="描述本次实验的目的"
              className="w-full px-3 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-300">操作者</label>
            <input
              type="text"
              value={operator}
              onChange={(e) => setOperator(e.target.value)}
              placeholder="操作者姓名"
              className="w-full px-3 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-300">备注</label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="补充备注信息（将在实验列表中显示摘要）"
              rows={3}
              className="w-full px-3 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {duplicateWarning && (
            <div className="flex items-start gap-2 p-3 bg-yellow-900/30 border border-yellow-600/40 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-300">{duplicateWarning}</p>
            </div>
          )}

          {conflictInfo && (
            <div className="p-4 bg-red-900/30 border border-red-600/40 rounded-lg space-y-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-300">名称冲突</p>
                  <p className="text-xs text-red-400 mt-1">
                    已存在名为「{conflictInfo.existing.name}」的实验，请选择操作方式：
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleConflictAction('overwrite')}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  覆盖
                </button>
                <button
                  onClick={() => handleConflictAction('copy')}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <Copy className="w-4 h-4" />
                  复制
                </button>
                <button
                  onClick={() => setConflictInfo(null)}
                  disabled={saving}
                  className="flex-1 py-2 px-3 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-300 rounded-lg text-sm font-medium transition-colors"
                >
                  取消
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-5 border-t border-slate-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm font-medium transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim() || !!duplicateWarning || saving}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? '保存中...' : '确认保存'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SaveExperimentDialog;
