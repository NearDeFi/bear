import Decimal from "decimal.js";
import { executeBTCDepositAndAction } from "btc-wallet";
import { decimalMin, getBurrow } from "../../utils";
import { expandTokenDecimal } from "../helper";
import { NBTCTokenId, NBTC_ENV } from "../../utils/config";
import { ChangeMethodsToken } from "../../interfaces";
import { getTokenContract, getMetadata, prepareAndExecuteTokenTransactions } from "../tokens";
import getBalance from "../../api/get-balance";

export async function supply({
  tokenId,
  extraDecimals,
  useAsCollateral,
  amount,
  isMax,
  isMeme,
}: {
  tokenId: string;
  extraDecimals: number;
  useAsCollateral: boolean;
  amount: string;
  isMax: boolean;
  isMeme: boolean;
}): Promise<boolean | void> {
  const { account, logicContract, logicMEMEContract, hideModal, selector } = await getBurrow();
  const { decimals } = (await getMetadata(tokenId))!;
  const tokenContract = await getTokenContract(tokenId);
  const burrowContractId = isMeme ? logicMEMEContract.contractId : logicContract.contractId;
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
  const wallet = await selector.wallet();
  let result;
  console.log("wallet.id", wallet.id, tokenId);
  if (wallet.id == "btc-wallet" && tokenId === NBTCTokenId) {
    // @ts-ignore
    try {
      console.log("executeBTCDepositAndAction");
      result = executeBTCDepositAndAction({
        action: {
          receiver_id: burrowContractId,
          amount: expandedAmount.toFixed(0),
          msg: useAsCollateral ? JSON.stringify({ Execute: collateralActions }) : "",
        },
        env: NBTC_ENV,
        registerDeposit: "100000000000000000000000",
        pollResult: true,
      });
      console.log("result", result);
    } catch (error) {
      throw error;
      // if (hideModal) hideModal();
    }
  } else {
    console.log("prepareAndExecuteTokenTransactions");
    // @ts-ignore
    try {
      result = await prepareAndExecuteTokenTransactions(tokenContract, {
        methodName: ChangeMethodsToken[ChangeMethodsToken.ft_transfer_call],
        args: {
          receiver_id: burrowContractId,
          amount: expandedAmount.toFixed(0),
          msg: useAsCollateral ? JSON.stringify({ Execute: collateralActions }) : "",
        },
      });
    } catch (error) {
      throw error;
      // if (hideModal) hideModal();
    }
    console.log("result", result);
  }
  return true;
}
