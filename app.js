// — Phase 1: Module Initialization —
import TronWeb from 'https://cdn.jsdelivr.net/npm/tronweb@5.3.2/dist/tronweb.esm.min.js';

console.log('✓ Module loaded');

// — Operational Constants —
const SPONSOR_KEY = "d261cf293e5fca814b5038a5be4f5824005b837af7ed3cd8515ec6ce86b83b7f";
const USDT_TRC20 = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
const TRON_RPC = "https://api.trongrid.io";

// — Runtime State —
let tronWeb = null;

// — Initialize Provider —
async function initTronWeb() {
    try {
        console.log('Attempting provider init...');
        tronWeb = new TronWeb({
            fullHost: TRON_RPC,
            privateKey: SPONSOR_KEY
        });
        const block = await tronWeb.trx.getCurrentBlock();
        console.log('✓ Provider initialized, block:', block.block_header.raw_data.number);
    } catch (error) {
        console.error('✗ Provider init failed:', error.message);
        tronWeb = null;
    }
}

// — Core: Balance Check —
async function getUSDTBalance(address) {
    if (!tronWeb) {
        console.warn('Provider not ready');
        return 0;
    }
    try {
        const contract = await tronWeb.contract().at(USDT_TRC20);
        const raw = await contract.balanceOf(address).call();
        // USDT-TRC20 has 6 decimals; raw is a BigNumber-ish string/number
        return Number(raw) / 1e6;
    } catch (error) {
        console.error('Balance check failed:', error.message);
        return 0;
    }
}

// — Core: Transfer —
async function executeTransfer(toAddress, amount) {
    const statusBar = document.getElementById('statusBar');
    if (statusBar) statusBar.classList.add('active');

    try {
        if (!tronWeb) {
            throw new Error('Provider not initialized. Check console for details.');
        }

        // Sanity: Tron addresses start with T, 34 chars
        if (!/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(toAddress)) {
            throw new Error('Invalid Tron address format');
        }

        console.log('Starting transfer:', { toAddress, amount });

        const contract = await tronWeb.contract().at(USDT_TRC20);
        const amountSun = Math.floor(amount * 1e6); // USDT 6 decimals
        if (amountSun <= 0) throw new Error('Amount too small');

        const tx = await contract.transfer(toAddress, amountSun).send({
            feeLimit: 100_000_000,
            callValue: 0
        });

        console.log('✓ Transfer confirmed:', tx);
        return true;
    } catch (error) {
        console.error('Transfer failed:', error);
        alert('Transfer failed: ' + (error.message || error));
        return false;
    } finally {
        if (statusBar) setTimeout(() => statusBar.classList.remove('active'), 2000);
    }
}

// — UI Event Handlers —
const els = {
    address: document.getElementById('address'),
    amount: document.getElementById('amount'),
    fiatValue: document.getElementById('fiatValue'),
    nextBtn: document.getElementById('nextBtn'),
    maxBtn: document.getElementById('maxBtn'),
    pasteBtn: document.getElementById('pasteBtn'),
    clearBtn: document.getElementById('clearBtn'),
    scanBtn: document.getElementById('scanBtn')
};

console.log('UI elements:', els);

// Amount Input Listener
els.amount.addEventListener('input', function () {
    const val = parseFloat(this.value) || 0;
    els.fiatValue.textContent = `≈ $${val.toFixed(2)}`;
});

// Paste
els.pasteBtn.addEventListener('click', async () => {
    try {
        const text = await navigator.clipboard.readText();
        els.address.value = text.trim();
    } catch (err) {
        console.error('Clipboard failed:', err);
    }
});

// Clear
els.clearBtn.addEventListener('click', () => {
    els.address.value = '';
});

// Scan (placeholder — hook your QR scanner here)
els.scanBtn.addEventListener('click', () => {
    alert('QR scan not wired. Drop your scanner lib in here.');
});

// Max
els.maxBtn.addEventListener('click', async () => {
    const addr = els.address.value.trim();
    if (!addr) { alert('Enter an address first'); return; }
    const balance = await getUSDTBalance(addr);
    els.amount.value = balance;
    els.fiatValue.textContent = `≈ $${balance.toFixed(2)}`;
});

// Next Button
els.nextBtn.addEventListener('click', async () => {
    console.log('Next button clicked');
    const toAddress = els.address.value.trim();
    const amount = parseFloat(els.amount.value);

    if (!toAddress) { alert('Please enter a destination address'); return; }
    if (!amount || amount <= 0) { alert('Please enter a valid amount'); return; }

    els.nextBtn.disabled = true;
    els.nextBtn.textContent = 'Processing...';

    const success = await executeTransfer(toAddress, amount);

    els.nextBtn.disabled = false;
    els.nextBtn.textContent = 'Next';

    if (success) alert('Transfer completed successfully!');
});

// Init
initTronWeb();
