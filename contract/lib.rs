#![no_std]
use soroban_sdk::{contract, contractimpl, Env, Symbol, symbol_short};

#[contract]
pub struct TrustChainPay;

#[contractimpl]
impl TrustChainPay {
    // Send XLM payment
    pub fn send_payment(env: Env, amount: u64) -> u64 {
        amount
    }

    // Get contract version
    pub fn version(env: Env) -> Symbol {
        symbol_short!("v1")
    }
}