document.addEventListener('DOMContentLoaded', () => {

    // --- ELEMENT SELECTION & CONFIGURATION ---
    const intervalInput = document.getElementById('refreshIntervalInput');
    const urlPatternInput = document.getElementById('urlPatternInput');
    const profNameInput = document.getElementById('profNameInput');
    const saveButton = document.getElementById('saveButton');
    const openWebsite = document.getElementById('openWebsite');
    const statusMessage = document.getElementById('statusMessage');
    const notifierInput = document.getElementById('checkboxNotifications');
    const runningSwitchInput = document.getElementById('runningSwitch');

    const DEFAULT_URL_PATTERN = "https://utdirect.utexas.edu/apps/registrar/course_schedule/20259/results/?ccyys=20259&search_type_main=COURSE&fos_cn=C+S&course_number=439&x=16&y=17";
    const DEFAULT_PROF_NAME = "ELNOZAHY, MOOTAZ N";
    const DEFAULT_INTERVAL_SECONDS = 60;
    const DEFAULT_NOTIFIER = false;
    const DEFAULT_RUNNING = false;
    const DEFAULT_SELECTED_STATUSES = ["open", "open; reserved", "waitlisted"];

    const STATUS_OPTIONS = [{
            id: "checkboxOpen",
            value: "open"
        },
        {
            id: "checkboxOpenReserved",
            value: "open; reserved"
        },
        {
            id: "checkboxWaitlist",
            value: "waitlisted"
        }
    ];

    const statusCheckboxes = {};
    STATUS_OPTIONS.forEach(option => {
        statusCheckboxes[option.id] = document.getElementById(option.id);
    });

    // --- LOAD INITIAL SETTINGS FROM STORAGE ---
    chrome.storage.sync.get({
        refreshIntervalSeconds: DEFAULT_INTERVAL_SECONDS,
        urlPattern: DEFAULT_URL_PATTERN,
        profName: DEFAULT_PROF_NAME,
        notify: DEFAULT_NOTIFIER,
        running: DEFAULT_RUNNING,
        selectedStatuses: DEFAULT_SELECTED_STATUSES
    }, (data) => {
        intervalInput.value = data.refreshIntervalSeconds;
        urlPatternInput.value = data.urlPattern;
        profNameInput.value = data.profName;
        notifierInput.checked = data.notify;
        runningSwitchInput.checked = data.running;

        STATUS_OPTIONS.forEach(option => {
            if (statusCheckboxes[option.id]) {
                statusCheckboxes[option.id].checked = data.selectedStatuses.includes(option.value);
            }
        });
    });

    // --- EVENT LISTENERS ---
    openWebsite.addEventListener('click', () => {
        const url = urlPatternInput.value || DEFAULT_URL_PATTERN;
        window.open(url, '_blank').focus();
    });

    saveButton.addEventListener('click', async () => {
        const intervalValue = parseInt(intervalInput.value, 10);
        const urlPatternValue = urlPatternInput.value.trim();
        const profNameValue = profNameInput.value.trim();
        const notifierValue = notifierInput.checked;
        const runningValue = runningSwitchInput.checked;

        if (!urlPatternValue) {
            statusMessage.textContent = 'Error: Target URL Pattern cannot be empty.';
            statusMessage.style.color = 'red';
            return;
        }
        if (!profNameValue) {
            statusMessage.textContent = 'Error: Target Professor cannot be empty.';
            statusMessage.style.color = 'red';
            return;
        }
        if (isNaN(intervalValue) || intervalValue < 5) {
            statusMessage.textContent = 'Error: Interval must be at least 5 seconds.';
            statusMessage.style.color = 'red';
            return;
        }

        const selectedStatusesToSave = [];
        STATUS_OPTIONS.forEach(option => {
            if (statusCheckboxes[option.id] && statusCheckboxes[option.id].checked) {
                selectedStatusesToSave.push(option.value);
            }
        });

        if (selectedStatusesToSave.length === 0) {
            statusMessage.textContent = 'Error: At least one course status must be selected.';
            statusMessage.style.color = 'red';
            return;
        }

        const settingsToSave = {
            refreshIntervalSeconds: intervalValue,
            urlPattern: urlPatternValue,
            profName: profNameValue,
            notify: notifierValue,
            running: runningValue,
            selectedStatuses: selectedStatusesToSave
        };

        saveButton.disabled = true;
        statusMessage.textContent = 'Saving...';
        statusMessage.style.color = 'gray';

        try {
            await chrome.storage.sync.set(settingsToSave);
            statusMessage.textContent = 'Settings saved!';
            statusMessage.style.color = 'green';
            setTimeout(() => window.close(), 1000);
        } catch (error) {
            statusMessage.textContent = 'Error saving settings.';
            statusMessage.style.color = 'red';
            console.error("Storage save error:", error);
        } finally {
            saveButton.disabled = false;
        }
    });
});