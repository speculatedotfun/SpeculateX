'use client';

import { useAccount, useReadContract, useBlockNumber } from 'wagmi';
import { getAddresses, getCurrentNetwork } from '@/lib/contracts';
import { getCoreAbi, usdcAbi, positionTokenAbi } from '@/lib/abis';
import { useMemo } from 'react';

export function useMarketContractData(marketId: number, marketIdBI: bigint) {
    const { address } = useAccount();
    const addresses = getAddresses();
    const network = getCurrentNetwork();
    const coreAbiForNetwork = getCoreAbi(network);

    const { data: blockNumber } = useBlockNumber({ watch: true });

    // 1. Market Info
    const { data: contractData, refetch: refetchMarketData } = useReadContract({
        address: addresses.core,
        abi: coreAbiForNetwork,
        functionName: 'markets',
        args: [marketIdBI],
        query: { enabled: marketId >= 0 },
    }) as any;

    // 2. Market State
    const { data: marketStateData, refetch: refetchMarketState } = useReadContract({
        address: addresses.core,
        abi: coreAbiForNetwork,
        functionName: 'getMarketState',
        args: [marketIdBI],
        query: { enabled: marketId >= 0 },
    }) as any;

    // 2b. Market Resolution (needed for startTime check on scheduled markets)
    const { data: resolutionData, refetch: refetchResolution } = useReadContract({
        address: addresses.core,
        abi: coreAbiForNetwork,
        functionName: 'getMarketResolution',
        args: [marketIdBI],
        query: { enabled: marketId >= 0 },
    }) as any;

    // 3. USDC Balance & Allowance
    const { data: usdcBalanceData, refetch: refetchUsdcBalance } = useReadContract({
        address: addresses.usdc,
        abi: usdcAbi,
        functionName: 'balanceOf',
        args: [address || '0x0000000000000000000000000000000000000000'],
        query: { enabled: !!address },
    });

    const { data: usdcAllowanceData, refetch: refetchUsdcAllowance } = useReadContract({
        address: addresses.usdc,
        abi: usdcAbi,
        functionName: 'allowance',
        args: [address || '0x0000000000000000000000000000000000000000', addresses.core],
        query: { enabled: !!address },
    });

    // 4. Position Token Balances
    const isObject = contractData && typeof contractData === 'object' && !Array.isArray(contractData);
    const yesTokenAddress = isObject ? contractData.yes : contractData?.[0];
    const noTokenAddress = isObject ? contractData.no : contractData?.[1];

    const { data: yesBalanceData, refetch: refetchYesBalance } = useReadContract({
        address: yesTokenAddress,
        abi: positionTokenAbi,
        functionName: 'balanceOf',
        args: [address || '0x0000000000000000000000000000000000000000'],
        query: { enabled: !!address && !!yesTokenAddress },
    });

    const { data: noBalanceData, refetch: refetchNoBalance } = useReadContract({
        address: noTokenAddress,
        abi: positionTokenAbi,
        functionName: 'balanceOf',
        args: [address || '0x0000000000000000000000000000000000000000'],
        query: { enabled: !!address && !!noTokenAddress },
    });

    // 5. LP Data
    const { data: lpSharesData, refetch: refetchLpShares } = useReadContract({
        address: addresses.core,
        abi: coreAbiForNetwork,
        functionName: 'lpShares',
        args: [marketIdBI, address || '0x0000000000000000000000000000000000000000'],
        query: { enabled: !!address },
    });

    const { data: pendingFeesData, refetch: refetchPendingFees } = useReadContract({
        address: addresses.core,
        abi: coreAbiForNetwork,
        functionName: 'lpFeeDebt',
        args: [marketIdBI, address || '0x0000000000000000000000000000000000000000'],
        query: { enabled: !!address },
    });

    const { data: pendingResidualData, refetch: refetchPendingResidual } = useReadContract({
        address: addresses.core,
        abi: coreAbiForNetwork,
        functionName: 'lpResidualDebt',
        args: [marketIdBI, address || '0x0000000000000000000000000000000000000000'],
        query: { enabled: !!address },
    });

    const refetchAll = async () => {
        await Promise.all([
            refetchMarketData(),
            refetchMarketState(),
            refetchResolution(),
            refetchUsdcBalance(),
            refetchUsdcAllowance(),
            refetchYesBalance(),
            refetchNoBalance(),
            refetchLpShares(),
            refetchPendingFees(),
            refetchPendingResidual(),
        ]);
    };

    const isLoading = useMemo(() => {
        return !contractData && !marketStateData;
    }, [contractData, marketStateData]);

    return {
        contractData,
        marketStateData,
        resolutionData,
        usdcBalanceData,
        usdcAllowanceData,
        yesBalanceData,
        noBalanceData,
        lpSharesData,
        pendingFeesData,
        pendingResidualData,
        refetchAll,
        isLoading,
    };
}
