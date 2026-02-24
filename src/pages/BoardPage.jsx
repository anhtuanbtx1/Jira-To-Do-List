import React, { useState, useMemo } from 'react';
import { useStore } from '../data/store';
import { STORY_STATUS } from '../data/models';
import { Columns3 } from 'lucide-react';

const COLUMNS = [
    { id: STORY_STATUS.TODO, label: 'To Do', dotClass: 'todo' },
    { id: STORY_STATUS.IN_PROGRESS, label: 'In Progress', dotClass: 'progress' },
    { id: STORY_STATUS.IN_REVIEW, label: 'In Review', dotClass: 'review' },
    { id: STORY_STATUS.DONE, label: 'Done', dotClass: 'done' },
];

export default function BoardPage() {
    const { projectSprints, projectStories, activeSprint, getStoriesBySprint, getEpicById, dispatch } = useStore();
    const [selectedSprintId, setSelectedSprintId] = useState(null);
    const [dragOverCol, setDragOverCol] = useState(null);

    const sprintId = selectedSprintId || (activeSprint ? activeSprint.id : null);
    const sprintStories = useMemo(() => sprintId ? getStoriesBySprint(sprintId) : [], [sprintId, projectStories]);

    const handleDragStart = (e, storyId) => {
        e.dataTransfer.setData('storyId', storyId);
        e.currentTarget.classList.add('dragging');
    };

    const handleDragEnd = (e) => {
        e.currentTarget.classList.remove('dragging');
    };

    const handleDragOver = (e, colId) => {
        e.preventDefault();
        setDragOverCol(colId);
    };

    const handleDragLeave = () => {
        setDragOverCol(null);
    };

    const handleDrop = (e, newStatus) => {
        e.preventDefault();
        setDragOverCol(null);
        const storyId = e.dataTransfer.getData('storyId');
        if (storyId) {
            dispatch({ type: 'MOVE_STORY_STATUS', payload: { id: storyId, status: newStatus } });
        }
    };

    if (!sprintId) {
        return (
            <div className="empty-state" style={{ height: '60vh' }}>
                <div className="empty-state-icon"><Columns3 size={48} /></div>
                <h3>Chưa có Sprint</h3>
                <p>Tạo và start Sprint để xem Kanban Board.</p>
                <button className="btn btn-primary" onClick={() => dispatch({ type: 'SET_PAGE', payload: 'sprints' })}>
                    Quản lý Sprints
                </button>
            </div>
        );
    }

    return (
        <div>
            {/* Sprint Selector */}
            <div className="flex-between mb-16">
                <select className="form-select" style={{ width: 'auto', padding: '8px 36px 8px 14px' }} value={sprintId || ''} onChange={e => setSelectedSprintId(e.target.value)}>
                    {projectSprints.map(sp => (
                        <option key={sp.id} value={sp.id}>{sp.name} ({sp.status})</option>
                    ))}
                </select>
                <span className="text-sm text-muted">
                    {sprintStories.length} stories · {sprintStories.reduce((sum, s) => sum + (s.points || 0), 0)} points
                </span>
            </div>

            {/* Kanban Board */}
            <div className="kanban-board">
                {COLUMNS.map(col => {
                    const colStories = sprintStories.filter(s => s.status === col.id);
                    return (
                        <div
                            key={col.id}
                            className={`kanban-column ${dragOverCol === col.id ? 'drag-over' : ''}`}
                            onDragOver={(e) => handleDragOver(e, col.id)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, col.id)}
                        >
                            <div className="kanban-column-header">
                                <div className="kanban-column-title">
                                    <span className={`kanban-dot ${col.dotClass}`} />
                                    {col.label}
                                </div>
                                <span className="kanban-column-count">{colStories.length}</span>
                            </div>
                            <div className="kanban-column-body">
                                {colStories.map(story => {
                                    const epic = story.epicId ? getEpicById(story.epicId) : null;
                                    return (
                                        <div
                                            key={story.id}
                                            className="story-card"
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, story.id)}
                                            onDragEnd={handleDragEnd}
                                            onClick={() => dispatch({ type: 'EDIT_STORY', payload: story })}
                                        >
                                            <div className="story-card-header">
                                                <span className="story-card-title">{story.title}</span>
                                            </div>
                                            {story.asA && (
                                                <p className="text-xs text-muted" style={{ marginBottom: 8, lineHeight: 1.4 }}>
                                                    As a {story.asA}, I want to {story.iWantTo}
                                                </p>
                                            )}
                                            <div className="story-card-meta">
                                                <span className={`badge badge-priority-${story.priority}`}>{story.priority}</span>
                                                {epic && <span className="badge-epic" style={{ background: `${epic.color}20`, color: epic.color }}>{epic.title}</span>}
                                                {story.points > 0 && <span className="badge-points">{story.points}</span>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
