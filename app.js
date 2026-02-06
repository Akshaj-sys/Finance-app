/* LOCAL FINANCE TRACKER - LOGIC ENGINE
   Currency: Indian Rupee (₹)
   Storage: Browser LocalStorage
*/

// --- STATE MANAGEMENT ---
let appData = {
    expenses: [],
    assets: [],
    liabilities: []
};

const STORAGE_KEY = 'local_finance_v1';

// Initialize App
function init() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        appData = JSON.parse(stored);
    }
    updateDashboard();
    renderLists();
    
    // Set today's date in expense form
    if(document.getElementById('exp-date')) {
        document.getElementById('exp-date').valueAsDate = new Date();
    }
}

// Save data to browser LocalStorage
function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
    updateDashboard();
    renderLists();
}

// --- CURRENCY FORMATTING (Indian System) ---
function formatMoney(num) {
    return '₹' + Number(num).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// --- CORE LOGIC ---

function addItem(type, item) {
    item.id = Date.now().toString(); 
    appData[type].push(item);
    saveData();
}

function deleteItem(type, id) {
    if(confirm('Delete this entry?')) {
        appData[type] = appData[type].filter(i => i.id !== id);
        saveData();
    }
}

function updateDashboard() {
    const totalAssets = appData.assets.reduce((sum, item) => sum + parseFloat(item.value || 0), 0);
    const totalLiabilities = appData.liabilities.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const monthlyExpenses = appData.expenses.reduce((sum, item) => {
        const d = new Date(item.date);
        if(d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
            return sum + parseFloat(item.amount || 0);
        }
        return sum;
    }, 0);

    const netWorth = totalAssets - totalLiabilities;

    // Update Dashboard UI
    document.getElementById('total-assets').innerText = formatMoney(totalAssets);
    document.getElementById('total-liabilities').innerText = formatMoney(totalLiabilities);
    document.getElementById('total-expenses').innerText = formatMoney(monthlyExpenses);
    document.getElementById('net-worth-display').innerText = `Net Worth: ${formatMoney(netWorth)}`;
}

// --- UI HANDLING ---

function showSection(id) {
    document.querySelectorAll('section').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('section').forEach(el => el.classList.remove('active-section'));
    document.getElementById(id).classList.remove('hidden');
    document.getElementById(id).classList.add('active-section');
    
    document.querySelectorAll('nav button').forEach(btn => btn.classList.remove('active'));
    if (event && event.target) {
        event.target.classList.add('active');
    }
}

function renderLists() {
    // Render Expenses
    renderList('expenses', 'expense-list', (item) => `
        <div class="list-info">
            <div><strong>${item.category}</strong> <small>${item.date}</small></div>
            <div>${item.note || ''}</div>
        </div>
        <div class="right-side">
            <span class="list-amount">${formatMoney(item.amount)}</span>
            <button class="delete-btn" onclick="deleteItem('expenses', '${item.id}')">X</button>
        </div>
    `);

    // Render Assets
    renderList('assets', 'asset-list', (item) => `
        <div class="list-info">
            <div><strong>${item.name}</strong></div>
            <div><small>${item.type}</small></div>
        </div>
        <div class="right-side">
            <span class="list-amount" style="color:green">${formatMoney(item.value)}</span>
            <button class="delete-btn" onclick="deleteItem('assets', '${item.id}')">X</button>
        </div>
    `);

    // Render Liabilities
    renderList('liabilities', 'liability-list', (item) => `
        <div class="list-info">
            <div><strong>${item.name}</strong></div>
            <div><small>${item.type}</small></div>
        </div>
        <div class="right-side">
            <span class="list-amount" style="color:red">${formatMoney(item.amount)}</span>
            <button class="delete-btn" onclick="deleteItem('liabilities', '${item.id}')">X</button>
        </div>
    `);
}

function renderList(dataType, elementId, templateFn) {
    const container = document.getElementById(elementId);
    if(!container) return;
    container.innerHTML = '';
    const sorted = [...appData[dataType]].sort((a, b) => b.id - a.id);
    
    sorted.forEach(item => {
        const div = document.createElement('div');
        div.className = 'list-item';
        div.innerHTML = templateFn(item);
        container.appendChild(div);
    });
}

// --- EVENT LISTENERS ---

document.getElementById('expense-form').addEventListener('submit', (e) => {
    e.preventDefault();
    addItem('expenses', {
        date: document.getElementById('exp-date').value,
        category: document.getElementById('exp-category').value,
        amount: document.getElementById('exp-amount').value,
        note: document.getElementById('exp-note').value
    });
    e.target.reset();
    document.getElementById('exp-date').valueAsDate = new Date();
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

// --- CSV IMPORT / EXPORT ---

function arrayToCSV(arr) {
    if (arr.length === 0) return '';
    const headers = Object.keys(arr[0]).join(',');
    const rows = arr.map(obj => {
        return Object.values(obj).map(val => `"${String(val).replace(/"/g, '""')}"`).join(',');
    });
    return [headers, ...rows].join('\n');
}

function csvToArray(str) {
    const rows = str.trim().split('\n');
    if (rows.length < 2) return [];
    const headers = rows[0].split(',');
    return rows.slice(1).map(row => {
        const values = row.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || []; 
        let obj = {};
        headers.forEach((header, index) => {
            obj[header] = values[index] ? values[index].replace(/^"|"$/g, '').replace(/""/g, '"') : '';
        });
        return obj;
    });
}

function exportCSV(type) {
    const csvContent = arrayToCSV(appData[type]);
    if (!csvContent) return alert('No data to export.');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}_export.csv`;
    a.click();
}

function importCSV(input, type) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const parsedData = csvToArray(e.target.result);
        parsedData.forEach(item => {
            item.id = Date.now().toString() + Math.random().toString().slice(2,5);
            appData[type].push(item);
        });
        saveData();
        alert('Import Successful!');
    };
    reader.readAsText(input.files[0]);
}

function clearAllData() {
    if(confirm("Wipe all data?")) {
        localStorage.removeItem(STORAGE_KEY);
        location.reload();
    }
}

init();
