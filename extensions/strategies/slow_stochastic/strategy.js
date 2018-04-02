var z = require('zero-fill')
  , n = require('numbro')
  , sma = require('../../../lib/sma')
  , Phenotypes = require('../../../lib/phenotype')

module.exports =  {
  name: 'slow_stochastic',
  description: 'A slow_stochastic strategy. Copy of the tradeview slow stochastic strategy',

  getOptions: function () {
    this.option('period', 'period length, same as --period_length', String, '15m')
    this.option('period_length', 'period length, same as --period', String, '15m')
    this.option('min_periods', 'min. number of history periods.', Number, 20)
    this.option('stoch_length', 'Length for stoch calculation.', Number, 14)
    this.option('smooth_k', 'K sma length', Number, 5)
    this.option('smooth_d', 'D sma length', Number, 3)
    this.option('overbought', 'Overbought number', Number, 80)
    this.option('oversold', 'Overbought number', Number, 20)
  },

  calculate: function () {

  },

  onPeriod: function (s, cb) {

    if ( s.lookback.length > s.options.stoch_length ){

      let marketData = { high: [], low: [], close: [] }

      for (var i = (s.options.stoch_length); i >= 0; i--) {
        marketData.high.push(s.lookback[i]['high'])
        marketData.low.push(s.lookback[i]['low'])
        marketData.close.push(s.lookback[i]['close'])
      }

      marketData.high.push(s.period.high)
      marketData.low.push(s.period.low)
      marketData.close.push(s.period.close)

      let low = Math.min( ...marketData.low )
      let high = Math.max( ...marketData.high )

      s.period.stoch = 100 * (s.period.close - low) / (high - low)

      sma(s, 'k', s.options.smooth_k, 'stoch')
      sma(s, 'd', s.options.smooth_d, 'k')

    }

    if ( !s.in_preroll && s.lookback.length > s.options.min_periods && s.period.k) {

      if ( s.period.k >= s.period.d &&
        s.lookback[0].k < s.lookback[0].d &&
        s.period.k < s.options.oversold ) {
        s.signal = 'buy'

      } else if( s.period.k <= s.period.d &&
        s.lookback[0].k > s.lookback[0].d &&
        s.period.k > s.options.overbought ) {
        s.signal = 'sell'
      }
    }
    cb()
  },

  onReport: function (s) {
    var cols = []
    if ( s.period.k && s.period.d ) {
      let colour = 'white'

      if ( s.period.k < s.period.d ) {
        colour = 'red'
      } else if (s.period.k > s.period.d ) {
        colour = 'green'
      }
      cols.push(z(8, n(s.period.k).format('00.0'), ' ')[colour])
      cols.push(z(8, n(s.period.d).format('00.0'), ' ')['yellow'])
    }

    return cols
  },

  phenotypes: {
    // -- common
    period_length: Phenotypes.RangePeriod(1, 120, 'm'),
    min_periods: Phenotypes.Range(30, 150),
    markdown_buy_pct: Phenotypes.RangeFloat(-1, 5),
    markup_sell_pct: Phenotypes.RangeFloat(-1, 5),
    order_type: Phenotypes.ListOption(['maker', 'taker']),
    sell_stop_pct: Phenotypes.Range0(1, 50),
    buy_stop_pct: Phenotypes.Range0(1, 50),
    profit_stop_enable_pct: Phenotypes.Range0(1, 20),
    profit_stop_pct: Phenotypes.Range(1,20),

    // -- strategy
    stoch_length: Phenotypes.Range(10, 150),
    smooth_k: Phenotypes.Range(2,20),   //Probably want to leave as 3 or 5
    smooth_d: Phenotypes.Range(2,10),   //Probably want to leave as 3
    overbought: Phenotypes.Range(60, 100),
    oversold: Phenotypes.Range(1, 40),
  },
}
