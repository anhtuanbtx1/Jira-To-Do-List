import React, { useState } from 'react';
import { useStore } from '../data/store';
import { X } from 'lucide-react';

export default function ProjectModal() {
    const { dispatch, notify } = useStore();
    const [form, setForm] = useState({ name: '', description: '' });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!form.name.trim()) return;
        dispatch({ type: 'ADD_PROJECT', payload: form });
        notify('Dự án mới đã được tạo!');
        setForm({ name: '', description: '' });
    };

    const close = () => dispatch({ type: 'TOGGLE_PROJECT_MODAL' });

    return (
        <div className="modal-overlay" onClick={close}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Tạo dự án mới</h3>
                    <button className="btn btn-ghost btn-icon" onClick={close}><X size={18} /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="form-group">
                            <label className="form-label">Tên dự án *</label>
                            <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ví dụ: E-Commerce Platform" required autoFocus />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Mô tả</label>
                            <textarea className="form-textarea" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Mô tả ngắn về dự án..." rows={3} />
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={close}>Hủy</button>
                        <button type="submit" className="btn btn-primary">Tạo dự án</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
