import React from 'react';
import { useStore } from '../data/store';
import { STORY_STATUS } from '../data/models';
import { Plus, Layers, Edit2 } from 'lucide-react';

export default function EpicsPage() {
    const { projectEpics, projectStories, dispatch } = useStore();

    const getEpicStats = (epicId) => {
        const stories = projectStories.filter(s => s.epicId === epicId);
        const done = stories.filter(s => s.status === STORY_STATUS.DONE).length;
        const points = stories.reduce((sum, s) => sum + (s.points || 0), 0);
        return { total: stories.length, done, points };
    };

    return (
        <div>
            <div className="flex-between mb-16">
                <span className="text-sm text-muted">{projectEpics.length} epics</span>
                <button className="btn btn-primary" onClick={() => dispatch({ type: 'TOGGLE_EPIC_MODAL' })}>
                    <Plus size={16} /> Tạo Epic
                </button>
            </div>

            {projectEpics.length > 0 ? (
                <div className="epic-grid">
                    {projectEpics.map(epic => {
                        const stats = getEpicStats(epic.id);
                        const pct = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;
                        return (
                            <div key={epic.id} className="epic-card" onClick={() => dispatch({ type: 'EDIT_EPIC', payload: epic })} style={{ borderTop: `3px solid ${epic.color}` }}>
                                <div className="epic-card-header">
                                    <div>
                                        <div className="epic-card-title">{epic.title}</div>
                                        {epic.description && <p className="text-xs text-muted mt-8">{epic.description}</p>}
                                    </div>
                                    <button className="btn btn-ghost btn-icon" onClick={(e) => { e.stopPropagation(); dispatch({ type: 'EDIT_EPIC', payload: epic }); }}>
                                        <Edit2 size={14} />
                                    </button>
                                </div>

                                {/* Progress */}
                                <div className="sprint-progress" style={{ marginTop: 8 }}>
                                    <div className="sprint-progress-text">
                                        <span>{stats.done}/{stats.total} stories</span>
                                        <span>{pct}%</span>
                                    </div>
                                    <div className="sprint-progress-bar">
                                        <div className="sprint-progress-fill" style={{ width: `${pct}%`, background: epic.color }} />
                                    </div>
                                </div>

                                <div className="epic-card-stats">
                                    <div className="epic-stat">
                                        <span className="epic-stat-value">{stats.total}</span>
                                        <span className="epic-stat-label">Stories</span>
                                    </div>
                                    <div className="epic-stat">
                                        <span className="epic-stat-value">{stats.done}</span>
                                        <span className="epic-stat-label">Done</span>
                                    </div>
                                    <div className="epic-stat">
                                        <span className="epic-stat-value">{stats.points}</span>
                                        <span className="epic-stat-label">Points</span>
                                    </div>
                                    <div className="epic-stat">
                                        <span className="epic-stat-value" style={{ color: epic.color }}>{epic.status}</span>
                                        <span className="epic-stat-label">Status</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="empty-state">
                    <div className="empty-state-icon"><Layers size={48} /></div>
                    <h3>Chưa có Epic nào</h3>
                    <p>Tạo Epic để nhóm các User Stories theo tính năng hoặc module.</p>
                    <button className="btn btn-primary" onClick={() => dispatch({ type: 'TOGGLE_EPIC_MODAL' })}>
                        <Plus size={16} /> Tạo Epic đầu tiên
                    </button>
                </div>
            )}
        </div>
    );
}
