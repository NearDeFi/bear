import { useEffect, useState } from "react";
import Decimal from "decimal.js";
import { init_env } from "@ref-finance/ref-sdk";
import { useV1EstimateSwap } from "./useV1EstimateSwap";
import { useDclEstimateSwap } from "./useDclEstimateSwap";
import { IEstimateResult } from "../interfaces";

init_env("dev");
export const useEstimateSwap = ({
  tokenIn_id,
  tokenOut_id,
  tokenIn_amount,
  slippageTolerance,
  account_id,
  simplePools,
  stablePools,
  stablePoolsDetail,
}: {
  tokenIn_id: string;
  tokenOut_id: string;
  tokenIn_amount: string;
  slippageTolerance: number;
  account_id?: string;
  simplePools: any[];
  stablePools: any[];
  stablePoolsDetail: any[];
}) => {
  const [estimateResult, setEstimateResult] = useState<IEstimateResult>();
  const dclEstimateResult = useDclEstimateSwap({
    tokenIn_id,
    tokenOut_id,
    tokenIn_amount,
    slippageTolerance,
  });
  const v1EstimateResult = useV1EstimateSwap({
    tokenIn_id,
    tokenOut_id,
    tokenIn_amount,
    slippageTolerance,
    account_id,
    simplePools,
    stablePools,
    stablePoolsDetail,
  });
  useEffect(() => {
    if (dclEstimateResult?.tag && v1EstimateResult?.tag && validator()) {
      getBestEstimateResult();
    }
  }, [dclEstimateResult?.tag, v1EstimateResult?.tag]);
  function getBestEstimateResult() {
    const { amount_out: dcl_amount_out } = dclEstimateResult!;
    const { amount_out: v1_amount_out } = v1EstimateResult!;
    // best is v1
    if (new Decimal(v1_amount_out || 0).gt(dcl_amount_out || 0)) {
      setEstimateResult(v1EstimateResult);
    } else if (new Decimal(dcl_amount_out || 0).gt(v1_amount_out || 0)) {
      // best is dcl
      setEstimateResult(dclEstimateResult);
    }
  }
  function validator() {
    if (dclEstimateResult?.tag && v1EstimateResult?.tag) {
      const dclTag = dclEstimateResult.tag;
      const v1Tag = v1EstimateResult.tag;
      const [v1InId, v1OutId, v1InAmount] = v1Tag.split("@");
      const [dclInId, dclOutId, dclInAmount] = dclTag.split("@");
      return (
        v1InId == tokenIn_id &&
        v1OutId == tokenOut_id &&
        v1InAmount == tokenIn_amount &&
        dclInId == tokenIn_id &&
        dclOutId == tokenOut_id &&
        dclInAmount == tokenIn_amount
      );
    }
    return false;
  }
  return estimateResult;
};
