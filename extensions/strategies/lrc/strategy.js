let z = require('zero-fill')
  , n = require('numbro')
  , lrc = require('../../../lib/lrc')
  , ema = require('../../../lib/ema')
  , stddev = require('../../../lib/stddev')

module.exports = {
  name: 'lrc',
  description: 'LRC Test Strategy',

  getOptions: function () {
    this.option('period', 'period length, same as --period_length', String, '10s')
    this.option('period_length', 'period length, same as --period', String, '10s')
    this.option('min_periods', 'min. number of history periods', Number, 52)
  },

  calculate: function (s) {
    lrc(s, 'lrc', 32, 'close')
    ema(s, 'trend_ema', s.options.trend_ema)
    stddev(s, 'trend_ema_stddev', Math.floor(s.options.trend_ema / 2), 'trend_ema_rate')
  },

  onPeriod: function (s, cb) {
    if (s.in_preroll) {
      return cb()
    }

    if (s.period.lrc > s.period.close) {
      s.signal = 'buy'
    }

    if (s.period.close > s.period.lrc) {
      s.signal = 'sell'
    }

    cb()
  },

  onReport: function (s) {
    var cols = []

    if (typeof s.period.lrc === 'number') {
      var color = 'grey'
      if (s.period.lrc <= s.period.close) {
        color = 'green'
      }
      cols.push(z(4, n(s.period.lrc).format('0'), ' ')[color])
    }

    return cols
  }
}
