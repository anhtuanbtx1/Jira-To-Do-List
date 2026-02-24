import React from 'react';
import { useStore } from '../data/store';
import { STORY_STATUS } from '../data/models';
import { Layers, BookOpen, CalendarDays, CheckCircle2, Clock, AlertTriangle, TrendingUp } from 'lucide-react';

export default function Dashboard() {
    const { currentProject, projectEpics, projectStories, projectSprints, activeSprint, getStoriesBySprint, dispatch } = useStore();

    if (!currentProject) {
        return (
            <div className="empty-state" style={{ height: '60vh' }}>
                <div className="empty-state-icon"><Layers size={64} /></div>
                <h3>Chào mừng đến JiraPO Tool!</h3>
                <p>Tạo dự án đầu tiên để bắt đầu quản lý User Stories, Epics và Sprints.</p>
                <button className="btn btn-primary" onClick={() => dispatch({ type: 'TOGGLE_PROJECT_MODAL' })}>
                    Tạo dự án mới
                </button>
            </div>
        );
    }

    const totalStories = projectStories.length;
    const doneStories = projectStories.filter(s => s.status === STORY_STATUS.DONE).length;
    const inProgressStories = projectStories.filter(s => s.status === STORY_STATUS.IN_PROGRESS).length;
    const totalPoints = projectStories.reduce((sum, s) => sum + (s.points || 0), 0);
    const donePoints = projectStories.filter(s => s.status === STORY_STATUS.DONE).reduce((sum, s) => sum + (s.points || 0), 0);
    const backlogCount = projectStories.filter(s => !s.sprintId).length;

    const activeSprintStories = activeSprint ? getStoriesBySprint(activeSprint.id) : [];
    const activeSprintDone = activeSprintStories.filter(s => s.status === STORY_STATUS.DONE).length;

    const recentStories = [...projectStories].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);

    const statusCounts = {
        [STORY_STATUS.TODO]: projectStories.filter(s => s.status === STORY_STATUS.TODO).length,
        [STORY_STATUS.IN_PROGRESS]: inProgressStories,
        [STORY_STATUS.IN_REVIEW]: projectStories.filter(s => s.status === STORY_STATUS.IN_REVIEW).length,
        [STORY_STATUS.DONE]: doneStories,
    };

    return (
        <div>
            {/* Stats */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon purple"><BookOpen size={24} /></div>
                    <div className="stat-info">
                        <h3>{totalStories}</h3>
                        <p>Tổng User Stories</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon green"><CheckCircle2 size={24} /></div>
                    <div className="stat-info">
                        <h3>{doneStories}</h3>
                        <p>Hoàn thành</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon orange"><Layers size={24} /></div>
                    <div className="stat-info">
                        <h3>{projectEpics.length}</h3>
                        <p>Epics</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon cyan"><CalendarDays size={24} /></div>
                    <div className="stat-info">
                        <h3>{projectSprints.length}</h3>
                        <p>Sprints</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon pink"><TrendingUp size={24} /></div>
                    <div className="stat-info">
                        <h3>{totalPoints > 0 ? Math.round((donePoints / totalPoints) * 100) : 0}%</h3>
                        <p>Story Points ({donePoints}/{totalPoints})</p>
                    </div>
                </div>
            </div>

            <div className="dashboard-grid">
                {/* Active Sprint */}
                <div className="card dashboard-section">
                    <div className="card-header">
                        <span className="card-title">🏃 Sprint hiện tại</span>
                    </div>
                    {activeSprint ? (
                        <div>
                            <h3 style={{ fontSize: 16, marginBottom: 8 }}>{activeSprint.name}</h3>
                            <p className="text-sm text-muted mb-8">{activeSprint.goal}</p>
                            <div className="text-xs text-muted mb-8">
                                <Clock size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                                {activeSprint.startDate} → {activeSprint.endDate}
                            </div>
                            <div className="sprint-progress">
                                <div className="sprint-progress-text">
                                    <span>{activeSprintDone}/{activeSprintStories.length} stories</span>
                                    <span>{activeSprintStories.length > 0 ? Math.round((activeSprintDone / activeSprintStories.length) * 100) : 0}%</span>
                                </div>
                                <div className="sprint-progress-bar">
                                    <div className="sprint-progress-fill" style={{ width: `${activeSprintStories.length > 0 ? (activeSprintDone / activeSprintStories.length) * 100 : 0}%` }} />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-muted">Chưa có Sprint active. Tạo và start sprint trong mục Sprints.</p>
                    )}
                </div>

                {/* Status Distribution */}
                <div className="card dashboard-section">
                    <div className="card-header">
                        <span className="card-title">📊 Phân bố trạng thái</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {Object.entries(statusCounts).map(([status, count]) => {
                            const pct = totalStories > 0 ? (count / totalStories) * 100 : 0;
                            const colors = {
                                [STORY_STATUS.TODO]: 'var(--status-todo)',
                                [STORY_STATUS.IN_PROGRESS]: 'var(--status-progress)',
                                [STORY_STATUS.IN_REVIEW]: 'var(--status-review)',
                                [STORY_STATUS.DONE]: 'var(--status-done)',
                            };
                            return (
                                <div key={status}>
                                    <div className="flex-between mb-8" style={{ marginBottom: 4 }}>
                                        <span className="text-sm">{status}</span>
                                        <span className="text-sm font-bold">{count}</span>
                                    </div>
                                    <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3 }}>
                                        <div style={{ height: '100%', width: `${pct}%`, background: colors[status], borderRadius: 3, transition: 'width 0.5s ease' }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Recent Stories */}
                <div className="card dashboard-section dashboard-section-full">
                    <div className="card-header">
                        <span className="card-title">🕐 User Stories gần đây</span>
                        <span className="text-xs text-muted">{backlogCount} trong backlog</span>
                    </div>
                    {recentStories.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {recentStories.map(story => (
                                <div key={story.id} className="backlog-item" style={{ cursor: 'pointer' }} onClick={() => dispatch({ type: 'EDIT_STORY', payload: story })}>
                                    <span className={`badge badge-priority-${story.priority}`} style={{ minWidth: 60, textAlign: 'center' }}>{story.priority}</span>
                                    <span className="truncate" style={{ fontWeight: 500 }}>{story.title}</span>
                                    <span className="badge-points">{story.points} SP</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-muted">Chưa có User Stories. Tạo stories mới hoặc import từ Excel.</p>
                    )}
                </div>
            </div>
        </div>
    );
}
