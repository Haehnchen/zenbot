var talib = require('talib')

module.exports = function volume(s, min_periods, fastkPeriod, slowkPeriod, slowkMatype, slowdPeriod, slowdMatype) {
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

    let tmpHigh = s.marketData.high.slice()
    tmpHigh.push(s.period.high)

    let tmpLow = s.marketData.low.slice()
    tmpLow.push(s.period.low)

    let tmpClose = s.marketData.close.slice()
    tmpClose.push(s.period.close)

    let tmpVolume = s.marketData.volume.slice()
    tmpVolume.push(s.period.volume)

    talib.execute({
      name: 'STOCH',
      startIdx: 0,
      endIdx: tmpHigh.length -1,
      high: tmpHigh,
      low: tmpLow,
      close: tmpClose,
      volume: tmpVolume,
      inReal: tmpClose,
      optInFastK_Period: fastkPeriod || 5,
      optInSlowK_Period: slowkPeriod || 3,
      optInSlowD_Period: slowdPeriod || 3,
      optInSlowK_MAType: getMaTypeFromString(slowkMatype || 'SMA'),
      optInSlowD_MAType: getMaTypeFromString(slowdMatype || 'SMA')
    }, function (err, result) {
      if (err) {
        reject(err, result)
        return
      }

      let result2 = result.result

      resolve({
        'slowK': result2.outSlowK[(result2.outSlowK.length - 1)],
        'slowD': result2.outSlowD[(result2.outSlowD.length - 1)],
      })
    })
  })
}


/**
 * Extract int from string input eg (SMA = 0)
 *
 * @see https://github.com/oransel/node-talib
 * @see https://github.com/markcheno/go-talib/blob/master/talib.go#L20
 */
function getMaTypeFromString(maType) {
  // no constant in lib?

  switch (maType.toUpperCase()) {
  case 'SMA':
    return 0
  case 'EMA':
    return 1
  case 'WMA':
    return 2
  case 'DEMA':
    return 3
  case 'TEMA':
    return 4
  case 'TRIMA':
    return 5
  case 'KAMA':
    return 6
  case 'MAMA':
    return 7
  case 'T3':
    return 8
  default:
    return 0
  }
}

