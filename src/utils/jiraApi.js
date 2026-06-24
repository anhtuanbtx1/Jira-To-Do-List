const JIRA_SETTINGS_KEY = 'jirapo_jira_settings';

const DEFAULT_SETTINGS = {
    baseUrl: 'https://jira-local.ots.vn',
    bearerToken: '',
    cookie: '',
    defaultProjectKey: '',
    issueTypeName: 'Story',
};

export function loadJiraSettings() {
    try {
        const saved = localStorage.getItem(JIRA_SETTINGS_KEY);
        const parsed = saved ? JSON.parse(saved) : {};

        return {
            baseUrl: import.meta.env.VITE_JIRA_BASE_URL !== undefined ? import.meta.env.VITE_JIRA_BASE_URL : (parsed.baseUrl || DEFAULT_SETTINGS.baseUrl),
            bearerToken: import.meta.env.VITE_JIRA_BEARER_TOKEN !== undefined ? import.meta.env.VITE_JIRA_BEARER_TOKEN : (parsed.bearerToken || DEFAULT_SETTINGS.bearerToken),
            cookie: import.meta.env.VITE_JIRA_COOKIE !== undefined ? import.meta.env.VITE_JIRA_COOKIE : (parsed.cookie || DEFAULT_SETTINGS.cookie),
            defaultProjectKey: import.meta.env.VITE_JIRA_DEFAULT_PROJECT_KEY !== undefined ? import.meta.env.VITE_JIRA_DEFAULT_PROJECT_KEY : (parsed.defaultProjectKey || DEFAULT_SETTINGS.defaultProjectKey),
            issueTypeName: import.meta.env.VITE_JIRA_ISSUE_TYPE_NAME !== undefined ? import.meta.env.VITE_JIRA_ISSUE_TYPE_NAME : (parsed.issueTypeName || DEFAULT_SETTINGS.issueTypeName),
        };
    } catch (e) { console.error('Failed to load Jira settings', e); }
    return { ...DEFAULT_SETTINGS };
}

export function saveJiraSettings(settings) {
    localStorage.setItem(JIRA_SETTINGS_KEY, JSON.stringify(settings));
}

/**
 * Resolve the API URL - use Vite proxy in dev to avoid CORS
 * In dev: /jira-api/rest/api/2/...  (proxied by Vite to https://jira-local.ots.vn)
 * In prod: direct URL
 */
function resolveApiUrl(baseUrl, path) {
    const isDev = import.meta.env.DEV;
    if (isDev) {
        return `/jira-api${path}`;
    }
    return `${baseUrl.replace(/\/$/, '')}${path}`;
}

/**
 * Build common request headers
 */
function buildHeaders(settings) {
    const headers = {
        'Content-Type': 'application/json',
        'X-Atlassian-Token': 'no-check',
    };
    if (settings.bearerToken) headers['Authorization'] = `Bearer ${settings.bearerToken}`;
    if (settings.cookie) headers['Cookie'] = settings.cookie;
    return headers;
}

/**
 * Fetch all Jira projects
 * @returns {Promise<{ success: boolean, projects?: Array<{id, key, name}>, error?: string }>}
 */
