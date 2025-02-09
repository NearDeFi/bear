import Decimal from "decimal.js";
import { executeBTCDepositAndAction } from "btc-wallet";
import { decimalMin, getBurrow } from "../../utils";
import { expandTokenDecimal } from "../helper";
import { NBTCTokenId } from "../../utils/config";
import { getTokenContract, getMetadata, prepareAndExecuteTokenTransactions } from "../tokens";
import getBalance from "../../api/get-balance";

export async function supply({
  tokenId,
  extraDecimals,
  useAsCollateral,
  amount,
  isMax,
}: {
  tokenId: string;
  extraDecimals: number;
  useAsCollateral: boolean;
  amount: string;
  isMax: boolean;
}): Promise<boolean> {
  const { account, logicContract } = await getBurrow();
  const { decimals } = (await getMetadata(tokenId))!;
  const tokenContract = await getTokenContract(tokenId);
  let expandedAmount;
  if (tokenId === NBTCTokenId) {
    expandedAmount = expandTokenDecimal(amount, decimals);
  } else {
    const tokenBalance = new Decimal(await getBalance(tokenId, account.accountId));
    expandedAmount = isMax
      ? tokenBalance
      : decimalMin(expandTokenDecimal(amount, decimals), tokenBalance);
  }
  const collateralAmount = expandTokenDecimal(expandedAmount, extraDecimals);
  const collateralActions = {
    actions: [
      {
        IncreaseCollateral: {
          token_id: tokenId,
          max_amount: collateralAmount.toFixed(0),
        },
      },
    ],
  };

  try {
    await executeBTCDepositAndAction({
      action: {
        receiver_id: logicContract.contractId,
        amount: expandedAmount.toFixed(0),
        msg: useAsCollateral ? JSON.stringify({ Execute: collateralActions }) : "",
      },
      isDev: true,
    });
  } catch (error) {
    throw error;
  }

  return true;
}
