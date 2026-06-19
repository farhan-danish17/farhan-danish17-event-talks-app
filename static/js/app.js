// State Management
let allEntries = [];
let selectedUpdates = new Map(); // Map of {updateId => updateData}
let activeFilter = 'all';
let searchQuery = '';

// DOM Elements
const btnRefresh = document.getElementById('btn-refresh');
const iconRefresh = btnRefresh.querySelector('.icon-refresh');
const btnExport = document.getElementById('btn-export');
const lastUpdatedTimeEl = document.getElementById('last-updated-time');
const searchInput = document.getElementById('search-input');
const filterBadgesContainer = document.getElementById('filter-badges');
const loadingState = document.getElementById('loading-state');
const errorState = document.getElementById('error-state');
const errorMessageEl = document.getElementById('error-message');
const btnRetry = document.getElementById('btn-retry');
const emptyState = document.getElementById('empty-state');
const btnClearFilters = document.getElementById('btn-clear-filters');
const timelineContainer = document.getElementById('timeline-container');

// Floating Drawer Elements
const selectionDrawer = document.getElementById('selection-drawer');
const selectionCountEl = document.getElementById('selection-count');
const btnClearSelection = document.getElementById('btn-clear-selection');
const btnTweetSelected = document.getElementById('btn-tweet-selected');

// Modal Elements
const tweetModal = document.getElementById('tweet-modal');
const tweetTextarea = document.getElementById('tweet-textarea');
const charCounter = document.getElementById('char-counter');
const characterWarning = document.getElementById('character-warning');
const btnCloseModal = document.getElementById('btn-close-modal');
const btnModalCancel = document.getElementById('btn-modal-cancel');
const btnModalSend = document.getElementById('btn-modal-send');

// Init
document.addEventListener('DOMContentLoaded', () => {
    fetchReleaseNotes();
    setupEventListeners();
});

// Event Listeners Setup
function setupEventListeners() {
    // Refresh & Retry
    btnRefresh.addEventListener('click', fetchReleaseNotes);
    btnRetry.addEventListener('click', fetchReleaseNotes);
    
    // Export CSV
    if (btnExport) {
        btnExport.addEventListener('click', exportToCSV);
    }
    
    // Search
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        renderTimeline();
    });
    
    // Filters
    filterBadgesContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('filter-badge')) {
            // Update active class
            filterBadgesContainer.querySelectorAll('.filter-badge').forEach(badge => {
                badge.classList.remove('active');
            });
            e.target.classList.add('active');
            
            activeFilter = e.target.getAttribute('data-type');
            renderTimeline();
        }
    });
    
    // Reset filters empty state button
    btnClearFilters.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        activeFilter = 'all';
        filterBadgesContainer.querySelectorAll('.filter-badge').forEach(badge => {
            badge.classList.toggle('active', badge.getAttribute('data-type') === 'all');
        });
        renderTimeline();
    });
    
    // Clear selection
    btnClearSelection.addEventListener('click', () => {
        clearSelection();
    });
    
    // Tweet Actions
    btnTweetSelected.addEventListener('click', () => {
        composeTweetFromSelected();
    });
    
    // Modal Actions
    btnCloseModal.addEventListener('click', closeModal);
    btnModalCancel.addEventListener('click', closeModal);
    btnModalSend.addEventListener('click', sendTweet);
    tweetTextarea.addEventListener('input', updateCharCounter);
}

