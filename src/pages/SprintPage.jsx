import React, { useMemo, useState } from 'react';
import { useStore } from '../data/store';
import { STORY_STATUS } from '../data/models';
import { Plus, CalendarDays, Play, CheckCircle, Edit2, Trash2, ChevronDown, ChevronUp, ArrowRight, ArrowLeft } from 'lucide-react';

export default function SprintPage() {
    const { projectSprints, projectStories, backlogStories, getStoriesBySprint, getEpicById, dispatch, notify } = useStore();
    const [expandedSprint, setExpandedSprint] = useState(null);

    const toggleExpand = (id) => setExpandedSprint(expandedSprint === id ? null : id);

    const handleStartSprint = (sprintId) => {
        dispatch({ type: 'START_SPRINT', payload: sprintId });
        notify('Sprint đã được bắt đầu! 🚀');
    };

    const handleCompleteSprint = (sprintId) => {
        if (confirm('Hoàn thành Sprint? Các stories chưa Done sẽ vẫn giữ nguyên.')) {
            dispatch({ type: 'COMPLETE_SPRINT', payload: sprintId });
            notify('Sprint đã hoàn thành! ✅');
        }
    };

    const handleAssignToSprint = (storyId, sprintId) => {
        dispatch({ type: 'ASSIGN_STORY_TO_SPRINT', payload: { storyId, sprintId } });
    };

    const handleUnassign = (storyId) => {
        dispatch({ type: 'UNASSIGN_STORY_FROM_SPRINT', payload: storyId });
    };

    return (
        <div>
            <div className="flex-between mb-16">
                <span className="text-sm text-muted">{projectSprints.length} sprints</span>
                <button className="btn btn-primary" onClick={() => dispatch({ type: 'TOGGLE_SPRINT_MODAL' })}>
                    <Plus size={16} /> Tạo Sprint
                </button>
            </div>

            {projectSprints.length > 0 ? (
                <div>
                    {projectSprints.map(sprint => {
                        const stories = getStoriesBySprint(sprint.id);
                        const doneCount = stories.filter(s => s.status === STORY_STATUS.DONE).length;
                        const totalPoints = stories.reduce((sum, s) => sum + (s.points || 0), 0);
                        const pct = stories.length > 0 ? Math.round((doneCount / stories.length) * 100) : 0;
                        const isExpanded = expandedSprint === sprint.id;

                        return (
                            <div key={sprint.id} className="sprint-card">
                                <div className="sprint-card-header">
                                    <div className="flex gap-12" style={{ alignItems: 'center' }}>
                                        <button className="btn btn-ghost btn-icon" onClick={() => toggleExpand(sprint.id)}>
                                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                        </button>
                                        <div>
                                            <h3 style={{ fontSize: 16, fontWeight: 700 }}>{sprint.name}</h3>
                                            {sprint.goal && <p className="text-xs text-muted">{sprint.goal}</p>}
                                        </div>
                                    </div>
                                    <div className="flex gap-8" style={{ alignItems: 'center' }}>
                                        <span className={`sprint-status-badge ${sprint.status.toLowerCase()}`}>{sprint.status}</span>
                                        {sprint.status === 'Planning' && (
                                            <button className="btn btn-sm btn-secondary" onClick={() => handleStartSprint(sprint.id)}>
                                                <Play size={12} /> Start
                                            </button>
                                        )}
                                        {sprint.status === 'Active' && (
                                            <button className="btn btn-sm btn-secondary" onClick={() => handleCompleteSprint(sprint.id)}>
                                                <CheckCircle size={12} /> Complete
                                            </button>
                                        )}
                                        <button className="btn btn-ghost btn-icon" onClick={() => dispatch({ type: 'EDIT_SPRINT', payload: sprint })}>
                                            <Edit2 size={14} />
                                        </button>
                                        <button className="btn btn-ghost btn-icon" onClick={() => {
                                            if (confirm(`Xóa "${sprint.name}"?`)) {
                                                dispatch({ type: 'DELETE_SPRINT', payload: sprint.id });
                                                notify('Sprint đã bị xóa!', 'error');
                                            }
                                        }}>
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>

                                <div className="sprint-dates">
                                    <CalendarDays size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                                    {sprint.startDate} → {sprint.endDate}
                                </div>

                                <div className="sprint-progress">
                                    <div className="sprint-progress-text">
                                        <span>{doneCount}/{stories.length} stories · {totalPoints} points</span>
                                        <span>{pct}%</span>
                                    </div>
                                    <div className="sprint-progress-bar">
                                        <div className="sprint-progress-fill" style={{ width: `${pct}%` }} />
                                    </div>
                                </div>

                                {/* Expanded: Stories in Sprint + Backlog to assign */}
                                {isExpanded && (
                                    <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                        {/* Sprint stories */}
                                        <div>
                                            <h4 className="text-sm font-bold mb-8">📋 Stories trong Sprint ({stories.length})</h4>
                                            {stories.length > 0 ? stories.map(story => {
                                                const epic = story.epicId ? getEpicById(story.epicId) : null;
                                                return (
                                                    <div key={story.id} className="story-card" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        <button className="btn btn-ghost btn-icon btn-sm" title="Trả về Backlog" onClick={() => handleUnassign(story.id)}>
                                                            <ArrowLeft size={12} />
                                                        </button>
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <div className="truncate text-sm font-bold">{story.title}</div>
                                                            <div className="flex gap-8 mt-8" style={{ marginTop: 4 }}>
                                                                <span className={`badge badge-priority-${story.priority}`} style={{ fontSize: 10 }}>{story.priority}</span>
                                                                {epic && <span style={{ fontSize: 10, color: epic.color }}>● {epic.title}</span>}
                                                                {story.points > 0 && <span className="text-xs text-muted">{story.points} SP</span>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            }) : <p className="text-xs text-muted">Kéo stories từ Backlog vào Sprint</p>}
                                        </div>

                                        {/* Backlog to assign */}
                                        <div>
                                            <h4 className="text-sm font-bold mb-8">📦 Backlog ({backlogStories.length})</h4>
                                            <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                                                {backlogStories.length > 0 ? backlogStories.map(story => (
                                                    <div key={story.id} className="story-card" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <div className="truncate text-sm">{story.title}</div>
                                                            <div className="flex gap-8" style={{ marginTop: 4 }}>
                                                                <span className={`badge badge-priority-${story.priority}`} style={{ fontSize: 10 }}>{story.priority}</span>
                                                                {story.points > 0 && <span className="text-xs text-muted">{story.points} SP</span>}
                                                            </div>
                                                        </div>
                                                        <button className="btn btn-ghost btn-icon btn-sm" title="Gán vào Sprint" onClick={() => handleAssignToSprint(story.id, sprint.id)}>
                                                            <ArrowRight size={12} />
                                                        </button>
                                                    </div>
                                                )) : <p className="text-xs text-muted">Không còn stories trong backlog</p>}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="empty-state">
                    <div className="empty-state-icon"><CalendarDays size={48} /></div>
                    <h3>Chưa có Sprint nào</h3>
                    <p>Tạo Sprint 2 tuần để bắt đầu quản lý tiến độ dự án.</p>
                    <button className="btn btn-primary" onClick={() => dispatch({ type: 'TOGGLE_SPRINT_MODAL' })}>
                        <Plus size={16} /> Tạo Sprint đầu tiên
                    </button>
                </div>
            )}
        </div>
    );
}
