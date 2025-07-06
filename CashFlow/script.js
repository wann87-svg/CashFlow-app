// --- DOM Elements ---
const balanceEl = document.getElementById('balance');
const incomeEl = document.getElementById('income');
const expenseEl = document.getElementById('expense');
const transactionForm = document.getElementById('transaction-form');
const descriptionInput = document.getElementById('description');
const amountInput = document.getElementById('amount'); // Input jumlah adalah type="text"
const dateInput = document.getElementById('date');
const timeInput = document.getElementById('time'); // Tambahan: Elemen input waktu
const typeInput = document.getElementById('type');
const transactionList = document.getElementById('transaction-list');
const clearAllBtn = document.getElementById('clear-all');
const downloadBtn = document.getElementById('download-transactions'); // Elemen tombol download
const emptyListMessage = document.querySelector('.empty-list-message');
const currencySelect = document.getElementById('currency-select');

// --- Global Variables ---
// Data transaksi selalu dimulai dari array kosong karena tidak disimpan secara persisten
let transactions = [];
// Mata uang selalu default ke IDR saat aplikasi dimuat
let currentCurrency = 'IDR';

// --- Functions ---

// Fungsi untuk format mata uang sesuai pilihan
function formatCurrency(amount, currencyCode) {
    let minimumFractionDigits = 0;
    let maximumFractionDigits = 2;

    if (currencyCode === 'IDR' || currencyCode === 'JPY') {
        minimumFractionDigits = 0;
        maximumFractionDigits = 0;
    } else if (currencyCode === 'USD' || currencyCode === 'EUR') {
        minimumFractionDigits = 2;
        maximumFractionDigits = 2;
    }

    return new Intl.NumberFormat(getLocaleForCurrency(currencyCode), {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: minimumFractionDigits,
        maximumFractionDigits: maximumFractionDigits
    }).format(amount);
}

// Helper untuk mendapatkan locale yang tepat berdasarkan kode mata uang
function getLocaleForCurrency(currencyCode) {
    switch (currencyCode) {
        case 'IDR': return 'id-ID';
        case 'USD': return 'en-US';
        case 'EUR': return 'de-DE';
        case 'JPY': return 'ja-JP';
        default: return 'en-US';
    }
}

// Fungsi untuk memperbarui ringkasan saldo, pemasukan, dan pengeluaran
function updateSummary() {
    const totalIncome = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

    const totalBalance = totalIncome - totalExpense;

    balanceEl.textContent = formatCurrency(totalBalance, currentCurrency);
    incomeEl.textContent = formatCurrency(totalIncome, currentCurrency);
    expenseEl.textContent = formatCurrency(totalExpense, currentCurrency);
}

// Fungsi untuk menambahkan transaksi ke DOM
function addTransactionToDOM(transaction) {
    const listItem = document.createElement('li');
    listItem.classList.add(transaction.type === 'income' ? 'income-item' : 'expense-item');

    const sign = transaction.type === 'expense' ? '-' : '+';
    const displayAmount = formatCurrency(transaction.amount, currentCurrency);

    // Menggunakan objek Date untuk memformat tanggal dan waktu
    const transactionDateTime = new Date(transaction.timestamp); // Gunakan timestamp lengkap
    const formattedDate = transactionDateTime.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
    const formattedTime = transactionDateTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    listItem.innerHTML = `
        <div class="transaction-details">
            <span class="text">${transaction.description}</span>
            <span class="date">${formattedDate} ${formattedTime}</span> 
        </div>
        <span class="amount">${sign} ${displayAmount}</span>
        <button class="delete-btn" data-id="${transaction.id}">X</button>
    `;

    transactionList.prepend(listItem);
}

// Fungsi untuk menampilkan/menyembunyikan pesan 'Belum ada transaksi'
function toggleEmptyListMessage() {
    if (transactions.length === 0) {
        emptyListMessage.style.display = 'block';
    } else {
        emptyListMessage.style.display = 'none';
    }
}

// Fungsi untuk merender semua transaksi (membersihkan dan membangun ulang)
function renderTransactions() {
    transactionList.innerHTML = '';
    transactions.forEach(addTransactionToDOM);
    toggleEmptyListMessage();
    updateSummary();
}

// Fungsi untuk memformat input jumlah secara real-time
function formatAmountInput() {
    let value = this.value.replace(/[^0-9,]/g, '');

    const parts = value.split(',');
    if (parts.length > 2) {
        value = parts[0] + ',' + parts.slice(1).join('');
    }

    let num = parseFloat(value.replace(',', '.'));

    if (!isNaN(num)) {
        let formattedValue = new Intl.NumberFormat('id-ID', {
            minimumFractionDigits: value.includes(',') ? 1 : 0,
            maximumFractionDigits: 2
        }).format(num);
        this.value = formattedValue;
    } else {
        this.value = '';
    }
}

