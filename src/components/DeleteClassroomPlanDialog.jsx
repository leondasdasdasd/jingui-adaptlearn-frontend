import { useEffect, useRef } from 'react';
import { AlertTriangle, LoaderCircle, X } from 'lucide-react';
import '../classroom-content-visibility.css';

export default function DeleteClassroomPlanDialog({ plan, pending, error, onCancel, onConfirm }) {
  const confirmButtonRef = useRef(null);

  useEffect(() => {
    confirmButtonRef.current?.focus();
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !pending) onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel, pending]);

  return (
    <div
      className="classroom-plan-delete-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="classroom-plan-delete-title"
      aria-busy={pending}
    >
      <button
        className="classroom-plan-delete-mask"
        type="button"
        aria-label="取消删除方案"
        onClick={() => { if (!pending) onCancel(); }}
      />
      <section>
        <header>
          <div className="classroom-plan-delete-heading-icon" aria-hidden="true"><AlertTriangle size={20} /></div>
          <h2 id="classroom-plan-delete-title">删除课堂方案？</h2>
          <button type="button" aria-label="关闭" disabled={pending} onClick={onCancel}><X size={18} /></button>
        </header>
        <div className="classroom-plan-delete-body">
          <p>“{plan.title}”将从方案列表移除，之后不能再用它新建课堂。</p>
          <p>已经产生的课堂记录和报告不受影响。</p>
          {error && <div className="classroom-plan-delete-error" role="alert">{error}</div>}
        </div>
        <footer>
          <button className="teacher-neutral" type="button" disabled={pending} onClick={onCancel}>取消</button>
          <button
            ref={confirmButtonRef}
            className="classroom-plan-delete-confirm"
            type="button"
            disabled={pending}
            onClick={() => { void onConfirm(); }}
          >
            {pending && <LoaderCircle className="spin" size={16} />}
            {pending ? '正在删除…' : '确认删除'}
          </button>
        </footer>
      </section>
    </div>
  );
}
