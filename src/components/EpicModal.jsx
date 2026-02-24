import React, { useState, useEffect } from 'react';
import { useStore } from '../data/store';
import { EPIC_COLORS, EPIC_STATUS } from '../data/models';
import { X } from 'lucide-react';

export default function EpicModal() {
    const { state, dispatch, notify } = useStore();
    const editing = state.editingEpic;

    const [form, setForm] = useState({ title: '', description: '', color: EPIC_COLORS[0], status: EPIC_STATUS.OPEN });

    useEffect(() => {
        if (editing) {
            setForm({ title: editing.title, description: editing.description || '', color: editing.color, status: editing.status || EPIC_STATUS.OPEN });
        } else {
            setForm({ title: '', description: '', color: EPIC_COLORS[Math.floor(Math.random() * EPIC_COLORS.length)], status: EPIC_STATUS.OPEN });
        }
    }, [editing]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!form.title.trim()) return;
        if (editing) {
            dispatch({ type: 'UPDATE_EPIC', payload: { ...form, id: editing.id } });
            notify('Epic đã được cập nhật!');
        } else {
            dispatch({ type: 'ADD_EPIC', payload: form });
            notify('Epic mới đã được tạo!');
        }
    };

    const close = () => dispatch({ type: 'TOGGLE_EPIC_MODAL' });

    return (
        <div className="modal-overlay" onClick={close}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>{editing ? 'Chỉnh sửa Epic' : 'Tạo Epic mới'}</h3>
                    <button className="btn btn-ghost btn-icon" onClick={close}><X size={18} /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="form-group">
                            <label className="form-label">Tên Epic *</label>
                            <input className="form-input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Ví dụ: Quản lý người dùng" required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Mô tả</label>
                            <textarea className="form-textarea" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Mô tả Epic..." rows={3} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Trạng thái</label>
                            <select className="form-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                                {Object.values(EPIC_STATUS).map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Màu sắc</label>
                            <div className="color-picker">
                                {EPIC_COLORS.map(c => (
                                    <div key={c} className={`color-swatch ${form.color === c ? 'active' : ''}`}
                                        style={{ background: c }}
                                        onClick={() => setForm({ ...form, color: c })} />
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={close}>Hủy</button>
                        {editing && (
                            <button type="button" className="btn btn-danger" onClick={() => {
                                dispatch({ type: 'DELETE_EPIC', payload: editing.id });
                                notify('Epic đã bị xóa!', 'error');
                            }}>Xóa</button>
                        )}
                        <button type="submit" className="btn btn-primary">{editing ? 'Cập nhật' : 'Tạo Epic'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
