/**
 * Bolling based strategy
 *
 * Invest after a dip and  try to find a valid "line path" upside inside bollinger bands to get exit points
 *
 * @author Daniel Espendiller <daniel@espendiller.net
 */
var z = require('zero-fill')
  , n = require('numbro')
  , bollinger = require('../../../lib/bollinger')
  , ti_hma = require('../../../lib/ti_hma')
  , ema = require('../../../lib/ema')

module.exports = {
  name: 'boll',
  description: 'Buy when out band line crossing the bottom bollinger band bottom or breakout is detected',

  getOptions: function () {
    this.option('period', 'period length, same as --period_length', String, '15m')
    this.option('period_length', 'period length, same as --period', String, '15m')

    this.option('min_periods', 'min. number of history periods', Number, 52)
    this.option('stop_lose', 'lose percentage after exit trade; so bollinger recovery faild', Number, 2.75)

    this.option('bollinger_size', 'period size', Number, 20)
    this.option('bollinger_time', 'times of standard deviation between the upper band and the moving averages', Number, 2)

    this.option('bollinger_breakout_trend_ema', 'breakout trigger: ema line our band line cross from bottom', Number, 12)
    this.option('bollinger_breakout_dips', 'breakout trigger: dips in row after when allow breakout', Number, 10)
    this.option('bollinger_breakout_size_violation', 'breakout trigger: bollinger band size violation in percent based on last periods to trigger breakout', Number, 80)
  },

  calculate: function () {
  },

  onPeriod: function (s, cb) {
    // calculate Bollinger Bands
    bollinger(s, 'bollinger', s.options.bollinger_size)
    ema(s, 'trend_ema_breakout', s.options.bollinger_breakout_trend_ema)

    if(s.last_signal == 'buy' && s.trend != 'buy') {
      s.trend = 'buy'
    }

    if(s.last_signal == 'sell' && s.trend != 'sell') {
      s.trend = 'sell'
    }

    var calcs = [
      ti_hma(s, s.options.min_periods, 9).then(function(signal) {
        s.period['trend_hma'] = signal
      }).catch(function() {

      }),
      ti_hma(s, s.options.min_periods, 21).then(function(signal) {
        s.period['trend_hma_exit'] = signal
      }).catch(function() {

      })
    ]

    Promise.all(calcs).then(() => {
      if (s.period.bollinger) {
        if (s.period.bollinger.upper && s.period.bollinger.lower) {
          let upperBound = s.period.bollinger.upper[s.period.bollinger.upper.length-1]
          let lowerBound = s.period.bollinger.lower[s.period.bollinger.lower.length-1]
          let midBound = s.period.bollinger.mid[s.period.bollinger.mid.length-1]

          let trendHma = s.period.trend_hma
          let trendHmaExit = s.period.trend_hma_exit

          if(s.lookback[0].trend_hma < lowerBound && trendHma > lowerBound) {
            // cross up lower band
            if (s.trend != 'buy') {
              s.trend = 'buy'
              s.signal = 'buy'
            }

            s.upper = 0
            s.lower = 0

            s.hma_buy = trendHma
          } else if(s.upper > 0 && trendHma < upperBound) {
            // upper band lost
            if (s.trend != 'sell') {
              s.trend = 'sell'
              s.signal = 'sell'
            }

            s.upper = 0
            s.lower = 0
          } else if(s.trend == 'buy' && (s.lookback[0].trend_hma_exit > midBound && trendHmaExit < midBound)) {
            // middle crossed middle
            s.trend = 'sell'
            s.signal = 'sell'

            s.upper = 0
            s.lower = 0
          } else if(s.trend == 'buy' && s.lower > 0) {
            // calculate lost based on hma
            let loss = ((s.last_buy_price- trendHma) / s.hma_buy * 100)
            let loss2 = ((s.last_buy_price - s.period.close) / s.hma_buy * 100)

            if(((loss + loss2) / 2) > s.options.stop_lose) {
              console.log((('Secure sell take lost of ' + n(loss).format('0.00')) + ' %').red)
              s.trend = 'sell'
              s.signal = 'sell'
            }
          }

          if (s.trend == 'sell'
            && s.lookback[0].trend_hma < s.lookback[0].trend_ema_breakout // break
            && s.period.trend_hma > s.period.trend_ema_breakout
          ) {

            let bollingerBreakout = getBollingerBreakout(s.lookback)

            if (bollingerBreakout.bolling_band_size_percent) {

              let averageBandSize = percent(bollingerBreakout.bolling_band_size_percent, getAverageBandSize(s.lookback))

              if(bollingerBreakout.since > 10 && averageBandSize > s.options.bollinger_breakout_size_violation) {
                console.log('Breakout buy at: ' + n(averageBandSize).format('0.0') + ' %')

                s.trend = 'buy'
                s.signal = 'buy'
              }              
            }
          }

          s.upper = trendHma > upperBound ? s.upper + 1 : 0
          s.lower = trendHma < lowerBound ? s.lower + 1 : 0
        }
      }

      cb()
    })
  },

  onReport: function (s) {
    var cols = []
    if (s.period.bollinger) {
      if (s.period.bollinger.upper && s.period.bollinger.lower) {

        let upperBound = s.period.bollinger.upper[s.period.bollinger.upper.length-1]
        let lowerBound = s.period.bollinger.lower[s.period.bollinger.lower.length-1]
        let midBound = s.period.bollinger.mid[s.period.bollinger.mid.length-1]

        let signal = z(8, n(s.period.trend_hma).format('+0.00'), ' ')

        if (s.period.trend_hma > lowerBound && s.period.trend_hma < midBound) {
          cols.push(signal.yellow)
        } else if (s.period.trend_hma < lowerBound) {
          cols.push(signal.red)
        } else if (s.period.trend_hma > midBound && s.period.trend_hma < upperBound) {
          cols.push(signal.green)
        } else if (s.period.trend_hma > upperBound) {
          cols.push(signal.bold.green)
        }

        let range = upperBound - lowerBound

        let upper = Math.abs(((s.period.trend_hma - upperBound) / range) * 100)
        let lower = Math.abs(((s.period.trend_hma - lowerBound) / range) *100)

        cols.push(z(8, n(upper).format('0.0'), ' ').cyan)
        cols.push(z(8, n(lower).format('0.0'), ' ').cyan)
      }
    }
    else {
      cols.push('         ')
    }
    return cols
  },
}

