/*

>>>>>>>>>>>>>>>>>>>>      LoneWolf_V5     <<<<<<<<<<<<<<<<<<<<

*/

var z = require('zero-fill'),
  n = require('numbro'),
  ema = require('../../../lib/ema'),
  williamsr = require('../../../lib/williamsr'),
  Phenotypes = require('../../../lib/phenotype')

module.exports = {
  name: 'lonewolf',
  description: 'Strategy by LoneWolf345 - Run Williams %R through EMA to smooth it.  Buy when it leaves the lower band.  Sell on a reversal',

  getOptions: function () {
    this.option('period_length', 'period length, same as --period', String, '1h')
    this.option('min_periods', 'min. number of history periods', Number, 100)
    //  Williams %R Options
    this.option('williamsr_size', 'period size', Number, 20)
    this.option('williams_lower', 'Lower trigger', Number, -80)
    this.option('williams_upper', 'Upper trigger', Number, -20)
    this.option('williams_ema', 'EMA Length', Number, 20)
  },

  calculate: function (s) {
    williamsr(s,'williamsr', s.options.williamsr_size)
    ema(s, 'williams_ema', s.options.williams_ema, 'williamsr')
  },

  onPeriod: function (s, cb) {

    /*
      Determine BUY/SELL signals
    */
    if (!s.in_preroll) {
      if (s.period.williams_ema > s.options.williams_lower && s.lookback[0].williams_ema < s.options.williams_lower) {
        s.signal = 'buy' // signal a buy order
        s.period.enterLowerBand = false
      }
      if (s.period.williams_ema < s.options.williams_upper && s.period.williams_ema < s.lookback[0].williams_ema){
        s.signal = 'sell'
      }
    }

    cb()
  },

  onReport: function (s) {
    let cols = []
    let color = 'grey'

    //if (s.period.sar_crossunder) { color = 'red' } else if (s.period.sar_crossover) { color = 'green' }
    //cols.push(z(10, 'S[' + n((s.period.sar - s.period.close) / s.period.close).format('###.0%') + ']', ' ')[color])

    //color = s.period.ema > s.lookback[0].ema ? 'green' : 'red'
    cols.push(z(10, 'W[' + n(s.period.williams_ema).format('###.0') + ']', ' ')[color])

    return cols
  },

  phenotypes: {
    // -- common
    period_length: Phenotypes.RangePeriod(10, 120, 'm'),
    markdown_buy_pct: Phenotypes.RangeFloat(-1, 5),
    markup_sell_pct: Phenotypes.RangeFloat(-1, 5),
    order_type: Phenotypes.ListOption(['maker', 'taker']),
    sell_stop_pct: Phenotypes.Range0(1, 50),
    buy_stop_pct: Phenotypes.Range0(1, 50),
    profit_stop_enable_pct: Phenotypes.Range0(1, 20),
    profit_stop_pct: Phenotypes.Range(1,20),

    // -- strategy
    williamsr_size: Phenotypes.RangeFactor(10, 40, 5),
    williams_lower: Phenotypes.RangeFactor(-99, -50, 5),
    williams_upper: Phenotypes.RangeFactor(-51, -1, 5),
    williams_ema: Phenotypes.RangeFactor(5, 40, 5)
  }
}
