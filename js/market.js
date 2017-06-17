(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD
        define([
            'js/utils'
        ], function (utils) { return factory(utils).Market; } );
    } else if (typeof module !== 'undefined' && module.exports) {
        // CommonJS (node and other environments that support module.exports)
        module.exports = factory(
            require('./utils.js')
        ).Market;
    } else {
        // Global (browser)
        root.Market = factory(
            root.utils
        ).Market;
    }
})(this, function(utils){

    /* each market should have a getContent() and isTerminated() method.
     * Terminated markets may be removed from memory.
     * The market should call contentUpdated() to signal that getContent()
     * may return updated content.
     */
    function Market(contentUpdated, web3, network, chainId, accounts, marketContract, optionChain){

        var that = this;

        this.content = null;
        this.counter = 0;
        this.timer = undefined;
        this.terminated = false; // terminated old Market may be removed from memory
        this.render = function(){
            this.content = "marketAddr: <span>" + marketContract.address + "</span><br/>" +
                "counter: <span>" + this.counter + "</span><br/>" +
                "expiration: <span>" + optionChain.expiration + "</span><br/>" +
                "terminated: <span>" + this.terminated + "</span>";
        };

        this.isTerminated = function(){
            return this.terminated;
        };

        this.getContent = function(){
            if (this.content === null)
                this.render();
            return this.content;
        };

        this.updateUI = function(){
            // invalidate old content
            this.content = null;
            // signal new content
            contentUpdated();
        };

        this.terminate = function(){
            if (typeof(that.timer) !== 'undefined'){
                clearInterval(that.timer);
                that.timer = undefined;
            }
            this.terminated = true;
            this.updateUI();
        };

        this.update = function(){
            that.counter ++;
            that.updateUI();
            if (that.counter > 10){
                that.terminate();
            }
        };

        // check if market should be started at all?
/*
        if (marketContract.address === "0x834767fd1d12c50a48e9b0a8e78f93c3bb24ca6d") {
            this.content = "not started";
            this.terminated = true;
            //contentUpdated();
            return;
        }
*/

        this.timer = setInterval(
            function(){
                //console.log("timer");
                that.update();
            },
            2000
        );
    }

    return {'Market': Market};
});