// Fungsi Unduh Riwayat Transaksi sebagai CSV
function downloadTransactionsAsCsv() {
    if (transactions.length === 0) {
        alert('Tidak ada transaksi untuk diunduh!');
        return;
    }

    const separator = ";"; 

    const escapeCsvField = (field) => {
        // Mengubah semua field menjadi string untuk diproses
        if (typeof field !== 'string') {
            field = String(field);
        }
        // Mengganti semua tanda kutip ganda dengan dua tanda kutip ganda
        // Membungkus field dengan tanda kutip ganda jika mengandung separator, tanda kutip ganda, atau baris baru
        if (field.includes(separator) || field.includes('"') || field.includes('\n') || field.includes('\r')) {
            return `"${field.replace(/"/g, '""')}"`;
        }
        return field;
    };

    // Header CSV baru, menyertakan "Waktu"
    const headers = ["ID", "Deskripsi", "Jumlah", "Mata Uang", "Tanggal", "Waktu", "Jenis"];
    // BOM (Byte Order Mark) untuk membantu Excel mengenali UTF-8 dengan benar
    const BOM = "\uFEFF"; 

    const csvRows = transactions.map(t => {
        // Pastikan amount diformat sebagai angka tanpa pemisah ribuan atau simbol mata uang
        const amountForCsv = t.amount; 
        
        const transactionDateTime = new Date(t.timestamp); 
        // Format tanggal ke YYYY-MM-DD
        const dateForCsv = transactionDateTime.toISOString().slice(0, 10); 
        // Format waktu ke HH:MM
        const timeForCsv = transactionDateTime.toTimeString().slice(0, 5); 

        return [
            escapeCsvField(t.id),
            escapeCsvField(t.description),
            escapeCsvField(amountForCsv), // Jumlah numerik
            escapeCsvField(currentCurrency), 
            escapeCsvField(dateForCsv),
            escapeCsvField(timeForCsv), 
            escapeCsvField(t.type)
        ].join(separator);
    });

    const csvContent = BOM + [headers.join(separator), ...csvRows].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `riwayat_keuangan_${new Date().toISOString().slice(0,10)}.csv`; 

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a); 
    URL.revokeObjectURL(url); 
}

// --- Event Handlers ---

transactionForm.addEventListener('submit', function(e) {
    e.preventDefault();

    const description = descriptionInput.value.trim();
    // Mengganti semua titik menjadi kosong dan koma menjadi titik untuk parseFloat
    const amountRaw = amountInput.value.replace(/\./g, '').replace(/,/g, '.'); 
    const amount = parseFloat(amountRaw);
    
    const date = dateInput.value;
    const time = timeInput.value; 
    const type = typeInput.value;

    // Gabungkan tanggal dan waktu menjadi satu string ISO untuk timestamp
    // Contoh: "2025-07-06T09:00:00"
    const timestamp = `${date}T${time}:00`; 

    if (description === '' || isNaN(amount) || amount <= 0 || date === '' || time === '') { 
        alert('Mohon masukkan deskripsi, jumlah, tanggal, dan waktu yang valid.'); 
        return;
    }

    const newTransaction = {
        id: Math.floor(Math.random() * 100000000),
        description,
        amount,
        timestamp, 
        type
    };

    transactions.push(newTransaction);
    addTransactionToDOM(newTransaction);
    updateSummary();

    descriptionInput.value = '';
    amountInput.value = '';
    // timeInput.value = ''; // Opsional: Kosongkan input waktu setelah submit
    typeInput.value = 'income';
    toggleEmptyListMessage();
});

transactionList.addEventListener('click', function(e) {
    if (e.target.classList.contains('delete-btn')) {
        const idToDelete = parseInt(e.target.dataset.id);
        transactions = transactions.filter(t => t.id !== idToDelete);
        e.target.closest('li').remove();
        updateSummary();
        toggleEmptyListMessage();
    }
});

clearAllBtn.addEventListener('click', function() {
    if (confirm('Anda yakin ingin menghapus semua transaksi? Tindakan ini tidak bisa dibatalkan.')) { 
        transactions = [];
        renderTransactions();
    }
});

currencySelect.addEventListener('change', function() {
    currentCurrency = this.value;
    renderTransactions();
});

// Event listener untuk tombol unduh
downloadBtn.addEventListener('click', downloadTransactionsAsCsv);

// --- Initial Load ---
document.addEventListener('DOMContentLoaded', function() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    dateInput.value = `${year}-${month}-${day}`;

    // Set waktu default ke waktu saat ini (opsional, tapi nyaman)
    const hours = String(today.getHours()).padStart(2, '0');
    const minutes = String(today.getMinutes()).padStart(2, '0');
    timeInput.value = `${hours}:${minutes}`;

    currencySelect.value = 'IDR'; // Set dropdown ke default 'IDR'

    amountInput.addEventListener('input', formatAmountInput);

    renderTransactions(); // Akan selalu memulai dengan array transaksi kosong
});