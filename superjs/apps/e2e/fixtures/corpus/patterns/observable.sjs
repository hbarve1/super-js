// Observable Pattern Example

// Observer interface
type Observer<T> {
  update(value: T): void;
}

// Observable class
class Observable<T> {
  #observers: Set<Observer<T>> = new Set();
  #value: T;

  constructor(initialValue: T) {
    this.#value = initialValue;
  }

  get value(): T {
    return this.#value;
  }

  set value(newValue: T) {
    this.#value = newValue;
    this.notify();
  }

  subscribe(observer: Observer<T>): () => void {
    this.#observers.add(observer);
    observer.update(this.#value);
    return () => this.#observers.delete(observer);
  }

  notify(): void {
    this.#observers.forEach(observer => observer.update(this.#value));
  }
}

// Example: Stock price monitoring system
type StockData {
  symbol: string;
  price: number;
  timestamp: Date;
}

// Stock price observer implementations
class StockPriceDisplay implements Observer<StockData> {
  #name: string;

  constructor(name: string) {
    this.#name = name;
  }

  update(data: StockData): void {
    console.log(
      `[${this.#name}] ${data.symbol}: $${data.price.toFixed(2)} at ${data.timestamp.toLocaleTimeString()}`
    );
  }
}

class PriceAlertSystem implements Observer<StockData> {
  #threshold: number;

  constructor(threshold: number) {
    this.#threshold = threshold;
  }

  update(data: StockData): void {
    if (data.price > this.#threshold) {
      console.log(
        `🚨 ALERT: ${data.symbol} price ($${data.price.toFixed(2)}) exceeded threshold $${this.#threshold.toFixed(2)}`
      );
    }
  }
}

class TradingBot implements Observer<StockData> {
  #lastPrice: number = 0;

  update(data: StockData): void {
    if (this.#lastPrice === 0) {
      this.#lastPrice = data.price;
      return;
    }

    if (data.price < this.#lastPrice) {
      console.log(`🤖 Bot: Buying ${data.symbol} at $${data.price.toFixed(2)} (price dropped)`);
    } else if (data.price > this.#lastPrice * 1.1) {
      console.log(`🤖 Bot: Selling ${data.symbol} at $${data.price.toFixed(2)} (10% profit)`);
    }

    this.#lastPrice = data.price;
  }
}

// Usage example
function main(): void {
  // Create observable stock data
  const stockFeed = new Observable<StockData>({
    symbol: 'SUPER',
    price: 100,
    timestamp: new Date()
  });

  // Create observers
  const display1 = new StockPriceDisplay('Display 1');
  const display2 = new StockPriceDisplay('Display 2');
  const alertSystem = new PriceAlertSystem(150);
  const tradingBot = new TradingBot();

  // Subscribe observers
  console.log('Subscribing observers...\n');
  const unsubDisplay1 = stockFeed.subscribe(display1);
  const unsubDisplay2 = stockFeed.subscribe(display2);
  const unsubAlert = stockFeed.subscribe(alertSystem);
  const unsubBot = stockFeed.subscribe(tradingBot);

  // Simulate price changes
  console.log('\nSimulating price changes...');
  
  setTimeout(() => {
    stockFeed.value = {
      symbol: 'SUPER',
      price: 95,
      timestamp: new Date()
    };
  }, 1000);

  setTimeout(() => {
    stockFeed.value = {
      symbol: 'SUPER',
      price: 155,
      timestamp: new Date()
    };
  }, 2000);

  setTimeout(() => {
    console.log('\nUnsubscribing Display 2...');
    unsubDisplay2();
  }, 2500);

  setTimeout(() => {
    stockFeed.value = {
      symbol: 'SUPER',
      price: 140,
      timestamp: new Date()
    };
  }, 3000);
}

main();