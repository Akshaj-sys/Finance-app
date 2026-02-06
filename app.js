// --- STATE MANAGEMENT ---
// We use a single object to hold our app state
let appData = {
    expenses: [],
    assets: [],
    liabilities: []
};

const STORAGE_KEY = 'local_finance_v1';

// Load data on startup
function init() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        appData = JSON.parse(stored);
    }
    updateDashboard();
    renderLists();
    
    // Set today's date in expense form
    document.getElementById('exp-date').valueAsDate = new Date();
}

// Save data to browser LocalStorage
function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
    updateDashboard();
    renderLists();
}

// --- CORE LOGIC ---

// 1. Add Item
function addItem(type, item) {
    // Add unique ID based on timestamp
    item.id = Date.now().toString(); 
    appData[type].push(item);
    saveData();
}

// 2. Delete Item
function deleteItem(type, id) {
    if(confirm('Delete this entry?')) {
        appData[type] = appData[type].filter(i => i.id !== id);
        saveData();
    }
}

// 3. Calculation & Dashboard
function updateDashboard() {
    // Calculate totals
    const totalAssets = appData.assets.reduce((sum, item) => sum + parseFloat(item.value), 0);
    const totalLiabilities = appData.liabilities.reduce((sum, item) => sum + parseFloat(item.amount), 0);
    
    // Filter expenses for current month
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const monthlyExpenses = appData.expenses.reduce((sum, item) => {
        const d = new Date(item.date);
        if(d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
            return sum + parseFloat(item.amount);
        }
        return sum;
    }, 0);

    const netWorth = totalAssets - totalLiabilities;

    // Update UI
    document.getElementById('total-assets').innerText = formatMoney(totalAssets);
    document.getElementById('total-liabilities').innerText = formatMoney(totalLiabilities);
    document.getElementById('total-expenses').innerText = formatMoney(monthlyExpenses);
    document.getElementById('net-worth-display').innerText = `Net Worth: ${formatMoney(netWorth)}`;
}

function formatMoney(num) {
    return '$' + num.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
}

// --- UI HANDLING ---

// Navigation Tabs
function showSection(id) {
    document.querySelectorAll('section').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('section').forEach(el => el.classList.remove('active-section'));
    document.getElementById(id).classList.remove('hidden');
    document.getElementById(id).classList.add('active-section');
    
    // Update active button state
    document.querySelectorAll('nav button').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
}

// Render Lists (Expenses, Assets, Liabilities)
function renderLists() {
    renderList('expenses', 'expense-list', (item) => `
        <div class="list-info">
            <div><strong>${item.category}</strong> <small>${item.date}</small></div>
            <div>${item.note || ''}</div>
        </div>
        <div class="right-side">
            <span class="list-amount">$${parseFloat(item.amount).toFixed(2)}</span>
            <button class="delete-btn" onclick="deleteItem('expenses', '${item.id}')">X</button>
        </div>
    `);

    renderList('assets', 'asset-list', (item) => `
        <div class="list-info">
            <div><strong>${item.name}</strong></div>
            <div><small>${item.type}</small></div>
        </div>
        <div class="right-side">
            <span class="list-amount" style="color:green">$${parseFloat(item.value).toFixed(2)}</span>
            <button class="delete-btn" onclick="deleteItem('assets', '${item.id}')">X</button>
        </div>
    `);

    renderList('liabilities', 'liability-list', (item) => `
        <div class="list-info">
            <div><strong>${item.name}</strong></div>
            <div><small>${item.type}</small></div>
        </div>
        <div class="right-side">
            <span class="list-amount" style="color:red">$${parseFloat(item.amount).toFixed(2)}</span>
            <button class="delete-btn" onclick="deleteItem('liabilities', '${item.id}')">X</button>
        </div>
    `);
}

