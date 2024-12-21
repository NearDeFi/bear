import React, { useState, createContext, useMemo, useEffect } from "react";
import { Modal as MUIModal, Box, useTheme } from "@mui/material";
import { BeatLoader } from "react-spinners";
import { useAppDispatch, useAppSelector } from "../../../redux/hooks";
import { Wrapper } from "../../../components/Modal/style";
import { DEFAULT_POSITION } from "../../../utils/config";
import { CloseIcon } from "../../../components/Modal/svg";
import { RightShoulder, MaxPositionIcon } from "./TradingIcon";
import { openPosition } from "../../../store/marginActions/openPosition";
import { useMarginConfigToken } from "../../../hooks/useMarginConfig";
import { useMarginAccount } from "../../../hooks/useMarginAccount";
import {
  YellowSolidSubmitButton as YellowSolidButton,
  RedSolidSubmitButton as RedSolidButton,
} from "../../../components/Modal/button";
import { shrinkToken, expandToken } from "../../../store";
import { beautifyPrice } from "../../../utils/beautyNumbet";
import { getAccountId } from "../../../redux/accountSelectors";
import { useRouterQuery } from "../../../utils/txhashContract";
import { handleTransactionResults, handleTransactionHash } from "../../../services/transaction";
import { showPositionFailure } from "../../../components/HashResultModal";
import { getBurrow } from "../../../utils";
import DataSource from "../../../data/datasource";

const getTokenSymbolOnly = (assetId) => {
  return assetId === "wNEAR" ? "NEAR" : assetId || "";
};

