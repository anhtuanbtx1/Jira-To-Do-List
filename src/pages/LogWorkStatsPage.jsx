import React, { useState } from 'react';
import { loadJiraSettings } from '../utils/jiraApi';
import { searchWorklogs } from '../utils/tempoApi';
import {
    Search, Loader, Calendar, User, Clock, BarChart3,
    XCircle, TrendingUp, Timer, CalendarDays, AlertTriangle
} from 'lucide-react';

function formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function getMonthRange() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { start: formatDate(start), end: formatDate(end) };
}

function getDayName(dateStr) {
    const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    return days[new Date(dateStr).getDay()];
}

function getDayShort(dateStr) {
    return dateStr.substring(8); // "DD"
}

function isWeekend(dateStr) {
    const d = new Date(dateStr).getDay();
    return d === 0 || d === 6;
}

// Aggregate worklogs by date
function aggregateByDate(worklogs) {
    const map = {};
    worklogs.forEach(wl => {
        const date = wl.started || wl.dateStarted || wl.startDate;
        if (!date) return;
        const dateKey = date.substring(0, 10); // "YYYY-MM-DD"
        if (!map[dateKey]) {
            map[dateKey] = { date: dateKey, totalSeconds: 0, entries: [] };
        }
        map[dateKey].totalSeconds += wl.timeSpentSeconds || 0;
        map[dateKey].entries.push(wl);
    });
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
}

// Aggregate by task/issue
function aggregateByTask(worklogs) {
    const map = {};
    worklogs.forEach(wl => {
        const key = wl.issue?.key || wl.originTaskId || wl.issueKey || 'Unknown';
        const summary = wl.issue?.summary || wl.issueSummary || '';
        if (!map[key]) {
            map[key] = { key, summary, totalSeconds: 0, count: 0 };
        }
        map[key].totalSeconds += wl.timeSpentSeconds || 0;
        map[key].count++;
    });
    return Object.values(map).sort((a, b) => b.totalSeconds - a.totalSeconds);
}

// Fill in missing dates for chart completeness
function fillDates(dailyData, startDate, endDate) {
    const result = [];
    const dataMap = {};
    dailyData.forEach(d => { dataMap[d.date] = d; });

    const current = new Date(startDate);
    const end = new Date(endDate);
    while (current <= end) {
        const key = formatDate(current);
        result.push(dataMap[key] || { date: key, totalSeconds: 0, entries: [] });
        current.setDate(current.getDate() + 1);
    }
    return result;
}

