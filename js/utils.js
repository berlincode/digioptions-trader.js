//jshint esnext:true
/*eslint-env node*/

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD
        define([
                "web3"
            ], function (
                Web3
            ) {
                return factory(
//                    root.Web3 /* TODO: quick hack for web3 before 1.0 - we use global Web3, because require("web3") returns BigNumber - see https://github.com/ethereum/web3.js/issues/280 */
                    Web3,
                    XMLHttpRequest
                    ); } );
    } else if (typeof module !== 'undefined' && module.exports) {
        // CommonJS (node and other environments that support module.exports)
        module.exports = factory(
            require('web3'),
            require('xhr2')
	);
    } else {
        // Global (browser)
        root.utils = factory(
            root.Web3,
            XMLHttpRequest
        );
    }
})(this, function(Web3, XMLHttpRequest){

    return {};
});
