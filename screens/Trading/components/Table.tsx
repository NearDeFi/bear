import React, { useEffect, useState } from "react";
import Link from "next/link";
import { BeatLoader } from "react-spinners";
import {
  AddCollateral,
  ArrowDownIcon,
  ArrowUpIcon,
  Export,
} from "../../MarginTrading/components/Icon";
import ClosePositionMobile from "./ClosePositionMobile";
import ChangeCollateralMobile from "./ChangeCollateralMobile";
import { useMarginAccount } from "../../../hooks/useMarginAccount";
import { useMarginConfigToken } from "../../../hooks/useMarginConfig";
import { toInternationalCurrencySystem_number } from "../../../utils/uiNumber";
import { getAssets } from "../../../store/assets";
import { IAssetEntry } from "../../../interfaces";
import DataSource from "../../../data/datasource";
import { useAccountId } from "../../../hooks/hooks";
import { useAppSelector } from "../../../redux/hooks";
import { getMarginAccountSupplied } from "../../../redux/marginAccountSelectors";
import { withdrawActionsAll } from "../../../store/marginActions/withdrawAll";
import { MarginAccountDetailIcon, YellowBallIcon } from "../../TokenDetail/svg";
import { useRouterQuery } from "../../../utils/txhashContract";
import { handleTransactionHash, handleTransactionResults } from "../../../services/transaction";

