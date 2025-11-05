// Export/Import functionality
const exportBtn = document.getElementById('export-btn');
const importBtn = document.getElementById('import-btn');
const importInput = document.getElementById('import-input');

if (exportBtn) {
    exportBtn.addEventListener('click', function() {
        const data = localStorage.getItem('schedules') || '[]';
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'schedules.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
}

if (importBtn && importInput) {
    importBtn.addEventListener('click', function() {
        importInput.click();
    });
    importInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(evt) {
            try {
                const imported = JSON.parse(evt.target.result);
                if (Array.isArray(imported)) {
                    localStorage.setItem('schedules', JSON.stringify(imported));
                    loadSchedules();
                } else {
                    alert('Invalid file format.');
                }
            } catch {
                alert('Could not import file.');
            }
        };
        reader.readAsText(file);
        importInput.value = '';
    });
}
// Simple schedule app using localStorage
const form = document.getElementById('schedule-form');
const nameInput = document.getElementById('name');
const tableBody = document.querySelector('#availability-table tbody');
const tableHeaderRow = document.getElementById('table-header-row');
const timeslotsGrid = document.getElementById('timeslots-grid');

// Define time slots (Mon-Sun, 6pm-11pm)
const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const hours = ['4pm', '5pm', '6pm', '7pm', '8pm', '9pm', '10pm', '11pm', '12am', '1am'];
const timeslots = [];
days.forEach(day => {
    hours.forEach(hour => {
        timeslots.push(`${day} ${hour}`);
    });
});

// Cycle states: 0 = blue check, 1 = red X, 2 = question mark
const CYCLE_EMOJIS = ['✅', '❌', '❓'];
function getDefaultSlotStates() {
    const obj = {};
    timeslots.forEach(slot => { obj[slot] = 0; });
    return obj;
}

function renderTimeslotsGrid(selectedStates = {}) {
    timeslotsGrid.innerHTML = '';
    const table = document.createElement('table');
    let row = document.createElement('tr');
    days.forEach(day => {
        const th = document.createElement('th');
        th.textContent = day;
        th.colSpan = hours.length;
        row.appendChild(th);
    });
    table.appendChild(row);
    row = document.createElement('tr');
    days.forEach(day => {
        hours.forEach(hour => {
            const th = document.createElement('th');
            th.textContent = hour;
            row.appendChild(th);
        });
    });
    table.appendChild(row);
    row = document.createElement('tr');
    timeslots.forEach(slot => {
        const td = document.createElement('td');
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'cycle-slot-btn';
        let state = selectedStates[slot] ?? 0;
        btn.textContent = CYCLE_EMOJIS[state];
        btn.dataset.slot = slot;
        btn.dataset.state = state;
        btn.style.fontSize = '1.2em';
        btn.style.background = 'none';
        btn.style.border = 'none';
        btn.style.cursor = 'pointer';
        btn.addEventListener('click', function() {
            let newState = (parseInt(this.dataset.state) + 1) % 3;
            this.dataset.state = newState;
            this.textContent = CYCLE_EMOJIS[newState];
        });
        td.appendChild(btn);
        row.appendChild(td);
    });
    table.appendChild(row);
    timeslotsGrid.appendChild(table);
}

function loadSchedules() {
    const schedules = JSON.parse(localStorage.getItem('schedules') || '[]');
    // Find common available slots (all users have blue check, state 0)
    let commonSlots = timeslots.filter(slot =>
        schedules.length > 0 && schedules.every(user => {
            if (!user.slots) return false;
            // If using old array format, treat as available if included
            if (Array.isArray(user.slots)) return user.slots.includes(slot);
            // New object format: state 0 is blue check
            return user.slots[slot] === 0;
        })
    );
    const commonDiv = document.getElementById('common-availability');
    if (commonDiv) {
        if (commonSlots.length > 0) {
            commonDiv.textContent = 'Everyone is available at: ' + commonSlots.join(', ');
        } else {
            commonDiv.textContent = 'No time works for everyone.';
        }
    }
    // Render header
    tableHeaderRow.innerHTML = '<th>Name</th>' + timeslots.map(slot => `<th>${slot}</th>`).join('') + '<th>Action</th>';
    // Render body
    tableBody.innerHTML = '';
    schedules.forEach(({ name, slots }, idx) => {
        const row = document.createElement('tr');
        row.innerHTML = `<td>${name}</td>` +
            timeslots.map(slot => {
                let state = (slots && typeof slots[slot] !== 'undefined') ? slots[slot] : 0;
                return `<td style="text-align:center;">${CYCLE_EMOJIS[state]}</td>`;
            }).join('') +
            `<td><button class="clear-user-btn" data-idx="${idx}" style="padding:2px 8px; font-size:0.9em;">Clear</button></td>`;
        tableBody.appendChild(row);
    });
    // Add event listeners for clear buttons
    document.querySelectorAll('.clear-user-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            const idx = parseInt(this.getAttribute('data-idx'));
            let schedules = JSON.parse(localStorage.getItem('schedules') || '[]');
            schedules.splice(idx, 1);
            localStorage.setItem('schedules', JSON.stringify(schedules));
            loadSchedules();
        });
    });
}

form.addEventListener('submit', function(e) {
    e.preventDefault();
    const name = nameInput.value.trim();
    if (!name) return;
    // Get slot states
    const slotStates = {};
    timeslotsGrid.querySelectorAll('.cycle-slot-btn').forEach(btn => {
        slotStates[btn.dataset.slot] = parseInt(btn.dataset.state);
    });
    // If all are default, don't save
    if (Object.values(slotStates).every(v => v === 0)) return;
    let schedules = JSON.parse(localStorage.getItem('schedules') || '[]');
    // Update if name exists, else add
    const idx = schedules.findIndex(s => s.name.toLowerCase() === name.toLowerCase());
    if (idx >= 0) {
        schedules[idx].slots = slotStates;
    } else {
        schedules.push({ name, slots: slotStates });
    }
    localStorage.setItem('schedules', JSON.stringify(schedules));
    loadSchedules();
    form.reset();
    renderTimeslotsGrid(getDefaultSlotStates());
});

// When user types their name, prefill their slots if they exist
nameInput.addEventListener('input', function() {
    const name = nameInput.value.trim();
    let schedules = JSON.parse(localStorage.getItem('schedules') || '[]');
    const user = schedules.find(s => s.name.toLowerCase() === name.toLowerCase());
    renderTimeslotsGrid(user ? user.slots : getDefaultSlotStates());
});

// Initial load
renderTimeslotsGrid();
loadSchedules();
