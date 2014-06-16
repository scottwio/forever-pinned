// TODO: Clean up code
// TODO: close process after run if option is not selected

var buildTabs = {
  list:[],
  get:function(){
    /**
     * get list of URL to open from google sync
     * @type {buildTabs}
     */
    var self = this;
    var defer = Q.defer();
    defer.resolve('done');
    chrome.storage.sync.get('items', function(data){
      self.removeDups(data.items);
    });
    return defer.promise;
  },
  init:function(){
    /**
     * kick it off
     */
     this.closeDups();
  },
  create:function(){
    /**
     * Creates new tabs from this.list
     */
    for(var i = 0; i < this.list.length; i++){
      chrome.tabs.create({
        pinned:true,
        url:this.list[i].url,
        active:false
      });
    }
  },
  readAllTabs:function(){
    /**
     * gets currently open tabs
     */
    var defer = Q.defer();
    chrome.tabs.query({pinned:true, currentWindow:true}, function(data){
      defer.resolve(data);
    });
    return defer.promise;
  },
  closeDups:function(){
    /**
     * If you open a number of different windows all with the same pinned tab
     * chrome will take all the pinned tabs when quit and open then all in the
     * new window. This closes any existing dups before we open any new tabs.
     */
    var self= this;

    this.readAllTabs().then(function(data){
      var arr  = data;
      var dupsId = [];
      var dupsUrl = [];
      var list = [];
      var defer = Q.defer();

      chrome.storage.sync.get('items', function(urlList){
        var urlList = urlList.items;

        // clear list of urls
        for(var i=0; i < urlList.length; i++){
          list.push(urlList[i].url);
        }

        // remove extra slash from arrs urls
        for(var i=0; i<arr.length; i++){
          arr[i].url =self._removeSlash(arr[i].url);
        }

        // filter out dups that are in list of urls
        arr.sort( function(a, b){ return a.url < b.url ? -1 : 1;});
        for( var i=0; i<arr.length-1; i++ ) {
          if ( arr[i].url == arr[i+1].url ) {
            if(list.indexOf(arr[i].url) > -1){
              dupsId.push(arr[i].id);
              dupsUrl.push(arr[i].url);
            }
          }
        }
        chrome.tabs.remove(dupsId, function(){
          self.get();
        });
      });

    });
  },
  removeDups:function(urlList){
    /**
     * Compares currently open tabs with the opens in the URL list
     * stops tabs that are already opening again
     * @type {buildTabs}
     */
    var self = this;
    var list = [];
    var open = [];
    var domain = "";

    // reset list
    this.list = [];
    this.readAllTabs().then(function(openTabs){
      for(var i=0; i < openTabs.length; i++){
        /* remove trailing slashes as google seem to want to add them */
        if (openTabs[i].url.substr(-1) === '/') {
          openTabs[i].url =  openTabs[i].url.substr(0, openTabs[i].url.length - 1);
         }
        open.push(openTabs[i].url);
      }
      for(var i=0; i < urlList.length; i++){
        list.push(urlList[i].url);
      }
      list.forEach(function(item){
        if(!(open.indexOf(item)> -1)){
          self.list.push({url:item});
        }
      });
      self.create();
    });
  },
  _removeSlash:function(str){
    if (str.substr(-1) === '/') {
      str = str.substr(0, str.length - 1);
    }
    return str;
  }
};

var applyOptions = {
  options:{},
  init:function(){
    /**
     * kick it off
     */
    var self = this;

    this.get()
    .then(function(){
      self.apply();
    });
  },
  get:function(){
    /**
     * get the options from google sync
     * @type {applyOptions}
     */
    var self = this;
    var defer = Q.defer();
    chrome.storage.sync.get('options', function(data){
      self.options = data.options;
      defer.resolve(data.options);
    });
    return defer.promise;
  },
  apply:function(){
    /**
     * apply any settings that are needed
     */
    if(this.options.reopen){
      chrome.windows.onCreated.addListener(function(){
        buildTabs.init();
      });
    }
  }
};

// start up the app crate tabs
buildTabs.init();
applyOptions.init();