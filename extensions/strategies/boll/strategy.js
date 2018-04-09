/**
 * Bolling based strategy
 *
 * Invest after a dip and  try to find a valid "line path" upside inside bollinger bands to get exit points
 *
 * @author Daniel Espendiller <daniel@espendiller.net>
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

    this.option('bollinger_breakout_lookbacks', 'breakout trigger: lookbacks to calculate average bollinger size', Number, 30)
    this.option('bollinger_breakout_lookback_steps', 'breakout trigger: step in lookup to visit, so visit all history random cherry-pick', Number, 3)
    this.option('bollinger_breakout_trend_ema', 'breakout trigger: ema line our band line cross from bottom', Number, 12)
    this.option('bollinger_breakout_dips', 'breakout trigger: dips in row after when allow breakout', Number, 10)
    this.option('bollinger_breakout_size_violation_pct', 'breakout trigger: bollinger band size violation in percent based on last periods to trigger breakout', Number, 80)


    this.option('bollinger_sell_trigger_bullish_band', 'Move sell trigger to x10 band size on big run detection', Number, 1)
    this.option('bollinger_sell_touch_distance_pct', 'exit trigger: after crossing upper band distance lose to exit', Number, 0.5)

    this.option('bollinger_sell_trigger', 'Trigger sell indicator: "auto", "cross", "touch"', String, 'touch')
  },

  calculate: function () {
  },

  onPeriod: function (s, cb) {
    // calculate Bollinger Bands
    bollinger(s, 'bollinger', s.options.bollinger_size)
    bollinger(s, 'bollinger_bullish', s.options.bollinger_size * 10)

    ema(s, 'trend_ema_breakout', s.options.bollinger_breakout_trend_ema)

    if(s.last_signal === 'buy' && s.trend !== 'buy') {
      s.trend = 'buy'
    }

    if(s.last_signal === 'sell' && s.trend !== 'sell') {
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
      let trendHma = s.period.trend_hma

      if (s.period.bollinger) {

        let upperBound = s.period.bollinger.upper[s.period.bollinger.upper.length-1]
        let lowerBound = s.period.bollinger.lower[s.period.bollinger.lower.length-1]

        if(s.lookback[0].trend_hma < lowerBound && trendHma > lowerBound) {
          // cross up lower band
          if (s.trend !== 'buy') {
            s.trend = 'buy'
            s.signal = 'buy'
          }

          s.upper = 0
          s.lower = 0

          // last buy price based on hma price value
          s.hma_buy = trendHma
        } else if(s.trend !== 'sell' && shouldSell(s)) {
          s.trend = 'sell'
          s.signal = 'sell'

          s.upper = 0
          s.lower = 0
          s.upper_distances = 0
          s.upper_bullish_distances = 0
        }

        if (s.trend !== 'buy'
          && s.lookback[0].trend_hma < s.lookback[0].trend_ema_breakout // break
          && s.period.trend_hma > s.period.trend_ema_breakout
        ) {

          let bollingerBreakout = getBollingerBreakout(s.lookback)

          if (bollingerBreakout.bolling_band_size_percent) {
            let averageBandSizeCompare = percent(bollingerBreakout.bolling_band_size_percent, getAverageBandSize(
              s.lookback,
              s.options.bollinger_breakout_lookbacks,
              s.options.bollinger_breakout_lookback_steps
            ))

            if(bollingerBreakout.since > 10) {
              s.period.breakout_pct = averageBandSizeCompare

              if(averageBandSizeCompare > s.options.bollinger_breakout_size_violation_pct) {
                console.log('Breakout buy at: ' + n(averageBandSizeCompare).format('0.0') + ' %')

                s.trend = 'buy'
                s.signal = 'buy'
              }
            }
          }
        }

        s.upper = trendHma > upperBound ? (s.upper || 0) + 1 : 0
        s.lower = trendHma < lowerBound ? (s.lower || 0) + 1 : 0
      }

      if (s.period.bollinger_bullish) {
        let upperBound = s.period.bollinger_bullish.upper[s.period.bollinger_bullish.upper.length-1]
        let lowerBound = s.period.bollinger_bullish.lower[s.period.bollinger_bullish.lower.length-1]

        s.upper_bullish = trendHma > upperBound ? (s.upper_bullish || 0) + 1 : 0
        s.lower_bullish = trendHma < lowerBound ? (s.lower_bullish || 0) + 1 : 0
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
      cols.push((z(8, '', ' ')))
      cols.push((z(8, '', ' ')))
    }

    if(s.period.breakout_pct) {
      var color = 'grey'
      if(s.period.breakout_pct > s.options.bollinger_breakout_size_violation_pct) {
        color = 'green'
      }

      cols.push((z(8, n(s.period.breakout_pct).format('0.0'), ' ') + '%')[color])
    } else {
      cols.push((z(9, '', ' ')))
    }

    return cols
  },
}

function getBandSizeInPercent(bollinger) {
  return (bollinger.upper - bollinger.lower) / bollinger.upper * 100
}

/**
 * Get the average band size on history; to check if current band size is in violation
 */