function renderList(dataType, elementId, templateFn) {
    const container = document.getElementById(elementId);
    container.innerHTML = '';
    // Sort by most recent (assuming ID is timestamp or date field exists)
    const sorted = [...appData[dataType]].sort((a, b) => b.id - a.id);
    
    sorted.forEach(item => {
        const div = document.createElement('div');
        div.className = 'list-item';
        div.innerHTML = templateFn(item);
        container.appendChild(div);
    });
}

// --- FORM EVENT LISTENERS ---

document.getElementById('expense-form').addEventListener('submit', (e) => {
    e.preventDefault();
    addItem('expenses', {
        date: document.getElementById('exp-date').value,
        category: document.getElementById('exp-category').value,
        amount: document.getElementById('exp-amount').value,
        note: document.getElementById('exp-note').value
    });
    e.target.reset();
    document.getElementById('exp-date').valueAsDate = new Date(); // Reset date to today
});

document.getElementById('asset-form').addEventListener('submit', (e) => {
    e.preventDefault();
    addItem('assets', {
        name: document.getElementById('asset-name').value,
        type: document.getElementById('asset-type').value,
        value: document.getElementById('asset-value').value
    });
    e.target.reset();
});

document.getElementById('liability-form').addEventListener('submit', (e) => {
    e.preventDefault();
    addItem('liabilities', {
        name: document.getElementById('lia-name').value,
        type: document.getElementById('lia-type').value,
        amount: document.getElementById('lia-amount').value
    });
    e.target.reset();
});

// --- CSV IMPORT / EXPORT LOGIC ---

// Convert Array of Objects to CSV String
function arrayToCSV(arr) {
    if (arr.length === 0) return '';
    const headers = Object.keys(arr[0]).join(','); // Get headers from first object
    const rows = arr.map(obj => {
        return Object.values(obj).map(val => {
            // Escape quotes and wrap in quotes to handle commas within data
            const stringVal = String(val).replace(/"/g, '""'); 
            return `"${stringVal}"`;
        }).join(',');
    });
    return [headers, ...rows].join('\n');
}

// Parse CSV String to Array of Objects
function csvToArray(str) {
    const rows = str.trim().split('\n');
    if (rows.length < 2) return [];
    
    const headers = rows[0].split(',');
    const data = rows.slice(1).map(row => {
        // Complex regex to handle commas inside quotes
        const values = row.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || []; 
        
        let obj = {};
        headers.forEach((header, index) => {
            let val = values[index] ? values[index].replace(/^"|"$/g, '').replace(/""/g, '"') : '';
            obj[header] = val;
        });
        return obj;
    });
    return data;
}

function exportCSV(type) {
    const data = appData[type];
    if (data.length === 0) return alert('No data to export.');
    
    // Create CSV content
    const csvContent = arrayToCSV(data);
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    // Create download link
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

function importCSV(input, type) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        try {
            const parsedData = csvToArray(text);
            if(parsedData.length > 0) {
                // Merge data: Filter out IDs that already exist to avoid duplicates, or just append?
                // For simplicity in this local app, we append and give new IDs if ID conflict, 
                // but usually user imports a clean backup. Let's replace the list or append.
                // Decision: Append.
                
                parsedData.forEach(item => {
                    // Generate new ID to ensure no conflicts on import
                    item.id = Date.now().toString() + Math.random().toString().slice(2,5);
                    appData[type].push(item);
                });
                
                saveData();
                alert(`Successfully imported ${parsedData.length} items into ${type}.`);
                input.value = ''; // Reset file input
            }
        } catch (err) {
            alert('Error parsing CSV. Ensure format is correct.');
            console.error(err);
        }
    };
    reader.readAsText(file);
}

function clearAllData() {
    if(confirm("ARE YOU SURE? This will delete all your local data.")) {
        localStorage.removeItem(STORAGE_KEY);
        appData = { expenses: [], assets: [], liabilities: [] };
        updateDashboard();
        renderLists();
    }
}

// Start App
init();
