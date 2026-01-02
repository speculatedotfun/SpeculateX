// BigInt serialization support for Next.js build process
// This ensures BigInt values can be serialized during data collection

if (typeof BigInt !== 'undefined') {
  // Add toJSON method to BigInt prototype for JSON serialization
  if (!BigInt.prototype.toJSON) {
    BigInt.prototype.toJSON = function() {
      return this.toString();
    };
  }
  
  // Ensure BigInt can be used in comparisons and arithmetic
  // This is a workaround for Next.js build process
  if (typeof window === 'undefined') {
    // Server-side: ensure proper conversion
    const originalJSONStringify = JSON.stringify;
    JSON.stringify = function(value: any, replacer?: any, space?: any) {
      const customReplacer = (key: string, val: any) => {
        if (typeof val === 'bigint') {
          return val.toString();
        }
        return replacer ? replacer(key, val) : val;
      };
      return originalJSONStringify(value, customReplacer, space);
    };
  }
}

export {};

