import BN from "bn.js";
import Decimal from "decimal.js";

import { decimalMax, decimalMin, getBurrow, nearTokenId } from "../../utils";
import { expandToken, expandTokenDecimal } from "../helper";
import { ChangeMethodsLogic, ChangeMethodsOracle, ChangeMethodsToken } from "../../interfaces";
import { getTokenContract, prepareAndExecuteTransactions } from "../tokens";
import { ChangeMethodsNearToken } from "../../interfaces/contract-methods";
import { Transaction, isRegistered } from "../wallet";
import { NEAR_DECIMALS, NO_STORAGE_DEPOSIT_CONTRACTS, NEAR_STORAGE_DEPOSIT } from "../constants";
import getAssets from "../../api/get-assets";
import { transformAssets } from "../../transformers/asstets";
import getAccount from "../../api/get-account";
import { transformAccount } from "../../transformers/account";
import { computeWithdrawMaxAmount } from "../../redux/selectors/getWithdrawMaxAmount";
import getConfig from "../../utils/config";
import { shadow_action_withdraw } from "./shadow";
import { store } from "../../redux/store";

const { SPECIAL_REGISTRATION_TOKEN_IDS } = getConfig() as any;
interface Props {
  tokenId: string;
  extraDecimals: number;
  amount: string;
  isMax: boolean;
  isMeme: boolean;
}

export async function withdraw({ tokenId, extraDecimals, amount, isMax, isMeme }: Props) {
  const state = store.getState();
  const { oracleContract, logicContract, memeOracleContract, logicMEMEContract } =
    await getBurrow();
  let assets;
  let account;
  let enable_pyth_oracle;
  let logicContractId;
  let oracleContractId;
  if (isMeme) {
    assets = state.assetsMEME.data;
    account = state.accountMEME;
    enable_pyth_oracle = state.appMEME.config.enable_pyth_oracle;
    logicContractId = logicMEMEContract.contractId;
    oracleContractId = memeOracleContract.contractId;
  } else {
    assets = state.assets.data;
    account = state.account;
    enable_pyth_oracle = state.app.config.enable_pyth_oracle;
    logicContractId = logicContract.contractId;
    oracleContractId = oracleContract.contractId;
  }
  // const assets = await getAssets().then(transformAssets);
  // const account = await getAccount().then(transformAccount);
  if (!account) return;
  const asset = assets[tokenId];
  const { decimals } = asset.metadata;
  const isNEAR = tokenId === nearTokenId;
  const { isLpToken } = asset;
  const suppliedBalance = new Decimal(account.portfolio?.supplied[tokenId]?.balance || 0);
  const maxAmount = computeWithdrawMaxAmount(tokenId, assets, account.portfolio!);

  const expandedAmount = isMax
    ? maxAmount
    : decimalMin(maxAmount, expandTokenDecimal(amount, decimals + extraDecimals));

  const transactions: Transaction[] = [];
  const decreaseCollateralAmount = decimalMax(expandedAmount.sub(suppliedBalance), 0);
  if (isLpToken) {
    shadow_action_withdraw({
      tokenId,
      expandAmount: expandedAmount.toFixed(0),
      isMax,
      decreaseCollateralAmount,
      enable_pyth_oracle,
    });
  } else {
    const tokenContract = await getTokenContract(tokenId);
    if (
      !(await isRegistered(account.accountId, tokenContract.contractId)) &&
      !NO_STORAGE_DEPOSIT_CONTRACTS.includes(tokenContract.contractId)
    ) {
      transactions.push({
        receiverId: tokenContract.contractId,
        functionCalls: [
          {
            methodName: ChangeMethodsToken[ChangeMethodsToken.storage_deposit],
            attachedDeposit: new BN(expandToken(NEAR_STORAGE_DEPOSIT, NEAR_DECIMALS)),
          },
        ],
      });
    }

    const withdrawAction = {
      Withdraw: {
        token_id: tokenId,
        max_amount: !isMax ? expandedAmount.toFixed(0) : undefined,
      },
    };
    if (decreaseCollateralAmount.gt(0)) {
      transactions.push({
        receiverId: enable_pyth_oracle ? logicContractId : oracleContractId,
        functionCalls: [
          {
            methodName: enable_pyth_oracle
              ? ChangeMethodsLogic[ChangeMethodsLogic.execute_with_pyth]
              : ChangeMethodsOracle[ChangeMethodsOracle.oracle_call],
            gas: new BN("300000000000000"),
            args: enable_pyth_oracle
              ? {
                  actions: [
                    {
                      DecreaseCollateral: {
                        token_id: tokenId,
                        amount: decreaseCollateralAmount.toFixed(0),
                      },
                    },
                    withdrawAction,
                  ],
                }
              : {
                  receiver_id: logicContractId,
                  msg: JSON.stringify({
                    Execute: {
                      actions: [
                        {
                          DecreaseCollateral: {
                            token_id: tokenId,
                            amount: decreaseCollateralAmount.toFixed(0),
                          },
                        },
                        withdrawAction,
                      ],
                    },
                  }),
                },
          },
        ],
      });
    } else {
      transactions.push({
        receiverId: logicContractId,
        functionCalls: [
          {
            methodName: ChangeMethodsLogic[ChangeMethodsLogic.execute],
            args: {
              actions: [withdrawAction],
            },
          },
        ],
      });
    }
    // 10 yocto is for rounding errors.
    if (isNEAR && expandedAmount.gt(10)) {
      transactions.push({
        receiverId: tokenContract.contractId,
        functionCalls: [
          {
            methodName: ChangeMethodsNearToken[ChangeMethodsNearToken.near_withdraw],
            args: {
              amount: expandedAmount.sub(10).toFixed(0),
            },
          },
        ],
      });
    }
    await prepareAndExecuteTransactions(transactions);
  }
}
