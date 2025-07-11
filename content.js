const DEFAULT_URL_PATTERN = "https://utdirect.utexas.edu/apps/registrar/course_schedule/20259/results/?ccyys=20259&search_type_main=COURSE&fos_cn=C+S&course_number=439&x=0&y=0";
const DEFAULT_PROF_NAME = "ELNOZAHY, MOOTAZ N";
const DEFAULT_REFRESH_INTERVAL_SECONDS = 60;
const DEFAULT_TARGET_STATUSES = ["open", "open; reserved", "waitlisted"];
const DEFAULT_NOTIFIER = false;
const DEFAULT_RUNNING = false;
let targetUrlPattern = "";
let targetProfessor = "";
let currentRefreshIntervalMs = DEFAULT_REFRESH_INTERVAL_SECONDS * 1000;
let selectedTargetStatuses = [];
let notify = DEFAULT_NOTIFIER;
let running = DEFAULT_RUNNING;

function matchesPattern(pattern, url) {
    if (!pattern || !url) return false;
    try {
        const regexPattern = pattern
            .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
            .replace(/\*/g, '.*');
        const regex = new RegExp(`^${regexPattern}$`);
        return regex.test(url);
    } catch (e) {
        console.error("Course Checker: Invalid URL pattern provided:", pattern, e);
        return false;
    }
}

function scheduleRefresh(intervalMs) {
    if (intervalMs < 5000) {
        console.warn(`Course Checker: Refresh interval ${intervalMs}ms too low. Using 5000ms.`);
        intervalMs = 5000;
    }
    console.log(`Course Checker: No match found or criteria not met. Refreshing in ${intervalMs / 1000} seconds...`);
    setTimeout(() => {
        location.reload();
    }, intervalMs);
}

function checkCourseStatus() {
    let foundMatch = false;

    const targetTable = document.querySelector('table.rwd-table.results');

    if (!targetTable) {
        console.error("Course Checker: Target table not found on this page. Refreshing...");
        scheduleRefresh(currentRefreshIntervalMs);
        return;
    }

    const rows = targetTable.querySelectorAll('tbody tr');

    rows.forEach(row => {
        if (foundMatch) return;
        if (row.classList.contains('course_header')) return;

        const instructorCell = row.querySelector('td[data-th="Instructor"]');
        const statusCell = row.querySelector('td[data-th="Status"]');
        const uniqueCell = row.querySelector('td[data-th="Unique"]');

        if (instructorCell && statusCell && uniqueCell) {
            const instructorSpan = instructorCell.querySelector('span');
            if (!instructorSpan) return;
            const instructorName = instructorSpan.textContent.trim();
            const uniqueNum = uniqueCell.textContent.trim();
            const status = statusCell.textContent.trim().toLowerCase();

            if (instructorName === targetProfessor && selectedTargetStatuses.includes(status)) {
                console.log(`Course Checker: MATCH FOUND! Instructor: ${instructorName}, Status: '${status}'. Notifying.`);
                foundMatch = true;
                const notification = new Notification("Course Opened", {
                    requireInteraction: true,
                    body: `Match Found!\nUnique Number: ${uniqueNum}\nInstructor: ${targetProfessor}\nStatus: ${status.toUpperCase()}`
                });
                notification.onclick = (event) => {
                    event.preventDefault();
                    window.open(`https://utdirect.utexas.edu/registration/registration.WBX?s_ccyys=20259&s_af_unique=${uniqueNum}`, "_blank");
                };
            }
        }
    });

    if (!running) {
        let utcDate1 = new Date(Date.now());
        console.log(`Not Running from ${utcDate1.toLocaleString('en-US', { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone })}`);
    } else if (!foundMatch && running) {
        if (notify && (new Date(Date.now()).getMinutes() == 30 || new Date(Date.now()).getMinutes() == 0) && new Date(Date.now()).getSeconds() < (currentRefreshIntervalMs / 1000 + 1)) {
            let utcDate1 = new Date(Date.now());
            runningNotifier = new Notification("Course Notifier Running", {
                body: `Checked at ${utcDate1.toLocaleString('en-US', { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone })}`
            });
        } else {
            let utcDate1 = new Date(Date.now());
            console.log(`Checked at ${utcDate1.toLocaleString('en-US', { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone })}`);
        }
        scheduleRefresh(currentRefreshIntervalMs);

    } else {
        scheduleRefresh(DEFAULT_REFRESH_INTERVAL_SECONDS * 500);
    }
}

