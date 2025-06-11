// --- Defaults (used if storage is empty/invalid) ---
const DEFAULT_URL_PATTERN = "https://utdirect.utexas.edu/apps/registrar/course_schedule/20259/results/?ccyys=20259&search_type_main=COURSE&fos_cn=C+S&course_number=439&x=0&y=0";
const DEFAULT_PROF_NAME = "ELNOZAHY, MOOTAZ N";
const DEFAULT_REFRESH_INTERVAL_SECONDS = 60;
const DEFAULT_TARGET_STATUSES = ["open", "open; reserved", "waitlisted"]; // Renamed for clarity
// --- End Defaults ---

// --- Global variables for settings ---
let targetUrlPattern = "";
let targetProfessor = "";
let currentRefreshIntervalMs = DEFAULT_REFRESH_INTERVAL_SECONDS * 1000;
let selectedTargetStatuses = []; // Will hold user-selected statuses
// --- End Globals ---


// --- Helper Function: Basic Wildcard URL Matching ---
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

// --- Helper Function: Schedule Refresh ---
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

// --- Main Logic ---
function checkCourseStatus() {
    // console.log("Course Checker: Running checkCourseStatus on matched URL:", window.location.href);
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
            // console.log(`uniqueNum : ${uniqueNum}`);
            const status = statusCell.textContent.trim().toLowerCase();

            // **** ADDED DETAILED LOGGING BEFORE CHECK ****
            // console.log(`Course Checker: Checking course row. Instructor: ${instructorName}, Page Status: '${status}'. Using selectedTargetStatuses: ${JSON.stringify(selectedTargetStatuses)}`);

            if (instructorName === targetProfessor && selectedTargetStatuses.includes(status)) {
                console.log(`Course Checker: MATCH FOUND! Instructor: ${instructorName}, Status: '${status}'. Notifying.`);
                foundMatch = true;
                const notification = new Notification("Course Opened", {requireInteraction: true, body: `Match Found!\nUnique Number: ${uniqueNum}\nInstructor: ${targetProfessor}\nStatus: ${status.toUpperCase()}`});
                notification.onclick = (event) => {
                    event.preventDefault(); // prevent the browser from focusing the Notification's tab
                window.open(`https://utdirect.utexas.edu/registration/registration.WBX?s_ccyys=20259&s_af_unique=${uniqueNum}`, "_blank");
                };
            }
            else if (instructorName === targetProfessor) {
                 // This log helps see attempts for the right professor but wrong status based on selection
                 // console.log(`Course Checker: Checking row - Target Professor: ${instructorName}, Status: '${status}' (Status not in user selection or not a match: ${!selectedTargetStatuses.includes(status)})`);
            }
        }
    }); // End rows.forEach

    if (!foundMatch) {
        if (new Date(Date.now()).getMinutes() % 10 == 0 && new Date(Date.now()).getSeconds() < 7) {
            let utcDate1 = new Date(Date.now());
            runningNotifier = new Notification("Course Notifier Running", {body: `Checked at ${utcDate1.toLocaleString('en-US', { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone })}`});
        } else {
            let utcDate1 = new Date(Date.now());
            console.log(`Checked at ${utcDate1.toLocaleString('en-US', { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone })}`);
        }
        scheduleRefresh(currentRefreshIntervalMs);
        
    } else {
        // console.log("Course Checker: Match found! Resuming in 30 seconds");
        scheduleRefresh(DEFAULT_REFRESH_INTERVAL_SECONDS * 500);
    }
}


