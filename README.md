# Course Status Checker Chrome Extension

## Description

This Chrome extension automatically monitors a specific university course schedule page for the availability of a class taught by a particular instructor. It auto-refreshes the page at a set interval and plays a notification sound (`beep-08b.mp3`) if a matching course section is found with a status of "open", "reserved", or "waitlist".

This version is configured for **[Mention Target University/Site, e.g., UT Austin]** and currently checks for courses taught by **ELNOZAHY, MOOTAZ N**.

## Features

* **Auto-Refresh:** Automatically reloads the target course schedule page periodically.
* **Specific Check:** Looks for table rows matching a predefined instructor name.
* **Status Monitoring:** Checks if the status for the matched course is "open", "reserved", or "waitlist".
* **Sound Notification:** Plays `beep-08b.mp3` when a match is found.
* **Stops on Match:** The auto-refresh cycle stops once a matching, available course is detected.

## Files Included

* `manifest.json`: Configures the extension, permissions, and target page URL.
* `content.js`: Contains the core logic for checking the table and playing the sound.
* `beep-08b.mp3`: The sound file played upon finding a match.

## Prerequisites

* Google Chrome browser
* The `beep-08b.mp3` file must be present in the same directory as `manifest.json`.

## Setup & Installation

**IMPORTANT:** Before loading, you MUST edit the `manifest.json` file to target the correct course schedule URL.

1.  **Edit `manifest.json`:**
    * Open `manifest.json` in a text editor.
    * Find the `"content_scripts"` section and locate the `"matches"` array. Replace `"<URL_PATTERN_OF_THE_COURSE_PAGE>"` with the actual URL pattern for the course schedule page you want to monitor (e.g., `"https://registrar.utexas.edu/schedules/20259/results*"`). Use `*` as a wildcard if needed.
    * Find the `"web_accessible_resources"` section. Ensure the `"matches"` array within it **mirrors** the pattern(s) you just set in `"content_scripts"`.
    * Save the `manifest.json` file.

2.  **Load the Extension in Chrome:**
    * Open Chrome and navigate to `chrome://extensions`.
    * Enable "Developer mode" using the toggle switch (usually in the top-right corner).
    * Click the "Load unpacked" button.
    * Select the folder containing your extension files (`manifest.json`, `content.js`, `beep-08b.mp3`).
    * The extension should now appear in your list and be active.

## Usage

Once installed and configured:

1.  Navigate to the specific course schedule page in Chrome that matches the URL pattern you set in `manifest.json`.
2.  The extension will automatically start running in the background on that page.
3.  It will refresh the page based on the interval set in `content.js`.
4.  If it finds a row matching the hardcoded instructor and status criteria, it will play the `beep-08b.mp3` sound and stop refreshing. You should hear the sound through your computer's speakers/headphones.

## Customization (Manual Code Edits)

This version requires editing the code directly to change parameters:

* **Target Instructor:**
    * Edit `content.js`.
    * Find the line `const TARGET_INSTRUCTOR = "ELNOZAHY, MOOTAZ N";`
    * Change the name within the quotes to the exact name you want to track.
* **Target Statuses:**
    * Edit `content.js`.
    * Find the line `const TARGET_STATUSES = ["open", "reserved", "waitlist"];`
    * Modify the array to include or remove statuses (must be lowercase).
* **Refresh Interval:**
    * Edit `content.js`.
    * Find the line `const REFRESH_INTERVAL_MS = 60000;`
    * Change the number `60000` (which is 60 seconds) to your desired interval in milliseconds (e.g., `30000` for 30 seconds). Use intervals >= 5000 (5 seconds) to avoid issues.
* **Target URL:**
    * Edit `manifest.json` as described in the "Setup & Installation" section (update **both** `content_scripts.matches` and `web_accessible_resources.matches`).
* **Sound File:**
    * Replace `beep-08b.mp3` with your desired sound file (must be in the root directory).
    * Update the filename in the `web_accessible_resources` section of `manifest.json`.
    * Update the filename in the `chrome.runtime.getURL("beep-08b.mp3")` call within `content.js`.

**Important:** After making any code changes (`.js` or `.json`), you need to go back to `chrome://extensions` and click the **reload** icon for this extension for the changes to take effect.

## Limitations

* This extension relies heavily on the specific HTML structure (table classes, `data-th` attributes, `span` tags) of the target course schedule page. If the website is updated, the extension may break and require code adjustments.
* The configuration (URL, instructor, interval) is hardcoded and requires manual code edits to change.
* It only alerts once and then stops. You would need to manually reload the page and potentially the extension if you want it to check again after finding a match.
* Audio playback may be subject to browser policies or might fail silently if there are issues accessing the file. Check the console (`F12`) for errors.
