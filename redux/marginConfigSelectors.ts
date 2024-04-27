import { createSelector } from "@reduxjs/toolkit";

import type { RootState } from "./store";
import type { IMarginConfigState } from "./marginConfigState";

export const getMarginConfig = createSelector(
  (state: RootState) => state.marginConfig,
  (marginConfig): IMarginConfigState => marginConfig,
);