function getBandSizeInPercent(bollinger) {
  return (bollinger.upper - bollinger.lower) / bollinger.upper * 100
}

function getAverageBandSize(myLookback) {
  let bandSizes = myLookback.slice(5, 200).filter(function (lookback, index) {
    return typeof lookback.bollinger !== 'undefined' && index % 5 === 0
  }).map(function (lookback) {
    return getBandSizeInPercent(extractLastBollingerResult(lookback.bollinger))
  })

  return bandSizes.reduce( ( p, c ) => p + c, 0 ) / bandSizes.length
}

function percent(value1, value2) {
  return (value1 - value2) / value1 * 100
}

function getBollingerBreakout(lookback) {
  var low = -1
  var low_boll = -1

  for (let i = 1; i < lookback.length - 100; i++) {
    let boldMid = lookback[i].bollinger.mid[lookback[i].bollinger.mid.length - 1]
    let trendHma2 = lookback[i].trend_hma

    var low_object

    if(low < 0) {
      low = lookback[i].close
      low_boll = (lookback[i].bollinger.upper[lookback[i].bollinger.upper.length - 1] - lookback[i].close) / lookback[i].bollinger.upper[lookback[i].bollinger.upper.length - 1] * 100
      low_object = extractLastBollingerResult(lookback[i].bollinger)
    }

    if(lookback[i].close < low) {
      low = lookback[i].close
      low_boll = (lookback[i].bollinger.upper[lookback[i].bollinger.upper.length - 1] - lookback[i].close) / lookback[i].bollinger.upper[lookback[i].bollinger.upper.length - 1] * 100
      low_object = extractLastBollingerResult(lookback[i].bollinger)
    }

    if(boldMid && trendHma2 > boldMid) {
      let bollTop = lookback[0].bollinger.upper[lookback[0].bollinger.upper.length - 1]

      return {
        'since': i,
        'close': lookback[i].close,
        'percent': (lookback[i].close - lookback[0].close) / lookback[i].close * 100,
        'bolling_top': (bollTop - lookback[0].close) / bollTop * 100,
        'bolling_low': low,
        'bolling_low_percent': low_boll,
        'bolling_band_size_percent': getBandSizeInPercent(low_object),
      }
    }
  }

  return {}
}

function extractLastBollingerResult(bollinger) {
  return {
    'upper': bollinger.upper[bollinger.upper.length - 1],
    'lower': bollinger.lower[bollinger.lower.length - 1],
  }
}
