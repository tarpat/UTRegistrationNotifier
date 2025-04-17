const intervalInput = document.getElementById('refreshIntervalInput');
const urlPatternInput = document.getElementById('urlPatternInput');
const profNameInput = document.getElementById('profNameInput'); // Input field remains the same
const saveButton = document.getElementById('saveButton');
const statusMessage = document.getElementById('statusMessage');

// --- Defaults ---
const DEFAULT_URL_PATTERN = "https://utdirect.utexas.edu/apps/registrar/course_schedule/*";
const DEFAULT_PROF_NAME = "ELNOZAHY, MOOTAZ N"; // Default is now a single string
const DEFAULT_INTERVAL_SECONDS = 60;
// --- End Defaults ---

// Load saved settings when the popup opens
document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.sync.get({
        refreshIntervalSeconds: DEFAULT_INTERVAL_SECONDS,
        urlPattern: DEFAULT_URL_PATTERN,
        profName: DEFAULT_PROF_NAME // Use 'profName' key
    }, (data) => {
        intervalInput.value = data.refreshIntervalSeconds;
        urlPatternInput.value = data.urlPattern;
        profNameInput.value = data.profName; // Load single name
    });
});

// Save settings when the button is clicked
saveButton.addEventListener('click', () => {
    const intervalValue = parseInt(intervalInput.value, 10);
    const urlPatternValue = urlPatternInput.value.trim();
    const profNameValue = profNameInput.value.trim(); // Read single name

    // --- Validation ---
    if (!urlPatternValue) {
        statusMessage.textContent = 'Error: Target URL Pattern cannot be empty.';
        statusMessage.style.color = 'red';
        return;
    }
     if (!profNameValue) {
        // Updated validation message
        statusMessage.textContent = 'Error: Target Professor cannot be empty.';
        statusMessage.style.color = 'red';
        return;
    }
    if (isNaN(intervalValue) || intervalValue < 5) {
        statusMessage.textContent = 'Error: Interval must be at least 5 seconds.';
        statusMessage.style.color = 'red';
        return;
    }
    // --- End Validation ---


    chrome.storage.sync.set({
        refreshIntervalSeconds: intervalValue,
        urlPattern: urlPatternValue,
        profName: profNameValue // Save single name using 'profName' key
    }, () => {
        if (chrome.runtime.lastError) {
            statusMessage.textContent = 'Error saving settings.';
            statusMessage.style.color = 'red';
            console.error("Storage save error:", chrome.runtime.lastError);
        } else {
            statusMessage.textContent = 'Settings saved!';
            statusMessage.style.color = 'green';
            setTimeout(() => {
                window.close();
            }, 750);
        }
    });
});