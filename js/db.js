// vim: sts=2:ts=2:sw=2
/* eslint no-console: ["error", { allow: ["log", "warn", "error"] }] */
/* eslint-env node, es6 */
// this file is only executed under nodejs
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD
    define(
      [
        // no db
      ],
      factory
    );
  } else if (typeof module !== 'undefined' && module.exports) {
    // CommonJS (node and other environments that support module.exports)
    module.exports = factory(
      require('sqlite3')
    );
  } else {
    // Global (browser)
    root.db = factory(
      root.db
    );
  }
})(this, function(sqlite3){

  var dbRunning = false;
  var basename = 'trader';
  var basedir = './';
  var db = null;
  var sizeInBytes = null;
  var dbUserVersion = 9;
  var uniqueID = 0;
  var dbTables = {};
  var version;

  var warnUnknownKeys = true;

  /* promise helper functions */
  var slice = Function.call.bind(Array.prototype.slice);
  var concat = Function.call.bind(Array.prototype.concat);

  var promisify = function(self, orig) {
    var promisified = function fn() {
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
    };
    return promisified;
  };

  var get = function(sql, args){return promisify(db, db.get)(sql, args || []);};
  var all = function(sql, args){return promisify(db, db.all)(sql, args || []);};
  var run = function(sql, args){return promisify(db, db.run)(sql, args || []);};

  var validRegExp = new RegExp('^[a-zA-Z0-9_]+$');
  var quote = function(){
    // a very simple function for constructing SQL statements
    // all arguments are joined (using '.')
    for (var i = 0, j = arguments.length; i < j; i++){
      if (! validRegExp.test(arguments[i])) {
        throw 'invalid character in str "' + arguments[i] + '"';
      }
    }
    var args = Array.prototype.slice.call(arguments);
    return args.map(function(name){return '"' + name + '"';}).join('.');
  };

  /* helper functions to flatten/unflatten hierarchical data structures */
  var unflatten = function(data) {
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
  };

  var flatten = function(data) {
    var result = {};
    function recurse (cur, prop) {
      if (Object(cur) !== cur) {
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
  };

  var createAsync = function (filename, args) {
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
  };

  var isDatatypeJson = function(columnDatatype){
    return (columnDatatype === 'json'); // TODO indexof
  };

  var DBTable = function(
    tableName,
    columns,
    sqlCreateTableExtra
  ){
    this.tableName = tableName;
    this.columns = columns;
    this.sqlCreateTableExtra = sqlCreateTableExtra || '';
    this.columnType = columns.reduce(function(map, column) {
      map[column.name] = column.datatype;
      return map;
    }, {});
    this.warnedKeys = {};
  };

  DBTable.prototype.create = function(dbname){
    return run(
      'CREATE TABLE IF NOT EXISTS ' + quote(dbname, this.tableName) + ' (' +
      (this.columns.map(function(column){return quote(column.name) + ' ' + column.datatype;}).join(', ')) +
      this.sqlCreateTableExtra +
      ');'
    );
  };

  DBTable.prototype.insert = function(dbname, dataDict, command){

    command = command || 'INSERT';

    if (this.columnType.version && version) {
      // if table has a version column we automatically set a default
      dataDict = Object.assign(
        {
          // set a version default so that we may log the version too
          version: version
        },
        dataDict
      );
    }

    var dataDictFlattend = flatten(dataDict);
    if (warnUnknownKeys){
      for (var key in dataDictFlattend) {
        if ((!(this.columnType[key])) && (!this.warnedKeys[key])){
          console.log('Warning: not storing key to database:', key);
          this.warnedKeys[key] = true; // remember this key and do not print warning again
        }
      }
    }

    // used columns
    var columns = this.columns.filter(function(col){return col.name in dataDictFlattend;});

    var sql = (
      command + ' INTO ' + quote(dbname, this.tableName) + ' (' + // this does not change primary key marketID
      (columns.map(function(column){return quote(column.name);}).join(', ')) +
      ') VALUES (' +
      (columns.map(function(column){return isDatatypeJson(column.datatype)? 'json(?)' : '(?)';}).join(', ')) +
      ')'
    );

    var values = columns.map(function(column){return isDatatypeJson(column.datatype)? JSON.stringify(dataDictFlattend[column.name]) : dataDictFlattend[column.name];});
    return run(sql, values);
  };

  DBTable.prototype.insertOrIgnore = function(dbname, dataDict){
    return this.insert(dbname, dataDict, 'INSERT OR IGNORE');
  };

  DBTable.prototype.insertOrReplace = function(dbname, dataDict){
    return this.insert(dbname, dataDict, 'INSERT OR REPLACE');
  };

  //  DBTable.prototype.insertOrUpdate = function(dbname, dataDict){
  //    return (
  //      this.insert(dbname, dataDict, 'INSERT OR REPLACE')
  //      .then(function(){
  //        return );
  //      this.insert(dbname, dataDict, 'INSERT OR REPLACE')
  //    );
  //  };
  //'INSERT OR REPLACE INTO '
  //'INSERT OR IGNORE'

  DBTable.prototype.addColumn = function(dbname, column, ignoreExistsError){
    return run('ALTER TABLE ' + quote(dbname, this.tableName) + ' ADD COLUMN ' + quote(column.name) + ' ' + column.datatype + ';')
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

  DBTable.prototype.addColumns = function(dbname, columns, ignoreExistsError){
    var self = this;
    return columns.reduce(function(previousPromise, nextID) {
      return previousPromise.then(function() {
        return self.addColumn(dbname, nextID, ignoreExistsError);
      });
    }, Promise.resolve());
  };

  DBTable.prototype.addAllJsonColumns = function(dbname){
    var ignoreExistsError = true;
    return this.addColumns(dbname, this.columns, ignoreExistsError);
  };

  DBTable.prototype.unflattenFromDict = function(rowDict){
    var self = this;
    var row = {};
    Object.keys(rowDict).forEach(function(name){row[name] = isDatatypeJson(self.columnType[name])? JSON.parse(rowDict[name]) : rowDict[name];});
    return unflatten(row);
  };

  var tableDefinitions = {
    'market': { // table name
      jsonColumns: [ // TODO rename
        //{'name': 'marketID', 'datatype': 'integer PRIMARY KEY AUTOINCREMENT'},
        {'name': 'marketID', 'datatype': 'integer PRIMARY KEY'},

        {'name': 'marketDefinition_network', 'datatype': 'string'},
        {'name': 'marketDefinition_marketsAddr', 'datatype': 'string'},
        {'name': 'marketDefinition_marketHash', 'datatype': 'string'},

        {'name': 'version', 'datatype': 'string'},
        //{'name': 'marketDefinition_marketHash', 'datatype': 'string CHECK (typeof("marketDefinition_marketHash") = "string")'},

        //{'name': 'marketDefinition_marketListerAddr', 'datatype': 'json'}, // TODO
        //TODO contract versions
        {'name': 'marketDefinition_chainID', 'datatype': 'integer CHECK (typeof("marketDefinition_marketBaseData_baseUnitExp") in ("integer", "null"))'}, // TODO remove NULL if chainIDs were added
        {'name': 'marketDefinition_marketBaseData_baseUnitExp', 'datatype': 'integer CHECK (typeof("marketDefinition_marketBaseData_baseUnitExp") = "integer")'},
        {'name': 'marketDefinition_marketBaseData_expiration', 'datatype': 'integer CHECK (typeof("marketDefinition_marketBaseData_expiration") = "integer")'},
        {'name': 'marketDefinition_marketBaseData_underlying', 'datatype': 'string'},
        {'name': 'marketDefinition_marketBaseData_underlyingString', 'datatype': 'string'},
        {'name': 'marketDefinition_marketBaseData_transactionFee0StringPercent', 'datatype': 'string'},
        {'name': 'marketDefinition_marketBaseData_transactionFee1StringPercent', 'datatype': 'string'},
        {'name': 'marketDefinition_marketBaseData_ndigit', 'datatype': 'integer CHECK (typeof("marketDefinition_marketBaseData_ndigit") = "integer")'},
        {'name': 'marketDefinition_marketBaseData_signerAddr', 'datatype': 'string'},
        {'name': 'marketDefinition_marketBaseData_strikesFloat', 'datatype': 'json'},
        {'name': 'marketDefinition_marketBaseData_strikesStrings', 'datatype': 'json'},
        {'name': 'marketDefinition_marketBaseData_typeDuration', 'datatype': 'integer CHECK (typeof("marketDefinition_marketBaseData_typeDuration") = "integer")'}
      ],
      sqlCreateTableExtra: ', UNIQUE ("marketDefinition_network", "marketDefinition_marketsAddr", "marketDefinition_marketHash") ON CONFLICT REPLACE'
    },
    'trader': { // table name
      jsonColumns: [
        {'name': 'marketID', 'datatype': 'integer'}, // foreign key

        {'name': 'version', 'datatype': 'string'},

        {'name': 'traderProps_quote_timestampMs', 'datatype': 'integer'},
        {'name': 'traderProps_quote_value', 'datatype': 'real'},

        {'name': 'traderProps_infoStrings', 'datatype': 'json'},
        {'name': 'traderProps_errorStrings', 'datatype': 'json'},
        {'name': 'traderProps_data_dateMs', 'datatype': 'integer'},
        {'name': 'traderProps_data_volatility' , 'datatype': 'real'}

        // add here your custom data columns
      ],
      sqlCreateTableExtra: ', CONSTRAINT marketID FOREIGN KEY (marketID) REFERENCES markets(marketID) ON UPDATE cascade ON DELETE cascade'
    }
  };

  var sqlCommandsExtra = [
    'CREATE UNIQUE INDEX IF NOT EXISTS MarketIndexUnique ON market ("marketDefinition_network", "marketDefinition_marketsAddr", "marketDefinition_marketHash");',
    'CREATE INDEX If NOT EXISTS TraderIndex ON trader ("marketID", "traderProps_data_dateMs");'
  ];

  var updateSize = function(){
    get('SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size();')
      .then(function(result){
        sizeInBytes = result.size;
      });
  };

  var setupSchema = function(dbname){
    // check user_version
    return get('PRAGMA ' + dbname + '.user_version;')
      .then(function(dict) {
        if (dict.user_version === dbUserVersion)
          return Promise.resolve();

        console.log('Need to setup/reset database');
        var commands = [
          // drop all tables / indexes / triggers
//          'PRAGMA ' + dbname + '.writable_schema = 1;',
//          'DELETE FROM ' + dbname + '.sqlite_master WHERE type IN ("table", "index", "trigger");',
//          'PRAGMA ' + dbname + '.writable_schema = 0;',
          // free space
          //'VACUUM ' + dbname + ';',
          // update user_version (as last thing)
          'PRAGMA ' + dbname + '.user_version = ' + dbUserVersion + ';'
        ];
        return commands.reduce(function(previousPromise, sql) {
          return previousPromise.then(function() {
            return run(sql);
          });
        }, Promise.resolve());
      })
      .then(function() {
        // create all tables
        return Object.values(dbTables).reduce(function(previousPromise, table) {
          return previousPromise.then(function() {
            // create table and add to add columns if already exists
            return table.create(dbname)
              .then(function() {
                return table.addAllJsonColumns(dbname);
              });
          });
        }, Promise.resolve());
      })
      .then(function() {
        // execute all sqlCommandsExtra
        return sqlCommandsExtra.reduce(function(previousPromise, sql) {
          return previousPromise.then(function() {
            return run(sql);
          });
        }, Promise.resolve());
      })
      .then(function() {
        console.log('database setup successful: ' + dbname);
        dbRunning = true;
        updateSize();
        setInterval(updateSize, 60*1000);
      });

  };


  var setup = function(mode /*optional*/){
    var filename = basedir + '/' + basename;
    console.log('try to setup database:', filename);

    // create DBTable instances
    for (var tableName in tableDefinitions){
      dbTables[tableName] = new DBTable(
        tableName,
        tableDefinitions[tableName].jsonColumns,
        tableDefinitions[tableName].sqlCreateTableExtra
      );
    }

    var closeDbAndExit = function() {
      console.log('Signal received.');
      if (db){
        console.log('Closing database...');
        db.close(function(err){
          if (err){
            console.log('ERROR closing database.', err);
          } else {
            console.log('Closed database successfully.');
          }
          process.exit(0);
        });
      } else {
        process.exit(0);
      }
    };
    process.on('SIGTERM', closeDbAndExit);
    process.on('SIGINT', closeDbAndExit);
    return createAsync(
      filename,
      mode || (sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE)
    )
      .then(function(db_) {
        db = db_;
        // check for json capabilities
        return get('SELECT json(?)', JSON.stringify({ok:true}));
      })
      .then(function(){
        return setupSchema('main');
      });
  };

  //console.log(JSON.stringify(1.0));

  var isRunning = function(){
    return dbRunning;
  };

  var getHandle = function(){
    return db;
  };

  var size = function(){
    return sizeInBytes;
  };

  return {
    setup: setup,
    createAsync: createAsync,
    promisify: promisify,
    setupSchema: setupSchema,
    basenameSet: function(name){basename=name;},
    basenameGet: function(){return basename;},
    basedirSet: function(dir){basedir=dir;},
    basedirGet: function(){return basedir;},
    versionSet: function(ver){version=ver;},
    versionGet: function(){return version;},
    uniqueNameGet: function(){return 'db' + uniqueID++;},
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
