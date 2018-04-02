var z = require('zero-fill')
  , n = require('numbro')
  , rsi = require('../../../lib/rsi')
  , ta_volume = require('../../../lib/ta_volume')

module.exports = {
  name: 'ta_volume',
  description: 'ADOSC - Chaikin A/D Oscillator with rsi oversold',

  getOptions: function () {
    this.option('period', 'period length eg 10m', String, '5m')
    this.option('min_periods', 'min. number of history periods', Number, 52)
    this.option('indicator', 'AD, ADOSC, OBV', String, 'ADOSC')
    this.option('fastperiod', 'ADOSC: timeperiod for ADOSC', Number, 3)
    this.option('slowperiod', 'ADOSC: slowperiod for ADOSC', Number, 20)
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

    ta_volume(s, s.options.min_periods, s.options.indicator, s.options.fastperiod, s.options.slowperiod).then(function(signal) {
      s.period['signal'] = signal

      if (s.period.signal && s.lookback[0] && s.lookback[0].signal) {
        s.period.trend_signal = s.period.signal >= 0 ? 'up' : 'down'
      }

      if (s.period.trend_signal == 'up') {
        if (s.trend !== 'up') {
          s.acted_on_trend = false
        }

        s.trend = 'up'
        s.signal = !s.acted_on_trend ? 'buy' : null
      } else if (s.period.trend_signal == 'down') {
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
      let color = s.period.signal > 0 ? 'green' : 'red'

      cols.push(z(8, n(s.period.signal).format('0.00'), ' ')[color])
    } else {
      cols.push(z(8, n(0).format('0.00'), ' ')['grey'])
    }

    return cols
  }
}
