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
  var db = null;
  var sizeInBytes = null;
  var dbUserVersion = 5;
  var jsonTables = {};
  var version;

  var warnUnknownKeys = true;
  //var warnUnknownKeys = false;

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

  /* helper functions to flatten/unflatten hierarchical data structures */
  var unflatten = function(data) {
    if (Object(data) !== data || Array.isArray(data))
      return data;
    var result = {}, cur, prop, idx, last, temp;
    for(var p in data) {
      cur = result, prop = '', last = 0;
      do {
        idx = p.indexOf('.', last);
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
          recurse(cur[p], prop ? prop+'.'+p : p);
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

  var quoteColumnName = function(columnName){
    return '"' + columnName + '"'; // simple hack for now
  };

  var JsonTable = function(
    tableName,
    jsonColumnsArray,
    sqlCreateTableExtra
  ){
    this.tableName = tableName;
    this.jsonColumnsArray = jsonColumnsArray;
    this.sqlCreateTableExtra = sqlCreateTableExtra || '';
    this.jsonColumnsSet = jsonColumnsArray.reduce(function(map, columnName) {
      map[columnName] = true;
      return map;
    }, {});
  };

  JsonTable.prototype.create = function(db){
    return promisify(db, db.run)(
      'CREATE TABLE IF NOT EXISTS '+ this.tableName + ' (' +
      (this.jsonColumnsArray.map(function(columnName){return quoteColumnName(columnName) + ' json';}).join(', ')) +
      this.sqlCreateTableExtra +
      ');'
    );
  };

  JsonTable.prototype.insert = function(db, dataDict){
    var dataDictFlattend = flatten(dataDict);
    if (warnUnknownKeys){
      for (var key in dataDictFlattend) {
        if (!(this.jsonColumnsSet[key])){
          console.log('Warning: not storing key to database:', key);
        }
      }
    }
    var sql = (
      'INSERT OR REPLACE INTO ' + this.tableName +' (' +
      (this.jsonColumnsArray.map(function(columnName){return quoteColumnName(columnName);}).join(', ')) +
      ') VALUES (' +
      (this.jsonColumnsArray.map(function(){return 'json(?)';}).join(', ')) +
      ')'
    );
    return promisify(db, db.run).apply(
      null,
      [
        sql
      ].concat(this.jsonColumnsArray.map(function(column){return JSON.stringify(dataDictFlattend[column]);}))
    );
  };

  JsonTable.prototype.addColumn = function(db, columnName, ignoreExistsError){
    return promisify(db, db.run)('ALTER TABLE ' + this.tableName + ' ADD COLUMN ' + quoteColumnName(columnName) + ' json;')
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

  JsonTable.prototype.addColumns = function(db, columnNames, ignoreExistsError){
    var self = this;
    return columnNames.reduce(function(previousPromise, nextID) {
      return previousPromise.then(function() {
        return self.addColumn(db, nextID, ignoreExistsError);
      });
    }, Promise.resolve());
  };

  JsonTable.prototype.addAllJsonColumns = function(db){
    var ignoreExistsError = true;
    return this.addColumns(db, this.jsonColumnsArray, ignoreExistsError);
  };

  var tableDefinitions = {
    'market': { // table name
      jsonColumns: [
        'version',

        'marketDefinition.network',
        'marketDefinition.chainID',
        'marketDefinition.contractAddr',
        'marketDefinition.marketFactHash',
        'marketDefinition.marketBaseData.baseUnitExp',
        'marketDefinition.marketBaseData.expiration',
        'marketDefinition.marketBaseData.underlying',
        'marketDefinition.marketBaseData.underlyingString',
        'marketDefinition.marketBaseData.transactionFeeStringPercent',
        'marketDefinition.marketBaseData.ndigit',
        'marketDefinition.marketBaseData.signerAddr',
        'marketDefinition.marketBaseData.strikesFloat',
        'marketDefinition.marketBaseData.strikesStrings',
        'marketDefinition.typeDuration'
      ],
      sqlCreateTableExtra: ', UNIQUE ("marketDefinition.network", "marketDefinition.contractAddr", "marketDefinition.marketFactHash") ON CONFLICT REPLACE'
    },
    'trader': { // table name
      jsonColumns: [
        'version',

        // keys to reference table market via market's index
        'marketDefinition.network',
        'marketDefinition.contractAddr',
        'marketDefinition.marketFactHash',

        'traderProps.infoStrings',
        'traderProps.errorStrings',
        'traderProps.data.dateMs',
        'traderProps.data.volatility'
        // add here your custom data columns
        //'traderProps.<your-data>'
      ],
      sqlCreateTableExtra: ''
    }
  };

  var sqlCommandsExtra = [
    'CREATE UNIQUE INDEX IF NOT EXISTS MarketIndexUnique ON market ("marketDefinition.network", "marketDefinition.contractAddr", "marketDefinition.marketFactHash");',
    'CREATE INDEX IF NOT EXISTS MarketIndex ON market ("marketDefinition.network", "marketDefinition.contractAddr", "marketDefinition.marketFactHash", "traderProps.data.dateMs");',
    'CREATE INDEX If NOT EXISTS TraderIndex ON trader ("marketDefinition.network", "marketDefinition.contractAddr", "marketDefinition.marketFactHash", "traderProps.data.dateMs");'
  ];

  var insertJson = function(tableName, data){
    // only insert of database is running (otherwise silently return)
    if (jsonTables[tableName] && dbRunning){
      //console.log('insert');
      return jsonTables[tableName].insert(
        db,
        Object.assign(
          {
            // set a version default so that we may log the version too
            version: version
          },
          data
        )
      );
    }
  };

  var updateSize = function(){
    promisify(db, db.get)('SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size();')
      .then(function(result){
        sizeInBytes = result.size;
      });
  };

  var setup = function(filename, ver){
    console.log('try to setup database:', filename);

    version = ver;

    // create JsonTable instances
    for (var tableName in tableDefinitions){
      jsonTables[tableName] = new JsonTable(
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
      sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE
    )
      .then(function(db_) {
        db = db_;
        // check for json capabilities
        return promisify(db, db.get)('SELECT json(?)', JSON.stringify({ok:true}));
      })

      .then(function() {
        // check user_version
        return promisify(db, db.get)('PRAGMA user_version;');
      })
      .then(function(dict) {
        if (dict.user_version === dbUserVersion)
          return Promise.resolve();

        console.log('Need to reset database');
        var commands = [
          // update user_version
          'PRAGMA user_version = ' + dbUserVersion + ';',
          // drop all tables / indexes / triggers
          'PRAGMA writable_schema = 1;',
          'DELETE FROM sqlite_master WHERE type IN ("table", "index", "trigger");',
          'PRAGMA writable_schema = 0;',
          // free space
          'VACUUM;'
        ];
        return commands.reduce(function(previousPromise, sql) {
          return previousPromise.then(function() {
            return promisify(db, db.run)(sql);
          });
        }, Promise.resolve());
      })
      .then(function() {
        // create all tables
        return Object.values(jsonTables).reduce(function(previousPromise, jsonTable) {
          return previousPromise.then(function() {
            // create table and add to add columns if already exists
            return jsonTable.create(db)
              .then(function() {
                return jsonTable.addAllJsonColumns(db);
              });
          });
        }, Promise.resolve());
      })
      .then(function() {
        // execute all sqlCommandsExtra
        return sqlCommandsExtra.reduce(function(previousPromise, sql) {
          return previousPromise.then(function() {
            return promisify(db, db.run)(sql);
          });
        }, Promise.resolve());
      })
      .then(function() {
        console.log('database setup successful');
        dbRunning = true;
        updateSize();
      })
      .catch(function(err) {
        console.log('sqlite error:', err.message);
      });

  };

  //console.log(JSON.stringify(1.0));

  var isRunning = function(){
    return dbRunning;
  };

  var size = function(){
    return sizeInBytes;
  };

  var unflattenFromDictJson = function(rowJson){
    var row = {};
    Object.keys(rowJson).forEach(function(key){row[key] = JSON.parse(rowJson[key]);});
    return unflatten(row);
  };

  return {
    setup: setup,
    isRunning: isRunning,
    size: size, 
    flatten: flatten,
    unflatten: unflatten,
    insertJson: insertJson,
    unflattenFromDictJson: unflattenFromDictJson,
    get: function(sql, args){return promisify(db, db.get)(sql, args || []);}, 
    all: function(sql, args){return promisify(db, db.all)(sql, args || []);}, 
    tableDefinitions: tableDefinitions
  };
});
