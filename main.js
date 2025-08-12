const SUPABASE_CONFIG = {
    url: 'https://vsiroplehniaprtecqma.supabase.co', // Your actual project URL
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzaXJvcGxlaG5pYXBydGVjcW1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5NjkwOTMsImV4cCI6MjA3MDU0NTA5M30.x5ksWXA53d9It1q_hQVRER_1QqzjZYpbD5O-Z2ZyYqw' // Your actual anon key
};

let supabase;
let walks = JSON.parse(localStorage.getItem('angelWalks')) || [];
let currentDate = new Date();
let viewMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

// Initialize Supabase
function initSupabase() {
    if (!window.supabase) {
        throw new Error('Supabase not loaded');
    }
    
    supabase = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
    return supabase;
}

// Supabase Functions
async function saveWalkToSupabase(walkData) {
    try {
        const { data, error } = await supabase
            .from('walks')
            .upsert({
                date: walkData.date,
                notes: walkData.notes || null
            }, {
                onConflict: 'date'
            })
            .select();
        
        if (error) throw error;
        return data[0];
    } catch (error) {
        console.error('Error saving walk:', error);
        throw error;
    }
}

async function loadWalksFromSupabase() {
    try {
        const { data, error } = await supabase
            .from('walks')
            .select('*')
            .order('date', { ascending: false });
        
        if (error) throw error;
        
        return data.map(record => ({
            date: record.date,
            notes: record.notes || '',
            id: record.id
        }));
    } catch (error) {
        console.error('Error loading walks:', error);
        return [];
    }
}

// Set up real-time subscriptions for live sync
function setupRealtimeSync() {
    if (!supabase) return;
    
    const subscription = supabase
        .channel('walks_changes')
        .on('postgres_changes', 
            { 
                event: '*', 
                schema: 'public', 
                table: 'walks' 
            }, 
            async (payload) => {
                console.log('Real-time update:', payload);
                // Reload walks when data changes
                walks = await loadWalksFromSupabase();
                updateStreak();
                updateHeatmap();
            }
        )
        .subscribe();
    
    return subscription;
}
// Initialize app
document.addEventListener('DOMContentLoaded', async function() {
    initSupabase();
    walks = await loadWalksFromSupabase(); // <-- Load from Supabase
    document.getElementById('walkDate').value = formatDate(currentDate);
    updateStreak();
    updateHeatmap();
});

function formatDate(date) {
    return date.toISOString().split('T')[0];
}

async function logWalk(event) {
    event.preventDefault();
    
    const walkDate = document.getElementById('walkDate').value;
    const walkNotes = document.getElementById('walkNotes').value;
    
    // Check if walk already exists for this date
    const existingWalkIndex = walks.findIndex(walk => walk.date === walkDate);
    
    if (existingWalkIndex >= 0) {
        // Update existing walk
        walks[existingWalkIndex].notes = walkNotes;
        walks[existingWalkIndex].timestamp = new Date().toISOString();
    } else {
        // Add new walk
        walks.push({
            date: walkDate,
            notes: walkNotes,
            timestamp: new Date().toISOString()
        });
    }
    
    // Sort walks by date (newest first)
    walks.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Save to localStorage
    localStorage.setItem('angelWalks', JSON.stringify(walks));
    
    // Save to Supabase
    try {
        await saveWalkToSupabase({
            date: walkDate,
            notes: walkNotes
        });
    } catch (e) {
        alert('Failed to save walk to Supabase!');
    }

    // Update displays
    updateStreak();
    updateHeatmap();
    
    // Close modal
    closeLogModal();
    
    // Show success feedback
    const btn = event.target.querySelector('.modal-log-btn');
    const originalText = btn.textContent;
    btn.textContent = 'LOGGED! 🎉';
    btn.style.background = 'linear-gradient(45deg, #00b894, #00a085)';
    setTimeout(() => {
        btn.textContent = originalText;
        btn.style.background = 'linear-gradient(45deg, #667eea, #764ba2)';
    }, 1500);
}

function openLogModal() {
    document.getElementById('logModal').style.display = 'block';
    document.getElementById('walkDate').value = formatDate(currentDate);
    document.getElementById('walkNotes').value = '';
}

function closeLogModal() {
    document.getElementById('logModal').style.display = 'none';
}

// Close modal when clicking outside of it
window.onclick = function(event) {
    const modal = document.getElementById('logModal');
    if (event.target === modal) {
        closeLogModal();
    }
}

const streakNumberEl = document.getElementById('streakNumber');
const streakCountEl = document.getElementById('streakCount');
const heatmapEl = document.getElementById('heatmap');

