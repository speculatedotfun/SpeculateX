# How to Clear Cache Manually

If you're seeing old data after deploying a new contract, clear the cache:

## Method 1: Browser Console (Quick)
Open browser console (F12) and run:
```javascript
// Clear localStorage
localStorage.clear();

// Clear IndexedDB
indexedDB.deleteDatabase('SpeculateCache').onsuccess = () => {
  console.log('Cache cleared!');
};

// Reload page
location.reload();
```

## Method 2: Browser Settings
1. Open DevTools (F12)
2. Go to Application tab
3. Click "Clear storage" on the left
4. Check "Local storage" and "IndexedDB"
5. Click "Clear site data"
6. Reload the page

## Method 3: Hard Refresh
- Windows/Linux: `Ctrl + Shift + R` or `Ctrl + F5`
- Mac: `Cmd + Shift + R`

The app will now automatically clear cache when Core address changes (after page refresh).

