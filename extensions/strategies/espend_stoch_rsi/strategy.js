var z = require('zero-fill')
  , n = require('numbro')
  , stoch_rsi = require('../../../lib/stoch_rsi')


module.exports = {
  name: 'espend_stoch_rsi',
  description: 'Stochastics RSI strategy based on cross overbought and oversold',

  getOptions: function () {
    this.option('period', 'period length eg 5m', String, '5m')
    this.option('min_periods', 'min. number of history periods', Number, 52)
    this.option('k_period', 'number of periods for overbought RSI', Number, 3)
    this.option('d_period', 'number of periods for overbought RSI', Number, 3)
    this.option('rsi_period', 'sold when RSI exceeds this value', Number, 14)
    this.option('stochastic_period', 'sold when RSI exceeds this value', Number, 14)
  },

  calculate: function () {
  },

  onPeriod: function (s, cb) {
    stoch_rsi(s, s.options.min_periods, s.options.k_period, s.options.d_period, s.options.rsi_period, s.options.stochastic_period).then(function(signal) {
      if(!signal) {
        cb()
        return
      }

      // bot overwrite reset
      if(s.last_signal === 'buy' && s.trend !== 'buy') {
        s.trend = 'buy'
      }

      // bot overwrite reset
      if(s.last_signal === 'sell' && s.trend !== 'sell') {
        s.trend = 'sell'
      }

      s.period['fastK'] = signal['fastK']
      s.period['fastD'] = signal['fastD']

      let trend = null

      if (s.trend !== 'buy') {
        if (s.period.fastK >= s.period.fastD && s.lookback[0].fastK < s.lookback[0].fastD && s.period.fastK > 20 && s.period.fastK < 80) {
          trend = 'buy'
          s.period.notice = 'upper cross'
        }

        if(s.period.fastK >= s.period.fastD && s.period.fastK > 20 && s.lookback[0].fastK < 20) {
          // lower cross

          trend = 'buy'
          s.period.notice = 'lower cross enter'
        }
      } else if(s.trend !== 'sell') {
        // upper cross
        if (s.period.fastK <= s.period.fastD && s.lookback[0].fastK > s.lookback[0].fastD && (s.period.fastK > 80 || s.lookback[0].fastK > 80)) {
          trend = 'sell'
          s.period.notice = 'upper exit'
        } else if(s.period.fastK < 20 && s.lookback[0].fastK > 20) {
          // lower cross

          trend = 'sell'
          s.period.notice = 'lower exit'
        }
      }

      if(trend && s.trend !== trend) {
        s.signal = trend
        s.trend = trend
      }

      cb()
    }).catch(function(error) {
      console.log(error)
      cb()
    })
  },

  onReport: function (s) {
    let cols = []

    if ( s.period.fastK && s.period.fastD ) {
      let colour = 'white'

      if ( s.period.fastK < s.period.fastD ) {
        colour = 'red'
      } else if (s.period.fastK > s.period.fastD ) {
        colour = 'green'
      }

      let number = n(s.period.fastK).format('00.0')
      let fastK = z(8, number, ' ')
      if(number < 20 || number > 80) {
        //fastK = fastK.bold
      }

      cols.push(fastK[colour])

      cols.push(z(8, n(s.period.fastD).format('00.0'), ' ')['yellow'])
    } else {
      cols.push(z(8, 'n/a', ' ').grey)
      cols.push(z(8, 'n/a', ' ').grey)
    }

    cols.push(z(15, s.period.notice ? s.period.notice : '', ' ').grey)

    return cols
  }
}
