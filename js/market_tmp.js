/*
    //var normalize_order = digioptionsTools.normalize_order;

    utils.call(this.web3, this.marketDefinition.contractAddr, order.contractAddr, 'getLiquidityAndPositions', [this.marketDefinition.marketFactHash, order.offerOwner, false], function(err, result) {

      // TODO check err
      //console.log('toNumber', result);
      var balance = result;
      //utils.call(web3, this.marketsContract, order.contractAddr, 'getMaxLossAfterTrade', [this.marketFactHash, order.offerOwner, order.optionID, order.size, -order.size*order.price], function(err, result) {
      utils.call(web3, this.marketDefinition.contractAddr, order.contractAddr, 'getMaxLossAfterTrade', [this.marketDefinition.marketFactHash, order.offerOwner, order.optionID, order.size, -order.size*order.price], function(err, result) {
        //balance = balance + result.toNumber();
        balance = balance + result;
        balance += 1000000;// TODO fake balance
        //console.log('hash', hash, order.hash );
        if (balance <= 0) { // TODO
          // TODO should there be an error log to browser and disk (if running as daemon)?
          console.log('You tried sending an order to the order book, but you do not have enough funds to place your order. You need to add '+(utils.weiToEth(-balance))+' eth to your account to cover this trade. ');
        } else if (self.blockNumber <= order.blockExpires) {
          orders.push(order);
          console.log('added 1 order ready to publish ' + orders.length);
        } else {
          console.log('invalid order');
        }
      });
    });
*/
