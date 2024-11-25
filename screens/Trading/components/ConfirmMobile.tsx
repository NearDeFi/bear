import { useState, createContext, useMemo } from "react";
import { Modal as MUIModal, Box, useTheme } from "@mui/material";
import { BeatLoader } from "react-spinners";
import { useAppDispatch, useAppSelector } from "../../../redux/hooks";
import { Wrapper } from "../../../components/Modal/style";
import { DEFAULT_POSITION } from "../../../utils/config";
import { CloseIcon } from "../../../components/Modal/svg";
import { RefLogoIcon, RightShoulder } from "./TradingIcon";
import { toInternationalCurrencySystem_number, toDecimal } from "../../../utils/uiNumber";
import { openPosition } from "../../../store/marginActions/openPosition";
import { NearIcon, NearIconMini } from "../../MarginTrading/components/Icon";
import { useMarginConfigToken } from "../../../hooks/useMarginConfig";
import { useMarginAccount } from "../../../hooks/useMarginAccount";
import {
  YellowSolidSubmitButton as YellowSolidButton,
  RedSolidSubmitButton as RedSolidButton,
} from "../../../components/Modal/button";
import { shrinkToken } from "../../../store";
import { beautifyPrice } from "../../../utils/beautyNumbet";
import DataSource from "../../../data/datasource";
import { getAccountId } from "../../../redux/accountSelectors";
import { useRouterQuery } from "../../../utils/txhashContract";
import { handleTransactionHash } from "../../../services/transaction";

const getTokenSymbolOnly = (assetId) => {
  return assetId === "wNEAR" ? "NEAR" : assetId || "";
};

