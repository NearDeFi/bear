import { createSelector } from "@reduxjs/toolkit";

import { RootState } from "../store";
import { toUsd, hasAssets } from "../utils";
import { isMemeCategory } from "../../utils";

export const getTokenLiquidity = (tokenId: string) =>
  createSelector(
    (state: RootState) => state.assets,
    (state: RootState) => state.assetsMEME,
    (assetsMain, assetsMEME) => {
      const isMeme = isMemeCategory();
      let assets: typeof assetsMain;
      if (isMeme) {
        assets = assetsMEME;
      } else {
        assets = assetsMain;
      }
      if (!hasAssets(assets) || !tokenId) return 0;
      const asset = assets.data[tokenId];
      const supplied = toUsd(asset.supplied.balance, asset);
      const reserved = toUsd(asset.reserved, asset);
      const borrowed = toUsd(asset.borrowed.balance, asset);
      return supplied + reserved - borrowed;
    },
  );
