let stochasticRSI = require('technicalindicators').StochasticRSI

module.exports = function volume(s, min_periods, fastkPeriod, slowkPeriod, rsiPeriod, stochasticPeriod) {
  return new Promise(function(resolve) {
    // create object for talib. only close is used for now but rest might come in handy
    if (!s.marketData) {
      s.marketData = { open: [], close: [], high: [], low: [], volume: [] }
    }

    if (s.lookback.length > s.marketData.close.length) {
      for (var i = (s.lookback.length - s.marketData.close.length) - 1; i >= 0; i--) {
        s.marketData.close.push(s.lookback[i].close)
      }
    }

    if (s.marketData.close.length < min_periods) {
      resolve()
      return
    }

    let tmpClose = s.marketData.close.slice()
    tmpClose.push(s.period.close)

    var result = stochasticRSI.calculate({
      values: tmpClose,
      rsiPeriod: rsiPeriod,
      stochasticPeriod: stochasticPeriod,
      kPeriod: fastkPeriod,
      dPeriod: slowkPeriod
    })

    if(!result) {
      resolve()
    }

    var value = result[result.length - 1]

    resolve({
      'fastK': value.k,
      'fastD': value.d,
    })
  })
}