export async function fetchJiraProjects(settings) {
    const url = resolveApiUrl(settings.baseUrl, '/rest/api/2/project');
    const headers = buildHeaders(settings);

    try {
        const response = await fetch(url, { method: 'GET', headers });
        if (!response.ok) {
            return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
        }
        const data = await response.json();
        const projects = (data || []).map(p => ({
            id: p.id,
            key: p.key,
            name: p.name,
        }));
        return { success: true, projects };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

/**
 * Build Jira issue payload from a story
 */
function buildPayload(story, projectKey, issueTypeName) {
    // Build description from Agile format
    let description = '';
    if (story.asA || story.iWantTo || story.soThat) {
        description += `As a ${story.asA || '...'}, I want to ${story.iWantTo || '...'} so that ${story.soThat || '...'}`;
    }
    if (story.description) {
        description += (description ? '\n\n' : '') + story.description;
    }
    if (story.acceptanceCriteria) {
        description += (description ? '\n\n' : '') + 'Acceptance Criteria:\n' + story.acceptanceCriteria;
    }

    const fields = {
        project: { key: projectKey },
        summary: story.title,
        description: description || story.title,
        issuetype: { name: issueTypeName },
    };

    // Map priority to Jira format
    if (story.priority) {
        const priorityMap = {
            'Low': 'Low',
            'Medium': 'Medium',
            'High': 'High',
            'Critical': 'Highest',
        };
        fields.priority = { name: priorityMap[story.priority] || 'Medium' };
    }

    // Add story points if available (customfield - common Jira field)
    // Note: Story points field varies by Jira instance, skip if 0
    // if (story.points && story.points > 0) {
    //   fields.story_points = story.points;
    // }

    return { fields };
}

/**
 * Create a single Jira issue
 * @returns {{ success: boolean, key?: string, error?: string }}
 */
async function createJiraIssue(settings, payload) {
    const url = resolveApiUrl(settings.baseUrl, '/rest/api/2/issue');

    const headers = {
        'Content-Type': 'application/json',
        'X-Atlassian-Token': 'no-check',
    };

    if (settings.bearerToken) {
        headers['Authorization'] = `Bearer ${settings.bearerToken}`;
    }
    if (settings.cookie) {
        headers['Cookie'] = settings.cookie;
    }

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            let errorMsg = `HTTP ${response.status}`;
            try {
                const errorJson = JSON.parse(errorBody);
                if (errorJson.errors) {
                    errorMsg += ': ' + Object.values(errorJson.errors).join(', ');
                } else if (errorJson.errorMessages) {
                    errorMsg += ': ' + errorJson.errorMessages.join(', ');
                }
            } catch {
                errorMsg += ': ' + errorBody.substring(0, 200);
            }
            return { success: false, error: errorMsg };
        }

        const result = await response.json();
        return { success: true, key: result.key, id: result.id, self: result.self };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

/**
 * Import stories to Jira in sequence
 * @param {Object} settings - Jira settings
 * @param {Array} stories - Array of parsed stories
 * @param {Function} onProgress - Callback (index, total, result)
 * @returns {Promise<{ success: number, failed: number, results: Array }>}
 */
export async function importStoriesToJira(settings, stories, onProgress) {
    const results = [];
    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < stories.length; i++) {
        const story = stories[i];
        const projectKey = story.projectKey || settings.defaultProjectKey;

        if (!projectKey) {
            const result = { index: i, success: false, error: 'Missing project key', title: story.title };
            results.push(result);
            failedCount++;
            if (onProgress) onProgress(i, stories.length, result);
            continue;
        }

        const payload = buildPayload(story, projectKey, settings.issueTypeName || 'Story');
        const apiResult = await createJiraIssue(settings, payload);

        const result = {
            index: i,
            title: story.title,
            projectKey,
            ...apiResult,
        };
        results.push(result);

        if (apiResult.success) {
            successCount++;
        } else {
            failedCount++;
        }

        if (onProgress) onProgress(i, stories.length, result);

        // Small delay to avoid overwhelming the server
        if (i < stories.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 200));
        }
    }

    return { success: successCount, failed: failedCount, results, total: stories.length };
}

/**
 * Search Jira issues using JQL
 * @param {Object} settings - Jira settings
 * @param {string} jql - JQL query string
 * @param {string} fields - Comma-separated fields to return
 * @param {number} maxResults - Max results to return
 * @returns {Promise<{ success: boolean, issues?: Array, total?: number, error?: string }>}
 */
export async function searchJiraIssues(settings, jql, fields = 'summary,status,priority,assignee', maxResults = 50) {
    const params = new URLSearchParams({
        jql,
        fields,
        maxResults: String(maxResults),
    });
    const url = resolveApiUrl(settings.baseUrl, `/rest/api/2/search?${params.toString()}`);

    const headers = {
        'Content-Type': 'application/json',
        'X-Atlassian-Token': 'no-check',
    };
    if (settings.bearerToken) headers['Authorization'] = `Bearer ${settings.bearerToken}`;
    if (settings.cookie) headers['Cookie'] = settings.cookie;

    try {
        console.log('[JiraPO] Searching Jira:', jql);
        const response = await fetch(url, { method: 'GET', headers });
        if (!response.ok) {
            const errorBody = await response.text();
            let errorMsg = `HTTP ${response.status}`;
            try {
                const errorJson = JSON.parse(errorBody);
                if (errorJson.errorMessages) {
                    errorMsg += ': ' + errorJson.errorMessages.join(', ');
                }
            } catch {
                errorMsg += ': ' + errorBody.substring(0, 200);
            }
            return { success: false, error: errorMsg };
        }
        const data = await response.json();
        const issues = (data.issues || []).map(issue => ({
            key: issue.key,
            id: issue.id,
            summary: issue.fields?.summary || '',
            status: issue.fields?.status?.name || 'Unknown',
            statusCategory: issue.fields?.status?.statusCategory?.key || '',
            priority: issue.fields?.priority?.name || 'Medium',
            assignee: issue.fields?.assignee?.displayName || issue.fields?.assignee?.name || '',
            self: issue.self,
        }));
        return { success: true, issues, total: data.total || issues.length };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

/**
 * Test connection to Jira
 */
export async function testJiraConnection(settings) {
    const url = resolveApiUrl(settings.baseUrl, '/rest/api/2/myself');

    const headers = {
        'Content-Type': 'application/json',
        'X-Atlassian-Token': 'no-check',
    };
    if (settings.bearerToken) headers['Authorization'] = `Bearer ${settings.bearerToken}`;
    if (settings.cookie) headers['Cookie'] = settings.cookie;

    try {
        const response = await fetch(url, { method: 'GET', headers });
        if (!response.ok) {
            return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
        }
        const data = await response.json();
        return { success: true, user: data.displayName || data.name || data.emailAddress };
    } catch (err) {
        return { success: false, error: err.message };
    }
}
