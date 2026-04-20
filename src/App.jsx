import { useState } from "react";
import { requestAccess, signTransaction } from "@stellar/freighter-api";
import {
  TransactionBuilder,
  Networks,
  Operation,
  Asset,
  BASE_FEE,
  Account,
} from "stellar-sdk";

const HORIZON_URL = "https://horizon-testnet.stellar.org";

function App() {
  const [wallet, setWallet] = useState("");
  const [balance, setBalance] = useState("");
  const [loading, setLoading] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [txStatus, setTxStatus] = useState("");
  const [txHash, setTxHash] = useState("");
  const [sending, setSending] = useState(false);

  const fetchBalance = async (publicKey) => {
    const response = await fetch(`${HORIZON_URL}/accounts/${publicKey}`);
    const data = await response.json();
    const xlmBalance = data.balances?.find(b => b.asset_type === "native");
    setBalance(xlmBalance ? xlmBalance.balance : "0");
  };

  const connectWallet = async () => {
    try {
      setLoading(true);
      const result = await requestAccess();
      const publicKey = result.address || result;
      if (!publicKey) return;
      setWallet(publicKey);
      await fetchBalance(publicKey);
    } catch (err) {
      alert("Connection failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const disconnectWallet = () => {
    setWallet("");
    setBalance("");
    setTxStatus("");
    setTxHash("");
  };

  const sendXLM = async () => {
    if (!recipient || !amount) {
      alert("Please enter recipient address and amount!");
      return;
    }
    try {
      setSending(true);
      setTxStatus("⏳ Processing transaction...");
      setTxHash("");

      // Fetch account data
      const accountRes = await fetch(`${HORIZON_URL}/accounts/${wallet}`);
      const accountData = await accountRes.json();

      // Build proper Account object
      const account = new Account(wallet, accountData.sequence);

      // Build transaction
      const transaction = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(
          Operation.payment({
            destination: recipient,
            asset: Asset.native(),
            amount: amount.toString(),
          })
        )
        .setTimeout(30)
        .build();

      // Sign with Freighter
      const signResult = await signTransaction(transaction.toXDR(), {
        networkPassphrase: Networks.TESTNET,
      });

      const signedXDR = signResult.signedTxXdr || signResult;

      // Submit transaction
      const submitRes = await fetch(`${HORIZON_URL}/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `tx=${encodeURIComponent(signedXDR)}`,
      });

      const submitData = await submitRes.json();

      if (submitData.hash) {
        setTxStatus("✅ Transaction Successful!");
        setTxHash(submitData.hash);
        await fetchBalance(wallet);
        setRecipient("");
        setAmount("");
      } else {
        const errMsg = submitData?.extras?.result_codes?.operations?.[0] || "Unknown error";
        setTxStatus("❌ Failed: " + errMsg);
      }

    } catch (err) {
      setTxStatus("❌ Error: " + err.message);
      console.log(err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ textAlign: "center", marginTop: "40px", fontFamily: "Arial" }}>
      <h1>TrustChain Pay</h1>
      <p style={{ color: "gray" }}>Level 1 - Stellar Testnet dApp</p>

      {!wallet ? (
        <button onClick={connectWallet} disabled={loading}
          style={{ padding: "10px 20px", fontSize: "16px", cursor: "pointer" }}>
          {loading ? "Connecting..." : "Connect Wallet"}
        </button>
      ) : (
        <div style={{ maxWidth: "520px", margin: "20px auto" }}>

          {/* Wallet Info */}
          <div style={{ border: "1px solid #ddd", borderRadius: "10px",
            padding: "20px", marginBottom: "20px" }}>
            <p><b>✅ Wallet Connected</b></p>
            <p style={{ wordBreak: "break-all", fontSize: "12px", color: "#555" }}>
              {wallet}
            </p>
            <p style={{ fontSize: "22px" }}>
              <b>Balance:</b> {balance} XLM
            </p>
            <button onClick={disconnectWallet}
              style={{ padding: "8px 16px", background: "#ff4444",
                color: "white", border: "none", borderRadius: "5px",
                cursor: "pointer" }}>
              Disconnect
            </button>
          </div>

          {/* Send XLM */}
          <div style={{ border: "1px solid #ddd", borderRadius: "10px",
            padding: "20px", marginBottom: "20px" }}>
            <h3>💸 Send XLM</h3>
            <input
              type="text"
              placeholder="Recipient Address (G...)"
              value={recipient}
              onChange={e => setRecipient(e.target.value)}
              style={{ width: "100%", padding: "10px", marginBottom: "10px",
                borderRadius: "5px", border: "1px solid #ccc",
                boxSizing: "border-box" }}
            />
            <input
              type="number"
              placeholder="Amount (XLM)"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              style={{ width: "100%", padding: "10px", marginBottom: "10px",
                borderRadius: "5px", border: "1px solid #ccc",
                boxSizing: "border-box" }}
            />
            <button onClick={sendXLM} disabled={sending}
              style={{ width: "100%", padding: "10px", background: "#4CAF50",
                color: "white", border: "none", borderRadius: "5px",
                fontSize: "16px", cursor: "pointer" }}>
              {sending ? "Sending..." : "Send XLM"}
            </button>
          </div>

          {/* Transaction Result */}
          {txStatus && (
            <div style={{ border: "1px solid #ddd", borderRadius: "10px",
              padding: "20px",
              background: txStatus.includes("✅") ? "#f0fff0" : "#fff0f0" }}>
              <h3>Transaction Result</h3>
              <p style={{ fontSize: "18px" }}>{txStatus}</p>
              {txHash && (
                <div>
                  <p><b>Transaction Hash:</b></p>
                  <p style={{ wordBreak: "break-all", fontSize: "12px", color: "#555" }}>
                    {txHash}
                  </p>
                  <a href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
                    target="_blank" rel="noreferrer"
                    style={{ color: "blue" }}>
                    View on Stellar Explorer →
                  </a>
                </div>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  );
}

export default App;