export interface Asset {
    symbol: string;
    name: string;
    icon: string;
    logoSrc?: string;
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
        logoSrc: '/logos/BTC_ethereum.png',
        feedId: 'BTC/USD',
        testnetFeed: '0x5741306c21795FdCBb9b265Ea0255F499DFe515C',
        mainnetFeed: '0x264990fbd0A4796A3E3d8E37C4d5F87a3aCa5Ebf',
        color: 'from-orange-400 to-orange-600'
    },
    {
        symbol: 'ETH',
        name: 'Ethereum',
        icon: 'Ξ',
        logoSrc: '/logos/ETH_ethereum.png',
        feedId: 'ETH/USD',
        testnetFeed: '0x143db3CEEfbdfe5631aDD3E50f7614B6ba708BA7',
        mainnetFeed: '0x9ef1B8c0E4F7dc8bF5719Ea496883DC6401d5b2e',
        color: 'from-blue-400 to-purple-600'
    },
    {
        symbol: 'BNB',
        name: 'Binance Coin',
        icon: '🔶',
        logoSrc: '/logos/BNB_bsc.png',
        feedId: 'BNB/USD',
        testnetFeed: '0x2514895c72f50D8bd4B4F9b1110F0D6bD2c97526',
        mainnetFeed: '0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE',
        color: 'from-yellow-400 to-yellow-600'
    },
    {
        symbol: 'SOL',
        name: 'Solana',
        icon: '◎',
        logoSrc: '/logos/SOL_solana.png',
        feedId: 'SOL/USD',
        testnetFeed: '0xE3376288130c27567f4CA989211E17ee000F5730', // Custom/Mock Address for Testnet if real one unavailable
        mainnetFeed: '0x210495d1611bCC0D3759796C074db37Be8739773', // Verified BSC Mainnet
        color: 'from-green-400 to-teal-600'
    },
    {
        symbol: 'XRP',
        name: 'Ripple',
        icon: '✕',
        logoSrc: '/logos/XRP_ethereum.png',
        feedId: 'XRP/USD',
        testnetFeed: '0x404620f3801fec468e21a2c070c4369a2394c860', // Verified BSC Testnet
        mainnetFeed: '0x93a67D4103038713deBe47e545edC1b80C6Ee838', // Verified BSC Mainnet
        color: 'from-gray-400 to-gray-600'
    },
    {
        symbol: 'ADA',
        name: 'Cardano',
        icon: '₳',
        logoSrc: '/logos/ADA_ethereum.png',
        feedId: 'ADA/USD',
        testnetFeed: '0xA76E36a8E0576C7D1a7191845A376378A5B9C978',
        mainnetFeed: '0xa39434A6017ec6513A5C98C3AA3E6e409C1E1494',
        color: 'from-blue-500 to-blue-700'
    },
    {
        symbol: 'DOGE',
        name: 'Dogecoin',
        icon: 'Ð',
        logoSrc: '/logos/DOGE_ethereum.png',
        feedId: 'DOGE/USD',
        testnetFeed: '0x32029074092E46C828C56F9894e22e9e992Ce62C',
        mainnetFeed: '0x3AB5c9e301168FC739945037d57D65768565656',
        color: 'from-yellow-300 to-yellow-500'
    },
    {
        symbol: 'MATIC',
        name: 'Polygon',
        icon: '💜',
        logoSrc: '/logos/MATIC_ethereum.png',
        feedId: 'MATIC/USD',
        testnetFeed: '0xB04523b1609121a95793f77364402636a00A3815',
        mainnetFeed: '0x7CA57b0cA6367191c94C8914d7Df09A576629070',
        color: 'from-purple-500 to-purple-700'
    },
    {
        symbol: 'DOT',
        name: 'Polkadot',
        icon: '🟣',
        logoSrc: '/logos/DOT_ethereum.png',
        feedId: 'DOT/USD',
        testnetFeed: '0x8157053de089851610484542cf9F99bB4468fFBD',
        mainnetFeed: '0xc3041F6170d186411136b3252a1B87494f699863',
        color: 'from-pink-500 to-pink-700'
    },
    {
        symbol: 'LTC',
        name: 'Litecoin',
        icon: 'Ł',
        logoSrc: '/logos/LTC_ethereum.png',
        feedId: 'LTC/USD',
        testnetFeed: '0xE6f2f2549aEa85C1F033F53641261d76C29AC94d',
        mainnetFeed: '0x74E72F37a89C223cc1740a8e09e5F0141b7AA8D9',
        color: 'from-gray-300 to-blue-400'
    },
    {
        symbol: 'LINK',
        name: 'Chainlink',
        icon: '⬡',
        logoSrc: '/logos/chainlink.png',
        feedId: 'LINK/USD',
        testnetFeed: '0x2c1d072e956AFFC0D435Cb7AC38EF18D24E9127c',
        mainnetFeed: '0xca236E327F629f9Fc2c30A4E95775EbF0B89fD8D',
        color: 'from-blue-400 to-blue-600'
    },
    {
        symbol: 'UNI',
        name: 'Uniswap',
        icon: '🦄',
        logoSrc: '/logos/UNI_ethereum.png',
        feedId: 'UNI/USD',
        testnetFeed: '0x5C05E21D0A861F2De18991391F034C08D3039d67',
        mainnetFeed: '0xE2D265079813d4Ac76d32C4996F7802b0c144eD2',
        color: 'from-pink-500 to-red-500'
    },
    {
        symbol: 'AVAX',
        name: 'Avalanche',
        icon: '🔺',
        logoSrc: '/logos/AVAX_ethereum.png',
        feedId: 'AVAX/USD',
        testnetFeed: '0x549646b1A14E01211FA78345c25C03923f03b5A7',
        mainnetFeed: '0x1034E17D87bC9c68364F73C2C4E3D75a9B489A12',
        color: 'from-red-500 to-red-700'
    },
    {
        symbol: 'ATOM',
        name: 'Cosmos',
        icon: '⚛',
        logoSrc: '/logos/ATOM_ethereum.png',
        feedId: 'ATOM/USD',
        testnetFeed: '0x995a560e20D963F70D2641a3D0Cc13F616016e7E',
        mainnetFeed: '0x2724A0027f9503de2E991735Ef06d39578667bF1',
        color: 'from-purple-800 to-indigo-800'
    },
    {
        symbol: 'FIL',
        name: 'Filecoin',
        icon: '💾',
        logoSrc: '/logos/FIL_ethereum.png',
        feedId: 'FIL/USD',
        testnetFeed: '0x2908861313670989f660ebE6E59A518Bf8e583d9',
        mainnetFeed: '0x171221D1CbF5C86d2745D8d58F7D26E63e14E290',
        color: 'from-blue-300 to-green-300'
    }
];