// --- Initialization ---
(async () => {
    // console.log("Course Checker: Content script initializing...");
    let settings;
    try {
        // console.log("Course Checker: Attempting to load settings from chrome.storage.sync...");
        settings = await chrome.storage.sync.get({
            refreshIntervalSeconds: DEFAULT_REFRESH_INTERVAL_SECONDS,
            urlPattern: DEFAULT_URL_PATTERN,
            profName: DEFAULT_PROF_NAME,
            selectedStatuses: DEFAULT_TARGET_STATUSES
        });
        // Using JSON.parse(JSON.stringify()) for logging to ensure the current state is captured
        // console.log("Course Checker: Settings loaded from storage (or defaults applied by .get if key was missing):", JSON.parse(JSON.stringify(settings)));

        // --- 1. Set Target URL Pattern ---
        targetUrlPattern = settings.urlPattern ? settings.urlPattern.trim() : DEFAULT_URL_PATTERN;
        if (!settings.urlPattern || !settings.urlPattern.trim()) {
             console.warn("Course Checker: Target URL pattern was empty in storage or after trim, using default.");
             targetUrlPattern = DEFAULT_URL_PATTERN;
        }

        // --- 2. Check if current URL matches the target pattern ---
        const currentUrl = window.location.href;
        if (!matchesPattern(targetUrlPattern, currentUrl)) {
            // console.log(`Course Checker: Current URL [${currentUrl}] does not match target pattern [${targetUrlPattern}]. Stopping script on this page.`);
            return;
        }
        // console.log(`Course Checker: Current URL matches target pattern. Proceeding...`);

        // --- 3. Set Target Professor ---
        targetProfessor = settings.profName ? settings.profName.trim() : DEFAULT_PROF_NAME;
        if (!settings.profName || !settings.profName.trim()) {
            console.warn("Course Checker: No target professor name found in storage or empty after trim, using default.");
            targetProfessor = DEFAULT_PROF_NAME;
        }
        // console.log("Course Checker: Target Professor:", targetProfessor);

        // --- 4. Set Target Statuses ---
        // console.log("Course Checker: Raw 'settings.selectedStatuses' from storage/get_default:", JSON.parse(JSON.stringify(settings.selectedStatuses)));
        selectedTargetStatuses = settings.selectedStatuses; // This should be the user's array or DEFAULT_TARGET_STATUSES

        if (!Array.isArray(selectedTargetStatuses)) {
            console.warn(`Course Checker: 'selectedTargetStatuses' from settings was not an array. It was: ${JSON.stringify(selectedTargetStatuses)}. Resetting to defaults.`);
            selectedTargetStatuses = [...DEFAULT_TARGET_STATUSES];
        } else if (selectedTargetStatuses.length === 0) {
            // This case should ideally not happen if popup.js validation works (prevents saving empty array)
            console.warn("Course Checker: 'selectedTargetStatuses' from settings was an empty array. Resetting to defaults. This might indicate an issue with saving settings.");
            selectedTargetStatuses = [...DEFAULT_TARGET_STATUSES];
        } else {
            // console.log("Course Checker: 'selectedTargetStatuses' is valid and populated from storage/get_default.");
        }
        // console.log("Course Checker: Final 'selectedTargetStatuses' to be used for matching:", JSON.parse(JSON.stringify(selectedTargetStatuses)));


        // --- 5. Set Refresh Interval ---
        const seconds = parseInt(settings.refreshIntervalSeconds, 10);
        if (!isNaN(seconds) && seconds >= 5) {
            currentRefreshIntervalMs = seconds * 1000;
        } else {
            console.warn(`Course Checker: Invalid interval (${settings.refreshIntervalSeconds}) in storage or below minimum. Using default ${DEFAULT_REFRESH_INTERVAL_SECONDS}s.`);
            currentRefreshIntervalMs = DEFAULT_REFRESH_INTERVAL_SECONDS * 1000;
        }
         // console.log(`Course Checker: Using refresh interval of ${currentRefreshIntervalMs / 1000} seconds.`);


    } catch (error) {
        console.error("Course Checker: Error loading settings from storage. Using defaults for all.", error);
        targetUrlPattern = DEFAULT_URL_PATTERN;
        targetProfessor = DEFAULT_PROF_NAME;
        selectedTargetStatuses = [...DEFAULT_TARGET_STATUSES]; // Fallback to default statuses on error
        currentRefreshIntervalMs = DEFAULT_REFRESH_INTERVAL_SECONDS * 1000;

         const currentUrl = window.location.href;
         if (!matchesPattern(targetUrlPattern, currentUrl)) {
             // console.log(`Course Checker: Current URL [${currentUrl}] does not match default target pattern [${targetUrlPattern}]. Stopping script (in error catch).`);
             return;
         }
         // console.log("Course Checker: Using (due to error) default Professor:", targetProfessor);
         // console.log("Course Checker: Using (due to error) default Target Statuses:", JSON.parse(JSON.stringify(selectedTargetStatuses)));
         // console.log(`Course Checker: Using (due to error) default refresh interval of ${currentRefreshIntervalMs / 1000} seconds.`);
    }

    // --- 6. Run the first check ---
    if (selectedTargetStatuses.length === 0) {
        // This state should ideally be prevented by popup validation
        console.warn("Course Checker: CRITICAL - No target statuses selected or determined. The script will not find any status matches. Please check settings and console logs for errors in loading statuses.");
    }
    // console.log("Course Checker: Initializing first checkCourseStatus call...");
    setTimeout(checkCourseStatus, 500);

})(); // End async IIFE