// Custom SVG Bar Chart Component
function BarChart({ data, maxHours = 8 }) {
    if (!data || data.length === 0) return null;

    const barWidth = Math.max(24, Math.min(52, Math.floor(1100 / data.length) - 4));
    const chartHeight = 320;
    const chartWidth = data.length * (barWidth + 4) + 60;
    const maxVal = Math.max(maxHours, ...data.map(d => d.totalSeconds / 3600)) * 1.1;

    const gridLines = [];
    const step = maxHours <= 8 ? 2 : Math.ceil(maxVal / 5);
    for (let v = step; v <= maxVal; v += step) {
        gridLines.push(v);
    }

    return (
        <div style={{ overflowX: 'auto', padding: '8px 0' }}>
            <svg width={Math.max(chartWidth, 500)} height={chartHeight + 60} style={{ display: 'block', margin: '0 auto' }}>
                {/* Grid lines */}
                {gridLines.map(v => {
                    const y = chartHeight - (v / maxVal) * chartHeight + 10;
                    return (
                        <g key={v}>
                            <line x1={40} x2={chartWidth} y1={y} y2={y} stroke="var(--border-color)" strokeDasharray="3,3" />
                            <text x={36} y={y + 4} textAnchor="end" fontSize={12} fill="var(--text-tertiary)" fontWeight="500">{v}h</text>
                        </g>
                    );
                })}
                {/* Baseline */}
                <line x1={40} x2={chartWidth} y1={chartHeight + 10} y2={chartHeight + 10} stroke="var(--border-color)" />

                {/* 8h reference line */}
                {(() => {
                    const refY = chartHeight - (8 / maxVal) * chartHeight + 10;
                    return (
                        <line x1={40} x2={chartWidth} y1={refY} y2={refY}
                            stroke="var(--accent-primary)" strokeDasharray="6,3" strokeOpacity={0.4} />
                    );
                })()}

                {/* Bars */}
                {data.map((d, i) => {
                    const hours = d.totalSeconds / 3600;
                    const barH = Math.max(0, (hours / maxVal) * chartHeight);
                    const x = 50 + i * (barWidth + 4);
                    const y = chartHeight - barH + 10;
                    const weekend = isWeekend(d.date);
                    const hasData = hours > 0;

                    let fill;
                    if (!hasData) fill = weekend ? 'rgba(100,100,120,0.15)' : 'rgba(100,100,120,0.25)';
                    else if (hours >= 8) fill = 'url(#barGradientFull)';
                    else if (hours >= 4) fill = 'url(#barGradientHalf)';
                    else fill = 'url(#barGradientLow)';

                    return (
                        <g key={d.date}>
                            {/* Bar */}
                            {hasData && (
                                <rect
                                    x={x} y={y} width={barWidth} height={barH}
                                    rx={3} fill={fill} opacity={weekend ? 0.6 : 1}
                                    style={{ transition: 'all 0.3s ease' }}
                                >
                                    <title>{d.date} ({getDayName(d.date)}): {hours.toFixed(1)}h</title>
                                </rect>
                            )}
                            {/* No data indicator */}
                            {!hasData && !weekend && (
                                <rect
                                    x={x} y={chartHeight + 6} width={barWidth} height={4}
                                    rx={2} fill="rgba(239,68,68,0.3)"
                                />
                            )}
                            {/* Hours label on top */}
                            {hasData && (
                                <text
                                    x={x + barWidth / 2} y={y - 6}
                                    textAnchor="middle" fontSize={11} fontWeight="700"
                                    fill={hours >= 8 ? 'var(--accent-success)' : hours >= 4 ? 'var(--accent-warning)' : 'var(--accent-danger)'}
                                >
                                    {hours % 1 === 0 ? hours : hours.toFixed(1)}
                                </text>
                            )}
                            {/* Date label */}
                            <text
                                x={x + barWidth / 2} y={chartHeight + 28}
                                textAnchor="middle" fontSize={11}
                                fill={weekend ? 'var(--accent-danger)' : 'var(--text-tertiary)'}
                                fontWeight={weekend ? 600 : 400}
                            >
                                {getDayShort(d.date)}
                            </text>
                            {/* Day name */}
                            <text
                                x={x + barWidth / 2} y={chartHeight + 44}
                                textAnchor="middle" fontSize={10}
                                fill={weekend ? 'rgba(239,68,68,0.6)' : 'var(--text-tertiary)'}
                            >
                                {getDayName(d.date)}
                            </text>
                        </g>
                    );
                })}

                {/* Gradient definitions */}
                <defs>
                    <linearGradient id="barGradientFull" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#22c55e" />
                        <stop offset="100%" stopColor="#16a34a" />
                    </linearGradient>
                    <linearGradient id="barGradientHalf" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#f59e0b" />
                        <stop offset="100%" stopColor="#d97706" />
                    </linearGradient>
                    <linearGradient id="barGradientLow" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#ef4444" />
                        <stop offset="100%" stopColor="#dc2626" />
                    </linearGradient>
                </defs>
            </svg>
        </div>
    );
}

