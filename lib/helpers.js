
//Basic Usage
// let crossover = require('../../../lib/helpers').crossover,

module.exports.crossover = function crossover(s, key1, key2) {
  //console.log(" crossover(s, " + key1 +", " + key2 + ")")
  //console.log(" " + s.period[key1] + " > " + s.period[key2] + " && " + s.lookback[0][key1] + " <= " + s.lookback[0][key2])
  //console.log(" " + s.period[key1] > s.period[key2] && s.lookback[0][key1] <= s.lookback[0][key2])
  return s.period[key1] > s.period[key2] && s.lookback[0][key1] <= s.lookback[0][key2]
},

module.exports.crossunder = function crossunder(s, key1, key2) {
  //console.log(" crossunder(s, " + key1 +", " + key2 + ")")
  //console.log(" " + s.period[key1] + " < " + s.period[key2] + " && " + s.lookback[0][key1] + " >= " + s.lookback[0][key2])
  //console.log(" " + s.period[key1] < s.period[key2] && s.lookback[0][key1] >= s.lookback[0][key2])
  return s.period[key1] < s.period[key2] && s.lookback[0][key1] >= s.lookback[0][key2]
}
