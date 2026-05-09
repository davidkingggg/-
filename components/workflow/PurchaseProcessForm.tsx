import React, { useState } from 'react';
import { useWorkflowLookups } from './useWorkflowLookups';
import { PURCHASE_STAGES, PRIORITIES, PURCHASE_STATUSES } from '@/lib/workflow-constants';
import { useToast } from '@/components/ui/Toast';

interface PurchaseProcessFormProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialData?: any;
  initialSupplierId?: string;
  initialCategoryId?: string;
  onSaved: () => void;
  onCancel: () => void;
}

export default function PurchaseProcessForm({
  initialData,
  initialSupplierId,
  initialCategoryId,
  onSaved,
  onCancel,
}: PurchaseProcessFormProps) {
  const { categories, suppliers, people, loading } = useWorkflowLookups();
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: initialData?.title || '',
    supplierId: initialData?.supplierId || initialSupplierId || '',
    categoryId: initialData?.categoryId || initialCategoryId || '',
    requesterId: initialData?.requesterId || '',
    ownerId: initialData?.ownerId || '',
    salesPersonId: initialData?.salesPersonId || '',
    currentStage: initialData?.currentStage || PURCHASE_STAGES[0],
    priority: initialData?.priority || '中',
    dueDate: initialData?.dueDate ? initialData.dueDate.slice(0, 10) : '',
    currentProblem: initialData?.currentProblem || '',
    nextAction: initialData?.nextAction || '',
    needBossDecision: initialData?.needBossDecision || false,
    needPaymentRequest: initialData?.needPaymentRequest || false,
    purchaseAmount: initialData?.purchaseAmount || '',
    contractNo: initialData?.contractNo || '',
    contractDate: initialData?.contractDate ? initialData.contractDate.slice(0, 10) : '',
    paymentRequestDate: initialData?.paymentRequestDate ? initialData.paymentRequestDate.slice(0, 10) : '',
    arrivalDate: initialData?.arrivalDate ? initialData.arrivalDate.slice(0, 10) : '',
    acceptanceDate: initialData?.acceptanceDate ? initialData.acceptanceDate.slice(0, 10) : '',
    invoiceDate: initialData?.invoiceDate ? initialData.invoiceDate.slice(0, 10) : '',
    invoiceNo: initialData?.invoiceNo || '',
    prepaymentAmount: initialData?.prepaymentAmount || '',
    offsetAmount: initialData?.offsetAmount || '',
    hasArrived: initialData?.hasArrived || false,
    hasAccepted: initialData?.hasAccepted || false,
    hasInvoice: initialData?.hasInvoice || false,
    hasPrepaymentOffset: initialData?.hasPrepaymentOffset || false,
    status: initialData?.status || PURCHASE_STATUSES[0],
    remark: initialData?.remark || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = initialData?.id
        ? `/api/purchase-processes/${initialData.id}`
        : `/api/purchase-processes`;
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
    <form onSubmit={handleSubmit} className="space-y-6 max-h-[80vh] overflow-y-auto pr-2">
      {/* 基础信息 */}
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">基础信息</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className={lc}>采购事项名称 <span className="text-red-500">*</span></label>
            <input required type="text" className={ic} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
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
        </div>
      </div>

      {/* 人员与阶段 */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className={lc}>需求提交人 <span className="text-red-500">*</span></label>
          <select required className={sc} value={form.requesterId} onChange={(e) => setForm({ ...form, requesterId: e.target.value })}>
            <option value="">请选择</option>
            {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
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
          <label className={lc}>销售/配合人员</label>
          <select className={sc} value={form.salesPersonId} onChange={(e) => setForm({ ...form, salesPersonId: e.target.value })}>
            <option value="">请选择</option>
            {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className={lc}>当前阶段 <span className="text-red-500">*</span></label>
          <select required className={sc} value={form.currentStage} onChange={(e) => setForm({ ...form, currentStage: e.target.value })}>
            {PURCHASE_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className={lc}>优先级 <span className="text-red-500">*</span></label>
          <select required className={sc} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
            {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className={lc}>状态 <span className="text-red-500">*</span></label>
          <select required className={sc} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            {PURCHASE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className={lc}>截止时间</label>
          <input type="date" className={ic} value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
        </div>
      </div>

      {/* 金额与合同 (可选填) */}
      <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100">
        <h3 className="text-sm font-semibold text-blue-800 mb-3">金额与合同</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={lc}>采购金额</label>
            <input type="number" min="0" step="0.01" className={ic} value={form.purchaseAmount} onChange={(e) => setForm({ ...form, purchaseAmount: e.target.value })} />
          </div>
          <div>
            <label className={lc}>合同编号</label>
            <input type="text" className={ic} value={form.contractNo} onChange={(e) => setForm({ ...form, contractNo: e.target.value })} />
          </div>
          <div>
            <label className={lc}>合同日期</label>
            <input type="date" className={ic} value={form.contractDate} onChange={(e) => setForm({ ...form, contractDate: e.target.value })} />
          </div>
          <div>
            <label className={lc}>预付款金额</label>
            <input type="number" min="0" step="0.01" className={ic} value={form.prepaymentAmount} onChange={(e) => setForm({ ...form, prepaymentAmount: e.target.value })} />
          </div>
          <div>
            <label className={lc}>已抵充金额</label>
            <input type="number" min="0" step="0.01" className={ic} value={form.offsetAmount} onChange={(e) => setForm({ ...form, offsetAmount: e.target.value })} />
          </div>
          <div>
            <label className={lc}>发票号</label>
            <input type="text" className={ic} value={form.invoiceNo} onChange={(e) => setForm({ ...form, invoiceNo: e.target.value })} />
          </div>
        </div>
      </div>

      {/* 日期跟踪 */}
      <div className="grid grid-cols-4 gap-4">
        <div>
          <label className={lc}>付款申请日期</label>
          <input type="date" className={ic} value={form.paymentRequestDate} onChange={(e) => setForm({ ...form, paymentRequestDate: e.target.value })} />
        </div>
        <div>
          <label className={lc}>到货日期</label>
          <input type="date" className={ic} value={form.arrivalDate} onChange={(e) => setForm({ ...form, arrivalDate: e.target.value })} />
        </div>
        <div>
          <label className={lc}>验收日期</label>
          <input type="date" className={ic} value={form.acceptanceDate} onChange={(e) => setForm({ ...form, acceptanceDate: e.target.value })} />
        </div>
        <div>
          <label className={lc}>发票日期</label>
          <input type="date" className={ic} value={form.invoiceDate} onChange={(e) => setForm({ ...form, invoiceDate: e.target.value })} />
        </div>
      </div>

      {/* 问题与动作 */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={lc}>当前问题</label>
          <textarea className={ic} rows={2} value={form.currentProblem} onChange={(e) => setForm({ ...form, currentProblem: e.target.value })} />
        </div>
        <div>
          <label className={lc}>下一步动作 {form.status !== '已完成' && <span className="text-gray-400 text-xs">(建议填写)</span>}</label>
          <textarea className={ic} rows={2} value={form.nextAction} onChange={(e) => setForm({ ...form, nextAction: e.target.value })} />
        </div>
      </div>

      {/* 状态标记 */}
      <div className="flex flex-wrap gap-4 py-3 border-y border-gray-100">
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" className="rounded" checked={form.needBossDecision} onChange={(e) => setForm({ ...form, needBossDecision: e.target.checked })} />需要老板决策
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" className="rounded" checked={form.needPaymentRequest} onChange={(e) => setForm({ ...form, needPaymentRequest: e.target.checked })} />需要付款申请
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" className="rounded" checked={form.hasArrived} onChange={(e) => setForm({ ...form, hasArrived: e.target.checked })} />已到货
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" className="rounded" checked={form.hasAccepted} onChange={(e) => setForm({ ...form, hasAccepted: e.target.checked })} />已验收
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" className="rounded" checked={form.hasInvoice} onChange={(e) => setForm({ ...form, hasInvoice: e.target.checked })} />已开票
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" className="rounded" checked={form.hasPrepaymentOffset} onChange={(e) => setForm({ ...form, hasPrepaymentOffset: e.target.checked })} />涉及预付款抵充
        </label>
      </div>

      <div>
        <label className={lc}>备注</label>
        <textarea className={ic} rows={2} value={form.remark} onChange={(e) => setForm({ ...form, remark: e.target.value })} />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 sticky bottom-0 bg-white pb-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200">
          取消
        </button>
        <button type="submit" disabled={saving} className="px-5 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 shadow-sm">
          {saving ? '保存中...' : '保存'}
        </button>
      </div>
    </form>
  );
}
