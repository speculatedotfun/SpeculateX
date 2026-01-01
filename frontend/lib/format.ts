/**
 * Unified formatting utilities for consistent display across the app
 */

/**
 * Price display types
 */
export type PriceFormat = 'percentage' | 'cents' | 'decimal' | 'currency';

/**
 * Format price with consistent rules
 *
 * @param price - Price value (0-1 for probability, or actual value)
 * @param format - Display format type
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted price string
 *
 * @example
 * formatPrice(0.543, 'percentage') // "54.3%"
 * formatPrice(0.543, 'cents') // "54.3¢"
 * formatPrice(0.543, 'decimal') // "0.54"
 * formatPrice(100.50, 'currency') // "$100.50"
 */
export function formatPrice(
  price: number | string | bigint,
  format: PriceFormat = 'percentage',
  decimals: number = 2
): string {
  // Convert to number
  const numPrice = typeof price === 'bigint' ? Number(price) : typeof price === 'string' ? parseFloat(price) : price;

  // Handle invalid numbers
  if (isNaN(numPrice) || !isFinite(numPrice)) {
    return format === 'currency' ? '$0.00' : '0';
  }

  switch (format) {
    case 'percentage':
      // For probabilities (0-1), multiply by 100
      const percentage = numPrice <= 1 ? numPrice * 100 : numPrice;
      return `${percentage.toFixed(decimals)}%`;

    case 'cents':
      // For probabilities (0-1), multiply by 100
      const cents = numPrice <= 1 ? numPrice * 100 : numPrice;
      return `${cents.toFixed(decimals)}¢`;

    case 'decimal':
      // Show as decimal (0.XX)
      return numPrice.toFixed(decimals);

    case 'currency':
      // Format as USD with $ sign
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(numPrice);

    default:
      return numPrice.toFixed(decimals);
  }
}

/**
 * Format large numbers with K, M, B suffixes
 *
 * @param value - Number to format
 * @param decimals - Decimal places (default: 1)
 * @returns Formatted string (e.g., "1.5K", "2.3M")
 *
 * @example
 * formatCompact(1500) // "1.5K"
 * formatCompact(2300000) // "2.3M"
 * formatCompact(1200000000) // "1.2B"
 */
export function formatCompact(value: number | string | bigint, decimals: number = 1): string {
  const num = typeof value === 'bigint' ? Number(value) : typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num) || !isFinite(num)) return '0';

  const absNum = Math.abs(num);

  if (absNum >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toFixed(decimals)}B`;
  }
  if (absNum >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(decimals)}M`;
  }
  if (absNum >= 1_000) {
    return `${(num / 1_000).toFixed(decimals)}K`;
  }

  return num.toFixed(decimals);
}

/**
 * Format token amounts from wei (18 decimals) to human-readable
 *
 * @param amount - Amount in wei (bigint or string)
 * @param decimals - Token decimals (default: 18 for ETH/ERC20)
 * @param displayDecimals - Display decimal places (default: 2)
 * @returns Formatted amount
 *
 * @example
 * formatTokenAmount(1000000000000000000n) // "1.00"
 * formatTokenAmount("1500000000000000000") // "1.50"
 */
export function formatTokenAmount(
  amount: bigint | string,
  decimals: number = 18,
  displayDecimals: number = 2
): string {
  const amountBigInt = typeof amount === 'string' ? BigInt(amount) : amount;
  const divisor = BigInt(10 ** decimals);
  const quotient = amountBigInt / divisor;
  const remainder = amountBigInt % divisor;

  const wholeNumber = Number(quotient);
  const fractional = Number(remainder) / Number(divisor);

  return (wholeNumber + fractional).toFixed(displayDecimals);
}

/**
 * Format percentage change with +/- prefix and color class
 *
 * @param change - Percentage change (e.g., 5.25 for +5.25%)
 * @returns Object with formatted text and color class
 *
 * @example
 * formatPercentageChange(5.25) // { text: "+5.25%", className: "text-green-600" }
 * formatPercentageChange(-3.5) // { text: "-3.50%", className: "text-red-600" }
 */
export function formatPercentageChange(change: number): { text: string; className: string } {
  const isPositive = change > 0;
  const isNegative = change < 0;

  return {
    text: `${isPositive ? '+' : ''}${change.toFixed(2)}%`,
    className: isPositive
      ? 'text-green-600 dark:text-green-400'
      : isNegative
      ? 'text-red-600 dark:text-red-400'
      : 'text-gray-600 dark:text-gray-400',
  };
}

/**
 * Format time ago (e.g., "5 minutes ago", "2 hours ago")
 *
 * @param timestamp - Unix timestamp in seconds or milliseconds
 * @returns Human-readable time ago string
 *
 * @example
 * formatTimeAgo(Date.now() / 1000 - 300) // "5 minutes ago"
 * formatTimeAgo(Date.now() - 7200000) // "2 hours ago"
 */
export function formatTimeAgo(timestamp: number): string {
  // Convert to milliseconds if in seconds
  const timestampMs = timestamp < 10000000000 ? timestamp * 1000 : timestamp;
  const now = Date.now();
  const diff = now - timestampMs;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return 'Just now';
}

/**
 * Truncate address to show first and last characters
 *
 * @param address - Ethereum address
 * @param startChars - Characters to show at start (default: 6)
 * @param endChars - Characters to show at end (default: 4)
 * @returns Truncated address
 *
 * @example
 * truncateAddress("0x1234567890abcdef1234567890abcdef12345678")
 * // "0x1234...5678"
 */
export function truncateAddress(
  address: string,
  startChars: number = 6,
  endChars: number = 4
): string {
  if (!address || address.length < startChars + endChars) return address;
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

/**
 * Format date to readable string
 *
 * @param timestamp - Unix timestamp in seconds or milliseconds
 * @param format - Format type: 'short', 'medium', 'long'
 * @returns Formatted date string
 *
 * @example
 * formatDate(1735516800, 'short') // "Dec 30, 2025"
 * formatDate(1735516800, 'medium') // "Dec 30, 2025 12:00 PM"
 * formatDate(1735516800, 'long') // "December 30, 2025 at 12:00 PM EST"
 */
export function formatDate(
  timestamp: number,
  format: 'short' | 'medium' | 'long' = 'medium'
): string {
  const timestampMs = timestamp < 10000000000 ? timestamp * 1000 : timestamp;
  const date = new Date(timestampMs);

  switch (format) {
    case 'short':
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

    case 'medium':
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

    case 'long':
      return date.toLocaleString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short',
      });

    default:
      return date.toLocaleString();
  }
}
