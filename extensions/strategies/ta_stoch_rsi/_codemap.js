module.exports = {
  _ns: 'zenbot',

  'strategies.ta_stoch_rsi': require('./strategy'),
  'strategies.list[]': '#strategies.ta_stoch_rsi'
}
