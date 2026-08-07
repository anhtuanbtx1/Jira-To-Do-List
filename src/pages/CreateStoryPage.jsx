import React, { useState, useEffect } from 'react';
import { useStore } from '../data/store';
import { PRIORITY, STORY_STATUS } from '../data/models';
import { Plus, Trash2, Cloud, Loader, ArrowLeft } from 'lucide-react';
import { loadJiraSettings, createJiraIssue, createJiraSubtask } from '../utils/jiraApi';

export default function CreateStoryPage() {
    const { state, dispatch, notify, projectEpics, projectSprints, currentProject } = useStore();
    const editing = state.editingStory;

    // Check if Jira is configured
    const jiraSettings = loadJiraSettings();
    const isJiraConfigured = !!(jiraSettings.baseUrl && jiraSettings.bearerToken);

    const [isPushing, setIsPushing] = useState(false);
    const [syncToJira, setSyncToJira] = useState(false);

    const [form, setForm] = useState({
        title: '', description: '', asA: '', iWantTo: '', soThat: '',
        epicId: '', sprintId: '', status: STORY_STATUS.TODO,
        priority: PRIORITY.MEDIUM, points: 0, acceptanceCriteria: '', assignee: '',
    });

    const [subtasks, setSubtasks] = useState([]);

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
            setSubtasks(editing.subtasks || []);
        } else {
            setForm({
                title: '', description: '', asA: '', iWantTo: '', soThat: '',
                epicId: '', sprintId: '', status: STORY_STATUS.TODO,
                priority: PRIORITY.MEDIUM, points: 0, acceptanceCriteria: '', assignee: '',
            });
            setSubtasks([]);
        }
    }, [editing]);

    const addSubtask = () => {
        setSubtasks([...subtasks, { title: '', assignee: '' }]);
    };

    const updateSubtask = (index, field, value) => {
        const newSubtasks = [...subtasks];
        newSubtasks[index][field] = value;
        setSubtasks(newSubtasks);
    };

    const removeSubtask = (index) => {
        const newSubtasks = [...subtasks];
        newSubtasks.splice(index, 1);
        setSubtasks(newSubtasks);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.title.trim()) return;

        // Validating subtasks
        const validSubtasks = subtasks.filter(st => st.title.trim());

        if (syncToJira && isJiraConfigured && currentProject && !editing) {
            setIsPushing(true);
            const projectKey = jiraSettings.defaultProjectKey || currentProject.name;

            // Build Description
            let description = '';
            if (form.asA || form.iWantTo || form.soThat) {
                description += `As a ${form.asA || '...' }, I want to ${form.iWantTo || '...' } so that ${form.soThat || '...' }`;
            }
            if (form.description) {
                description += (description ? '\n\n' : '') + form.description;
            }
            if (form.acceptanceCriteria) {
                description += (description ? '\n\n' : '') + 'Acceptance Criteria:\n' + form.acceptanceCriteria;
            }

            // Create Story Payload
            const payload = {
                fields: {
                    project: { key: projectKey },
                    summary: form.title,
                    description: description || form.title,
                    issuetype: { name: jiraSettings.issueTypeName || 'Story' },
                }
            };

            if (form.assignee) {
                payload.fields.assignee = { name: form.assignee };
            }

            try {
                // 1. Create Story on Jira
                const storyResult = await createJiraIssue(jiraSettings, payload);

                if (storyResult.success) {
                    let subtasksSuccess = 0;

                    // 2. Create Subtasks if any
                    for (const subtask of validSubtasks) {
                        const subtaskResult = await createJiraSubtask(
                            jiraSettings,
                            storyResult.key,
                            subtask,
                            projectKey
                        );
                        if (subtaskResult.success) subtasksSuccess++;
                    }

                    notify(`Đã push lên Jira thành công! Story: ${storyResult.key} (${subtasksSuccess}/${validSubtasks.length} Subtasks)`);
                } else {
                    notify(`Lỗi tạo Story trên Jira: ${storyResult.error}`, 'error');
                }
            } catch (error) {
                notify(`Lỗi kết nối Jira: ${error.message}`, 'error');
            }
            setIsPushing(false);
        }

        // Save locally
        const storyData = { ...form, subtasks: validSubtasks };

        if (editing) {
            dispatch({ type: 'UPDATE_STORY', payload: { ...storyData, id: editing.id } });
            notify('User Story đã được cập nhật!');
        } else {
            dispatch({ type: 'ADD_STORY', payload: storyData });
            if (!syncToJira) notify('User Story mới đã được tạo!');
        }

        close();
    };

    const close = () => {
        if (!isPushing) {
            dispatch({ type: 'SET_PAGE', payload: 'backlog' });
        }
    };

    return (
        <div style={{ maxWidth: 800, margin: '0 auto', paddingBottom: 40 }}>
            <div className="flex-between mb-16">
                <button type="button" className="btn btn-ghost" onClick={close} disabled={isPushing} style={{ paddingLeft: 0 }}>
                    <ArrowLeft size={16} style={{ marginRight: 6 }} /> Quay lại Backlog
                </button>
            </div>

            <div className="card">
                <div className="card-header">
                    <h3 className="card-title" style={{ fontSize: 18 }}>{editing ? 'Chỉnh sửa User Story' : 'Tạo User Story mới'}</h3>
                </div>
                <form onSubmit={handleSubmit} style={{ padding: 24 }}>
                    {/* Sync to Jira Option */}
                    {!editing && isJiraConfigured && currentProject && (
                        <div style={{ marginBottom: 20, padding: '12px 16px', background: 'var(--bg-glass)', border: '1px solid var(--accent-primary)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: 12 }}>
                            <input
                                type="checkbox"
                                id="syncToJira"
                                checked={syncToJira}
                                onChange={(e) => setSyncToJira(e.target.checked)}
                                style={{ width: 16, height: 16, accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                            />
                            <label htmlFor="syncToJira" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', margin: 0, fontWeight: 500, color: 'var(--text-primary)' }}>
                                <Cloud size={18} style={{ color: 'var(--accent-primary)' }} />
                                Tạo và Đồng bộ trực tiếp lên Jira Project
                            </label>
                        </div>
                    )}

                    <div className="form-group">
                        <label className="form-label">Tiêu đề *</label>
                        <input className="form-input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Nhập tiêu đề User Story..." required />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Mô tả</label>
                        <textarea className="form-textarea" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Mô tả chi tiết..." rows={2} />
                    </div>

                    {/* User Story Format */}
                    <div style={{ background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)', padding: 16, marginBottom: 20, border: '1px solid var(--border-color)' }}>
                        <label className="form-label" style={{ marginBottom: 12, color: 'var(--accent-primary-hover)' }}>📝 User Story Format</label>
                        <div className="form-row">
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">As a (Vai trò)</label>
                                <input className="form-input" value={form.asA} onChange={e => setForm({ ...form, asA: e.target.value })} placeholder="Người dùng, Admin, PO..." />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">I want to (Tôi muốn)</label>
                                <input className="form-input" value={form.iWantTo} onChange={e => setForm({ ...form, iWantTo: e.target.value })} placeholder="Đăng nhập..." />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">So that (Để)</label>
                                <input className="form-input" value={form.soThat} onChange={e => setForm({ ...form, soThat: e.target.value })} placeholder="Truy cập..." />
                            </div>
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
                            <label className="form-label">Status & Assignee</label>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <select className="form-select" style={{ flex: 1 }} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                                    {Object.values(STORY_STATUS).map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                                <input className="form-input" style={{ flex: 1 }} value={form.assignee} onChange={e => setForm({ ...form, assignee: e.target.value })} placeholder="Assignee (Tên)" />
                            </div>
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Acceptance Criteria</label>
                        <textarea className="form-textarea" value={form.acceptanceCriteria} onChange={e => setForm({ ...form, acceptanceCriteria: e.target.value })} placeholder="- Tiêu chí 1&#10;- Tiêu chí 2" rows={3} />
                    </div>

                    {/* Subtasks Section */}
                    <div style={{ marginTop: 24, borderTop: '1px solid var(--border-color)', paddingTop: 20 }}>
                        <div className="flex-between mb-16">
                            <label className="form-label" style={{ margin: 0, fontSize: 14 }}>Subtasks ({subtasks.length})</label>
                            <button type="button" className="btn btn-secondary btn-sm" onClick={addSubtask} style={{ padding: '6px 12px', fontSize: 13 }}>
                                <Plus size={14} style={{ marginRight: 6 }} /> Thêm Subtask
                            </button>
                        </div>

                        {subtasks.length === 0 && (
                            <div className="text-muted text-sm text-center" style={{ padding: '24px 0', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                                Chưa có subtask nào. Bấm "Thêm Subtask" để tạo công việc con.
                            </div>
                        )}

                        {subtasks.map((subtask, index) => (
                            <div key={index} style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'flex-start' }}>
                                <input
                                    className="form-input"
                                    style={{ flex: 2 }}
                                    placeholder={`Subtask ${index + 1} title...`}
                                    value={subtask.title}
                                    onChange={(e) => updateSubtask(index, 'title', e.target.value)}
                                    required
                                />
                                <input
                                    className="form-input"
                                    style={{ flex: 1 }}
                                    placeholder="Assignee"
                                    value={subtask.assignee}
                                    onChange={(e) => updateSubtask(index, 'assignee', e.target.value)}
                                />
                                <button
                                    type="button"
                                    className="btn btn-ghost btn-icon"
                                    style={{ color: 'var(--accent-danger)' }}
                                    onClick={() => removeSubtask(index)}
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>

                    <div style={{ marginTop: 32, display: 'flex', justifyContent: 'flex-end', gap: 12, borderTop: '1px solid var(--border-color)', paddingTop: 20 }}>
                        <button type="button" className="btn btn-secondary" onClick={close} disabled={isPushing}>Hủy</button>
                        {editing && (
                            <button type="button" className="btn btn-danger" disabled={isPushing} onClick={() => {
                                dispatch({ type: 'DELETE_STORY', payload: editing.id });
                                notify('User Story đã bị xóa!', 'error');
                                close();
                            }}>Xóa</button>
                        )}
                        <button type="submit" className="btn btn-primary" disabled={isPushing} style={{ minWidth: 140 }}>
                            {isPushing ? <><Loader size={16} style={{ animation: 'spin 1s linear infinite', marginRight: 8, verticalAlign: 'middle' }} /> Đang Push...</> : (editing ? 'Cập nhật' : (syncToJira ? 'Tạo & Push Jira' : 'Tạo Story'))}
                        </button>
                    </div>
                </form>
            </div>
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}