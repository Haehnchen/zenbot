var ema = require('../../../lib/ema')

module.exports = {
  name: 'ema_cross',
  description:
    'Buy when (EMA - last(EMA) > 0) and sell when (EMA - last(EMA) < 0). Optional buy on low RSI.',

  getOptions: function () {
    this.option('period', 'period length, same as --period_length', String, '2m')
    this.option('period_length', 'period length, same as --period', String, '2m')
  },

  calculate: function(s) {
    ema(s, 'trend_ema_1', 8)
    ema(s, 'trend_ema_2', 13)
    ema(s, 'trend_ema_3', 21)
    ema(s, 'trend_ema_4', 55)
    ema(s, 'trend_ema_5', 200)
  },

  onPeriod: function (s, cb) {
    if (s.in_preroll) {
      return cb()
    }

    if (s.period.trend_ema_4 > s.period.trend_ema_5 && s.period.trend_ema_1 > s.period.trend_ema_4) {
      s.trend = 'up'
    } else {
      s.trend = 'down'
    }

    if(s.trend === 'up' && s.last_signal !== 'buy') {
      s.signal = 'buy'
    }

    if(s.trend === 'down' && s.last_signal !== 'sell') {
      s.signal = 'sell'
    }

    cb()
  },

  onReport: function() {
    var cols = []

    return cols
  },

  phenotypes: {},
}

