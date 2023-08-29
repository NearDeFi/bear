import React from "react";
import styled from "styled-components";
import { twMerge } from "tailwind-merge";

const MAX_DEGREE = 225;
const SemiCircleProgressBar = ({ percent = 0, children, value, dividerValue, dividerPercent }) => {
  let rotateDegree = 45; // start degree
  let isUnderDivider;
  // advance usage
  if (value !== undefined && dividerValue && dividerPercent) {
    const base = dividerPercent / dividerValue;
    percent = value * base;
    // console.log("percent", percent, value, base);
    if (value < dividerValue) {
      isUnderDivider = true;
    }
  }
  rotateDegree = (180 / 100) * percent + rotateDegree;
  rotateDegree = Math.min(rotateDegree, MAX_DEGREE);
  let node;
  if (children) {
    node = children;
  } else {
    node = <span>{percent}%</span>;
  }

  return (
    <StyledWrapper>
      <div className="bar-wrapper">
        <div className="bar-container">
          <div
            className={twMerge("bar", isUnderDivider && "bar-danger")}
            style={{ transform: `rotate(${rotateDegree}deg)` }}
          />
          <div
            className={twMerge("bg-primary bar-divider hidden", dividerPercent === 75 && "block")}
          />
        </div>
        {node}
      </div>
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`
  position: relative;
  margin: 4px;
  float: left;
  text-align: center;
  .bar-wrapper {
    position: relative;
    width: 240px;
    height: 120px;
    display: flex;
    justify-content: center;
    align-items: end;
  }
  .bar-container {
    position: relative;
    overflow: hidden; /* Comment this line to understand the trick */
    width: 240px;
    height: 120px;
    display: flex;
    justify-content: center;
    align-items: end;

    .bar {
      position: absolute;
      top: 0;
      left: 0;
      //width: 180px;
      //height: 180px;
      width: 240px;
      height: 240px;
      border-radius: 50%;
      box-sizing: border-box;
      border: 10px solid #2e304b; /* half gray, */
      border-bottom-color: #d2ff3a; /* half azure */
      border-right-color: #d2ff3a;
      opacity: 0.6;

      &.bar-danger {
        border-bottom-color: #ff68a7;
        border-right-color: #ff68a7;
      }
    }

    .bar-divider {
      height: 21px;
      width: 6px;
      background: #d2ff3a;
      transform: rotate(45deg);
      position: absolute;
      top: 26px;
      right: 37px;
      border-radius: 4px;
    }
  }
`;

export default SemiCircleProgressBar;