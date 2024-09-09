import BN from "bn.js";
import { getBurrow } from "../../utils";
import { expandTokenDecimal } from "../helper";
import { ChangeMethodsLogic, ChangeMethodsOracle } from "../../interfaces";
import { Transaction } from "../wallet";
import { prepareAndExecuteTransactions } from "../tokens";
import { Assets } from "../../redux/assetState";
import getConfig from "../../api/get-config";

export async function decreaseCollateral({
  pos_id,
  token_c_id,
  amount,
  assets,
}: {
  pos_id: string;
  token_c_id: string;
  amount: string;
  assets: Assets;
}) {
  const { logicContract, oracleContract } = await getBurrow();
  const { enable_pyth_oracle } = await getConfig();
  const transactions: Transaction[] = [];
  const expanded_c_amount = expandTokenDecimal(
    amount,
    assets[token_c_id].metadata.decimals + assets[token_c_id].config.extra_decimals,
  );
  const decreaseCollateralTemplate = {
    actions: [
      {
        DecreaseCollateral: {
          pos_id,
          amount: expanded_c_amount.toFixed(0),
        },
      },
    ],
  };
  transactions.push({
    receiverId: enable_pyth_oracle ? logicContract.contractId : oracleContract.contractId,
    functionCalls: [
      {
        methodName: enable_pyth_oracle
          ? ChangeMethodsLogic[ChangeMethodsLogic.margin_execute_with_pyth]
          : ChangeMethodsOracle[ChangeMethodsOracle.oracle_call],
        args: {
          ...(enable_pyth_oracle
            ? decreaseCollateralTemplate
            : {
                receiver_id: logicContract.contractId,
                msg: JSON.stringify({
                  MarginExecute: decreaseCollateralTemplate,
                }),
              }),
        },
        gas: new BN("300000000000000"),
      },
    ],
  });
  const withDrawActionsTemplate = {
    actions: [
      {
        Withdraw: {
          token_id: token_c_id,
        },
      },
    ],
  };
  transactions.push({
    receiverId: enable_pyth_oracle ? logicContract.contractId : oracleContract.contractId,
    functionCalls: [
      {
        methodName: enable_pyth_oracle
          ? ChangeMethodsLogic[ChangeMethodsLogic.margin_execute_with_pyth]
          : ChangeMethodsOracle[ChangeMethodsOracle.oracle_call],
        args: {
          ...(enable_pyth_oracle
            ? withDrawActionsTemplate
            : {
                receiver_id: logicContract.contractId,
                msg: JSON.stringify({
                  MarginExecute: withDrawActionsTemplate,
                }),
              }),
        },
        gas: new BN("300000000000000"),
      },
    ],
  });
  await prepareAndExecuteTransactions(transactions);
}
