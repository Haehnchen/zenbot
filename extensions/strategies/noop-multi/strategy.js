var z = require('zero-fill')
  , n = require('numbro')
  , ta_macd_ext = require('../../../lib/ta_macd_ext')
  , ultosc = require('../../../lib/ta_ultosc')
  , adosc = require('../../../lib/ta_volume')
  , willr = require('../../../lib/ta_willr')
  , ema = require('../../../lib/ema')
  , vma = require('../../../lib/vma')

module.exports = {
  name: 'noop-multi',
  description: 'Just do nothing. Can be used to e.g. generate candlesticks for training the genetic forex strategy.',

  getOptions: function () {
    this.option('period', 'period length, same as --period_length', String, '30m')
    this.option('period_length', 'period length, same as --period', String, '30m')
  },

  calculate: function () {
  },

  onPeriod: function (s, cb) {


    var calcs = [
      //ta_ema(s, 20),
      new Promise(function(resolve) {
        ema(s, 'trend_ema', 34)
        vma(s, 'vma', 34)

        if (s.period.trend_ema && s.lookback[0] && s.lookback[0].trend_ema) {
          s.period.acc = (s.period.trend_ema - s.lookback[0].trend_ema) / s.lookback[0].trend_ema * 100
        }

        resolve()
      }),
      ultosc(s, s.options.min_periods, 7, 14, 28).then(signal => {
        if(signal) {
          s.period['ultosc'] = signal
        }
      }),
      willr(s, s.options.min_periods).then(signal => {
        if(signal) {
          s.period['willr'] = signal
        }
      }),
      adosc(s, s.options.min_periods, 'ADOSC', 3, 10).then(signal => {
        if(signal) {
          s.period['adosc'] = signal
        }
      }),
      ta_macd_ext(s, 26, 12, 9, 'DEMA', 'DEMA', 'DEMA').then(signal => {
        if(signal) {
          s.period['macd'] = signal.macd
          s.period['macd_histogram'] = signal.macd_histogram
          s.period['macd_signal'] = signal.macd_signal
        }
      })
    ]

    Promise.all(calcs).then(() => {
      cb()
    })
  },

  onReport: function (s) {
    var cols = []

    if (typeof s.period.macd_histogram === 'number') {
      var color = 'grey'

      if (s.period.macd_histogram > 0) {
        color = 'green'
      } else if (s.period.macd_histogram < 0) {
        color = 'red'
      }

      cols.push(z(6, n(s.period.macd_histogram).format('+00.00'), ' ')[color])
    } else {
      cols.push(z(6, '' , ' '))
    }

    if (typeof s.period.ultosc === 'number') {
      let signal = z(8, n(s.period.ultosc).format('0.00'), ' ')

      if (s.period.ultosc <= 30) {
        cols.push(signal.red)
      } else if (s.period.ultosc > 30 && s.period.ultosc <= 50) {
        cols.push(signal.yellow)
      } else if (s.period.ultosc > 50 && s.period.ultosc < 70) {
        cols.push(signal.green)
      } else if (s.period.ultosc >= 70) {
        cols.push(signal.bold.green)
      }
    } else {
      cols.push(z(8, '' , ' '))
    }

    if (typeof s.period.willr === 'number') {
      let signal = z(8, n(s.period.willr).format('+0.00'), ' ')

      if (s.period.willr >= -20) {
        cols.push(signal.bold.green)
      } else if (s.period.willr < -20 && s.period.willr > -80) {
        cols.push(signal.green)
      } else if (s.period.willr < -80) {
        cols.push(signal.red)
      }
    } else {
      cols.push(z(8, '' , ' '))
    }

    if (typeof s.period.adosc === 'number') {

      let signal = z(8, n(parseInt(s.period.adosc.toString().substring(0, 3))).format('+0.00'), ' ')

      if (s.period.adosc > 0) {
        cols.push(signal.bold.green)
      } else {
        cols.push(signal.red)
      }
    } else {
      cols.push(z(8, n(0).format('+0.00'), ' ').yellow)
    }

    if (typeof s.period.acc === 'number') {

      let signal = z(8, n(s.period.acc).format('+0.00'), ' ')

      if (s.period.acc < -0.03) {
        cols.push(signal.red)
      } else if (s.period.acc > 0.03) {
        cols.push(signal.green)
      } else {
        cols.push(signal.yellow)
      }
    } else {
      cols.push(z(8, n(0).format('+0.00'), ' ').yellow)
    }

    if (typeof s.period.trend_ema === 'number') {
      cols.push(z(10, n(s.period.trend_ema).format('+0.0000000'), ' ')[s.period.close < s.period.trend_ema ? 'red' : 'green'])
    }

    if (typeof s.period.vma === 'number') {
      cols.push(z(10, n(s.period.vma).format('+0.0000000'), ' ')[s.period.close < s.period.vma ? 'red' : 'green'])
    }

    return cols
  }
}

