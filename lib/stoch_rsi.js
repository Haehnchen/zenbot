let stochasticRSI = require('technicalindicators').StochasticRSI

module.exports = function volume(s, min_periods, fastkPeriod, slowkPeriod, rsiPeriod, stochasticPeriod) {
  return new Promise(function(resolve) {
    let marketData = { close: [] }

    s.lookback.slice(0, 1000).reverse().forEach(function (lookback) {
      marketData.close.push(lookback.close)
    })

    // add current data
    marketData.close.push(s.period.close)

    var result = stochasticRSI.calculate({
      values:  marketData.close,
      rsiPeriod: rsiPeriod,
      stochasticPeriod: stochasticPeriod,
      kPeriod: fastkPeriod,
      dPeriod: slowkPeriod
    })

    if(!result) {
      resolve()
    }

    var value = result[result.length - 1]

    if(!value || !value.k || !value.d) {
      resolve()
      return
    }

    resolve({
      'fastK': value.k,
      'fastD': value.d,
    })
  })
}
