export const addresses = {
  core: (process.env.NEXT_PUBLIC_CORE_ADDRESS || '0xCd8EBd779bc4dD30e5343Ac6baFdBe66E286a512') as `0x${string}`,
  usdc: (process.env.NEXT_PUBLIC_USDC_ADDRESS || '0x45A16Ea5F1423b38326C3F3Fe642Bd57c54cB219') as `0x${string}`,
  admin: (process.env.NEXT_PUBLIC_ADMIN_ADDRESS || '0x9D767E1a7D6650EEf1cEaa82841Eb553eDD6b76F') as `0x${string}`,
  chainlinkResolver: (process.env.NEXT_PUBLIC_CHAINLINK_RESOLVER_ADDRESS || '0xE5c7B62f2A5E1f2DA7EE5a81B11e656f9858ac4D') as `0x${string}`,
};

export const chainId = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '97');

