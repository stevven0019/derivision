/**
 * Deriv WebSocket Adapter Service
 * Handles direct WebSocket connection to Deriv API, ticks streaming,
 * candle history fetching, authorization, and trade execution.
 * Includes realistic local simulation mode when disconnected or testing without token.
 */

import { SymbolCode, TickData, CandleData } from '../types/trading';

export interface DerivWSOptions {
  appId?: string;
  token?: string;
  symbol: SymbolCode;
  strictRealMode?: boolean;
  onTick?: (tick: TickData) => void;
  onCandleHistory?: (candles: CandleData[]) => void;
  onStatusChange?: (status: 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED' | 'AUTHORIZED', info?: string) => void;
  onError?: (err: string) => void;
  onContractUpdate?: (contract: any) => void;
  onBalanceUpdate?: (balance: number, currency: string, loginId?: string) => void;
  onTradeOutcome?: (contractId: string, win: boolean, profit: number) => void;
  onLog?: (log: { timestamp: string; level: 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR'; message: string }) => void;
}

export class DerivWebSocketAdapter {
  private ws: WebSocket | null = null;
  private appId: string;
  private token: string;
  private currentSymbol: SymbolCode;
  private pingInterval: any = null;
  private isAuthorized: boolean = false;
  private options: DerivWSOptions;
  private isConnected: boolean = false;
  
  // Simulator state
  private simulatorActive: boolean = false;
  private simulatorInterval: any = null;
  private simLastPrice: number = 1000;
  private simCurrentCandle: CandleData | null = null;
  private simCandles: CandleData[] = [];

  constructor(options: DerivWSOptions) {
    this.options = options;
    this.appId = options.appId || '1089';
    this.token = options.token || '';
    this.currentSymbol = options.symbol;
  }

  private emitLog(level: 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR', message: string) {
    const timestamp = new Date().toLocaleTimeString();
    this.options.onLog?.({ timestamp, level, message });
  }

  public setAppId(appId: string) {
    const cleanAppId = appId.trim() || '1089';
    if (this.appId === cleanAppId) return;
    this.appId = cleanAppId;
    this.options.appId = cleanAppId;
    this.emitLog('INFO', `Updated Deriv App ID to: ${cleanAppId}. Reconnecting...`);
    if (this.isConnected) {
      this.disconnect();
      this.connect();
    }
  }

  public setSymbol(symbol: SymbolCode) {
    if (this.currentSymbol === symbol) return;
    this.currentSymbol = symbol;
    this.options.symbol = symbol;
    this.emitLog('INFO', `Switched symbol to ${symbol}`);
    if (this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.send({ forget_all: 'ticks' });
      this.requestCandleHistory(symbol);
      this.subscribeTicks(symbol);
    } else if (this.simulatorActive) {
      this.resetSimulator(symbol);
    }
  }

  public setToken(token: string) {
    const cleanToken = token.trim();
    this.token = cleanToken;
    this.options.token = cleanToken;
    this.emitLog('INFO', cleanToken ? 'Updated API token. Authenticating...' : 'Cleared API token.');
    if (this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN && cleanToken) {
      this.send({ authorize: cleanToken });
    }
  }

  public setStrictRealMode(strict: boolean) {
    this.options.strictRealMode = strict;
    this.emitLog('INFO', `Strict Real Mode set to: ${strict}`);
    if (strict && this.simulatorActive) {
      this.stopSimulator();
      if (!this.isConnected) {
        this.options.onStatusChange?.('DISCONNECTED', 'Strict Real Mode: Synthetic Simulator Disabled.');
      }
    }
  }

  public async connect() {
    this.stopSimulator();
    const cleanToken = this.token.trim();

    // --- HYBRID REST API (HTTPS) + WEBSOCKET (WSS) AUTHENTICATION FLOW ---
    if (cleanToken) {
      this.emitLog('INFO', `[REST REST API] Validating credentials & fetching accounts from api.derivws.com (App ID: ${this.appId})...`);
      this.options.onStatusChange?.('CONNECTING', 'Authenticating via Deriv REST API (HTTPS)...');

      try {
        // Step 1: Fetch Accounts list via REST HTTPS
        const accResponse = await fetch('https://api.derivws.com/trading/v1/options/accounts', {
          headers: {
            'Deriv-App-ID': this.appId,
            'Authorization': `Bearer ${cleanToken}`
          }
        });

        if (accResponse.ok) {
          const accData = await accResponse.json();
          const accounts = accData.accounts || accData.data || (Array.isArray(accData) ? accData : []);
          this.emitLog('SUCCESS', `[REST REST API] Accounts retrieved: ${accounts.length > 0 ? accounts.map((a: any) => a.account_id || a.accountId || a.id).join(', ') : 'OK'}`);

          const activeAccount = (accounts.length > 0 ? (accounts[0].account_id || accounts[0].accountId || accounts[0].id) : undefined);

          if (activeAccount) {
            // Step 2: Request OTP Token for Secure WSS Connection
            this.emitLog('INFO', `[REST OTP] Requesting encrypted WSS OTP token for account ${activeAccount}...`);
            const otpResponse = await fetch(`https://api.derivws.com/trading/v1/options/accounts/${activeAccount}/otp`, {
              method: 'POST',
              headers: {
                'Deriv-App-ID': this.appId,
                'Authorization': `Bearer ${cleanToken}`
              }
            });

            if (otpResponse.ok) {
              const otpData = await otpResponse.json();
              const otpUrl = otpData.otpUrl || otpData.wsUrl || otpData.url;

              if (otpUrl) {
                this.emitLog('SUCCESS', '[REST OTP] OTP WSS URL generated successfully! Opening WebSocket...');
                this.connectWebSocket(otpUrl, true, activeAccount);
                return;
              }
            } else {
              this.emitLog('WARN', `[REST OTP] OTP endpoint returned status ${otpResponse.status}. Falling back to direct WSS authorize.`);
            }
          }
        } else {
          this.emitLog('WARN', `[REST API] Accounts endpoint returned status ${accResponse.status}. Falling back to direct WSS authorize.`);
        }
      } catch (err: any) {
        this.emitLog('WARN', `[REST API] Hybrid REST OTP attempt failed (${err?.message || 'Network error'}). Falling back to direct WSS...`);
      }
    }

    // Direct WebSocket fallback (Standard wss.derivws.com)
    const wsUrl = `wss://ws.derivws.com/websockets/v3?app_id=${this.appId}`;
    this.connectWebSocket(wsUrl, false);
  }

  private connectWebSocket(wsUrl: string, preAuthorized: boolean = false, accountId?: string) {
    this.emitLog('INFO', `Connecting to WebSocket: ${wsUrl.slice(0, 50)}...`);
    this.options.onStatusChange?.('CONNECTING', 'Opening secure WebSocket channel...');

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.emitLog('SUCCESS', `WebSocket Connected! (App ID: ${this.appId})`);
        this.options.onStatusChange?.('CONNECTED', `Connected to Deriv API (App ID: ${this.appId})`);
        
        this.startPing();

        if (preAuthorized) {
          this.isAuthorized = true;
          this.emitLog('SUCCESS', `Pre-authenticated via REST OTP! Account: ${accountId || 'Active'}`);
          this.options.onStatusChange?.('AUTHORIZED', `Authorized as ${accountId || 'Deriv Live'}`);
          this.send({ balance: 1, subscribe: 1 });
        } else {
          const cleanToken = this.token.trim();
          if (cleanToken) {
            this.emitLog('INFO', 'Sending WSS authorize request...');
            this.send({ authorize: cleanToken });
          } else {
            this.emitLog('WARN', 'No API token provided. Enter a valid Deriv Token in Settings to authorize.');
          }
        }

        this.requestCandleHistory(this.currentSymbol);
        this.subscribeTicks(this.currentSymbol);
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this.handleMessage(msg);
        } catch (e) {
          console.error('Error parsing WS message:', e);
        }
      };

      this.ws.onerror = (err) => {
        console.warn('Deriv WS Error:', err);
        this.emitLog('ERROR', 'Deriv WebSocket Connection Error');
        this.options.onError?.('WebSocket Connection Error');
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.isAuthorized = false;
        this.stopPing();
        if (this.options.strictRealMode) {
          this.emitLog('WARN', 'Connection closed. Strict Real Mode active (Simulator suppressed).');
          this.options.onStatusChange?.('DISCONNECTED', 'Connection closed. Strict Real Mode active (Simulator suppressed).');
        } else {
          this.emitLog('INFO', 'Connection closed. Fallback to high-frequency synthetic simulator.');
          this.options.onStatusChange?.('DISCONNECTED', 'Connection closed. Fallback to high-frequency synthetic simulator.');
          this.startSimulator(this.currentSymbol);
        }
      };
    } catch (e: any) {
      console.warn('Failed to construct WebSocket:', e);
      this.emitLog('ERROR', `Failed to open WebSocket: ${e?.message || e}`);
      if (this.options.strictRealMode) {
        this.options.onStatusChange?.('DISCONNECTED', 'Failed to connect. Strict Real Mode active (Simulator suppressed).');
      } else {
        this.startSimulator(this.currentSymbol);
      }
    }
  }

