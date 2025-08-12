const SUPABASE_CONFIG = {
    url: 'https://vsiroplehniaprtecqma.supabase.co', // Your actual project URL
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzaXJvcGxlaG5pYXBydGVjcW1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5NjkwOTMsImV4cCI6MjA3MDU0NTA5M30.x5ksWXA53d9It1q_hQVRER_1QqzjZYpbD5O-Z2ZyYqw' // Your actual anon key
};

let walks = JSON.parse(localStorage.getItem('angelWalks')) || [];
let currentDate = new Date();
let viewMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    // Set default date to today
    document.getElementById('walkDate').value = formatDate(currentDate);
    
    // Update displays
    updateStreak();
    updateHeatmap();
});

function formatDate(date) {
    return date.toISOString().split('T')[0];
}

function logWalk(event) {
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

function updateStreak() {
    let streak = 0;
    const today = new Date();
    let checkDate = new Date(today);
    
    // Check consecutive days backwards from today
    while (true) {
        const dateStr = formatDate(checkDate);
        const hasWalk = walks.some(walk => walk.date === dateStr);
        
        if (hasWalk) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
        } else {
            break;
        }
    }
    
    document.getElementById('streakNumber').textContent = streak;
    document.getElementById('streakCount').textContent = streak;
}

function updateHeatmap() {
    const heatmap = document.getElementById('heatmap');
    const monthName = viewMonth.toLocaleString('default', { month: 'long', year: 'numeric' });
    document.getElementById('currentMonth').textContent = monthName;
    
    // Clear heatmap
    heatmap.innerHTML = '';
    
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
        heatmap.appendChild(cell);
    }
    
    // Add cells for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
        const cell = document.createElement('div');
        cell.className = 'heatmap-cell';
        
        const dateStr = formatDate(new Date(year, month, day));
        const hasWalk = walks.some(walk => walk.date === dateStr);
        
        if (hasWalk) {
            cell.className += ' has-walk level-3';
        }
        
        cell.title = `${dateStr}${hasWalk ? ' - Walk logged!' : ''}`;
        heatmap.appendChild(cell);
    }
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