// ==========================================================================
// API Interaction
// ==========================================================================
async function fetchReleaseNotes() {
    // UI state: loading
    showState('loading');
    iconRefresh.classList.add('spinning');
    btnRefresh.disabled = true;
    
    try {
        const response = await fetch('/api/release-notes');
        if (!response.ok) {
            throw new Error(`Server returned code ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.status === 'success') {
            allEntries = data.entries;
            
            // Format last fetched time
            const now = new Date();
            const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            lastUpdatedTimeEl.textContent = `Updated today at ${timeString}`;
            
            renderTimeline();
            showState('content');
        } else {
            throw new Error(data.message || 'Unknown error occurred');
        }
    } catch (error) {
        console.error('Error fetching release notes:', error);
        errorMessageEl.textContent = error.message;
        showState('error');
    } finally {
        iconRefresh.classList.remove('spinning');
        btnRefresh.disabled = false;
    }
}

// Helper to show/hide central panels (loading, error, timeline etc)
function showState(state) {
    loadingState.classList.toggle('hidden', state !== 'loading');
    errorState.classList.toggle('hidden', state !== 'error');
    emptyState.classList.toggle('hidden', state !== 'empty');
    timelineContainer.classList.toggle('hidden', state !== 'content');
}

// ==========================================================================
// Render Timeline & Cards
// ==========================================================================
function renderTimeline() {
    timelineContainer.innerHTML = '';
    
    let totalRenderedUpdates = 0;
    
    // Group updates by date and render
    allEntries.forEach((entry, entryIndex) => {
        // Filter updates inside the entry
        const filteredUpdates = entry.updates.filter(update => {
            // Type Filter
            if (activeFilter !== 'all' && update.type !== activeFilter) {
                return false;
            }
            
            // Search Query Filter (Checks type and plain text content)
            if (searchQuery) {
                const typeMatches = update.type.toLowerCase().includes(searchQuery);
                const textMatches = update.text.toLowerCase().includes(searchQuery);
                return typeMatches || textMatches;
            }
            
            return true;
        });
        
        if (filteredUpdates.length > 0) {
            // Create day group
            const dayGroup = document.createElement('div');
            dayGroup.className = 'timeline-day-group';
            
            // Date node
            const dayMarker = document.createElement('div');
            dayMarker.className = 'day-marker';
            dayMarker.textContent = entry.date;
            dayGroup.appendChild(dayMarker);
            
            // Container for this day's cards
            const dayUpdatesContainer = document.createElement('div');
            dayUpdatesContainer.className = 'day-updates';
            
            filteredUpdates.forEach((update, updateIndex) => {
                const updateId = `up-${entryIndex}-${updateIndex}`;
                totalRenderedUpdates++;
                
                // Card component
                const card = document.createElement('div');
                card.className = `update-card ${selectedUpdates.has(updateId) ? 'selected' : ''}`;
                card.setAttribute('data-id', updateId);
                
                // Add unique identifiers for testing/reference
                card.id = `card-${updateId}`;
                
                // Clean type class
                const typeClass = update.type.toLowerCase().replace(/\s+/g, '-');
                
                card.innerHTML = `
                    <div class="card-header">
                        <div class="card-header-left">
                            <div class="card-selection">
                                <input type="checkbox" id="check-${updateId}" ${selectedUpdates.has(updateId) ? 'checked' : ''}>
                                <div class="checkbox-custom">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                                        <polyline points="20 6 9 17 4 12"/>
                                    </svg>
                                </div>
                            </div>
                            <span class="badge-type ${typeClass}">${update.type}</span>
                        </div>
                        <div class="card-header-actions">
                            <button class="btn-card-action btn-card-copy" aria-label="Copy update text" title="Copy update text">
                                <svg class="icon-copy-default" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5">
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                                </svg>
                            </button>
                            <button class="btn-card-action btn-card-tweet" aria-label="Tweet this update" title="Tweet this update">
                                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                                </svg>
                            </button>
                            <a class="btn-card-action btn-card-link" href="${entry.link}" target="_blank" rel="noopener noreferrer" aria-label="View source release notes" title="View source release notes">
                                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5">
                                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/>
                                </svg>
                            </a>
                        </div>
                    </div>
                    <div class="card-body">
                        ${update.html}
                    </div>
                `;
                
                // Add event listeners to card elements
                setupCardEvents(card, updateId, entry, update);
                
                dayUpdatesContainer.appendChild(card);
            });
            
            dayGroup.appendChild(dayUpdatesContainer);
            timelineContainer.appendChild(dayGroup);
        }
    });
    
    // Check if we found anything to show
    if (totalRenderedUpdates === 0) {
        showState('empty');
    } else {
        showState('content');
    }
}

// Event hooks inside each update card
function setupCardEvents(card, updateId, entry, update) {
    const checkbox = card.querySelector(`#check-${updateId}`);
    const btnTweet = card.querySelector('.btn-card-tweet');
    const btnCopy = card.querySelector('.btn-card-copy');
    
    // Checkbox selection toggle
    checkbox.addEventListener('change', (e) => {
        toggleSelection(updateId, e.target.checked, entry, update, card);
    });
    
    // Clicking anywhere on card (except on links, button click handles, and checkbox area) toggles checkbox
    card.addEventListener('click', (e) => {
        if (e.target.tagName !== 'A' && 
            e.target.closest('a') === null && 
            e.target.closest('.btn-card-action') === null && 
            e.target.closest('.card-selection') === null) {
            
            const newState = !checkbox.checked;
            checkbox.checked = newState;
            toggleSelection(updateId, newState, entry, update, card);
        }
    });
    
    // Instant single Tweet composer launch
    btnTweet.addEventListener('click', (e) => {
        e.stopPropagation();
        openTweetComposer(entry, update);
    });
    
    // Copy to clipboard click listener
    btnCopy.addEventListener('click', async (e) => {
        e.stopPropagation();
        try {
            await navigator.clipboard.writeText(update.text);
            
            // Visual feedback: change icon to green checkmark temporarily
            const originalHTML = btnCopy.innerHTML;
            btnCopy.innerHTML = `
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#10b981" stroke-width="3">
                    <polyline points="20 6 9 17 4 12"/>
                </svg>
            `;
            btnCopy.style.borderColor = '#10b981';
            
            setTimeout(() => {
                btnCopy.innerHTML = originalHTML;
                btnCopy.style.borderColor = '';
            }, 1500);
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
    });
}

// ==========================================================================
// Selection & Drawer Handler
// ==========================================================================
function toggleSelection(updateId, isSelected, entry, update, cardElement) {
    if (isSelected) {
        selectedUpdates.set(updateId, {
            id: updateId,
            date: entry.date,
            type: update.type,
            text: update.text,
            link: entry.link
        });
        cardElement.classList.add('selected');
    } else {
        selectedUpdates.delete(updateId);
        cardElement.classList.remove('selected');
    }
    
    updateSelectionDrawer();
}

function updateSelectionDrawer() {
    const count = selectedUpdates.size;
    if (count > 0) {
        selectionCountEl.textContent = `${count} ${count === 1 ? 'update' : 'updates'} selected`;
        selectionDrawer.classList.add('active');
    } else {
        selectionDrawer.classList.remove('active');
    }
}

function clearSelection() {
    // Uncheck all active DOM check elements
    selectedUpdates.forEach((val, id) => {
        const check = document.getElementById(`check-${id}`);
        const card = document.getElementById(`card-${id}`);
        if (check) check.checked = false;
        if (card) card.classList.remove('selected');
    });
    
    selectedUpdates.clear();
    updateSelectionDrawer();
}

// ==========================================================================
// Twitter Integration & Composing
// ==========================================================================

// Build tweet text for a single update card
function buildSingleTweetText(date, type, text, link) {
    // Template:
    // 🚀 [BigQuery Release] - Feature (June 17, 2026)
    // 
    // You can enable autonomous embedding generation...
    // 
    // Details: link
    
    const prefix = `🚀 [BigQuery Release] - ${type} (${date})\n\n`;
    const suffix = `\n\nDetails: ${link}`;
    
    // Maximum text length to fit in Twitter 280 chars
    const availableLength = 280 - prefix.length - suffix.length;
    
    let trimmedText = text;
    if (text.length > availableLength) {
        trimmedText = text.substring(0, availableLength - 3) + '...';
    }
    
    return `${prefix}${trimmedText}${suffix}`;
}

// Launch composer modal for single card
function openTweetComposer(entry, update) {
    const tweetText = buildSingleTweetText(entry.date, update.type, update.text, entry.link);
    showTweetModal(tweetText);
}

// Compose tweet from all selected items (bullets)
function composeTweetFromSelected() {
    if (selectedUpdates.size === 0) return;
    
    if (selectedUpdates.size === 1) {
        // Just use the single text
        const singleVal = selectedUpdates.values().next().value;
        const text = buildSingleTweetText(singleVal.date, singleVal.type, singleVal.text, singleVal.link);
        showTweetModal(text);
        return;
    }
    
    // Multiple items
    let header = `🚀 BigQuery Updates (${selectedUpdates.size} Items)\n\n`;
    let footer = `\n\nFull release notes: https://docs.cloud.google.com/bigquery/docs/release-notes`;
    
    let bullets = '';
    
    // Compile bullet points
    selectedUpdates.forEach((item) => {
        // Bullet style: • [Feature] Text summary...
        bullets += `• [${item.type}] ${item.text}\n`;
    });
    
    let fullTweet = `${header}${bullets}${footer}`;
    
    // If it's too long, we need to smart-trim individual bullets
    if (fullTweet.length > 280) {
        const availableSpace = 280 - header.length - footer.length;
        const perBulletSpace = Math.floor(availableSpace / selectedUpdates.size) - 5; // buffer for formatting
        
        bullets = '';
        selectedUpdates.forEach((item) => {
            let bulletText = item.text;
            if (bulletText.length > perBulletSpace) {
                bulletText = bulletText.substring(0, perBulletSpace) + '...';
            }
            bullets += `• [${item.type}] ${bulletText}\n`;
        });
        
        fullTweet = `${header}${bullets}${footer}`;
    }
    
    showTweetModal(fullTweet);
}

// ==========================================================================
// Modal Handlers
// ==========================================================================
function showTweetModal(initialText) {
    tweetTextarea.value = initialText;
    updateCharCounter();
    tweetModal.classList.add('active');
    // Lock body scroll
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    tweetModal.classList.remove('active');
    document.body.style.overflow = '';
}

function updateCharCounter() {
    const len = tweetTextarea.value.length;
    charCounter.textContent = len;
    
    // Color indicators matching standard UX
    if (len > 280) {
        charCounter.className = 'danger';
        characterWarning.classList.remove('hidden');
    } else if (len > 250) {
        charCounter.className = 'warning';
        characterWarning.classList.add('hidden');
    } else {
        charCounter.className = '';
        characterWarning.classList.add('hidden');
    }
}

function sendTweet() {
    const text = tweetTextarea.value;
    const intentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(intentUrl, '_blank', 'width=550,height=420,referrerpolicy=no-referrer');
    closeModal();
}

// ==========================================================================
// Export CSV Handler
// ==========================================================================
function exportToCSV() {
    let dataToExport = [];
    
    // If selected updates exist, use them. Otherwise use currently visible filtered updates
    if (selectedUpdates.size > 0) {
        selectedUpdates.forEach((val) => {
            dataToExport.push({
                date: val.date,
                type: val.type,
                text: val.text,
                link: val.link
            });
        });
    } else {
        // Collect visible updates based on current search & type filters
        allEntries.forEach((entry) => {
            const filtered = entry.updates.filter(update => {
                if (activeFilter !== 'all' && update.type !== activeFilter) return false;
                if (searchQuery) {
                    const typeMatches = update.type.toLowerCase().includes(searchQuery);
                    const textMatches = update.text.toLowerCase().includes(searchQuery);
                    return typeMatches || textMatches;
                }
                return true;
            });
            
            filtered.forEach((update) => {
                dataToExport.push({
                    date: entry.date,
                    type: update.type,
                    text: update.text,
                    link: entry.link
                });
            });
        });
    }
    
    if (dataToExport.length === 0) {
        alert("No release notes to export!");
        return;
    }
    
    // Convert to CSV string (Headers: Date, Type, Description, Release Link)
    const headers = ["Date", "Type", "Description", "Release Link"];
    
    const escapeCSV = (str) => {
        if (str === null || str === undefined) return '';
        const cleanStr = String(str).replace(/"/g, '""');
        if (cleanStr.includes(',') || cleanStr.includes('\n') || cleanStr.includes('\r') || cleanStr.includes('"')) {
            return `"${cleanStr}"`;
        }
        return cleanStr;
    };
    
    const csvRows = [];
    csvRows.push(headers.map(escapeCSV).join(','));
    
    dataToExport.forEach(row => {
        const values = [
            row.date,
            row.type,
            row.text,
            row.link
        ];
        csvRows.push(values.map(escapeCSV).join(','));
    });
    
    const csvString = csvRows.join('\n');
    
    // Trigger file download
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    const today = new Date().toISOString().split('T')[0];
    const selectionSuffix = selectedUpdates.size > 0 ? `-selected-${selectedUpdates.size}` : '';
    link.setAttribute('download', `bigquery-release-notes-${today}${selectionSuffix}.csv`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
