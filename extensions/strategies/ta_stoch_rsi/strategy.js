var z = require('zero-fill')
  , n = require('numbro')

module.exports = function container (get, set, clear) {
  return {
    name: 'ta_stoch_rsi',
    description: 'STOCHRSI - Stochastic Relative Strength Index',

    getOptions: function () {
      this.option('period', 'period length eg 10m', String, '5m')
      this.option('ma_type', 'matype of talib: SMA, EMA, WMA, DEMA, TEMA, TRIMA, KAMA, MAMA, T3', String, 'SMA')
      this.option('timeperiod', 'timeperiod for TRIX', Number, 14)
    },

    calculate: function (s) {

    },

    onPeriod: function (s, cb) {
      get('lib.ta_stoch_rsi')(s, s.options.timeperiod, s.options.ma_type).then(function(signal) {
        s.period.signal = signal;

        if (signal) {
          s.period.trend = signal.outFastD > signal.outFastK && signal.outFastD > 0 ? 'up' : 'down';
        }

        if (s.period.trend == 'up') {
          if (s.trend !== 'up') {
            s.acted_on_trend = false
          }

          s.trend = 'up'
          s.signal = !s.acted_on_trend ? 'buy' : null
        } else if (s.period.trend == 'down') {
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

      if (typeof s.period.signal !== 'undefined') {
        let color = s.period.outFastD > s.period.outFastK && s.period.outFastD > 0 ? 'green' : 'red';

        cols.push(z(8, n(s.period.signal.outFastD).format('0.0000'), ' ')[color])
        cols.push(z(9, n(s.period.signal.outFastK).format('0.0000'), ' ')[color])
     }

      return cols
    }
  }
}