  public disconnect() {
    this.stopPing();
    this.stopSimulator();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.isAuthorized = false;
    this.options.onStatusChange?.('DISCONNECTED', 'Disconnected');
  }

  public buyContract(symbol: SymbolCode, amount: number, contractType: 'CALL' | 'PUT', durationSeconds: number = 60) {
    if (this.isConnected && (this.isAuthorized || this.ws?.readyState === WebSocket.OPEN)) {
      this.emitLog('INFO', `Sending proposal request for ${contractType} on ${symbol} ($${amount}, ${durationSeconds}s)...`);
      
      // Step 1: Send Proposal request
      const proposalReq = {
        proposal: 1,
        amount: amount,
        basis: 'stake',
        contract_type: contractType === 'CALL' ? 'CALL' : 'PUT',
        currency: 'USD',
        duration: durationSeconds,
        duration_unit: 's',
        symbol: symbol
      };
      this.send(proposalReq);
    } else {
      this.emitLog('ERROR', 'Cannot execute trade: Deriv WebSocket not connected or authorized.');
      this.options.onError?.('Cannot buy contract: Deriv WebSocket not connected or authorized.');
    }
  }

  private send(data: object) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  private startPing() {
    this.stopPing();
    this.pingInterval = setInterval(() => {
      this.send({ ping: 1 });
    }, 30000);
  }

