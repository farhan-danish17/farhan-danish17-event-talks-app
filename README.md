# BigQuery Release Notes Dashboard

A modern, real-time developer dashboard to monitor, search, and share Google Cloud BigQuery release updates. Built with a lightweight **Python Flask** backend and a premium **glassmorphic vanilla CSS & JS** frontend.

---

## ✨ Features

- **Automated RSS Ingestion**: Periodically parses the official Google Cloud BigQuery release notes XML feed.
- **Smart Category Segmentation**: Uses `BeautifulSoup` to break down and group day-grouped logs by their specific categories (e.g., *Feature*, *Announcement*, *Issue*, *Deprecation*).
- **Interactive Live Filtering**: Search entries via free-text keyword queries and instantly filter updates with category badges.
- **Pre-compose Tweets**: 
  - **Single Update**: Click the X/Twitter icon on any card to automatically draft a tweet detailing the update, type, and source link.
  - **Batch Selections**: Select multiple updates using checkboxes to activate a floating action drawer that compiles a bulleted list of updates, formatted with safety checks to fit within the 280-character limit.
- **X/Twitter Composer Modal**: Preview and customize draft tweets locally in a custom mock UI with a character count indicator before redirecting to the Twitter platform.

---

## 🛠️ Tech Stack

- **Backend**: Python 3, Flask, `requests`, `feedparser`, `beautifulsoup4`
- **Frontend**: Vanilla HTML5, Vanilla CSS3 (Custom Glassmorphism), Vanilla JavaScript (ES6)

---

## 🚀 Getting Started

### 1. Prerequisites
Ensure you have Python 3 installed.

### 2. Installation & Setup
Clone the repository (or navigate to the project directory) and install dependencies:

```bash
# Navigate to the folder
cd bigquery_release_notes

# Create a virtual environment (if not already present)
python -m venv venv

# Activate virtual environment
# On Windows (PowerShell):
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# Install requirements
pip install -r requirements.txt
```

### 3. Run the Application
Start the Flask development server:
```bash
python app.py
```

Open your browser and navigate to:
👉 **[http://localhost:5000](http://localhost:5000)**

---

## 📂 Project Structure

```text
├── app.py                  # Flask server and XML processing endpoint
├── requirements.txt        # Python library dependencies
├── .gitignore              # Files ignored by git (venv, caches, etc.)
├── README.md               # Project documentation
├── templates/
│   └── index.html          # Core frontend layout and modals
└── static/
    ├── css/
    │   └── style.css       # Custom glassmorphic styling system
    └── js/
        └── app.js          # State manager, parsing & search logic
```
