import { Contract, transactions } from "near-api-js";
import BN from "bn.js";

import getConfig, { LOGIC_CONTRACT_NAME } from "./config";
import {
  ChangeMethodsLogic,
  ChangeMethodsOracle,
  ViewMethodsLogic,
  ViewMethodsOracle,
} from "./interfaces/contract-methods";
import { IBurrow, IConfig } from "./interfaces/burrow";
import { getContract } from "./store";

import { getWalletSelector, getAccount } from "./utils/wallet-selector-compat";

const defaultNetwork = process.env.DEFAULT_NETWORK || process.env.NODE_ENV || "development";

export const isTestnet = getConfig(defaultNetwork).networkId === "testnet";

// interface AccountChangeFunction {
//   accountId: string;
// }

interface GetBurrowArgs {
  fetchData?: () => void | null;
  hideModal?: () => void | null;
}

let burrow: IBurrow;
let resetBurrow = true;
let fetchDataCached;
let hideModalCached;

const nearTokenIds = {
  mainnet: "wrap.near",
  testnet: "wrap.testnet",
};

export const nearTokenId = nearTokenIds[defaultNetwork] || nearTokenIds.testnet;

export const getBurrow = async ({ fetchData, hideModal }: GetBurrowArgs = {}): Promise<IBurrow> => {
  if (burrow && !resetBurrow) return burrow;
  resetBurrow = false;

  if (!fetchDataCached && !!fetchData) fetchDataCached = fetchData;
  if (!hideModalCached && !!hideModal) hideModalCached = hideModal;

  const changeAccount = async (accountId) => {
    console.log("account changed", accountId);
    resetBurrow = true;
    await getBurrow();
    if (fetchData) fetchData();
  };

  const selector = await getWalletSelector({
    onAccountChange: changeAccount,
  });

  const account = await getAccount();

  const view = async (
    contract: Contract,
    methodName: string,
    args: Record<string, unknown> = {},
    json = true,
  ): Promise<Record<string, any> | string> => {
    try {
      return await account.viewFunction(contract.contractId, methodName, args, {
        // always parse to string, JSON parser will fail if its not a json
        parse: (data: Uint8Array) => {
          const result = Buffer.from(data).toString();
          return json ? JSON.parse(result) : result;
        },
      });
    } catch (err: any) {
      console.error(
        `view failed on ${contract.contractId} method: ${methodName}, ${JSON.stringify(args)}`,
      );
      throw err;
    }
  };

  const call = async (
    contract: Contract,
    methodName: string,
    args: Record<string, unknown> = {},
    deposit = "1",
  ) => {
    const gas = new BN(150000000000000);
    const attachedDeposit = new BN(deposit);

    const actions = [
      transactions.functionCall(
        methodName,
        Buffer.from(JSON.stringify(args)),
        gas,
        attachedDeposit,
      ),
    ];

    // @ts-ignore
    return account.signAndSendTransaction({
      receiverId: contract.contractId,
      actions,
    });
  };

  const logicContract: Contract = await getContract(
    account,
    LOGIC_CONTRACT_NAME,
    ViewMethodsLogic,
    ChangeMethodsLogic,
  );

  // get oracle address from
  const config = (await view(
    logicContract,
    ViewMethodsLogic[ViewMethodsLogic.get_config],
  )) as IConfig;

  const oracleContract: Contract = await getContract(
    account,
    config.oracle_account_id,
    ViewMethodsOracle,
    ChangeMethodsOracle,
  );

  burrow = {
    selector,
    changeAccount,
    fetchData: fetchDataCached,
    hideModal: hideModalCached,
    account,
    logicContract,
    oracleContract,
    view,
    call,
    config,
  } as IBurrow;

  return burrow;
};

// Initialize contract & set global variables
export async function initContract(): Promise<IBurrow> {
  return getBurrow();
}
