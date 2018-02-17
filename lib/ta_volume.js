// allows to use all talib Volume Indicator Functions: https://mrjbq7.github.io/ta-lib/func_groups/volume_indicators.html
// AD - Chaikin A/D Line
// ADOSC - Chaikin A/D Oscillator
// OBV - On Balance Volume

var talib = require('talib')

module.exports = function volume(s, min_periods, indicator, fastperiod, slowperiod) {
  return new Promise(function(resolve, reject) {
    // create object for talib. only close is used for now but rest might come in handy
    if (!s.marketData) {
      s.marketData = { open: [], close: [], high: [], low: [], volume: [] }
    }

    if (s.lookback.length > s.marketData.close.length) {
      for (var i = (s.lookback.length - s.marketData.close.length) - 1; i >= 0; i--) {
        s.marketData.high.push(s.lookback[i].high)
        s.marketData.low.push(s.lookback[i].low)
        s.marketData.close.push(s.lookback[i].close)
        s.marketData.volume.push(s.lookback[i].volume)
      }
    }

    if (s.marketData.close.length < min_periods) {
      resolve()
      return
    }

    let tmpHigh = JSON.parse(JSON.stringify(s.marketData.high))
    tmpHigh.push(s.period.high)

    let tmpLow = JSON.parse(JSON.stringify(s.marketData.low))
    tmpLow.push(s.period.low)

    let tmpClose = JSON.parse(JSON.stringify(s.marketData.close))
    tmpClose.push(s.period.close)

    let tmpVolume = JSON.parse(JSON.stringify(s.marketData.volume))
    tmpVolume.push(s.period.volume)

    talib.execute({
      name: indicator,
      startIdx: 0,
      endIdx: tmpHigh.length -1,
      high: tmpHigh,
      low: tmpLow,
      close: tmpClose,
      volume: tmpVolume,
      inReal: tmpClose,
      optInFastPeriod: fastperiod || 3,
      optInSlowPeriod: slowperiod || 20
    }, function (err, result) {
      if (err) {
        reject(err, result)
        return
      }

      resolve(result.result.outReal[(result.nbElement - 1)])
    })
  })
}

