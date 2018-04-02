/*
>>>>>>>>>>>>>>>>>>>>     Williams %R     <<<<<<<<<<<<<<<<<<<<

%R = (Highest High – Closing Price) / (Highest High – Lowest Low) x -100

The Williams %R, often shortened to simply %R, is a technical analysis oscillator. This
indicator shows the present closing level of a commodity or stock in relation to the high
and the low over a given number of days. This analytical tool was developed by Larry
Williams, a publisher and a promoter of trading materials.

***The Williams %R vs the Fast Stochastic Oscillator***
The Williams %R is the inverse of the Fast Stochastic Oscillator. The Williams %R reflects
the level of a market’s close in relation to the highest high for the look-back period,
while the Fast Stochastic Oscillator reflects the level of a market’s close in relation
to the lowest low for the look-back period. The Williams %R corrects for the inversion
by taking the raw value it generates and multiplying it by -100. For this reason, both the
Williams %R and the Fast Stochastic Oscillator produce the exact same lines, with the
scaling of the lines being the only difference.

The Williams %R oscillates from 0 to -100. When the indicator produces readings from 0 to -20,
this indicates overbought market conditions. When readings are -80 to -100, it indicates
oversold market conditions.
*/
'use strict'
module.exports = function williamsr(s, key, length) {
  if (s.lookback.length < length) {
    s.period[key] = 0
  } else {
    let highestHigh = s.period.high
    let lowestLow = s.period.low
    s.lookback.slice(0, length).forEach(period => {
      highestHigh = Math.max(highestHigh, period.high)
      lowestLow = Math.min(lowestLow, period.low)
    })
    s.period[key] = (highestHigh - s.period.close) / (highestHigh - lowestLow) * -100
  }
}
