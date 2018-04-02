var z = require('zero-fill')
  , n = require('numbro')
  , rsi = require('../../../lib/rsi')
  , ta_stoch = require('../../../lib/ta_stoch')

module.exports = {
  name: 'ta_stoch',
  description: 'Stochastics strategy based on cross overbought and oversold',

  getOptions: function () {
    this.option('period', 'period length eg 5m', String, '5m')
    this.option('min_periods', 'min. number of history periods', Number, 52)
    this.option('overbought_rsi_periods', 'number of periods for overbought RSI', Number, 25)
    this.option('overbought_rsi', 'sold when RSI exceeds this value', Number, 90)
    this.option('slow_k_ma_type', 'slow_ma_type of talib: SMA, EMA, WMA, DEMA, TEMA, TRIMA, KAMA, MAMA, T3', String, null)
    this.option('slow_d_ma_type', 'slow_ma_type of talib: SMA, EMA, WMA, DEMA, TEMA, TRIMA, KAMA, MAMA, T3', String, null)
    this.option('default_ma_type', 'set default ma_type for fast, slow and signal. You are able to overwrite single types separately (fast_ma_type, slow_ma_type, signal_ma_type)', String, 'SMA')
    this.option('overbought', 'Overbought number', Number, 80)
    this.option('oversold', 'Overbought number', Number, 20)
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

    let types = {
      'slow_k_ma_type': s.options.default_ma_type || 'SMA',
      'slow_d_ma_type': s.options.default_ma_type || 'SMA',
    }

    if (s.options.slow_k_ma_type) {
      types['slow_k_ma_type'] = s.options.slow_k_ma_type
    }

    if (s.options.slow_d_ma_type) {
      types['slow_d_ma_type'] = s.options.slow_d_ma_type
    }

    ta_stoch(s, s.options.min_periods, s.options.fast_k_period, s.options.slow_k_period, types.slow_k_ma_type, s.options.slow_d_period, types.slow_d_ma_type).then(function(signal) {
      s.period['slowK'] = signal['slowK']
      s.period['slowD'] = signal['slowD']


      if(s.period.slowK < s.options.oversold) {
        s.oversolds = (s.oversolds || 0) + 1
      }


      if(s.signal == 'buy' && s.oversolds > 2) {
        s.signal = 'sell'
        s.oversolds = 0
        console.log('security oversold')
      }

      if ( s.period.slowK >= s.period.slowD && s.lookback[0].slowK < s.lookback[0].slowD && s.period.slowK < s.options.oversold) {
        s.signal = 'buy'
        s.oversolds = 0

      } else if( s.period.slowK <= s.period.slowD && s.lookback[0].slowK > s.lookback[0].slowD && s.period.slowK > s.options.overbought) {
        s.signal = 'sell'
        s.oversolds = 0
      }

      cb()
    }).catch(function(error) {
      console.log(error)
      cb()
    })
  },

  onReport: function (s) {
    let cols = []

    if ( s.period.slowK && s.period.slowD ) {
      let colour = 'white'

      if ( s.period.slowK < s.period.slowD ) {
        colour = 'red'
      } else if (s.period.slowK > s.period.slowD ) {
        colour = 'green'
      }
      cols.push(z(8, n(s.period.slowK).format('00.0'), ' ')[colour])
      cols.push(z(8, n(s.period.slowD).format('00.0'), ' ')['yellow'])
    }

    return cols
  }
}