export const ModalContext = createContext(null) as any;
const ConfirmMobile = ({ open, onClose, action, confirmInfo }) => {
  const { query } = useRouterQuery();
  const accountId = useAppSelector(getAccountId);
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const [selectedCollateralType, setSelectedCollateralType] = useState(DEFAULT_POSITION);
  const { ReduxcategoryAssets1, ReduxcategoryAssets2 } = useAppSelector((state) => state.category);
  const actionShowRedColor = action === "Long";
  const [isDisabled, setIsDisabled] = useState(false);
  const { marginConfigTokens } = useMarginConfigToken();
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
  const cateSymbol = getTokenSymbolOnly(ReduxcategoryAssets1.metadata.symbol);
  const confirmOpenPosition = async () => {
    setIsDisabled(true);
    if (action === "Long") {
      try {
        await openPosition({
          token_c_amount: confirmInfo.longInput,
          token_c_id: confirmInfo.longInputName?.token_id,
          token_d_amount: confirmInfo.tokenInAmount,
          token_d_id: confirmInfo.longInputName?.token_id,
          token_p_id: confirmInfo.longOutputName?.token_id,
          min_token_p_amount: confirmInfo.estimateData.min_amount_out,
          swap_indication: confirmInfo.estimateData.swap_indication,
          assets: confirmInfo.assets.data,
        }).finally(async () => {
          setIsDisabled(false);
        });
      } catch (error) {
        // console.log(error);
        setIsDisabled(false);
      }
    } else {
      try {
        await openPosition({
          token_c_amount: confirmInfo.longInput,
          token_c_id: confirmInfo.longInputName?.token_id,
          token_d_amount: confirmInfo.tokenInAmount,
          token_d_id: confirmInfo.longOutputName?.token_id,
          token_p_id: confirmInfo.longInputName?.token_id,
          min_token_p_amount: confirmInfo.estimateData.min_amount_out,
          swap_indication: confirmInfo.estimateData.swap_indication,
          assets: confirmInfo.assets.data,
        }).finally(() => {
          setIsDisabled(false);
        });
      } catch (error) {
        // console.log(error);
        setIsDisabled(false);
      }
    }
  };

  const [percentList, setPercentList] = useState([]);
  useMemo(() => {
    if (confirmInfo.estimateData?.identicalRoutes) {
      const { identicalRoutes } = confirmInfo.estimateData;
      let sum = 0;
      const perArray = identicalRoutes.map((routes) => {
        const k = routes.reduce((pre, cur) => {
          return pre + (Number(cur.pool?.partialAmountIn) || 0);
        }, 0);
        sum += k; //
        return k;
      });

      const perStrArray = perArray.map((item) => ((item * 100) / sum).toFixed(2)); //
      setPercentList(perStrArray);
    }
  }, [confirmInfo.estimateData]);
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
                  {toInternationalCurrencySystem_number(confirmInfo.longInput)}{" "}
                  {confirmInfo.longInputName?.metadata.symbol}
                </p>
                <span className="text-xs text-gray-300">
                  ${toInternationalCurrencySystem_number(confirmInfo.longInputUsd)}
                </span>
              </div>
              <RightShoulder />
              <div className="text-center leading-3">
                <p className="text-lg">
                  {(+confirmInfo.longOutput).toFixed(6)}{" "}
                  {confirmInfo.longOutputName?.metadata.symbol === "wNEAR"
                    ? "NEAR"
                    : confirmInfo.longOutputName?.metadata.symbol}
                </p>
                <span className="text-xs text-gray-300">
                  {action} ${toInternationalCurrencySystem_number(confirmInfo.longOutputUsd)}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm mb-4">
              <div className="text-gray-300">Entry Price</div>
              {/* <div>${confirmInfo.entryPrice || "-"}</div> */}
              <div>
                $
                {beautifyPrice(
                  confirmInfo.tokenInAmount /
                    Number(shrinkToken(confirmInfo.estimateData?.min_amount_out, decimalsP)),
                )}
              </div>
            </div>

            {/* <div className="flex items-center justify-between text-sm mb-4">
              <div className="text-gray-300">Index Price</div>
              <div>${confirmInfo.indexPrice}</div>
            </div>

            <div className="flex items-center justify-between text-sm mb-4">
              <div className="text-gray-300">Leverage</div>
              <div>{confirmInfo.rangeMount}X</div>
            </div> */}
            <div className="flex items-center justify-between text-sm mb-4">
              <div className="text-gray-300">Collateral</div>
              <div className="text-right flex">
                {toInternationalCurrencySystem_number(confirmInfo.longInput)}{" "}
                {confirmInfo.longInputName?.metadata.symbol}
                <span className="text-xs text-gray-300 ml-1.5">
                  (${toInternationalCurrencySystem_number(confirmInfo.longInputUsd)})
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm mb-4">
              <div className="text-gray-300">Liq. Price</div>
              <div>${beautifyPrice(confirmInfo.LiqPrice)}</div>
            </div>
            <div className="flex items-baseline justify-between text-sm mb-4">
              <div className="text-gray-300 flex items-center">
                <RefLogoIcon />
                <span className="ml-2">Route</span>
              </div>
              <div className="flex flex-col justify-end">
                {confirmInfo.estimateData?.tokensPerRoute.map((item, index) => {
                  return (
                    <div key={index} className="flex mb-2 items-center">
                      {item.map((ite, ind) => {
                        return (
                          <>
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
                            <div key={ind} className="flex items-center">
                              <span>{ite.symbol === "wNEAR" ? "NEAR" : ite.symbol}</span>
                              {ind + 1 < confirmInfo.estimateData?.tokensPerRoute[index].length ? (
                                <span className="mx-2">&gt;</span>
                              ) : (
                                ""
                              )}
                            </div>
                          </>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
            {/* <div
              className={`flex items-center justify-between text-dark-200 text-base rounded-md h-12 text-center cursor-pointer ${
                actionShowRedColor ? "bg-primary" : "bg-red-50"
              }`}
            >
              <div onClick={confirmOpenPosition} className="flex-grow">
                Confirm {action} NEAR {confirmInfo.rangeMount}X
              </div>
            </div> */}

            {actionShowRedColor ? (
              <YellowSolidButton
                className="w-full"
                disabled={isDisabled}
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
                disabled={isDisabled}
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
