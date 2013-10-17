/**
 * RBAC module
 *
 * Implementation for simple RBAC module.
 * This module consist from 2 parts: '$rbac' service and directive 'allow'.
 *
 * Note: each permission has 3 state: 'undefined', 'true' and 'false'. 'undefined' means that checking was never requested. So that's additional $digest for watches!
 *
 * @author Gayvoronsky Andrey <plandem@gmail.com>
 * @version 1.0
 */
angular.module('rbac', [])
	.provider('$rbac', function() {
		/**
		 * Holds all permissions for AuthItems that were requests from server
		 * @type {object}
		 */
		var permissions = {};

		/**
		 * Holds array of AuthItems that were enqueue to check for permissions
		 * @type {Array}
		 */
		var queue = [];

		/**
		 * Holds AuthItems that are already in process of checking
		 * @type {object}
		 */
		var processing = {};

		/**
		 * URL that will be used to request permissions for AuthItems
		 */
		var url;

		/**
		 * Name of RBAC service at scope. Used for auto-injection to controller's scope. If omit, then no auto-injection.
		 * You need to inject at least one to use this feature (E.g.: at run() of application)
		 */
		var scopeName;

		/**
		 * Function that will be executed to request authItems for checking. Must return 'promise' object.
		 * @param {string[]} authItems - array of authItems to check permissions
		 * @returns {promise}
		 */
		var serverRequestFn = function(authItems) {
			return $http.post(url, authItems);
		};

		/**
		 * Set callback that will be executed to request permissions for authItems.
		 * @param {function} callback - Callback that returns promise object
		 */
		var setServerRequest = function(callback) {
			serverRequestFn = callback;
			return this;
		};

		/**
	 	 * Set URL for backend server that supports RBAC
	 	 * @param {string} serverUrl - Url of server
	 	 */
		this.setUrl = function(serverUrl) {
			url = serverUrl;
			return this;
		};

		/**
		 * Set name for RBAC service at $rootScope to gain access to RBAC without any injection to each controller. Consider it like auto-injection for controllers.
		 * @param {string} name - name at scope for RBAC
		 */
		this.setScopeName = function(name) {
			scopeName = name;
			return this;
		};

		/**
		 * return Singleton of RBAC service
		 * @type {Array}
		 */
		this.$get = ['$rootScope', '$http', '$q', function($rootScope, $http, $q) {
			if(!(angular.isDefined(url)))
				throw 'RBAC is not configured properly. Configure URL via setUrl().';

			/**
			 * Watch for changes of queue each $digest
			 */
			$rootScope.$watch(function() { return queue.length; }, function(length) {
				if (length) {
					requestFn(queue);
					queue.length = 0;
				}
			});

			/**
			 * Our actual request to server
			 * @param {(string|string[])} authItems - AuthItem or array of AuthItems to check for permissions
			 * @returns {promise}
			 */
			var requestFn = function(authItems) {
				var request = [];
				var deferred = $q.defer();

				/**
				 * We don't wanna spam the server, so let's check only permissions that were not requested before
				 */
				if(angular.isArray(authItems)) {
					angular.forEach(authItems, function(value) {
						if(angular.isDefined(allowFn(value)) || angular.isDefined(processing[value]))
							return;

						processing[value] = deferred.promise;
						request.push(value);
					});
				} else if(!(angular.isDefined(allowFn(authItems)))) {
					request.push(authItems);
					processing[authItems] = deferred.promise;
				}

				/**
				 * New permissions to check?
				 */
				if(request.length) {
					serverRequestFn(request).then(function(response) {
						angular.forEach(response.data, function(value, key) {
							permissions[key] = value;
						});

						return response.data;
					}).finally(function() {
						deferred.resolve();
					});
				} else {
					/**
					 * So, looks like no new unique checking and requested checking are already in processing.
					 */
					var pending = {};

					if(angular.isArray(authItems)) {
						angular.forEach(authItems, function(value) {
							pending[value] = processing[value];
						});
					} else {
						pending[authItems] = processing[authItems];
					}

					/**
					 * return new 'promise' that will wait till all previously requested items will be resolved.
					 */
					return $q.all(pending);
				}

				return deferred.promise;
			};

			/**
			 * Direct checking for permissions. Can be executed from controllers.
			 * @param {(string|string[])} authItems - AuthItem or array of AuthItems to check for permissions
			 * @returns {promise}
			 */
			var checkAccessFn = function(authItems) {
				return requestFn(authItems).then(function(resolved) {
					if(angular.isArray(authItems))
						return resolved;

					return allowFn(authItems);
				});
			};

			/**
			 * Put AuthItem in queue for checking of permission. Can be used from directives. Checking will be delayed till next $digest.
			 * @param {string} authItem - AuthItem to check for permission
			 */
			var enqueueCheckingFn = function(authItem) {
				queue.push(authItem);
			};

			/**
			 * Return current state of permission for AuthItem. Don't use it directly, used at watch function inside of directive
			 * @param {string} authItem - AuthItem to get
			 * @returns {(boolean|undefined)}
			 */
			var allowFn = function(authItem) {
				return permissions[authItem];
			};

			/**
			 * Grant permission for AuthItem. That's only local operation, that can be used after some special tasks at client-side. No any server processing.
			 * @param {string} authItem - AuhItem to grant permission
			 */
			var grantFn = function(authItem) {
				permissions[authItem] = true;
			};

			/**
			 * Revoke permission for AuthItem. That's only local operation, that can be used after some special tasks at client-side. No any server processing.
			 * @param {string} authItem - AuthItem to revoke permission
			 */
			var revokeFn = function(authItem) {
				permissions[authItem] = false;
			};

			/**
			 * Resets permissions that were locally stored.
			 * @param {[string|string[]]} authItems - AuthItems to reset permissions. If omit - reset all permissions
			 */
			var resetFn = function(authItems) {
				if(angular.isArray(authItems)) {
					angular.forEach(authItems, function(value, key) {
						permissions[key] = undefined;
						processing[key] = undefined;
					});
				} else if(angular.isDefined(authItems)) {
					permissions[authItems] = undefined;
					processing[authItems] = undefined;
				} else {
					permissions = {};
					processing = {};
				}
			};

			var $rbac = {
				checkAccess: checkAccessFn,
				enqueueChecking: enqueueCheckingFn,
				allow: allowFn,
				grant: grantFn,
				revoke: revokeFn,
				reset: resetFn,
				serverRequest: serverRequestFn
			};

			/**
			 * Do we want to use auto-injection for controller's scope? We will not need inject RBAC service manually in that case
			 */
			if(angular.isDefined(scopeName))
				$rootScope[scopeName] = $rbac;

			return $rbac;
	}];
}).directive("allow", ['$animate', '$rbac', function ($animate, $rbac) {
	return {
		transclude: 'element',
		priority: 1000,
		terminal: true,
		restrict: 'A',
		compile: function (element, attr, transclude) {
			return function ($scope, $element, $attr) {
				var childElement, childScope;

				$scope.$watch(function() { return $rbac.allow($attr.allow); }, function (newVal, oldVal) {
					if (newVal === oldVal)
						return;

					if (childElement) {
						$animate.leave(childElement);
						childElement = undefined;
					}

					if (childScope) {
						childScope.$destroy();
						childScope = undefined;
					}

					if(newVal) {
						childScope = $scope.$new();
						transclude(childScope, function (clone) {
							childElement = clone;
							$animate.enter(clone, $element.parent(), $element);
						});
					}
				});

				$rbac.enqueueChecking($attr.allow);
			}
		}
	};
}]);