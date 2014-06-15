// TODO: Leave focus on main tab
// TODO: drag and drop rearrange https://github.com/angular-ui/ui-sortable
// TODO: Option to reopen all tabs when creating a new window
// TODO: Icon
// TODO: Tests

var app = angular.module('app', []);

app.service("urlList", function ($q) {
  /**
   * Service that gets and sets the list of URLs that appears in the UI
   * @type {{list: Array, get: Function, remove: Function, add: Function, save: Function}}
   */
  var listService = {
    list: [],
    get: function () {
      var defer = $q.defer();
      chrome.storage.sync.get('items', function (data) {
        var items = [];
        items.push(data.items);
        listService.list = data.items;
        defer.resolve(data.items);
      });
      return defer.promise;
    },
    remove: function (itemToRemove) {
      for (var i = 0; i < this.list.length; i++) {
        if (this.list[i].url === itemToRemove.url) {
          this.list.splice(i, 1);
          this.save();
          return false;
        }
      }
    },
    add: function (itemToAdd) {
      this.list.push(itemToAdd);
      this.save();
    },
    save: function () {
      chrome.storage.sync.set({items: listService.list}, function () {
        console.log('saved');
      });
    }
  };
  return listService;
});

app.service('optionService', function ($q) {
  /**
   * Service that gets and sets the options section of the UI
   * @type {{options: {reopen: boolean}, save: Function, setReopen: Function}}
   */
  var option = {
    options:{
      reopen:false
    },
    save:function(){
      chrome.storage.sync.set({options:option.options}, function(data){});
    },
    get:function(){
      var self = this;
      var defer = $q.defer();
      chrome.storage.sync.get('options', function (data) {
        defer.resolve(data.options);
        self.options = data.options
      });
      return defer.promise;
    },
    set:function(value){
      this.options.reopen = value;
      this.save();
    }
  };
  return option;
});

app.controller('formCtrl', function ($scope, urlList) {
  /**
   * controller for the URL input form
   * @returns {boolean}
   */
  $scope.addItem = function () {
    if(!$scope.urlForm.$valid || $scope.urlForm.url.$viewValue === "" || typeof($scope.urlForm.url.$viewValue) === "undefined"){
      $scope.urlForm.url.$setValidity('url', false);
      return undefined;
    }
    var obj = {};
    obj.url = $scope.url;
    urlList.add(obj);
  }
});

app.controller('optionsCtrl', function($scope, optionService){
  /**
   * Controller for the options form
   */
  optionService.get().then(function(data){
    $scope.reopen = optionService.options.reopen;
  });

  $scope.reopenChange = function(){
    optionService.set(!$scope.reopen);
  }
});

app.controller('listCtrl', function ($scope, urlList, $q) {
  /**
   * Controller for the list of URLs
   */
  urlList.get().then(function (data) {
    $scope.items = urlList.list;
  });
  $scope.remove = function (item) {
    urlList.remove(item);
  };
});

app.directive('urlvaildation', function () {
  /**
   * Directive that controllers the validation of an URL input
   */
  return {
    require: 'ngModel',
    link: function (scope, elem, attr, ngModel) {
      // triggers on DOM changes
      ngModel.$parsers.unshift(function (value) {
        var vaild = false;
        if (value !== "" && value.indexOf('https://') >= 0 || value.indexOf('http://') >= 0) {
          vaild = true;
        }

        if(vaild) {
          ngModel.$setValidity('url', true);
          /* remove trailing slash */
          if (value.substr(-1) === '/') {
            return value.substr(0, value.length - 1);
          }
          return value;
        } else {
          ngModel.$setValidity('url', false);
          return undefined;
        }
      });
      // set inital state
      /*ngModel.$formatters.unshift(function (value) {
        ngModel.$setValidity('url', false);
        return undefined;
      });*/
    }
  };
});