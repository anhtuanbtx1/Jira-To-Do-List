import React, { useState, useEffect } from 'react';
import { useStore } from '../data/store';
import { X } from 'lucide-react';

export default function SprintModal() {
    const { state, dispatch, notify } = useStore();
    const editing = state.editingSprint;

    const today = new Date().toISOString().split('T')[0];
    const twoWeeks = (() => { const d = new Date(); d.setDate(d.getDate() + 14); return d.toISOString().split('T')[0]; })();

    const [form, setForm] = useState({ name: '', goal: '', startDate: today, endDate: twoWeeks });

    useEffect(() => {
        if (editing) {
            setForm({ name: editing.name, goal: editing.goal || '', startDate: editing.startDate, endDate: editing.endDate });
        } else {
            const sprintNum = state.sprints.filter(s => s.projectId === state.currentProjectId).length + 1;
            setForm({ name: `Sprint ${sprintNum}`, goal: '', startDate: today, endDate: twoWeeks });
        }
    }, [editing]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!form.name.trim()) return;
        if (editing) {
            dispatch({ type: 'UPDATE_SPRINT', payload: { ...form, id: editing.id } });
            notify('Sprint đã được cập nhật!');
        } else {
            dispatch({ type: 'ADD_SPRINT', payload: form });
            notify('Sprint mới đã được tạo!');
        }
    };

    const close = () => dispatch({ type: 'TOGGLE_SPRINT_MODAL' });

    return (
        <div className="modal-overlay" onClick={close}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>{editing ? 'Chỉnh sửa Sprint' : 'Tạo Sprint mới'}</h3>
                    <button className="btn btn-ghost btn-icon" onClick={close}><X size={18} /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="form-group">
                            <label className="form-label">Tên Sprint *</label>
                            <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Sprint Goal</label>
                            <textarea className="form-textarea" value={form.goal} onChange={e => setForm({ ...form, goal: e.target.value })} placeholder="Mục tiêu Sprint..." rows={2} />
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Ngày bắt đầu</label>
                                <input type="date" className="form-input" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Ngày kết thúc</label>
                                <input type="date" className="form-input" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} />
                            </div>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={close}>Hủy</button>
                        <button type="submit" className="btn btn-primary">{editing ? 'Cập nhật' : 'Tạo Sprint'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
