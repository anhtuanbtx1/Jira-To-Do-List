import React, { useState, useEffect } from 'react';
import { useStore } from '../data/store';
import { loadJiraSettings } from '../utils/jiraApi';
import { 
    generateReleaseNote, 
    testBackendHealth 
} from '../utils/releaseNoteApi';
import { 
    FileText, Cpu, RefreshCw, Copy, Check, Info, 
    ArrowRight, AlertCircle, FileEdit, Plus, Trash2, HelpCircle 
} from 'lucide-react';

export default function ReleaseNotePage() {
    const { notify, currentProject } = useStore();
    const jiraSettings = loadJiraSettings();

    // Connection state with Release backend
    const [backendStatus, setBackendStatus] = useState('checking'); // 'checking', 'connected', 'error'
    const [generating, setGenerating] = useState(false);

    // Form inputs
    const [version, setVersion] = useState('1.0.0');
    const [releaseDate, setReleaseDate] = useState(new Date().toISOString().split('T')[0]);
    const [projectName, setProjectName] = useState(currentProject?.name || 'Dự án');
    
    const [inputType, setInputType] = useState('keys'); // 'keys' or 'jql'
    const [ticketKeysRaw, setTicketKeysRaw] = useState('');
    const [jqlQuery, setJqlQuery] = useState('');

    const [confluenceUrls, setConfluenceUrls] = useState(['']);
    const [extraNotes, setExtraNotes] = useState('');

    // Output state
    const [releaseNoteMd, setReleaseNoteMd] = useState('');
    const [copied, setCopied] = useState(false);
    const [errorMsg, setErrorMsg] = useState(null);

    // Sync project name when active project changes
    useEffect(() => {
        if (currentProject) {
            setProjectName(currentProject.name);
            // Auto build JQL based on default project key if settings are configured
            if (jiraSettings.defaultProjectKey) {
                setJqlQuery(`project = ${jiraSettings.defaultProjectKey} AND fixVersion = "v${version}"`);
            }
        }
    }, [currentProject]);

    // Check backend health on mount
    useEffect(() => {
        checkBackend();
    }, []);

    const checkBackend = async () => {
        setBackendStatus('checking');
        try {
            await testBackendHealth();
            setBackendStatus('connected');
        } catch (e) {
            console.error(e);
            setBackendStatus('error');
        }
    };

    const handleAddConfluenceUrl = () => {
        setConfluenceUrls([...confluenceUrls, '']);
    };

    const handleRemoveConfluenceUrl = (index) => {
        const list = [...confluenceUrls];
        list.splice(index, 1);
        setConfluenceUrls(list.length > 0 ? list : ['']);
    };

    const handleConfluenceUrlChange = (index, value) => {
        const list = [...confluenceUrls];
        list[index] = value;
        setConfluenceUrls(list);
    };

    const handleCopy = () => {
        if (!releaseNoteMd) return;
        navigator.clipboard.writeText(releaseNoteMd);
        setCopied(true);
        notify('Đã copy release note vào clipboard!');
        setTimeout(() => setCopied(false), 2000);
    };

    const handleGenerate = async () => {
        if (backendStatus !== 'connected') {
            notify('Lỗi: Chưa kết nối được FastAPI backend!', 'error');
            return;
        }

        if (!version.strip?.() && !version) {
            notify('Vui lòng nhập phiên bản release', 'error');
            return;
        }

        setErrorMsg(null);
        setGenerating(true);

        // Parse ticket keys
        let ticketKeys = [];
        if (inputType === 'keys') {
            ticketKeys = ticketKeysRaw
                .replace(/[,;\n]/g, ' ')
                .split(' ')
                .map(k => k.trim())
                .filter(k => k.length > 0);
            
            if (ticketKeys.length === 0) {
                notify('Vui lòng nhập ít nhất 1 ticket key (ví dụ: BP-123)', 'error');
                setGenerating(false);
                return;
            }
        } else {
            if (!jqlQuery.trim()) {
                notify('Vui lòng nhập câu truy vấn JQL', 'error');
                setGenerating(false);
                return;
            }
        }

        // Clean Confluence URLs
        const validConfUrls = confluenceUrls.map(u => u.trim()).filter(u => u.length > 0);

        // Config payload
        const jiraConfig = {
            base_url: jiraSettings.baseUrl,
            bearer_token: jiraSettings.bearerToken,
            cookie: jiraSettings.cookie,
        };

        const confluenceConfig = {
            base_url: jiraSettings.baseUrl, // Dùng chung url hoặc tuỳ biến
            bearer_token: jiraSettings.bearerToken,
            cookie: jiraSettings.cookie,
        };

        try {
            const result = await generateReleaseNote({
                jiraConfig,
                confluenceConfig,
                version,
                releaseDate,
                projectName,
                ticketKeys: inputType === 'keys' ? ticketKeys : [],
                jql: inputType === 'jql' ? jqlQuery : null,
                confluenceUrls: validConfUrls,
                extraNotes: extraNotes || null,
            });

            if (result.success) {
                setReleaseNoteMd(result.markdown);
                notify(`Đã tạo thành công release note (${result.stats.total_issues} ticket, ${result.stats.confluence_pages} docs)`);
            } else {
                setErrorMsg('Không thể sinh release note.');
            }
        } catch (e) {
            console.error(e);
            setErrorMsg(e.message || 'Lỗi bất ngờ xảy ra khi sinh release note.');
            notify(e.message || 'Lỗi sinh release note', 'error');
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className="release-note-page-container">
            {/* Backend connection warning */}
            {backendStatus === 'error' && (
                <div className="alert alert-danger flex items-center justify-between mb-16" style={{ padding: 12, borderRadius: 6, background: '#ef444415', border: '1px solid #ef444430' }}>
                    <div className="flex gap-8" style={{ alignItems: 'center' }}>
                        <AlertCircle size={18} color="#ef4444" />
                        <span className="text-sm">Không thể kết nối FastAPI backend (chạy cổng 8765). Vui lòng start backend!</span>
                    </div>
                    <button className="btn btn-sm btn-icon" onClick={checkBackend} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                        <RefreshCw size={14} />
                    </button>
                </div>
            )}

            <div className="flex gap-24" style={{ alignItems: 'flex-start' }}>
                {/* Form Input */}
                <div className="card" style={{ flex: 1, padding: 20, background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                    <h3 className="mb-16 flex gap-8" style={{ alignItems: 'center', fontSize: 16 }}>
                        <FileEdit size={18} style={{ color: 'var(--accent-primary)' }} />
                        Cấu hình Release
                    </h3>

                    <div className="flex gap-12 mb-16">
                        <div style={{ flex: 1 }}>
                            <label className="label-xs text-muted mb-4 block">Tên Dự án</label>
                            <input 
                                className="form-input" 
                                value={projectName} 
                                onChange={e => setProjectName(e.target.value)} 
                            />
                        </div>
                        <div style={{ width: 120 }}>
                            <label className="label-xs text-muted mb-4 block">Phiên bản</label>
                            <input 
                                className="form-input" 
                                value={version} 
                                onChange={e => setVersion(e.target.value)} 
                            />
                        </div>
                        <div style={{ width: 140 }}>
                            <label className="label-xs text-muted mb-4 block">Ngày phát hành</label>
                            <input 
                                className="form-input" 
                                type="date" 
                                value={releaseDate} 
                                onChange={e => setReleaseDate(e.target.value)} 
                            />
                        </div>
                    </div>

                    <div className="mb-16">
                        <label className="label-xs text-muted mb-8 block">Cách lấy Tickets Jira</label>
                        <div className="flex gap-16 mb-12">
                            <label className="flex items-center gap-6 cursor-pointer text-sm">
                                <input 
                                    type="radio" 
                                    name="inputType" 
                                    checked={inputType === 'keys'} 
                                    onChange={() => setInputType('keys')} 
                                />
                                Nhập Keys thủ công (ngăn cách bởi dấu cách/dòng/phẩy)
                            </label>
                            <label className="flex items-center gap-6 cursor-pointer text-sm">
                                <input 
                                    type="radio" 
                                    name="inputType" 
                                    checked={inputType === 'jql'} 
                                    onChange={() => setInputType('jql')} 
                                />
                                Truy vấn JQL
                            </label>
                        </div>

                        {inputType === 'keys' ? (
                            <textarea 
                                className="form-input" 
                                style={{ height: 80, resize: 'vertical', fontFamily: 'monospace', fontSize: 13 }}
                                placeholder="BP-100 BP-101, BP-102&#10;BP-103"
                                value={ticketKeysRaw}
                                onChange={e => setTicketKeysRaw(e.target.value)}
                            />
                        ) : (
                            <div>
                                <textarea 
                                    className="form-input" 
                                    style={{ height: 80, resize: 'vertical', fontFamily: 'monospace', fontSize: 13 }}
                                    placeholder='project = BP AND fixVersion = "v1.0.0" AND status = Done'
                                    value={jqlQuery}
                                    onChange={e => setJqlQuery(e.target.value)}
                                />
                                <span className="text-xs text-muted mt-4 block">
                                    Mẹo: Hãy chắc chắn default project key cấu hình chính xác trong mục Settings.
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Confluence Section */}
                    <div className="mb-16">
                        <label className="label-xs text-muted mb-4 block flex justify-between">
                            <span>Đọc link Confluence (Tài liệu SRS, mô tả thiết kế...)</span>
                            <button 
                                className="btn text-xs" 
                                style={{ border: 'none', background: 'transparent', color: 'var(--accent-primary)', padding: 0, height: 'auto', cursor: 'pointer' }}
                                onClick={handleAddConfluenceUrl}
                            >
                                <Plus size={12} style={{ verticalAlign: 'middle', marginRight: 2 }} /> Thêm link
                            </button>
                        </label>
                        
                        {confluenceUrls.map((url, index) => (
                            <div key={index} className="flex gap-8 mb-8" style={{ alignItems: 'center' }}>
                                <input 
                                    className="form-input" 
                                    placeholder="https://confluence-local/pages/viewpage.action?pageId=123"
                                    value={url}
                                    onChange={e => handleConfluenceUrlChange(index, e.target.value)}
                                />
                                <button 
                                    className="btn" 
                                    style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '8px 12px', cursor: 'pointer' }}
                                    onClick={() => handleRemoveConfluenceUrl(index)}
                                    disabled={confluenceUrls.length === 1 && !url}
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Extra Notes */}
                    <div className="mb-20">
                        <label className="label-xs text-muted mb-4 block">Ghi chú thêm (Môi trường deploy, Lưu ý nâng cấp database...)</label>
                        <textarea 
                            className="form-input" 
                            style={{ height: 80, resize: 'vertical' }}
                            placeholder="Ví dụ: Cần chạy script sql nâng cấp database schema trước khi deploy."
                            value={extraNotes}
                            onChange={e => setExtraNotes(e.target.value)}
                        />
                    </div>

                    {/* Action Button */}
                    <button 
                        className="btn" 
                        style={{ 
                            width: '100%', 
                            padding: '12px', 
                            background: 'var(--accent-primary)', 
                            color: 'white', 
                            border: 'none', 
                            borderRadius: 6, 
                            fontWeight: 600, 
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                        }}
                        onClick={handleGenerate}
                        disabled={generating || backendStatus !== 'connected'}
                    >
                        {generating ? (
                            <>
                                <RefreshCw className="animate-spin" size={16} />
                                Đang sinh Release Note...
                            </>
                        ) : (
                            <>
                                <Cpu size={16} />
                                Sinh Release Note (Tiếng Việt)
                            </>
                        )}
                    </button>
                </div>

                {/* Output Preview */}
                <div style={{ flex: 1.2, minWidth: 0 }}>
                    <div className="card" style={{ padding: 20, background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <div className="flex-between mb-16" style={{ alignItems: 'center' }}>
                            <h3 className="flex gap-8" style={{ alignItems: 'center', fontSize: 16 }}>
                                <FileText size={18} style={{ color: 'var(--accent-primary)' }} />
                                Preview Markdown
                            </h3>
                            {releaseNoteMd && (
                                <button 
                                    className="btn btn-sm flex gap-6" 
                                    style={{ padding: '6px 12px', cursor: 'pointer', background: 'var(--bg-glass)', border: '1px solid var(--border-color)' }}
                                    onClick={handleCopy}
                                >
                                    {copied ? <Check size={14} color="var(--accent-success)" /> : <Copy size={14} />}
                                    {copied ? 'Đã copy' : 'Copy MD'}
                                </button>
                            )}
                        </div>

                        {errorMsg && (
                            <div className="alert alert-danger text-sm mb-16" style={{ padding: 12, borderRadius: 6, background: '#ef444415', border: '1px solid #ef444430', color: '#ef4444' }}>
                                <AlertCircle size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                                {errorMsg}
                            </div>
                        )}

                        <div style={{ flex: 1, minHeight: 400, display: 'flex', flexDirection: 'column' }}>
                            {releaseNoteMd ? (
                                <textarea
                                    className="form-input"
                                    style={{ 
                                        flex: 1, 
                                        fontFamily: 'monospace', 
                                        fontSize: 13, 
                                        padding: 12, 
                                        background: 'rgba(0,0,0,0.2)', 
                                        border: '1px solid var(--border-color)',
                                        resize: 'none',
                                        height: '500px'
                                    }}
                                    value={releaseNoteMd}
                                    readOnly
                                />
                            ) : (
                                <div style={{ 
                                    flex: 1, 
                                    display: 'flex', 
                                    flexDirection: 'column', 
                                    alignItems: 'center', 
                                    justifyContent: 'center', 
                                    color: 'var(--text-tertiary)',
                                    border: '1px dashed var(--border-color)',
                                    borderRadius: 6,
                                    height: '500px'
                                }}>
                                    <FileText size={48} strokeWidth={1} style={{ marginBottom: 12 }} />
                                    <span>Release Note sẽ xuất hiện ở đây sau khi sinh</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
