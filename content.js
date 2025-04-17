// --- Defaults (used if storage is empty/invalid) ---
const DEFAULT_URL_PATTERN = "https://utdirect.utexas.edu/apps/registrar/course_schedule/20259/results/?ccyys=20259&search_type_main=COURSE&fos_cn=C+S&course_number=439&x=0&y=0";
const DEFAULT_PROF_NAME = "ELNOZAHY, MOOTAZ N"; // Default is now a single string
const DEFAULT_REFRESH_INTERVAL_SECONDS = 60;
const TARGET_STATUSES = ["open", "open; reserved", "waitlist"];
// --- End Defaults ---

// --- Global variables for settings ---
let targetUrlPattern = "";
let targetProfessor = ""; // Changed from targetProfessors array to string
let currentRefreshIntervalMs = DEFAULT_REFRESH_INTERVAL_SECONDS * 1000;
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
    console.log(`Course Checker: No match found. Refreshing in ${intervalMs / 1000} seconds...`);
    setTimeout(() => {
        location.reload();
    }, intervalMs);
}

// --- Main Logic ---
function checkCourseStatus() {
    console.log("Course Checker: Running check on matched URL:", window.location.href);
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

        if (instructorCell && statusCell) {
            const instructorSpan = instructorCell.querySelector('span');
            if (!instructorSpan) return;

            const instructorName = instructorSpan.textContent.trim();
            const status = statusCell.textContent.trim().toLowerCase();

            // --- *** UPDATED COMPARISON *** ---
            // Check if instructor name matches the single target AND status matches
            if (instructorName === targetProfessor && TARGET_STATUSES.includes(status)) {
                 console.log(`Course Checker: Found a match! Instructor: ${instructorName}, Status: ${status}`);
                 foundMatch = true;
                 // Updated alert to use the variable holding the target name
                 alert(`Match Found!\nInstructor: ${targetProfessor}\nStatus: ${status.toUpperCase()}`);
            }
            // Optional: Log only for the target professor
            else if (instructorName === targetProfessor) {
                 console.log(`Course Checker: Checking row - Instructor: ${instructorName}, Status: ${status} (status no match)`);
            }
        }
    }); // End rows.forEach

    if (!foundMatch) {
        scheduleRefresh(currentRefreshIntervalMs);
    } else {
        console.log("Course Checker: Match found, stopping refresh cycle.");
    }
}


// --- Initialization ---
(async () => {
    let settings;
    try {
        settings = await chrome.storage.sync.get({
            refreshIntervalSeconds: DEFAULT_REFRESH_INTERVAL_SECONDS,
            urlPattern: DEFAULT_URL_PATTERN,
            profName: DEFAULT_PROF_NAME // Use 'profName' key
        });

        // --- 1. Set Target URL Pattern ---
        targetUrlPattern = settings.urlPattern.trim();
        if (!targetUrlPattern) {
             console.warn("Course Checker: Target URL pattern is empty in storage, using default.");
             targetUrlPattern = DEFAULT_URL_PATTERN;
        }

        // --- 2. *** Check if current URL matches the target pattern *** ---
        const currentUrl = window.location.href;
        if (!matchesPattern(targetUrlPattern, currentUrl)) {
            console.log(`Course Checker: Current URL [${currentUrl}] does not match target pattern [${targetUrlPattern}]. Stopping script on this page.`);
            return; // EXIT SCRIPT IF URL DOESN'T MATCH
        }
        console.log(`Course Checker: Current URL matches target pattern. Proceeding...`);

        // --- 3. Set Target Professor --- // <<< *** SIMPLIFIED ***
        targetProfessor = settings.profName.trim(); // Assign directly
        if (!targetProfessor) {
            console.warn("Course Checker: No target professor name found in storage, using default.");
            targetProfessor = DEFAULT_PROF_NAME; // Use string default
        }
        console.log("Course Checker: Target Professor:", targetProfessor); // Log single name


        // --- 4. Set Refresh Interval ---
        const seconds = parseInt(settings.refreshIntervalSeconds, 10);
        if (!isNaN(seconds) && seconds >= 5) {
            currentRefreshIntervalMs = seconds * 1000;
        } else {
            console.warn(`Course Checker: Invalid interval (${settings.refreshIntervalSeconds}) in storage or below minimum. Using default ${DEFAULT_REFRESH_INTERVAL_SECONDS}s.`);
            currentRefreshIntervalMs = DEFAULT_REFRESH_INTERVAL_SECONDS * 1000;
        }
         console.log(`Course Checker: Using refresh interval of ${currentRefreshIntervalMs / 1000} seconds.`);


    } catch (error) {
        console.error("Course Checker: Error loading settings from storage. Using defaults.", error);
        targetUrlPattern = DEFAULT_URL_PATTERN;
        targetProfessor = DEFAULT_PROF_NAME; // Assign default string
        currentRefreshIntervalMs = DEFAULT_REFRESH_INTERVAL_SECONDS * 1000;

         const currentUrl = window.location.href;
         if (!matchesPattern(targetUrlPattern, currentUrl)) {
             console.log(`Course Checker: Current URL [${currentUrl}] does not match default target pattern [${targetUrlPattern}]. Stopping script.`);
             return; // EXIT SCRIPT
         }
    }

    // --- 5. Run the first check ---
    console.log("Course Checker: Initializing check...");
    setTimeout(checkCourseStatus, 500);

})(); // End async IIFE