import { useState, useEffect } from "react";
import { createContainer } from "unstated-next";

import { Contracts, DILL, FEE_DISTRIBUTOR } from "./Contracts";
import { Connection } from "./Connection";
import { Prices } from "../containers/Prices";
import { useProtocolIncome } from "./DILL/useProtocolIncome";
import { ethers } from "ethers";

export interface UseDillOutput {
  lockedAmount?: ethers.BigNumber | null;
  lockEndDate?: ethers.BigNumber | null;
  balance?: ethers.BigNumber | null;
  userClaimable?: ethers.BigNumber | null;
  totalSupply: ethers.BigNumber | null;
  totalLocked: ethers.BigNumber | null;
  lockedValue: number | null;
  totalPickleValue: number | null;
  weeklyProfit: number | null;
  weeklyDistribution: number | null;
  nextDistribution: Date | null;
}

export function useDill(): UseDillOutput {
  const { blockNum, address } = Connection.useContainer();
  const { dill, feeDistributor } = Contracts.useContainer();
  const { prices } = Prices.useContainer();
  const { weeklyProfit, weeklyDistribution } = useProtocolIncome();
  const [lockedAmount, setLockedAmount] = useState<ethers.BigNumber | null>();
  const [lockEndDate, setLockEndDate] = useState<ethers.BigNumber | null>();
  const [balance, setBalance] = useState<ethers.BigNumber | null>();
  const [userClaimable, setUserClaimable] = useState<ethers.BigNumber | null>();
  const [totalSupply, setTotalSupply] = useState<ethers.BigNumber | null>(null);
  const [totalLocked, setTotalLocked] = useState<ethers.BigNumber | null>(null);
  const [lockedValue, setLockedValue] = useState<number | null>(null);
  const [totalPickleValue, setTotalPickleValue] = useState<number | null>(null);
  const [nextDistribution, setNextDistribution] = useState<Date | null>(null);

  useEffect(() => {
    if (dill && feeDistributor && address && prices) {
      const f = async () => {
        const dillContract = dill.attach(DILL);
        const feeDistributorContract = feeDistributor.attach(FEE_DISTRIBUTOR);

        const epochTime = 604800;
        const [
          lockStats,
          balance,
          totalSupply,
          totalLocked,
          userClaimable,
          timeCursor,
        ] = await Promise.all([
          dillContract.locked(address, { gasLimit: 1000000 }),
          dillContract["balanceOf(address)"](address, { gasLimit: 1000000 }),
          dillContract["totalSupply()"]({ gasLimit: 1000000 }),
          dillContract["supply()"]({ gasLimit: 1000000 }),
          feeDistributorContract.callStatic["claim(address)"](address, {
            gasLimit: 1000000,
          }),
          feeDistributorContract["time_cursor()"]({ gasLimit: 1000000 }),
        ]);

        const totalLockedValue =
          prices.pickle * parseFloat(ethers.utils.formatEther(totalSupply));

        const totalPickleValue =
          prices.pickle * parseFloat(ethers.utils.formatEther(totalLocked));

        const nextDistribution = new Date(
          timeCursor.add(epochTime).toNumber() * 1000,
        );

        setLockedAmount(lockStats?.amount);
        setLockEndDate(lockStats?.end);
        setBalance(balance);
        setTotalSupply(totalSupply);
        setTotalLocked(totalLocked);
        setLockedValue(totalLockedValue);
        setTotalPickleValue(totalPickleValue);
        setUserClaimable(userClaimable.toString() ? userClaimable : null);
        setNextDistribution(nextDistribution);
      };

      f();
    }
  }, [blockNum, address]);

  return {
    lockedAmount,
    lockEndDate,
    balance,
    userClaimable,
    totalSupply,
    totalLocked,
    lockedValue,
    totalPickleValue,
    weeklyProfit,
    weeklyDistribution,
    nextDistribution,
  };
}

export const Dill = createContainer(useDill);
