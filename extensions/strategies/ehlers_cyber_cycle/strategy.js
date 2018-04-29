let z = require('zero-fill')
  //, n = require('numbro')
  , Phenotypes = require('../../../lib/phenotype')
  , nz = require('../../../lib/helpers').nz
  , tv = require('../../../lib/helpers')

module.exports = {
  name: 'ehlers_cyber_cycle',
  description: 'Ehlers Cyber Cycle',

  getOptions: function () {
    this.option('period_length', 'period length, same as --period', String, '15m')

    this.option('alpha', '', Number, 0.07)
    this.option('price_source', '', String, 'HAhlc3')
    this.option('cycle_trend', '', Number, 1)
    this.option('src_trend', '', Number, 1)
  },

  calculate: function () {},

  onPeriod: function(s, cb) {

    let a = s.options.alpha
    let ct = s.options.cycle_trend
    let st = s.options.src_trend

    if (!s.cc) {
      s.cc = {
        src: [],
        smooth: [],
        cycle: [],
        trigger: []
      }
    }

    if (s.lookback.length > s.options.min_periods) {

      s.cc.src.unshift(tv.src(s.options.price_source, s.period, s.lookback[0]))

      s.cc.smooth.unshift((s.cc.src[0] + 2 * s.cc.src[1] + 2 * s.cc.src[2] + s.cc.src[3]) / 6)

      s.cc.cycle_ = (1 - 0.5 * a) * (s.cc.smooth[0] - 2 * s.cc.smooth[1] + s.cc.smooth[2]) + 2 * (1 - a) * nz(s.cc.cycle_) - (1 - a) * (1 - a) * nz(s.cc.cycle_)

      if (s.lookback.length < 7) {
        s.cc.cycle.unshift((s.cc.src[0] - 2 * s.cc.src[1] + s.cc.src[2]) / 4)
      } else {
        s.cc.cycle.unshift(s.cc.cycle_)
      }

      //t = cycle[1]
      s.cc.trigger.unshift(s.cc.cycle[1])
    }

    if (s.cc.cycle[0] > s.cc.cycle[ct] && s.cc.src[0] > s.cc.src[st] && s.cc.cycle[0] > 0)
      s.signal = 'buy'
    else if (s.cc.cycle[0] < s.cc.cycle[ct] && s.cc.src[0] < s.cc.src[st] && s.cc.cycle[0] < 0)
      s.signal = 'sell'
    else
      s.signal = null

    //if (s.cc.src.length > 5)
    //  Object.keys(s.cc).forEach(k => {
    //    s.cc[k].pop()
    //  })

    cb()
  },
  onReport: function (s) {
    var cols = []

    //let signal = z(8, n(Math.abs(cycle)).format('0.0'), ' ')

    if (s.cc.cycle[0] > 0) {
      if (s.cc.cycle[0] > s.cc.cycle[2]) {
        cols.push(z(8, 'STRONG', ' ').bold.green)
        //cols.push(signal.bold.green) //Strong
      } else {
        cols.push(z(8, 'WEAK', ' ').green)
        //cols.push(signal.green) //Weakening
      }
    } else if (s.cc.cycle[0] < 0) {
      if (s.cc.cycle[0] < s.cc.cycle[2]) {
        cols.push(z(8, 'Failing', ' ').red)
        //cols.push(signal.red) //Failing
      } else {
        cols.push(z(8, 'BUILDING', ' ').yellow)
        //cols.push(signal.yellow) //Building
      }
    }

    return cols
  },

  phenotypes: {

    // -- common
    period_length: Phenotypes.RangePeriod(13, 240, 'm'),
    order_type: Phenotypes.ListOption(['maker', 'taker']),
    sell_stop_pct: Phenotypes.Range0(1,10),
    profit_stop_enable_pct: Phenotypes.Range0(1, 10),
    profit_stop_pct: Phenotypes.RangeFloat(1,10),

    //Strategy Specific
    price_source: Phenotypes.ListOption(['close', 'hl2', 'hlc3', 'ohlc4', 'HAhlc3', 'HAohlc4']),
    alpha: Phenotypes.RangeFactor(0.001, 0.2, 0.001),
    cycle_trend: Phenotypes.RangeFactor(1, 9, 1),
    src_trend: Phenotypes.RangeFactor(1, 9, 1)


  }
}
