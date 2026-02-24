import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../data/store';
import { loadJiraSettings, searchJiraIssues } from '../utils/jiraApi';
import { Search, RefreshCw, Loader, ExternalLink, AlertCircle, Cloud } from 'lucide-react';

const PRIORITY_ICON = {
    'Highest': '🔴',
    'High': '🟠',
    'Medium': '🟡',
    'Low': '🟢',
    'Lowest': '⚪',
};

const STATUS_CLASS_MAP = {
    'Open': 'todo',
    'To Do': 'todo',
    'Reopened': 'todo',
    'In Progress': 'progress',
    'In Development': 'progress',
    'In Review': 'review',
    'Code Review': 'review',
    'Resolved': 'done',
    'Done': 'done',
    'Closed': 'closed',
};

export default function BacklogPage() {
    const { dispatch } = useStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');

    // Jira issues state
    const [jiraIssues, setJiraIssues] = useState([]);
    const [jiraLoading, setJiraLoading] = useState(false);
    const [jiraError, setJiraError] = useState(null);
    const [jiraTotal, setJiraTotal] = useState(0);
    const [jiraLoaded, setJiraLoaded] = useState(false);

    const jiraSettings = loadJiraSettings();
    const isJiraConfigured = !!(jiraSettings.baseUrl && jiraSettings.bearerToken);
    const projectKey = jiraSettings.defaultProjectKey;

    // Load Jira issues on mount
    useEffect(() => {
        if (isJiraConfigured && projectKey) {
            loadJiraIssues();
        }
    }, []);

    const loadJiraIssues = async (statusOverride) => {
        if (!isJiraConfigured) return;
        const pk = projectKey || 'C4TD';
        const status = statusOverride !== undefined ? statusOverride : filterStatus;
        let jql = `project=${pk} AND assignee=currentUser()`;
        if (status && status !== 'all') {
            jql += ` AND status="${status}"`;
        }

        setJiraLoading(true);
        setJiraError(null);

        const result = await searchJiraIssues(jiraSettings, jql, 'summary,status,priority,assignee', 50);

        if (result.success) {
            setJiraIssues(result.issues);
            setJiraTotal(result.total);
            setJiraLoaded(true);
        } else {
            setJiraError(result.error);
        }
        setJiraLoading(false);
    };

    const getStatusClass = (status) => STATUS_CLASS_MAP[status] || 'todo';

    // Filter Jira issues by search
    const filteredJiraIssues = useMemo(() => {
        if (!searchTerm) return jiraIssues;
        const term = searchTerm.toLowerCase();
        return jiraIssues.filter(i =>
            i.summary.toLowerCase().includes(term) ||
            i.key.toLowerCase().includes(term)
        );
    }, [jiraIssues, searchTerm]);

    return (
        <div>
            {/* Toolbar */}
            <div className="flex-between mb-16" style={{ flexWrap: 'wrap', gap: 12 }}>
                <div className="flex gap-12" style={{ alignItems: 'center', flex: 1, minWidth: 200 }}>
                    <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
                        <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                        <input className="form-input" style={{ paddingLeft: 36 }} placeholder="Tìm kiếm issues..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                    {isJiraConfigured && (
                        <select
                            className="form-select"
                            style={{ width: 'auto', padding: '8px 36px 8px 12px', fontSize: 12 }}
                            value={filterStatus}
                            onChange={e => {
                                setFilterStatus(e.target.value);
                                loadJiraIssues(e.target.value);
                            }}
                        >
                            <option value="all">Tất cả Status</option>
                            <option value="Open">Open</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Resolved">Resolved</option>
                            <option value="Closed">Closed</option>
                            <option value="Done">Done</option>
                        </select>
                    )}
                </div>
                {isJiraConfigured && (
                    <button
                        className="btn btn-secondary"
                        onClick={() => loadJiraIssues()}
                        disabled={jiraLoading}
                    >
                        {jiraLoading
                            ? <><Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> Loading...</>
                            : <><RefreshCw size={14} /> Refresh Jira</>
                        }
                    </button>
                )}
            </div>

            {/* Jira Issues */}
            {isJiraConfigured ? (
                <div className="card">
                    <div className="card-header">
                        <div className="flex gap-8" style={{ alignItems: 'center' }}>
                            <Cloud size={18} style={{ color: 'var(--accent-primary)' }} />
                            <span className="card-title">Jira Issues — {projectKey}</span>
                            {jiraLoaded && (
                                <span className="text-xs text-muted" style={{ fontWeight: 400 }}>
                                    ({filteredJiraIssues.length}{jiraTotal > filteredJiraIssues.length ? ` / ${jiraTotal}` : ''} issues · assignee = currentUser())
                                </span>
                            )}
                        </div>
                        {!jiraLoaded && !jiraLoading && (
                            <button className="btn btn-secondary btn-sm" onClick={loadJiraIssues}>
                                <RefreshCw size={12} /> Tải issues
                            </button>
                        )}
                    </div>

                    {/* Loading */}
                    {jiraLoading && (
                        <div style={{ padding: '32px 0', textAlign: 'center' }}>
                            <Loader size={28} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent-primary)', marginBottom: 10 }} />
                            <p className="text-sm text-muted">Đang tải issues từ Jira...</p>
                        </div>
                    )}

                    {/* Error */}
                    {jiraError && (
                        <div style={{
                            padding: '12px 16px',
                            margin: '0 0 8px',
                            background: 'rgba(239,68,68,0.08)',
                            border: '1px solid rgba(239,68,68,0.2)',
                            borderRadius: 'var(--radius-sm)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            fontSize: 12,
                        }}>
                            <AlertCircle size={14} style={{ color: 'var(--accent-danger)', flexShrink: 0 }} />
                            <span style={{ color: 'var(--accent-danger)' }}>{jiraError}</span>
                            <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto', fontSize: 11 }} onClick={loadJiraIssues}>Thử lại</button>
                        </div>
                    )}

                    {/* Issues Table */}
                    {jiraLoaded && !jiraLoading && filteredJiraIssues.length > 0 && (
                        <div style={{ overflowY: 'auto' }}>
                            <table className="import-preview-table" style={{ fontSize: 12.5 }}>
                                <thead>
                                    <tr>
                                        <th style={{ width: 100 }}>Key</th>
                                        <th>Summary</th>
                                        <th style={{ width: 110 }}>Status</th>
                                        <th style={{ width: 90 }}>Priority</th>
                                        <th style={{ width: 120 }}>Assignee</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredJiraIssues.map(issue => (
                                        <tr key={issue.key}>
                                            <td>
                                                <a
                                                    href={`${jiraSettings.baseUrl}/browse/${issue.key}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{ color: 'var(--accent-primary)', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
                                                >
                                                    {issue.key}
                                                    <ExternalLink size={10} />
                                                </a>
                                            </td>
                                            <td style={{ fontWeight: 500 }}>{issue.summary}</td>
                                            <td>
                                                <span className={`badge badge-status-${getStatusClass(issue.status)}`}>
                                                    {issue.status}
                                                </span>
                                            </td>
                                            <td>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    <span>{PRIORITY_ICON[issue.priority] || '⚪'}</span>
                                                    <span className="text-muted">{issue.priority}</span>
                                                </span>
                                            </td>
                                            <td className="text-muted truncate">{issue.assignee || '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Empty */}
                    {jiraLoaded && !jiraLoading && filteredJiraIssues.length === 0 && !jiraError && (
                        <div style={{ padding: '24px 0', textAlign: 'center' }}>
                            <p className="text-sm text-muted">Không tìm thấy issue nào.</p>
                        </div>
                    )}

                    {/* Not configured project key */}
                    {!projectKey && (
                        <div style={{ padding: '16px', fontSize: 12, color: 'var(--text-tertiary)' }}>
                            ⚠️ Cần thiết lập Default Project Key trong{' '}
                            <button className="btn btn-ghost btn-sm" style={{ padding: '2px 6px', fontSize: 11 }} onClick={() => dispatch({ type: 'SET_PAGE', payload: 'settings' })}>Jira Settings</button>
                            {' '}để tải issues.
                        </div>
                    )}
                </div>
            ) : (
                /* Not connected */
                <div className="empty-state" style={{ height: '50vh' }}>
                    <div className="empty-state-icon"><Cloud size={48} /></div>
                    <h3>Chưa kết nối Jira</h3>
                    <p>Cấu hình Jira API để xem issues được assign cho bạn.</p>
                    <button className="btn btn-primary" onClick={() => dispatch({ type: 'SET_PAGE', payload: 'settings' })}>
                        Cấu hình Jira →
                    </button>
                </div>
            )}

            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
