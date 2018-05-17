var z = require('zero-fill')
  , n = require('numbro')

module.exports = {
  name: 'random',
  description: 'Buy when (EMA - last(EMA) > 0) and sell when (EMA - last(EMA) < 0). Optional buy on low RSI.',

  getOptions: function () {
    this.option('period', 'period length, same as --period_length', String, '10m')
    this.option('period_length', 'period length, same as --period', String, '10m')
  },

  calculate: function () {
  },

  onPeriod: function (s, cb) {
    s.period.random = Math.floor((Math.random() * 12) + 1)

    if (s.signal != 'buy' && s.period.random === 6) {
      s.signal = 'buy'
    } else if (s.signal != 'sell' &&  s.period.random === 1) {
      s.signal = 'sell'
    }

    cb()
  },

  onReport: function (s) {
    var cols = []

    if (typeof s.period.random === 'number') {
      let color = 'grey'

      if (s.period.random === 6) {
        color = 'green'
      } else if (s.period.random === 1) {
        color = 'red'
      }

      cols.push(z(4, n(s.period.random).format('0'), ' ')[color])
    }

    return cols
  },
}

