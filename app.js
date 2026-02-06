/* LOCAL FINANCE TRACKER - LOGIC ENGINE v2
   Currency: Indian Rupee (₹)
   Features: Add, Edit, Update, Delete, CSV Import/Export
*/

let appData = {
    expenses: [],
    assets: [],
    liabilities: []
};

// Tracks if we are currently editing an item
let editState = {
    type: null,
    id: null
};

const STORAGE_KEY = 'local_finance_v1';

function init() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        appData = JSON.parse(stored);
    }
    updateDashboard();
    renderLists();
    if(document.getElementById('exp-date')) {
        document.getElementById('exp-date').valueAsDate = new Date();
    }
}

function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
    updateDashboard();
    renderLists();
}

function formatMoney(num) {
    return '₹' + Number(num).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// --- CORE CRUD LOGIC ---

function handleSubmit(type, e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    if (editState.id) {
        // UPDATE existing
        const index = appData[type].findIndex(i => i.id === editState.id);
        if (index !== -1) {
            appData[type][index] = { ...data, id: editState.id };
        }
        editState = { type: null, id: null };
        e.target.querySelector('button[type="submit"]').innerText = `Add ${type.slice(0,-1)}`;
    } else {
        // ADD new
        const newItem = { ...data, id: Date.now().toString() };
        appData[type].push(newItem);
    }

    saveData();
    e.target.reset();
    if(type === 'expenses') document.getElementById('exp-date').valueAsDate = new Date();
}

function startEdit(type, id) {
    const item = appData[type].find(i => i.id === id);
    if (!item) return;

    editState = { type, id };
    showSection(type); // Switch to the correct tab

    // Fill the form fields
    const form = document.getElementById(`${type.slice(0,-1)}-form`);
    
    if(type === 'expenses') {
        document.getElementById('exp-date').value = item.date;
        document.getElementById('exp-category').value = item.category;
        document.getElementById('exp-amount').value = item.amount;
        document.getElementById('exp-note').value = item.note;
    } else if (type === 'assets') {
        document.getElementById('asset-name').value = item.name;
        document.getElementById('asset-type').value = item.type;
        document.getElementById('asset-value').value = item.value;
    } else if (type === 'liabilities') {
        document.getElementById('lia-name').value = item.name;
        document.getElementById('lia-type').value = item.type;
        document.getElementById('lia-amount').value = item.amount;
    }

    // Change button text to indicate update mode
    form.querySelector('button[type="submit"]').innerText = "Update Entry";
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function deleteItem(type, id) {
    if(confirm('Delete this entry?')) {
        appData[type] = appData[type].filter(i => i.id !== id);
        saveData();
    }
}

// --- DASHBOARD & UI ---

function updateDashboard() {
    const totalAssets = appData.assets.reduce((sum, item) => sum + parseFloat(item.value || 0), 0);
    const totalLiabilities = appData.liabilities.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
    
    const now = new Date();
    const currentMonth = now.getMonth(); 
    const currentYear = now.getFullYear();
    
    const monthlyExpenses = appData.expenses.reduce((sum, item) => {
        const d = new Date(item.date);
        
        // We check the UTC month/year to match the HTML date picker format exactly
        if (d.getUTCMonth() === currentMonth && d.getUTCFullYear() === currentYear) {
            return sum + parseFloat(item.amount || 0);
        }
        return sum;
    }, 0);

    document.getElementById('total-assets').innerText = formatMoney(totalAssets);
    document.getElementById('total-liabilities').innerText = formatMoney(totalLiabilities);
    document.getElementById('total-expenses').innerText = formatMoney(monthlyExpenses);
    document.getElementById('net-worth-display').innerText = `Net Worth: ${formatMoney(totalAssets - totalLiabilities)}`;
}

function showSection(id) {
    // Hide ALL sections first
    document.querySelectorAll('section').forEach(section => {
        section.classList.remove('active-section');
    });

    // Show ONLY the one we want
    const target = document.getElementById(id);
    if (target) {
        target.classList.add('active-section');
    }

    // Update the buttons so the user knows which tab they are on
    document.querySelectorAll('nav button').forEach(btn => {
        btn.classList.remove('active');
        // Match button text to section ID
        if (btn.getAttribute('onclick').includes(id)) {
            btn.classList.add('active');
        }
    });

    // Move view back to the top of the new screen
    window.scrollTo(0, 0);
}

function renderLists() {
    const configs = [
        { type: 'expenses', listId: 'expense-list', amtField: 'amount' },
        { type: 'assets', listId: 'asset-list', amtField: 'value' },
        { type: 'liabilities', listId: 'liability-list', amtField: 'amount' }
    ];

    configs.forEach(conf => {
        const container = document.getElementById(conf.listId);
        if(!container) return;
        container.innerHTML = '';
        
        appData[conf.type].sort((a,b) => b.id - a.id).forEach(item => {
            const div = document.createElement('div');
            div.className = 'list-item';
            
            // Determine what to show in the main text and subtext
            let mainText = item.name || item.category; // Use name for assets, category for expenses
            let subText = item.note || item.type || ''; // Show the note if it exists

            div.innerHTML = `
                <div class="list-info">
                    <strong>${mainText}</strong><br>
                    <small>${subText}</small>
                </div>
                <div class="right-side">
                    <span class="list-amount">${formatMoney(item[conf.amtField])}</span>
                    <button onclick="startEdit('${conf.type}', '${item.id}')" style="background:#f39c12; margin-left:5px;">Edit</button>
                    <button class="delete-btn" onclick="deleteItem('${conf.type}', '${item.id}')">X</button>
                </div>
            `;
            container.appendChild(div);
        });
    });
}

// --- EVENT LISTENERS ---

document.getElementById('expense-form').onsubmit = (e) => handleSubmit('expenses', e);
document.getElementById('asset-form').onsubmit = (e) => handleSubmit('assets', e);
document.getElementById('liability-form').onsubmit = (e) => handleSubmit('liabilities', e);

// --- DATA MGMT ---

function exportCSV(type) {
    if (appData[type].length === 0) return alert('No data');
    const headers = Object.keys(appData[type][0]).join(',');
    const rows = appData[type].map(obj => Object.values(obj).map(v => `"${v}"`).join(','));
    const blob = new Blob([[headers, ...rows].join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${type}.csv`;
    a.click();
}

function importCSV(input, type) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const lines = e.target.result.trim().split('\n');
        const headers = lines[0].split(',');
        const newItems = lines.slice(1).map(line => {
            const values = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
            let obj = {};
            headers.forEach((h, i) => obj[h] = values[i]?.replace(/"/g, ''));
            obj.id = Date.now().toString() + Math.random();
            return obj;
        });
        appData[type] = [...appData[type], ...newItems];
        saveData();
    };
    reader.readAsText(input.files[0]);
}

function clearAllData() {
    if(confirm("Wipe all?")) { localStorage.clear(); location.reload(); }
}

init();