  private stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private requestCandleHistory(symbol: SymbolCode) {
    this.send({
      ticks_history: symbol,
      adjust_start_time: 1,
      count: 100,
      end: 'latest',
      start: 1,
      style: 'candles',
      granularity: 60
    });
  }

  private subscribeTicks(symbol: SymbolCode) {
    this.send({
      ticks: symbol,
      subscribe: 1
    });
  }

  private handleMessage(msg: any) {
    if (msg.msg_type === 'authorize') {
      if (msg.error) {
        this.emitLog('ERROR', `Deriv Auth Error: ${msg.error.message}`);
        this.options.onError?.(`Authorization failed: ${msg.error.message}`);
      } else {
        this.isAuthorized = true;
        const info = msg.authorize;
        const loginStr = info.loginid || info.email || 'Deriv Account';
        this.emitLog('SUCCESS', `Authorized successfully as ${loginStr} (Currency: ${info.currency || 'USD'})`);
        this.options.onStatusChange?.('AUTHORIZED', `Authorized as ${loginStr}`);
        // Subscribe to real balance updates
        this.send({ balance: 1, subscribe: 1 });
      }
    } else if (msg.msg_type === 'balance' || msg.balance) {
      const b = msg.balance;
      if (b) {
        this.emitLog('INFO', `Live Balance Updated: $${Number(b.balance).toFixed(2)} ${b.currency || 'USD'}`);
        this.options.onBalanceUpdate?.(Number(b.balance), b.currency || 'USD', b.loginid);
      }
    } else if (msg.msg_type === 'proposal' || msg.proposal) {
      const p = msg.proposal;
      if (p && p.id) {
        this.emitLog('SUCCESS', `Proposal price received: $${p.ask_price || p.display_value || 'OK'}. Executing buy...`);
        // Step 2: Auto-Buy contract on proposal response
        this.send({ buy: p.id, price: Number(p.ask_price || p.bid_price || 1) });
      } else if (msg.error) {
        this.emitLog('ERROR', `Proposal Error: ${msg.error.message}`);
        this.options.onError?.(`Proposal Error: ${msg.error.message}`);
      }
    } else if (msg.msg_type === 'buy' || msg.buy) {
      const b = msg.buy;
      if (b && b.contract_id) {
        this.emitLog('SUCCESS', `Order Executed Live! Contract ID: ${b.contract_id}. Subscribing to contract tracking...`);
        // Step 3: Subscribe to open contract tracking
        this.send({ proposal_open_contract: 1, contract_id: b.contract_id, subscribe: 1 });
      } else if (msg.error) {
        this.emitLog('ERROR', `Buy Execution Error: ${msg.error.message}`);
        this.options.onError?.(`Buy Error: ${msg.error.message}`);
      }
    } else if (msg.msg_type === 'candles' || msg.candles) {
      const rawCandles = msg.candles || [];
      const formatted: CandleData[] = rawCandles.map((c: any) => ({
        symbol: this.currentSymbol,
        open: Number(c.open),
        high: Number(c.high),
        low: Number(c.low),
        close: Number(c.close),
        epoch: Number(c.epoch),
        time: new Date(Number(c.epoch) * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        isClosed: true
      }));
      this.options.onCandleHistory?.(formatted);
    } else if (msg.msg_type === 'tick' || msg.tick) {
      const t = msg.tick;
      if (t) {
        const tickData: TickData = {
          symbol: t.symbol || this.currentSymbol,
          quote: Number(t.quote),
          epoch: Number(t.epoch),
          time: new Date(Number(t.epoch) * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        };
        this.options.onTick?.(tickData);
      }
    } else if (msg.msg_type === 'proposal_open_contract' || msg.proposal_open_contract) {
      const poc = msg.proposal_open_contract;
      this.options.onContractUpdate?.(poc);
      if (poc && poc.is_sold) {
        const win = Number(poc.profit) > 0;
        this.emitLog(win ? 'SUCCESS' : 'WARN', `Contract ${poc.contract_id} Settled. Outcome: ${win ? 'WON (+$' + poc.profit + ')' : 'LOST ($' + poc.profit + ')'}`);
        this.options.onTradeOutcome?.(poc.contract_id, win, Number(poc.profit));
      }
    }
  }

  // --- LOCAL SYNTHETIC SIMULATOR (Fallback & High-Frequency Simulation) ---
  public startSimulator(symbol: SymbolCode) {
    this.stopSimulator();
    this.simulatorActive = true;
    this.options.onStatusChange?.('CONNECTED', `Running Synthetic Simulator Engine for ${symbol}`);
    
    // Seed initial price based on symbol
    this.simLastPrice = this.getInitialPriceForSymbol(symbol);
    
    // Generate initial 80 M1 candles
    const nowEpoch = Math.floor(Date.now() / 1000);
    this.simCandles = [];
    let price = this.simLastPrice * 0.98;

    for (let i = 80; i >= 1; i--) {
      const cEpoch = nowEpoch - i * 60;
      const volatility = this.getVolatilityMultiplier(symbol);
      const changePercent = (Math.random() - 0.49) * volatility;
      const open = price;
      const close = price * (1 + changePercent);
      const high = Math.max(open, close) + Math.abs(open * volatility * 0.5 * Math.random());
      const low = Math.min(open, close) - Math.abs(open * volatility * 0.5 * Math.random());
      price = close;

      this.simCandles.push({
        symbol: symbol,
        open,
        high,
        low,
        close,
        epoch: cEpoch - (cEpoch % 60),
        time: new Date(cEpoch * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isClosed: true
      });
    }

    this.simLastPrice = price;
    this.options.onCandleHistory?.([...this.simCandles]);

    // Tick emitter every 1000ms
    this.simulatorInterval = setInterval(() => {
      if (!this.simulatorActive) return;
      const tEpoch = Math.floor(Date.now() / 1000);
      const volatility = this.getVolatilityMultiplier(symbol);
      
      // Add occasional trend bias or random walk
      const delta = (Math.random() - 0.492) * (this.simLastPrice * volatility);
      this.simLastPrice = parseFloat((this.simLastPrice + delta).toFixed(4));

      const tick: TickData = {
        symbol: symbol,
        quote: this.simLastPrice,
        epoch: tEpoch,
        time: new Date(tEpoch * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      };

      this.options.onTick?.(tick);
    }, 1000);
  }

  private resetSimulator(symbol: SymbolCode) {
    if (this.simulatorActive) {
      this.startSimulator(symbol);
    }
  }

  private stopSimulator() {
    this.simulatorActive = false;
    if (this.simulatorInterval) {
      clearInterval(this.simulatorInterval);
      this.simulatorInterval = null;
    }
  }

  private getInitialPriceForSymbol(symbol: SymbolCode): number {
    if (symbol.startsWith('R_100') || symbol.startsWith('1HZ100V')) return 2540.50;
    if (symbol.startsWith('R_75') || symbol.startsWith('1HZ75V')) return 4820.10;
    if (symbol.startsWith('R_50') || symbol.startsWith('1HZ50V')) return 1280.30;
    if (symbol.startsWith('R_25') || symbol.startsWith('1HZ25V')) return 890.75;
    if (symbol.startsWith('BOOM')) return 6200.00;
    if (symbol.startsWith('CRASH')) return 5800.00;
    return 1150.25;
  }

  private getVolatilityMultiplier(symbol: SymbolCode): number {
    if (symbol.includes('100V') || symbol.includes('R_100')) return 0.0025;
    if (symbol.includes('75V') || symbol.includes('R_75')) return 0.0018;
    if (symbol.includes('50V') || symbol.includes('R_50')) return 0.0012;
    if (symbol.includes('25V') || symbol.includes('R_25')) return 0.0008;
    if (symbol.includes('BOOM') || symbol.includes('CRASH')) return 0.0035;
    return 0.0010;
  }
}