export default function LogWorkStatsPage() {
    const monthRange = getMonthRange();
    const [worker, setWorker] = useState('JIRAUSER10108');
    const [fromDate, setFromDate] = useState(monthRange.start);
    const [toDate, setToDate] = useState(monthRange.end);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [worklogs, setWorklogs] = useState(null);

    const handleSearch = async () => {
        const jiraSettings = loadJiraSettings();
        if (!jiraSettings.baseUrl || !jiraSettings.bearerToken) {
            setError('Chưa cấu hình Jira Settings (Base URL & Bearer Token). Vui lòng vào Settings để cấu hình.');
            return;
        }

        setLoading(true);
        setError(null);
        setWorklogs(null);

        const result = await searchWorklogs(jiraSettings, {
            from: fromDate,
            to: toDate,
            worker: [worker],
        });

        if (result.success) {
            setWorklogs(result.worklogs);
        } else {
            setError(result.error);
        }
        setLoading(false);
    };

    // Computed stats
    const dailyData = worklogs ? aggregateByDate(worklogs) : [];
    const filledData = worklogs ? fillDates(dailyData, fromDate, toDate) : [];
    const taskData = worklogs ? aggregateByTask(worklogs) : [];

    const totalSeconds = worklogs ? worklogs.reduce((sum, w) => sum + (w.timeSpentSeconds || 0), 0) : 0;
    const totalHours = totalSeconds / 3600;
    const totalDays = totalHours / 8;
    const workingDays = dailyData.filter(d => d.totalSeconds > 0).length;
    const avgHoursPerDay = workingDays > 0 ? totalHours / workingDays : 0;

    return (
        <div style={{ width: '100%' }}>
            {/* Search filters */}
            <div className="card mb-16">
                <div className="card-header">
                    <span className="card-title">🔍 Tìm kiếm Worklog</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 16, alignItems: 'end' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">
                            <User size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                            Worker (Jira User Key)
                        </label>
                        <input
                            className="form-input"
                            value={worker}
                            onChange={e => setWorker(e.target.value)}
                            placeholder="JIRAUSER10108"
                            style={{ fontFamily: 'monospace', fontWeight: 600 }}
                        />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">
                            <Calendar size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                            Từ ngày
                        </label>
                        <input
                            className="form-input"
                            type="date"
                            value={fromDate}
                            onChange={e => setFromDate(e.target.value)}
                            style={{ fontWeight: 600 }}
                        />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">
                            <Calendar size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                            Đến ngày
                        </label>
                        <input
                            className="form-input"
                            type="date"
                            value={toDate}
                            onChange={e => setToDate(e.target.value)}
                            style={{ fontWeight: 600 }}
                        />
                    </div>
                    <button
                        className="btn btn-primary"
                        onClick={handleSearch}
                        disabled={loading || !worker || !fromDate || !toDate}
                        style={{ minWidth: 160, height: 42 }}
                    >
                        {loading
                            ? <><Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> Đang tải...</>
                            : <><Search size={14} /> Tìm kiếm</>
                        }
                    </button>
                </div>
            </div>


            {/* Error */}
            {error && (
                <div style={{
                    padding: '14px 18px', borderRadius: 'var(--radius-md)', marginBottom: 16,
                    background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
                    display: 'flex', alignItems: 'center', gap: 12,
                }}>
                    <XCircle size={18} style={{ color: 'var(--accent-danger)', flexShrink: 0 }} />
                    <span style={{ color: 'var(--accent-danger)', fontWeight: 600 }}>{error}</span>
                </div>
            )}

            {/* Stats Summary Cards */}
            {worklogs && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
                    <StatCard
                        icon={<Clock size={20} />}
                        label="Tổng giờ"
                        value={`${totalHours.toFixed(1)}h`}
                        sub={`${totalSeconds.toLocaleString()} giây`}
                        color="#8b5cf6"
                    />
                    <StatCard
                        icon={<CalendarDays size={20} />}
                        label="Ngày công"
                        value={`${totalDays.toFixed(1)} ngày`}
                        sub={`${workingDays} ngày có log`}
                        color="#22c55e"
                    />
                    <StatCard
                        icon={<TrendingUp size={20} />}
                        label="TB mỗi ngày"
                        value={`${avgHoursPerDay.toFixed(1)}h`}
                        sub={`${worklogs.length} bản ghi`}
                        color="#f59e0b"
                    />
                    <StatCard
                        icon={<Timer size={20} />}
                        label="Số task"
                        value={taskData.length}
                        sub="task khác nhau"
                        color="#06b6d4"
                    />
                </div>
            )}

            {/* Bar Chart */}
            {worklogs && filledData.length > 0 && (
                <div className="card mb-16">
                    <div className="card-header">
                        <span className="card-title">
                            <BarChart3 size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                            Biểu đồ giờ làm việc theo ngày
                        </span>
                        <div className="text-xs" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span style={{ width: 10, height: 10, borderRadius: 2, background: '#22c55e', display: 'inline-block' }} /> ≥8h
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span style={{ width: 10, height: 10, borderRadius: 2, background: '#f59e0b', display: 'inline-block' }} /> 4-8h
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span style={{ width: 10, height: 10, borderRadius: 2, background: '#ef4444', display: 'inline-block' }} /> &lt;4h
                            </span>
                        </div>
                    </div>
                    <BarChart data={filledData} />
                </div>
            )}

            {/* Worklogs by Task */}
            {worklogs && taskData.length > 0 && (
                <div className="card mb-16">
                    <div className="card-header">
                        <span className="card-title">📋 Thống kê theo Task</span>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    <th style={thStyle}>#</th>
                                    <th style={{ ...thStyle, textAlign: 'left' }}>Task</th>
                                    <th style={{ ...thStyle, textAlign: 'left' }}>Summary</th>
                                    <th style={thStyle}>Số lần</th>
                                    <th style={thStyle}>Tổng giờ</th>
                                    <th style={{ ...thStyle, textAlign: 'left', minWidth: 120 }}>Tỷ lệ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {taskData.map((task, idx) => {
                                    const pct = totalSeconds > 0 ? (task.totalSeconds / totalSeconds * 100) : 0;
                                    return (
                                        <tr key={task.key} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                            <td style={tdStyle}>{idx + 1}</td>
                                            <td style={{ ...tdStyle, textAlign: 'left', fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-primary)' }}>
                                                {task.key}
                                            </td>
                                            <td style={{ ...tdStyle, textAlign: 'left', maxWidth: 250 }} className="truncate">
                                                {task.summary || '—'}
                                            </td>
                                            <td style={tdStyle}>{task.count}</td>
                                            <td style={{ ...tdStyle, fontWeight: 700, color: 'var(--accent-success)' }}>
                                                {(task.totalSeconds / 3600).toFixed(1)}h
                                            </td>
                                            <td style={{ ...tdStyle, textAlign: 'left' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <div style={{
                                                        flex: 1, height: 6, borderRadius: 3,
                                                        background: 'var(--bg-glass)', overflow: 'hidden',
                                                    }}>
                                                        <div style={{
                                                            width: `${pct}%`, height: '100%', borderRadius: 3,
                                                            background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-primary-hover))',
                                                            transition: 'width 0.5s ease',
                                                        }} />
                                                    </div>
                                                    <span className="text-xs text-muted" style={{ minWidth: 36 }}>{pct.toFixed(0)}%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Daily Details Table */}
            {worklogs && dailyData.length > 0 && (
                <div className="card">
                    <div className="card-header">
                        <span className="card-title">📅 Chi tiết theo ngày</span>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    <th style={thStyle}>#</th>
                                    <th style={thStyle}>Ngày</th>
                                    <th style={thStyle}>Thứ</th>
                                    <th style={thStyle}>Số giờ</th>
                                    <th style={thStyle}>Số bản ghi</th>
                                    <th style={{ ...thStyle, textAlign: 'left' }}>Tasks</th>
                                </tr>
                            </thead>
                            <tbody>
                                {dailyData.map((d, idx) => {
                                    const hours = d.totalSeconds / 3600;
                                    const tasks = [...new Set(d.entries.map(e => e.issue?.key || e.originTaskId || '?'))];
                                    const weekend = isWeekend(d.date);
                                    return (
                                        <tr key={d.date} style={{
                                            borderBottom: '1px solid var(--border-color)',
                                            background: weekend ? 'rgba(239,68,68,0.03)' : 'transparent',
                                        }}>
                                            <td style={tdStyle}>{idx + 1}</td>
                                            <td style={{ ...tdStyle, fontFamily: 'monospace', fontWeight: 600 }}>{d.date}</td>
                                            <td style={{ ...tdStyle, color: weekend ? 'var(--accent-danger)' : 'var(--text-secondary)', fontWeight: weekend ? 600 : 400 }}>
                                                {getDayName(d.date)}
                                            </td>
                                            <td style={{
                                                ...tdStyle, fontWeight: 700,
                                                color: hours >= 8 ? 'var(--accent-success)' : hours >= 4 ? 'var(--accent-warning)' : 'var(--accent-danger)'
                                            }}>
                                                {hours.toFixed(1)}h
                                            </td>
                                            <td style={tdStyle}>{d.entries.length}</td>
                                            <td style={{ ...tdStyle, textAlign: 'left' }}>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                                    {tasks.map(t => (
                                                        <span key={t} style={{
                                                            padding: '2px 8px', borderRadius: 'var(--radius-sm)',
                                                            background: 'var(--bg-glass)', fontSize: 11,
                                                            fontFamily: 'monospace', border: '1px solid var(--border-color)',
                                                        }}>
                                                            {t}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Empty State */}
            {worklogs && worklogs.length === 0 && (
                <div className="card" style={{ textAlign: 'center', padding: 40 }}>
                    <AlertTriangle size={32} style={{ color: 'var(--accent-warning)', marginBottom: 12 }} />
                    <p style={{ fontWeight: 600, marginBottom: 6 }}>Không tìm thấy worklog nào</p>
                    <p className="text-sm text-muted">Kiểm tra lại Worker key và khoảng thời gian</p>
                </div>
            )}

            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}

function StatCard({ icon, label, value, sub, color }) {
    return (
        <div style={{
            padding: '20px 24px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            position: 'relative',
            overflow: 'hidden',
        }}>
            <div style={{
                position: 'absolute', top: -12, right: -12,
                width: 80, height: 80, borderRadius: '50%',
                background: color, opacity: 0.07,
            }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ color, flexShrink: 0 }}>{React.cloneElement(icon, { size: 24 })}</div>
                <span className="text-sm text-muted" style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>{value}</div>
            {sub && <div className="text-sm text-muted" style={{ marginTop: 8 }}>{sub}</div>}
        </div>
    );
}

const thStyle = {
    padding: '12px 16px',
    textAlign: 'center',
    fontWeight: 600,
    color: 'var(--text-tertiary)',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
};

const tdStyle = {
    padding: '12px 16px',
    textAlign: 'center',
    color: 'var(--text-secondary)',
};
