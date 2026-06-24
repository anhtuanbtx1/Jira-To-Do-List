import React from 'react';
import { useStore } from '../data/store';
import {
    LayoutDashboard, List, Columns3, Layers, CalendarDays,
    Upload, FolderKanban, Settings, Clock, BarChart3, FileText,
} from 'lucide-react';

export default function Sidebar() {
    const { state, dispatch } = useStore();

    const navItems = [
        { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { id: 'backlog', icon: List, label: 'Backlog' },
        { id: 'board', icon: Columns3, label: 'Board' },
        { id: 'sprints', icon: CalendarDays, label: 'Sprints' },
        { id: 'epics', icon: Layers, label: 'Epics' },
        { id: 'releasenote', icon: FileText, label: 'AI Release Note' },
        { id: 'import', icon: Upload, label: 'Import Excel' },
    ];

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <div className="sidebar-logo">
                    <div className="sidebar-logo-icon">JP</div>
                    <div>
                        <h1>JiraPO</h1>
                        <span>Project Management</span>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="sidebar-nav">
                <div className="nav-section-label">Menu</div>
                {navItems.map(item => (
                    <div
                        key={item.id}
                        className={`nav-item ${state.currentPage === item.id ? 'active' : ''}`}
                        onClick={() => dispatch({ type: 'SET_PAGE', payload: item.id })}
                    >
                        <item.icon size={18} />
                        <span>{item.label}</span>
                    </div>
                ))}
                <div className="nav-section-label">Cấu hình</div>
                <div
                    className={`nav-item ${state.currentPage === 'settings' ? 'active' : ''}`}
                    onClick={() => dispatch({ type: 'SET_PAGE', payload: 'settings' })}
                >
                    <Settings size={18} />
                    <span>Jira Settings</span>
                </div>
                <div
                    className={`nav-item ${state.currentPage === 'logwork' ? 'active' : ''}`}
                    onClick={() => dispatch({ type: 'SET_PAGE', payload: 'logwork' })}
                >
                    <Clock size={18} />
                    <span>Log Work</span>
                </div>
                <div
                    className={`nav-item ${state.currentPage === 'logworkstats' ? 'active' : ''}`}
                    onClick={() => dispatch({ type: 'SET_PAGE', payload: 'logworkstats' })}
                >
                    <BarChart3 size={18} />
                    <span>Thống kê Log</span>
                </div>
            </nav>

            {/* Footer */}
            <div style={{ padding: '16px', borderTop: '1px solid var(--border-color)' }}>
                <div className="text-xs text-muted" style={{ textAlign: 'center' }}>
                    <FolderKanban size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                    JiraPO Tool v1.0
                </div>
            </div>
        </aside>
    );
}