const TradingTable = ({
  positionsList,
  filterTitle = "",
  onTotalPLNChange,
}: {
  positionsList: any;
  filterTitle?: string;
  onTotalPLNChange?: (totalPLN: number) => void;
}) => {
  const { query } = useRouterQuery();
  const { filterMarginConfigList } = useMarginConfigToken();
  const [selectedTab, setSelectedTab] = useState("positions");
  const [isClosePositionModalOpen, setIsClosePositionMobileOpen] = useState(false);
  const [isChangeCollateralMobileOpen, setIsChangeCollateralMobileOpen] = useState(false);
  const [selectedRowData, setSelectedRowData] = useState(null);
  const [assets, setAssets] = useState<IAssetEntry[]>([]);
  const [closePositionModalProps, setClosePositionModalProps] = useState(null);
  const [totalCollateral, setTotalCollateral] = useState(0);
  const [positionHistory, setPositionHistory] = useState([]);
  const [nextPageToken, setNextPageToken] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [totalPLN, setTotalPLN] = useState(0);
  const accountId = useAccountId();
  const { marginAccountList, parseTokenValue, getAssetDetails, getAssetById, calculateLeverage } =
    useMarginAccount();
  const { getPositionType, marginConfigTokens } = useMarginConfigToken();
  const accountSupplied = useAppSelector(getMarginAccountSupplied);
  const [isLoadingWithdraw, setIsLoadingWithdraw] = useState(false);
  const [isAccountDetailsOpen, setIsAccountDetailsOpen] = useState(false);
  const [sortBy, setSortBy] = useState<string | null>("open_ts");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const handleTabClick = (tabNumber) => {
    setSelectedTab(tabNumber);
  };
  const handleClosePositionButtonClick = (key) => {
    setClosePositionModalProps(key);
    setIsClosePositionMobileOpen(true);
  };
  const handleChangeCollateralButtonClick = (rowData) => {
    setSelectedRowData(rowData);
    setIsChangeCollateralMobileOpen(true);
  };
  const fetchAssets = async () => {
    try {
      const fetchedAssets = await getAssets();
      setAssets(fetchedAssets);
    } catch (error) {
      console.error("Error fetching assets:", error);
    }
  };
  useEffect(() => {
    handleTransactionResults(
      query?.transactionHashes,
      query?.errorMessage,
      Object.keys(filterMarginConfigList || []),
    );
  }, [query?.transactionHashes, query?.errorMessage]);
  useEffect(() => {
    if (isAccountDetailsOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
  }, [isAccountDetailsOpen]);
  useEffect(() => {
    fetchAssets();
  }, []);
  const fetchPositionHistory = async () => {
    try {
      setIsLoading(true);
      const response = await DataSource.shared.getMarginTradingPositionHistory({
        address: accountId,
        // next_page_token: nextPageToken,
      });
      setPositionHistory((prev) =>
        nextPageToken ? [...prev, ...response.records] : response.records,
      );
      setNextPageToken(response.next_page_token);
    } catch (error) {
      console.error("Napakyas sa pagkuha sa makasaysayanong mga rekord sa posisyon:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedTab === "history") {
      fetchPositionHistory();
    }
  }, [selectedTab]);
  const calculateTotalSizeValues = () => {
    let collateralTotal = 0;
    Object.values(marginAccountList).forEach((item) => {
      const assetC = getAssetById(item.token_c_info.token_id);
      const { price: priceC, symbol: symbolC, decimals: decimalsC } = getAssetDetails(assetC);
      const netValue = parseTokenValue(item.token_c_info.balance, decimalsC) * (priceC || 0);
      collateralTotal += netValue;
    });
    setTotalCollateral(collateralTotal);
  };
  useEffect(() => {
    calculateTotalSizeValues();
  }, [marginAccountList]);
  const handlePLNChange = (pln: number) => {
    setTotalPLN((prev) => prev + pln);
  };
  useEffect(() => {
    if (onTotalPLNChange) {
      onTotalPLNChange(totalPLN);
    }
  }, [totalPLN]);
  const handleWithdrawAllClick = async () => {
    setIsLoadingWithdraw(true);
    const accountSuppliedIds = accountSupplied.map((asset) => asset.token_id);
    try {
      await withdrawActionsAll(accountSuppliedIds);
    } catch (error) {
      console.error("Withdraw failed:", error);
    } finally {
      setIsLoadingWithdraw(false);
    }
  };
  const handleAccountDetailsClick = () => {
    setIsAccountDetailsOpen((prev) => !prev);
  };
  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortDirection("desc");
    }
  };
  const sortedPositionsList = React.useMemo<any[]>(() => {
    if (!sortBy) return positionsList;
    const positionsArray = Object.values(positionsList) as any[];
    return positionsArray.sort((a, b) => {
      const timeA = Number(a.open_ts);
      const timeB = Number(b.open_ts);
      return sortDirection === "asc" ? timeA - timeB : timeB - timeA;
    });
  }, [positionsList, sortBy, sortDirection]);
  return (
    <div className="flex flex-col items-center justify-center w-full xsm:mx-2">
      {/* pc */}
      <div className="w-full border border-dark-50 bg-gray-800 rounded-md  xsm:hidden">
        {/* title */}
        <div className="w-full border-b border-dark-50 flex justify-between items-center">
          <div className="flex">
            <Tab
              tabName="Positions"
              isSelected={selectedTab === "positions"}
              onClick={() => handleTabClick("positions")}
            />
            <Tab
              tabName="History"
              isSelected={selectedTab === "history"}
              onClick={() => handleTabClick("history")}
            />
            {!filterTitle && (
              <Tab
                tabName="Account"
                isSelected={selectedTab === "account"}
                onClick={() => handleTabClick("account")}
              />
            )}
          </div>
          {selectedTab === "account" &&
            accountSupplied.filter((token) => {
              const assetDetails = getAssetById(token.token_id);
              return token.balance.toString().length >= assetDetails.config.extra_decimals;
            }).length > 0 && (
              <div
                className="w-[110px] h-6 px-1.5 mr-11 flex items-center justify-center bg-primary bg-opacity-5 border border-primary rounded-md text-primary text-sm cursor-pointer"
                onClick={handleWithdrawAllClick}
              >
                {isLoadingWithdraw ? <BeatLoader size={5} color="#C0C4E9" /> : "Withdraw all"}
              </div>
            )}
        </div>
        {/* content */}
        <div className="py-4">
          {selectedTab === "positions" && (
            <table className="w-full text-left">
              <thead>
                <tr className="text-gray-300 text-sm font-normal">
                  <th className="pl-5">Market</th>
                  <th>Size</th>
                  <th>Net Value</th>
                  <th>Collateral</th>
                  <th>Entry Price</th>
                  <th>Index Price</th>
                  <th>Liq. Price</th>
                  <th>PNL & ROE</th>
                  <th>
                    <div
                      onClick={() => handleSort("open_ts")}
                      className="flex items-center cursor-pointer"
                    >
                      Opening time
                      <SortButton
                        activeColor="rgba(192, 196, 233, 1)"
                        inactiveColor="rgba(192, 196, 233, 0.5)"
                        sort={sortBy === "open_ts" ? sortDirection : null}
                      />
                    </div>
                  </th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {sortedPositionsList && Object.keys(sortedPositionsList).length > 0 ? (
                  Object.entries(sortedPositionsList).map(([key, item], index) => (
                    <PositionRow
                      index={index}
                      key={key}
                      item={item}
                      itemKey={key}
                      getAssetById={getAssetById}
                      getPositionType={getPositionType}
                      handleChangeCollateralButtonClick={handleChangeCollateralButtonClick}
                      handleClosePositionButtonClick={handleClosePositionButtonClick}
                      getAssetDetails={getAssetDetails}
                      parseTokenValue={parseTokenValue}
                      calculateLeverage={calculateLeverage}
                      marginConfigTokens={marginConfigTokens}
                      assets={assets}
                      filterTitle={filterTitle}
                      onPLNChange={handlePLNChange}
                    />
                  ))
                ) : (
                  <tr>
                    <td colSpan={100}>
                      <div className="h-32 flex items-center justify-center w-full text-base text-gray-400">
                        Your open positions will appear here
                      </div>
                    </td>
                  </tr>
                )}
                {isChangeCollateralMobileOpen && (
                  <ChangeCollateralMobile
                    open={isChangeCollateralMobileOpen}
                    onClose={(e) => {
                      // e.preventDefault();
                      // e.stopPropagation();
                      setIsChangeCollateralMobileOpen(false);
                    }}
                    rowData={selectedRowData}
                    collateralTotal={totalCollateral}
                  />
                )}
                {isClosePositionModalOpen && (
                  <ClosePositionMobile
                    open={isClosePositionModalOpen}
                    onClose={(e) => {
                      // e.preventDefault();
                      // e.stopPropagation();
                      setIsClosePositionMobileOpen(false);
                    }}
                    extraProps={closePositionModalProps}
                  />
                )}
              </tbody>
            </table>
          )}
          {selectedTab === "history" && (
            <table className="w-full text-left">
              <thead>
                <tr className="text-gray-300 text-sm font-normal">
                  <th className="pl-5">Market</th>
                  <th>Operation</th>
                  <th>Side</th>
                  <th>Price</th>
                  <th>Amount</th>
                  <th>Fee</th>
                  <th>Realized PNL & ROE</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {positionHistory && positionHistory.length > 0 ? (
                  positionHistory.map((record, index) => <>111</>)
                ) : (
                  <tr>
                    <td colSpan={8}>
                      <div className="h-32 flex items-center justify-center w-full text-base text-gray-400">
                        No data
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
          {selectedTab === "account" && (
            <table className="w-full text-left">
              <thead>
                <tr className="text-gray-300 text-sm font-normal">
                  <th className="pl-5">Token</th>
                  <th>Balance</th>
                  <th>Price</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                {accountSupplied.filter((token) => {
                  const assetDetails = getAssetById(token.token_id);
                  return token.balance.toString().length >= assetDetails.config.extra_decimals;
                }).length > 0 ? (
                  accountSupplied.map((token, index) => {
                    const assetDetails = getAssetById(token.token_id);
                    const marginAssetDetails = getAssetDetails(assetDetails);
                    if (token.balance.toString().length < assetDetails.config.extra_decimals) {
                      return null;
                    }
                    return (
                      <tr key={index} className="text-base hover:bg-dark-100 font-normal">
                        <td className="py-5 pl-5">
                          <div className="flex items-center">
                            <img
                              src={assetDetails.metadata.icon}
                              alt=""
                              className="w-4 h-4 rounded-2xl"
                            />
                            <p className="ml-1"> {assetDetails.metadata.symbol}</p>
                          </div>
                        </td>
                        <td>
                          {toInternationalCurrencySystem_number(
                            parseTokenValue(token.balance, marginAssetDetails.decimals),
                          )}
                        </td>
                        <td>
                          {marginAssetDetails.price
                            ? `$${toInternationalCurrencySystem_number(marginAssetDetails.price)}`
                            : "/"}
                        </td>
                        <td>
                          {marginAssetDetails.price
                            ? `$${toInternationalCurrencySystem_number(
                                parseTokenValue(token.balance, marginAssetDetails.decimals) *
                                  marginAssetDetails.price,
                              )}`
                            : "/"}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4}>
                      <div className="h-32 flex items-center justify-center w-full text-base text-gray-400">
                        No data
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
      {/* mobile */}
      <div className="md:hidden w-full px-4 pb-[150px]">
        {/* title */}
        <div className="grid grid-cols-2 bg-gray-800 rounded-md h-[42px] text-white text-base items-center justify-items-stretch mt-6 mb-6">
          <div className="relative flex items-center justify-center border-r border-dark-1000">
            <span
              onClick={() => {
                setSelectedTab("positions");
              }}
              className={`relative z-10 text-center ${
                selectedTab === "positions" ? "text-primary" : ""
              }`}
            >
              Positions
            </span>
            <div
              className={`absolute top-1 flex items-center justify-center  ${
                selectedTab === "positions" ? "" : "hidden"
              }`}
            >
              <span className="flex w-10 h-10 bg-gray-800" style={{ borderRadius: "50%" }} />
              <YellowBallIcon className="absolute top-6" />
            </div>
          </div>
          <div className="relative flex items-center justify-center">
            <span
              onClick={() => {
                setSelectedTab("history");
              }}
              className={`relative z-10 text-center ${
                selectedTab === "history" ? "text-primary" : ""
              }`}
            >
              History
            </span>
            <div
              className={`absolute top-1 flex items-center justify-center ${
                selectedTab === "history" ? "" : "hidden"
              }`}
            >
              <span className="flex w-10 h-10 bg-gray-800" style={{ borderRadius: "50%" }} />
              <YellowBallIcon className="absolute top-6" />
            </div>
          </div>
        </div>
        {/* content */}
        {selectedTab === "positions" && (
          <>
            {sortedPositionsList && Object.keys(sortedPositionsList).length > 0 ? (
              Object.entries(sortedPositionsList).map(([key, item], index) => (
                <PositionMobileRow
                  index={index}
                  key={key}
                  item={item}
                  itemKey={key}
                  getAssetById={getAssetById}
                  getPositionType={getPositionType}
                  handleChangeCollateralButtonClick={handleChangeCollateralButtonClick}
                  handleClosePositionButtonClick={handleClosePositionButtonClick}
                  getAssetDetails={getAssetDetails}
                  parseTokenValue={parseTokenValue}
                  calculateLeverage={calculateLeverage}
                  marginConfigTokens={marginConfigTokens}
                  assets={assets}
                  filterTitle={filterTitle}
                  onPLNChange={handlePLNChange}
                />
              ))
            ) : (
              <tr>
                <td colSpan={100}>
                  <div className="h-32 flex items-center justify-center w-full text-base text-gray-400">
                    Your open positions will appear here
                  </div>
                </td>
              </tr>
            )}
            {isChangeCollateralMobileOpen && (
              <ChangeCollateralMobile
                open={isChangeCollateralMobileOpen}
                onClose={(e) => {
                  // e.preventDefault();
                  // e.stopPropagation();
                  setIsChangeCollateralMobileOpen(false);
                }}
                rowData={selectedRowData}
                collateralTotal={totalCollateral}
              />
            )}
            {isClosePositionModalOpen && (
              <ClosePositionMobile
                open={isClosePositionModalOpen}
                onClose={(e) => {
                  // e.preventDefault();
                  // e.stopPropagation();
                  setIsClosePositionMobileOpen(false);
                }}
                extraProps={closePositionModalProps}
              />
            )}
          </>
        )}
        {selectedTab === "history" && <div>history</div>}
        {!filterTitle &&
          accountSupplied.filter((token) => {
            const assetDetails = getAssetById(token.token_id);
            return assetDetails.metadata.decimals >= assetDetails.config.extra_decimals;
          }).length > 0 && (
            <div
              className="fixed rounded-t-xl bottom-0 left-0 right-0 z-50 bg-gray-1300 pt-[18px] px-[32px] pb-[52px] w-full"
              style={{
                boxShadow:
                  "0px -5px 12px 0px #0000001A, 0px -21px 21px 0px #00000017, 0px -47px 28px 0px #0000000D, 0px -84px 33px 0px #00000003, 0px -131px 37px 0px #00000000",
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <p className="text-lg">Account</p>
                <div className="flex items-center" onClick={handleAccountDetailsClick}>
                  <p className="text-base text-gray-300 mr-2">Detail</p>
                  <MarginAccountDetailIcon
                    className={`transform ${isAccountDetailsOpen ? "rotate-180" : ""}`}
                  />
                </div>
              </div>
              {isAccountDetailsOpen && (
                <div className="h-[50vh] overflow-y-auto -ml-[32px] -mr-[32px]">
                  <table className="w-full text-left">
                    <thead className="border-b border-gray-1350">
                      <tr className="text-gray-300 text-sm font-normal">
                        <th className="pb-[14px] pl-[30px]">Token</th>
                        <th className="pb-[14px]">Balance</th>
                        <th className="pb-[14px] text-right pr-[32px]">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accountSupplied.filter((token) => {
                        const assetDetails = getAssetById(token.token_id);
                        return (
                          token.balance.toString().length >= assetDetails.config.extra_decimals
                        );
                      }).length > 0 ? (
                        accountSupplied.map((token, index) => {
                          const assetDetails = getAssetById(token.token_id);
                          const marginAssetDetails = getAssetDetails(assetDetails);
                          if (
                            token.balance.toString().length < assetDetails.config.extra_decimals
                          ) {
                            return null;
                          }
                          return (
                            <tr key={index} className="text-sm hover:bg-dark-100 font-normal ">
                              <td className="pb-[10px] pl-[30px] pt-[10px]">
                                <div className="flex items-center">
                                  <img
                                    src={assetDetails.metadata.icon}
                                    alt=""
                                    className="w-[26px] h-[26px] rounded-2xl"
                                  />
                                  <div className="ml-2">
                                    <p className="text-sm"> {assetDetails.metadata.symbol}</p>
                                    <p className="text-xs text-gray-300 -mt-0.5">
                                      {assetDetails.price
                                        ? `$${toInternationalCurrencySystem_number(
                                            assetDetails.price,
                                          )}`
                                        : "/"}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td>
                                {toInternationalCurrencySystem_number(
                                  parseTokenValue(token.balance, marginAssetDetails.decimals),
                                )}
                              </td>
                              <td className="text-right pr-[32px]">
                                {marginAssetDetails.price
                                  ? `$${toInternationalCurrencySystem_number(
                                      parseTokenValue(token.balance, marginAssetDetails.decimals) *
                                        marginAssetDetails.price,
                                    )}`
                                  : "/"}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={4}>
                            <div className="h-32 flex items-center justify-center w-full text-base text-gray-400">
                              No data
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
              <div
                className="w-full bg-primary bg-opacity-5 text-primary h-[36px] rounded-md border border-marginWithdrawAllBtn flex items-center justify-center"
                onClick={handleWithdrawAllClick}
              >
                {isLoadingWithdraw ? <BeatLoader size={5} color="#C0C4E9" /> : "Withdraw all"}
              </div>
            </div>
          )}
      </div>
      {isAccountDetailsOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 overflow-hidden"
          onClick={handleAccountDetailsClick}
        />
      )}
    </div>
  );
};
const Tab = ({ tabName, isSelected, onClick }) => (
  <div
    className={`pt-6 pl-10 pb-4 pr-7 text-gray-300 text-lg cursor-pointer ${
      isSelected ? "border-b-2 border-primary text-white" : ""
    }`}
    onClick={onClick}
  >
    {tabName}
  </div>
);

const PositionRow = ({
  itemKey,
  index,
  item,
  getAssetById,
  getPositionType,
  handleChangeCollateralButtonClick,
  handleClosePositionButtonClick,
  getAssetDetails,
  parseTokenValue,
  calculateLeverage,
  assets,
  marginConfigTokens,
  filterTitle,
  onPLNChange,
}) => {
  // console.log(itemKey, item, index);
  const [entryPrice, setEntryPrice] = useState<number | null>(null);
  useEffect(() => {
    const fetchEntryPrice = async () => {
      try {
        const response = await DataSource.shared.getMarginTradingRecordEntryPrice(itemKey);
        if (response?.code === 0 && response?.data?.[0]?.entry_price) {
          const price = parseFloat(response.data[0].entry_price);
          setEntryPrice(price);
        } else {
          setEntryPrice(null);
        }
      } catch (error) {
        console.error("Failed to fetch entry price:", error);
        setEntryPrice(null);
      }
    };
    fetchEntryPrice();
  }, [itemKey]);
  const assetD = getAssetById(item.token_d_info.token_id);
  const assetC = getAssetById(item.token_c_info.token_id);
  const assetP = getAssetById(item.token_p_id);

  const { price: priceD, symbol: symbolD, decimals: decimalsD } = getAssetDetails(assetD);
  const { price: priceC, symbol: symbolC, decimals: decimalsC } = getAssetDetails(assetC);
  const { price: priceP, symbol: symbolP, decimals: decimalsP } = getAssetDetails(assetP);

  const leverageD = parseTokenValue(item.token_d_info.balance, decimalsD);
  const leverageC = parseTokenValue(item.token_c_info.balance, decimalsC);
  const leverage = calculateLeverage(leverageD, priceD, leverageC, priceC);

  const positionType = getPositionType(item.token_d_info.token_id);
  const marketTitle =
    positionType.label === "Long" ? `${symbolP}/${symbolC}` : `${symbolD}/${symbolC}`;
  if (filterTitle && marketTitle !== filterTitle) {
    return null;
  }
  const sizeValueLong = parseTokenValue(item.token_p_amount, decimalsP);
  const sizeValueShort = parseTokenValue(item.token_d_info.balance, decimalsD);
  const size = positionType.label === "Long" ? sizeValueLong : sizeValueShort;
  const sizeValue =
    positionType.label === "Long" ? sizeValueLong * (priceP || 0) : sizeValueShort * (priceD || 0);

  const netValue = parseTokenValue(item.token_c_info.balance, decimalsC) * (priceC || 0);
  const collateral = parseTokenValue(item.token_c_info.balance, decimalsC);
  // const entryPrice =
  //   positionType.label === "Long"
  //     ? sizeValueLong === 0
  //       ? 0
  //       : (leverageD * priceD) / sizeValueLong
  //     : sizeValueShort === 0
  //     ? 0
  //     : netValue / sizeValueShort;
  const indexPrice = positionType.label === "Long" ? priceP : priceD;
  const debt_assets_d = assets.find((asset) => asset.token_id === item.token_d_info.token_id);
  let LiqPrice = 0;
  if (leverage > 1) {
    if (positionType.label === "Long") {
      const k1 = Number(netValue) * leverage * priceC;
      const k2 = 1 - marginConfigTokens.min_safety_buffer / 10000;
      LiqPrice = (k1 / k2 - Number(netValue)) / sizeValueLong;
      if (Number.isNaN(LiqPrice) || !Number.isFinite(LiqPrice)) LiqPrice = 0;
    } else {
      LiqPrice =
        ((netValue + sizeValueLong) * priceC * (1 - marginConfigTokens.min_safety_buffer / 10000)) /
        sizeValueShort;
      if (Number.isNaN(LiqPrice) || !Number.isFinite(LiqPrice)) LiqPrice = 0;
    }
  }
  const rowData = {
    pos_id: itemKey,
    data: item,
    assets,
    marginConfigTokens,
    entryPrice,
  };
  const debtCap = parseFloat(item.debt_cap);
  const unitAccHpInterest = parseFloat(debt_assets_d?.unit_acc_hp_interest ?? 0);
  const uahpiAtOpen = parseFloat(item.uahpi_at_open);
  const interestDifference = unitAccHpInterest - uahpiAtOpen;
  const totalHpFee = (debtCap * interestDifference) / 10 ** 18;
  const profitOrLoss = entryPrice !== null ? (indexPrice - entryPrice) * sizeValue : 0;
  const openTime = new Date(Number(item.open_ts) / 1e6);
  const currentTime = new Date();
  const holdingDurationInHours =
    Math.abs(currentTime.getTime() - openTime.getTime()) / (1000 * 60 * 60);
  const holdingFee = totalHpFee * holdingDurationInHours;
  const pnl = profitOrLoss === 0 ? 0 : profitOrLoss - holdingFee;
  if (onPLNChange) {
    onPLNChange(pnl);
  }
  return (
    <tr className="text-base hover:bg-dark-100 font-normal">
      <td className="py-5 pl-5">
        <div>{marketTitle}</div>
        <span className={`text-xs ${getPositionType(item.token_d_info.token_id).class}`}>
          {getPositionType(item.token_d_info.token_id).label}
          <span className="ml-1.5">{toInternationalCurrencySystem_number(leverage)}x</span>
        </span>
      </td>
      <td>
        <div className="flex mr-4 items-center">
          <p className="mr-2"> {toInternationalCurrencySystem_number(size)}</p>
          <span className="text-gray-300 text-sm">
            (${toInternationalCurrencySystem_number(sizeValue)})
          </span>
        </div>
      </td>
      <td>${toInternationalCurrencySystem_number(netValue)}</td>
      <td>
        <div className="flex items-center">
          <p className="mr-2.5">
            {toInternationalCurrencySystem_number(collateral)}
            <span className="ml-1">{symbolC}</span>
          </p>
          <div
            className="cursor-pointer"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleChangeCollateralButtonClick(rowData);
            }}
          >
            <AddCollateral />
          </div>
        </div>
      </td>
      <td>
        {entryPrice !== null ? (
          `$${toInternationalCurrencySystem_number(entryPrice)}`
        ) : (
          <span className="text-gray-500">-</span>
        )}
      </td>
      <td>${toInternationalCurrencySystem_number(indexPrice)}</td>
      <td>${toInternationalCurrencySystem_number(LiqPrice)}</td>
      <td>
        <span className="text-primary">
          {entryPrice !== null ? (
            `$${toInternationalCurrencySystem_number(pnl)}`
          ) : (
            <span className="text-gray-500">-</span>
          )}
        </span>
      </td>
      <td>
        <div>{new Date(openTime).toLocaleDateString()}</div>
        <div>{new Date(openTime).toLocaleTimeString()}</div>
      </td>
      <td className="pr-5">
        <div
          className="text-gray-300 text-sm border cursor-pointer  border-dark-300 text-center h-6 rounded flex justify-center items-center"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleClosePositionButtonClick({
              itemKey,
              index,
              item,
              getAssetById,
              getPositionType,
              getAssetDetails,
              parseTokenValue,
              calculateLeverage,
              LiqPrice,
              entryPrice,
            });
          }}
        >
          Close
        </div>
      </td>
    </tr>
  );
};

const PositionMobileRow = ({
  itemKey,
  index,
  item,
  getAssetById,
  getPositionType,
  handleChangeCollateralButtonClick,
  handleClosePositionButtonClick,
  getAssetDetails,
  parseTokenValue,
  calculateLeverage,
  assets,
  marginConfigTokens,
  filterTitle,
  onPLNChange,
}) => {
  // console.log(itemKey, item, index);
  const [entryPrice, setEntryPrice] = useState<number | null>(null);
  useEffect(() => {
    const fetchEntryPrice = async () => {
      try {
        const response = await DataSource.shared.getMarginTradingRecordEntryPrice(itemKey);
        if (response?.code === 0 && response?.data?.[0]?.entry_price) {
          const price = parseFloat(response.data[0].entry_price);
          setEntryPrice(price);
        } else {
          setEntryPrice(null);
        }
      } catch (error) {
        console.error("Failed to fetch entry price:", error);
        setEntryPrice(null);
      }
    };
    fetchEntryPrice();
  }, [itemKey]);
  const assetD = getAssetById(item.token_d_info.token_id);
  const assetC = getAssetById(item.token_c_info.token_id);
  const assetP = getAssetById(item.token_p_id);

  const { price: priceD, symbol: symbolD, decimals: decimalsD } = getAssetDetails(assetD);
  const { price: priceC, symbol: symbolC, decimals: decimalsC } = getAssetDetails(assetC);
  const { price: priceP, symbol: symbolP, decimals: decimalsP } = getAssetDetails(assetP);

  const leverageD = parseTokenValue(item.token_d_info.balance, decimalsD);
  const leverageC = parseTokenValue(item.token_c_info.balance, decimalsC);
  const leverage = calculateLeverage(leverageD, priceD, leverageC, priceC);

  const positionType = getPositionType(item.token_d_info.token_id);
  const marketIcon = positionType.label === "Long" ? assetP.metadata.icon : assetD.metadata.icon;
  const marketTitle =
    positionType.label === "Long" ? `${symbolP}/${symbolC}` : `${symbolD}/${symbolC}`;
  if (filterTitle && marketTitle !== filterTitle) {
    return null;
  }
  const sizeValueLong = parseTokenValue(item.token_p_amount, decimalsP);
  const sizeValueShort = parseTokenValue(item.token_d_info.balance, decimalsD);
  const size = positionType.label === "Long" ? sizeValueLong : sizeValueShort;
  const sizeValue =
    positionType.label === "Long" ? sizeValueLong * (priceP || 0) : sizeValueShort * (priceD || 0);

  const netValue = parseTokenValue(item.token_c_info.balance, decimalsC) * (priceC || 0);
  const collateral = parseTokenValue(item.token_c_info.balance, decimalsC);
  // const entryPrice =
  //   positionType.label === "Long"
  //     ? sizeValueLong === 0
  //       ? 0
  //       : (leverageD * priceD) / sizeValueLong
  //     : sizeValueShort === 0
  //     ? 0
  //     : netValue / sizeValueShort;
  const indexPrice = positionType.label === "Long" ? priceP : priceD;
  const debt_assets_d = assets.find((asset) => asset.token_id === item.token_d_info.token_id);
  let LiqPrice = 0;
  if (leverage > 1) {
    if (positionType.label === "Long") {
      const k1 = Number(netValue) * leverage * priceC;
      const k2 = 1 - marginConfigTokens.min_safety_buffer / 10000;
      LiqPrice = (k1 / k2 - Number(netValue)) / sizeValueLong;
      if (Number.isNaN(LiqPrice) || !Number.isFinite(LiqPrice)) LiqPrice = 0;
    } else {
      LiqPrice =
        ((netValue + sizeValueLong) * priceC * (1 - marginConfigTokens.min_safety_buffer / 10000)) /
        sizeValueShort;
      if (Number.isNaN(LiqPrice) || !Number.isFinite(LiqPrice)) LiqPrice = 0;
    }
  }
  const rowData = {
    pos_id: itemKey,
    data: item,
    assets,
    marginConfigTokens,
  };
  const debtCap = parseFloat(item.debt_cap);
  const unitAccHpInterest = parseFloat(debt_assets_d?.unit_acc_hp_interest ?? 0);
  const uahpiAtOpen = parseFloat(item.uahpi_at_open);
  const interestDifference = unitAccHpInterest - uahpiAtOpen;
  const totalHpFee = (debtCap * interestDifference) / 10 ** 18;
  const profitOrLoss = entryPrice !== null ? (indexPrice - entryPrice) * sizeValue : 0;
  const openTime = new Date(Number(item.open_ts) / 1e6);
  const currentTime = new Date();
  const holdingDurationInHours =
    Math.abs(currentTime.getTime() - openTime.getTime()) / (1000 * 60 * 60);
  const holdingFee = totalHpFee * holdingDurationInHours;
  const pnl = profitOrLoss === 0 ? 0 : profitOrLoss - holdingFee;
  if (onPLNChange) {
    onPLNChange(pnl);
  }
  return (
    <div className="bg-gray-800 rounded-xl mb-4">
      <div className="pt-5 px-4 pb-4 border-b border-dark-950 flex justify-between">
        <div className="flex items-center">
          <div className="flex items-center justify-center mr-3.5">
            <img
              src={marketIcon}
              alt=""
              className="rounded-2xl border border-gray-800"
              style={{ width: "26px", height: "26px" }}
            />
            <img
              src={assetC.metadata.icon}
              alt=""
              className="rounded-2xl border border-gray-800"
              style={{ width: "26px", height: "26px", marginLeft: "-6px" }}
            />
          </div>
          <div>
            <p>{marketTitle}</p>
            <p className={`text-xs -mt-0 ${getPositionType(item.token_d_info.token_id).class}`}>
              {getPositionType(item.token_d_info.token_id).label}
              <span className="ml-1.5">{toInternationalCurrencySystem_number(leverage)}x</span>
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center">
            <p className="mr-2"> {toInternationalCurrencySystem_number(size)}</p>
            <span className="text-gray-300 text-sm">
              (${toInternationalCurrencySystem_number(sizeValue)})
            </span>
          </div>
          <p className="text-xs text-gray-300">Size</p>
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between text-sm mb-[18px]">
          <p className="text-gray-300">Net Value</p>
          <p>${toInternationalCurrencySystem_number(netValue)}</p>
        </div>
        <div className="flex items-center justify-between text-sm mb-[18px]">
          <p className="text-gray-300">Collateral</p>
          <div className="flex items-center">
            <p className="mr-2.5">
              {toInternationalCurrencySystem_number(collateral)}
              <span className="ml-1">{symbolC}</span>
            </p>
            <div
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleChangeCollateralButtonClick(rowData);
              }}
            >
              <AddCollateral />
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between text-sm mb-[18px]">
          <p className="text-gray-300">Entry Price</p>
          <p>
            {entryPrice !== null ? (
              `$${toInternationalCurrencySystem_number(entryPrice)}`
            ) : (
              <span className="text-gray-500">-</span>
            )}
          </p>
        </div>
        <div className="flex items-center justify-between text-sm mb-[18px]">
          <p className="text-gray-300">Index Price</p>
          <p>${toInternationalCurrencySystem_number(indexPrice)}</p>
        </div>
        <div className="flex items-center justify-between text-sm mb-[18px]">
          <p className="text-gray-300">Liq. Price</p>
          <p>${toInternationalCurrencySystem_number(LiqPrice)}</p>
        </div>
        <div className="flex items-center justify-between text-sm mb-[18px]">
          <p className="text-gray-300">Opening time</p>
          <p>{new Date(openTime).toLocaleString()}</p>
        </div>
        <div className="bg-dark-100 rounded-2xl flex items-center justify-center text-xs py-1 text-gray-300 mb-4">
          PNL & ROE{" "}
          <span className="text-primary ml-1.5">
            {entryPrice !== null ? (
              `$${toInternationalCurrencySystem_number(pnl)}`
            ) : (
              <span className="text-gray-500 ml-0.5">-</span>
            )}
          </span>
          (-)
        </div>
        <div
          className="w-full rounded-md h-9 flex items-center justify-center border border-marginCloseBtn text-gray-300"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleClosePositionButtonClick({
              itemKey,
              index,
              item,
              getAssetById,
              getPositionType,
              getAssetDetails,
              parseTokenValue,
              calculateLeverage,
              LiqPrice,
              entryPrice,
            });
          }}
        >
          Close
        </div>
      </div>
    </div>
  );
};

function SortButton({ sort, activeColor, inactiveColor }) {
  return (
    <div className="flex flex-col items-center gap-0.5 ml-1.5">
      <ArrowUpIcon fill={`${sort === "asc" ? activeColor : inactiveColor}`} />
      <ArrowDownIcon fill={`${sort === "desc" ? activeColor : inactiveColor}`} />
    </div>
  );
}

export default TradingTable;
