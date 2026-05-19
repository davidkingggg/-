import React, { useState } from 'react';
import { useWorkflowLookups } from './useWorkflowLookups';
import { DEVELOPMENT_STAGES, PRIORITIES, DEVELOPMENT_STATUSES } from '@/lib/workflow-constants';
import { useToast } from '@/components/ui/Toast';

interface DevelopmentProcessFormProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialData?: any;
  initialSupplierId?: string;
  initialCategoryId?: string;
  onSaved: () => void;
  onCancel: () => void;
}

export default function DevelopmentProcessForm({
  initialData,
  initialSupplierId,
  initialCategoryId,
  onSaved,
  onCancel,
}: DevelopmentProcessFormProps) {
  const { categories, suppliers, people, loading } = useWorkflowLookups();
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    supplierId: initialData?.supplierId || initialSupplierId || '',
    categoryId: initialData?.categoryId || initialCategoryId || '',
    currentStage: initialData?.currentStage || DEVELOPMENT_STAGES[0],
    ownerId: initialData?.ownerId || '',
    priority: initialData?.priority || '中',
    dueDate: initialData?.dueDate ? initialData.dueDate.slice(0, 10) : '',
    currentProblem: initialData?.currentProblem || '',
    nextAction: initialData?.nextAction || '',
    needBossDecision: initialData?.needBossDecision || false,
    needSalesSupport: initialData?.needSalesSupport || false,
    needBusinessAssistantSupport: initialData?.needBusinessAssistantSupport || false,
    status: initialData?.status || DEVELOPMENT_STATUSES[0],
    remark: initialData?.remark || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = initialData?.id
        ? `/api/development-processes/${initialData.id}`
        : `/api/development-processes`;
      const method = initialData?.id ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || '保存失败');
      }

      showToast(initialData?.id ? '更新成功' : '新增成功', 'success');
      onSaved();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '保存失败';
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-4 text-center text-gray-500">加载选项中...</div>;
  }

  const ic = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500';
  const sc = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500';
  const lc = 'block text-sm font-medium text-gray-700 mb-1';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={lc}>供应商 <span className="text-red-500">*</span></label>
          <select required className={sc} value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })}>
            <option value="">请选择</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className={lc}>品类 <span className="text-red-500">*</span></label>
          <select required className={sc} value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
            <option value="">请选择</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className={lc}>负责人 <span className="text-red-500">*</span></label>
          <select required className={sc} value={form.ownerId} onChange={(e) => setForm({ ...form, ownerId: e.target.value })}>
            <option value="">请选择</option>
            {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className={lc}>优先级 <span className="text-red-500">*</span></label>
          <select required className={sc} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
            {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className={lc}>当前阶段 <span className="text-red-500">*</span></label>
          <select required className={sc} value={form.currentStage} onChange={(e) => setForm({ ...form, currentStage: e.target.value })}>
            {DEVELOPMENT_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className={lc}>状态 <span className="text-red-500">*</span></label>
          <select required className={sc} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            {DEVELOPMENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className={lc}>截止时间</label>
          <input type="date" className={ic} value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
        </div>
      </div>

      <div>
        <label className={lc}>当前问题</label>
        <textarea className={ic} rows={2} value={form.currentProblem} onChange={(e) => setForm({ ...form, currentProblem: e.target.value })} />
      </div>
      <div>
        <label className={lc}>下一步动作 {form.status !== '已完成' && <span className="text-gray-400 text-xs">(建议填写)</span>}</label>
        <textarea className={ic} rows={2} value={form.nextAction} onChange={(e) => setForm({ ...form, nextAction: e.target.value })} />
      </div>

      <div className="flex gap-6 py-2 border-y border-gray-100">
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" className="rounded" checked={form.needBossDecision} onChange={(e) => setForm({ ...form, needBossDecision: e.target.checked })} />
          需要老板决策
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" className="rounded" checked={form.needSalesSupport} onChange={(e) => setForm({ ...form, needSalesSupport: e.target.checked })} />
          需要销售部门配合
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" className="rounded" checked={form.needBusinessAssistantSupport} onChange={(e) => setForm({ ...form, needBusinessAssistantSupport: e.target.checked })} />
          需要商务总助配合
        </label>
      </div>

      <div>
        <label className={lc}>备注</label>
        <textarea className={ic} rows={2} value={form.remark} onChange={(e) => setForm({ ...form, remark: e.target.value })} />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200">
          取消
        </button>
        <button type="submit" disabled={saving} className="px-5 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
          {saving ? '保存中...' : '保存'}
        </button>
      </div>
    </form>
  );
}
