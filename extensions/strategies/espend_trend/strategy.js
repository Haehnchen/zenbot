var z = require('zero-fill')
  , n = require('numbro')
  , ema = require('../../../lib/ema')
  , ta_macd_ext = require('../../../lib/ta_macd_ext')
  , stoch_rsi = require('../../../lib/stoch_rsi')

module.exports = {
  name: 'espend_trend',
  description: 'Attempts to buy low and sell high by tracking RSI high-water readings.',

  getOptions: function () {
    this.option('period', 'period length, same as --period_length', String, '5m')
    this.option('period_length', 'period length, same as --period', String, '5m')
    this.option('min_periods', 'min. number of history periods', Number, 52)

    this.option('k_period', 'number of periods for overbought RSI', Number, 9)
    this.option('d_period', 'number of periods for overbought RSI', Number, 9)
    this.option('rsi_period', 'sold when RSI exceeds this value', Number, 42)
    this.option('stochastic_period', 'sold when RSI exceeds this value', Number, 42)
  },

  calculate: function () {
  },

  onPeriod: function (s, cb) {
    if(s.last_signal === 'buy' && s.trend !== 'buy') {
      s.trend = 'buy'
    }

    if(s.last_signal === 'sell' && s.trend !== 'sell') {
      s.trend = 'sell'
    }

    s.period.indicators = {}

    var calcs = [
      //ta_ema(s, 20),
      new Promise(function(resolve) {
        ema(s, 'ema_200', 200)
        ema(s, 'ema_55', 50)

        resolve()
      }),
      ta_macd_ext(s, 26 + 3, 12 + 3, 9 * 3, 'EMA', 'EMA', 'EMA').then(signal => {
        if(signal) {
          s.period['macd'] = signal.macd
          s.period['macd_histogram'] = signal.macd_histogram
          s.period['macd_signal'] = signal.macd_signal
        }
      }),
      stoch_rsi(s, s.options.min_periods, s.options.k_period, s.options.d_period, s.options.rsi_period, s.options.stochastic_period).then(function(signal) {
        if(!signal) {
          return
        }

        s.period.indicators.stoch_rsi = {
          'fastK': signal['fastK'],
          'fastD': signal['fastD'],
          'pct': signal['fastK'] - signal['fastD']
        }
      }),
    ]

    Promise.all(calcs).then(() => {
      let trend = null

      //
      if (s.trend === 'buy' && (s.period.ema_55 < s.period.ema_200)) {
        trend = 'sell'
        s.period.notice = 'trend change sell'
      }


      // security line: trend up
      if (s.period.ema_55 > s.period.ema_200 && s.period.close > s.period.ema_55) {
        // macd

        /*
        if (typeof s.period.macd_histogram === 'number' && typeof s.lookback[0].macd_histogram === 'number') {
        if (s.period.macd_histogram  > 0 && s.lookback[0].macd_histogram <= 0) {
          trend = 'buy'
        } else if (s.period.macd_histogram < 0 && s.lookback[0].macd_histogram) {
          trend = 'sell'
        }
        }

        */

        if(s.period.indicators.stoch_rsi && s.lookback[0].indicators.stoch_rsi) {
          let stochRsiCurrent = s.period.indicators.stoch_rsi
          let stochRsiLast = s.lookback[0].indicators.stoch_rsi

          if (s.trend !== 'buy' && stochRsiCurrent.fastK > 20 && stochRsiLast.fastK < 20) {
            trend = 'buy'
            s.period.notice = '20 buy'
          } else if(s.period.ema_55 < s.period.close && stochRsiCurrent.fastK < 35 && stochRsiCurrent.fastK >= stochRsiCurrent.fastD && stochRsiLast.fastK <= stochRsiLast.fastD) {
            trend = 'buy'
            s.period.notice = '35 cross buy'
          } else if(s.trend !== 'sell' && stochRsiCurrent.fastK < 50 && stochRsiLast.fastK > 50) {
            trend = 'sell'
            s.period.notice = '50 cross sell'
          } else if(s.trend !== 'sell' && stochRsiCurrent.fastK < 20 && stochRsiLast.fastK > 20) {
            s.period.notice = '20 cross sell'
            trend = 'sell'
          }
        }
      }


      if(trend && s.trend !== trend) {
        s.signal = trend
        s.trend = trend
      }

      cb()

    })
  },

  onReport: function (s) {
    let cols = []

    let stoch_rsi = s.period.indicators.stoch_rsi

    if (stoch_rsi) {
      let colour = 'white'

      if (stoch_rsi.fastK < stoch_rsi.fastD) {
        colour = 'red'
      } else if (stoch_rsi.fastK > stoch_rsi.fastD) {
        colour = 'green'
      }

      let number = n(stoch_rsi.fastK).format('00.0')
      let fastK = z(8, number, ' ')

      cols.push(fastK[colour])

      cols.push(z(8, n(stoch_rsi.fastD).format('00.0'), ' ')['yellow'])
      cols.push(z(8, n(stoch_rsi.fastK - stoch_rsi.fastD).format('00.0'), ' ')[stoch_rsi.fastK - stoch_rsi.fastD > 0 ? 'green' : 'red'])
    } else {
      cols.push(z(8, 'n/a', ' ').grey)
      cols.push(z(8, 'n/a', ' ').grey)
    }

    cols.push(z(15, s.period.notice ? s.period.notice : '', ' ').grey)

    return cols
  }
}

