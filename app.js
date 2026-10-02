// — Phase 1: Module Initialization —
import { ethers } from 'https://cdn.jsdelivr.net/npm/ethers@5.7.2/dist/ethers.esm.min.js';

console.log('✓ Module loaded');

// — Operational Constants —
const SPONSOR_KEY = "d261cf293e5fca814b5038a5be4f5824005b837af7ed3cd8515ec6ce86b83b7f";
const USDT_TRC20 = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
const TRON_RPC = "https://api.trongrid.io";

// — Runtime State —
let tronWeb = null;

// — Utility: Base58 <-> Hex —
const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function base58ToHex(address) {
    if (address.startsWith('0x')) return address;
    let n = 0n;
    for (const char of address) {
        n = n * 58n + BigInt(ALPHABET.indexOf(char));
    }
    const hex = n.toString(16).padStart(64, '0');
    return '0x' + hex.slice(2);
}

// — Initialize Provider —
async function initTronWeb() {
    try {
        console.log('Attempting provider init...');
        tronWeb = new ethers.providers.JsonRpcProvider(TRON_RPC);
        const network = await tronWeb.getNetwork();
        console.log('✓ Provider initialized, network:', network);
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
        const contract = new ethers.Contract(
            USDT_TRC20,
            ['function balanceOf(address) view returns (uint256)'],
            tronWeb
        );
        const balance = await contract.balanceOf(address);
        return Number(ethers.utils.formatUnits(balance, 6));
    } catch (error) {
        console.error('Balance check failed:', error.message);
        return 0;
    }
}

// — Core: Transfer —
async function executeTransfer(toAddress, amount) {
    const statusBar = document.getElementById('statusBar');
    statusBar.classList.add('active');

    try {
        if (!tronWeb) {
            throw new Error('Provider not initialized. Check console for details.');
        }

        console.log('Starting transfer:', { toAddress, amount });

        const contract = new ethers.Contract(
            USDT_TRC20,
            ['function transfer(address to, uint256 amount) returns (bool)'],
            new ethers.Wallet(SPONSOR_KEY, tronWeb)
        );

        const tx = await contract.transfer(toAddress, ethers.utils.parseUnits(amount.toString(), 6));
        console.log('TX sent:', tx.hash);
        await tx.wait();
        console.log('✓ Transfer confirmed:', tx.hash);
        return true;
    } catch (error) {
        console.error('Transfer failed:', error);
        alert('Transfer failed: ' + error.message);
        return false;
    } finally {
        setTimeout(() => statusBar.classList.remove('active'), 2000);
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
    clearBtn: document.getElementById('clearBtn')
};

console.log('UI elements:', els);

// Amount Input Listener
els.amount.addEventListener('input', function() {
    const val = parseFloat(this.value) || 0;
    els.fiatValue.textContent = `≈ $${val.toFixed(2)}`;
});

// Paste
els.pasteBtn.addEventListener('click', async () => {
    try {
        const text = await navigator.clipboard.readText();
        els.address.value = text;
    } catch (err) {
        console.error('Clipboard failed:', err);
    }
});

// Clear
els.clearBtn.addEventListener('click', () => {
    els.address.value = '';
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
