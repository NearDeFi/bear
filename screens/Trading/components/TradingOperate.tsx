import React, { useMemo, useState, useEffect } from "react";
import _ from "lodash";
import TradingToken from "./tokenbox";
import { RefLogoIcon, SetUp, ShrinkArrow, errorTipsIcon } from "./TradingIcon";
import { useAppDispatch, useAppSelector } from "../../../redux/hooks";
import RangeSlider from "./RangeSlider";
import ConfirmMobile from "./ConfirmMobile";
import { getAccountBalance, getAccountId } from "../../../redux/accountSelectors";
import { getAssets } from "../../../redux/assetsSelectors";
import { useMarginConfigToken } from "../../../hooks/useMarginConfig";
import { usePoolsData } from "../../../hooks/useGetPoolsData";
import { getMarginConfig } from "../../../redux/marginConfigSelectors";
import { toInternationalCurrencySystem_number, toDecimal } from "../../../utils/uiNumber";
import { useEstimateSwap } from "../../../hooks/useEstimateSwap";
import { NearIcon, NearIconMini } from "../../MarginTrading/components/Icon";
import { setSlippageToleranceFromRedux } from "../../../redux/marginTrading";
import { useMarginAccount } from "../../../hooks/useMarginAccount";

// main components
const TradingOperate = () => {
  const assets = useAppSelector(getAssets);
  const config = useAppSelector(getMarginConfig);
  const { categoryAssets1, categoryAssets2 } = useMarginConfigToken();
  const { parseTokenValue, getAssetDetails, getAssetById } = useMarginAccount();
  const { marginConfigTokens } = useMarginConfigToken();
  const {
    ReduxcategoryAssets1,
    ReduxcategoryAssets2,
    ReduxcategoryCurrentBalance1,
    ReduxcategoryCurrentBalance2,
    ReduxSlippageTolerance,
  } = useAppSelector((state) => state.category);

  const dispatch = useAppDispatch();
  const [activeTab, setActiveTab] = useState("long");

  // for slip
  // const [showSetUpPopup, setShowSetUpPopup] = useState(false);

  const [selectedSetUpOption, setSelectedSetUpOption] = useState("auto");
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [rangeMount, setRangeMount] = useState(1);
  const [isDisabled, setIsDisabled] = useState(false);

  //
  const [longInput, setLongInput] = useState();
  const [shortInput, setShortInput] = useState();
  const [longOutput, setLongOutput] = useState();
  const [shortOutput, setShortOutput] = useState();

  // amount
  const [longInputUsd, setLongInputUsd] = useState(0);
  const [longOutputUsd, setLongOutputUsd] = useState(0);
  const [shortInputUsd, setShortInputUsd] = useState(0);
  const [shortOutputUsd, setShortOutputUsd] = useState(0);

  //
  const balance = useAppSelector(getAccountBalance);
  const accountId = useAppSelector(getAccountId);

  // pools
  const { simplePools, stablePools, stablePoolsDetail } = usePoolsData();

  const setOwnBanlance = (key) => {
    if (activeTab == "long") {
      setLongInput(key);
    } else {
      setShortInput(key);
    }
  };

  // for tab change
  const initCateState = (tabString) => {
    setRangeMount(1);
    if (tabString == "long") {
      setShortInput(undefined);
      setShortInputUsd(0);
      setShortOutput(undefined);
      setShortOutputUsd(0);
    } else {
      setLongInput(undefined);
      setLongInputUsd(0);
      setLongOutput(undefined);
      setLongOutputUsd(0);
    }
  };
  // tab click event
  const handleTabClick = (tabString) => {
    setActiveTab(tabString);
    initCateState(tabString);
  };

  const getTabClassName = (tabName) => {
    return activeTab === tabName
      ? "bg-primary text-dark-200 py-2.5 pl-6 pr-8 rounded-md"
      : "text-gray-300 py-2.5 pl-8 pr-10";
  };

  // mouse leave and enter event for slip
  // let timer;
  // const handleMouseEnter = () => {
  //   clearTimeout(timer);
  //   setShowSetUpPopup(true);
  // };
  // const handleMouseLeave = () => {
  //   clearTimeout(timer);
  //   timer = setTimeout(() => {
  //     setShowSetUpPopup(false);
  //   }, 200);
  // };

  // slippageTolerance change ecent
  useEffect(() => {
    dispatch(setSlippageToleranceFromRedux(0.5));
  }, []);
  const [slippageTolerance, setSlippageTolerance] = useState(0.5);
  const handleSetUpOptionClick = (option) => {
    setSelectedSetUpOption(option);
    if (option == "auto") {
      setSlippageTolerance(0.5);
      dispatch(setSlippageToleranceFromRedux(0.5));
    }
  };
  const slippageToleranceChange = (e) => {
    setSlippageTolerance(e);
    dispatch(setSlippageToleranceFromRedux(e));
  };

  // open position btn click eve.
  const handleConfirmButtonClick = () => {
    if (isDisabled) return;
    setIsConfirmModalOpen(true);
  };

  // condition btn iswhether disabled
  useEffect(() => {
    const setDisableBasedOnInputs = () => {
      const currentBalance2 = Number(ReduxcategoryCurrentBalance2) || 0;

      const inputValue = activeTab === "long" ? longInput : shortInput;

      const isValidInput = isValidDecimalString(inputValue);

      setIsDisabled(!isValidInput || !(Number(inputValue) <= currentBalance2));
    };
    setDisableBasedOnInputs();
  }, [activeTab, ReduxcategoryCurrentBalance2, longInput, shortInput]);

  const isValidDecimalString = (str) => {
    if (str <= 0) return false;
    // const regex = /^(?![0]+$)\d+(\.\d+)?$/;
    const regex = /^\d+(\.\d+)?$/;
    return regex.test(str);
  };
  // pools end

  // get cate1 amount start
  const [tokenInAmount, setTokenInAmount] = useState(0);
  const [LiqPrice, setLiqPrice] = useState(0);
  const estimateData = useEstimateSwap({
    tokenIn_id:
      activeTab == "long" ? ReduxcategoryAssets2?.token_id : ReduxcategoryAssets1?.token_id,
    tokenOut_id:
      activeTab == "long" ? ReduxcategoryAssets1?.token_id : ReduxcategoryAssets2?.token_id,
    tokenIn_amount: toDecimal(tokenInAmount),
    account_id: accountId,
    simplePools,
    stablePools,
    stablePoolsDetail,
    slippageTolerance: slippageTolerance / 100,
  });
  // long & short input change fn.
  const inputPriceChange = _.debounce((newValue) => {
    // eslint-disable-next-line no-unused-expressions
    activeTab === "long" ? setLongInput(newValue) : setShortInput(newValue);
  }, 50);

  /**
   * longInput shortInput deal start
   *  */
  useEffect(() => {
    const inputUsdCharcate1 = getAssetPrice(ReduxcategoryAssets1);
    const inputUsdCharcate2 = getAssetPrice(ReduxcategoryAssets2);

    if (inputUsdCharcate1 && estimateData) {
      updateOutput(activeTab, inputUsdCharcate1);
    }

    if (inputUsdCharcate2) {
      updateInputAmounts(activeTab, inputUsdCharcate2, inputUsdCharcate1);
    }

    if (ReduxcategoryAssets2 && ReduxcategoryAssets1) {
      const assetC = getAssetById(ReduxcategoryAssets2?.token_id);
      const assetD =
        activeTab == "long"
          ? getAssetById(ReduxcategoryAssets2?.token_id)
          : getAssetById(ReduxcategoryAssets1?.token_id);
      const assetP =
        activeTab == "long"
          ? getAssetById(ReduxcategoryAssets1?.token_id)
          : getAssetById(ReduxcategoryAssets2?.token_id);

      const { price: priceD, symbol: symbolD, decimals: decimalsD } = getAssetDetails(assetD);
      const { price: priceC, symbol: symbolC, decimals: decimalsC } = getAssetDetails(assetC);
      const { price: priceP, symbol: symbolP, decimals: decimalsP } = getAssetDetails(assetP);

      const leverageC = parseTokenValue(ReduxcategoryAssets2.margin_debt.balance, decimalsC);
      const leverageD =
        activeTab == "long"
          ? parseTokenValue(ReduxcategoryAssets2.margin_debt.balance, decimalsD)
          : parseTokenValue(ReduxcategoryAssets1.margin_debt.balance, decimalsD);

      const sizeValueLong = inputUsdCharcate1
        ? inputUsdCharcate1 * (estimateData?.amount_out || 0)
        : 0;
      const total_debt = leverageD * priceD;
      const total_hp_fee = 0;
      const denominator = sizeValueLong * (1 - marginConfigTokens.min_safty_buffer / 10000);
      //

      setLiqPrice(
        denominator !== 0
          ? (total_debt +
              total_hp_fee +
              (priceC * leverageC * marginConfigTokens.min_safty_buffer) / 10000 -
              priceC * leverageC) /
              denominator
          : 0,
      );
    }
  }, [longInput, shortInput, rangeMount, estimateData, slippageTolerance]);

  function getAssetPrice(categoryId) {
    return categoryId ? assets.data[categoryId["token_id"]].price?.usd : 0;
  }

  function updateOutput(tab, inputUsdCharcate) {
    /**
     * @param inputUsdCharcate  category1 current price
     */
    const input = tab === "long" ? longInput : shortInput;
    const inputUsd = tab === "long" ? longInputUsd : shortInputUsd;
    // set output
    const outputSetter = tab === "long" ? setLongOutput : setShortOutput;
    // set output usd
    const outputUsdSetter = tab === "long" ? setLongOutputUsd : setShortOutputUsd;
    //
    if (input == undefined || inputUsd == 0) {
      outputSetter(undefined);
      outputUsdSetter(0);
    } else if (tab == "long") {
      outputSetter(estimateData?.amount_out || 0);
      outputUsdSetter(inputUsdCharcate * (estimateData.amount_out || 0));
    } else if (tab == "short") {
      outputSetter(tokenInAmount as any);
      outputUsdSetter(inputUsdCharcate * tokenInAmount);
    }
  }

  function updateInputAmounts(tab, inputUsdCharcate2, inputUsdCharcate1) {
    /**
     * @param inputUsdCharcate2  category2 current price
     */
    const input = tab === "long" ? longInput : shortInput;
    const inputAmount = input ? Number(input) : 0;
    const openFeeAmount = (inputAmount * config.open_position_fee_rate) / 10000;
    const adjustedInputAmount = (inputAmount - openFeeAmount) * inputUsdCharcate2 * rangeMount;

    const inputUsdSetter = tab === "long" ? setLongInputUsd : setShortInputUsd;

    // set input usd
    inputUsdSetter(inputUsdCharcate2 * inputAmount);

    if (tab === "long") {
      setTokenInAmount(adjustedInputAmount / inputUsdCharcate2);
    } else {
      setTokenInAmount(adjustedInputAmount / inputUsdCharcate1);
    }
  }

  // end

  return (
    <div className="w-full pt-4 px-4 pb-9">
      <div className="flex justify-between items-center">
        <div className="flex bg-dark-200 px-0.5 py-0.5 rounded-md cursor-pointer mr-3">
          <div className={getTabClassName("long")} onClick={() => handleTabClick("long")}>
            Long NEAR
          </div>
          <div
            className={
              activeTab === "short"
                ? "bg-red-50 text-dark-200 py-2.5 pl-6 pr-8 rounded-md"
                : getTabClassName("short")
            }
            onClick={() => handleTabClick("short")}
          >
            Short NEAR
          </div>
        </div>
        {/* slip start */}
        <div className="relative z-40 cursor-pointer slip-fater">
          <SetUp />

          <div className="slip-child absolute top-8 right-0 bg-dark-250 border border-dark-500 rounded-md py-6 px-4">
            <p className="text-base mb-6">Max. Slippage Setting</p>
            <div className="flex items-center justify-between h-10">
              <div className="bg-dark-200 p-1 rounded-md flex items-center mr-3.5">
                <div
                  className={`py-2 px-5 ${
                    selectedSetUpOption === "auto" ? "bg-gray-400 rounded " : ""
                  }`}
                  onClick={() => handleSetUpOptionClick("auto")}
                >
                  Auto
                </div>
                <div
                  className={`py-2 px-5 ${
                    selectedSetUpOption === "custom" ? "bg-gray-400 rounded " : ""
                  }`}
                  onClick={() => handleSetUpOptionClick("custom")}
                >
                  Custom
                </div>
              </div>
              <div className="bg-dark-600 rounded-md py-2.5 px-4 flex items-center justify-between">
                <input
                  disabled={selectedSetUpOption === "auto"}
                  type="number"
                  onChange={(e) => slippageToleranceChange(e.target.value)}
                  value={slippageTolerance}
                  style={{ width: "32px" }}
                  className={selectedSetUpOption === "auto" ? "text-gray-700" : "text-white"}
                />
                <div className={selectedSetUpOption === "auto" ? "text-gray-700" : "text-white"}>
                  %
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* slip end */}
      </div>
      <div className="mt-5">
        {activeTab === "long" && (
          <>
            <div className="relative bg-dark-600 border border-dark-500 pt-3 pb-2.5 pr-3 pl-2.5 rounded-md z-30">
              <input
                onChange={(e) => inputPriceChange(e.target.value)}
                type="number"
                value={longInput}
                placeholder="0"
              />
              <div className="absolute top-2 right-2">
                <TradingToken
                  setOwnBanlance={setOwnBanlance}
                  tokenList={categoryAssets2}
                  type="cate2"
                />
              </div>
              <p className="text-gray-300 mt-2 text-xs">Usd: ${longInputUsd}</p>
            </div>
            <div className="relative my-2.5 flex justify-end z-0 w-1/2" style={{ zoom: "2" }}>
              <ShrinkArrow />
            </div>
            <div className="relative bg-dark-600 border border-dark-500 pt-3 pb-2.5 pr-3 pl-2.5 rounded-md z-20">
              {/* long out  */}
              <input disabled type="text" value={longOutput} placeholder="0" />
              {/*  */}
              <div className="absolute top-2 right-2">
                <TradingToken tokenList={categoryAssets1} type="cate1" />
              </div>
              <p className="text-gray-300 mt-2 text-xs">Long: ${longOutputUsd}</p>
            </div>
            <RangeSlider defaultValue={rangeMount} action="Long" setRangeMount={setRangeMount} />
            <div className="mt-5">
              <div className="flex items-center justify-between text-sm mb-4">
                <div className="text-gray-300">Position Size</div>
                <div className="text-right">
                  {toInternationalCurrencySystem_number(longOutput)} NEAR
                  <span className="text-xs text-gray-300 ml-1.5">
                    (${toInternationalCurrencySystem_number(longOutputUsd)})
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm mb-4">
                <div className="text-gray-300">Liq. Price</div>
                <div>${toInternationalCurrencySystem_number(LiqPrice)}</div>
              </div>
              <div className="flex items-center justify-between text-sm mb-4">
                <div className="text-gray-300">Fee</div>
                <div className="flex items-center justify-center">
                  <p className="border-b border-dashed border-dark-800">0.26</p>
                  NEAR
                  <span className="text-xs text-gray-300 ml-1.5">($0.89)</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm mb-4">
                <div className="text-gray-300">Route</div>
                <div className="flex items-center justify-center">
                  {estimateData?.tokensPerRoute[0].map((item, index) => {
                    return (
                      <div key={index} className="flex items-center">
                        <div className="border-r mr-1.5 pr-1.5 border-dark-800">
                          {item.symbol === "wNEAR" ? (
                            <NearIconMini />
                          ) : (
                            <img alt="" src={item.icon} style={{ width: "16px", height: "16px" }} />
                          )}
                        </div>
                        <span>{item.symbol == "wNEAR" ? "NEAR" : item.symbol}</span>
                        {index + 1 < estimateData?.tokensPerRoute[0].length ? (
                          <span className="mx-2">&gt;</span>
                        ) : (
                          ""
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className=" text-red-150 text-xs font-normal">{estimateData?.swapError}</div>
              <div
                className={`flex items-center justify-between  text-dark-200 text-base rounded-md h-12 text-center  ${
                  isDisabled ? "bg-slate-700 cursor-default" : "bg-primary cursor-pointer"
                }`}
                onClick={handleConfirmButtonClick}
              >
                <div className="flex-grow">Long NEAR {rangeMount}x</div>
              </div>
              {isConfirmModalOpen && (
                <ConfirmMobile
                  open={isConfirmModalOpen}
                  onClose={() => setIsConfirmModalOpen(false)}
                  action="Long"
                  confirmInfo={{
                    longInput,
                    longInputUsd,
                    longOutput,
                    longOutputUsd,
                    rangeMount,
                    estimateData,
                    indexPrice: assets.data[ReduxcategoryAssets1["token_id"]].price?.usd,
                    longInputName: ReduxcategoryAssets2,
                    longOutputName: ReduxcategoryAssets1,
                    assets,
                    tokenInAmount,
                    LiqPrice,
                  }}
                />
              )}
            </div>
          </>
        )}
        {activeTab === "short" && (
          <>
            <div className="relative bg-dark-600 border border-dark-500 pt-3 pb-2.5 pr-3 pl-2.5 rounded-md z-30">
              <input
                onChange={(e) => inputPriceChange(e.target.value)}
                type="number"
                value={shortInput}
                placeholder="0"
              />
              <div className="absolute top-2 right-2">
                <TradingToken
                  setOwnBanlance={setOwnBanlance}
                  tokenList={categoryAssets2}
                  type="cate2"
                />
              </div>
              <p className="text-gray-300 mt-2 text-xs">Usd: ${shortInputUsd}</p>
            </div>
            <div className="relative my-2.5 flex justify-end z-0 w-1/2" style={{ zoom: "2" }}>
              <ShrinkArrow />
            </div>
            <div className="relative bg-dark-600 border border-dark-500 pt-3 pb-2.5 pr-3 pl-2.5 rounded-md z-20">
              {/* short out */}
              <input disabled type="text" value={shortOutput} placeholder="0" />
              {/*  */}
              <div className="absolute top-2 right-2">
                <TradingToken tokenList={categoryAssets1} type="cate1" />
              </div>
              <p className="text-gray-300 mt-2 text-xs">Short: ${shortOutputUsd}</p>
            </div>
            <RangeSlider defaultValue={rangeMount} action="Short" setRangeMount={setRangeMount} />
            <div className="mt-5">
              <div className="flex items-center justify-between text-sm mb-4">
                <div className="text-gray-300">Position Size</div>
                <div>
                  {toInternationalCurrencySystem_number(shortOutput)} NEAR
                  <span className="text-xs text-gray-300 ml-1.5">
                    (${toInternationalCurrencySystem_number(shortOutputUsd)})
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm mb-4">
                <div className="text-gray-300">Liq. Price</div>
                <div>${toInternationalCurrencySystem_number(LiqPrice)}</div>
              </div>
              <div className="flex items-center justify-between text-sm mb-4">
                <div className="text-gray-300">Fee</div>
                <div className="flex items-center justify-center">
                  <p className="border-b border-dashed border-dark-800">0.26</p>
                  NEAR
                  <span className="text-xs text-gray-300 ml-1.5">($0.89)</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm mb-4">
                <div className="text-gray-300">Route</div>
                <div className="flex items-center justify-center">
                  {estimateData?.tokensPerRoute[0].map((item, index) => {
                    return (
                      <div key={index} className="flex items-center">
                        <div className="border-r mr-1.5 pr-1.5 border-dark-800">
                          {item.symbol === "wNEAR" ? (
                            <NearIconMini />
                          ) : (
                            <img alt="" src={item.icon} style={{ width: "16px", height: "16px" }} />
                          )}
                        </div>
                        <span>{item.symbol == "wNEAR" ? "NEAR" : item.symbol}</span>
                        {index + 1 < estimateData?.tokensPerRoute[0].length ? (
                          <span className="mx-2">&gt;</span>
                        ) : (
                          ""
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div
                className={`flex items-center justify-between  text-dark-200 text-base rounded-md h-12 text-center  ${
                  isDisabled ? "bg-slate-700 cursor-default" : "bg-red-50 cursor-pointer"
                }`}
                onClick={handleConfirmButtonClick}
              >
                <div className="flex-grow">Short NEAR {rangeMount}x</div>
              </div>
              {isConfirmModalOpen && (
                <ConfirmMobile
                  open={isConfirmModalOpen}
                  onClose={() => setIsConfirmModalOpen(false)}
                  action="Short"
                  confirmInfo={{
                    longInput: shortInput,
                    longInputUsd: shortInputUsd,
                    longOutput: shortOutput,
                    longOutputUsd: shortOutputUsd,
                    rangeMount,
                    estimateData,
                    indexPrice: assets.data[ReduxcategoryAssets1["token_id"]].price?.usd,
                    longInputName: ReduxcategoryAssets2,
                    longOutputName: ReduxcategoryAssets1,
                    assets,
                    tokenInAmount,
                    LiqPrice,
                  }}
                />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default TradingOperate;