(async () => {
    let settings;
    try {
        settings = await chrome.storage.sync.get({
            refreshIntervalSeconds: DEFAULT_REFRESH_INTERVAL_SECONDS,
            urlPattern: DEFAULT_URL_PATTERN,
            profName: DEFAULT_PROF_NAME,
            notify: DEFAULT_NOTIFIER,
            selectedStatuses: DEFAULT_TARGET_STATUSES,
            running: DEFAULT_RUNNING
        });

        targetUrlPattern = settings.urlPattern ? settings.urlPattern.trim() : DEFAULT_URL_PATTERN;
        if (!settings.urlPattern || !settings.urlPattern.trim()) {
            console.warn("Course Checker: Target URL pattern was empty in storage or after trim, using default.");
            targetUrlPattern = DEFAULT_URL_PATTERN;
        }

        const currentUrl = window.location.href;
        if (!matchesPattern(targetUrlPattern, currentUrl)) {
            return;
        }

        targetProfessor = settings.profName ? settings.profName.trim() : DEFAULT_PROF_NAME;
        if (!settings.profName || !settings.profName.trim()) {
            console.warn("Course Checker: No target professor name found in storage or empty after trim, using default.");
            targetProfessor = DEFAULT_PROF_NAME;
        }

        notify = settings.notify;
        running = settings.running;

        selectedTargetStatuses = settings.selectedStatuses;

        if (!Array.isArray(selectedTargetStatuses)) {
            console.warn(`Course Checker: 'selectedTargetStatuses' from settings was not an array. It was: ${JSON.stringify(selectedTargetStatuses)}. Resetting to defaults.`);
            selectedTargetStatuses = [...DEFAULT_TARGET_STATUSES];
        } else if (selectedTargetStatuses.length === 0) {
            console.warn("Course Checker: 'selectedTargetStatuses' from settings was an empty array. Resetting to defaults. This might indicate an issue with saving settings.");
            selectedTargetStatuses = [...DEFAULT_TARGET_STATUSES];
        }

        const seconds = parseInt(settings.refreshIntervalSeconds, 10);
        if (!isNaN(seconds) && seconds >= 5) {
            currentRefreshIntervalMs = seconds * 1000;
        } else {
            console.warn(`Course Checker: Invalid interval (${settings.refreshIntervalSeconds}) in storage or below minimum. Using default ${DEFAULT_REFRESH_INTERVAL_SECONDS}s.`);
            currentRefreshIntervalMs = DEFAULT_REFRESH_INTERVAL_SECONDS * 1000;
        }


    } catch (error) {
        console.error("Course Checker: Error loading settings from storage. Using defaults for all.", error);
        targetUrlPattern = DEFAULT_URL_PATTERN;
        targetProfessor = DEFAULT_PROF_NAME;
        notify = DEFAULT_NOTIFIER;
        selectedTargetStatuses = [...DEFAULT_TARGET_STATUSES];
        currentRefreshIntervalMs = DEFAULT_REFRESH_INTERVAL_SECONDS * 1000;

        const currentUrl = window.location.href;
        if (!matchesPattern(targetUrlPattern, currentUrl)) {
            return;
        }
    }

    if (selectedTargetStatuses.length === 0) {
        console.warn("Course Checker: CRITICAL - No target statuses selected or determined. The script will not find any status matches. Please check settings and console logs for errors in loading statuses.");
    }
    setTimeout(checkCourseStatus, 500);

})();