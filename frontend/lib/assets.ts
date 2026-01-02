export interface Asset {
    symbol: string;
    name: string;
    icon: string;
    feedId: string;
    testnetFeed?: string;
    mainnetFeed?: string;
    color?: string;
}

export const CRYPTO_ASSETS: Asset[] = [
    {
        symbol: 'BTC',
        name: 'Bitcoin',
        icon: '₿',
        feedId: 'BTC/USD',
        testnetFeed: '0x5741306c21795FdCBb9b265Ea0255F499DFe515C',
        mainnetFeed: '0x264990fbd0A4796A3E3d8E37C4d5F87a3aCa5Ebf',
        color: 'from-orange-400 to-orange-600'
    },
    {
        symbol: 'ETH',
        name: 'Ethereum',
        icon: 'Ξ',
        feedId: 'ETH/USD',
        testnetFeed: '0x143db3CEEfbdfe5631aDD3E50f7614B6ba708BA7',
        mainnetFeed: '0x9ef1B8c0E4F7dc8bF5719Ea496883DC6401d5b2e',
        color: 'from-blue-400 to-purple-600'
    },
    {
        symbol: 'SOL',
        name: 'Solana',
        icon: '◎',
        feedId: 'SOL/USD',
        testnetFeed: '0xE3376288130c27567f4CA989211E17ee000F5730',
        mainnetFeed: '0x210495d1611bCC0D3759796C074db37Be8739773',
        color: 'from-green-400 to-teal-600'
    },
    {
        symbol: 'BNB',
        name: 'Binance Coin',
        icon: '🔶',
        feedId: 'BNB/USD',
        testnetFeed: '0x2514895c72f50D8bd4B4F9b1110F0D6bD2c97526',
        mainnetFeed: '0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE',
        color: 'from-yellow-400 to-yellow-600'
    },
    {
        symbol: 'XRP',
        name: 'Ripple',
        icon: '✕',
        feedId: 'XRP/USD',
        testnetFeed: '0x40c06194E03b896266A467D67e0681D20630D394',
        mainnetFeed: '0x93a67D4103038713deBe47e545edC1b80C6Ee838',
        color: 'from-gray-400 to-gray-600'
    },
    {
        symbol: 'ADA',
        name: 'Cardano',
        icon: '₳',
        feedId: 'ADA/USD',
        testnetFeed: '0x764267E147e451b4BcbA498bCe915309315A5Cd2',
        mainnetFeed: '0xa39434A6017ec6513A5C98C3AA3E6e409C1E1494',
        color: 'from-blue-500 to-blue-700'
    },
    {
        symbol: 'AVAX',
        name: 'Avalanche',
        icon: '🔺',
        feedId: 'AVAX/USD',
        testnetFeed: '0x170245Cd367966bc7cd4263067Ab81Cfe76bC7B6',
        mainnetFeed: '0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE', // Note: Check real AVAX feed
        color: 'from-red-500 to-red-700'
    },
    {
        symbol: 'LINK',
        name: 'Chainlink',
        icon: '⬡',
        feedId: 'LINK/USD',
        testnetFeed: '0x103B329aA1054593C293041933D723C77C6BAcaB',
        mainnetFeed: '0xf08096f26dA28282828282828282828282828282',
        color: 'from-blue-400 to-blue-600'
    },
    {
        symbol: 'DOGE',
        name: 'Dogecoin',
        icon: 'Ð',
        feedId: 'DOGE/USD',
        testnetFeed: '0xDE16a3089dC4d9B0866A4Be6206f65839C967201',
        mainnetFeed: '0x3AB5c9e301168FC739945037d57D65768565656',
        color: 'from-yellow-300 to-yellow-500'
    },
    {
        symbol: 'MATIC',
        name: 'Polygon',
        icon: '💜',
        feedId: 'MATIC/USD',
        color: 'from-purple-500 to-purple-700'
    },
    {
        symbol: 'DOT',
        name: 'Polkadot',
        icon: '🟣',
        feedId: 'DOT/USD',
        color: 'from-pink-500 to-pink-700'
    },
];
