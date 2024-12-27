import { shrinkToken } from "../store";
import { getTransactionResult, parsedArgs } from "../utils/txhashContract";
import {
  showPositionResult,
  showPositionClose,
  showPositionFailure,
  showChangeCollateralPosition,
} from "../components/HashResultModal";
import { useMarginConfigToken } from "../hooks/useMarginConfig";

interface TransactionResult {
  txHash: string;
  result: any;
  hasStorageDeposit: boolean;
  hasStorageDepositClosePosition?: boolean;
}

export const handleTransactionResults = async (
  transactionHashes: string | string[] | undefined,
  errorMessage?: string | string[],
  cate1?: Array<string>,
) => {
  if (transactionHashes) {
    try {
      const txhash = Array.isArray(transactionHashes)
        ? transactionHashes
        : transactionHashes.split(",");

      const results = await Promise.all(
        txhash.map(async (txHash: string): Promise<TransactionResult> => {
          const result: any = await getTransactionResult(txHash);
          const hasStorageDeposit = result.transaction.actions.some(
            (action: any) => action?.FunctionCall?.method_name === "margin_execute_with_pyth",
          );
          return { txHash, result, hasStorageDeposit };
        }),
      );

      const shouldShowClose = results.some(({ result, hasStorageDeposit }: TransactionResult) => {
        if (hasStorageDeposit) {
          const args = parsedArgs(result?.transaction?.actions?.[0]?.FunctionCall?.args || "");
          const { actions } = JSON.parse(args || "");
          return actions[0]?.CloseMTPosition;
        }
        return false;
      });

      if (shouldShowClose) {
        const marginPopType = localStorage.getItem("marginPopType") as "Long" | "Short" | undefined;
        showPositionClose({ type: marginPopType || "Long" });
        return;
      }

      results.forEach(({ result, hasStorageDeposit }: TransactionResult) => {
        const marginTransactionType = localStorage.getItem("marginTransactionType");
        if (marginTransactionType === "changeCollateral") {
          const collateralInfo = JSON.parse(localStorage.getItem("collateralInfo") || "{}");
          showChangeCollateralPosition({
            title: "Change Collateral",
            icon: collateralInfo.iconC,
            type: collateralInfo.positionType,
            symbol: collateralInfo.symbol,
            collateral: collateralInfo.addedValue,
          });
          // localStorage.removeItem("marginTransactionType");
          return;
        }
        if (hasStorageDeposit) {
          const args = parsedArgs(result?.transaction?.actions?.[0]?.FunctionCall?.args || "");
          const { actions } = JSON.parse(args || "");
          console.log(actions, "actions....");
          const isLong = cate1?.includes(actions[0]?.OpenPosition?.token_p_id);
          const cateSymbolAndDecimals = JSON.parse(
            localStorage.getItem("cateSymbolAndDecimals") || "{}",
          );
          showPositionResult({
            title: "Open Position",
            type: isLong ? "Long" : "Short",
            transactionHashes: txhash[0],
            positionSize: {
              amount: cateSymbolAndDecimals?.amount || "",
              totalPrice: cateSymbolAndDecimals?.totalPrice || "",
              symbol: cateSymbolAndDecimals?.cateSymbol || "NEAR",
              entryPrice: cateSymbolAndDecimals?.entryPrice || "0",
            },
          });
        }
      });
    } catch (error) {
      console.error("Error processing transactions:", error);
    }
  }

  if (errorMessage) {
    showPositionFailure({
      title: "Transactions error",
      errorMessage: decodeURIComponent(errorMessage as string),
    });
  }
};

export const handleTransactionHash = async (
  transactionHashes: string | string[] | undefined,
  errorMessage?: string | string[],
): Promise<TransactionResult[]> => {
  if (transactionHashes) {
    try {
      const txhash = Array.isArray(transactionHashes)
        ? transactionHashes
        : transactionHashes.split(",");

      const results = await Promise.all(
        txhash.map(async (txHash: string): Promise<TransactionResult> => {
          const result: any = await getTransactionResult(txHash);
          let hasStorageDeposit = false;
          let hasStorageDepositClosePosition = false;

          const isMarginExecute = result.transaction.actions.some(
            (action: any) => action?.FunctionCall?.method_name === "margin_execute_with_pyth",
          );

          if (isMarginExecute) {
            const args = parsedArgs(result?.transaction?.actions?.[0]?.FunctionCall?.args || "");
            const { actions } = JSON.parse(args || "");
            hasStorageDeposit = Reflect.has(actions[0], "OpenPosition");
            hasStorageDepositClosePosition = Reflect.has(actions[0], "CloseMTPosition");
          }

          return { txHash, result, hasStorageDeposit, hasStorageDepositClosePosition };
        }),
      );
      return results;
    } catch (error) {
      console.error("Error processing transactions:", error);
      return [];
    }
  }
  return [];
};