function getAverageBandSize(myLookback, breakoutLookbacks, breakoutLookbacksSteps) {
  let bandSizes = myLookback.slice(breakoutLookbacksSteps, breakoutLookbacks).filter(function (lookback, index) {
    return typeof lookback.bollinger !== 'undefined' && index % breakoutLookbacksSteps === 0
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
    'mid': bollinger.lower[bollinger.lower.length - 1],
  }
}

function shouldSell(s) {
  let bollinger = extractLastBollingerResult(s.period.bollinger)

  let trendHma = s.period.trend_hma
  let trendHmaExit = s.period.trend_hma_exit

  switch (s.options.bollinger_sell_trigger) {
  case 'cross':
    // middle crossed middle
    if(trendHma < bollinger.upper && s.lookback[0].trend_hma > bollinger.upper) {
      console.log('Sell based on upper croos from top')
      return true
    }

    break
  case 'touch':
    // connection to upper band lost

    // upper band
    if(s.options.bollinger_sell_trigger_bullish_band === 1 && (s.upper_bullish > 0 || s.upper_bullish_distances > 0)) {
      let bollinger = extractLastBollingerResult(s.period.bollinger_bullish)

      if(trendHma > bollinger.upper) {
        return false
      }

      let diff = percent(bollinger.upper, s.period.trend_hma)

      let distance = getAvarageUpperLineTouchs(s.lookback, s.options.bollinger_sell_touch_distance_pct)

      if(diff > distance) {
        s.upper_bullish_distances = 0
        console.log('Sell based on upper bollinger bullish lose')
        return true
      }

      s.upper_bullish_distances = (s.upper_bullish_distances || 0) + 1

      return false
    }

    // normal band
    if((s.upper > 0 || s.upper_distances > 0)) {
      let bollinger = extractLastBollingerResult(s.period.bollinger)

      if(trendHma > bollinger.upper) {
        return false
      }

      let diff = percent(bollinger.upper, s.period.trend_hma)

      let distance = getAvarageUpperLineTouchs(s.lookback, s.options.bollinger_sell_touch_distance_pct)

      if(diff > distance) {
        s.upper_distances = 0
        console.log('Sell based on upper bollinger lose')
        return true
      }

      s.upper_distances = (s.upper_distances || 0) + 1

      return false
    }

    break
  case 'auto':
    console.log('not supported yet'.red)
    break
  default:
    console.log('not supported sell trigger'.red)
  }

  // middle crossed middle
  if(s.lookback[0].trend_hma_exit > bollinger.mid && trendHmaExit < bollinger.mid) {
    console.log('Sell based on mid bollinger cross')
    return true
  }

  // drop under lower line; take lose or wait for recovery
  if(s.lower > 0) {
    // on init and restart force a sell signal on non price
    if(typeof s.last_buy_price === 'undefined') {
      console.log('Dropper under upper sell without price'.red)
      return true
    }

    let loss = ((s.last_buy_price - trendHma) / s.hma_buy * 100)
    let loss2 = ((s.last_buy_price - s.period.close) / s.hma_buy * 100)

    if(((loss + loss2) / 2) > s.options.stop_lose) {
      console.log((('Secure sell take lost of ' + n(loss).format('0.00')) + ' %').red)
      return true
    }
  }

  return false
}

function getAvarageUpperLineTouchs(lookback, distancePct) {
  let percentages = []

  for (let i = 0; i <= 30; i++) {
    let bollinger = extractLastBollingerResult(lookback[i].bollinger)

    let percentage = percent(bollinger.upper, lookback[i].trend_hma)
    if(percentage < 0) {
      percentage = 0
    }

    percentages.push(percentage)

    if(percentage > distancePct) {
      break
    }
  }

  return percentages.reduce( ( p, c ) => p + c, 0 ) / percentages.length
}
