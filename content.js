(async () => {
    // --- CONFIGURATION & DEFAULTS ---
    const DEFAULTS = {
        urlPattern: "https://utdirect.utexas.edu/apps/registrar/course_schedule/20259/results/?ccyys=20259&search_type_main=COURSE&fos_cn=C+S&course_number=439&x=0&y=0",
        profName: "ELNOZAHY, MOOTAZ N",
        refreshIntervalSeconds: 60,
        selectedStatuses: ["open", "open; reserved", "waitlisted"],
        notify: false,
        running: false
    };
    
    let settings;

    // --- HELPER FUNCTIONS ---
    function matchesPattern(pattern, url) {
        if (!pattern || !url) return false;
        try {
            const regexPattern = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
            const regex = new RegExp(`^${regexPattern}$`);
            return regex.test(url);
        } catch (e) {
            console.error("Course Checker: Invalid URL pattern provided:", pattern, e);
            return false;
        }
    }

    function scheduleRefresh(intervalMs) {
        const safeInterval = Math.max(intervalMs, 5000);
        console.log(`Course Checker: Refreshing in ${safeInterval / 1000} seconds...`);
        setTimeout(() => location.reload(), safeInterval);
    }

    function sendNotification(title, options, onClick) {
        if (Notification.permission === "granted") {
            const notification = new Notification(title, options);
            if (onClick) notification.onclick = onClick;
        } else if (Notification.permission !== "denied") {
            Notification.requestPermission().then(permission => {
                if (permission === "granted") {
                    const notification = new Notification(title, options);
                    if (onClick) notification.onclick = onClick;
                }
            });
        }
    }

    // --- CORE LOGIC ---
    function checkCourseStatus() {
        const targetTable = document.querySelector('table.rwd-table.results');
        if (!targetTable) {
            console.error("Course Checker: Target table not found. Refreshing...");
            scheduleRefresh(settings.refreshIntervalSeconds * 1000);
            return;
        }

        let foundMatch = false;
        const rows = targetTable.querySelectorAll('tbody tr');

        for (const row of rows) {
            if (row.classList.contains('course_header')) continue;

            const instructorCell = row.querySelector('td[data-th="Instructor"]');
            const statusCell = row.querySelector('td[data-th="Status"]');
            const uniqueCell = row.querySelector('td[data-th="Unique"]');

            if (instructorCell && statusCell && uniqueCell) {
                const instructorName = instructorCell.querySelector('span')?.textContent.trim();
                const uniqueNum = uniqueCell.textContent.trim();
                const status = statusCell.textContent.trim().toLowerCase();

                if (instructorName === settings.profName && settings.selectedStatuses.includes(status)) {
                    console.log(`Course Checker: MATCH FOUND! Instructor: ${instructorName}, Status: '${status}'.`);
                    foundMatch = true;
                    
                    const notificationOptions = {
                        requireInteraction: true,
                        body: `Match Found!\nUnique Number: ${uniqueNum}\nInstructor: ${settings.profName}\nStatus: ${status.toUpperCase()}`
                    };

                    const notificationOnClick = (event) => {
                        event.preventDefault();
                        window.open(`https://utdirect.utexas.edu/registration/registration.WBX?s_ccyys=20259&s_af_unique=${uniqueNum}`, "_blank");
                    };

                    sendNotification("Course Status Change", notificationOptions, notificationOnClick);
                    break; // Critical optimization: stop searching after a match.
                }
            }
        }

        if (!settings.running) {
            console.log(`Course Checker: Script is paused. Checked at ${new Date().toLocaleTimeString()}.`);
            return;
        }
        
        if (foundMatch) {
            console.log("Course Checker: Match found, stopping automatic refresh.");
            return;
        }

        if (settings.notify) {
            const now = new Date();
            const minutes = now.getMinutes();
            const seconds = now.getSeconds();

            if ((minutes === 0 || minutes === 30) && seconds < settings.refreshIntervalSeconds) {
                sendNotification("UT Course Checker Running", {
                    body: `Still checking for ${settings.profName} at ${now.toLocaleTimeString()}`
                });
            }
        }
        scheduleRefresh(settings.refreshIntervalSeconds * 1000);
    }

    // --- INITIALIZATION ---
    try {
        settings = await chrome.storage.sync.get(DEFAULTS);
    } catch (error) {
        console.error("Course Checker: Could not load settings from storage. Aborting.", error);
        return;
    }

    if (!matchesPattern(settings.urlPattern, window.location.href)) {
        console.log("Course Checker: Page URL does not match target pattern. Script will not run.");
        return;
    }

    console.log("Course Checker: Initializing on a matching page.");
    setTimeout(checkCourseStatus, 500);
})();