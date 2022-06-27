// vim: sts=2:ts=2:sw=2
/* eslint no-console: ["error", { allow: ["log", "warn", "error"] }] */
/* eslint-env node, es6 */
// this file is only executed under nodejs
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD
    define(
      [
        'web3'
        // no db
      ],
      factory
    );
  } else if (typeof module !== 'undefined' && module.exports) {
    // CommonJS (node and other environments that support module.exports)
    module.exports = factory(
      require('web3'),
      require('sqlite3')
    );
  } else {
    // Global (browser)
    root.db = factory(
      root.Web3
      // no db
    );
  }
})(this, function(Web3, sqlite3){

  var web3 = new Web3();

  var dbRunning = false;
  var basename = 'trader';
  var basedir = './';
  var db = null;
  var sizeInBytes = null;
  var dbUserVersion = 11;
  var dbTables = {};
  var dbHandles = [];
  var strict = ''; // set to 'STRICT' for sqlite3 strict mode

  var warnUnknownKeys = true;

  /* promise helper functions */
  var slice = Function.call.bind(Array.prototype.slice);
  var concat = Function.call.bind(Array.prototype.concat);

  function promisify(self, orig) {
    function promisified() {
      var args = slice(arguments);
      //var self = this; // eslint-disable-line no-invalid-this
      return new Promise(function (resolve, reject) {
        orig.apply(self, concat(args, function (err) {
          var values = arguments.length > 1 ? slice(arguments, 1) : [];
          if (err) {
            reject(err);
          } else {
            resolve(values[0]);
          }
        }));
      });
    }
    return promisified;
  }

  function get(db, sql, args){return promisify(db, db.get)(sql, args || []);}
  function all(db, sql, args){return promisify(db, db.all)(sql, args || []);}
  function run(db, sql, args){return promisify(db, db.run)(sql, args || []);}

  var validRegExp = new RegExp('^[a-zA-Z0-9_]+$');
  function quote(){
    // a very simple function for constructing SQL statements
    // all arguments are joined (using '.')
    for (var i = 0, j = arguments.length; i < j; i++){
      if (! validRegExp.test(arguments[i])) {
        throw new Error('invalid character in str "' + arguments[i] + '"');
      }
    }
    var args = Array.prototype.slice.call(arguments);
    return args.map(function(name){return '"' + name + '"';}).join('.');
  }

  /* helper functions to flatten/unflatten hierarchical data structures */
  function unflatten(data) {
    if (Object(data) !== data || Array.isArray(data))
      return data;
    var result = {}, cur, prop, idx, last, temp;
    for(var p in data) {
      cur = result, prop = '', last = 0;
      do {
        idx = p.indexOf('_', last);
        temp = p.substring(last, idx !== -1 ? idx : undefined);
        cur = cur[prop] || (cur[prop] = (!isNaN(parseInt(temp)) ? [] : {}));
        prop = temp;
        last = idx + 1;
      } while(idx >= 0);
      cur[prop] = data[p];
    }
    return result[''];
  }

  function flatten(data, keyDict) {
    var result = {};
    function recurse (cur, prop) {
      if (keyDict[prop]){
        // if prop is key in keyDict do not flatten it further
        result[prop] = cur;
      } else if (Object(cur) !== cur) {
        result[prop] = cur;
      } else if (Array.isArray(cur)) {
        /* do not flatten arrays */
        /*
          for(var i=0, l=cur.length; i<l; i++)
              recurse(cur[i], prop ? prop+"."+i : ""+i);
          if (l == 0)
              result[prop] = [];
        */
        result[prop] = cur;
      } else {
        var isEmpty = true;
        for (var p in cur) {
          isEmpty = false;
          recurse(cur[p], prop ? prop + '_' + p : p);
        }
        if (isEmpty)
          result[prop] = {};
      }
    }
    recurse(data, '');
    return result;
  }

  function createAsync(filename, args) {
    return new Promise(function (resolve, reject) {
      var db = new sqlite3.Database(
        filename,
        args,
        function (err) {
          if (err) {
            reject(err);
          } else {
            resolve(db);
          }
        }
      );
    });
  }

  function isDatatypeJson(columnDatatype){ // TODO remove
    return (columnDatatype === 'json'); // TODO indexof
  }

  var DBTable = function(
    tableName,
    columns,
    sqlCreateTableExtra
  ){
    this.tableName = tableName;
    this.columns = columns;
    this.sqlCreateTableExtra = sqlCreateTableExtra || '';
    this.columnByName = columns.reduce(function(map, column) {
      map[column.name] = column;
      return map;
    }, {});
    this.warnedKeys = {};
  };

  DBTable.prototype.create = function(db){
    var datatype_to_sqlite_type = function(datatype){
      if (datatype == 'json') {
        return 'text';
      }
      if (datatype == 'boolean') {
        return 'integer';
      }
      return datatype; 
    };
    var cmd = 'CREATE TABLE IF NOT EXISTS ' + this.tableName + ' (' +
      (this.columns.map(function(column){return quote(column.name) + ' ' + datatype_to_sqlite_type(column.datatype);}).join(', ')) +
      this.sqlCreateTableExtra +
      ') ' + strict + ';';
    return run(
      db,
      cmd
    );
  };

  DBTable.prototype.insert = function(db, dataDict, command){
    var self = this;

    command = command || 'INSERT';

    var dataDictFlattend = flatten(dataDict, self.columnByName);
    if (warnUnknownKeys){
      var key;
      for (key in dataDictFlattend) {
        if ((!(self.columnByName[key])) && (!self.warnedKeys[key])){
          console.log('Warning: not storing key to database(table="' + self.tableName + '"):', key);
          self.warnedKeys[key] = true; // remember this key and do not print warning again
        }
      }
      /*
      for (key in self.columnByName) {
        if (!(dataDictFlattend[key])){
          console.log('Warning: column not set on database insert (table="' + self.tableName + '"):', key);
        }
      }
      */
    }

    // used columns
    var columns = self.columns.filter(function(col){return col.name in dataDictFlattend;});

    var sql = (
      command + ' INTO ' + self.tableName + ' (' + // this does not change primary key marketID
      (columns.map(function(column){return quote(column.name);}).join(', ')) +
      ') VALUES (' +
      (columns.map(function(column){return isDatatypeJson(column.datatype)? 'json(?)' : '(?)';}).join(', ')) +
      ')'
    );

    var values = columns.map(function(column){
      return column.encode? column.encode(dataDictFlattend[column.name]) : dataDictFlattend[column.name];});
    return run(db, sql, values);
  };

  DBTable.prototype.insertOrIgnore = function(db, dataDict){
    return this.insert(db, dataDict, 'INSERT OR IGNORE');
  };

  DBTable.prototype.insertOrReplace = function(db, dataDict){
    return this.insert(db, dataDict, 'INSERT OR REPLACE');
  };

  //  DBTable.prototype.insertOrUpdate = function(db, dataDict){
  //    return (
  //      this.insert(db, dataDict, 'INSERT OR REPLACE')
  //      .then(function(){
  //        return );
  //      this.insert(db, dataDict, 'INSERT OR REPLACE')
  //    );
  //  };
  //'INSERT OR REPLACE INTO '
  //'INSERT OR IGNORE'

  DBTable.prototype.addColumn = function(db, column, ignoreExistsError){
    return run(db, 'ALTER TABLE ' + this.tableName + ' ADD COLUMN ' + quote(column.name) + ' ' + column.datatype + ';')
      .catch(function(error) {
        if(
          ignoreExistsError &&
          (error.toString().indexOf('duplicate column name') >= 0)
        ){
          return; // Makes sure the promise is resolved, so the chain continues
        }
        throw error; // Otherwise, rethrow to keep the Promise rejected
      });
  };

  DBTable.prototype.addColumns = function(db, columns, ignoreExistsError){
    var self = this;
    return columns.reduce(function(previousPromise, nextID) {
      return previousPromise.then(function() {
        return self.addColumn(db, nextID, ignoreExistsError);
      });
    }, Promise.resolve());
  };

  DBTable.prototype.addAllJsonColumns = function(db){
    var ignoreExistsError = true;
    return this.addColumns(db, this.columns, ignoreExistsError);
  };

  DBTable.prototype.unflattenFromDict = function(rowDict){
    var self = this;
    var row = {};
    Object.keys(rowDict).forEach(function(name){
      if (self.columnByName[name]){
        row[name] = self.columnByName[name].decode? self.columnByName[name].decode(rowDict[name]) : rowDict[name];
      }
    });
    return unflatten(row);
  };

  var tableDefinitions = {
    // table name = 'market'
    'market': {
      jsonColumns: [ // TODO rename
        //{'name': 'marketID', 'datatype': 'integer PRIMARY KEY AUTOINCREMENT'},
        {'name': 'marketID', 'datatype': 'integer PRIMARY KEY'},

        {'name': 'marketDefinition_network', 'datatype': 'text'},
        {'name': 'contractDescription_marketsAddr', 'datatype': 'text'},
        {'name': 'marketDefinition_marketHash', 'datatype': 'text'},

        //{'name': 'marketDefinition_marketListerAddr', 'datatype': 'json', , encode: JSON.stringify, decode: JSON.parse}, // TODO
        {'name': 'marketDefinition_chainID', 'datatype': 'integer CHECK (typeof("marketDefinition_marketBaseData_baseUnitExp") in ("integer", "null"))'}, // TODO remove NULL if chainIDs were added
        {'name': 'marketDefinition_marketBaseData_baseUnitExp', 'datatype': 'integer CHECK (typeof("marketDefinition_marketBaseData_baseUnitExp") = "integer")'},
        {'name': 'marketDefinition_marketBaseData_expiration', 'datatype': 'integer CHECK (typeof("marketDefinition_marketBaseData_expiration") = "integer")'},
        {'name': 'marketDefinition_marketBaseData_underlyingParts_name', 'datatype': 'text'},
        {'name': 'marketDefinition_marketBaseData_underlyingParts_unit', 'datatype': 'text'},
        {'name': 'marketDefinition_marketBaseData_underlyingParts_marketplace', 'datatype': 'text'},
        {'name': 'marketDefinition_marketBaseData_underlyingParts_provider', 'datatype': 'text'},
        {'name': 'marketDefinition_marketBaseData_underlyingString', 'datatype': 'text'},
        {'name': 'marketDefinition_marketBaseData_transactionFee0StringPercent', 'datatype': 'text'},
        {'name': 'marketDefinition_marketBaseData_transactionFee1StringPercent', 'datatype': 'text'},
        {'name': 'marketDefinition_marketBaseData_transactionFeeSignerStringPercent', 'datatype': 'text'},
        {'name': 'marketDefinition_marketBaseData_ndigit', 'datatype': 'integer CHECK (typeof("marketDefinition_marketBaseData_ndigit") = "integer")'},
        {'name': 'marketDefinition_marketBaseData_signerAddr', 'datatype': 'text'},
        {'name': 'marketDefinition_marketBaseData_strikesFloat', 'datatype': 'json', encode: JSON.stringify, decode: JSON.parse},
        {'name': 'marketDefinition_marketBaseData_strikesStrings', 'datatype': 'json', encode: JSON.stringify, decode: JSON.parse},
        {'name': 'marketDefinition_marketBaseData_marketInterval', 'datatype': 'integer CHECK (typeof("marketDefinition_marketBaseData_marketInterval") = "integer")'},

        {'name': 'contractDescription_blockCreatedMarkets', 'datatype': 'integer CHECK (typeof("contractDescription_blockCreatedMarkets") = "integer")'},
        {'name': 'contractDescription_timestampCreatedMarkets', 'datatype': 'integer CHECK (typeof("contractDescription_timestampCreatedMarkets") = "integer")'},
        {'name': 'contractDescription_versionMarkets_major', 'datatype': 'integer CHECK (typeof("contractDescription_versionMarkets_major") = "integer")'},
        {'name': 'contractDescription_versionMarkets_minor', 'datatype': 'integer CHECK (typeof("contractDescription_versionMarkets_minor") = "integer")'},
        {'name': 'contractDescription_versionMarkets_bugfix', 'datatype': 'integer CHECK (typeof("contractDescription_versionMarkets_bugfix") = "integer")'},
        {'name': 'contractDescription_offerMaxBlocksIntoFuture', 'datatype': 'integer CHECK (typeof("contractDescription_offerMaxBlocksIntoFuture") = "integer")'},
        {'name': 'contractDescription_atomicOptionPayoutWeiExpBN', 'datatype': 'text', encode: function(bn){return bn.toString(10);}, decode: web3.utils.toBN},
        {'name': 'contractDescription_atomicOptionPayoutWeiBN', 'datatype': 'text', encode: function(bn){return bn.toString(10);}, decode: web3.utils.toBN},
        {'name': 'contractDescription_atomicOptionsPerFullOptionBN', 'datatype': 'text', encode: function(bn){return bn.toString(10);}, decode: web3.utils.toBN},
      ],
      sqlCreateTableExtra: ', UNIQUE ("marketDefinition_network", "contractDescription_marketsAddr", "marketDefinition_marketHash") ON CONFLICT REPLACE'
    },
    // table name = 'constants'
    'constants': {
      jsonColumns: [
        //{'name': 'constantsID', 'datatype': 'integer PRIMARY KEY AUTOINCREMENT'},
        {'name': 'constantsID', 'datatype': 'integer PRIMARY KEY'},

        {'name': 'version', 'datatype': 'text'},
        // add here your custom run-time constant data columns
      ],
      sqlCreateTableExtra: ', UNIQUE ("version", "version2") ON CONFLICT REPLACE'
    },
    // table name = 'trader'
    'trader': {
      jsonColumns: [
        // foreign key to table market
        {'name': 'marketID', 'datatype': 'integer'},
        // foreign key to table constants
        {'name': 'constantsID', 'datatype': 'integer'},

        {'name': 'traderProps_quote_timestampMs', 'datatype': 'integer'},
        {'name': 'traderProps_quote_value', 'datatype': 'real'},

        {'name': 'traderProps_infoStrings', 'datatype': 'json', encode: JSON.stringify, decode: JSON.parse},
        {'name': 'traderProps_errorStrings', 'datatype': 'json', encode: JSON.stringify, decode: JSON.parse},
        {'name': 'traderProps_data_dateMs', 'datatype': 'integer'},
        {'name': 'traderProps_data_volatility' , 'datatype': 'real'},
        {'name': 'traderProps_data_cashEth' , 'datatype': 'real'},
        {'name': 'traderProps_data_liquidityEth' , 'datatype': 'real'}

        // add here your custom data columns
      ],
      sqlCreateTableExtra: (
        ', CONSTRAINT marketID FOREIGN KEY (marketID) REFERENCES markets(marketID) ON UPDATE cascade ON DELETE cascade' +
        ', CONSTRAINT constantsID FOREIGN KEY (constantsID) REFERENCES constants(constantsID) ON UPDATE cascade ON DELETE cascade'
      )
    }
  };

  var sqlCommandsExtra = [
    'CREATE UNIQUE INDEX IF NOT EXISTS MarketIndexUnique ON market ("marketDefinition_network", "contractDescription_marketsAddr", "marketDefinition_marketHash");',
    'CREATE INDEX If NOT EXISTS TraderIndex ON trader ("marketID", "traderProps_data_dateMs");'
  ];

  /*
  function updateSize(){
    get(db, 'SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size();')
      .then(function(result){
        sizeInBytes = result.size;
      });
  }
  */

  function setupSchema(db){
    // check user_version
    return get(db, 'PRAGMA user_version;')
      .then(function(dict) {
        if (dict.user_version === dbUserVersion)
          return Promise.resolve();

        console.log('Need to setup/reset database');
        var commands = [
          // drop all tables / indexes / triggers
          //'PRAGMA writable_schema = 1;',
          //'DELETE FROM sqlite_master WHERE type IN ("table", "index", "trigger");',
          //'PRAGMA .writable_schema = 0;',
          // free space
          //'VACUUM;',
          // update user_version (as last thing)
          'PRAGMA user_version = ' + dbUserVersion + ';'
        ];
        return commands.reduce(function(previousPromise, sql) {
          return previousPromise.then(function() {
            return run(db, sql);
          });
        }, Promise.resolve());
      })
      .then(function() {
        // create all tables
        return Object.values(dbTables).reduce(function(previousPromise, table) {
          return previousPromise.then(function() {
            // create table and add to add columns if already exists
            return table.create(db)
              .then(function() {
                return table.addAllJsonColumns(db);
              });
          });
        }, Promise.resolve());
      })
      .then(function() {
        // execute all sqlCommandsExtra
        return sqlCommandsExtra.reduce(function(previousPromise, sql) {
          return previousPromise.then(function() {
            return run(db, sql);
          });
        }, Promise.resolve());
      })
      .then(function() {
        console.log('database setup successful');
        dbRunning = true;
        //updateSize(); // TODO
        //setInterval(updateSize, 60*1000);
      });

  }

  function setup(filename, mode /*optional*/){
    // create DBTable instances
    for (var tableName in tableDefinitions){
      dbTables[tableName] = new DBTable(
        tableName,
        tableDefinitions[tableName].jsonColumns,
        tableDefinitions[tableName].sqlCreateTableExtra
      );
    }

    // only nodejs
    process.on('SIGTERM', closeDbAndExit);
    process.on('SIGINT', closeDbAndExit);

    return setupDatabase(filename, mode)
      .then(function(dbGlobal) {
        db = dbGlobal;
      });
  }

  function close(db) {
    if (dbHandles.filter(function(el) { return el === db; }).length === 1){

      dbHandles = dbHandles.filter(function(el) { return el !== db; });

      return new Promise(function (resolve, reject) {
        db.close(function (err) {
          if (err) {
            console.log('Error closing database:', err);
            reject(err);
          } else {
            console.log('Closed database successfully.');
            resolve();
          }
        });
      });
    }
    console.log('WARNING: not closing unregistered db.');
    return Promise.resolve();
  }

  function closeDbAndExit() {
    console.log('Signal received.');

    var promises = [];
    for (var dbHandle of dbHandles){
      promises.push(close(dbHandle));
    }

    Promise.allSettled(promises)
      .then(function() {
        console.log('All databases closed successfully.');
        process.exit(0);
      })
      .catch(function(/*err*/) {
        console.log('ERROR closing all databases.');
        process.exit(0);
      });
  }


  function setupDatabase(filename, mode /*optional*/){
    console.log('try to setup database:', filename);

    var db = null;

    return createAsync(
      filename,
      mode || (sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE)
    )
      .then(function(db_) {
        db = db_;
        dbHandles.push(db);
        // check for json capabilities
        return get(db, 'SELECT json(?)', JSON.stringify({ok:true}));
      })
      .then(function(){
        return setupSchema(db);
      })
      .then(function(){
        return db;
      });
  }

  function isRunning(){
    return dbRunning;
  }

  function getHandle(){
    return db;
  }

  function size(){
    return sizeInBytes;
  }

  return {
    setup: setup,
    close: close,
    setupDatabase: setupDatabase,
    createAsync: createAsync,
    promisify: promisify,
    setupSchema: setupSchema,
    basenameSet: function(name){basename=name;},
    basenameGet: function(){return basename;},
    basedirSet: function(dir){basedir=dir;},
    basedirGet: function(){return basedir;},
    strictSet: function(strictString){strict=strictString;},
    getHandle: getHandle, // db handle
    isRunning: isRunning,
    size: size,
    flatten: flatten,
    unflatten: unflatten,
    dbTables: dbTables,
    get: get,
    all: all,
    run: run,
    quote: quote,
    tableDefinitions: tableDefinitions
  };
});
