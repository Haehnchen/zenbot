var z = require('zero-fill')
  , n = require('numbro')
  , rsi = require('../../../lib/rsi')
  , ta_willr = require('../../../lib/ta_willr')

module.exports = {
  name: 'ta_willr',
  description: 'WILLR - Williams\' %R with rsi oversold',

  getOptions: function () {
    this.option('period', 'period length eg 10m', String, '10m')
    this.option('timeperiod', 'timeperiod for TRIX', Number, 14)
    this.option('overbought_rsi_periods', 'number of periods for overbought RSI', Number, 25)
    this.option('overbought_rsi', 'sold when RSI exceeds this value', Number, 70)
  },

  calculate: function (s) {
    if (s.options.overbought_rsi) {
      // sync RSI display with overbought RSI periods
      s.options.rsi_periods = s.options.overbought_rsi_periods
      rsi(s, 'overbought_rsi', s.options.overbought_rsi_periods)
      if (!s.in_preroll && s.period.overbought_rsi >= s.options.overbought_rsi && !s.overbought) {
        s.overbought = true

        if (s.options.mode === 'sim' && s.options.verbose) {
          console.log(('\noverbought at ' + s.period.overbought_rsi + ' RSI, preparing to sold\n').cyan)
        }
      }
    }
  },

  onPeriod: function (s, cb) {
    if (!s.in_preroll && typeof s.period.overbought_rsi === 'number') {
      if (s.overbought) {
        s.overbought = false
        s.signal = 'sell'
        return cb()
      }
    }

    ta_willr(s, s.options.timeperiod).then(function(ppoSignal) {
      s.period['signal'] = ppoSignal

      if (s.period.signal) {

        if(s.period.signal >= -20) {
          s.period.trend_ppo = 'up';
        }

        if(s.period.signal <= -80) {
          s.period.trend_ppo = 'down';
        }
      }

      if (s.period.trend_ppo == 'up') {
        if (s.trend !== 'up') {
          s.acted_on_trend = false
        }

        s.trend = 'up'
        s.signal = !s.acted_on_trend ? 'buy' : null
      } else if (s.period.trend_ppo == 'down') {
        if (s.trend !== 'down') {
          s.acted_on_trend = false
        }

        s.trend = 'down'
        s.signal = !s.acted_on_trend ? 'sell' : null
      }

      cb()
    }).catch(function(error) {
      console.log(error)
      cb()
    })
  },

  onReport: function (s) {
    let cols = []

    if (typeof s.period.signal === 'number') {
      var color = 'yellow'

      if(s.period.signal < 20) {
        color = 'green'
      }

      if(s.period.signal > 80) {
        color = 'red'
      }

      cols.push(z(8, n(s.period.signal).format('0.0000'), ' ')[color])
    }

    return cols
  }
}

