import { useEffect, useRef } from 'react';
import { AlertTriangle, LoaderCircle, X } from 'lucide-react';

export default function EndClassroomDialog({
  className,
  lessonTitle,
  studentCount,
  onlineCount,
  pending,
  error,
  onCancel,
  onConfirm,
}) {
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
    <div className="end-classroom-modal" role="dialog" aria-modal="true" aria-labelledby="end-classroom-title" aria-busy={pending}>
      <button className="end-classroom-mask" type="button" aria-label="取消结束课堂" onClick={() => { if (!pending) onCancel(); }} />
      <section>
        <header>
          <div className="end-classroom-heading-icon" aria-hidden="true"><AlertTriangle size={20} /></div>
          <div>
            <h2 id="end-classroom-title">确认结束当前课堂？</h2>
            <p>{className || '当前班级'} · {lessonTitle || '当前课堂'}</p>
          </div>
          <button type="button" aria-label="关闭" disabled={pending} onClick={onCancel}><X size={18} /></button>
        </header>
        <div className="end-classroom-body">
          <p>结束后将立即结算本课堂的学习记录，并生成课堂报告。</p>
          <ul>
            <li>{studentCount || 0} 名已进入课堂的学生将停止继续作答</li>
            <li>学生进度、作答和预警将按当前数据结算</li>
            <li>结束后不能恢复本课堂，可另行开启下一堂课</li>
          </ul>
          {onlineCount > 0 && <div className="end-classroom-online-warning"><AlertTriangle size={16} />当前仍有 {onlineCount} 名学生在线，请确认后再结束。</div>}
          {error && <div className="end-classroom-error" role="alert">{error}</div>}
        </div>
        <footer>
          <button className="teacher-neutral" type="button" disabled={pending} onClick={onCancel}>继续上课</button>
          <button
            ref={confirmButtonRef}
            className="teacher-primary end-classroom-confirm-button"
            type="button"
            aria-busy={pending}
            disabled={pending}
            onClick={() => { void onConfirm(); }}
          >
            {pending && <LoaderCircle className="spin" size={16} />}
            {pending ? '正在结束课堂…' : '确认结束课堂'}
          </button>
        </footer>
      </section>
    </div>
  );
}
