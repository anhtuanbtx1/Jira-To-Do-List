import React, { useState, useEffect } from 'react';
import { loadJiraSettings, saveJiraSettings, testJiraConnection } from '../utils/jiraApi';
import { X, Wifi, WifiOff, Loader, Eye, EyeOff } from 'lucide-react';

export default function SettingsModal({ onClose }) {
    const [form, setForm] = useState(loadJiraSettings());
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState(null);
    const [showToken, setShowToken] = useState(false);
    const [saved, setSaved] = useState(false);

    const handleSave = () => {
        saveJiraSettings(form);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const handleTest = async () => {
        setTesting(true);
        setTestResult(null);
        const result = await testJiraConnection(form);
        setTestResult(result);
        setTesting(false);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>⚙️ Cấu hình Jira API</h3>
                    <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
                </div>
                <div className="modal-body">
                    {/* Connection Status */}
                    {testResult && (
                        <div style={{
                            padding: '12px 16px',
                            borderRadius: 'var(--radius-md)',
                            marginBottom: 16,
                            background: testResult.success ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                            border: `1px solid ${testResult.success ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                        }}>
                            {testResult.success ? <Wifi size={16} style={{ color: 'var(--accent-success)' }} /> : <WifiOff size={16} style={{ color: 'var(--accent-danger)' }} />}
                            <span className="text-sm" style={{ color: testResult.success ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
                                {testResult.success ? `✅ Kết nối thành công! User: ${testResult.user}` : `❌ Lỗi: ${testResult.error}`}
                            </span>
                        </div>
                    )}

                    <div className="form-group">
                        <label className="form-label">Jira Base URL *</label>
                        <input
                            className="form-input"
                            value={form.baseUrl}
                            onChange={e => setForm({ ...form, baseUrl: e.target.value })}
                            placeholder="https://jira-local.ots.vn"
                        />
                        <span className="text-xs text-muted" style={{ marginTop: 4, display: 'block' }}>
                            URL của Jira Server (không có /rest/api/...)
                        </span>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Bearer Token *</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                className="form-input"
                                type={showToken ? 'text' : 'password'}
                                value={form.bearerToken}
                                onChange={e => setForm({ ...form, bearerToken: e.target.value })}
                                placeholder="NDUyMjU4NDI0MzI1Oh1KSg..."
                                style={{ paddingRight: 40 }}
                            />
                            <button
                                className="btn btn-ghost btn-icon"
                                style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)' }}
                                onClick={() => setShowToken(!showToken)}
                                type="button"
                            >
                                {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                        </div>
                        <span className="text-xs text-muted" style={{ marginTop: 4, display: 'block' }}>
                            Personal Access Token từ Jira
                        </span>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Cookie (tùy chọn)</label>
                        <textarea
                            className="form-textarea"
                            value={form.cookie}
                            onChange={e => setForm({ ...form, cookie: e.target.value })}
                            placeholder="JSESSIONID=...; atlassian.xsrf.token=..."
                            rows={2}
                        />
                        <span className="text-xs text-muted" style={{ marginTop: 4, display: 'block' }}>
                            Cookie từ browser nếu cần (JSESSIONID, xsrf token)
                        </span>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Default Project Key</label>
                            <input
                                className="form-input"
                                value={form.defaultProjectKey}
                                onChange={e => setForm({ ...form, defaultProjectKey: e.target.value.toUpperCase() })}
                                placeholder="C4TD"
                                style={{ textTransform: 'uppercase' }}
                            />
                            <span className="text-xs text-muted" style={{ marginTop: 4, display: 'block' }}>
                                Sử dụng khi Excel không có cột Project Key
                            </span>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Issue Type</label>
                            <select
                                className="form-select"
                                value={form.issueTypeName}
                                onChange={e => setForm({ ...form, issueTypeName: e.target.value })}
                            >
                                <option value="Story">Story</option>
                                <option value="Task">Task</option>
                                <option value="Bug">Bug</option>
                                <option value="Epic">Epic</option>
                                <option value="Sub-task">Sub-task</option>
                            </select>
                            <span className="text-xs text-muted" style={{ marginTop: 4, display: 'block' }}>
                                Loại issue tạo trên Jira
                            </span>
                        </div>
                    </div>

                    {/* Info */}
                    <div style={{ padding: 16, background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                        <h4 className="text-sm font-bold mb-8">💡 Hướng dẫn</h4>
                        <ul className="text-xs text-muted" style={{ lineHeight: 1.8, paddingLeft: 16 }}>
                            <li>Bearer Token: Vào Jira → Profile → Personal Access Tokens → Create Token</li>
                            <li>Project Key: Là mã viết tắt của project trên Jira (VD: C4TD, ECOM, CRM)</li>
                            <li>Mỗi dòng trong Excel có thể có Project Key riêng, nếu không có sẽ dùng Default</li>
                            <li>Cookie: Chỉ cần nếu Bearer Token không đủ quyền</li>
                        </ul>
                    </div>
                </div>

                <div className="modal-footer">
                    <button
                        className="btn btn-secondary"
                        onClick={handleTest}
                        disabled={testing || !form.baseUrl || !form.bearerToken}
                    >
                        {testing ? <><Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> Đang test...</> : <><Wifi size={14} /> Test kết nối</>}
                    </button>
                    <div style={{ flex: 1 }} />
                    <button className="btn btn-secondary" onClick={onClose}>Đóng</button>
                    <button className="btn btn-primary" onClick={handleSave}>
                        {saved ? '✅ Đã lưu!' : '💾 Lưu cấu hình'}
                    </button>
                </div>

                <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            </div>
        </div>
    );
}
