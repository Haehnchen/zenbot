var talib = require('talib')

module.exports = function container (get, set, clear) {
  return function stoch_rsi(s, timeperiod, ma_type) {
    return new Promise(function(resolve, reject) {
      // create object for talib. only close is used for now but rest might come in handy
      if (!s.marketData) {
        s.marketData = { open: [], close: [], high: [], low: [], volume: [] };
      }

      if (s.lookback.length > s.marketData.close.length) {
        for (var i = (s.lookback.length - s.marketData.close.length) - 1; i >= 0; i--) {
          s.marketData.close.push(s.lookback[i].close);
        }
      }

      if (s.marketData.close.length < timeperiod) {
        resolve();
        return;
      }

      let tmpMarket = JSON.parse(JSON.stringify(s.marketData.close));

      // add current period
      tmpMarket.push(s.period.close)

      // extract int from string input for ma_type
      let optInMAType = getMaTypeFromString(ma_type);

      talib.execute({
        name: "STOCHRSI",
        startIdx: 0,
        endIdx: tmpMarket.length -1,
        inReal: tmpMarket,
        optInTimePeriod: timeperiod,
        optInFastK_Period: 5,
        optInFastD_Period: 3,
        optInMAType: optInMAType,
        optInFastD_MAType: optInMAType
      }, function (err, result) {
        if (err) {
          reject(err, result);
          return
        }

        resolve({
          outFastK: result.result.outFastK[result.result.outFastK.length - 1],
          outFastD: result.result.outFastD[result.result.outFastD.length - 1]
        })
      });
    });
  };

  /**
   * Extract int from string input eg (SMA = 0)
   *
   * @see https://github.com/oransel/node-talib
   * @see https://github.com/markcheno/go-talib/blob/master/talib.go#L20
   */
  function getMaTypeFromString(maType) {
    // no constant in lib?

    switch (maType.toUpperCase()) {
      case 'SMA':
        return 0;
      case 'EMA':
        return 1;
      case 'WMA':
        return 2;
      case 'DEMA':
        return 3;
      case 'TEMA':
        return 4;
      case 'TRIMA':
        return 5;
      case 'KAMA':
        return 6;
      case 'MAMA':
        return 7;
      case 'T3':
        return 8;
      default:
        return 0;
    }
  }
}
