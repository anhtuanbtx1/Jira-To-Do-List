import React, { useState, useEffect } from 'react';
import { useStore } from '../data/store';
import { PRIORITY, STORY_STATUS } from '../data/models';
import { X } from 'lucide-react';

export default function StoryModal() {
    const { state, dispatch, notify, projectEpics, projectSprints } = useStore();
    const editing = state.editingStory;

    const [form, setForm] = useState({
        title: '', description: '', asA: '', iWantTo: '', soThat: '',
        epicId: '', sprintId: '', status: STORY_STATUS.TODO,
        priority: PRIORITY.MEDIUM, points: 0, acceptanceCriteria: '', assignee: '',
    });

    useEffect(() => {
        if (editing) {
            setForm({
                title: editing.title || '',
                description: editing.description || '',
                asA: editing.asA || '',
                iWantTo: editing.iWantTo || '',
                soThat: editing.soThat || '',
                epicId: editing.epicId || '',
                sprintId: editing.sprintId || '',
                status: editing.status || STORY_STATUS.TODO,
                priority: editing.priority || PRIORITY.MEDIUM,
                points: editing.points || 0,
                acceptanceCriteria: editing.acceptanceCriteria || '',
                assignee: editing.assignee || '',
            });
        } else {
            setForm({
                title: '', description: '', asA: '', iWantTo: '', soThat: '',
                epicId: '', sprintId: '', status: STORY_STATUS.TODO,
                priority: PRIORITY.MEDIUM, points: 0, acceptanceCriteria: '', assignee: '',
            });
        }
    }, [editing]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!form.title.trim()) return;

        if (editing) {
            dispatch({ type: 'UPDATE_STORY', payload: { ...form, id: editing.id } });
            notify('User Story đã được cập nhật!');
        } else {
            dispatch({ type: 'ADD_STORY', payload: form });
            notify('User Story mới đã được tạo!');
        }
    };

    const close = () => dispatch({ type: 'TOGGLE_STORY_MODAL' });

    return (
        <div className="modal-overlay" onClick={close}>
            <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>{editing ? 'Chỉnh sửa User Story' : 'Tạo User Story mới'}</h3>
                    <button className="btn btn-ghost btn-icon" onClick={close}><X size={18} /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="form-group">
                            <label className="form-label">Tiêu đề *</label>
                            <input className="form-input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Nhập tiêu đề User Story..." required />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Mô tả</label>
                            <textarea className="form-textarea" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Mô tả chi tiết..." rows={2} />
                        </div>

                        {/* User Story Format */}
                        <div style={{ background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)', padding: 16, marginBottom: 16, border: '1px solid var(--border-color)' }}>
                            <label className="form-label" style={{ marginBottom: 12, color: 'var(--accent-primary-hover)' }}>📝 User Story Format</label>
                            <div className="form-group">
                                <label className="form-label">As a (Vai trò)</label>
                                <input className="form-input" value={form.asA} onChange={e => setForm({ ...form, asA: e.target.value })} placeholder="Người dùng, Admin, PO..." />
                            </div>
                            <div className="form-group">
                                <label className="form-label">I want to (Tôi muốn)</label>
                                <input className="form-input" value={form.iWantTo} onChange={e => setForm({ ...form, iWantTo: e.target.value })} placeholder="Đăng nhập vào hệ thống..." />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">So that (Để)</label>
                                <input className="form-input" value={form.soThat} onChange={e => setForm({ ...form, soThat: e.target.value })} placeholder="Truy cập tài khoản cá nhân..." />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Epic</label>
                                <select className="form-select" value={form.epicId} onChange={e => setForm({ ...form, epicId: e.target.value })}>
                                    <option value="">-- Không gán Epic --</option>
                                    {projectEpics.map(epic => (
                                        <option key={epic.id} value={epic.id}>{epic.title}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Sprint</label>
                                <select className="form-select" value={form.sprintId} onChange={e => setForm({ ...form, sprintId: e.target.value })}>
                                    <option value="">-- Backlog --</option>
                                    {projectSprints.map(sp => (
                                        <option key={sp.id} value={sp.id}>{sp.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Priority</label>
                                <select className="form-select" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                                    {Object.values(PRIORITY).map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Story Points</label>
                                <select className="form-select" value={form.points} onChange={e => setForm({ ...form, points: parseInt(e.target.value) })}>
                                    {[0, 1, 2, 3, 5, 8, 13, 21].map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Status</label>
                                <select className="form-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                                    {Object.values(STORY_STATUS).map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Assignee</label>
                                <input className="form-input" value={form.assignee} onChange={e => setForm({ ...form, assignee: e.target.value })} placeholder="Tên người thực hiện" />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Acceptance Criteria</label>
                            <textarea className="form-textarea" value={form.acceptanceCriteria} onChange={e => setForm({ ...form, acceptanceCriteria: e.target.value })} placeholder="- Tiêu chí 1&#10;- Tiêu chí 2&#10;- Tiêu chí 3" rows={3} />
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={close}>Hủy</button>
                        {editing && (
                            <button type="button" className="btn btn-danger" onClick={() => {
                                dispatch({ type: 'DELETE_STORY', payload: editing.id });
                                notify('User Story đã bị xóa!', 'error');
                            }}>Xóa</button>
                        )}
                        <button type="submit" className="btn btn-primary">{editing ? 'Cập nhật' : 'Tạo Story'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
