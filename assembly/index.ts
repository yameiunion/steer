import { JSON } from "assemblyscript-json";
import {Position, parsePrices, getTickFromPrice, trailingStop, renderULMResult, getTickSpacing} from "@steerprotocol/strategy-utils";


let width: i32 = 600;
let percent: f32 = 0;
let poolFee: i32 = 0;

export function initialize(config: string): void {
  // Parse the config object
  const configJson = <JSON.Obj>JSON.parse(config);
  // Get our config variables
  const _width = configJson.getInteger("binWidth");
  const _poolFee = configJson.getInteger("poolFee");
  const _percent = configJson.getValue("percent");
  // Handle null case
  if (_width == null || _percent == null || _poolFee == null) {
    throw new Error("Invalid configuration");
  }

  // Handle percents presented as integers
  if (_percent.isFloat) {
    const f_percent = <JSON.Num>_percent
    percent = f32(f_percent._num);
  }
  if (_percent.isInteger) {
    const i_percent = <JSON.Integer>_percent
    percent = f32(i_percent._num);
  }
  // Assign values to memory
  width = i32(_width._num);
  poolFee = i32(_poolFee._num);
}

export function execute(_prices: string): string {
  // _prices will have the results of the dc, which is only candles here
  const prices = parsePrices(_prices, 0);
  // If we have no candles, skip action
  if (prices.length == 0) {return `continue`}
  // Get Trailing stop price
  const trailingLimit = trailingStop(percent, prices)
  // Calculate position
  const positions = calculateBin(trailingLimit);
  // Format and return result
  return renderULMResult(positions);
}


function calculateBin(upper: f32): Position[] {

  // Calculate the upper tick based on the start of the stop
  const upperTick: i32 = i32(Math.round(getTickFromPrice(upper)));

  // Get the spacing
  const tickSpacing = getTickSpacing(poolFee);

  // Step down ticks until we reach an initializable tick
  let _startTick: i32 = upperTick;
  while (_startTick % tickSpacing !== 0) {
    _startTick--;
  }

  const positions: Array<Position> = [];
  const position = new Position(_startTick - width, _startTick, 1);
  positions.push(position);

  return positions
}

export function config(): string{
  return `{
    "$schema": "http://json-schema.org/draft-07/schema#",
    "title": "Strategy Config",
    "type": "object",
    "properties": {
      "percent": {
          "type": "number",
          "description": "Percent for trailing stop order",
          "default": 5.0
      },
      "poolFee": {
        "description": "Pool fee percent for desired Uniswapv3 pool",
        "enum" : [10000, 3000, 500, 100],
        "enumNames": ["1%", "0.3%", "0.05%", "0.01%"]
      },
      "binWidth": {
          "type": "number",
          "description": "Width for liquidity position, must be a multiple of pool tick spacing",
          "default": 600
      }
    },
    "required": ["percent", "binWidth", "poolFee"]
  }`;
}

export function version(): i32 {
  return 1;
}

