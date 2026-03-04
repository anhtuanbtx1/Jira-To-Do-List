import { loadJiraSettings } from './jiraApi';

/**
 * Resolve the Tempo API URL - uses the same proxy as Jira API
 */
function resolveTempoUrl(baseUrl, path) {
    const isDev = import.meta.env.DEV;
    if (isDev) {
        return `/jira-api${path}`;
    }
    return `${baseUrl.replace(/\/$/, '')}${path}`;
}

/**
 * Build common request headers for Tempo
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
 * Log work to Tempo Timesheets
 * POST /rest/tempo-timesheets/4/worklogs
 *
 * @param {Object} settings - Jira settings (baseUrl, bearerToken, cookie)
 * @param {Object} body - Worklog body
 * @param {string} body.worker - Jira user key (e.g. "JIRAUSER10108")
 * @param {string} body.started - Date string "YYYY-MM-DD"
 * @param {number} body.timeSpentSeconds - Time in seconds
 * @param {number} body.originTaskId - Jira issue internal ID
 * @param {number} body.remainingEstimate - Remaining estimate in seconds (usually 0)
 * @returns {Promise<{ success: boolean, data?: any, error?: string }>}
 */
export async function logWorkToTempo(settings, body) {
    const url = resolveTempoUrl(settings.baseUrl, '/rest/tempo-timesheets/4/worklogs');
    const headers = buildHeaders(settings);

    try {
        console.log('[Tempo] Logging work:', body.started, body.timeSpentSeconds, 'seconds');

        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            let errorMsg = `HTTP ${response.status}`;
            try {
                const errorJson = JSON.parse(errorBody);
                if (errorJson.errors) {
                    const errorMsgs = Array.isArray(errorJson.errors)
                        ? errorJson.errors.map(e => e.message || e).join(', ')
                        : Object.values(errorJson.errors).join(', ');
                    errorMsg += ': ' + errorMsgs;
                } else if (errorJson.errorMessages) {
                    errorMsg += ': ' + errorJson.errorMessages.join(', ');
                } else if (errorJson.message) {
                    errorMsg += ': ' + errorJson.message;
                }
            } catch {
                errorMsg += ': ' + errorBody.substring(0, 200);
            }
            return { success: false, error: errorMsg };
        }

        const data = await response.json();
        return { success: true, data };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

/**
 * Search worklogs from Tempo Timesheets
 * POST /rest/tempo-timesheets/4/worklogs/search
 *
 * @param {Object} settings - Jira settings (baseUrl, bearerToken, cookie)
 * @param {Object} params
 * @param {string} params.from - Start date "YYYY-MM-DD"
 * @param {string} params.to - End date "YYYY-MM-DD"
 * @param {string[]} params.worker - Array of worker keys
 * @returns {Promise<{ success: boolean, worklogs?: Array, error?: string }>}
 */
export async function searchWorklogs(settings, params) {
    const url = resolveTempoUrl(settings.baseUrl, '/rest/tempo-timesheets/4/worklogs/search');
    const headers = buildHeaders(settings);

    try {
        console.log('[Tempo] Searching worklogs:', params.from, 'to', params.to);

        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(params),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            let errorMsg = `HTTP ${response.status}`;
            try {
                const errorJson = JSON.parse(errorBody);
                if (errorJson.errors) {
                    const errorMsgs = Array.isArray(errorJson.errors)
                        ? errorJson.errors.map(e => e.message || e).join(', ')
                        : Object.values(errorJson.errors).join(', ');
                    errorMsg += ': ' + errorMsgs;
                } else if (errorJson.errorMessages) {
                    errorMsg += ': ' + errorJson.errorMessages.join(', ');
                } else if (errorJson.message) {
                    errorMsg += ': ' + errorJson.message;
                }
            } catch {
                errorMsg += ': ' + errorBody.substring(0, 200);
            }
            return { success: false, error: errorMsg };
        }

        const data = await response.json();
        // Tempo returns an array of worklogs
        const worklogs = Array.isArray(data) ? data : (data.worklogs || data.results || []);
        return { success: true, worklogs };
    } catch (err) {
        return { success: false, error: err.message };
    }
}
