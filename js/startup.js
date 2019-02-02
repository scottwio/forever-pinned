// TODO: Clean up code
// TODO: close process after run if option is not selected

var buildTabs = {
  list:[],
  createSyncItems:function(){
    /**
     * have the sync items already been create aka has the plugin
     * been run before or is this it's first run
     */
    var deferItems = Q.defer();
    var deferOptions = Q.defer();

    chrome.storage.sync.get('items', function(data){
      if(typeof(data.items) === "undefined"){
        chrome.storage.sync.set({items:[]}, function (data){
          deferItems.resolve();
        });
      }else{
        deferItems.resolve();
      }
    });

    chrome.storage.sync.get('options', function(data){
      if(typeof(data.options) === "undefined"){
        chrome.storage.sync.set({options:{}}, function(data){
          deferOptions.resolve();
        });
      }else{
        deferOptions.resolve();
      }
    });

    return [deferItems.promise, deferOptions.promise];
  },
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
    var self = this;
     var createSyncItemsPromise = this.createSyncItems();
     Q.all(createSyncItemsPromise).then(function(){
       self.closeDups();
     });
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
       
       var dupsId = [];
       var unqi = _.uniq(arr, 'url');
       
       arr  = _.filter(arr, function(item){
        return !(_.includes(unqi, item));
       })
       
       _.forEach(arr, function(item){
         dupsId.push(item.id);
       });
        
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
    var alreadyOpenedList = [];

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
      if(applyOptions.options.ignoreParams) {
        notOpenList = list.slice(0);
        for(var i = 0; i < open.length; i++) {
          for(var j = 0; j < list.length; j++) {
            // Check if the URL of this open tab contains
            // a URL from our list of tabs to open.
            if (open[i].includes(list[j])) {
              alreadyOpenedList.push(list[j]);
            }
          }
        }
        // Now we have a list of the pinned tabs we want which are already opened.
        // The below loop checks the total list of tabs we want
        list.forEach(function(listItem){
            // If the listItem isn't in the alreadyOpenedList
            if (!(alreadyOpenedList.indexOf(listItem) >= 0)) {
              // Add it to the list of urls to open
              self.list.push({url:listItem});
            }
        });
      }
      else {
        // If you don't want to ignore parameters just open more tabs
        list.forEach(function(item){
          var localItem = item;
          if(!(open.indexOf(localItem)> -1)){
            self.list.push({url:item});
          }
        });
      }
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

var setupClick = {
    notRegistered: false,
    init: function(){
        if(!this.notRegistered) {
            /**
            * set up click action
            */
            chrome.browserAction.onClicked.addListener(function() {
                buildTabs.init();
            });
        }
        this.notRegistered = true;
    }
};

// start up the app crate tabs
buildTabs.init();
applyOptions.init();
setupClick.init();