function updateStreak() {
    if (!walks.length) {
        streakNumberEl.textContent = 0;
        streakCountEl.textContent = 0;
        return;
    }

    // Sort walks by date descending
    const sortedWalks = [...walks].sort((a, b) => new Date(b.date) - new Date(a.date));
    let streak = 1;
    let lastDate = new Date(sortedWalks[0].date);

    for (let i = 1; i < sortedWalks.length; i++) {
        const currentDate = new Date(sortedWalks[i].date);
        const diff = (lastDate - currentDate) / (1000 * 60 * 60 * 24);

        if (diff === 1) {
            streak++;
            lastDate = currentDate;
        } else if (diff > 1) {
            break;
        }
    }

    streakNumberEl.textContent = streak;
    streakCountEl.textContent = streak;
}

function updateHeatmap() {
    const monthName = viewMonth.toLocaleString('default', { month: 'long', year: 'numeric' });
    document.getElementById('currentMonth').textContent = monthName;
    
    // Clear heatmap
    heatmapEl.innerHTML = '';
    
    // Get days in month
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();
    
    // Add empty cells for days before month starts
    for (let i = 0; i < startDayOfWeek; i++) {
        const cell = document.createElement('div');
        cell.className = 'heatmap-cell';
        heatmapEl.appendChild(cell);
    }
    
    // Add cells for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
        const cell = document.createElement('div');
        cell.className = 'heatmap-cell';
        
        const dateObj = new Date(year, month, day);
        const dateStr = formatDate(dateObj);
        const walk = walks.find(walk => walk.date === dateStr);
        const hasWalk = !!walk;
        
        if (hasWalk) {
            cell.className += ' has-walk level-3';
        }
        
        cell.title = `${dateStr}${hasWalk ? ' - Walk logged!' : ''}`;
        cell.dataset.date = dateStr;

        // Add click event to open modal with notes
        cell.addEventListener('click', function() {
            openDayModal(dateStr, walk ? walk.notes : '');
        });

        heatmapEl.appendChild(cell);
    }
}

async function removeWalk(date) {
    // Remove from local array
    walks = walks.filter(walk => walk.date !== date);
    // Update localStorage
    localStorage.setItem('angelWalks', JSON.stringify(walks));
    // Remove from Supabase
    try {
        const { error } = await supabase
            .from('walks')
            .delete()
            .eq('date', date);
        if (error) throw error;
    } catch (e) {
        alert('Failed to remove walk from Supabase!');
    }
    // Update UI
    walks = await loadWalksFromSupabase();
    updateStreak();
    updateHeatmap();
}

// Modal for viewing walk details
function openDayModal(date, notes) {
    // Create modal if it doesn't exist
    let dayModal = document.getElementById('dayModal');
    if (!dayModal) {
        dayModal = document.createElement('div');
        dayModal.id = 'dayModal';
        dayModal.className = 'modal';
        dayModal.innerHTML = `
            <div class="modal-content">
                <span class="close" id="closeDayModal">&times;</span>
                <div class="modal-title" id="dayModalTitle"></div>
                <div class="modal-notes" id="dayModalNotes"></div>
                <div style="display:flex; justify-content:center;">
                    <button id="removeWalkBtn" class="remove-walk-btn" style="display:none;">Remove Walk</button>
                </div>
            </div>
        `;
        document.body.appendChild(dayModal);

        // Close modal on X click
        document.getElementById('closeDayModal').onclick = function() {
            dayModal.style.display = 'none';
        };

        // Close modal when clicking outside
        dayModal.onclick = function(event) {
            if (event.target === dayModal) {
                dayModal.style.display = 'none';
            }
        };
    }

    document.getElementById('dayModalTitle').textContent = `Date: ${date}`;
    document.getElementById('dayModalNotes').textContent = notes ? `Notes: ${notes}` : 'No notes for this day.';

    // Show or hide the remove button
    const removeBtn = document.getElementById('removeWalkBtn');
    const walkExists = walks.some(walk => walk.date === date);
    if (walkExists) {
        removeBtn.style.display = 'inline-block';
        removeBtn.onclick = async function() {
            await removeWalk(date);
            dayModal.style.display = 'none';
        };
    } else {
        removeBtn.style.display = 'none';
        removeBtn.onclick = null;
    }

    dayModal.style.display = 'block';
}

function changeMonth(direction) {
    viewMonth.setMonth(viewMonth.getMonth() + direction);
    updateHeatmap();
}

function displayDogImage(imageData) {
    const dogImage = document.getElementById('dogImage');
    const placeholder = document.getElementById('imagePlaceholder');
    
    dogImage.src = imageData;
    dogImage.style.display = 'block';
    placeholder.style.display = 'none';
}

function debounce(fn, delay) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}
const debouncedUpdateHeatmap = debounce(updateHeatmap, 100);
const debouncedUpdateStreak = debounce(updateStreak, 100);