export const ModalContext = createContext(null) as any;
const ConfirmMobile = ({ open, onClose, action, confirmInfo }) => {
  const [burrowData, setBurrowData] = useState<{
    selector?: {
      wallet: () => Promise<{ id: string }>;
    };
  } | null>(null);

  useEffect(() => {
    const initBurrow = async () => {
      const data: any = await getBurrow();
      setBurrowData(data);
    };
    initBurrow();
  }, []);
  const { query } = useRouterQuery();
  const accountId = useAppSelector(getAccountId);
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const [selectedCollateralType, setSelectedCollateralType] = useState(DEFAULT_POSITION);
  const { ReduxcategoryAssets1, ReduxcategoryAssets2 } = useAppSelector((state) => state.category);
  const actionShowRedColor = action === "Long";
  const [isDisabled, setIsDisabled] = useState(false);
  const [isMinTokenPAmount, setIsMinTokenPAmount] = useState(false);
  const { marginConfigTokens, filterMarginConfigList } = useMarginConfigToken();
  const { max_active_user_margin_position, max_slippage_rate } = marginConfigTokens;
  const { marginAccountList, parseTokenValue, getAssetDetails, getAssetById } = useMarginAccount();
  const {
    price: priceP,
    symbol: symbolP,
    decimals: decimalsP,
  } = getAssetDetails(
    action === "Long"
      ? getAssetById(confirmInfo.longOutputName?.token_id)
      : getAssetById(confirmInfo.longInputName?.token_id),
  );
  const assetP = getAssetById(
    action === "Long" ? confirmInfo.longOutputName?.token_id : confirmInfo.longInputName?.token_id,
  );

  const cateSymbol = getTokenSymbolOnly(ReduxcategoryAssets1?.metadata?.symbol);

  const openPositionParams = {
    token_c_amount: confirmInfo.longInput,
    token_c_id: confirmInfo.longInputName?.token_id,
    token_d_amount: confirmInfo.tokenInAmount,
    token_d_id:
      action === "Long"
        ? confirmInfo.longInputName?.token_id
        : confirmInfo.longOutputName?.token_id,
    token_p_id:
      action === "Long"
        ? confirmInfo.longOutputName?.token_id
        : confirmInfo.longInputName?.token_id,
    min_token_p_amount:
      action === "Long"
        ? expandToken(
            confirmInfo.estimateData.min_amount_out,
            confirmInfo?.longOutputName?.config?.extra_decimals || 0,
            0,
          )
        : expandToken(
            confirmInfo.estimateData.min_amount_out,
            confirmInfo?.longInputName?.config?.extra_decimals || 0,
            0,
          ),
    swap_indication: confirmInfo.estimateData.swap_indication,
    assets: confirmInfo.assets.data,
  };
  console.log(openPositionParams, confirmInfo, assetP, "for nico confirmOpenPosition");

  const confirmOpenPosition = async () => {
    setIsDisabled(true);
    const { decimals: localDecimals } = getAssetDetails(
      getAssetById(
        action === "Long" ? openPositionParams.token_p_id : openPositionParams.token_d_id,
      ),
    );

    const minTokenPAmount = Number(shrinkToken(openPositionParams.min_token_p_amount, decimalsP));
    const tokenDAmount = openPositionParams.token_d_amount;
    const tokenDPrice = confirmInfo.assets.data[openPositionParams.token_d_id].price.usd;
    const tokenPPrice = confirmInfo.assets.data[openPositionParams.token_p_id].price.usd;
    const slippageRate = 1 - max_slippage_rate / 10000;
    const calculatedValue = ((tokenDAmount * tokenDPrice) / tokenPPrice) * slippageRate;

    if (!(minTokenPAmount >= calculatedValue)) {
      setIsDisabled(false);
      setIsMinTokenPAmount(true);
      return;
    }

    localStorage.setItem(
      "cateSymbolAndDecimals",
      JSON.stringify({
        cateSymbol,
        decimals: localDecimals,
        amount: confirmInfo.longOutput,
        totalPrice: confirmInfo.longOutputUsd,
      }),
    );

    const wallet = await burrowData?.selector?.wallet();
    if (wallet?.id && ["my-near-wallet", "mintbase-wallet", "bitte-wallet"].includes(wallet.id)) {
      return openPosition(openPositionParams);
    }

    try {
      const res: any = await openPosition(openPositionParams);
      if (!res || !Array.isArray(res)) {
        throw new Error("Invalid response from openPosition");
      }

      const transactionHashes = res.map((item) => {
        if (!item?.transaction?.hash) {
          throw new Error("Invalid transaction hash");
        }
        return item.transaction.hash;
      });
      const txHash = await handleTransactionHash(transactionHashes);
      txHash
        .filter((item) => !item.hasStorageDeposit)
        .forEach(async (item) => {
          try {
            await DataSource.shared.getMarginTradingPosition({
              addr: accountId,
              process_type: "open",
              tx_hash: item.txHash,
            });
          } catch (error) {
            console.error("Failed to get margin trading position:", error);
          }
        });

      await handleTransactionResults(
        transactionHashes,
        "",
        Object.keys(filterMarginConfigList || []),
      );
    } catch (error) {
      console.error("Open position error:", error);
      showPositionFailure({
        title: "Transactions error",
        errorMessage: error instanceof Error ? error?.message : JSON.stringify(error),
        type: action,
      });
    } finally {
      setIsDisabled(false);
      onClose();
    }
  };

  return (
    <MUIModal open={open} onClose={onClose}>
      <Wrapper
        sx={{
          "& *::-webkit-scrollbar": {
            backgroundColor: theme.custom.scrollbarBg,
          },
        }}
      >
        <ModalContext.Provider
          value={{
            position: selectedCollateralType,
          }}
        >
          <Box sx={{ p: ["20px", "20px"] }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center justify-center">
                <p className="text-lg mr-2">Confirm</p>
                <div
                  className={`bg-opacity-10  text-xs py-0.5 pl-2.5 pr-1.5 rounded ${
                    actionShowRedColor ? "bg-primary text-primary" : "bg-red-50 text-red-50"
                  }`}
                >
                  {action} {cateSymbol} {confirmInfo.rangeMount}X
                </div>
              </div>
              <div className="cursor-pointer">
                <CloseIcon onClick={onClose} />
              </div>
            </div>
            <div className="pt-10 pb-8 flex items-center justify-around  border-b border-dark-700 -mx-5 px-5 mb-5">
              <div className="text-center leading-3">
                <p className="text-lg">
                  {beautifyPrice(confirmInfo.longInput)}{" "}
                  {confirmInfo.longInputName?.metadata.symbol}
                </p>
                <span className="text-xs text-gray-300">
                  ${beautifyPrice(confirmInfo.longInputUsd)}
                </span>
              </div>
              <RightShoulder />
              <div className="text-center leading-3">
                <p className="text-lg">
                  {beautifyPrice(+confirmInfo.longOutput)}{" "}
                  {confirmInfo.longOutputName?.metadata.symbol === "wNEAR"
                    ? "NEAR"
                    : confirmInfo.longOutputName?.metadata.symbol}
                </p>
                <span className="text-xs text-gray-300">
                  {action} ${beautifyPrice(confirmInfo.longOutputUsd)}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm mb-4">
              <div className="text-gray-300">Entry Price</div>
              {/* <div>${confirmInfo.entryPrice || "-"}</div> */}
              <div>
                $
                {action === "Long"
                  ? beautifyPrice(
                      confirmInfo.tokenInAmount /
                        Number(
                          shrinkToken(
                            confirmInfo.estimateData?.min_amount_out,
                            assetP.metadata.decimals,
                          ),
                        ),
                    )
                  : beautifyPrice(
                      Number(
                        shrinkToken(
                          confirmInfo.estimateData?.min_amount_out,
                          assetP.metadata.decimals,
                        ),
                      ) / confirmInfo.tokenInAmount,
                    )}
              </div>
            </div>

            <div className="flex items-center justify-between text-sm mb-4">
              <div className="text-gray-300">Collateral</div>
              <div className="text-right flex">
                {beautifyPrice(confirmInfo.longInput)} {confirmInfo.longInputName?.metadata.symbol}
                <span className="text-xs text-gray-300 ml-1.5">
                  (${beautifyPrice(confirmInfo.longInputUsd)})
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm mb-4">
              <div className="text-gray-300">Liq. Price</div>
              <div>${beautifyPrice(confirmInfo.LiqPrice)}</div>
            </div>
            {/* <div className="flex items-baseline justify-between text-sm mb-4">
              <div className="text-gray-300 flex items-center">
                <RefLogoIcon />
                <span className="ml-2">Route</span>
              </div>
              <div className="flex flex-col justify-end">
                {confirmInfo.estimateData?.tokensPerRoute.map((item, index) => {
                  return (
                    <div key={index + item.symbol} className="flex mb-2 items-center">
                      {item.map((ite, ind) => {
                        return (
                          <React.Fragment key={`${index}-${ind}-${ite.symbol}`}>
                            {ind === 0 && (
                              <>
                                <div
                                  className={`bg-opacity-10  text-xs py-0.5 pl-2.5 pr-1.5 rounded ${
                                    actionShowRedColor
                                      ? "bg-primary text-primary"
                                      : "bg-red-50 text-red-50"
                                  }`}
                                >{`${percentList[index]}%`}</div>
                                <span className="mx-2">|</span>
                              </>
                            )}
                            <div className="flex items-center">
                              <span>{ite.symbol === "wNEAR" ? "NEAR" : ite.symbol}</span>
                              {ind + 1 < confirmInfo.estimateData?.tokensPerRoute[index].length ? (
                                <span className="mx-2">&gt;</span>
                              ) : (
                                ""
                              )}
                            </div>
                          </React.Fragment>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div> */}
            {isMinTokenPAmount && (
              <div className=" text-[#EA3F68] text-sm font-normal flex items-start mb-1">
                <MaxPositionIcon />
                <span className="ml-1">
                  Unable to place order, Oracle is abnormal or Ref liquidity is insufficient.
                </span>
              </div>
            )}

            {actionShowRedColor ? (
              <YellowSolidButton
                className="w-full"
                disabled={isDisabled || isMinTokenPAmount}
                onClick={confirmOpenPosition}
              >
                {isDisabled ? (
                  <BeatLoader size={5} color="#14162B" />
                ) : (
                  ` Confirm ${action} ${cateSymbol} ${confirmInfo.rangeMount}X`
                )}
              </YellowSolidButton>
            ) : (
              <RedSolidButton
                className="w-full"
                disabled={isDisabled || isMinTokenPAmount}
                onClick={confirmOpenPosition}
              >
                {isDisabled ? (
                  <BeatLoader size={5} color="#14162B" />
                ) : (
                  ` Confirm ${action} ${cateSymbol} ${confirmInfo.rangeMount}X`
                )}
              </RedSolidButton>
            )}
          </Box>
        </ModalContext.Provider>
      </Wrapper>
    </MUIModal>
  );
};

export default ConfirmMobile;
